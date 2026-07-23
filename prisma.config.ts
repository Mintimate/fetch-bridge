import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "prisma/sqlite/schema.prisma",
  migrations: { path: "prisma/sqlite/migrations" },
});
