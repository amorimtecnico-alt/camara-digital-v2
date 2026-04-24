"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getSegmentedTabClassName } from "@/components/ui/selection-styles";
import {
  buildAgendaMarkers,
  formatAgendaDateKey,
  getAgendaMarkerBadgeClassName,
  getAgendaMarkerDotClassName,
  parseAgendaDateKey,
  type AgendaMarkerType,
} from "@/modules/agenda/utils";

type AgendaEvent = {
  dateKey: string;
  kind: "manual" | "system";
  markerType: AgendaMarkerType;
  module: "Agenda" | "Contrato" | "Licitação";
  sourceLabel: string;
  title: string;
};

type CompactAgendaProps = {
  events: AgendaEvent[];
};

function formatDayMonth(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function startOfWeek(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function sortAgendaEvents(first: AgendaEvent, second: AgendaEvent) {
  return first.dateKey.localeCompare(second.dateKey) || first.title.localeCompare(second.title);
}

function getKindBadgeClassName(kind: AgendaEvent["kind"]) {
  return kind === "manual"
    ? "border-[#f0d9b1] bg-[#fff8ec] text-[#a16800]"
    : "border-[#d7e1eb] bg-[#f4f8fb] text-[#31546d]";
}

export function CompactAgenda({ events }: CompactAgendaProps) {
  const [mode, setMode] = useState<"monthly" | "weekly">("monthly");
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const todayKey = formatAgendaDateKey(today);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstWeekday = monthStart.getDay();
  const markersByDate = buildAgendaMarkers(events);
  const eventsByDate = events.reduce<Record<string, AgendaEvent[]>>((accumulator, event) => {
    accumulator[event.dateKey] = [...(accumulator[event.dateKey] ?? []), event].sort(sortAgendaEvents);
    return accumulator;
  }, {});
  const todayEvents = eventsByDate[todayKey] ?? [];
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 7);
  const weeklyEvents = events
    .filter((event) => {
      const eventDate = parseAgendaDateKey(event.dateKey);
      return eventDate >= weekStart && eventDate < weekEnd;
    })
    .sort(sortAgendaEvents);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold capitalize text-foreground">{formatMonthTitle(today)}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={getSegmentedTabClassName(mode === "monthly", "px-3 py-1.5 text-xs")}
            onClick={() => setMode("monthly")}
          >
            Mensal
          </button>
          <button
            type="button"
            className={getSegmentedTabClassName(mode === "weekly", "px-3 py-1.5 text-xs")}
            onClick={() => setMode("weekly")}
          >
            Semanal
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="rounded-2xl border border-border bg-background p-4 text-sm text-foreground/70">
          Nenhum compromisso neste mês.
        </p>
      ) : mode === "monthly" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <span key={`empty-${index}`} className="aspect-square" />
            ))}
            {Array.from({ length: monthDays }).map((_, index) => {
              const day = index + 1;
              const date = new Date(today.getFullYear(), today.getMonth(), day);
              const dateKey = formatAgendaDateKey(date);
              const markerSummary = markersByDate[dateKey];
              const markerTypes = (["manual", "contract", "licitation"] as AgendaMarkerType[]).filter(
                (markerType) => markerSummary?.[markerType],
              );
              const isToday = dateKey === todayKey;

              return (
                <Link
                  key={dateKey}
                  href={`/agenda?date=${dateKey}`}
                  className={`relative flex aspect-square items-center justify-center rounded-2xl border text-sm font-semibold transition duration-200 hover:scale-[1.03] ${
                    isToday
                      ? "border-primary bg-primary text-white shadow-sm"
                      : markerSummary
                        ? "border-[#d9e4f0] bg-[#f7fbff] text-foreground hover:border-primary/35"
                        : "border-border bg-background text-foreground hover:border-primary/25 hover:bg-white"
                  }`}
                >
                  <span>{day}</span>
                  {markerTypes.length > 0 ? (
                    <span className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1">
                      {markerTypes.map((markerType) => (
                        <span
                          key={markerType}
                          className={`h-1.5 w-1.5 rounded-full ${getAgendaMarkerDotClassName(markerType)} ${
                            isToday ? "ring-1 ring-white/80" : ""
                          }`}
                        />
                      ))}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/60">
              Hoje - {formatDayMonth(today)}
            </p>
            {todayEvents.length > 0 ? (
              todayEvents.map((event) => (
                <Link
                  key={`${event.kind}-${event.markerType}-${event.dateKey}-${event.title}`}
                  href={`/agenda?date=${event.dateKey}`}
                  className="block rounded-2xl border border-border bg-background p-3 text-sm transition hover:border-primary/35 hover:bg-white"
                >
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getKindBadgeClassName(event.kind)}`}
                    >
                      {event.kind === "manual" ? "Manual" : "Sistema"}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getAgendaMarkerBadgeClassName(event.markerType)}`}
                    >
                      {event.module}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{event.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-foreground/55">{event.sourceLabel}</p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-border bg-background p-3 text-sm text-foreground/70">
                Nenhum compromisso hoje.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {weeklyEvents.length > 0 ? (
            weeklyEvents.map((event) => (
              <Link
                key={`${event.kind}-${event.markerType}-${event.dateKey}-${event.title}`}
                href={`/agenda?date=${event.dateKey}`}
                className="grid gap-2 rounded-2xl border border-border bg-background p-3 text-sm transition hover:border-primary/35 hover:bg-white sm:grid-cols-[72px_1fr]"
              >
                <span className="font-semibold text-primary">{formatDayMonth(parseAgendaDateKey(event.dateKey))}</span>
                <span className="space-y-2">
                  <span className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getKindBadgeClassName(event.kind)}`}
                    >
                      {event.kind === "manual" ? "Manual" : "Sistema"}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getAgendaMarkerBadgeClassName(event.markerType)}`}
                    >
                      {event.module}
                    </span>
                  </span>
                  <span className="block font-semibold text-foreground">{event.title}</span>
                </span>
              </Link>
            ))
          ) : (
            <p className="rounded-2xl border border-border bg-background p-4 text-sm text-foreground/70">
              Nenhum compromisso nesta semana.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

