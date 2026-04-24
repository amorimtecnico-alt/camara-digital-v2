import { ContractStatus, LicitationStatus, ProtocolStatus, type Prisma, type User, type UserModulePermission } from "@prisma/client";

import { canAccessRoute, canReadAllProtocols } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type DashboardUser = Pick<User, "id" | "role"> & {
  modulePermissions: UserModulePermission[];
};

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysDifference(targetDate: Date) {
  const today = startOfToday();
  const normalizedTargetDate = new Date(targetDate);
  normalizedTargetDate.setHours(0, 0, 0, 0);

  return Math.ceil((normalizedTargetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function buildEffectiveEndDateWhere(filter: Prisma.DateTimeFilter): Prisma.ContractWhereInput {
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

function getProtocolVisibilityWhere(currentUser: DashboardUser): Prisma.ProtocolWhereInput {
  if (canReadAllProtocols(currentUser)) {
    return {};
  }

  return {
    createdById: currentUser.id,
  };
}

export async function getContractOperationalAlerts(currentUser: DashboardUser) {
  if (!canAccessRoute(currentUser, "/contratos")) {
    return null;
  }

  const today = startOfToday();
  const day60 = addDays(today, 60);

  const contracts = await prisma.contract.findMany({
    where: {
      status: ContractStatus.ACTIVE,
      AND: [buildEffectiveEndDateWhere({ gte: today, lte: day60 })],
    },
    select: {
      id: true,
      number: true,
      object: true,
      endDate: true,
      endDateCurrent: true,
    },
  });

  const normalizedContracts = contracts
    .map((contract) => {
      const effectiveEndDate = contract.endDateCurrent ?? contract.endDate;

      return effectiveEndDate
        ? {
            id: contract.id,
            number: contract.number,
            object: contract.object,
            daysRemaining: getDaysDifference(effectiveEndDate),
          }
        : null;
    })
    .filter((contract): contract is NonNullable<typeof contract> => contract !== null)
    .sort((first, second) => first.daysRemaining - second.daysRemaining);

  return {
    expiring: normalizedContracts
      .filter((contract) => contract.daysRemaining >= 0 && contract.daysRemaining <= 60)
      .slice(0, 5),
  };
}

function getLicitationIssues(licitation: {
  contractGenerated: boolean;
  editalFilePath: string | null;
  homologationFilePath: string | null;
  status: LicitationStatus;
  winnerSupplierId: string | null;
}) {
  const issues = [];

  if (!licitation.editalFilePath) {
    issues.push("sem edital");
  }

  if (!licitation.winnerSupplierId) {
    issues.push("sem fornecedor vencedor");
  }

  if (licitation.status === LicitationStatus.HOMOLOGADO && !licitation.contractGenerated) {
    issues.push("homologada sem contrato");
  }

  if (
    (licitation.status === LicitationStatus.HOMOLOGADO || licitation.status === LicitationStatus.CONTRATADO) &&
    !licitation.homologationFilePath
  ) {
    issues.push("sem termo de homologacao");
  }

  return issues;
}

export async function getLicitationPendingItems(currentUser: DashboardUser) {
  if (!canAccessRoute(currentUser, "/licitacoes")) {
    return null;
  }

  const licitations = await prisma.licitation.findMany({
    where: {
      OR: [
        {
          editalFilePath: null,
        },
        {
          winnerSupplierId: null,
        },
        {
          status: LicitationStatus.HOMOLOGADO,
          contractGenerated: false,
        },
        {
          status: {
            in: [LicitationStatus.HOMOLOGADO, LicitationStatus.CONTRATADO],
          },
          homologationFilePath: null,
        },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { number: "asc" }],
    take: 20,
    select: {
      id: true,
      number: true,
      object: true,
      status: true,
      contractGenerated: true,
      editalFilePath: true,
      homologationFilePath: true,
      winnerSupplierId: true,
    },
  });

  return licitations
    .map((licitation) => ({
      id: licitation.id,
      number: licitation.number,
      object: licitation.object,
      issues: getLicitationIssues(licitation),
    }))
    .filter((licitation) => licitation.issues.length > 0);
}

export async function getProtocolOperationalItems(currentUser: DashboardUser) {
  if (!canAccessRoute(currentUser, "/protocolos")) {
    return [];
  }

  const protocolWhere = getProtocolVisibilityWhere(currentUser);

  return prisma.protocol.findMany({
    where: {
      ...protocolWhere,
      status: {
        in: [ProtocolStatus.OPEN, ProtocolStatus.IN_PROGRESS],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
    select: {
      id: true,
      code: true,
      subject: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function getAgendaItems(currentUser: DashboardUser) {
  const today = startOfToday();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  const canSeeContracts = canAccessRoute(currentUser, "/contratos");
  const canSeeLicitations = canAccessRoute(currentUser, "/licitacoes");

  const [contractCandidates, licitationOpenings] = await Promise.all([
    canSeeContracts
      ? prisma.contract.findMany({
          where: {
            status: ContractStatus.ACTIVE,
            AND: [buildEffectiveEndDateWhere({ gte: monthStart, lte: monthEnd })],
          },
          orderBy: [{ endDateCurrent: "asc" }, { endDate: "asc" }, { number: "asc" }],
          select: {
            id: true,
            number: true,
            object: true,
            endDate: true,
            endDateCurrent: true,
          },
        })
      : Promise.resolve([]),
    canSeeLicitations
      ? prisma.licitation.findMany({
          where: {
            openingDate: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          orderBy: {
            openingDate: "asc",
          },
          select: {
            id: true,
            number: true,
            object: true,
            openingDate: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const contractDeadlines = contractCandidates
    .map((contract) => {
      const effectiveEndDate = contract.endDateCurrent ?? contract.endDate;

      return effectiveEndDate
        ? {
            id: contract.id,
            number: contract.number,
            object: contract.object,
            date: effectiveEndDate,
            daysRemaining: getDaysDifference(effectiveEndDate),
          }
        : null;
    })
    .filter((contract): contract is NonNullable<typeof contract> => contract !== null)
    .sort((first, second) => first.daysRemaining - second.daysRemaining)
    .slice(0, 20);

  return {
    contractDeadlines,
    licitationOpenings,
  };
}

export async function getRecentActivity(currentUser: DashboardUser) {
  const canSeeProtocols = canAccessRoute(currentUser, "/protocolos");
  const canSeeSuppliers = canAccessRoute(currentUser, "/fornecedores");
  const canSeeContracts = canAccessRoute(currentUser, "/contratos");
  const canSeeLicitations = canAccessRoute(currentUser, "/licitacoes");
  const protocolWhere = getProtocolVisibilityWhere(currentUser);

  const [protocols, contracts, licitations, suppliers] = await Promise.all([
    canSeeProtocols
      ? prisma.protocol.findMany({
          where: protocolWhere,
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: {
            id: true,
            code: true,
            subject: true,
            status: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    canSeeContracts
      ? prisma.contract.findMany({
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: {
            id: true,
            number: true,
            object: true,
            status: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    canSeeLicitations
      ? prisma.licitation.findMany({
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: {
            id: true,
            number: true,
            object: true,
            status: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    canSeeSuppliers
      ? prisma.supplier.findMany({
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: {
            id: true,
            companyName: true,
            document: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return [
    ...protocols.map((protocol) => ({
      date: protocol.createdAt,
      href: `/protocolos/${protocol.id}/editar`,
      identifier: protocol.code,
      module: "Protocolo",
      summary: protocol.subject,
    })),
    ...contracts.map((contract) => ({
      date: contract.createdAt,
      href: `/contratos/${contract.id}/editar`,
      identifier: contract.number,
      module: "Contrato",
      summary: contract.object,
    })),
    ...licitations.map((licitation) => ({
      date: licitation.createdAt,
      href: `/licitacoes/${licitation.id}/editar`,
      identifier: licitation.number,
      module: "Licitacao",
      summary: licitation.object,
    })),
    ...suppliers.map((supplier) => ({
      date: supplier.createdAt,
      href: `/fornecedores/${supplier.id}/editar`,
      identifier: supplier.companyName,
      module: "Fornecedor",
      summary: supplier.document,
    })),
  ]
    .sort((first, second) => second.date.getTime() - first.date.getTime())
    .slice(0, 6);
}
