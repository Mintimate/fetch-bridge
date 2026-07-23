import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { routeSchema } from "@/lib/schemas";
import { databaseErrorResponse } from "@/lib/api-errors";

export async function POST(request: Request) {
  const prisma = getDb();
  if (!(await auth()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = routeSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const source = await prisma.source.findUnique({
      where: { id: parsed.data.sourceId },
    });
    if (!source)
      return Response.json({ error: "Source not found" }, { status: 400 });
    const route = await prisma.route.create({
      data: { ...parsed.data, description: parsed.data.description || null },
    });
    return Response.json(route, { status: 201 });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
