export type AgendaMarkerType = "manual" | "contract" | "licitation";

export type AgendaMarkerSummary = {
  manual: boolean;
  contract: boolean;
  licitation: boolean;
  total: number;
};

const agendaMarkerMeta: Record<AgendaMarkerType, { badgeClassName: string; dotClassName: string; label: string }> = {
  manual: {
    badgeClassName: "border-[#f0d9b1] bg-[#fff8ec] text-[#a16800]",
    dotClassName: "bg-[#c98700]",
    label: "Manual",
  },
  contract: {
    badgeClassName: "border-[#c8ddd7] bg-[#eff8f4] text-[#17695a]",
    dotClassName: "bg-[#1b7b67]",
    label: "Contrato",
  },
  licitation: {
    badgeClassName: "border-[#d7def7] bg-[#f4f6ff] text-[#3254b5]",
    dotClassName: "bg-[#4163c9]",
    label: "Licitação",
  },
};

type AgendaMarkerInput = {
  dateKey: string;
  markerType: AgendaMarkerType;
};

export function formatAgendaDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseAgendaDateKey(value: string | null | undefined): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (Number.isNaN(date.getTime())) {
    return parseAgendaDateKey(null);
  }

  return date;
}

export function addAgendaDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function getAgendaDayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { end, start };
}

export function getAgendaMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  return { end, start };
}

export function getAgendaWeekRange(date: Date) {
  const start = new Date(date);
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { end, start };
}

export function buildAgendaMarkers(events: AgendaMarkerInput[]) {
  return events.reduce<Record<string, AgendaMarkerSummary>>((accumulator, event) => {
    const current = accumulator[event.dateKey] ?? {
      contract: false,
      licitation: false,
      manual: false,
      total: 0,
    };

    current[event.markerType] = true;
    current.total += 1;
    accumulator[event.dateKey] = current;

    return accumulator;
  }, {});
}

export function getAgendaMarkerBadgeClassName(markerType: AgendaMarkerType) {
  return agendaMarkerMeta[markerType].badgeClassName;
}

export function getAgendaMarkerDotClassName(markerType: AgendaMarkerType) {
  return agendaMarkerMeta[markerType].dotClassName;
}

export function getAgendaMarkerLabel(markerType: AgendaMarkerType) {
  return agendaMarkerMeta[markerType].label;
}

