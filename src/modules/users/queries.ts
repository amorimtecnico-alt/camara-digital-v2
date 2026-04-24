import { Prisma, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type UserListFilters = {
  role?: UserRole | undefined;
  search?: string | undefined;
  sectorId?: string | undefined;
  status?: "active" | "inactive" | undefined;
};

export async function getUserFormOptions() {
  return prisma.sector.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function getUsersList(filters: UserListFilters = {}) {
  const where: Prisma.UserWhereInput = {};

  if (filters.search) {
    where.OR = [
      {
        name: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (filters.status === "active") {
    where.active = true;
  }

  if (filters.status === "inactive") {
    where.active = false;
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.sectorId) {
    where.sectorId = filters.sectorId;
  }

  return prisma.user.findMany({
    where,
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      sector: true,
    },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      sector: true,
    },
  });
}
