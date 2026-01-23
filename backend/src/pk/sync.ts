import { parseMajorString } from './utils'

type SyncResult = {
  calendarIds: number[]
  teachingClassInserted: number
}

type ManualArrangeResponse = {
  data?: {
    total_?: number
    list?: any[]
  }
}

function asInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN
  return Number.isFinite(n) ? n : null
}

function normalizeStr(value: unknown): string {
  return String(value ?? '').trim()
}

function computeNewCode(course: any): { newCourseCode: string | null; newCode: string | null } {
  const newCourseCode = normalizeStr(course?.newCourseCode) || null
  if (!newCourseCode) return { newCourseCode: null, newCode: null }

  const code = normalizeStr(course?.code)
  const courseCode = normalizeStr(course?.courseCode)
  if (!code || !courseCode || !code.startsWith(courseCode) || code.length < 2) return { newCourseCode, newCode: null }

  const suffix = code.slice(-2)
  return { newCourseCode, newCode: suffix ? `${newCourseCode}${suffix}` : null }
}

async function upsertMajor(db: D1Database, majorName: string, calendarId: number) {
  const parsed = parseMajorString(majorName)
  await db
    .prepare(
      `INSERT INTO major (code, grade, name, calendarId)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         code=excluded.code,
         grade=excluded.grade,
         calendarId=excluded.calendarId`
    )
    .bind(parsed.code, parsed.grade, parsed.name, calendarId)
    .run()
}

async function getMajorIdByName(db: D1Database, name: string): Promise<number | null> {
  const row = await db.prepare('SELECT id FROM major WHERE name = ? LIMIT 1').bind(name).first<{ id: number }>()
  return row?.id ?? null
}

async function deleteCalendarData(db: D1Database, calendarId: number) {
  const ids = await db.prepare('SELECT id FROM coursedetail WHERE calendarId = ?').bind(calendarId).all<{ id: number }>()
  const classIds = (ids.results || []).map((r) => r.id)

  if (classIds.length > 0) {
    const placeholders = classIds.map(() => '?').join(',')
    await db.prepare(`DELETE FROM teacher WHERE teachingClassId IN (${placeholders})`).bind(...classIds).run()
    await db.prepare(`DELETE FROM majorandcourse WHERE courseId IN (${placeholders})`).bind(...classIds).run()
  }

  await db.prepare('DELETE FROM coursedetail WHERE calendarId = ?').bind(calendarId).run()
  await db.prepare('DELETE FROM calendar WHERE calendarId = ?').bind(calendarId).run()
}

async function ensurePkTables(db: D1Database) {
  // 仅在数据库是全新或未执行 migration 时兜底；正常由 migrations/001_pk_schema.sql 创建。
  // 这里不做 ALTER TABLE，避免重复执行导致失败。
  await db.prepare('CREATE TABLE IF NOT EXISTS calendar (calendarId INTEGER PRIMARY KEY, calendarIdI18n TEXT)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS language (teachingLanguage TEXT PRIMARY KEY, teachingLanguageI18n TEXT, calendarId INTEGER)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS coursenature (courseLabelId INTEGER PRIMARY KEY, courseLabelName TEXT, calendarId INTEGER)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS assessment (assessmentMode TEXT PRIMARY KEY, assessmentModeI18n TEXT, calendarId INTEGER)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS campus (campus TEXT PRIMARY KEY, campusI18n TEXT, calendarId INTEGER)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS faculty (faculty TEXT PRIMARY KEY, facultyI18n TEXT, calendarId INTEGER)').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS major (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, grade INTEGER, name TEXT UNIQUE, calendarId INTEGER)').run()
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS coursedetail (id INTEGER PRIMARY KEY, code TEXT, name TEXT, courseLabelId INTEGER, assessmentMode TEXT, period REAL, weekHour REAL, campus TEXT, number INTEGER, elcNumber INTEGER, startWeek INTEGER, endWeek INTEGER, courseCode TEXT, courseName TEXT, credit REAL, teachingLanguage TEXT, faculty TEXT, calendarId INTEGER, newCourseCode TEXT, newCode TEXT)'
  ).run()
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS teacher (id INTEGER PRIMARY KEY, teachingClassId INTEGER, teacherCode TEXT, teacherName TEXT, arrangeInfoText TEXT)'
  ).run()
  await db.prepare('CREATE TABLE IF NOT EXISTS majorandcourse (majorId INTEGER NOT NULL, courseId INTEGER NOT NULL, PRIMARY KEY (majorId, courseId))').run()
  await db.prepare('CREATE TABLE IF NOT EXISTS fetchlog (fetchTime INTEGER DEFAULT (strftime(\'%s\',\'now\')), msg TEXT)').run()
}

