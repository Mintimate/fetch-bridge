import { assertSafeSourceUrl } from "@/lib/relay-core";

export type RouteSuggestion = {
  sourceName: string;
  baseUrl: string;
  pathPrefix: string;
  targetPath: string;
  description: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function suggestRouteFromUrl(rawUrl: string): RouteSuggestion {
  const url = assertSafeSourceUrl(rawUrl);
  const host = url.hostname.replace(/^www\./, "");
  const segments = url.pathname
    .split("/")
    .map((segment) => slugify(segment))
    .filter(Boolean);

  const slug = segments.join("-") || slugify(host.split(".")[0]) || "download";
  const sourceName = slugify(host) || "Source";
  const pathPrefix = `/${slug}`;
  const targetPath = url.pathname.endsWith("/")
    ? url.pathname.slice(0, -1)
    : url.pathname || "/";

  return {
    sourceName,
    baseUrl: url.origin,
    pathPrefix,
    targetPath,
    description: `${sourceName} ${pathPrefix}`,
  };
}
