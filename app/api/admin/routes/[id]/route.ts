import { auth } from "@/auth";
import { databaseErrorResponse } from "@/lib/api-errors";
import { getDb } from "@/lib/db";
import { routeSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const prisma = getDb();
  if (!(await auth()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容无效。" }, { status: 400 });
  }
  const parsed = routeSchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const source = await prisma.source.findUnique({
      where: { id: parsed.data.sourceId },
      select: { id: true },
    });
    if (!source)
      return Response.json({ error: "Source not found" }, { status: 400 });

    const route = await prisma.route.update({
      where: { id: (await params).id },
      data: { ...parsed.data, description: parsed.data.description || null },
    });
    return Response.json(route);
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const prisma = getDb();
  if (!(await auth()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.route.delete({ where: { id: (await params).id } });
    return Response.json({ deleted: true });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
