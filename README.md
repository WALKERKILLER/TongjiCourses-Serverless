# YOURTJ选课社区 - Serverless 版

基于 Cloudflare Workers + D1 + Pages 的选课点评社区。

## 项目结构

```
TongJiCourses/
├── backend/          # Cloudflare Workers 后端
│   ├── src/index.ts  # API 逻辑
│   ├── schema.sql    # D1 数据库结构
│   └── wrangler.toml # Workers 配置
└── frontend/         # React + Vite 前端
    └── src/
        ├── pages/    # 页面组件
        └── services/ # API 服务
```

## 部署步骤

### 1. 后端部署

```bash
cd backend

# 创建 D1 数据库
wrangler d1 create jcourse-db

# 更新 wrangler.toml 中的 database_id

# 初始化数据库
wrangler d1 execute jcourse-db --remote --file=./schema.sql

# 设置密钥
wrangler secret put CAPTCHA_SITEVERIFY_URL  # TongjiCaptcha 验证服务地址
wrangler secret put ADMIN_SECRET            # 管理后台密钥

# 部署
npm install
wrangler deploy
```

### 2. 前端部署

```bash
cd frontend

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 Worker URL 和 TongjiCaptcha Site Key

# 构建部署
npm install
npm run build
wrangler pages deploy dist --project-name=jcourse-web
```

## 功能特性

- 无需登录即可浏览课程和点评
- TongjiCaptcha 人机验证防刷
- 基于 Secret 的简易后台管理
- 完全 Serverless，零运维成本

## 管理后台访问

管理后台已从前端导航栏隐藏，需通过机密 URL 参数访问：

```
https://your-domain/admin?access=secretkey
```

### 修改机密变量

编辑 `frontend/src/pages/Admin.tsx`：

```typescript
const ACCESS_KEY = 'secretkey'  // 改为你的机密字符串
```

修改后需重新构建并部署前端。

### 注意
- 此版已使用TongjiCaptcha 人机验证替代 Turnstile

## 数据库表结构

### categories 表（课程类别）
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY | 类别 ID |
| name | TEXT | UNIQUE NOT NULL | 类别名称 |

### teachers 表（教师信息）
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY | 教师 ID |
| tid | TEXT | - | 教师工号 |
| name | TEXT | NOT NULL | 教师姓名 |
| title | TEXT | - | 职称 |
| pinyin | TEXT | - | 姓名拼音 |
| department | TEXT | - | 所属院系 |

### courses 表（课程信息）
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY | 课程 ID |
| code | TEXT | NOT NULL | 课程代码 |
| name | TEXT | NOT NULL | 课程名称 |
| credit | REAL | DEFAULT 0 | 学分 |
| department | TEXT | - | 开课院系 |
| teacher_id | INTEGER | FOREIGN KEY | 教师 ID（关联 teachers 表） |
| review_count | INTEGER | DEFAULT 0 | 评价数量 |
| review_avg | REAL | DEFAULT 0 | 平均评分 |
| search_keywords | TEXT | - | 搜索关键词 |
| is_legacy | INTEGER | DEFAULT 0 | 历史数据标记（0=当前数据，1=历史数据） |
| is_icu | INTEGER | DEFAULT 0 | ICU 站点数据标记（0=非 ICU，1=ICU 数据） |

**索引：**
- `idx_courses_code`: 课程代码索引
- `idx_courses_search`: 搜索关键词索引
- `idx_courses_legacy`: 历史数据标记索引

### reviews 表（课程评价）
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 评价 ID |
| course_id | INTEGER | NOT NULL, FOREIGN KEY | 课程 ID（关联 courses 表，级联删除） |
| semester | TEXT | - | 学期 |
| rating | INTEGER | NOT NULL, CHECK (0-5) | 评分（0-5 分） |
| comment | TEXT | - | 评价内容 |
| score | TEXT | - | 成绩 |
| created_at | INTEGER | DEFAULT (当前时间戳) | 创建时间 |
| approve_count | INTEGER | DEFAULT 0 | 点赞数 |
| disapprove_count | INTEGER | DEFAULT 0 | 点踩数 |
| is_hidden | BOOLEAN | DEFAULT 0 | 是否隐藏（0=显示，1=隐藏） |
| is_legacy | INTEGER | DEFAULT 0 | 历史数据标记 |
| is_icu | INTEGER | DEFAULT 0 | ICU 站点数据标记 |
| reviewer_name | TEXT | DEFAULT '' | 评价者昵称 |
| reviewer_avatar | TEXT | DEFAULT '' | 评价者头像 URL |

