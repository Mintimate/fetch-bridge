import { Prisma } from "@prisma/client";

export function databaseErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return Response.json({ error: "名称或路径已存在。" }, { status: 409 });
    if (error.code === "P2021") return Response.json({ error: "数据库表不存在。请确认 Vercel 的 DATABASE_URL 已配置 PostgreSQL，并使用 npm run deploy:vercel 重新部署以应用迁移。" }, { status: 503 });
  }
  return Response.json({ error: "数据库写入失败。请检查 Vercel Runtime Logs、DATABASE_URL 与 PostgreSQL 连接。" }, { status: 500 });
}
