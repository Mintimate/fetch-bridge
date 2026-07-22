"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function removePasskey(formData: FormData) {
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
