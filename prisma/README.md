# Prisma data model

`Source` 代表已审核的 HTTPS 源站；`Route` 将公开路径前缀映射到某个 Source 下的固定目标路径；`DownloadLog` 记录中继结果。

认证数据模型 `User`、`Account`、`Session`、`VerificationToken` 与 `Authenticator` 由 Auth.js 使用。其中 `Authenticator` 保存管理员已绑定的 Passkey；管理员账号只会在密码验证成功后创建。

## SQLite 与 D1

- `sqlite/`：本地 SQLite 与 Cloudflare D1 共用的 schema、迁移。`.env` 中的 `file:../dev.db` 指向 `prisma/dev.db`。
- `prisma.config.ts`：固定选择 SQLite schema；本地 Prisma 与远程 D1 共用同一组迁移。

常用命令：

```bash
npm run db:migrate                 # 本地 SQLite 新迁移
npm run db:generate                # 生成 SQLite Prisma Client
npm run db:d1:migrate:local        # 应用迁移到本地 D1
npm run db:d1:migrate:remote       # 应用迁移到远程 D1
npm run db:seed                    # 写入本地 D1 示例路由
```

Prisma Client 在 Workers 中通过 `@prisma/adapter-d1` 使用每个请求的 D1 binding 创建；不要跨请求复用数据库客户端。

`headersJson` 必须是对象 JSON，并在保存时经过 Zod 与禁止 Header 规则校验。
