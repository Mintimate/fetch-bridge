import { auth } from "@/auth";
import { databaseErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { sourceSchema } from "@/lib/schemas";
import { assertPublicDns, assertSafeSourceUrl } from "@/lib/source-security";

type RouteContext = { params: Promise<{ id: string }> };

async function validatedSource(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  return sourceSchema.safeParse(body);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await auth()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validatedSource(request);
  if (!parsed || !parsed.success)
    return Response.json({ error: "请求内容无效。" }, { status: 400 });

  try {
    await assertPublicDns(assertSafeSourceUrl(parsed.data.baseUrl));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid source" },
      { status: 400 },
    );
  }

  const { headers, ...sourceData } = parsed.data;
  try {
    const source = await prisma.source.update({
      where: { id: (await params).id },
      data: {
        ...sourceData,
        userAgent: sourceData.userAgent || null,
        headersJson: JSON.stringify(headers),
      },
    });
    return Response.json(source);
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await auth()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = (await params).id;
  const source = await prisma.source.findUnique({
    where: { id },
    select: { _count: { select: { routes: true } } },
  });
  if (!source)
    return Response.json({ error: "Source not found" }, { status: 404 });

  try {
    await prisma.source.delete({ where: { id } });
    return Response.json({ deletedRoutes: source._count.routes });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
