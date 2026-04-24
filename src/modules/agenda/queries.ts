import "server-only";

import { ContractStatus, PermissionModule, UserRole, type AgendaEvent, type User, type UserModulePermission } from "@prisma/client";

import { canAccessRoute, canEditModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { agendaEventCategoryLabels, agendaEventPriorityLabels } from "@/modules/agenda/schemas";
import {
  addAgendaDays,
  buildAgendaMarkers,
  formatAgendaDateKey,
  getAgendaDayRange,
  getAgendaMonthRange,
  getAgendaWeekRange,
  parseAgendaDateKey,
  type AgendaMarkerSummary,
  type AgendaMarkerType,
} from "@/modules/agenda/utils";

export type AgendaUser = Pick<User, "id" | "role"> & {
  modulePermissions: UserModulePermission[];
};

export type AgendaEventItem = {
  id: string;
  kind: "manual" | "system";
  markerType: AgendaMarkerType;
  title: string;
  description: string | null;
  date: Date;
  dateKey: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  category: string;
  priority: string;
  notes: string | null;
  module: "Agenda" | "Contrato" | "Licitação";
  sourceLabel: string;
  href: string | null;
  editable: boolean;
};

function buildEffectiveEndDateWhere(start: Date, end: Date) {
  return {
    OR: [
      {
        endDateCurrent: {
          gte: start,
          lte: end,
        },
      },
      {
        AND: [
          {
            endDateCurrent: null,
          },
          {
            endDate: {
              gte: start,
              lte: end,
            },
          },
        ],
      },
    ],
  };
}

function toManualAgendaEvent(event: AgendaEvent): AgendaEventItem {
  return {
    id: event.id,
    kind: "manual",
    markerType: "manual",
    title: event.title,
    description: event.description,
    date: event.date,
    dateKey: formatAgendaDateKey(event.date),
    startTime: event.startTime,
    endTime: event.endTime,
    allDay: event.allDay,
    category: agendaEventCategoryLabels[event.category],
    priority: agendaEventPriorityLabels[event.priority],
    notes: event.notes,
    module: "Agenda",
    sourceLabel: "Compromisso manual",
    href: `/agenda/${event.id}/editar`,
    editable: true,
  };
}

async function getManualAgendaEvents(currentUser: AgendaUser, start: Date, end: Date) {
  const events = await prisma.agendaEvent.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      ...(currentUser.role === UserRole.ADMIN ? {} : { createdById: currentUser.id }),
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }, { title: "asc" }],
  });

  return events.map(toManualAgendaEvent);
}

async function getSystemAgendaEvents(currentUser: AgendaUser, start: Date, end: Date) {
  const canSeeContracts = canAccessRoute(currentUser, "/contratos");
  const canSeeLicitations = canAccessRoute(currentUser, "/licitacoes");
  const canEditContracts = canEditModule(currentUser, PermissionModule.contratos);
  const canEditLicitations = canEditModule(currentUser, PermissionModule.licitacoes);

  const [contracts, licitations] = await Promise.all([
    canSeeContracts
      ? prisma.contract.findMany({
          where: {
            status: ContractStatus.ACTIVE,
            AND: [buildEffectiveEndDateWhere(start, end)],
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
            OR: [
              {
                publicationDate: {
                  gte: start,
                  lte: end,
                },
              },
              {
                openingDate: {
                  gte: start,
                  lte: end,
                },
              },
            ],
          },
          orderBy: [{ openingDate: "asc" }, { number: "asc" }],
          select: {
            id: true,
            number: true,
            object: true,
            publicationDate: true,
            openingDate: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return [
    ...contracts.flatMap((contract): AgendaEventItem[] => {
      const date = contract.endDateCurrent ?? contract.endDate;

      return date
        ? [
            {
              id: `contract-${contract.id}`,
              kind: "system",
              markerType: "contract",
              title: `Contrato ${contract.number} vence`,
              description: contract.object,
              date,
              dateKey: formatAgendaDateKey(date),
              startTime: null,
              endTime: null,
              allDay: true,
              category: "Prazo",
              priority: "Alta",
              notes: null,
              module: "Contrato",
              sourceLabel: "Vencimento de contrato",
              href: canEditContracts ? `/contratos/${contract.id}/editar` : "/contratos",
              editable: false,
            },
          ]
        : [];
    }),
    ...licitations.flatMap((licitation): AgendaEventItem[] => {
      const items: AgendaEventItem[] = [];

      if (licitation.publicationDate) {
        items.push({
          id: `licitation-publication-${licitation.id}`,
          kind: "system",
          markerType: "licitation",
          title: `Publicação ${licitation.number}`,
          description: licitation.object,
          date: licitation.publicationDate,
          dateKey: formatAgendaDateKey(licitation.publicationDate),
          startTime: null,
          endTime: null,
          allDay: true,
          category: "Prazo",
          priority: "Normal",
          notes: null,
          module: "Licitação",
          sourceLabel: "Publicação de licitacao",
          href: canEditLicitations ? `/licitacoes/${licitation.id}/editar` : "/licitacoes",
          editable: false,
        });
      }

      if (licitation.openingDate) {
        items.push({
          id: `licitation-${licitation.id}`,
          kind: "system",
          markerType: "licitation",
          title: `Abertura ${licitation.number}`,
          description: licitation.object,
          date: licitation.openingDate,
          dateKey: formatAgendaDateKey(licitation.openingDate),
          startTime: null,
          endTime: null,
          allDay: true,
          category: "Prazo",
          priority: "Normal",
          notes: null,
          module: "Licitação",
          sourceLabel: "Abertura de licitação",
          href: canEditLicitations ? `/licitacoes/${licitation.id}/editar` : "/licitacoes",
          editable: false,
        });
      }

      return items;
    }),
  ];
}

export async function getAgendaEventsForRange(currentUser: AgendaUser, start: Date, end: Date) {
  const [manualEvents, systemEvents] = await Promise.all([
    getManualAgendaEvents(currentUser, start, end),
    getSystemAgendaEvents(currentUser, start, end),
  ]);

  return [...manualEvents, ...systemEvents].sort((first, second) => {
    const dateDifference = first.date.getTime() - second.date.getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return (first.startTime ?? "00:00").localeCompare(second.startTime ?? "00:00") || first.title.localeCompare(second.title);
  });
}

export async function getAgendaEventsForDate(currentUser: AgendaUser, selectedDate: Date) {
  const { end, start } = getAgendaDayRange(selectedDate);
  return getAgendaEventsForRange(currentUser, start, end);
}

export async function getAgendaHomeEvents(currentUser: AgendaUser) {
  const today = new Date();
  const { end, start } = getAgendaMonthRange(today);
  return getAgendaEventsForRange(currentUser, start, end);
}

export async function getAgendaMarkersForMonth(currentUser: AgendaUser, selectedDate: Date): Promise<Record<string, AgendaMarkerSummary>> {
  const { end, start } = getAgendaMonthRange(selectedDate);
  const events = await getAgendaEventsForRange(currentUser, start, end);
  return buildAgendaMarkers(events);
}

export async function getManualAgendaEventById(currentUser: AgendaUser, id: string) {
  const event = await prisma.agendaEvent.findFirst({
    where: {
      id,
      ...(currentUser.role === UserRole.ADMIN ? {} : { createdById: currentUser.id }),
    },
  });

  return event;
}

export { addAgendaDays, formatAgendaDateKey, getAgendaDayRange, getAgendaMonthRange, getAgendaWeekRange, parseAgendaDateKey };

