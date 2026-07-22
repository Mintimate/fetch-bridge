import { prisma } from "@/lib/db";
import { RouteForm } from "@/components/admin/forms";
import { RouteManagement } from "@/components/admin/route-management";
export const dynamic = "force-dynamic";
export default async function RoutesPage() {
  const [records, sources] = await Promise.all([
    prisma.route.findMany({
      include: { source: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.source.findMany({ select: { id: true, name: true, enabled: true } }),
  ]);
  const routes = records.map(({ source, ...route }) => ({
    ...route,
    sourceName: source.name,
  }));
  const enabledSources = sources.filter((source) => source.enabled);

  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Routes</p>
        <h1 className="mt-1 text-2xl font-semibold">下载路由</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          路径前缀映射到固定 Source 下的目标目录，不能输入完整目标 URL。
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RouteManagement routes={routes} sources={sources} />
        <RouteForm sources={enabledSources} />
      </div>
    </>
  );
}
