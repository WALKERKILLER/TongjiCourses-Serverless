import { Hono } from 'hono'
import { arrangementTextToObj, splitEndline, optCourseQueryListGenerator } from './utils'

type PkBindings = {
  DB: D1Database
}

function jsonOk(data: any) {
  return { code: 200, msg: '查询成功', data }
}

function jsonErr(code: number, msg: string, data?: any) {
  return { code, msg, data: data ?? {} }
}

async function getTeachers(db: D1Database, teachingClassId: number) {
  const { results } = await db
    .prepare('SELECT teacherCode, teacherName, arrangeInfoText FROM teacher WHERE teachingClassId = ?')
    .bind(teachingClassId)
    .all<any>()
  return results || []
}

function mergeArrangementInfo(teachers: any[]) {
  const lines: string[] = []
  for (const t of teachers) {
    const arr = splitEndline(String(t.arrangeInfoText || ''))
    for (const line of arr) lines.push(line)
  }
  const uniq = Array.from(new Set(lines))
  const objs = uniq.map((line) => arrangementTextToObj(line))
  // Sort by day then start section
  objs.sort((a, b) => {
    const ad = a.occupyDay ?? 99
    const bd = b.occupyDay ?? 99
    if (ad !== bd) return ad - bd
    const at = a.occupyTime?.[0] ?? 99
    const bt = b.occupyTime?.[0] ?? 99
    return at - bt
  })
  return objs
}

