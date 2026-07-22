import { prisma } from "@/lib/db";
import { assertSafeSourceUrl } from "@/lib/source-security";
import { auth } from "@/auth";

function routeTargetPath(targetPath: string, pathname: string) {
  const base = targetPath.replace(/\/$/, "");
  if (pathname === base || pathname === `${base}/`) return "";
  if (!pathname.startsWith(`${base}/`)) return null;
  return pathname.slice(base.length + 1);
}

export async function POST(request: Request) {
  if (!(await auth())) return Response.json({ error: "请先登录。" }, { status: 401 });
  let value: unknown;
  try { value = (await request.json()).url; } catch { return Response.json({ error: "请输入有效的 JSON 请求。" }, { status: 400 }); }
  if (typeof value !== "string" || value.length > 4096) return Response.json({ error: "请输入有效的 HTTPS 下载地址。" }, { status: 400 });
  let input: URL;
  try { input = new URL(value); } catch { return Response.json({ error: "请输入有效的 HTTPS 下载地址。" }, { status: 400 }); }
  if (input.protocol !== "https:" || input.search || input.hash || input.username || input.password) return Response.json({ error: "地址必须是无查询参数、无凭据的 HTTPS 下载 URL。" }, { status: 400 });

  const routes = await prisma.route.findMany({ where: { enabled: true, isPublic: true, source: { enabled: true } }, include: { source: true } });
  for (const route of routes) {
    try {
      const source = assertSafeSourceUrl(route.source.baseUrl);
      if (source.origin !== input.origin) continue;
      const suffix = routeTargetPath(route.targetPath, input.pathname);
      if (suffix === null) continue;
      return Response.json({ proxyPath: `/download${route.pathPrefix}/${suffix}` });
    } catch { continue; }
  }
  return Response.json({ error: "这个地址不属于任何已公开配置的下载路由。" }, { status: 404 });
}
