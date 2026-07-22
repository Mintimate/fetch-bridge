import "server-only";
import { prisma } from "@/lib/db";
import { assertPublicDns, assertSafeSourceUrl, isForwardableRequestHeader, safeConfiguredHeaders } from "@/lib/source-security";

type ResolvedRoute = Awaited<ReturnType<typeof resolveRoute>>;
const RESPONSE_HEADERS = ["accept-ranges", "content-length", "content-range", "content-type", "content-disposition", "etag", "last-modified", "cache-control"];

export async function resolveRoute(requestPath: string[]) {
  const requestedPath = `/${requestPath.join("/")}`;
  const candidates = await prisma.route.findMany({ where: { enabled: true, source: { enabled: true } }, include: { source: true } });
  candidates.sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);
  const route = candidates.find(({ pathPrefix }) => requestedPath === pathPrefix || requestedPath.startsWith(`${pathPrefix}/`));
  if (!route) return null;
  const suffix = requestedPath.slice(route.pathPrefix.length).replace(/^\//, "");
  const base = assertSafeSourceUrl(route.source.baseUrl);
  await assertPublicDns(base);
  const targetBase = route.targetPath.replace(/\/$/, "");
  const target = new URL(`${targetBase}/${suffix}`, base);
  if (target.origin !== base.origin) throw new Error("Invalid target mapping");
  return { route, requestedPath, target };
}

function clientIp(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null; }

async function writeLog(resolved: Exclude<ResolvedRoute, null>, status: number, started: number, bytes: number, request: Request) {
  try { await prisma.downloadLog.create({ data: { routeId: resolved.route.id, sourceName: resolved.route.source.name, path: resolved.requestedPath, status, durationMs: Date.now() - started, bytes: BigInt(bytes), clientIp: clientIp(request) } }); } catch { /* telemetry must not interrupt a download */ }
}

export async function relayDownload(request: Request, path: string[]) {
  const started = Date.now();
  let resolved: ResolvedRoute;
  try { resolved = await resolveRoute(path); } catch { return new Response("Invalid download route", { status: 400 }); }
  if (!resolved) return new Response("Download route not found", { status: 404 });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), resolved.route.source.timeoutMs);
  const headers = safeConfiguredHeaders(resolved.route.source.headersJson);
  if (resolved.route.source.userAgent) headers.set("user-agent", resolved.route.source.userAgent);
  for (const [name, value] of request.headers) if ((name === "range" || name === "if-none-match" || name === "if-modified-since") && isForwardableRequestHeader(name)) headers.set(name, value);
  try {
    const upstream = await fetch(resolved.target, { method: request.method, headers, signal: controller.signal, redirect: "manual", cache: "no-store" });
    clearTimeout(timer);
    const responseHeaders = new Headers();
    for (const name of RESPONSE_HEADERS) { const value = upstream.headers.get(name); if (value) responseHeaders.set(name, value); }
    responseHeaders.set("x-content-type-options", "nosniff");
    responseHeaders.set("x-fetch-bridge-route", resolved.route.pathPrefix);
    const bytes = Number(upstream.headers.get("content-length") ?? 0);
    void writeLog(resolved, upstream.status, started, bytes, request);
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    clearTimeout(timer);
    void writeLog(resolved, 502, started, 0, request);
    return new Response("Upstream download unavailable", { status: 502 });
  }
}
