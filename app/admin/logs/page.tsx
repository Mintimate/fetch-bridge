import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";
import { formatShanghaiDateTime } from "@/lib/utils";

export default async function LogsPage() {
  const logs = await prisma.downloadLog.findMany({
    include: { route: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Logs</p>
        <h1 className="mt-1 text-2xl font-semibold">下载日志</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          最近 100 条中继记录。日志失败不会影响实际下载。
        </p>
      </header>
      <section className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">时间</th>
              <th className="px-5 py-3 font-medium">Route</th>
              <th className="px-5 py-3 font-medium">状态</th>
              <th className="px-5 py-3 font-medium">耗时</th>
              <th className="px-5 py-3 font-medium">大小</th>
              <th className="px-5 py-3 font-medium">Client IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                  {formatShanghaiDateTime(log.createdAt)}
                </td>
                <td className="px-5 py-3">{log.route?.name || log.path}</td>
                <td
                  className={
                    log.status >= 400 ? "px-5 py-3 text-red-600" : "px-5 py-3"
                  }
                >
                  {log.status}
                </td>
                <td className="px-5 py-3">{log.durationMs} ms</td>
                <td className="px-5 py-3">
                  {(Number(log.bytes) / 1024 / 1024).toFixed(2)} MB
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {log.clientIp || "—"}
                </td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-muted-foreground"
                >
                  暂无日志。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
