# 同济选课社区 - Serverless 版

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
wrangler d1 execute jcourse-db --file=./schema.sql

# 设置密钥
wrangler secret put TURNSTILE_SECRET
wrangler secret put ADMIN_SECRET

# 部署
npm install
wrangler deploy
```

### 2. 前端部署

```bash
cd frontend

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 Worker URL 和 Turnstile Site Key

# 构建部署
npm install
npm run build
npm run deploy
```

## 功能特性

- 无需登录即可浏览课程和点评
- Turnstile 人机验证防刷
- 基于 Secret 的简易后台管理
- 完全 Serverless，零运维成本
