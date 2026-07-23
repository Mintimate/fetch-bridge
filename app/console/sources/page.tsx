import { getDb } from "@/lib/db";
import { SourcesAndRoutes } from "@/components/sources-and-routes";
export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const prisma = getDb();
  const [sourceRecords, routeRecords] = await Promise.all([
    prisma.source.findMany({
      include: { _count: { select: { routes: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.route.findMany({
      include: { source: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const sources = sourceRecords.map(({ _count, ...source }) => ({
    ...source,
    routeCount: _count.routes,
  }));
  const routes = routeRecords.map(({ source, ...route }) => ({
    ...route,
    sourceName: source.name,
  }));

  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Sources & Routes</p>
        <h1 className="mt-1 text-2xl font-semibold">源站与路由</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          仅接受 HTTPS 公网源站；凭据、Cookie 与转发链 Header 已禁止。路径前缀映射到固定 Source 下的目标目录。
        </p>
      </header>
      <SourcesAndRoutes sources={sources} routes={routes} />
    </>
  );
}
