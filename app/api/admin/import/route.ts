import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { routeSchema, sourceSchema } from "@/lib/schemas";

// Route's `source` is a name (carried in export), resolved to a sourceId at
// import time. It must reference a source present in this same config.
const importRouteSchema = routeSchema.omit({ sourceId: true }).extend({
  source: z.string().min(1),
});

const configSchema = (sourceNames: Set<string>) =>
  z.object({
    version: z.number().int().optional(),
    sources: z.array(sourceSchema).min(1),
    routes: z
      .array(
        importRouteSchema.extend({
          source: z
            .string()
            .refine((name) => sourceNames.has(name), "路由引用了未知的源站名称"),
        }),
      )
      .default([]),
  });

export async function POST(request: Request) {
  if (!(await auth()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "配置文件必须是有效 JSON。" }, { status: 400 });
  }

  // Validate the whole payload before touching the database: D1 offers no
  // transactions, so a partial failure mid-write cannot be rolled back.
  const rawSources = (payload as { sources?: unknown[] })?.sources ?? [];
  const sourceNames = new Set(
    rawSources
      .map((s) => (s as { name?: unknown })?.name)
      .filter((n): n is string => typeof n === "string"),
  );
  const parsed = configSchema(sourceNames).safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "配置校验失败。", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const prisma = getDb();
  const { sources, routes } = parsed.data;

  // Idempotent upsert by unique name — never deletes, so an import cannot
  // wipe existing config.
  const sourceIdByName = new Map<string, string>();
  for (const source of sources) {
    const headersJson = JSON.stringify(source.headers ?? {});
    const existing = await prisma.source.findUnique({
      where: { name: source.name },
    });
    const saved = existing
      ? await prisma.source.update({
          where: { name: source.name },
          data: {
            baseUrl: source.baseUrl,
            enabled: source.enabled,
            timeoutMs: source.timeoutMs,
            userAgent: source.userAgent || null,
            headersJson,
          },
        })
      : await prisma.source.create({
          data: {
            name: source.name,
            baseUrl: source.baseUrl,
            enabled: source.enabled,
            timeoutMs: source.timeoutMs,
            userAgent: source.userAgent || null,
            headersJson,
          },
        });
    sourceIdByName.set(saved.name, saved.id);
  }

  let routeUpserts = 0;
  let routeSkipped = 0;
  for (const route of routes) {
    const sourceId = sourceIdByName.get(route.source);
    if (!sourceId) {
      routeSkipped++;
      continue;
    }
    const { source: _sourceName, ...routeData } = route;
    await prisma.route.upsert({
      where: { pathPrefix: routeData.pathPrefix },
      create: { ...routeData, sourceId },
      update: { ...routeData, sourceId },
    });
    routeUpserts++;
  }

  return Response.json({
    imported: {
      sources: sourceIdByName.size,
      routes: routeUpserts,
      routesSkipped: routeSkipped,
    },
  });
}
