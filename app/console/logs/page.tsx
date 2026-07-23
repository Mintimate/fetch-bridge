import { getDb } from "@/lib/db";
export const dynamic = "force-dynamic";
import { formatShanghaiDateTime } from "@/lib/utils";

function legacyUpstreamUrl(log: {
  path: string;
  route: {
    pathPrefix: string;
    targetPath: string;
    source: { baseUrl: string };
  } | null;
}) {
  if (!log.route) return null;

  try {
    const suffix = log.path
      .slice(log.route.pathPrefix.length)
      .replace(/^\//, "");
    const base = new URL(log.route.source.baseUrl);
    const targetPath = log.route.targetPath.replace(/\/$/, "");
    const target = new URL(`${targetPath}/${suffix}`, base);
    return target.origin === base.origin ? target.toString() : null;
  } catch {
    return null;
  }
}

export default async function LogsPage() {
  const prisma = getDb();
  const logs = await prisma.downloadLog.findMany({
    include: { route: { include: { source: true } } },
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
        <table className="w-full min-w-[1300px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">时间</th>
              <th className="px-5 py-3 font-medium">Route</th>
              <th className="px-5 py-3 font-medium">映射地址</th>
              <th className="px-5 py-3 font-medium">上游请求地址</th>
              <th className="px-5 py-3 font-medium">状态</th>
              <th className="px-5 py-3 font-medium">耗时</th>
              <th className="px-5 py-3 font-medium">大小</th>
              <th className="px-5 py-3 font-medium">Client IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b align-top last:border-0">
                <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                  {formatShanghaiDateTime(log.createdAt)}
                </td>
                <td className="px-5 py-3">{log.route?.name || log.path}</td>
                <td className="max-w-72 px-5 py-3">
                  <code
                    className="block break-all text-xs text-muted-foreground"
                    title={log.path}
                  >
                    {log.path}
                  </code>
                </td>
                <td className="max-w-md px-5 py-3">
                  <code
                    className="block break-all text-xs text-muted-foreground"
                    title={
                      log.upstreamUrl || legacyUpstreamUrl(log) || undefined
                    }
                  >
                    {log.upstreamUrl || legacyUpstreamUrl(log) || "—"}
                  </code>
                </td>
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
                  colSpan={8}
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
