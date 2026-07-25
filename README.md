# Fetch Bridge

自托管的**下载中继服务**：管理员在后台预先配置"哪些文件可以下"，服务把上游公开文件流式转发给访客。运行在 Cloudflare Workers + D1 上，免费套餐即可承载。

适合用来镜像常用安装包、为不可直连的公开文件提供统一下载入口、并记录下载日志。它**不是**通用代理——访客只能下载你审核过的路由，无法用它访问任意 URL。

## 工作原理

```text
后台配置（管理员）：
  Source  上游站点，如 https://ftp.mozilla.org
  Route   路径映射，如 /firefox → /pub/fenix（勾选公开）

访客下载（无需登录）：
  https://你的域名/download/firefox/releases/.../fenix.apk
      │  流式中继：不落盘、不按文件大小占内存，支持 Range 断点续传
      ▼
  https://ftp.mozilla.org/pub/fenix/releases/.../fenix.apk
```

每次请求都会重新解析上游 IP 并拒绝内网地址，防止服务被用来攻击内网（SSRF）。

## 准备工作

| 条件                                       | 本地体验 | 部署上线 |
| ------------------------------------------ | :------: | :------: |
| Node.js 20+（`node -v` 检查，推荐 22 LTS） |    ✓     |    ✓     |
| Cloudflare 账号（免费）                    |    —     |    ✓     |
| 域名已接入 Cloudflare（NS 托管）           |    —     |    ✓     |

域名接入方法：在 Cloudflare Dashboard「添加站点」，按提示把域名的 NS 记录改成 Cloudflare 分配的两个地址，等待生效即可。

## 第一步：本地跑起来（约 5 分钟）

```bash
git clone <仓库地址> && cd fetch-bridge
cp .env.example .env
```

编辑 `.env`，填这三项（其余保持默认）：

```dotenv
AUTH_SECRET="终端运行 openssl rand -base64 32 生成"
ADMIN_EMAIL="管理员邮箱"
ADMIN_PASSWORD="本地登录密码"
```

然后一键启动（自动安装依赖、初始化数据库、写入一条 Mozilla 示例路由）：

```bash
./start-dev.sh
```

打开 <http://localhost:3000>，用上面的邮箱密码登录后台。接着验证示例路由是否通：

```bash
curl -s "http://localhost:3000/download/firefox/releases/" | head -5
```

返回 Mozilla 目录列表的 HTML 即本地环境正常（该路由会把请求中继到 `https://ftp.mozilla.org/pub/fenix/releases/`）。

Windows 或不使用脚本时的手动步骤：

```bash
cp wrangler.example.jsonc wrangler.jsonc
cp wrangler.download.example.jsonc wrangler.download.jsonc
npm install
npm run task -- d1:local   # 初始化本地数据库
npm run task -- db:seed    # 写入示例路由
npm run dev
```

## 第二步：部署到 Cloudflare（约 10 分钟）

确认「准备工作」中的域名已接入后，运行交互式引导：

```bash
npm run setup
```

它会依次引导你：浏览器授权登录 Cloudflare → 输入站点域名（如 `dl.example.com`）→ 自动创建 D1 数据库并生成两份 `wrangler*.jsonc` → 首次部署主应用 → 设置管理员邮箱与密码（`AUTH_SECRET` 自动生成并写入 Secret）→ 部署下载 Worker。

完成后访问 `https://你的域名/console`，能正常登录即部署成功。以后每次改完代码，一条命令发布：

```bash
npm run deploy
```

## 第三步：添加你的第一个下载

远程数据库是空的（示例路由只写入本地），登录后台添加第一条：

1. 打开 `/console/sources`，新建 Source：名称随意，**Base URL 必须是无凭据的公开 HTTPS**（如 `https://ftp.mozilla.org`）。
2. 在该 Source 下新建 Route：路径前缀如 `/firefox`，目标目录如 `/pub/fenix`，保持启用并勾选**公开**（不勾选则该路由不对外提供下载）。
3. 下载地址 = `https://你的域名/download/<路径前缀>/<上游文件相对路径>`，页面下方的解析面板可实时查看 URL 命中了哪条 Route。

用 curl 验证：

```bash
curl -s -D - -o /dev/null "https://你的域名/download/firefox/releases/"
```

响应头包含 `x-fetch-bridge-relay: lightweight` 即下载链路正常。Range 断点续传与哈希校验方法见 [docs/README.md](docs/README.md#部署后验证)。

## 后台功能地图

| 页面                | 作用                                     |
| ------------------- | ---------------------------------------- |
| `/console`          | 今日请求数、中继流量、失败率、最近请求   |
| `/console/sources`  | 管理 Source 与 Route，可视化路由匹配过程 |
| `/console/logs`     | 全部下载日志（状态、耗时、字节数、IP）   |
| `/console/settings` | 绑定 Passkey，之后可免密码登录           |

## 常见问题

- **安装或启动报错**：确认 `node -v` ≥ 20。
- **setup 部署报域名 / Route 相关错误**：域名还没接入 Cloudflare 或不属于当前账号，见「准备工作」。
- **登录时报错或一直跳回登录页**：`AUTH_SECRET` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` 未配齐。本地检查 `.env`；生产运行 `npx wrangler secret list` 确认三个 Secret 都存在。
- **下载返回 404**：Source 或 Route 未启用，或 Route 未勾选公开。
- **下载返回 400**：上游地址不满足安全要求（必须公开 HTTPS，且不能解析到内网 IP）。

更多排查（1102、状态码含义、Range 校验）见 [docs/README.md](docs/README.md)。

## 常用命令

```bash
npm run dev              # Next.js 本地开发
npm test                 # 下载中继核心测试（lib/*.test.ts）
npm run lint             # ESLint
npm run deploy           # 应用远程迁移并部署主应用 + 下载 Worker
npm run deploy -- app    # 只部署主应用 Worker（download 同理）
npm run task             # 列出全部低频任务（db:seed、d1:remote、cf:check、cf:typegen 等）
```

本地开发与生产均使用 SQLite：本地为文件数据库（`prisma/dev.db`），生产为 Cloudflare D1。`npm run dev` 使用 Next.js 内置的备用下载实现（`lib/download.ts`），便于同时开发后台与下载功能。

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

## 数据模型

| 模型                                             | 作用                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `User` / `Account` / `Session` / `Authenticator` | NextAuth 管理员账号与已绑定 Passkey，账号仅在密码登录成功后创建      |
| `Source`                                         | 上游源站：`baseUrl`、超时、自定义 UA 与转发头、启用开关              |
| `Route`                                          | 路径前缀到 Source 目标目录的映射，带 `isPublic` 开关                 |
| `DownloadLog`                                    | 每次中继请求的状态、耗时、字节数与客户端 IP，经 `waitUntil` 异步写入 |

Schema 与迁移分别位于 `prisma/sqlite/schema.prisma` 与 `prisma/sqlite/migrations`。数据模型详见 [prisma/README.md](prisma/README.md)，部署运维详见 [docs/README.md](docs/README.md)。

## Workers 免费套餐注意

- 下载日志通过 `ctx.waitUntil` 在响应返回后异步写入 D1，日志失败不会中断下载。
- 后台页面**不自动轮询**：刷新仅在手动点击「刷新」时触发，避免无谓消耗请求数。
- 大文件下载直接流式透传，不会因 Worker CPU 时间限制被截断；但若上游持续超时，受 `Source.timeoutMs`（1s–120s）控制。
