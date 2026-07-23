import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  if (!(await auth()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prisma = getDb();
  const [sources, routes] = await Promise.all([
    prisma.source.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.route.findMany({
      include: { source: { select: { name: true } } },
      orderBy: { pathPrefix: "asc" },
    }),
  ]);

  const config = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sources: sources.map(
      ({ id, createdAt, updatedAt, ...source }) => ({
        name: source.name,
        baseUrl: source.baseUrl,
        enabled: source.enabled,
        timeoutMs: source.timeoutMs,
        userAgent: source.userAgent ?? null,
        headers: parseHeaders(source.headersJson),
      }),
    ),
    routes: routes.map(({ id, createdAt, updatedAt, source, ...route }) => ({
      source: source.name,
      name: route.name,
      description: route.description ?? null,
      pathPrefix: route.pathPrefix,
      targetPath: route.targetPath,
      enabled: route.enabled,
      isPublic: route.isPublic,
    })),
  };

  const body = JSON.stringify(config, null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="fetch-bridge-config-${
        new Date().toISOString().slice(0, 10)
      }.json"`,
    },
  });
}

function parseHeaders(headersJson: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(headersJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}