async function ensureAliasesTable(db: D1Database) {
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS course_aliases (system TEXT NOT NULL, alias TEXT NOT NULL, course_id INTEGER NOT NULL, created_at INTEGER DEFAULT (strftime(\'%s\',\'now\')), PRIMARY KEY (system, alias))'
    )
    .run()
}

async function tryBindCourseAliases(db: D1Database, course: any) {
  const courseCode = normalizeStr(course?.courseCode)
  const newCourseCode = normalizeStr(course?.newCourseCode)

  const candidates = [newCourseCode, courseCode].filter(Boolean)
  if (candidates.length === 0) return

  const placeholders = candidates.map(() => '?').join(',')
  const row = await db
    .prepare(`SELECT id FROM courses WHERE code IN (${placeholders}) LIMIT 1`)
    .bind(...candidates)
    .first<{ id: number }>()

  if (!row?.id) return

  for (const alias of candidates) {
    await db
      .prepare(
        `INSERT INTO course_aliases (system, alias, course_id)
         VALUES ('onesystem', ?, ?)
         ON CONFLICT(system, alias) DO UPDATE SET course_id=excluded.course_id`
      )
      .bind(alias, row.id)
      .run()
  }
}

async function upsertCourseList(db: D1Database, list: any[], calendarId: number): Promise<number> {
  let inserted = 0

  for (const course of list) {
    const calendarIdI18n = normalizeStr(course?.calendarIdI18n) || null
    await db.prepare('INSERT OR REPLACE INTO calendar (calendarId, calendarIdI18n) VALUES (?, ?)').bind(calendarId, calendarIdI18n).run()

    const teachingLanguage = normalizeStr(course?.teachingLanguage) || null
    const teachingLanguageI18n = normalizeStr(course?.teachingLanguageI18n) || null
    if (teachingLanguage) {
      await db
        .prepare(
          `INSERT INTO language (teachingLanguage, teachingLanguageI18n, calendarId)
           VALUES (?, ?, ?)
           ON CONFLICT(teachingLanguage) DO UPDATE SET teachingLanguageI18n=excluded.teachingLanguageI18n, calendarId=excluded.calendarId`
        )
        .bind(teachingLanguage, teachingLanguageI18n, calendarId)
        .run()
    }

    const courseLabelId = asInt(course?.courseLabelId)
    const courseLabelName = normalizeStr(course?.courseLabelName) || null
    if (courseLabelId !== null) {
      await db
        .prepare(
          `INSERT INTO coursenature (courseLabelId, courseLabelName, calendarId)
           VALUES (?, ?, ?)
           ON CONFLICT(courseLabelId) DO UPDATE SET courseLabelName=excluded.courseLabelName, calendarId=excluded.calendarId`
        )
        .bind(courseLabelId, courseLabelName, calendarId)
        .run()
    }

    const assessmentMode = normalizeStr(course?.assessmentMode) || null
    const assessmentModeI18n = normalizeStr(course?.assessmentModeI18n) || null
    if (assessmentMode) {
      await db
        .prepare(
          `INSERT INTO assessment (assessmentMode, assessmentModeI18n, calendarId)
           VALUES (?, ?, ?)
           ON CONFLICT(assessmentMode) DO UPDATE SET assessmentModeI18n=excluded.assessmentModeI18n, calendarId=excluded.calendarId`
        )
        .bind(assessmentMode, assessmentModeI18n, calendarId)
        .run()
    }

    const campus = normalizeStr(course?.campus) || null
    const campusI18n = normalizeStr(course?.campusI18n) || null
    if (campus) {
      await db
        .prepare(
          `INSERT INTO campus (campus, campusI18n, calendarId)
           VALUES (?, ?, ?)
           ON CONFLICT(campus) DO UPDATE SET campusI18n=excluded.campusI18n, calendarId=excluded.calendarId`
        )
        .bind(campus, campusI18n, calendarId)
        .run()
    }

    const faculty = normalizeStr(course?.faculty) || null
    const facultyI18n = normalizeStr(course?.facultyI18n) || null
    if (faculty) {
      await db
        .prepare(
          `INSERT INTO faculty (faculty, facultyI18n, calendarId)
           VALUES (?, ?, ?)
           ON CONFLICT(faculty) DO UPDATE SET facultyI18n=excluded.facultyI18n, calendarId=excluded.calendarId`
        )
        .bind(faculty, facultyI18n, calendarId)
        .run()
    }

    const majors: unknown[] = Array.isArray(course?.majorList) ? course.majorList : []
    for (const major of majors) {
      const majorName = normalizeStr(major)
      if (!majorName) continue
      await upsertMajor(db, majorName, calendarId)
    }

    const { newCourseCode, newCode } = computeNewCode(course)

    const teachingClassId = asInt(course?.id)
    if (teachingClassId === null) continue

    await db
      .prepare(
        `INSERT OR REPLACE INTO coursedetail
         (id, code, name, courseLabelId, assessmentMode, period, weekHour, campus, number, elcNumber, startWeek, endWeek,
          courseCode, courseName, credit, teachingLanguage, faculty, calendarId, newCourseCode, newCode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        teachingClassId,
        normalizeStr(course?.code) || null,
        normalizeStr(course?.name) || null,
        courseLabelId,
        assessmentMode,
        course?.period ?? null,
        course?.weekHour ?? null,
        campus,
        course?.number ?? null,
        course?.elcNumber ?? null,
        course?.startWeek ?? null,
        course?.endWeek ?? null,
        normalizeStr(course?.courseCode) || null,
        normalizeStr(course?.courseName) || null,
        course?.credits ?? null,
        teachingLanguage,
        faculty,
        calendarId,
        newCourseCode,
        newCode
      )
      .run()

    const arrangeInfo = normalizeStr(course?.arrangeInfo || '')
    const teachers = Array.isArray(course?.teacherList) ? course.teacherList : []
    const arrangeLines = arrangeInfo ? arrangeInfo.split('\n') : []

    for (const t of teachers) {
      const teacherId = asInt(t?.id)
      if (teacherId === null) continue

      const teacherName = normalizeStr(t?.teacherName)
      let teacherSchedule = ''
      for (const line of arrangeLines) {
        if (teacherName && line.includes(teacherName)) teacherSchedule += `${line}\n`
      }

      await db
        .prepare('INSERT OR REPLACE INTO teacher (id, teachingClassId, teacherCode, teacherName, arrangeInfoText) VALUES (?, ?, ?, ?, ?)')
        .bind(teacherId, teachingClassId, normalizeStr(t?.teacherCode) || null, teacherName || null, teacherSchedule)
        .run()
    }

    for (const major of majors) {
      const majorName = normalizeStr(major)
      if (!majorName) continue
      const majorId = await getMajorIdByName(db, majorName)
      if (!majorId) continue
      await db.prepare('INSERT OR IGNORE INTO majorandcourse (majorId, courseId) VALUES (?, ?)').bind(majorId, teachingClassId).run()
    }

    await tryBindCourseAliases(db, course)

    inserted++
  }

  return inserted
}

async function fetchManualArrangePage(opts: { sessionCookie: string; calendarId: number; pageNum: number; pageSize: number }) {
  const { sessionCookie, calendarId, pageNum, pageSize } = opts
  const payload = {
    condition: {
      trainingLevel: '',
      campus: '',
      calendar: calendarId,
      college: '',
      course: '',
      ids: [],
      isChineseTeaching: null
    },
    pageNum_: pageNum,
    pageSize_: pageSize
  }

  const res = await fetch('https://1.tongji.edu.cn/api/arrangementservice/manualArrange/page?profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      Referer: 'https://1.tongji.edu.cn/taskResultQuery',
      Cookie: sessionCookie
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`一系统请求失败: HTTP ${res.status} ${text.slice(0, 200)}`)
  }

  return (await res.json()) as ManualArrangeResponse
}

export async function syncOnesystemToPkTables(opts: {
  db: D1Database
  sessionCookie: string
  calendarId: number
  depth?: number
}): Promise<SyncResult> {
  const { db, sessionCookie } = opts
  const calendarId = Math.trunc(opts.calendarId)
  const depth = Math.max(1, Math.trunc(opts.depth ?? 1))

  if (!Number.isFinite(calendarId) || calendarId <= 0) throw new Error('calendarId 无效')
  if (!sessionCookie || !sessionCookie.trim()) throw new Error('缺少 ONESYSTEM_COOKIE（Cookie header）')

  await ensurePkTables(db)
  await ensureAliasesTable(db)

  const calendarIds: number[] = []
  let teachingClassInserted = 0

  for (let i = calendarId - depth + 1; i <= calendarId; i++) {
    calendarIds.push(i)

    // 只刷新当前要同步的学期数据；不会影响其它学期。
    // 这样同一学期重复执行不会翻倍，同时也能清理已下架/变更的教学班（避免残留陈旧数据）。
    await deleteCalendarData(db, i)

    const pageSize = 200
    const first = await fetchManualArrangePage({ sessionCookie, calendarId: i, pageNum: 1, pageSize })
    const total = first?.data?.total_ ?? 0
    const firstList = Array.isArray(first?.data?.list) ? first.data!.list! : []
    teachingClassInserted += await upsertCourseList(db, firstList, i)

    const totalPages = Math.floor(total / pageSize) + 1
    for (let page = 2; page <= totalPages; page++) {
      const next = await fetchManualArrangePage({ sessionCookie, calendarId: i, pageNum: page, pageSize })
      const list = Array.isArray(next?.data?.list) ? next.data!.list! : []
      teachingClassInserted += await upsertCourseList(db, list, i)
    }

    await db.prepare('INSERT INTO fetchlog (fetchTime, msg) VALUES (?, ?)').bind(Math.floor(Date.now() / 1000), `sync calendarId=${i}`).run()
  }

  return { calendarIds, teachingClassInserted }
}
