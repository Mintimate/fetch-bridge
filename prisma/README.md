# Prisma data model

`Source` 代表已审核的 HTTPS 源站；`Route` 将公开路径前缀映射到某个 Source 下的固定目标路径；`DownloadLog` 记录中继结果。

认证数据模型 `User`、`Account`、`Session`、`VerificationToken` 与 `Authenticator` 由 Auth.js 使用。其中 `Authenticator` 保存管理员已绑定的 Passkey；管理员账号只会在密码验证成功后创建。

## 双环境目录

- `sqlite/`：本地开发专用，SQLite schema 与迁移。`.env` 中的 `file:../dev.db` 指向 `prisma/dev.db`。
- `postgres/`：Vercel 生产专用，PostgreSQL schema 与迁移。
- `prisma.config.ts`：通过 `PRISMA_TARGET=sqlite|postgres` 选择对应 schema 与迁移目录；不要直接调用未带目标的 Prisma CLI。

常用命令：

```bash
npm run db:migrate                 # 本地 SQLite 新迁移
npm run db:migrate:deploy          # 应用本地 SQLite 迁移
npm run db:generate                # 生成 SQLite Prisma Client
npm run db:migrate:postgres        # 在 PostgreSQL 开发库创建迁移
npm run vercel-build               # Vercel: 生成 PG Client、应用迁移、构建
```

`headersJson` 必须是对象 JSON，并在保存时经过 Zod 与禁止 Header 规则校验。
