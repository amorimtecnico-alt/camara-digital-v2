import { Prisma, ContractStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ContractListFilters = {
  expiration?: "expired" | "days_30" | "days_60" | "days_90" | undefined;
  search?: string | undefined;
  status?: ContractStatus | undefined;
  supplierId?: string | undefined;
};

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildEffectiveEndDateFilter(filter: Prisma.DateTimeFilter): Prisma.ContractWhereInput {
  return {
    OR: [
      {
        endDateCurrent: filter,
      },
      {
        AND: [
          {
            endDateCurrent: null,
          },
          {
            endDate: filter,
          },
        ],
      },
    ],
  };
}

function buildExpirationFilter(expiration?: ContractListFilters["expiration"]) {
  if (!expiration) {
    return undefined;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expiration === "expired") {
    return buildEffectiveEndDateFilter({ lt: today });
  }

  if (expiration === "days_30") {
    return buildEffectiveEndDateFilter({
      gte: today,
      lt: addDays(today, 31),
    });
  }

  if (expiration === "days_60") {
    return buildEffectiveEndDateFilter({
      gte: addDays(today, 31),
      lt: addDays(today, 61),
    });
  }

  return buildEffectiveEndDateFilter({
    gte: addDays(today, 61),
    lt: addDays(today, 91),
  });
}

export async function getContractFormOptions() {
  return prisma.supplier.findMany({
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
    },
  });
}

export async function getContractsList(filters: ContractListFilters = {}) {
  const where: Prisma.ContractWhereInput = {};

  if (filters.search) {
    where.OR = [
      {
        number: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        object: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        supplier: {
          is: {
            companyName: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.supplierId) {
    where.supplierId = filters.supplierId;
  }

  const expirationFilter = buildExpirationFilter(filters.expiration);

  if (expirationFilter) {
    where.AND = [expirationFilter];
  }

  return prisma.contract.findMany({
    where,
    orderBy: [{ status: "asc" }, { endDateCurrent: "asc" }, { number: "asc" }],
    include: {
      supplier: {
        select: {
          id: true,
          companyName: true,
        },
      },
      _count: {
        select: {
          amendments: true,
        },
      },
    },
  });
}

export async function getContractById(id: string) {
  return prisma.contract.findUnique({
    where: { id },
    include: {
      supplier: {
        select: {
          id: true,
          companyName: true,
        },
      },
      amendments: {
        orderBy: [{ amendmentDate: "desc" }, { createdAt: "desc" }],
      },
      attachmentAuditLogs: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

export async function getContractAmendmentById(contractId: string, amendmentId: string) {
  return prisma.contractAmendment.findFirst({
    where: {
      id: amendmentId,
      contractId,
    },
  });
}