**索引：**
- `idx_reviews_course`: 课程 ID 索引
- `idx_reviews_created`: 创建时间索引
- `idx_reviews_legacy`: 历史数据标记索引

### settings 表（系统设置）
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| key | TEXT | PRIMARY KEY | 设置键名 |
| value | TEXT | - | 设置值 |

**默认设置：**
- `show_legacy_reviews`: 'false' - 控制是否显示 icu 站点数据

## API 接口文档

### 公开 API

#### 1. 获取 ICU 数据显示状态
```
GET /api/settings/show_icu
```

**响应：**
```json
{
  "show_icu": true/false
}
```

#### 2. 获取课程列表
```
GET /api/courses?q={keyword}&legacy={true/false}&page={page}&limit={limit}
```

**查询参数：**
- `q` (可选): 搜索关键词（匹配课程代码、名称、教师姓名）
- `legacy` (可选): 是否查询历史数据（'true'/'false'）
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应：**
```json
{
  "data": [
    {
      "id": 1,
      "code": "课程代码",
      "name": "课程名称",
      "rating": 4.5,
      "review_count": 10,
      "is_legacy": 0,
      "teacher_name": "教师姓名"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

**说明：**
- 当管理员关闭"乌龙茶站点评论显示开关"时，`is_icu=1` 的课程会被自动过滤

#### 3. 获取课程详情
```
GET /api/course/:id
```

**路径参数：**
- `id`: 课程 ID

**响应：**
```json
{
  "id": 1,
  "code": "课程代码",
  "name": "课程名称",
  "credit": 3.0,
  "department": "院系",
  "teacher_id": 1,
  "teacher_name": "教师姓名",
  "review_count": 10,
  "review_avg": 4.5,
  "is_legacy": 0,
  "is_icu": 0,
  "reviews": [
    {
      "id": 1,
      "course_id": 1,
      "semester": "2023-2024-1",
      "rating": 5,
      "comment": "评价内容",
      "created_at": 1234567890,
      "reviewer_name": "昵称",
      "reviewer_avatar": "头像URL",
      "is_hidden": 0
    }
  ]
}
```

**说明：**
- 如果课程 `is_icu=1` 且管理员关闭了显示开关，返回 404
- 评论列表会根据管理员设置过滤 `is_icu=1` 的评论

#### 4. 提交课程评价
```
POST /api/review
```

**请求体：**
```json
{
  "course_id": 1,
  "rating": 5,
  "comment": "评价内容",
  "semester": "2025-2026-1",
  "turnstile_token": "TongjiCaptcha验证token",
  "reviewer_name": "昵称（可选）",
  "reviewer_avatar": "头像URL（可选）"
}
```

**响应：**
```json
{
  "success": true
}
```

**错误响应：**
```json
{
  "error": "人机验证无效或已过期"
}
```

### 管理 API

**认证方式：** 所有管理 API 需要在请求头中包含 `x-admin-secret: <ADMIN_SECRET>`

#### 1. 获取评论列表
```
GET /api/admin/reviews?q={keyword}&page={page}&limit={limit}
```

**查询参数：**
- `q` (可选): 搜索关键词（匹配课程名称、代码、评论内容、评价者昵称）
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 50

**响应：**
```json
{
  "data": [
    {
      "id": 1,
      "course_id": 1,
      "course_name": "课程名称",
      "code": "课程代码",
      "semester": "2023-2024-1",
      "rating": 5,
      "comment": "评价内容",
      "created_at": 1234567890,
      "reviewer_name": "昵称",
      "reviewer_avatar": "头像URL",
      "is_hidden": 0,
      "is_legacy": 0
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

#### 2. 编辑评论
```
PUT /api/admin/review/:id
```

**路径参数：**
- `id`: 评论 ID

**请求体：**
```json
{
  "comment": "修改后的评价内容",
  "rating": 4,
  "reviewer_name": "昵称",
  "reviewer_avatar": "头像URL"
}
```

**响应：**
```json
{
  "success": true
}
```

#### 3. 切换评论显示/隐藏状态
```
POST /api/admin/review/:id/toggle
```

**路径参数：**
- `id`: 评论 ID

**响应：**
```json
{
  "success": true
}
```

**说明：** 切换 `is_hidden` 字段，并自动更新课程统计

#### 4. 删除评论
```
DELETE /api/admin/review/:id
```

**路径参数：**
- `id`: 评论 ID

**响应：**
```json
{
  "success": true
}
```

**说明：** 删除评论后自动更新课程统计

#### 5. 获取课程列表（管理）
```
GET /api/admin/courses?q={keyword}&page={page}&limit={limit}
```

**查询参数：**
- `q` (可选): 搜索关键词（匹配课程名称、代码、教师姓名）
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应：**
```json
{
  "data": [
    {
      "id": 1,
      "code": "课程代码",
      "name": "课程名称",
      "credit": 3.0,
      "department": "院系",
      "teacher_id": 1,
      "teacher_name": "教师姓名",
      "review_count": 10,
      "review_avg": 4.5,
      "is_legacy": 0
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

#### 6. 编辑课程
```
PUT /api/admin/course/:id
```

**路径参数：**
- `id`: 课程 ID

**请求体：**
```json
{
  "code": "课程代码",
  "name": "课程名称",
  "credit": 3.0,
  "department": "院系",
  "teacher_name": "教师姓名",
  "search_keywords": "搜索关键词"
}
```

**响应：**
```json
{
  "success": true
}
```

**说明：** 如果教师不存在会自动创建

#### 7. 删除课程
```
DELETE /api/admin/course/:id
```

**路径参数：**
- `id`: 课程 ID

**响应：**
```json
{
  "success": true
}
```

**说明：** 会级联删除该课程的所有评论

#### 8. 创建课程
```
POST /api/admin/course
```

**请求体：**
```json
{
  "code": "课程代码",
  "name": "课程名称",
  "credit": 3.0,
  "department": "院系",
  "teacher_name": "教师姓名",
  "search_keywords": "搜索关键词"
}
```

**响应：**
```json
{
  "success": true,
  "id": 123
}
```

**说明：** 如果教师不存在会自动创建

#### 9. 获取系统设置
```
GET /api/admin/settings
```

**响应：**
```json
{
  "show_legacy_reviews": "true"
}
```

#### 10. 更新系统设置
```
PUT /api/admin/settings/:key
```

**路径参数：**
- `key`: 设置键名（如 `show_legacy_reviews`）

**请求体：**
```json
{
  "value": "true"
}
```

**响应：**
```json
{
  "success": true
}
```

## 数据字段说明

### is_legacy 和 is_icu

- **`is_legacy`**: 乌龙茶文档历史数据标记
  - 控制方式：前端"查询乌龙茶历史数据"开关
  - 用途：区分当前课表数据和历史快照数据
  - 用户可见：是（前端开关）

- **`is_icu`**: 乌龙茶icu站点数据标记
  - 控制方式：管理后台"乌龙茶站点评论显示开关"
  - 用途：区分本站数据和 ICU 站点导入的数据
  - 用户可见：否（管理员控制）
  - 行为：关闭时，`is_icu=1` 的课程和评论完全隐藏

### 数据过滤逻辑

1. **前端课程列表**：
   - 用户选择"查询乌龙茶历史数据=是" → 显示 `is_legacy=1` 的课程
   - 用户选择"查询乌龙茶历史数据=否" → 显示 `is_legacy=0` 的课程
   - 管理员关闭"乌龙茶站点评论显示开关" → 自动过滤 `is_icu=1` 的课程

2. **课程详情页评论**：
   - 管理员关闭"乌龙茶站点评论显示开关" → 过滤 `is_icu=1` 的评论
   - 始终过滤 `is_hidden=1` 的评论

### 注意
- 已将人机验证从Turnstile 完全迁移到 TongjiCaptcha

