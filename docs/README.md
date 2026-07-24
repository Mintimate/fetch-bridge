# 部署与运维指南

## 本地开发

本地 Node 开发使用 `prisma/sqlite/schema.prisma` 与 `prisma/dev.db`：

```bash
cp .env.example .env
./start-dev.sh
```

首次运行前请在 `.env` 中设置 `AUTH_SECRET`、`ADMIN_EMAIL` 和
`ADMIN_PASSWORD`。创建本地 schema 迁移时运行 `npm run db:migrate`，本地数据库文件不会提交到 Git。

`npm run dev` 使用 Next.js 内置的备用下载实现，便于同时开发后台和下载功能。轻量 Worker 可单独在本地运行：

```bash
npm run db:d1:migrate:local
npm run preview:cloudflare:download
```

## Cloudflare Workers + D1

生产环境由两个 Worker 组成：

| Worker                  | 路径                      | 职责                                |
| ----------------------- | ------------------------- | ----------------------------------- |
| `fetch-bridge`          | 除 `/download/*` 外的路径 | Next.js 管理后台、认证和业务 API    |
| `fetch-bridge-download` | `/download/*`             | 查询 D1、校验上游并直接流式转发文件 |

Cloudflare 会优先匹配更具体的 `/download/*` Route。两个 Worker 共享同一个 D1，因此 Source、Route、Passkey 与日志不需要复制；登录 Secret 只属于主 Worker，不应配置到下载 Worker。

### 首次配置

1. 复制不会提交到 Git 的环境配置：

   ```bash
   cp wrangler.example.jsonc wrangler.jsonc
   cp wrangler.download.example.jsonc wrangler.download.jsonc
   ```

   `wrangler*.jsonc` 包含真实域名、Zone 和 D1 ID，已加入 `.gitignore`；
   仓库只提交脱敏的 `wrangler*.example.jsonc`。

2. 登录 Cloudflare，在项目根目录创建 D1：

   ```bash
   npx wrangler login
   npx wrangler d1 create fetch-bridge --location=apac
   ```

3. 将输出的 `database_id` 同时填入本地的：

   - `wrangler.jsonc`
   - `wrangler.download.jsonc`

   两处必须指向同一个数据库。如修改 `database_name`，也要同步修改
   `db:d1:migrate:*` npm scripts。

   同时将生产域名写入两份配置，并在构建前通过 `.env.local` 设置：

   ```dotenv
   NEXT_PUBLIC_SITE_URL="https://fetch-bridge.example.com"
   ```

4. 应用远程迁移：

   ```bash
   npm run db:d1:migrate:remote
   ```

5. 给主 Worker 配置认证变量：

   ```bash
   npx wrangler secret put AUTH_SECRET
   npx wrangler secret put ADMIN_EMAIL
   npx wrangler secret put ADMIN_PASSWORD
   ```

   再在 Cloudflare Dashboard 的 **Workers & Pages → fetch-bridge → Settings →
   Variables and Secrets** 添加普通变量 `AUTH_TRUST_HOST=true`。部署主 Worker
   时使用 `--keep-vars`，不会清除 Dashboard 中已有变量。

6. 检查并部署：

   ```bash
   npm run check:cloudflare:download
   npm run deploy:cloudflare
   ```

   部署脚本会先执行远程 D1 迁移，再依次发布主应用和下载 Worker。
   单独运行 `deploy:cloudflare:app` 或 `deploy:cloudflare:download` 时也会
   先应用迁移，避免新版代码引用尚未创建的日志字段。

   也可只部署其中一部分：

   ```bash
   npm run deploy:cloudflare:app
   npm run deploy:cloudflare:download
   ```

### 自定义域名

主 Worker 使用 Custom Domain，下载 Worker 使用同域名下更具体的 Route。修改域名时必须同步更新：

- 本地 `wrangler.jsonc` 中的主域名，字段位置可参考
  [`wrangler.example.jsonc`](../wrangler.example.jsonc)；
- 本地 `wrangler.download.jsonc` 中的 `域名/download/*` 和
  `zone_name`，字段位置可参考
  [`wrangler.download.example.jsonc`](../wrangler.download.example.jsonc)。

