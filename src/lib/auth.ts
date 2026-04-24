import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { getInternalUserByEmail } from "@/modules/auth/user-access";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  const user = await getInternalUserByEmail(email);

  if (!user || !user.active) {
    return null;
  }

  return user;
});

export async function getUserByEmail(email: string) {
  return getInternalUserByEmail(email);
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
