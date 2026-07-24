# Fetch Bridge

一个由管理员预先配置路由的下载中继服务，运行在 Cloudflare Workers + D1 上。它**不接受任意 URL**：只有后台审核过的 `Source` 与 `Route` 才能通过 `/download/<前缀>/...` 访问，并直接流式转发上游文件。

## 设计要点

- **受控路由**：不存在通用代理接口。每个下载地址都映射到固定 Source 下的目标目录，绝不从 query string 读取目标 URL。
- **流式中继**：下载 Worker 直接把上游 `ReadableStream` 透传给客户端，不把整个文件载入内存，也不写本地磁盘。
- **SSRF / DNS rebinding 防护**：Source 必须是无凭据的公开 HTTPS；每次请求都解析 A/AAAA 记录并拒绝本机、私网、链路本地地址。
- **Range 自洽校验**：所有 Range 请求都会检查 `206` / `Content-Range` / `Content-Length` / 编码是否自洽；一旦检测到 Cloudflare 改变了字节空间（会破坏断点续传），自动切换为原始 identity TLS 流。
- **最小权限**：Cookie、Authorization、`CF-*`、`X-Forwarded-*` 不会被接收或转发；只透传 Range 与标准缓存条件头。

## 生产架构

同一个域名由两个 Worker 分工，下载 URL 对终端用户无需变化：

```text
fetch-bridge.example.com
├── /download/*  → fetch-bridge-download → D1 → 上游文件（直接流式返回）
└── 其他路径      → fetch-bridge          → OpenNext / Next.js → D1
```

轻量下载 Worker 不加载 Next.js、OpenNext 或 Prisma WASM，适合 Workers 免费套餐较短的 CPU 时间限制。它只接受 `GET` 与 `HEAD`，并在每次请求时校验上游 HTTPS 地址与 DNS 解析结果。Cloudflare 会优先匹配更具体的 `/download/*` Route；两个 Worker 共享同一个 D1，因此 Source、Route、Passkey 与日志不需要复制。

只有同时启用且标记为公开（`isPublic`）的 Route 才能通过 `/download/*` 访问；私有 Route 不会被下载 Worker 匹配。

## 访问控制

除 `/download/*` 与 `/api/auth/*` 外，**所有页面与业务 API 默认要求管理员登录**（见 `auth.config.ts` 与 `middleware.ts`）。也就是说 `/` 首页与 `/console` 后台都需要先认证。

- 登录凭据由 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 配置；生产环境请在 Cloudflare Workers 将敏感值设为 Secret，**不要**配置到下载 Worker。
- 首次使用密码登录后，可在 `/console/settings` 为当前设备绑定 Passkey；此后可用系统生物识别或设备解锁直接登录。
- Passkey 仅绑定到这个已验证的管理员账号，站点不提供公开注册。

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

本地开发与生产均使用 SQLite：本地为文件数据库（`prisma/dev.db`），生产为 Cloudflare D1。`npm run dev` 使用 Next.js 内置的备用下载实现（`lib/download.ts`），便于同时开发后台与下载功能。

## 数据模型

| 模型            | 作用                                                       |
| --------------- | ---------------------------------------------------------- |
| `User` / `Account` / `Session` / `Authenticator` | NextAuth 管理员账号与已绑定 Passkey，账号仅在密码登录成功后创建 |
| `Source`        | 上游源站：`baseUrl`、超时、自定义 UA 与转发头、启用开关     |
| `Route`         | 路径前缀到 Source 目标目录的映射，带 `isPublic` 开关        |
| `DownloadLog`   | 每次中继请求的状态、耗时、字节数与客户端 IP，经 `waitUntil` 异步写入 |

Schema 与迁移分别位于 `prisma/sqlite/schema.prisma` 与 `prisma/sqlite/migrations`。数据模型详见 [prisma/README.md](prisma/README.md)，部署运维详见 [docs/README.md](docs/README.md)。

## 常用命令

```bash
npm run dev                         # Next.js 本地开发
npm run test:relay                  # 下载中继核心测试（lib/*.test.ts）
npm run lint                        # ESLint
npm run check:cloudflare:download   # 类型、测试与轻量 Worker dry-run
npm run deploy:cloudflare           # 应用远程迁移并部署主应用 + 下载 Worker
npm run deploy:cloudflare:app       # 只部署主应用 Worker
npm run deploy:cloudflare:download  # 只部署下载 Worker
npm run db:d1:migrate:remote        # 应用远程 D1 迁移
```

## Workers 免费套餐注意

- 下载日志通过 `ctx.waitUntil` 在响应返回后异步写入 D1，日志失败不会中断下载。
- 后台页面**不自动轮询**：刷新仅在手动点击「刷新」时触发，避免无谓消耗请求数。
- 大文件下载直接流式透传，不会因 Worker CPU 时间限制被截断；但若上游持续超时，受 `Source.timeoutMs`（1s–120s）控制。