下载 Worker 的 `workers_dev` 为 `false`，因此它不会单独提供
`fetch-bridge-download.*.workers.dev` 地址；请通过自定义域名测试。

## 部署后验证

先从管理后台复制一个真实下载地址，再检查响应：

```bash
curl -I "https://你的域名/download/路由/文件名"
```

正常结果应包含：

```text
HTTP/2 200
x-fetch-bridge-relay: lightweight
x-fetch-bridge-route: /已匹配的路由
```

继续验证 Range 请求，避免断点续传或大文件下载出现兼容问题：

```bash
curl -sS -D - -o /dev/null \
  -H "Range: bytes=0-1023" \
  "https://你的域名/download/路由/文件名"
```

如果上游支持 Range，通常会返回 `206 Partial Content` 和正确的
`content-range`。

Range 下载需要额外核对字节哈希。下载 Worker 会先使用标准 `fetch()`，
再检查任何上游的 `206`、`Content-Range`、`Content-Length` 与编码是否
自洽；如果 Cloudflare 改变了字节空间，则自动切换为 identity TLS 流。
该规则基于 HTTP 响应语义，不依赖域名或文件路径。可用以下 Chrome 文件
验证：

```bash
U="adgts5ds2tycxzj6kla4yya4i7kq_150.0.7871.182/150.0.7871.182_chrome_installer_uncompressed.exe"
curl -sS -r 0-1048575 "https://dl.google.com/release2/chrome/$U" | sha1sum
curl -sS -r 0-1048575 "https://你的域名/download/chrome/$U" | sha1sum
curl -sS -I -H "Range: bytes=0-1048575" \
  "https://你的域名/download/chrome/$U"
```

两个 SHA1 必须相同；示例文件应为
`aec470846bae83ca8900a2fe88cd61599ac25a4e`，响应应包含
`content-range: bytes 0-1048575/400952232` 和
`x-fetch-bridge-transport: identity-socket`。

## 1102 与常见故障

### 仍然出现 1102

`1102 Worker exceeded resource limits` 表示请求仍在消耗超过套餐限制的
Worker 资源。先检查响应是否有 `x-fetch-bridge-relay: lightweight`：

- 有：请求已进入轻量 Worker，查看 `fetch-bridge-download` 的实时日志；
- 没有：`/download/*` Route 未生效、域名不匹配，或轻量 Worker 尚未部署。

不要只查看 `fetch-bridge` 主 Worker 的日志；下载请求正常情况下不会进入它。

### 状态码含义

| 状态码 | 含义                            | 优先检查                                            |
| ------ | ------------------------------- | --------------------------------------------------- |
| `400`  | Source 或 Route 配置不安全/无效 | 上游必须是公开 HTTPS；检查路径映射                  |
| `404`  | D1 中没有匹配且已启用的 Route   | Source、Route 是否启用；两个 Worker 是否绑定同一 D1 |
| `405`  | 请求方法不支持                  | 下载端只允许 `GET`、`HEAD`                          |
| `500`  | 下载 Worker 或 D1 查询异常      | `fetch-bridge-download` 日志和 D1 Binding           |
| `502`  | 上游超时、DNS 不可用或请求失败  | 上游可达性、Source 超时与响应                       |

## 实现与安全说明

- 下载 Worker 直接返回上游 `ReadableStream`，不会把整个文件载入内存。
- 每次请求都会解析 Source 的 A/AAAA 记录并拒绝本机、私网、链路本地地址，降低 SSRF 与 DNS rebinding 风险。
- 不向上游转发 Cookie、Authorization、Cloudflare 和代理相关请求头；只透传 Range 与标准缓存条件头。
- D1 日志通过 `waitUntil` 在响应后写入。日志失败不会中断下载，但故障期间可能缺少个别统计记录。
- 上游重定向由 Worker 逐跳校验后跟随；每一跳必须是公开 HTTPS 地址，
  跨域后不会继续转发 Source 中配置的自定义请求头。
- 所有 Range 请求都会检查响应的字节范围是否自洽；只有检测到编码转换
  风险时才切换为原始 identity TLS 流，规则不绑定特定域名。

相关文档：

- [Cloudflare Workers Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Workers Streams API](https://developers.cloudflare.com/workers/runtime-apis/streams/)
