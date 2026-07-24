const BLOCKED_REQUEST_HEADERS = new Set([
  "authorization",
  "connection",
  "content-length",
  "cookie",
  "forwarded",
  "host",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const CONDITIONAL_REQUEST_HEADERS = [
  "range",
  "if-range",
  "if-match",
  "if-none-match",
  "if-modified-since",
  "if-unmodified-since",
] as const;
const DOWNLOAD_RESPONSE_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-encoding",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

export function normalizeAddress(address: string) {
  return address.toLowerCase().replace(/^\[|\]$/g, "");
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

export function isIP(value: string): 0 | 4 | 6 {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    const parts = value.split(".").map(Number);
    if (
      parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    )
      return 4;
  }
  if (value.includes(":") && /^[0-9a-fA-F:]+$/.test(value)) return 6;
  return 0;
}

export function isPrivateAddress(address: string) {
  const normalized = normalizeAddress(address);
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);

  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  );
}

export function assertSafeSourceUrl(raw: string) {
  const url = new URL(raw);
  const hostname = normalizeAddress(url.hostname);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isPrivateAddress(hostname)
  ) {
    throw new Error("Source must be a credential-free public HTTPS URL");
  }
  return url;
}

export function resolveUpstreamUrl(
  base: URL,
  targetPath: string,
  pathPrefix: string,
  requestedPath: string,
) {
  if (
    requestedPath !== pathPrefix &&
    !requestedPath.startsWith(`${pathPrefix}/`)
  ) {
    throw new Error("Requested path does not match the route prefix");
  }
  if (
    !targetPath.startsWith("/") ||
    targetPath.includes("..") ||
    targetPath.includes("?") ||
    targetPath.includes("#")
  ) {
    throw new Error("Invalid target path");
  }

  const suffix = requestedPath.slice(pathPrefix.length).replace(/^\/+/, "");
  const targetRoot = new URL(`${targetPath.replace(/\/+$/, "")}/`, base);
  const target = new URL(suffix, targetRoot);
  if (
    targetRoot.origin !== base.origin ||
    target.origin !== base.origin ||
    !target.pathname.startsWith(targetRoot.pathname)
  ) {
    throw new Error("Invalid target mapping");
  }
  return target;
}

export function isForwardableRequestHeader(name: string) {
  const normalized = name.toLowerCase();
  return (
    !BLOCKED_REQUEST_HEADERS.has(normalized) &&
    !normalized.startsWith("cf-") &&
    !normalized.startsWith("x-forwarded-")
  );
}

export function safeConfiguredHeaders(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Headers();
  }

  const headers = new Headers();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return headers;
  }

  for (const [name, value] of Object.entries(parsed)) {
    if (typeof value !== "string" || !isForwardableRequestHeader(name)) {
      continue;
    }
    try {
      headers.set(name, value);
    } catch {
      // Ignore invalid data if the database was edited outside the validated admin API.
    }
  }
  return headers;
}

export function buildUpstreamHeaders(
  configuredHeadersJson: string,
  userAgent: string | null | undefined,
  requestHeaders: Headers,
) {
  const headers = safeConfiguredHeaders(configuredHeadersJson);
  if (userAgent) headers.set("user-agent", userAgent);
  for (const name of CONDITIONAL_REQUEST_HEADERS) {
    const value = requestHeaders.get(name);
    if (value) headers.set(name, value);
  }
  // A compressed representation has a different byte address space. If an
  // origin applies Range before Workers decompresses the response, the client
  // receives more bytes than it requested and resumable downloads are corrupt.
  headers.set("accept-encoding", "identity");
  return headers;
}

export function buildDownloadResponseHeaders(upstreamHeaders: Headers) {
  const headers = new Headers();
  for (const name of DOWNLOAD_RESPONSE_HEADERS) {
    const value = upstreamHeaders.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-content-type-options", "nosniff");
  return headers;
}

/**
 * Assemble the client-facing download response from an upstream response.
 * `lightweight` marks responses served by the dedicated download Worker so the
 * 1102 diagnostic in docs/README.md can tell the two paths apart. `transport`
 * records whether the identity TLS fallback was used for this Range request.
 */
export function buildRelayResponse(
  upstream: Response,
  method: string,
  pathPrefix: string,
  transport: "fetch" | "identity-socket",
  lightweight: boolean,
) {
  const headers = buildDownloadResponseHeaders(upstream.headers);
  if (lightweight) headers.set("x-fetch-bridge-relay", "lightweight");
  headers.set("x-fetch-bridge-route", pathPrefix);
  headers.set("x-fetch-bridge-transport", transport);
  return new Response(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export function responseContentLength(headers: Headers) {
  const bytes = Number(headers.get("content-length"));
  return Number.isSafeInteger(bytes) && bytes >= 0 ? bytes : 0;
}

export function sourceTimeout(timeoutMs: number) {
  if (!Number.isFinite(timeoutMs)) return 30_000;
  return Math.min(120_000, Math.max(1_000, Math.trunc(timeoutMs)));
}

export function requestClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}
