import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { encodeReviewId, decodeReviewId } from './sqids'
import { registerPkRoutes } from './pk/routes'
import { syncOnesystemToPkTables } from './pk/sync'

type Bindings = {
  DB: D1Database
  CAPTCHA_SITEVERIFY_URL: string
  ADMIN_SECRET: string
  ONESYSTEM_COOKIE?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'x-admin-secret'],
  allowMethods: ['POST', 'GET', 'DELETE', 'PUT', 'OPTIONS']
}))

// 禁用缓存
app.use('/*', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  c.res.headers.set('Pragma', 'no-cache')
})

app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({ error: err.message || 'Internal Server Error' }, 500)
})

// pk(排课模拟器) 兼容接口：给嵌入的 Vue 子应用使用
registerPkRoutes(app)

// TongjiCaptcha 验证函数
async function verifyTongjiCaptcha(token: string, siteverifyUrl: string) {
  try {
    const res = await fetch(siteverifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const data = await res.json() as { success: boolean }
    return data.success === true
  } catch (e) {
    console.error('Captcha service error:', e)
    return false
  }
}

// 为评论添加 sqid 字段
function addSqidToReviews(reviews: any[]): any[] {
  return reviews.map(review => ({
    ...review,
    sqid: encodeReviewId(review.id)
  }))
}

async function ensureCourseAliasesTable(db: D1Database) {
  await db.prepare(
    "CREATE TABLE IF NOT EXISTS course_aliases (system TEXT NOT NULL, alias TEXT NOT NULL, course_id INTEGER NOT NULL, created_at INTEGER DEFAULT (strftime('%s','now')), PRIMARY KEY (system, alias))"
  ).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_course_aliases_course_id ON course_aliases(course_id)').run()
}

// 公开 API - 获取设置
app.get('/api/settings/show_icu', async (c) => {
  const setting = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('show_legacy_reviews').first<{value: string}>()
  return c.json({ show_icu: setting?.value === 'true' })
})

// 获取开课单位列表
app.get('/api/departments', async (c) => {
  try {
    const legacy = c.req.query('legacy')

    // 检查是否显示 is_icu 数据
    const setting = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('show_legacy_reviews').first<{value: string}>()
    const showIcu = setting?.value === 'true'

    let whereClause = ' WHERE department IS NOT NULL AND department != ""'

    // 当关闭乌龙茶显示时，过滤掉 is_icu=1 的课程
    if (!showIcu) {
      whereClause += ' AND (is_icu = 0 OR is_icu IS NULL)'
    }

    if (legacy === 'true') {
      whereClause += ' AND is_legacy = 1'
    } else {
      whereClause += ' AND is_legacy = 0'
    }

    const query = `SELECT DISTINCT department FROM courses ${whereClause} ORDER BY department`
    const { results } = await c.env.DB.prepare(query).all()

    const departments = (results || []).map((row: any) => row.department)
    return c.json({ departments })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.get('/api/courses', async (c) => {
  try {
    await ensureCourseAliasesTable(c.env.DB)
    const keyword = c.req.query('q')
    const legacy = c.req.query('legacy')
    const departments = c.req.query('departments') // 逗号分隔的开课单位列表
    const onlyWithReviews = c.req.query('onlyWithReviews') === 'true'
    const courseName = (c.req.query('courseName') || '').trim()
    const courseCode = (c.req.query('courseCode') || '').trim()
    const teacherName = (c.req.query('teacherName') || '').trim()
    const teacherCode = (c.req.query('teacherCode') || '').trim()
    const campus = (c.req.query('campus') || '').trim()
    const faculty = (c.req.query('faculty') || '').trim()
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

    // 检查是否显示 is_icu 数据
    const setting = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('show_legacy_reviews').first<{value: string}>()
    const showIcu = setting?.value === 'true'

    let baseWhere = ' WHERE 1=1'
    const params: any[] = []

    // 当关闭乌龙茶显示时，过滤掉 is_icu=1 的课程
    if (!showIcu) {
      baseWhere += ' AND (c.is_icu = 0 OR c.is_icu IS NULL)'
    }

    if (legacy === 'true') {
      baseWhere += ' AND c.is_legacy = 1'
    } else {
      baseWhere += ' AND c.is_legacy = 0'
    }

    if (keyword) {
      baseWhere += ' AND (c.search_keywords LIKE ? OR c.code LIKE ? OR c.name LIKE ? OR t.name LIKE ?)'
      const likeKey = `%${keyword}%`
      params.push(likeKey, likeKey, likeKey, likeKey)
    }

    // 课程代码（支持别名）
    if (courseCode) {
      baseWhere +=
        " AND (c.code LIKE ? OR EXISTS (SELECT 1 FROM course_aliases a WHERE a.system = 'onesystem' AND a.course_id = c.id AND a.alias LIKE ?))"
      const likeCode = `%${courseCode}%`
      params.push(likeCode, likeCode)
    }

    // 高级检索：基于 onesystem/pk 的 coursedetail + teacher 表做过滤（用于按课程名/教师/校区/学院精确筛选）
    const needPkFilter = Boolean(courseName || teacherName || teacherCode || campus || faculty)
    if (needPkFilter) {
      const pkWhere: string[] = []
      const pkParams: any[] = []

      pkWhere.push(`
        (
          cd.courseCode = c.code
          OR cd.newCourseCode = c.code
          OR EXISTS (
            SELECT 1 FROM course_aliases a
            WHERE a.system = 'onesystem'
              AND a.course_id = c.id
              AND (a.alias = cd.courseCode OR a.alias = cd.newCourseCode)
          )
        )
      `)

      if (courseName) {
        pkWhere.push('cd.courseName LIKE ?')
        pkParams.push(`%${courseName}%`)
      }
      if (campus) {
        pkWhere.push('cd.campus = ?')
        pkParams.push(campus)
      }
      if (faculty) {
        pkWhere.push('cd.faculty = ?')
        pkParams.push(faculty)
      }
      if (teacherName) {
        pkWhere.push('EXISTS (SELECT 1 FROM teacher tt WHERE tt.teachingClassId = cd.id AND tt.teacherName LIKE ?)')
        pkParams.push(`%${teacherName}%`)
      }
      if (teacherCode) {
        pkWhere.push('EXISTS (SELECT 1 FROM teacher tt WHERE tt.teachingClassId = cd.id AND tt.teacherCode LIKE ?)')
        pkParams.push(`%${teacherCode}%`)
      }

      baseWhere += ` AND EXISTS (SELECT 1 FROM coursedetail cd WHERE ${pkWhere.join(' AND ')})`
      params.push(...pkParams)
    }

    // 开课单位筛选
    if (departments) {
      const deptList = departments.split(',').filter(d => d.trim())
      if (deptList.length > 0) {
        const placeholders = deptList.map(() => '?').join(',')
        baseWhere += ` AND c.department IN (${placeholders})`
        params.push(...deptList)
      }
    }

    // 只看有评价的课程
    if (onlyWithReviews) {
      baseWhere += ' AND c.review_count > 0'
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM courses c LEFT JOIN teachers t ON c.teacher_id = t.id ${baseWhere}`
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{total: number}>()
    const total = countResult?.total || 0

    // 获取分页数据
    const query = `
      SELECT
        c.id,
        c.code,
        c.name,
        c.review_avg as rating,
        c.review_count,
        c.is_legacy,
        t.name as teacher_name,
        (
          SELECT GROUP_CONCAT(x.calendarName, '||') FROM (
            SELECT DISTINCT ca.calendarIdI18n as calendarName, cd2.calendarId as calendarId
            FROM coursedetail cd2
            JOIN calendar ca ON ca.calendarId = cd2.calendarId
            WHERE (
              cd2.courseCode = c.code
              OR cd2.newCourseCode = c.code
              OR EXISTS (
                SELECT 1 FROM course_aliases a
                WHERE a.system = 'onesystem'
                  AND a.course_id = c.id
                  AND (a.alias = cd2.courseCode OR a.alias = cd2.newCourseCode)
              )
            )
            ORDER BY cd2.calendarId DESC
          ) x
        ) as semester_names
      FROM courses c LEFT JOIN teachers t ON c.teacher_id = t.id ${baseWhere}
      ORDER BY c.review_count DESC LIMIT ? OFFSET ?
    `
    const { results } = await c.env.DB.prepare(query).bind(...params, limit, offset).all()

    const normalized = (results || []).map((r: any) => ({
      ...r,
      semesters: String(r.semester_names || '')
        .split('||')
        .map((s: string) => s.trim())
        .filter(Boolean)
    }))

    return c.json({ data: normalized, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.get('/api/course/:id', async (c) => {
  try {
    await ensureCourseAliasesTable(c.env.DB)
    const id = c.req.param('id')

    // 检查是否显示乌龙茶数据
    const setting = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('show_legacy_reviews').first<{value: string}>()
    const showIcu = setting?.value === 'true'

    const course = await c.env.DB.prepare(
      `SELECT c.*, t.name as teacher_name FROM courses c
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE c.id = ?`
    ).bind(id).first()

    if (!course) return c.json({ error: 'Course not found' }, 404)

    // 如果关闭乌龙茶显示且课程是icu，返回404
    if (!showIcu && (course as any).is_icu === 1) {
      return c.json({ error: 'Course not found' }, 404)
    }

    // 评价匹配策略（跨学期）：
    // - 同课程 code
    // - 同课程名 + 同教师（如果有教师）
    const matchedIds = new Set<number>([Number((course as any).id)])

    const sameCodeRows = await c.env.DB
      .prepare('SELECT id FROM courses WHERE code = ?')
      .bind((course as any).code)
      .all<{ id: number }>()
    for (const r of sameCodeRows.results || []) matchedIds.add(Number((r as any).id))

    if ((course as any).teacher_id) {
      const sameNameTeacherRows = await c.env.DB
        .prepare('SELECT id FROM courses WHERE name = ? AND teacher_id = ?')
        .bind((course as any).name, (course as any).teacher_id)
        .all<{ id: number }>()
      for (const r of sameNameTeacherRows.results || []) matchedIds.add(Number((r as any).id))
    }

    const idList = Array.from(matchedIds).filter((n) => Number.isFinite(n))
    if (idList.length === 0) return c.json({ error: 'Course not found' }, 404)

    const placeholders = idList.map(() => '?').join(',')

    let baseWhere = `course_id IN (${placeholders}) AND is_hidden = 0`
    if (!showIcu) baseWhere += ` AND is_icu = 0`

    const reviews = await c.env.DB
      .prepare(`SELECT * FROM reviews WHERE ${baseWhere} ORDER BY created_at DESC`)
      .bind(...idList)
      .all()
    const reviewsWithSqid = addSqidToReviews(reviews.results || [])

    const countRow = await c.env.DB
      .prepare(`SELECT COUNT(*) as cnt FROM reviews WHERE ${baseWhere}`)
      .bind(...idList)
      .first<{ cnt: number }>()

    const avgRow = await c.env.DB
      .prepare(`SELECT AVG(rating) as avg FROM reviews WHERE ${baseWhere} AND rating > 0`)
      .bind(...idList)
      .first<{ avg: number | null }>()

    const semestersRow = await c.env.DB
      .prepare(
        `SELECT GROUP_CONCAT(x.calendarName, '||') as semester_names FROM (
          SELECT DISTINCT ca.calendarIdI18n as calendarName, cd2.calendarId as calendarId
          FROM coursedetail cd2
          JOIN calendar ca ON ca.calendarId = cd2.calendarId
          WHERE (
            cd2.courseCode = ?
            OR cd2.newCourseCode = ?
            OR EXISTS (
              SELECT 1 FROM course_aliases a
              WHERE a.system = 'onesystem'
                AND a.course_id = ?
                AND (a.alias = cd2.courseCode OR a.alias = cd2.newCourseCode)
            )
          )
          ORDER BY cd2.calendarId DESC
        ) x`
      )
      .bind((course as any).code, (course as any).code, Number((course as any).id))
      .first<{ semester_names: string | null }>()

    const semesters = String(semestersRow?.semester_names || '')
      .split('||')
      .map((s) => s.trim())
      .filter(Boolean)

    return c.json({
      ...(course as any),
      review_count: Number(countRow?.cnt || 0),
      review_avg: avgRow?.avg === null || avgRow?.avg === undefined ? 0 : Number(avgRow.avg),
      semesters,
      reviews: reviewsWithSqid
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// 给排课模拟器侧边弹窗使用：按课号/新课号查找课程评价
app.get('/api/course/by-code/:code', async (c) => {
  try {
    await ensureCourseAliasesTable(c.env.DB)
    const code = (c.req.param('code') || '').trim()
    if (!code) return c.json({ error: 'Missing code' }, 400)
    const teacherName = (c.req.query('teacherName') || '').trim()

    // ICU 显示开关
    const setting = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('show_legacy_reviews')
      .first<{ value: string }>()
    const showIcu = setting?.value === 'true'

    // 若带 teacherName：优先命中“课号/别名 + 教师”，避免同课号不同老师的评价混在一起
    const preferredRow = teacherName
      ? await c.env.DB
          .prepare(
            `SELECT c.id as id
             FROM courses c
             LEFT JOIN teachers t ON c.teacher_id = t.id
             WHERE (
               c.code = ?
               OR EXISTS (
                 SELECT 1 FROM course_aliases a
                 WHERE a.system = 'onesystem'
                   AND a.alias = ?
                   AND a.course_id = c.id
               )
             )
               AND t.name = ?
             LIMIT 1`
          )
          .bind(code, code, teacherName)
          .first<{ id: number }>()
      : null

    // 先尝试 alias 映射（onesystem）
    const aliasRow = preferredRow?.id
      ? null
      : await c.env.DB.prepare(`SELECT course_id as id FROM course_aliases WHERE system = 'onesystem' AND alias = ? LIMIT 1`).bind(code).first<{ id: number }>()

    const directRow =
      preferredRow?.id || aliasRow?.id
        ? null
        : await c.env.DB.prepare('SELECT id FROM courses WHERE code = ? LIMIT 1').bind(code).first<{ id: number }>()

    const courseId = preferredRow?.id ?? aliasRow?.id ?? directRow?.id ?? null

    if (!courseId) return c.json({ error: 'Course not found' }, 404)

    // 如果是直接命中 courses.code，顺手补齐 alias，避免每次都走回退查询
    if (!aliasRow?.id && directRow?.id) {
      // 防御：老库未迁移时保证表存在
      await c.env.DB
        .prepare(
          `INSERT INTO course_aliases (system, alias, course_id)
           VALUES ('onesystem', ?, ?)
           ON CONFLICT(system, alias) DO UPDATE SET course_id=excluded.course_id`
        )
        .bind(code, courseId)
        .run()
    }

    const course = await c.env.DB.prepare(
      `SELECT c.*, t.name as teacher_name FROM courses c
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE c.id = ?`
    ).bind(courseId).first()

    if (!course) return c.json({ error: 'Course not found' }, 404)

    if (!showIcu && (course as any).is_icu === 1) {
      return c.json({ error: 'Course not found' }, 404)
    }

    // 评价匹配策略（跨学期）：
    // - 默认：同课程 code（含 alias 命中后的 canonical code）+ 同课程名同教师
    // - 若带 teacherName：只按“同课程名 + 同教师”聚合（避免同课号不同老师混入）
    const matchedIds = new Set<number>([Number(courseId)])

    if (!teacherName) {
      const sameCodeRows = await c.env.DB.prepare('SELECT id FROM courses WHERE code = ?').bind((course as any).code).all<{ id: number }>()
      for (const r of sameCodeRows.results || []) matchedIds.add(Number((r as any).id))
    }

    if ((course as any).teacher_id) {
      const sameNameTeacherRows = await c.env.DB
        .prepare('SELECT id FROM courses WHERE name = ? AND teacher_id = ?')
        .bind((course as any).name, (course as any).teacher_id)
        .all<{ id: number }>()
      for (const r of sameNameTeacherRows.results || []) matchedIds.add(Number((r as any).id))
    } else if (teacherName) {
      const sameNameTeacherRows = await c.env.DB
        .prepare(
          `SELECT c.id as id
           FROM courses c
           LEFT JOIN teachers t ON c.teacher_id = t.id
           WHERE c.name = ? AND t.name = ?`
        )
        .bind((course as any).name, teacherName)
        .all<{ id: number }>()
      for (const r of sameNameTeacherRows.results || []) matchedIds.add(Number((r as any).id))
    }

    const idList = Array.from(matchedIds).filter((n) => Number.isFinite(n))
    if (idList.length === 0) return c.json({ error: 'Course not found' }, 404)

    const placeholders = idList.map(() => '?').join(',')

    let baseWhere = `course_id IN (${placeholders}) AND is_hidden = 0`
    if (!showIcu) baseWhere += ` AND is_icu = 0`

    const reviews = await c.env.DB
      .prepare(`SELECT * FROM reviews WHERE ${baseWhere} ORDER BY created_at DESC LIMIT 30`)
      .bind(...idList)
      .all()
    const reviewsWithSqid = addSqidToReviews(reviews.results || [])

    const countRow = await c.env.DB
      .prepare(`SELECT COUNT(*) as cnt FROM reviews WHERE ${baseWhere}`)
      .bind(...idList)
      .first<{ cnt: number }>()

    const avgRow = await c.env.DB
      .prepare(`SELECT AVG(rating) as avg FROM reviews WHERE ${baseWhere} AND rating > 0`)
      .bind(...idList)
      .first<{ avg: number | null }>()

    const semestersRow = await c.env.DB
      .prepare(
        `SELECT GROUP_CONCAT(x.calendarName, '||') as semester_names FROM (
          SELECT DISTINCT ca.calendarIdI18n as calendarName, cd2.calendarId as calendarId
          FROM coursedetail cd2
          JOIN calendar ca ON ca.calendarId = cd2.calendarId
          WHERE (
            cd2.courseCode = ?
            OR cd2.newCourseCode = ?
            OR EXISTS (
              SELECT 1 FROM course_aliases a
              WHERE a.system = 'onesystem'
                AND a.course_id = ?
                AND (a.alias = cd2.courseCode OR a.alias = cd2.newCourseCode)
            )
          )
          ORDER BY cd2.calendarId DESC
        ) x`
      )
      .bind((course as any).code, (course as any).code, Number(courseId))
      .first<{ semester_names: string | null }>()

    const semesters = String(semestersRow?.semester_names || '')
      .split('||')
      .map((s) => s.trim())
      .filter(Boolean)

    return c.json({
      ...(course as any),
      review_count: Number(countRow?.cnt || 0),
      review_avg: avgRow?.avg === null || avgRow?.avg === undefined ? 0 : Number(avgRow.avg),
      semesters,
      reviews: reviewsWithSqid
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.post('/api/review', async (c) => {
  const body = await c.req.json()
  const { course_id, rating, comment, semester, turnstile_token, reviewer_name, reviewer_avatar } = body

  // 使用 TongjiCaptcha 验证
  if (!(await verifyTongjiCaptcha(turnstile_token, c.env.CAPTCHA_SITEVERIFY_URL))) {
    return c.json({ error: '人机验证无效或已过期' }, 403)
  }

  await c.env.DB.prepare(
    `INSERT INTO reviews (course_id, rating, comment, semester, is_legacy, reviewer_name, reviewer_avatar) VALUES (?, ?, ?, ?, 0, ?, ?)`
  ).bind(course_id, rating, comment, semester, reviewer_name || '', reviewer_avatar || '').run()

  // 更新课程统计（只统计非legacy且rating>0的评价）
  await c.env.DB.prepare(`
    UPDATE courses SET
      review_count = (SELECT COUNT(*) FROM reviews WHERE course_id = ? AND is_hidden = 0),
      review_avg = (SELECT AVG(rating) FROM reviews WHERE course_id = ? AND is_hidden = 0 AND rating > 0)
    WHERE id = ?
  `).bind(course_id, course_id, course_id).run()

  return c.json({ success: true })
})

// 管理 API
const admin = new Hono<{ Bindings: Bindings }>()

admin.use('/*', async (c, next) => {
  const input = c.req.header('x-admin-secret')
  if (!input || input !== c.env.ADMIN_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// 手动同步一系统排课数据 -> D1（pk 数据域）
// 由 GitHub Action / 管理端触发：POST /api/admin/pk/sync { calendarId, depth? }
admin.post('/pk/sync', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({} as any))
    const calendarId = Number(body?.calendarId)
    const depth = body?.depth !== undefined ? Number(body.depth) : 1

    if (!Number.isFinite(calendarId)) return c.json({ error: 'calendarId 无效' }, 400)

    // Allow overriding cookie for local tooling (still protected by x-admin-secret).
    const sessionCookie = String(body?.onesystemCookie || body?.sessionCookie || c.env.ONESYSTEM_COOKIE || '').trim()
    if (!sessionCookie) {
      return c.json({ error: 'ONESYSTEM_COOKIE 未配置（wrangler secret put ONESYSTEM_COOKIE）' }, 500)
    }

    const result = await syncOnesystemToPkTables({
      db: c.env.DB,
      sessionCookie,
      calendarId,
      depth
    })

    return c.json({ success: true, ...result })
  } catch (err: any) {
    return c.json({ error: err.message || 'Sync failed' }, 500)
  }
})

admin.get('/reviews', async (c) => {
  try {
    const keyword = c.req.query('q')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = (page - 1) * limit

    let whereClause = ''
    let params: string[] = []

    if (keyword) {
      // 尝试将关键词解码为数字ID（如果是sqid）
      const decodedId = decodeReviewId(keyword)
      if (decodedId !== null) {
        // 如果是有效的sqid，直接按ID查询
        whereClause = 'WHERE r.id = ?'
        params = [decodedId.toString()]
      } else {
        // 否则按原来的方式模糊搜索
        whereClause = 'WHERE c.name LIKE ? OR c.code LIKE ? OR r.comment LIKE ? OR r.reviewer_name LIKE ?'
        const likeKey = `%${keyword}%`
        params = [likeKey, likeKey, likeKey, likeKey]
      }
    }

    const countQuery = `SELECT COUNT(*) as total FROM reviews r JOIN courses c ON r.course_id = c.id ${whereClause}`
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{total: number}>()
    const total = countResult?.total || 0

    const query = `
      SELECT r.*, c.name as course_name, c.code
      FROM reviews r
      JOIN courses c ON r.course_id = c.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
    const { results } = await c.env.DB.prepare(query).bind(...params, limit, offset).all()
    const reviewsWithSqid = addSqidToReviews(results || [])
    return c.json({ data: reviewsWithSqid, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

admin.put('/review/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { comment, rating, reviewer_name, reviewer_avatar } = body

  await c.env.DB.prepare(
    'UPDATE reviews SET comment = ?, rating = ?, reviewer_name = ?, reviewer_avatar = ? WHERE id = ?'
  ).bind(comment, rating, reviewer_name || '', reviewer_avatar || '', id).run()

  // 获取course_id并更新统计
  const review = await c.env.DB.prepare('SELECT course_id FROM reviews WHERE id = ?').bind(id).first<{course_id: number}>()
  if (review) {
    await c.env.DB.prepare(`
      UPDATE courses SET
        review_avg = (SELECT AVG(rating) FROM reviews WHERE course_id = ? AND is_hidden = 0 AND rating > 0)
      WHERE id = ?
    `).bind(review.course_id, review.course_id).run()
  }

  return c.json({ success: true })
})

admin.post('/review/:id/toggle', async (c) => {
  const id = c.req.param('id')
  // 先获取评论的course_id
  const review = await c.env.DB.prepare('SELECT course_id FROM reviews WHERE id = ?').bind(id).first<{course_id: number}>()
  if (!review) return c.json({ error: 'Review not found' }, 404)

  await c.env.DB.prepare('UPDATE reviews SET is_hidden = NOT is_hidden WHERE id = ?').bind(id).run()

  // 更新课程统计
  await c.env.DB.prepare(`
    UPDATE courses SET
      review_count = (SELECT COUNT(*) FROM reviews WHERE course_id = ? AND is_hidden = 0),
      review_avg = (SELECT AVG(rating) FROM reviews WHERE course_id = ? AND is_hidden = 0 AND rating > 0)
    WHERE id = ?
  `).bind(review.course_id, review.course_id, review.course_id).run()

  return c.json({ success: true })
})

admin.delete('/review/:id', async (c) => {
  const id = c.req.param('id')
  // 先获取评论的course_id
  const review = await c.env.DB.prepare('SELECT course_id FROM reviews WHERE id = ?').bind(id).first<{course_id: number}>()
  if (!review) return c.json({ error: 'Review not found' }, 404)

  await c.env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run()

  // 更新课程统计
  await c.env.DB.prepare(`
    UPDATE courses SET
      review_count = (SELECT COUNT(*) FROM reviews WHERE course_id = ? AND is_hidden = 0),
      review_avg = (SELECT AVG(rating) FROM reviews WHERE course_id = ? AND is_hidden = 0 AND rating > 0)
    WHERE id = ?
  `).bind(review.course_id, review.course_id, review.course_id).run()

  return c.json({ success: true })
})

// 课程管理API
admin.get('/courses', async (c) => {
  try {
    const keyword = c.req.query('q')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

    let whereClause = ''
    let params: string[] = []

    if (keyword) {
      whereClause = 'WHERE c.name LIKE ? OR c.code LIKE ? OR t.name LIKE ?'
      const likeKey = `%${keyword}%`
      params = [likeKey, likeKey, likeKey]
    }

    const countQuery = `SELECT COUNT(*) as total FROM courses c LEFT JOIN teachers t ON c.teacher_id = t.id ${whereClause}`
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{total: number}>()
    const total = countResult?.total || 0

    const query = `
      SELECT c.*, t.name as teacher_name
      FROM courses c LEFT JOIN teachers t ON c.teacher_id = t.id
      ${whereClause}
      ORDER BY c.id DESC
      LIMIT ? OFFSET ?
    `
    const { results } = await c.env.DB.prepare(query).bind(...params, limit, offset).all()
    return c.json({ data: results || [], total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

admin.put('/course/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { code, name, credit, department, teacher_name, search_keywords } = body

  // 查找或创建教师
  let teacherId = null
  if (teacher_name) {
    const existingTeacher = await c.env.DB.prepare('SELECT id FROM teachers WHERE name = ?').bind(teacher_name).first<{id: number}>()
    if (existingTeacher) {
      teacherId = existingTeacher.id
    } else {
      const result = await c.env.DB.prepare('INSERT INTO teachers (name) VALUES (?)').bind(teacher_name).run()
      teacherId = result.meta.last_row_id
    }
  }

  await c.env.DB.prepare(
    'UPDATE courses SET code = ?, name = ?, credit = ?, department = ?, teacher_id = ?, search_keywords = ? WHERE id = ?'
  ).bind(code, name, credit || 0, department || '', teacherId, search_keywords || '', id).run()

  return c.json({ success: true })
})

admin.delete('/course/:id', async (c) => {
  const id = c.req.param('id')
  // 先删除关联的评论
  await c.env.DB.prepare('DELETE FROM reviews WHERE course_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

admin.post('/course', async (c) => {
  const body = await c.req.json()
  const { code, name, credit, department, teacher_name, search_keywords } = body

  // 查找或创建教师
  let teacherId = null
  if (teacher_name) {
    const existingTeacher = await c.env.DB.prepare('SELECT id FROM teachers WHERE name = ?').bind(teacher_name).first<{id: number}>()
    if (existingTeacher) {
      teacherId = existingTeacher.id
    } else {
      const result = await c.env.DB.prepare('INSERT INTO teachers (name) VALUES (?)').bind(teacher_name).run()
      teacherId = result.meta.last_row_id
    }
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO courses (code, name, credit, department, teacher_id, search_keywords, is_legacy) VALUES (?, ?, ?, ?, ?, ?, 0)'
  ).bind(code, name, credit || 0, department || '', teacherId, search_keywords || `${code} ${name} ${teacher_name || ''}`).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

// 设置API
admin.get('/settings', async (c) => {
  const results = await c.env.DB.prepare('SELECT key, value FROM settings').all()
  const settings: Record<string, string> = {}
  for (const row of (results.results || []) as {key: string, value: string}[]) {
    settings[row.key] = row.value
  }
  return c.json(settings)
})

admin.put('/settings/:key', async (c) => {
  const key = c.req.param('key')
  const body = await c.req.json()
  const { value } = body
  await c.env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, value).run()
  return c.json({ success: true })
})

app.route('/api/admin', admin)

export default app
