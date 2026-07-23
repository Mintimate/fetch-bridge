# Fetch Bridge

一个由管理员配置路由的下载中继服务，不接受任意 URL。生产环境运行在 Cloudflare Workers，使用 D1（SQLite）保存配置、Passkey 与下载日志。

站点页面与业务 API 默认要求管理员登录；只有 `/download/**` 下载地址保持公开访问，以便分发给终端用户。

## 生产架构

同一个域名由两个 Worker 分工，下载 URL 无需变化：

```text
fetch-bridge.example.com
├── /download/*  → fetch-bridge-download → D1 → 上游文件（直接流式返回）
└── 其他路径     → fetch-bridge          → OpenNext / Next.js → D1
```

轻量下载 Worker 不加载 Next.js、OpenNext 或 Prisma WASM，适合 Cloudflare Workers 免费套餐较短的 CPU 时间限制。它只接受 `GET` 与 `HEAD`，并在每次请求时校验上游 HTTPS 地址和 DNS 解析结果。

## 快速开始

```bash
cp .env.example .env
cp wrangler.example.jsonc wrangler.jsonc
cp wrangler.download.example.jsonc wrangler.download.jsonc
npm install
npm run db:d1:migrate:local
npm run db:seed
npm run dev
```

也可以一键启动本地开发环境：

```bash
./start-dev.sh
```

脚本会在首次运行时复制 `.env.example`、安装依赖、应用迁移并写入示例 Route。请在 `.env` 中填写 `AUTH_SECRET`、`ADMIN_EMAIL` 与 `ADMIN_PASSWORD` 后再登录后台。

访问 `/` 浏览公开下载，访问 `/console` 登录管理控制台。登录凭据由 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 配置；生产环境请在 Cloudflare Workers 将敏感值设为 Secret。

首次使用密码登录后，可在 `/console/settings` 为当前设备绑定 Passkey。后续可通过系统生物识别或设备解锁直接登录；Passkey 仅绑定到这个已验证的管理员账号，站点不提供公开注册。

本地开发和生产均使用 SQLite：本地为文件数据库，生产为 Cloudflare D1。详细部署说明见 [docs/README.md](docs/README.md)，数据模型见 [prisma/README.md](prisma/README.md)。

## 常用命令

```bash
npm run dev                         # Next.js 本地开发
npm run test:relay                  # 下载中继核心测试
npm run check:cloudflare:download   # 类型、测试与轻量 Worker dry-run
npm run deploy:cloudflare           # 部署主应用与下载 Worker
npm run deploy:cloudflare:download  # 只部署下载 Worker
```