export function registerPkRoutes<T extends PkBindings>(app: Hono<{ Bindings: T }>) {
  // GET /api/getAllCalendar
  app.get('/api/getAllCalendar', async (c) => {
    const { results } = await c.env.DB.prepare(
      'SELECT calendarId as calendarId, calendarIdI18n as calendarName FROM calendar ORDER BY calendarId DESC LIMIT 8'
    ).all<any>()
    return c.json(jsonOk(results || []))
  })

  app.get('/api/getAllCampus', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT campus as campusId, campusI18n as campusName FROM campus').all<any>()
    return c.json(jsonOk(results || []))
  })

  app.get('/api/getAllFaculty', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT faculty as facultyId, facultyI18n as facultyName FROM faculty').all<any>()
    return c.json(jsonOk(results || []))
  })

  app.post('/api/findGradeByCalendarId', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const calendarId = Number(body?.calendarId)
    if (!Number.isFinite(calendarId)) return c.json(jsonErr(400, '参数错误: 缺少 calendarId'), 400)

    const { results } = await c.env.DB.prepare(
      `SELECT DISTINCT m.grade as grade
       FROM major m
       JOIN majorandcourse mac ON mac.majorId = m.id
       JOIN coursedetail c ON c.id = mac.courseId
       WHERE c.calendarId = ?
       ORDER BY m.grade DESC`
    )
      .bind(calendarId)
      .all<any>()

    const gradeList = (results || []).map((r: any) => r.grade)
    return c.json(jsonOk({ gradeList }))
  })

  app.post('/api/findMajorByGrade', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const grade = Number(body?.grade)
    if (!Number.isFinite(grade)) return c.json(jsonErr(400, '参数错误: 缺少 grade'), 400)

    const { results } = await c.env.DB.prepare('SELECT code, name FROM major WHERE grade = ? ORDER BY code ASC').bind(grade).all<any>()
    return c.json(jsonOk(results || []))
  })

  // /api/findCourseByMajor
  app.post('/api/findCourseByMajor', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const grade = Number(body?.grade)
    const code = String(body?.code || '').trim()
    const calendarId = Number(body?.calendarId)
    if (!Number.isFinite(grade) || !code || !Number.isFinite(calendarId)) return c.json(jsonErr(400, '参数错误'), 400)

    // 找到目标 major（允许 grade <=，与 pk 行为保持一致）
    const majorRow = await c.env.DB
      .prepare('SELECT id FROM major WHERE code = ? AND grade <= ? ORDER BY grade DESC LIMIT 1')
      .bind(code, grade)
      .first<{ id: number }>()
    const targetMajorId = majorRow?.id ?? null

    const courseCodesRes = await c.env.DB
      .prepare(
        `SELECT DISTINCT cd.courseCode as courseCode
         FROM coursedetail cd
         JOIN majorandcourse mac ON mac.courseId = cd.id
         JOIN major m ON m.id = mac.majorId
         WHERE cd.calendarId = ?
           AND m.code = ?
           AND m.grade <= ?
         ORDER BY cd.courseCode ASC`
      )
      .bind(calendarId, code, grade)
      .all<any>()

    const courseCodes = (courseCodesRes.results || []).map((r: any) => String(r.courseCode))
    if (courseCodes.length === 0) return c.json(jsonOk([]))

    // 拉取所有相关 teaching class（coursedetail）
    const placeholders = courseCodes.map(() => '?').join(',')
    const cdRowsRes = await c.env.DB
      .prepare(
        `SELECT
           cd.*,
           f.facultyI18n as facultyI18n,
           ca.campusI18n as campusI18n,
           n.courseLabelName as courseLabelName,
           l.teachingLanguageI18n as teachingLanguageI18n
         FROM coursedetail cd
         LEFT JOIN faculty f ON f.faculty = cd.faculty
         LEFT JOIN campus ca ON ca.campus = cd.campus
         LEFT JOIN coursenature n ON n.courseLabelId = cd.courseLabelId
         LEFT JOIN language l ON l.teachingLanguage = cd.teachingLanguage
         WHERE cd.calendarId = ?
           AND cd.courseCode IN (${placeholders})
         ORDER BY cd.courseCode ASC, cd.code ASC`
      )
      .bind(calendarId, ...courseCodes)
      .all<any>()

    const outMap = new Map<string, any>()

    for (const row of cdRowsRes.results || []) {
      const courseCode = String(row.courseCode || '')
      if (!courseCode) continue

      if (!outMap.has(courseCode)) {
        outMap.set(courseCode, {
          courseCode,
          courseName: String(row.courseName || ''),
          facultyI18n: String(row.facultyI18n || ''),
          credit: Number(row.credit || 0),
          grade,
          courseNature: Array.from(new Set([String(row.courseLabelName || '')].filter(Boolean))),
          courses: [] as any[]
        })
      } else {
        // merge courseNature if needed
        const target = outMap.get(courseCode)
        const label = String(row.courseLabelName || '')
        if (label && !target.courseNature.includes(label)) target.courseNature.push(label)
      }

      const teachers = await getTeachers(c.env.DB, row.id)
      const arrangementInfo = mergeArrangementInfo(teachers)

      let isExclusive = false
      if (targetMajorId) {
        const ex = await c.env.DB
          .prepare('SELECT 1 as ok FROM majorandcourse WHERE majorId = ? AND courseId = ? LIMIT 1')
          .bind(targetMajorId, row.id)
          .first<{ ok: number }>()
        isExclusive = Boolean(ex?.ok)
      }

      outMap.get(courseCode).courses.push({
        code: String(row.code || ''),
        campus: String(row.campusI18n || ''),
        teachers: (teachers || []).map((t: any) => ({ teacherCode: String(t.teacherCode || ''), teacherName: String(t.teacherName || '') })),
        teachingLanguage: String(row.teachingLanguageI18n || ''),
        arrangementInfo,
        isExclusive
      })
    }

    // 与 pk 行为保持一致：同一 teaching class code 合并 arrangementInfo（不同 teacher 可能重复返回）
    for (const v of outMap.values()) {
      const merged: any[] = []
      for (const cls of v.courses) {
        const existing = merged.find((x) => x.code === cls.code)
        if (!existing) {
          merged.push(cls)
        } else {
          const texts = new Set((existing.arrangementInfo || []).map((i: any) => i.arrangementText))
          for (const item of cls.arrangementInfo || []) {
            if (!texts.has(item.arrangementText)) existing.arrangementInfo.push(item)
          }
        }
      }
      v.courses = merged
    }

    return c.json(jsonOk(Array.from(outMap.values())))
  })

  app.post('/api/findOptionalCourseType', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const calendarId = Number(body?.calendarId)
    if (!Number.isFinite(calendarId)) return c.json(jsonErr(400, '参数错误: 缺少 calendarId'), 400)

    const { results } = await c.env.DB
      .prepare('SELECT DISTINCT courseLabelId, courseLabelName FROM coursenature WHERE calendarId = ? ORDER BY courseLabelId DESC')
      .bind(calendarId)
      .all<any>()
    return c.json(jsonOk(results || []))
  })

  app.post('/api/findCourseByNatureId', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const calendarId = Number(body?.calendarId)
    const ids = Array.isArray(body?.ids) ? body.ids.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n)) : []
    if (!Number.isFinite(calendarId) || ids.length === 0) return c.json(jsonErr(400, 'ids 不能为空'), 400)

    const placeholders = ids.map(() => '?').join(',')
    // 课程列表：按 label 分组，返回用于搜索/添加的粗略信息
    const rows = await c.env.DB
      .prepare(
        `SELECT
           cd.courseLabelId as courseLabelId,
           n.courseLabelName as courseLabelName,
           cd.courseCode as courseCode,
           cd.courseName as courseName,
           f.facultyI18n as facultyI18n,
           GROUP_CONCAT(DISTINCT ca.campusI18n) as campus_list
         FROM coursedetail cd
         LEFT JOIN coursenature n ON n.courseLabelId = cd.courseLabelId
         LEFT JOIN faculty f ON f.faculty = cd.faculty
         LEFT JOIN campus ca ON ca.campus = cd.campus
         WHERE cd.calendarId = ?
           AND cd.courseLabelId IN (${placeholders})
         GROUP BY cd.courseLabelId, cd.courseCode, cd.courseName, f.facultyI18n
         ORDER BY cd.courseLabelId DESC, cd.courseCode ASC`
      )
      .bind(calendarId, ...ids)
      .all<any>()

    const map = new Map<number, { courseLabelId: number; courseLabelName: string; courses: any[] }>()
    for (const r of rows.results || []) {
      const id = Number(r.courseLabelId)
      if (!map.has(id)) {
        map.set(id, { courseLabelId: id, courseLabelName: String(r.courseLabelName || ''), courses: [] })
      }
      map.get(id)!.courses.push({
        campus: String(r.campus_list || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        courseCode: String(r.courseCode || ''),
        courseName: String(r.courseName || ''),
        facultyI18n: String(r.facultyI18n || '')
      })
    }

    return c.json(jsonOk(Array.from(map.values())))
  })

  app.post('/api/findCourseDetailByCode', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const calendarId = Number(body?.calendarId)
    const courseCode = String(body?.courseCode || '').trim()
    const courseCodes: string[] = Array.isArray(body?.courseCodes) ? body.courseCodes.map((x: any) => String(x).trim()).filter(Boolean) : []
    if (!Number.isFinite(calendarId)) return c.json(jsonErr(400, '参数错误: 缺少 calendarId'), 400)

    const codes = courseCode ? [courseCode] : courseCodes
    if (codes.length === 0) return c.json(jsonErr(400, '参数错误: 缺少 courseCode(s)'), 400)

    const placeholders = codes.map(() => '?').join(',')
    const cdRows = await c.env.DB
      .prepare(
        `SELECT
           cd.*,
           ca.campusI18n as campusI18n,
           l.teachingLanguageI18n as teachingLanguageI18n
         FROM coursedetail cd
         LEFT JOIN campus ca ON ca.campus = cd.campus
         LEFT JOIN language l ON l.teachingLanguage = cd.teachingLanguage
         WHERE cd.calendarId = ?
           AND cd.courseCode IN (${placeholders})
         ORDER BY cd.courseCode ASC, cd.code ASC`
      )
      .bind(calendarId, ...codes)
      .all<any>()

    const byCourseCode = new Map<string, any[]>()
    for (const row of cdRows.results || []) {
      const cc = String(row.courseCode || '')
      if (!cc) continue
      if (!byCourseCode.has(cc)) byCourseCode.set(cc, [])

      const teachers = await getTeachers(c.env.DB, row.id)
      const arrangementInfo = mergeArrangementInfo(teachers)

      byCourseCode.get(cc)!.push({
        code: String(row.code || ''),
        teachers: (teachers || []).map((t: any) => ({ teacherCode: String(t.teacherCode || ''), teacherName: String(t.teacherName || '') })),
        campusI18n: String(row.campusI18n || ''),
        teachingLanguageI18n: String(row.teachingLanguageI18n || ''),
        arrangementInfo
      })
    }

    // 输出格式：单个 -> list；批量 -> dict
    if (courseCode) {
      const list = byCourseCode.get(courseCode) || []
      // pk 后端会把 campusI18n/teachingLanguageI18n 映射为 campus/teachingLanguage（前端接口定义）
      const normalized = list.map((x) => ({
        code: x.code,
        teachers: x.teachers,
        campus: x.campusI18n,
        teachingLanguage: x.teachingLanguageI18n,
        arrangementInfo: x.arrangementInfo
      }))
      return c.json(jsonOk(normalized))
    }

    const out: Record<string, any[]> = {}
    for (const [k, list] of byCourseCode.entries()) {
      out[k] = list.map((x) => ({
        code: x.code,
        teachers: x.teachers,
        campus: x.campusI18n,
        teachingLanguage: x.teachingLanguageI18n,
        arrangementInfo: x.arrangementInfo
      }))
    }
    return c.json(jsonOk(out))
  })

  app.post('/api/findCourseBySearch', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const calendarId = Number(body?.calendarId)
    if (!Number.isFinite(calendarId)) return c.json(jsonErr(400, '参数错误: 缺少 calendarId'), 400)

    const courseName = String(body?.courseName || '').trim()
    const courseCode = String(body?.courseCode || '').trim()
    const teacherCode = String(body?.teacherCode || '').trim()
    const teacherName = String(body?.teacherName || '').trim()
    const campus = String(body?.campus || '').trim()
    const faculty = String(body?.faculty || '').trim()

    const where: string[] = ['cd.calendarId = ?']
    const args: any[] = [calendarId]

    if (courseName) {
      where.push('cd.courseName LIKE ?')
      args.push(`%${courseName}%`)
    }
    if (courseCode) {
      where.push('cd.courseCode LIKE ?')
      args.push(`%${courseCode}%`)
    }
    if (campus) {
      where.push('cd.campus = ?')
      args.push(campus)
    }
    if (faculty) {
      where.push('cd.faculty = ?')
      args.push(faculty)
    }
    if (teacherCode) {
      where.push('t.teacherCode LIKE ?')
      args.push(`%${teacherCode}%`)
    }
    if (teacherName) {
      where.push('t.teacherName LIKE ?')
      args.push(`%${teacherName}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const sizeLimit = 100

    const query = `
      SELECT
        cd.courseCode as courseCode,
        cd.courseName as courseName,
        f.facultyI18n as facultyI18n,
        GROUP_CONCAT(DISTINCT n.courseLabelName) as courseNature,
        GROUP_CONCAT(DISTINCT ca.campusI18n) as campus_list,
        MAX(cd.credit) as credit
      FROM coursedetail cd
      LEFT JOIN faculty f ON f.faculty = cd.faculty
      LEFT JOIN campus ca ON ca.campus = cd.campus
      LEFT JOIN coursenature n ON n.courseLabelId = cd.courseLabelId
      LEFT JOIN teacher t ON t.teachingClassId = cd.id
      ${whereSql}
      GROUP BY cd.courseCode, cd.courseName, f.facultyI18n
      ORDER BY cd.courseCode ASC
      LIMIT ${sizeLimit}
    `

    const { results } = await c.env.DB.prepare(query).bind(...args).all<any>()
    const courses = (results || []).map((r: any) => ({
      courseCode: String(r.courseCode || ''),
      courseName: String(r.courseName || ''),
      facultyI18n: String(r.facultyI18n || ''),
      courseNature: String(r.courseNature || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      campus_list: String(r.campus_list || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      credit: Number(r.credit || 0)
    }))

    return c.json(jsonOk({ courses, sizeLimit }))
  })

  app.post('/api/findCourseByTime', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const calendarId = Number(body?.calendarId)
    const day = Number(body?.day)
    const section = Number(body?.section)
    if (!Number.isFinite(calendarId) || !Number.isFinite(day) || !Number.isFinite(section)) return c.json(jsonErr(400, '输入参数有误'), 400)

    const patterns = optCourseQueryListGenerator(day, section)
    if (!patterns) return c.json(jsonErr(400, '输入参数有误', []), 400)

    const orLike = patterns.map(() => 't.arrangeInfoText LIKE ?').join(' OR ')
    const query = `
      SELECT
        cd.courseCode as courseCode,
        cd.courseName as courseName,
        f.facultyI18n as faculty,
        MAX(cd.credit) as credit,
        GROUP_CONCAT(DISTINCT n.courseLabelName) as courseNature,
        GROUP_CONCAT(DISTINCT ca.campusI18n) as campus
      FROM coursedetail cd
      JOIN teacher t ON t.teachingClassId = cd.id
      LEFT JOIN faculty f ON f.faculty = cd.faculty
      LEFT JOIN campus ca ON ca.campus = cd.campus
      LEFT JOIN coursenature n ON n.courseLabelId = cd.courseLabelId
      WHERE cd.calendarId = ?
        AND (${orLike})
      GROUP BY cd.courseCode, cd.courseName, f.facultyI18n
      ORDER BY cd.courseCode ASC
    `

    const { results } = await c.env.DB.prepare(query).bind(calendarId, ...patterns).all<any>()
    const data = (results || []).map((r: any) => ({
      courseCode: String(r.courseCode || ''),
      courseName: String(r.courseName || ''),
      facultyI18n: String(r.faculty || ''),
      credit: Number(r.credit || 0),
      courseNature: String(r.courseNature || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      campus: String(r.campus || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }))

    return c.json(jsonOk(data))
  })

  app.get('/api/getLatestUpdateTime', async (c) => {
    const row = await c.env.DB.prepare('SELECT fetchTime FROM fetchlog ORDER BY fetchTime DESC LIMIT 1').first<{ fetchTime: number }>()
    const v = row?.fetchTime ? new Date(row.fetchTime * 1000).toISOString().slice(0, 10) : null
    return c.json(jsonOk(v))
  })

  app.post('/api/getLatestCourseInfo', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const calendarId = Number(body?.calendarId)
    if (!Number.isFinite(calendarId)) return c.json(jsonErr(400, '参数错误: 缺少 calendarId'), 400)

    const majorCourseCodes: string[] = Array.isArray(body?.majorCourseCodes) ? body.majorCourseCodes.map((x: any) => String(x).trim()).filter(Boolean) : []
    const otherCourseCodes: string[] = Array.isArray(body?.otherCourseCodes) ? body.otherCourseCodes.map((x: any) => String(x).trim()).filter(Boolean) : []
    const majorInfo = body?.majorInfo && typeof body.majorInfo === 'object' ? body.majorInfo : null

    const allCodes = Array.from(new Set([...majorCourseCodes, ...otherCourseCodes]))
    const out: Record<string, any[]> = {}
    for (const cc of allCodes) out[cc] = []

    if (allCodes.length === 0) return c.json(jsonOk(out))

    const placeholders = allCodes.map(() => '?').join(',')
    const cdRows = await c.env.DB
      .prepare(
        `SELECT
           cd.*,
           ca.campusI18n as campusI18n,
           l.teachingLanguageI18n as teachingLanguageI18n
         FROM coursedetail cd
         LEFT JOIN campus ca ON ca.campus = cd.campus
         LEFT JOIN language l ON l.teachingLanguage = cd.teachingLanguage
         WHERE cd.calendarId = ?
           AND cd.courseCode IN (${placeholders})
         ORDER BY cd.courseCode ASC, cd.code ASC`
      )
      .bind(calendarId, ...allCodes)
      .all<any>()

    // target majorId for isExclusive
    let targetMajorId: number | null = null
    if (majorInfo?.grade && majorInfo?.code) {
      const row = await c.env.DB
        .prepare('SELECT id FROM major WHERE code = ? AND grade <= ? ORDER BY grade DESC LIMIT 1')
        .bind(String(majorInfo.code), Number(majorInfo.grade))
        .first<{ id: number }>()
      targetMajorId = row?.id ?? null
    }

    for (const row of cdRows.results || []) {
      const cc = String(row.courseCode || '')
      if (!cc) continue

      const teachers = await getTeachers(c.env.DB, row.id)
      const arrangementInfo = mergeArrangementInfo(teachers)

      let isExclusive: boolean | undefined = undefined
      if (majorCourseCodes.includes(cc)) {
        if (!targetMajorId) {
          isExclusive = false
        } else {
          const ex = await c.env.DB
            .prepare('SELECT 1 as ok FROM majorandcourse WHERE majorId = ? AND courseId = ? LIMIT 1')
            .bind(targetMajorId, row.id)
            .first<{ ok: number }>()
          isExclusive = Boolean(ex?.ok)
        }
      }

      out[cc] = out[cc] || []
      out[cc].push({
        code: String(row.code || ''),
        teachers: (teachers || []).map((t: any) => ({ teacherCode: String(t.teacherCode || ''), teacherName: String(t.teacherName || '') })),
        campusI18n: String(row.campusI18n || ''),
        teachingLanguageI18n: String(row.teachingLanguageI18n || ''),
        arrangementInfo,
        ...(typeof isExclusive === 'boolean' ? { isExclusive } : {})
      })
    }

    // normalize key fields for frontend
    for (const key of Object.keys(out)) {
      out[key] = (out[key] || []).map((x: any) => ({
        code: x.code,
        teachers: x.teachers,
        campus: x.campusI18n,
        teachingLanguage: x.teachingLanguageI18n,
        arrangementInfo: x.arrangementInfo,
        ...(typeof x.isExclusive === 'boolean' ? { isExclusive: x.isExclusive } : {})
      }))
    }

    return c.json(jsonOk(out))
  })
}
