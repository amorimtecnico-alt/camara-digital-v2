import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeDigits } from "@/lib/utils";

export type SupplierListFilters = {
  hasContracts?: "with_contracts" | "without_contracts" | undefined;
  search?: string | undefined;
};

export async function getSuppliersList(filters: SupplierListFilters = {}) {
  const where: Prisma.SupplierWhereInput = {};
  const documentDigits = normalizeDigits(filters.search);

  if (filters.search) {
    const orConditions: Prisma.SupplierWhereInput[] = [
      {
        companyName: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        tradeName: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        contactName: {
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
      {
        phone: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];

    if (documentDigits) {
      orConditions.push({
        document: {
          contains: documentDigits,
        },
      });
    }

    where.OR = orConditions;
  }

  if (filters.hasContracts === "with_contracts") {
    where.contracts = {
      some: {},
    };
  }

  if (filters.hasContracts === "without_contracts") {
    where.contracts = {
      none: {},
    };
  }

  return prisma.supplier.findMany({
    where,
    orderBy: { companyName: "asc" },
    include: {
      _count: {
        select: {
          contracts: true,
        },
      },
    },
  });
}

export async function getSupplierById(id: string) {
  return prisma.supplier.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          contracts: true,
        },
      },
    },
  });
}
