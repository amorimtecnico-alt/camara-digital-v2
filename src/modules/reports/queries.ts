import "server-only";

import { ContractStatus, LicitationStatus, Prisma, ProtocolStatus, type User, type UserModulePermission } from "@prisma/client";

import { canAccessRoute } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getProtocolsList } from "@/modules/protocols/queries";

export type ReportsUser = Pick<User, "id" | "role"> & {
  modulePermissions: UserModulePermission[];
};

export type ContractReportFilters = {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: ContractStatus | undefined;
  supplierId?: string | undefined;
};

export type LicitationReportFilters = {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: LicitationStatus | undefined;
  winnerSupplierId?: string | undefined;
};

export type ProtocolReportFilters = {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: ProtocolStatus | undefined;
};

function toStartDate(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function toEndDate(value?: string) {
  return value ? new Date(`${value}T23:59:59.999`) : undefined;
}

function buildContractEffectiveEndRange(filter: Prisma.DateTimeFilter): Prisma.ContractWhereInput {
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

function buildContractDateFilters(dateFrom?: string, dateTo?: string) {
  const start = toStartDate(dateFrom);
  const end = toEndDate(dateTo);
  const conditions: Prisma.ContractWhereInput[] = [];

  if (end) {
    conditions.push({
      OR: [
        { startDate: null },
        { startDate: { lte: end } },
      ],
    });
  }

  if (start) {
    conditions.push({
      OR: [
        buildContractEffectiveEndRange({ gte: start }),
        {
          AND: [
            { endDateCurrent: null },
            { endDate: null },
          ],
        },
      ],
    });
  }

  return conditions;
}

function buildLicitationsDateFilter(dateFrom?: string, dateTo?: string): Prisma.LicitationWhereInput | undefined {
  const start = toStartDate(dateFrom);
  const end = toEndDate(dateTo);

  if (!start && !end) {
    return undefined;
  }

  const publicationDate: Prisma.DateTimeFilter = {};
  const openingDate: Prisma.DateTimeFilter = {};

  if (start) {
    publicationDate.gte = start;
    openingDate.gte = start;
  }

  if (end) {
    publicationDate.lte = end;
    openingDate.lte = end;
  }

  return {
    OR: [
      { publicationDate },
      { openingDate },
    ],
  };
}

export async function getContractsReport(currentUser: ReportsUser, filters: ContractReportFilters) {
  if (!canAccessRoute(currentUser, "/contratos")) {
    return [];
  }

  const where: Prisma.ContractWhereInput = {};
  const dateFilters = buildContractDateFilters(filters.dateFrom, filters.dateTo);

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.supplierId) {
    where.supplierId = filters.supplierId;
  }

  if (dateFilters.length > 0) {
    where.AND = dateFilters;
  }

  return prisma.contract.findMany({
    where,
    orderBy: [{ status: "asc" }, { endDateCurrent: "asc" }, { endDate: "asc" }, { number: "asc" }],
    select: {
      id: true,
      number: true,
      object: true,
      status: true,
      startDate: true,
      endDate: true,
      endDateCurrent: true,
      currentValue: true,
      initialValue: true,
      supplier: {
        select: {
          companyName: true,
        },
      },
    },
  });
}

export async function getLicitationsReport(currentUser: ReportsUser, filters: LicitationReportFilters) {
  if (!canAccessRoute(currentUser, "/licitacoes")) {
    return [];
  }

  const where: Prisma.LicitationWhereInput = {};
  const dateFilter = buildLicitationsDateFilter(filters.dateFrom, filters.dateTo);

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.winnerSupplierId) {
    where.winnerSupplierId = filters.winnerSupplierId;
  }

  if (dateFilter) {
    where.AND = [dateFilter];
  }

  return prisma.licitation.findMany({
    where,
    orderBy: [{ status: "asc" }, { publicationDate: "desc" }, { openingDate: "desc" }, { number: "asc" }],
    select: {
      id: true,
      number: true,
      object: true,
      modality: true,
      status: true,
      publicationDate: true,
      openingDate: true,
      estimatedValue: true,
      awardedValue: true,
      contractGenerated: true,
      winnerSupplier: {
        select: {
          companyName: true,
        },
      },
    },
  });
}

export async function getProtocolsReport(currentUser: ReportsUser, filters: ProtocolReportFilters) {
  if (!canAccessRoute(currentUser, "/protocolos")) {
    return [];
  }

  return getProtocolsList(currentUser, {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    status: filters.status,
  });
}
