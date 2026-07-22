import { defineConfig } from "prisma/config";
import "dotenv/config";

const target = process.env.PRISMA_TARGET === "postgres" ? "postgres" : "sqlite";

export default defineConfig({
  schema: `prisma/${target}/schema.prisma`,
  migrations: { path: `prisma/${target}/migrations` },
});
