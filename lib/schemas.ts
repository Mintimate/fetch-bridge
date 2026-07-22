import { z } from "zod";

const blockedHeaders = new Set(["cookie", "authorization"]);
export const safeHeaderName = z.string().regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/).refine((name) => !blockedHeaders.has(name.toLowerCase()) && !name.toLowerCase().startsWith("x-forwarded-"), "Cookie, Authorization and X-Forwarded-* cannot be configured");
export const headersSchema = z.record(safeHeaderName, z.string().max(4096));

export const sourceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  baseUrl: z.string().url().refine((value) => new URL(value).protocol === "https:", "Only HTTPS sources are allowed"),
  enabled: z.boolean().default(true),
  timeoutMs: z.number().int().min(1000).max(120000).default(30000),
  userAgent: z.string().trim().max(512).optional().or(z.literal("")),
  headers: headersSchema.default({}),
});

export const routeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  pathPrefix: z.string().trim().regex(/^\/[a-zA-Z0-9._-]*$/, "Use a single URL prefix such as /firefox"),
  targetPath: z.string().trim().regex(/^\/(?!\/)/, "Target must be an absolute path, not a URL").refine((path) => !path.includes("..") && !path.includes("?") && !path.includes("#"), "Target may not contain traversal, query, or fragment"),
  sourceId: z.string().min(1),
  enabled: z.boolean().default(true),
  isPublic: z.boolean().default(true),
});
