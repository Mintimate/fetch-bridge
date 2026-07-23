import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";

type D1Binding = ConstructorParameters<typeof PrismaD1>[0];
type D1Environment = CloudflareEnv & { DB: D1Binding };

/**
 * D1 bindings belong to the current Worker request, so a Prisma client must not
 * be shared globally. React's request cache lets server components reuse it
 * safely while serving one request.
 */
export const getDb = cache(() => {
  const { env } = getCloudflareContext();
  return new PrismaClient({
    adapter: new PrismaD1((env as D1Environment).DB),
  });
});
