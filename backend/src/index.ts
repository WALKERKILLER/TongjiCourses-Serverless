import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  CAPTCHA_SITEVERIFY_URL: string
  ADMIN_SECRET: string
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
    const keyword = c.req.query('q')
    const legacy = c.req.query('legacy')
    const departments = c.req.query('departments') // 逗号分隔的开课单位列表
    const onlyWithReviews = c.req.query('onlyWithReviews') === 'true'
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

    // 检查是否显示 is_icu 数据
    const setting = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('show_legacy_reviews').first<{value: string}>()
    const showIcu = setting?.value === 'true'

    let baseWhere = ' WHERE 1=1'
    let params: string[] = []

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
      params = [likeKey, likeKey, likeKey, likeKey]
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
      SELECT c.id, c.code, c.name, c.review_avg as rating, c.review_count, c.is_legacy, t.name as teacher_name
      FROM courses c LEFT JOIN teachers t ON c.teacher_id = t.id ${baseWhere}
      ORDER BY c.review_count DESC LIMIT ? OFFSET ?
    `
    const { results } = await c.env.DB.prepare(query).bind(...params, limit, offset).all()
    return c.json({ data: results || [], total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

app.get('/api/course/:id', async (c) => {
  try {
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

    let reviewQuery = `SELECT * FROM reviews WHERE course_id = ? AND is_hidden = 0`
    if (!showIcu) {
      reviewQuery += ` AND is_icu = 0`
    }
    reviewQuery += ` ORDER BY created_at DESC`

    const reviews = await c.env.DB.prepare(reviewQuery).bind(id).all()

    return c.json({ ...course, reviews: reviews.results || [] })
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

admin.get('/reviews', async (c) => {
  try {
    const keyword = c.req.query('q')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = (page - 1) * limit

    let whereClause = ''
    let params: string[] = []

    if (keyword) {
      whereClause = 'WHERE c.name LIKE ? OR c.code LIKE ? OR r.comment LIKE ? OR r.reviewer_name LIKE ?'
      const likeKey = `%${keyword}%`
      params = [likeKey, likeKey, likeKey, likeKey]
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
    return c.json({ data: results || [], total, page, limit, totalPages: Math.ceil(total / limit) })
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
