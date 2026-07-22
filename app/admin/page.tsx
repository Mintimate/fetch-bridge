import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
export default async function DashboardPage() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = { createdAt: { gte: start } };
  const [summary, failed, routeCount, logs] = await Promise.all([
    prisma.downloadLog.aggregate({
      where: today,
      _count: true,
      _sum: { bytes: true },
      _avg: { durationMs: true },
    }),
    prisma.downloadLog.count({ where: { ...today, status: { gte: 400 } } }),
    prisma.route.count({ where: { enabled: true } }),
    prisma.downloadLog.findMany({
      include: { route: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const total = summary._count;
  const totalBytes = summary._sum.bytes ?? BigInt(0);
  const average = Math.round(summary._avg.durationMs ?? 0);
  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold">下载概览</h1>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="今日请求"
          value={String(total)}
          hint={`${routeCount} 个启用路由`}
        />
        <Metric
          label="中继流量"
          value={`${(Number(totalBytes) / 1024 / 1024).toFixed(1)} MB`}
          hint="按 Content-Length 统计"
        />
        <Metric
          label="失败率"
          value={`${total ? ((failed / total) * 100).toFixed(1) : "0.0"}%`}
          hint={`${failed} 个失败请求`}
        />
        <Metric
          label="平均响应时间"
          value={`${average} ms`}
          hint="上游首个响应"
        />
      </section>
      <section className="mt-10 rounded-lg border">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-medium">最近请求</h2>
          <Link
            className="text-sm text-muted-foreground hover:text-foreground"
            href="/console/logs"
          >
            查看全部
          </Link>
        </div>
        <div className="divide-y">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex justify-between gap-4 px-5 py-3 text-sm"
            >
              <span>{log.route?.name || log.path}</span>
              <span
                className={
                  log.status >= 400 ? "text-red-600" : "text-muted-foreground"
                }
              >
                {log.status} · {log.durationMs} ms
              </span>
            </div>
          ))}
          {!logs.length && (
            <p className="p-5 text-sm text-muted-foreground">
              今天还没有下载请求。
            </p>
          )}
        </div>
      </section>
    </>
  );
}
