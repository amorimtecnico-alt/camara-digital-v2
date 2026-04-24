import { LicitationModality, LicitationStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type LicitationListFilters = {
  contractGenerated?: "yes" | "no" | undefined;
  modality?: LicitationModality | undefined;
  search?: string | undefined;
  status?: LicitationStatus | undefined;
  winner?: "with_winner" | "without_winner" | undefined;
};

export async function getLicitationFormOptions() {
  return prisma.supplier.findMany({
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
      document: true,
    },
  });
}

export async function getLicitationsList(filters: LicitationListFilters = {}) {
  const where: Prisma.LicitationWhereInput = {};

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
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.modality) {
    where.modality = filters.modality;
  }

  if (filters.winner === "with_winner") {
    where.winnerSupplierId = {
      not: null,
    };
  }

  if (filters.winner === "without_winner") {
    where.winnerSupplierId = null;
  }

  if (filters.contractGenerated === "yes") {
    where.contractGenerated = true;
  }

  if (filters.contractGenerated === "no") {
    where.contractGenerated = false;
  }

  return prisma.licitation.findMany({
    where,
    orderBy: [{ status: "asc" }, { publicationDate: "desc" }, { number: "asc" }],
    include: {
      winnerSupplier: {
        select: {
          id: true,
          companyName: true,
          document: true,
        },
      },
    },
  });
}

export async function getLicitationById(id: string) {
  return prisma.licitation.findUnique({
    where: { id },
    include: {
      winnerSupplier: {
        select: {
          id: true,
          companyName: true,
          document: true,
        },
      },
      generatedContract: {
        select: {
          id: true,
          number: true,
        },
      },
    },
  });
}
