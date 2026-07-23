import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { routeSchema, sourceSchema } from "@/lib/schemas";
import { databaseErrorResponse } from "@/lib/api-errors";

export async function POST(request: Request) {
  const prisma = getDb();
  if (!(await auth()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json();
  if (!body || typeof body !== "object")
    return Response.json({ error: "请求格式无效。" }, { status: 400 });

  const attachedSourceId = (body as { attachedSourceId?: unknown })
    .attachedSourceId;
  const isAttaching = typeof attachedSourceId === "string" && attachedSourceId;

  const sourceResult = isAttaching
    ? { success: true as const, data: null }
    : sourceSchema.safeParse({
        name: (body as { sourceName?: unknown }).sourceName,
        baseUrl: (body as { baseUrl?: unknown }).baseUrl,
      });
  const routeResult = routeSchema.safeParse({
    name: isAttaching
      ? (body as { description?: unknown }).description ||
        (body as { pathPrefix?: unknown }).pathPrefix
      : (body as { sourceName?: unknown }).sourceName,
    description: (body as { description?: unknown }).description,
    pathPrefix: (body as { pathPrefix?: unknown }).pathPrefix,
    targetPath: (body as { targetPath?: unknown }).targetPath,
    sourceId: "__pending__",
    enabled: true,
    isPublic: true,
  });
  if (!sourceResult.success)
    return Response.json(
      { error: "源站无效。", details: sourceResult.error.flatten() },
      { status: 400 },
    );
  if (!routeResult.success)
    return Response.json(
      { error: "路由无效。", details: routeResult.error.flatten() },
      { status: 400 },
    );

  const source = sourceResult.success ? sourceResult.data : null;
  const route = routeResult.data;

  let savedSource: Awaited<ReturnType<typeof prisma.source.findUnique>> = null;

  if (typeof attachedSourceId === "string" && attachedSourceId) {
    // A source is already selected: attach the route to it directly instead
    // of creating or upserting a source.
    savedSource = await prisma.source.findUnique({
      where: { id: attachedSourceId },
    });
    if (!savedSource)
      return Response.json({ error: "所选源站不存在。" }, { status: 400 });
  } else {
    // Non-attach path: source is guaranteed present.
    const src = source as NonNullable<typeof source>;
    // Dedupe by origin: a source may already exist under a different name
    // for the same baseUrl, so resolve to it instead of creating a duplicate.
    const existingSource = await prisma.source.findFirst({
      where: { baseUrl: src.baseUrl },
    });
    savedSource = existingSource ?? null;
    if (!savedSource) {
      savedSource = await prisma.source.upsert({
        where: { name: src.name },
        create: {
          name: src.name,
          baseUrl: src.baseUrl,
          enabled: src.enabled,
          timeoutMs: src.timeoutMs,
          userAgent: src.userAgent || null,
          headersJson: JSON.stringify(src.headers ?? {}),
        },
        update: {
          baseUrl: src.baseUrl,
          enabled: src.enabled,
          timeoutMs: src.timeoutMs,
          userAgent: src.userAgent || null,
          headersJson: JSON.stringify(src.headers ?? {}),
        },
      });
    }
  }

  const savedRoute = await prisma.route.upsert({
    where: { pathPrefix: route.pathPrefix },
    create: {
      name: route.name,
      pathPrefix: route.pathPrefix,
      targetPath: route.targetPath,
      sourceId: savedSource.id,
      enabled: route.enabled,
      isPublic: route.isPublic,
      description: route.description || null,
    },
    update: {
      name: route.name,
      targetPath: route.targetPath,
      sourceId: savedSource.id,
      enabled: route.enabled,
      isPublic: route.isPublic,
      description: route.description || null,
    },
  });

  return Response.json(
    { source: savedSource, route: savedRoute },
    { status: 201 },
  );
}
