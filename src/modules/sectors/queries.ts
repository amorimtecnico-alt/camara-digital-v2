import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type SectorListFilters = {
  occupancy?: "with_users" | "without_users" | undefined;
  search?: string | undefined;
};

export async function getSectorsList(filters: SectorListFilters = {}) {
  const where: Prisma.SectorWhereInput = {};

  if (filters.search) {
    where.OR = [
      {
        name: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (filters.occupancy === "with_users") {
    where.users = {
      some: {},
    };
  }

  if (filters.occupancy === "without_users") {
    where.users = {
      none: {},
    };
  }

  return prisma.sector.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });
}

export async function getSectorById(id: string) {
  return prisma.sector.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });
}
