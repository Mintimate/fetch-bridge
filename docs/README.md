# 部署指南

## 本地开发（SQLite）

本地默认使用 `prisma/sqlite/schema.prisma` 和 `prisma/dev.db`。复制 `.env.example` 后运行：

```bash
./start-dev.sh
```

数据库文件不应提交到 Git。创建本地 schema 迁移时使用 `npm run db:migrate`。

## Vercel（PostgreSQL）

Vercel 不能使用本地 SQLite 文件作为持久数据库。生产构建固定使用 `prisma/postgres/schema.prisma` 及其 PostgreSQL 迁移。

1. 创建一个托管 PostgreSQL 数据库（Prisma Postgres、Neon、Supabase 等），并复制适合 serverless 运行时的连接池 `DATABASE_URL`。
2. 推送代码至 GitHub/GitLab/Bitbucket，在 Vercel 选择 **New Project** 并导入仓库；Framework Preset 选择 Next.js。
3. 在 **Settings → Environment Variables** 为 Production 设置：
   - `DATABASE_URL`：PostgreSQL 连接串
   - `AUTH_SECRET`：随机长字符串
   - `AUTH_TRUST_HOST`：`true`
   - `ADMIN_EMAIL`：管理员邮箱
   - `ADMIN_PASSWORD`：管理员登录密码（在 Vercel 中标记为 Sensitive）
4. 项目已通过 `vercel.json` 将 Build Command 固定为 `npm run vercel-build`。该命令会生成 PostgreSQL Prisma Client、执行 `prisma migrate deploy`、写入幂等的 Firefox 示例 Source/Route，再构建 Next.js。
5. 点击 Deploy。若有 Preview 部署，为 Preview 配置独立 PostgreSQL 数据库，避免预览迁移改动生产数据库。

环境变量变更需要新一次部署才会生效。生产数据库迁移由 `npm run vercel-build` 处理；它只应用已经提交的迁移，不会创建新迁移。注意：Vercel 的 PostgreSQL 与本地 SQLite 是两个独立数据库；本地手动创建的 Source/Route 不会自动复制到生产库。

## Vercel CLI 部署

无需全局安装 Vercel CLI。首次在项目根目录执行：

```bash
npx vercel@latest login
npx vercel@latest link
```

按提示选择 Vercel 账号和新建或已有项目。随后通过 CLI 为 Production 添加所需变量（每条命令都会提示粘贴变量值）：

```bash
npx vercel@latest env add DATABASE_URL production
npx vercel@latest env add AUTH_SECRET production
npx vercel@latest env add AUTH_TRUST_HOST production
npx vercel@latest env add ADMIN_EMAIL production
npx vercel@latest env add ADMIN_PASSWORD production
```

最后部署：

```bash
npm run deploy:vercel:preview  # Preview URL
npm run deploy:vercel          # Production URL
```

CLI 会读取 `vercel.json`，因此自动执行 `npm run vercel-build`。`ADMIN_PASSWORD` 请通过 CLI 直接输入原始密码。

## Docker

Docker 默认面向单实例 SQLite 本地运行：

```bash
docker build -t fetch-bridge .
docker run --rm -p 3000:3000 --env-file .env fetch-bridge
```

容器若使用 SQLite，必须把数据库文件放在持久卷中；多实例生产部署应使用 PostgreSQL。
