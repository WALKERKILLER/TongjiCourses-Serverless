-- 本地测试用：插入少量 pk（排课模拟器）数据 + 课号映射（course_aliases）
-- 使用方法：
--   npm run db:seed:pk:local

-- calendar / meta
INSERT OR REPLACE INTO calendar (calendarId, calendarIdI18n) VALUES
(99999, '本地测试学期');

INSERT OR REPLACE INTO campus (campus, campusI18n, calendarId) VALUES
('SP', '四平路校区', 99999),
('JD', '嘉定校区', 99999);

INSERT OR REPLACE INTO faculty (faculty, facultyI18n, calendarId) VALUES
('CS', '计算机科学与技术系', 99999);

INSERT OR REPLACE INTO coursenature (courseLabelId, courseLabelName, calendarId) VALUES
(1, '专业必修', 99999),
(2, '通识选修', 99999);

INSERT OR REPLACE INTO language (teachingLanguage, teachingLanguageI18n, calendarId) VALUES
('ZH', '中文', 99999),
('EN', '英文', 99999);

INSERT OR REPLACE INTO assessment (assessmentMode, assessmentModeI18n, calendarId) VALUES
('EXAM', '考试', 99999),
('CHECK', '考查', 99999);

-- major
INSERT OR REPLACE INTO major (id, code, grade, name, calendarId) VALUES
(9000, '03074', 2025, '2025(03074 测试专业)', 99999);

-- coursedetail (id = teachingClassId)
INSERT OR REPLACE INTO coursedetail (
  id,
  code,
  name,
  courseLabelId,
  assessmentMode,
  period,
  weekHour,
  campus,
  number,
  elcNumber,
  startWeek,
  endWeek,
  courseCode,
  courseName,
  credit,
  teachingLanguage,
  faculty,
  calendarId,
  newCourseCode,
  newCode
) VALUES
(900001, 'TJCS10101', '计算机程序设计-1班', 1, 'EXAM', 48, 3, 'SP', 60, 0, 1, 16, 'TJCS101', '计算机程序设计', 3, 'ZH', 'CS', 99999, 'CS101', 'CS10101'),
(900002, 'TJCS10102', '计算机程序设计-2班', 1, 'EXAM', 48, 3, 'SP', 60, 0, 1, 16, 'TJCS101', '计算机程序设计', 3, 'ZH', 'CS', 99999, 'CS101', 'CS10102'),
(900003, 'TJCS20101', '数据结构与算法-1班', 1, 'EXAM', 64, 4, 'JD', 80, 0, 1, 16, 'TJCS201', '数据结构与算法', 4, 'ZH', 'CS', 99999, 'CS201', 'CS20101');

-- teacher + arrangeInfoText（每行一条安排，\n 分隔）
INSERT OR REPLACE INTO teacher (id, teachingClassId, teacherCode, teacherName, arrangeInfoText) VALUES
(1, 900001, 'T001', '张伟', '张伟(T001) 星期一1-2节[1-16周] 四平路校区 A101\n张伟(T001) 星期三3-4节[1-16周] 四平路校区 A101'),
(2, 900002, 'T006', '李娜', '李娜(T006) 星期二1-2节[1-16周] 四平路校区 B202\n李娜(T006) 星期四3-4节[1-16周] 四平路校区 B202'),
(3, 900003, 'T001', '张伟', '张伟(T001) 星期五1-2节[1-16周] 嘉定校区 C303');

-- major-course mapping
INSERT OR REPLACE INTO majorandcourse (majorId, courseId) VALUES
(9000, 900001),
(9000, 900002),
(9000, 900003);

-- 将一系统课号映射到选课站 courses.id（用于排课模拟器内查看课程评价）
-- 这里把 TJCS101 → courses.id=1（CS101），TJCS201 → courses.id=2（CS201）
INSERT OR REPLACE INTO course_aliases (system, alias, course_id) VALUES
('onesystem', 'TJCS101', 1),
('onesystem', 'TJCS201', 2);

-- 额外插入一些“可视化更强”的评价（带评课人），方便测试移动端扇面卡片效果
DELETE FROM reviews WHERE comment LIKE '[PK-DEMO]%' AND course_id IN (1, 2);

INSERT INTO reviews (course_id, semester, rating, comment, created_at, is_hidden, reviewer_name, reviewer_avatar) VALUES
(1, '2024-2025-1', 5, '[PK-DEMO] 讲得非常清楚，配套作业难度合理，强推。', strftime('%s','now') - 10, 0, '小猫同学', ''),
(1, '2024-2025-1', 4, '[PK-DEMO] 上课节奏快但收获大，建议提前预习。', strftime('%s','now') - 20, 0, '匿名用户', ''),
(1, '2024-2025-1', 5, '[PK-DEMO] 实验很有趣，助教答疑很及时。', strftime('%s','now') - 30, 0, 'Alice', ''),
(1, '2023-2024-2', 3, '[PK-DEMO] 内容多，考试偏细节，需要多刷题。', strftime('%s','now') - 40, 0, 'Bob', ''),
(1, '2023-2024-2', 4, '[PK-DEMO] 给分不错，课堂互动多，体验很好。', strftime('%s','now') - 50, 0, 'Carol', '');

