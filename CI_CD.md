# CI/CD说明

这个仓库使用 GitHub Actions 在 `main` 分支更新后自动部署：

- `backend/` -> Cloudflare Workers (`wrangler deploy`)
- `frontend/` -> Cloudflare Pages (`wrangler pages deploy`)

## 1) 需要在 GitHub Repo Secrets 配置的变量

在 GitHub 仓库 -> Settings -> Secrets and variables -> Actions -> New repository secret，添加：

- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare Account ID
- `CLOUDFLARE_API_TOKEN`：Cloudflare API Token（用于 CI 部署）
- `VITE_API_URL`：前端调用后端的 API Base URL（例如 `https://jcourse-backend.<your-subdomain>.workers.dev` 或你的自定义域名）
- `VITE_TURNSTILE_SITE_KEY`：如果你仍然使用 Turnstile，可以填站点 Key（不需要的话也可以填任意占位字符串）
- `VITE_CAPTCHA_URL`：TongjiCaptcha 服务的 URL（例如 `https://captcha.xxx.com`）
- `VITE_WALINE_SERVER_URL`：Waline 服务端地址（例如 `https://waline.xxx.com`）

## 2) Cloudflare API Token 推荐权限

在 Cloudflare Dashboard -> My Profile -> API Tokens -> Create Token，建议创建 Custom Token：

- Account permissions：
  - Workers Scripts: Edit
  - Pages: Edit
  - D1: Edit（或至少 Read；看你是否在 CI 里做 D1 变更）
- Account resources：选择你的账号（All accounts 或指定账号）

## 3) 后端运行所需的 Workers Secrets（一次性设置）

后端 Worker `jcourse-backend` 依赖以下 secrets（本地或 Cloudflare Dashboard / wrangler 设置均可）：

- `CAPTCHA_SITEVERIFY_URL`
- `ADMIN_SECRET`

本地可用：

```bash
cd backend
wrangler secret put CAPTCHA_SITEVERIFY_URL
wrangler secret put ADMIN_SECRET
```

## 4) 工作流文件位置

- `.github/workflows/deploy-cloudflare.yml`
