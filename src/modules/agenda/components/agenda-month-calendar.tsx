"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, WheelEvent } from "react";

import { Select } from "@/components/ui/select";
import { buildPathWithParams } from "@/lib/list-navigation";
import { cn } from "@/lib/utils";
import {
  formatAgendaDateKey,
  getAgendaMarkerBadgeClassName,
  getAgendaMarkerDotClassName,
  getAgendaMarkerLabel,
  parseAgendaDateKey,
  type AgendaMarkerSummary,
  type AgendaMarkerType,
} from "@/modules/agenda/utils";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

const monthOptions = Array.from({ length: 12 }, (_, monthIndex) => ({
  label: monthFormatter.format(new Date(2026, monthIndex, 1)),
  value: monthIndex,
}));

type AgendaMonthCalendarProps = {
  filter?: "all" | "manual" | "system";
  initialDateKey: string;
  initialMarkersByDate: Record<string, AgendaMarkerSummary>;
  showLegend?: boolean;
  todayDateKey: string;
};

function getMonthCacheKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function buildDatePreservingDay(source: Date, year: number, month: number) {
  const preferredDay = source.getDate();
  const maxDay = getDaysInMonth(year, month);
  const safeDay = preferredDay <= maxDay ? preferredDay : 1;
  return new Date(year, month, safeDay);
}

function shiftMonth(source: Date, direction: -1 | 1) {
  const nextMonthDate = new Date(source.getFullYear(), source.getMonth() + direction, 1);
  return buildDatePreservingDay(source, nextMonthDate.getFullYear(), nextMonthDate.getMonth());
}

function getDayMarkerTypes(summary: AgendaMarkerSummary | undefined): AgendaMarkerType[] {
  if (!summary) {
    return [];
  }

  return ["manual", "contract", "licitation"].filter((markerType) => summary[markerType as AgendaMarkerType]) as AgendaMarkerType[];
}

function getAgendaHref(pathname: string, dateKey: string, filter: AgendaMonthCalendarProps["filter"]) {
  return buildPathWithParams(pathname, {
    date: dateKey,
    filter: filter && filter !== "all" ? filter : undefined,
  });
}

