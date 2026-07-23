import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getDb } from "@/lib/db";
import {
  assertPublicDns,
  assertSafeSourceUrl,
  buildDownloadResponseHeaders,
  buildUpstreamHeaders,
  requestClientIp,
  resolveUpstreamUrl,
  responseContentLength,
  sourceTimeout,
} from "@/lib/source-security";

type ResolvedRoute = Awaited<ReturnType<typeof resolveRoute>>;

export async function resolveRoute(requestPath: string[]) {
  const prisma = getDb();
  const requestedPath = `/${requestPath.join("/")}`;
  const candidates = await prisma.route.findMany({
    where: { enabled: true, source: { enabled: true } },
    include: { source: true },
  });
  candidates.sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);
  const route = candidates.find(
    ({ pathPrefix }) =>
      requestedPath === pathPrefix ||
      requestedPath.startsWith(`${pathPrefix}/`),
  );
  if (!route) return null;

  const base = assertSafeSourceUrl(route.source.baseUrl);
  await assertPublicDns(base);
  const target = resolveUpstreamUrl(
    base,
    route.targetPath,
    route.pathPrefix,
    requestedPath,
  );
  return { route, requestedPath, target };
}

async function writeLog(
  resolved: Exclude<ResolvedRoute, null>,
  status: number,
  started: number,
  bytes: number,
  request: Request,
) {
  await getDb().downloadLog.create({
    data: {
      routeId: resolved.route.id,
      sourceName: resolved.route.source.name,
      path: resolved.requestedPath,
      upstreamUrl: resolved.target.toString(),
      status,
      durationMs: Date.now() - started,
      bytes: BigInt(bytes),
      clientIp: requestClientIp(request),
    },
  });
}

function scheduleLog(promise: Promise<void>) {
  const guarded = promise.catch((error) => {
    // eslint-disable-next-line no-console -- telemetry failures must not interrupt downloads.
    console.error("[download] Log write failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  });

  try {
    getCloudflareContext().ctx.waitUntil(guarded);
  } catch {
    // Local Next.js development has no Cloudflare execution context.
    void guarded;
  }
}

export async function relayDownload(request: Request, path: string[]) {
  const started = Date.now();
  let resolved: ResolvedRoute;
  try {
    resolved = await resolveRoute(path);
  } catch (error) {
    // Do not expose database details to callers, but retain safe diagnostics for Workers logs.
    // eslint-disable-next-line no-console -- safe diagnostics without route data.
    console.warn("[download] Route resolution failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return new Response("Invalid download route", { status: 400 });
  }
  if (!resolved)
    return new Response("Download route not found", { status: 404 });

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    sourceTimeout(resolved.route.source.timeoutMs),
  );
  const headers = buildUpstreamHeaders(
    resolved.route.source.headersJson,
    resolved.route.source.userAgent,
    request.headers,
  );

  try {
    const upstream = await fetch(resolved.target, {
      method: request.method,
      headers,
      signal: controller.signal,
      redirect: "manual",
      cache: "no-store",
    });
    const responseHeaders = buildDownloadResponseHeaders(upstream.headers);
    responseHeaders.set("x-fetch-bridge-route", resolved.route.pathPrefix);
    const bytes = responseContentLength(upstream.headers);
    scheduleLog(writeLog(resolved, upstream.status, started, bytes, request));
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- safe diagnostics without upstream credentials.
    console.warn("[download] Upstream request failed", {
      path: resolved.requestedPath,
      message: error instanceof Error ? error.message : String(error),
    });
    scheduleLog(writeLog(resolved, 502, started, 0, request));
    return new Response("Upstream download unavailable", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
