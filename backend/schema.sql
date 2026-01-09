DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS categories;

-- 课程类别
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- 教师表
CREATE TABLE teachers (
    id INTEGER PRIMARY KEY,
    tid TEXT,
    name TEXT NOT NULL,
    title TEXT,
    pinyin TEXT,
    department TEXT
);

-- 课程表
CREATE TABLE courses (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    credit REAL DEFAULT 0,
    department TEXT,
    main_teacher_id INTEGER,
    review_count INTEGER DEFAULT 0,
    review_avg REAL DEFAULT 0,
    search_keywords TEXT,
    FOREIGN KEY (main_teacher_id) REFERENCES teachers(id)
);

-- 评价表
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    semester TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    score TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    approve_count INTEGER DEFAULT 0,
    disapprove_count INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT 0,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_search ON courses(search_keywords);
CREATE INDEX idx_reviews_course ON reviews(course_id);
CREATE INDEX idx_reviews_created ON reviews(created_at);
