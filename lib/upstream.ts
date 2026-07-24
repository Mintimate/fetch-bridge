import { assertPublicDns } from "@/lib/dns";
import { assertSafeSourceUrl, buildUpstreamHeaders } from "@/lib/relay-core";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_MAX_REDIRECTS = 5;

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type UpstreamFetchOptions = {
  target: URL;
  method: "GET" | "HEAD";
  configuredHeadersJson: string;
  userAgent: string | null;
  requestHeaders: Headers;
  signal: AbortSignal;
  maxRedirects?: number;
  fetcher?: Fetcher;
  validateUrl?: (url: URL) => Promise<void>;
};

export type UpstreamFetchResult = {
  response: Response;
  finalUrl: URL;
  redirectCount: number;
};

async function validatePublicUrl(url: URL) {
  assertSafeSourceUrl(url.toString());
  await assertPublicDns(url);
}

/**
 * Follow download redirects without forwarding configured credentials to a
 * different origin. Every redirect target is validated before it is fetched.
 */
export async function fetchUpstream({
  target,
  method,
  configuredHeadersJson,
  userAgent,
  requestHeaders,
  signal,
  maxRedirects = DEFAULT_MAX_REDIRECTS,
  fetcher = fetch,
  validateUrl = validatePublicUrl,
}: UpstreamFetchOptions): Promise<UpstreamFetchResult> {
  let current = target;
  let redirectCount = 0;
  let includeConfiguredHeaders = true;

  while (true) {
    const headers = buildUpstreamHeaders(
      includeConfiguredHeaders ? configuredHeadersJson : "{}",
      userAgent,
      requestHeaders,
    );
    const response = await fetcher(current, {
      method,
      headers,
      signal,
      redirect: "manual",
      cache: "no-store",
    });

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { response, finalUrl: current, redirectCount };
    }
    if (redirectCount >= maxRedirects) {
      await response.body?.cancel();
      throw new Error(`Upstream exceeded ${maxRedirects} redirects`);
    }

    const location = response.headers.get("location");
    if (!location) {
      await response.body?.cancel();
      throw new Error("Upstream redirect is missing a Location header");
    }

    let next: URL;
    try {
      next = assertSafeSourceUrl(new URL(location, current).toString());
    } catch {
      await response.body?.cancel();
      throw new Error("Upstream redirected to an unsafe URL");
    }
    await response.body?.cancel();
    await validateUrl(next);

    if (next.origin !== current.origin) {
      includeConfiguredHeaders = false;
    }
    current = next;
    redirectCount += 1;
  }
}
