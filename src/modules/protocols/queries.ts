import { Prisma, ProtocolStatus, type User } from "@prisma/client";

import { canReadAllProtocols } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type ProtocolListFilters = {
  createdById?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  search?: string | undefined;
  status?: ProtocolStatus | undefined;
};

function getDateRangeFilter(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  const createdAt: Prisma.DateTimeFilter = {};

  if (dateFrom) {
    createdAt.gte = new Date(`${dateFrom}T00:00:00`);
  }

  if (dateTo) {
    createdAt.lte = new Date(`${dateTo}T23:59:59.999`);
  }

  return createdAt;
}

export async function getProtocolFilterOptions() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function getProtocolsList(
  currentUser?: Pick<User, "id" | "role">,
  filters: ProtocolListFilters = {},
) {
  const where: Prisma.ProtocolWhereInput = {};

  if (filters.search) {
    where.OR = [
      {
        code: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        subject: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (currentUser && !canReadAllProtocols(currentUser)) {
    where.createdById = currentUser.id;
  } else if (filters.createdById) {
    where.createdById = filters.createdById;
  }

  const createdAt = getDateRangeFilter(filters.dateFrom, filters.dateTo);

  if (createdAt) {
    where.createdAt = createdAt;
  }

  return prisma.protocol.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getProtocolById(id: string) {
  return prisma.protocol.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
