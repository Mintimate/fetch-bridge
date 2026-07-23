"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

export async function removePasskey(formData: FormData) {
  const prisma = getDb();
  const credentialID = formData.get("credentialID");
  if (typeof credentialID !== "string" || !credentialID) return;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return;

  // 通过 userId 约束，管理员只能删除自己绑定的 Passkey。
  await prisma.authenticator.deleteMany({
    where: { credentialID, userId: user.id },
  });
  revalidatePath("/console/settings");
}

export async function updatePasskeyName(formData: FormData) {
  const prisma = getDb();
  const parsed = z
    .object({
      credentialID: z.string().min(1),
      name: z.string().trim().max(40),
    })
    .safeParse({
      credentialID: formData.get("credentialID"),
      name: formData.get("name"),
    });
  if (!parsed.success) return;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return;

  await prisma.authenticator.updateMany({
    where: { credentialID: parsed.data.credentialID, userId: user.id },
    data: { name: parsed.data.name || null },
  });
  revalidatePath("/console/settings");
}
