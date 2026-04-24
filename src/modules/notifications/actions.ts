"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      id,
      userId: user.id,
    },
    data: {
      isRead: true,
    },
  });

  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  revalidatePath("/", "layout");
}
