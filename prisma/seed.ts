import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const source = await prisma.source.upsert({
    where: { name: "Mozilla Releases" },
    update: {},
    create: { name: "Mozilla Releases", baseUrl: "https://ftp.mozilla.org", timeoutMs: 30000 },
  });
  await prisma.route.upsert({
    where: { pathPrefix: "/firefox" },
    update: {},
    create: { name: "Firefox Android", description: "Mozilla 官方 Android 版本下载", pathPrefix: "/firefox", targetPath: "/pub/fenix", sourceId: source.id },
  });
}
main().finally(() => prisma.$disconnect());
