import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { sourceSchema } from "@/lib/schemas";
import { assertPublicDns } from "@/lib/dns";
import { assertSafeSourceUrl } from "@/lib/relay-core";
import { databaseErrorResponse } from "@/lib/api-errors";

export async function POST(request: Request) {
  const prisma = getDb();
  if (!(await auth()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容无效。" }, { status: 400 });
  }
  const parsed = sourceSchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    await assertPublicDns(assertSafeSourceUrl(parsed.data.baseUrl));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid source" },
      { status: 400 },
    );
  }
  try {
    const { headers, ...sourceData } = parsed.data;
    const source = await prisma.source.create({
      data: {
        ...sourceData,
        userAgent: sourceData.userAgent || null,
        headersJson: JSON.stringify(headers),
      },
    });
    return Response.json(source, { status: 201 });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
