import "server-only";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export async function getInternalUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: {
      sector: true,
      modulePermissions: true,
    },
  });
}

export async function validateCredentialsUser(email: string, password: string) {
  const user = await getInternalUserByEmail(email);

  if (!user) {
    return { reason: "INVALID_CREDENTIALS" as const, user: null };
  }

  if (!user.active) {
    return { reason: "INACTIVE_USER" as const, user: null };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return { reason: "INVALID_CREDENTIALS" as const, user: null };
  }

  return { reason: null, user };
}
