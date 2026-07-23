/// <reference types="@cloudflare/workers-types" />

import {
  assertPublicDns,
  assertSafeSourceUrl,
  buildDownloadResponseHeaders,
  buildUpstreamHeaders,
  requestClientIp,
  resolveUpstreamUrl,
  responseContentLength,
  sourceTimeout,
} from "../lib/relay-core";

type DownloadRoute = {
  routeId: string;
  pathPrefix: string;
  targetPath: string;
  sourceName: string;
  baseUrl: string;
  timeoutMs: number;
  userAgent: string | null;
  headersJson: string;
};

const DOWNLOAD_PREFIX = "/download";

const ROUTE_QUERY = `
  SELECT
    r.id AS routeId,
    r.pathPrefix,
    r.targetPath,
    s.name AS sourceName,
    s.baseUrl,
    s.timeoutMs,
    s.userAgent,
    s.headersJson
  FROM Route AS r
  INNER JOIN Source AS s ON s.id = r.sourceId
  WHERE r.enabled = 1
    AND s.enabled = 1
    AND (
      ?1 = r.pathPrefix
      OR substr(?1, 1, length(r.pathPrefix) + 1) = r.pathPrefix || '/'
    )
  ORDER BY length(r.pathPrefix) DESC
  LIMIT 1
`;

function requestPath(url: URL) {
  if (!url.pathname.startsWith(`${DOWNLOAD_PREFIX}/`)) {
    throw new Error("Request is outside the download route");
  }
  const path = url.pathname.slice(DOWNLOAD_PREFIX.length);
  return path.startsWith("/") ? path : `/${path}`;
}

async function resolveRoute(env: DownloadWorkerEnv, requestedPath: string) {
  return env.DB.prepare(ROUTE_QUERY).bind(requestedPath).first<DownloadRoute>();
}

async function writeDownloadLog(
  env: DownloadWorkerEnv,
  route: DownloadRoute,
  requestedPath: string,
  upstreamUrl: string,
  status: number,
  started: number,
  bytes: number,
  request: Request,
) {
  await env.DB.prepare(
    `INSERT INTO DownloadLog
      (id, routeId, sourceName, path, upstreamUrl, status, durationMs, bytes, clientIp)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(
      crypto.randomUUID(),
      route.routeId,
      route.sourceName,
      requestedPath,
      upstreamUrl,
      status,
      Date.now() - started,
      bytes,
      requestClientIp(request),
    )
    .run();
}

function logInBackground(
  ctx: ExecutionContext,
  promise: Promise<void>,
  requestedPath: string,
) {
  ctx.waitUntil(
    promise.catch((error) => {
      // eslint-disable-next-line no-console -- structured production diagnostic.
      console.error(
        JSON.stringify({
          message: "download log write failed",
          path: requestedPath,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }),
  );
}

async function relayDownload(
  request: Request,
  env: DownloadWorkerEnv,
  ctx: ExecutionContext,
) {
  const started = Date.now();
  const url = new URL(request.url);
  const requestedPath = requestPath(url);
  const route = await resolveRoute(env, requestedPath);
  if (!route) {
    return new Response("Download route not found", { status: 404 });
  }

  let target: URL;
  try {
    const base = assertSafeSourceUrl(route.baseUrl);
    await assertPublicDns(base);
    target = resolveUpstreamUrl(
      base,
      route.targetPath,
      route.pathPrefix,
      requestedPath,
    );
  } catch (error) {
    // eslint-disable-next-line no-console -- structured production diagnostic.
    console.error(
      JSON.stringify({
        message: "download route resolution failed",
        path: requestedPath,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return new Response("Invalid download route", { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    sourceTimeout(route.timeoutMs),
  );
  const headers = buildUpstreamHeaders(
    route.headersJson,
    route.userAgent,
    request.headers,
  );

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      signal: controller.signal,
      redirect: "manual",
    });

    const responseHeaders = buildDownloadResponseHeaders(upstream.headers);
    responseHeaders.set("x-fetch-bridge-relay", "lightweight");
    responseHeaders.set("x-fetch-bridge-route", route.pathPrefix);

    const bytes = responseContentLength(upstream.headers);
    logInBackground(
      ctx,
      writeDownloadLog(
        env,
        route,
        requestedPath,
        target.toString(),
        upstream.status,
        started,
        bytes,
        request,
      ),
      requestedPath,
    );

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- structured production diagnostic.
    console.error(
      JSON.stringify({
        message: "upstream download failed",
        path: requestedPath,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    logInBackground(
      ctx,
      writeDownloadLog(
        env,
        route,
        requestedPath,
        target.toString(),
        502,
        started,
        0,
        request,
      ),
      requestedPath,
    );
    return new Response("Upstream download unavailable", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }
    try {
      return await relayDownload(request, env, ctx);
    } catch (error) {
      // eslint-disable-next-line no-console -- structured production diagnostic.
      console.error(
        JSON.stringify({
          message: "download worker failed",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return new Response("Download service unavailable", { status: 500 });
    }
  },
} satisfies ExportedHandler<DownloadWorkerEnv>;
