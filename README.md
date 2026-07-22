# Fetch Bridge

一个由管理员配置路由的下载中继服务，不接受任意 URL。Next.js App Router、Prisma 与 SQLite/PostgreSQL 驱动。

站点页面与业务 API 默认要求管理员登录；只有 `/download/**` 下载地址保持公开访问，以便分发给终端用户。

## 快速开始

```bash
cp .env.example .env
npm install
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

也可以一键启动本地开发环境：

```bash
./start-dev.sh
```

脚本会在首次运行时复制 `.env.example`、安装依赖、应用迁移并写入示例 Route。请在 `.env` 中填写 `AUTH_SECRET`、`ADMIN_EMAIL` 与 `ADMIN_PASSWORD` 后再登录后台。

访问 `/` 浏览公开下载，访问 `/admin` 登录管理后台。登录凭据由 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 配置；生产环境请在 Vercel 将密码设为 Sensitive 环境变量。

本地开发使用 SQLite；Vercel 生产环境使用 PostgreSQL。详细部署说明见 [docs/README.md](docs/README.md)，数据模型见 [prisma/README.md](prisma/README.md)。
