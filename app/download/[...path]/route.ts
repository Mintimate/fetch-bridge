import { relayDownload } from "@/lib/download";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return relayDownload(request, (await context.params).path);
}
export async function HEAD(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return relayDownload(request, (await context.params).path);
}
