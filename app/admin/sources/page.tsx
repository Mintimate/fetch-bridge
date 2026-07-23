import { getDb } from "@/lib/db";
import { SourceForm } from "@/components/admin/forms";
import { SourceManagement } from "@/components/admin/source-management";
export const dynamic = "force-dynamic";
export default async function SourcesPage() {
  const prisma = getDb();
  const records = await prisma.source.findMany({
    include: { _count: { select: { routes: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const sources = records.map(({ _count, ...source }) => ({
    ...source,
    routeCount: _count.routes,
  }));

  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Sources</p>
        <h1 className="mt-1 text-2xl font-semibold">源站</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          仅接受 HTTPS 公网源站；凭据、Cookie 与转发链 Header 已禁止。
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SourceManagement sources={sources} />
        <SourceForm />
      </div>
    </>
  );
}