export function AgendaMonthCalendar({
  filter = "all",
  initialDateKey,
  initialMarkersByDate,
  showLegend = false,
  todayDateKey,
}: AgendaMonthCalendarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const today = useMemo(() => parseAgendaDateKey(todayDateKey), [todayDateKey]);
  const initialDate = useMemo(() => parseAgendaDateKey(initialDateKey), [initialDateKey]);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [markersByDate, setMarkersByDate] = useState(initialMarkersByDate);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const cacheRef = useRef(new Map<string, Record<string, AgendaMarkerSummary>>([[getMonthCacheKey(initialDate), initialMarkersByDate]]));
  const wheelLockRef = useRef(0);
  const currentYear = today.getFullYear();
  const yearOptions = useMemo(() => Array.from({ length: 21 }, (_, index) => currentYear - 10 + index), [currentYear]);
  const selectedDateKey = formatAgendaDateKey(currentDate);
  const currentMonthKey = getMonthCacheKey(currentDate);
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstWeekday = monthStart.getDay();

  useEffect(() => {
    const cached = cacheRef.current.get(currentMonthKey);

    if (cached) {
      setMarkersByDate(cached);
      return;
    }

    const controller = new AbortController();
    setIsLoadingMarkers(true);

    fetch(`/api/agenda/month?date=${selectedDateKey}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar os marcadores do mês.");
        }

        return (await response.json()) as { markersByDate: Record<string, AgendaMarkerSummary> };
      })
      .then((payload) => {
        cacheRef.current.set(currentMonthKey, payload.markersByDate);
        setMarkersByDate(payload.markersByDate);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setMarkersByDate({});
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingMarkers(false);
        }
      });

    return () => controller.abort();
  }, [currentMonthKey, selectedDateKey]);

  function commitDate(nextDate: Date) {
    const normalizedDate = new Date(nextDate);
    normalizedDate.setHours(0, 0, 0, 0);
    setCurrentDate(normalizedDate);

    startTransition(() => {
      router.replace(getAgendaHref(pathname, formatAgendaDateKey(normalizedDate), filter), { scroll: false });
    });
  }

  function goToMonth(direction: -1 | 1) {
    commitDate(shiftMonth(currentDate, direction));
  }

  function goToToday() {
    commitDate(today);
  }

  function handleMonthChange(nextMonth: number) {
    commitDate(buildDatePreservingDay(currentDate, currentDate.getFullYear(), nextMonth));
  }

  function handleYearChange(nextYear: number) {
    commitDate(buildDatePreservingDay(currentDate, nextYear, currentDate.getMonth()));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaY) < 5) {
      return;
    }

    const now = Date.now();
    if (now - wheelLockRef.current < 240) {
      event.preventDefault();
      return;
    }

    wheelLockRef.current = now;
    event.preventDefault();
    goToMonth(event.deltaY > 0 ? 1 : -1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToMonth(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToMonth(1);
    }
  }

  return (
    <div
      className="space-y-4 rounded-[24px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      tabIndex={0}
    >
      <div className="flex flex-wrap items-center gap-1.5 rounded-[18px] border border-border bg-background/80 p-1.5 shadow-sm">
        <button
          type="button"
          aria-label="Mês anterior"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition hover:border-primary/35 hover:bg-white"
          onClick={() => goToMonth(-1)}
        >
          <span aria-hidden>{"<"}</span>
        </button>

        <Select
          aria-label="Selecionar mes"
          className="min-w-[8.5rem] rounded-xl border-border bg-surface px-3 py-2 capitalize"
          value={currentDate.getMonth()}
          onChange={(event) => handleMonthChange(Number(event.currentTarget.value))}
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Selecionar ano"
          className="min-w-[6.25rem] rounded-xl border-border bg-surface px-3 py-2"
          value={currentDate.getFullYear()}
          onChange={(event) => handleYearChange(Number(event.currentTarget.value))}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>

        <button
          type="button"
          aria-label="Próximo mês"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition hover:border-primary/35 hover:bg-white"
          onClick={() => goToMonth(1)}
        >
          <span aria-hidden>{">"}</span>
        </button>

        <button
          type="button"
          className="ml-auto inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          onClick={goToToday}
        >
          Hoje
        </button>
      </div>

      <div
        className={cn(
          "space-y-4 transition duration-200",
          isLoadingMarkers ? "translate-y-0.5 opacity-75" : "translate-y-0 opacity-100",
        )}
      >
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
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateKey = formatAgendaDateKey(date);
            const markerSummary = markersByDate[dateKey];
            const markerTypes = getDayMarkerTypes(markerSummary);
            const isSelected = selectedDateKey === dateKey;
            const isToday = todayDateKey === dateKey;

            return (
              <Link
                key={dateKey}
                href={getAgendaHref(pathname, dateKey, filter)}
                title={markerSummary ? `${markerSummary.total} evento(s) em ${dateKey}` : dateKey}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-2xl border text-sm font-semibold transition duration-200 hover:scale-[1.03]",
                  isSelected
                    ? "border-primary bg-primary text-white shadow-sm"
                    : markerSummary
                      ? "border-[#d9e4f0] bg-[#f7fbff] text-foreground hover:border-primary/35"
                      : "border-border bg-background text-foreground hover:border-primary/25 hover:bg-white",
                  isToday && !isSelected ? "ring-2 ring-primary/25" : undefined,
                )}
              >
                <span>{day}</span>

                {markerTypes.length > 0 ? (
                  <span className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1">
                    {markerTypes.map((markerType) => (
                      <span
                        key={markerType}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          getAgendaMarkerDotClassName(markerType),
                          isSelected ? "ring-1 ring-white/80" : undefined,
                        )}
                      />
                    ))}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      {showLegend ? (
        <div className="flex flex-wrap gap-2">
          {(["manual", "contract", "licitation"] as AgendaMarkerType[]).map((markerType) => (
            <span
              key={markerType}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                getAgendaMarkerBadgeClassName(markerType),
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", getAgendaMarkerDotClassName(markerType))} />
              {getAgendaMarkerLabel(markerType)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

