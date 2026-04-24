import {
  ContractStatus,
  LicitationStatus,
  NotificationType,
  PermissionModule,
  ProtocolStatus,
  type User,
  type UserModulePermission,
} from "@prisma/client";

import { canReadAllProtocols, hasModulePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type NotificationUser = Pick<User, "avatarPath" | "id" | "role"> & {
  modulePermissions: UserModulePermission[];
};

type GeneratedNotification = {
  href: string;
  message: string;
  sourceKey: string;
  title: string;
  type: NotificationType;
};

const GENERATED_SOURCE_PREFIXES = ["contract:", "licitation:", "protocol:", "account:"];

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getEffectiveEndDate(contract: { endDate: Date | null; endDateCurrent: Date | null }) {
  return contract.endDateCurrent ?? contract.endDate;
}

function getDaysUntil(date: Date, baseDate: Date) {
  const dayInMs = 1000 * 60 * 60 * 24;
  return Math.ceil((date.getTime() - baseDate.getTime()) / dayInMs);
}

async function getContractNotifications(user: NotificationUser): Promise<GeneratedNotification[]> {
  if (!hasModulePermission(user, PermissionModule.contratos, "view")) {
    return [];
  }

  const today = startOfToday();
  const warningLimit = addDays(today, 31);
  const contracts = await prisma.contract.findMany({
    where: {
      status: ContractStatus.ACTIVE,
      OR: [
        {
          endDateCurrent: {
            lt: warningLimit,
          },
        },
        {
          AND: [
            {
              endDateCurrent: null,
            },
            {
              endDate: {
                lt: warningLimit,
              },
            },
          ],
        },
      ],
    },
    orderBy: [{ endDateCurrent: "asc" }, { endDate: "asc" }, { number: "asc" }],
    take: 8,
    select: {
      id: true,
      number: true,
      endDate: true,
      endDateCurrent: true,
    },
  });

  return contracts.flatMap((contract) => {
    const endDate = getEffectiveEndDate(contract);

    if (!endDate) {
      return [];
    }

    const daysUntil = getDaysUntil(endDate, today);
    const expired = daysUntil < 0;

    return {
      href: `/contratos/${contract.id}/editar`,
      message: expired
        ? `Venceu em ${formatDate(endDate)}.`
        : `Vence em ${daysUntil === 0 ? "hoje" : `${daysUntil} dia(s)`}, em ${formatDate(endDate)}.`,
      sourceKey: `contract:${contract.id}:${expired ? "expired" : "near-expiration"}`,
      title: expired ? `Contrato ${contract.number} vencido` : `Contrato ${contract.number} perto do vencimento`,
      type: expired ? NotificationType.URGENT : NotificationType.WARNING,
    };
  });
}

async function getLicitationNotifications(user: NotificationUser): Promise<GeneratedNotification[]> {
  if (!hasModulePermission(user, PermissionModule.licitacoes, "view")) {
    return [];
  }

  const today = startOfToday();
  const licitations = await prisma.licitation.findMany({
    where: {
      status: {
        in: [LicitationStatus.PUBLICADO, LicitationStatus.EM_ANDAMENTO, LicitationStatus.HOMOLOGADO],
      },
      OR: [
        {
          editalFilePath: null,
        },
        {
          AND: [
            { status: LicitationStatus.HOMOLOGADO },
            {
              OR: [{ winnerSupplierId: null }, { contractGenerated: false }],
            },
          ],
        },
        {
          AND: [
            { status: { in: [LicitationStatus.PUBLICADO, LicitationStatus.EM_ANDAMENTO] } },
            {
              openingDate: {
                lt: today,
              },
            },
          ],
        },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { number: "asc" }],
    take: 8,
    select: {
      id: true,
      number: true,
      status: true,
      editalFilePath: true,
      winnerSupplierId: true,
      contractGenerated: true,
      openingDate: true,
    },
  });

  return licitations.flatMap((licitation) => {
    if (!licitation.editalFilePath) {
      return {
        href: `/licitacoes/${licitation.id}/editar`,
        message: "Licitação publicada ou em andamento sem edital anexado.",
        sourceKey: `licitation:${licitation.id}:missing-edital`,
        title: `Licitação ${licitation.number} sem edital`,
        type: NotificationType.WARNING,
      };
    }

    if (licitation.status === LicitationStatus.HOMOLOGADO && !licitation.winnerSupplierId) {
      return {
        href: `/licitacoes/${licitation.id}/editar`,
        message: "Licitação homologada sem fornecedor vencedor.",
        sourceKey: `licitation:${licitation.id}:missing-winner`,
        title: `Licitação ${licitation.number} pendente`,
        type: NotificationType.WARNING,
      };
    }

    if (licitation.status === LicitationStatus.HOMOLOGADO && !licitation.contractGenerated) {
      return {
        href: `/licitacoes/${licitation.id}/editar`,
        message: "Licitação homologada ainda sem contrato gerado.",
        sourceKey: `licitation:${licitation.id}:contract-not-generated`,
        title: `Contrato pendente da licitação ${licitation.number}`,
        type: NotificationType.INFO,
      };
    }

    if (licitation.openingDate && licitation.openingDate < today) {
      return {
        href: `/licitacoes/${licitation.id}/editar`,
        message: `A abertura era em ${formatDate(licitation.openingDate)} e o processo ainda está ${licitation.status}.`,
        sourceKey: `licitation:${licitation.id}:opening-past`,
        title: `Licitação ${licitation.number} precisa de atualização`,
        type: NotificationType.WARNING,
      };
    }

    return [];
  });
}

async function getProtocolNotifications(user: NotificationUser): Promise<GeneratedNotification[]> {
  if (!hasModulePermission(user, PermissionModule.protocolos, "view")) {
    return [];
  }

  const canReadAll = canReadAllProtocols(user);
  const protocols = await prisma.protocol.findMany({
    where: {
      status: {
        in: [ProtocolStatus.OPEN, ProtocolStatus.IN_PROGRESS],
      },
      ...(canReadAll ? {} : { createdById: user.id }),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 8,
    select: {
      id: true,
      code: true,
      createdById: true,
      status: true,
      subject: true,
    },
  });

  return protocols.map((protocol) => ({
    href: `/protocolos/${protocol.id}/editar`,
    message:
      protocol.createdById === user.id
        ? `Seu protocolo está ${protocol.status === ProtocolStatus.OPEN ? "aberto" : "em andamento"}.`
        : `Protocolo acessível está ${protocol.status === ProtocolStatus.OPEN ? "aberto" : "em andamento"}.`,
    sourceKey: `protocol:${protocol.id}:open-work`,
    title: `Protocolo ${protocol.code}: ${protocol.subject}`,
    type: protocol.status === ProtocolStatus.OPEN ? NotificationType.INFO : NotificationType.WARNING,
  }));
}

function getAccountNotifications(user: NotificationUser): GeneratedNotification[] {
  if (user.avatarPath) {
    return [];
  }

  return [
    {
      href: "/meu-perfil",
      message: "Adicione uma imagem para identificar melhor sua conta no painel.",
      sourceKey: "account:missing-avatar",
      title: "Complete seu perfil",
      type: NotificationType.INFO,
    },
  ];
}

async function syncGeneratedNotifications(user: NotificationUser) {
  const generatedNotifications = [
    ...(await getContractNotifications(user)),
    ...(await getLicitationNotifications(user)),
    ...(await getProtocolNotifications(user)),
    ...getAccountNotifications(user),
  ];
  const currentSourceKeys = generatedNotifications.map((notification) => notification.sourceKey);

  await prisma.$transaction([
    ...generatedNotifications.map((notification) =>
      prisma.notification.upsert({
        where: {
          userId_sourceKey: {
            userId: user.id,
            sourceKey: notification.sourceKey,
          },
        },
        create: {
          userId: user.id,
          ...notification,
        },
        update: {
          href: notification.href,
          message: notification.message,
          title: notification.title,
          type: notification.type,
        },
      }),
    ),
    prisma.notification.deleteMany({
      where: {
        userId: user.id,
        sourceKey: {
          notIn: currentSourceKeys.length > 0 ? currentSourceKeys : ["__none__"],
        },
        OR: GENERATED_SOURCE_PREFIXES.map((prefix) => ({
          sourceKey: {
            startsWith: prefix,
          },
        })),
      },
    }),
  ]);
}

export async function getTopbarNotifications(user: NotificationUser) {
  await syncGeneratedNotifications(user);

  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    }),
    prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        message: true,
        href: true,
        type: true,
        isRead: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}
