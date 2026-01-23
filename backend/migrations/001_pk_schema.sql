-- PK (排课模拟器) 数据域：用于支持 /api/getAllCalendar 等兼容接口
-- 设计目标：尽量复用 pk 项目里 MySQL 的表结构与字段语义，便于无损迁移与 API 兼容。

-- 课程别名映射：用于把一系统/新课号等多套 code 统一到选课站的 courses.id
CREATE TABLE IF NOT EXISTS course_aliases (
  system TEXT NOT NULL,
  alias TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (system, alias),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_course_aliases_course_id ON course_aliases(course_id);

-- 元数据字典（计划用）
CREATE TABLE IF NOT EXISTS meta_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- onesystem / pk / main
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,       -- string/number/json/...
  nullable INTEGER DEFAULT 1,
  description TEXT DEFAULT '',
  example TEXT DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_fields_unique ON meta_fields(source, field_name);

CREATE TABLE IF NOT EXISTS meta_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- onesystem
  source_field TEXT NOT NULL,
  target TEXT NOT NULL,           -- pk / main / normalized
  target_field TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  transform TEXT DEFAULT ''       -- 简要说明/规则（不做执行引擎）
);

CREATE INDEX IF NOT EXISTS idx_meta_mappings_source ON meta_mappings(source, source_field);

-- =========================
-- pk 数据表（与 pk/crawler/utils/tjSql.py 对齐）
-- =========================

CREATE TABLE IF NOT EXISTS calendar (
  calendarId INTEGER PRIMARY KEY,
  calendarIdI18n TEXT
);

CREATE TABLE IF NOT EXISTS language (
  teachingLanguage TEXT PRIMARY KEY,
  teachingLanguageI18n TEXT,
  calendarId INTEGER
);

CREATE TABLE IF NOT EXISTS coursenature (
  courseLabelId INTEGER PRIMARY KEY,
  courseLabelName TEXT,
  calendarId INTEGER
);

CREATE TABLE IF NOT EXISTS assessment (
  assessmentMode TEXT PRIMARY KEY,
  assessmentModeI18n TEXT,
  calendarId INTEGER
);

CREATE TABLE IF NOT EXISTS campus (
  campus TEXT PRIMARY KEY,
  campusI18n TEXT,
  calendarId INTEGER
);

CREATE TABLE IF NOT EXISTS faculty (
  faculty TEXT PRIMARY KEY,
  facultyI18n TEXT,
  calendarId INTEGER
);

CREATE TABLE IF NOT EXISTS major (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  grade INTEGER,
  name TEXT UNIQUE,
  calendarId INTEGER
);

CREATE INDEX IF NOT EXISTS idx_major_grade ON major(grade);
CREATE INDEX IF NOT EXISTS idx_major_code ON major(code);

-- teaching class
CREATE TABLE IF NOT EXISTS coursedetail (
  id INTEGER PRIMARY KEY,         -- teachingClassId
  code TEXT,
  name TEXT,
  courseLabelId INTEGER,
  assessmentMode TEXT,
  period REAL,
  weekHour REAL,
  campus TEXT,
  number INTEGER,
  elcNumber INTEGER,
  startWeek INTEGER,
  endWeek INTEGER,
  courseCode TEXT,               -- 课程号
  courseName TEXT,
  credit REAL,
  teachingLanguage TEXT,
  faculty TEXT,
  calendarId INTEGER,
  newCourseCode TEXT,            -- 新课号（如 CCE1208）
  newCode TEXT                   -- 新教学班号（newCourseCode + suffix）
);

CREATE INDEX IF NOT EXISTS idx_coursedetail_calendar ON coursedetail(calendarId);
CREATE INDEX IF NOT EXISTS idx_coursedetail_courseCode ON coursedetail(courseCode);
CREATE INDEX IF NOT EXISTS idx_coursedetail_code ON coursedetail(code);
CREATE INDEX IF NOT EXISTS idx_coursedetail_newCourseCode ON coursedetail(newCourseCode);

CREATE TABLE IF NOT EXISTS teacher (
  id INTEGER PRIMARY KEY,
  teachingClassId INTEGER,
  teacherCode TEXT,
  teacherName TEXT,
  arrangeInfoText TEXT
);

CREATE INDEX IF NOT EXISTS idx_teacher_teachingClassId ON teacher(teachingClassId);
CREATE INDEX IF NOT EXISTS idx_teacher_teacherCode ON teacher(teacherCode);
CREATE INDEX IF NOT EXISTS idx_teacher_teacherName ON teacher(teacherName);

CREATE TABLE IF NOT EXISTS majorandcourse (
  majorId INTEGER NOT NULL,
  courseId INTEGER NOT NULL,
  PRIMARY KEY (majorId, courseId)
);

CREATE INDEX IF NOT EXISTS idx_majorandcourse_courseId ON majorandcourse(courseId);

CREATE TABLE IF NOT EXISTS fetchlog (
  fetchTime INTEGER DEFAULT (strftime('%s', 'now')),
  msg TEXT
);

