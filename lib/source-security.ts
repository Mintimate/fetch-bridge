import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_REQUEST_HEADERS = new Set(["cookie", "authorization", "host", "connection", "transfer-encoding", "content-length"]);

export function assertSafeSourceUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Source must be a credential-free HTTPS URL");
  const host = url.hostname.toLowerCase();
  const privateIpv4 = /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  if (host === "localhost" || host.endsWith(".localhost") || host === "::" || host === "::1" || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb") || host.startsWith("fc") || host.startsWith("fd") || privateIpv4) throw new Error("Local and private network sources are not allowed");
  return url;
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address);
  const lower = address.toLowerCase();
  return lower === "::" || lower === "::1" || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") || lower.startsWith("fc") || lower.startsWith("fd");
}

/** Resolve at request time so hostnames such as 127.0.0.1.nip.io cannot bypass source validation. */
export async function assertPublicDns(url: URL) {
  const records = await lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) throw new Error("Source hostname resolves to a local or private address");
}

export function isForwardableRequestHeader(name: string) {
  const lower = name.toLowerCase();
  return !BLOCKED_REQUEST_HEADERS.has(lower) && !lower.startsWith("x-forwarded-");
}

export function safeConfiguredHeaders(raw: string): Headers {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return new Headers(); }
  const object = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const headers = new Headers();
  for (const [name, value] of Object.entries(object)) if (typeof value === "string" && isForwardableRequestHeader(name)) headers.set(name, value);
  return headers;
}
