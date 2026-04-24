import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { getSegmentedTabClassName } from "@/components/ui/selection-styles";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { buildPathWithParams, getSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireRouteAccess } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { deleteAgendaEventAction } from "@/modules/agenda/actions";
import { AgendaMonthCalendar } from "@/modules/agenda/components/agenda-month-calendar";
import {
  addAgendaDays,
  formatAgendaDateKey,
  getAgendaEventsForDate,
  getAgendaEventsForRange,
  getAgendaMarkersForMonth,
  getAgendaMonthRange,
  getAgendaWeekRange,
  parseAgendaDateKey,
  type AgendaEventItem,
} from "@/modules/agenda/queries";
import { getAgendaMarkerBadgeClassName, type AgendaMarkerType } from "@/modules/agenda/utils";

export const dynamic = "force-dynamic";

type AgendaPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

type AgendaViewMode = "day" | "week" | "month";

function formatDateTitle(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(date);
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function formatWeekdayLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }).format(date);
}

function formatMonthDayLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", weekday: "short" }).format(date);
}

function formatTime(event: AgendaEventItem) {
  if (event.allDay) {
    return "Dia inteiro";
  }

  if (event.startTime && event.endTime) {
    return `${event.startTime} - ${event.endTime}`;
  }

  return event.startTime ?? "Sem horário definido";
}

function parseAgendaView(value: string | undefined): AgendaViewMode {
  if (value === "week" || value === "month") {
    return value;
  }

  return "day";
}

function getKindBadgeClassName(kind: AgendaEventItem["kind"]) {
  return kind === "manual"
    ? "border-[#f0d9b1] bg-[#fff8ec] text-[#a16800]"
    : "border-[#d7e1eb] bg-[#f4f8fb] text-[#31546d]";
}

function getCardClassName(event: AgendaEventItem) {
  if (event.kind === "manual") {
    if (event.priority === "Urgente") {
      return "border-[#efcccc] bg-[#fff4f4]";
    }

    if (event.priority === "Alta") {
      return "border-[#f0d9b1] bg-[#fffaf0]";
    }

    return "border-[#e8e1d3] bg-[#fffdf8]";
  }

  if (event.markerType === "contract") {
    return "border-[#d7e5df] bg-[#f5fbf8]";
  }

  return "border-[#dbe4f5] bg-[#f7f9fe]";
}

function getAgendaHref(dateKey: string, view: AgendaViewMode) {
  return buildPathWithParams("/agenda", {
    date: dateKey,
    view: view === "day" ? undefined : view,
  });
}

function getKindLabel(kind: AgendaEventItem["kind"]) {
  return kind === "manual" ? "Manual" : "Sistema";
}

function renderMetaBadge(label: string, className: string) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", className)}>
      {label}
    </span>
  );
}

function groupEventsByDate(events: AgendaEventItem[]) {
  return events.reduce<Record<string, AgendaEventItem[]>>((accumulator, event) => {
    accumulator[event.dateKey] = [...(accumulator[event.dateKey] ?? []), event];
    return accumulator;
  }, {});
}

function EventCard({
  event,
  returnTo,
  compact = false,
}: {
  event: AgendaEventItem;
  returnTo: string;
  compact?: boolean;
}) {
  const content = (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between", compact ? "gap-3" : undefined)}>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          {renderMetaBadge(getKindLabel(event.kind), getKindBadgeClassName(event.kind))}
          {renderMetaBadge(event.module, getAgendaMarkerBadgeClassName(event.markerType))}
          {event.kind === "manual"
            ? renderMetaBadge(event.category, "border-[#e4dccf] bg-white/80 text-[#725f3d]")
            : renderMetaBadge(event.sourceLabel, "border-[#dfe6ee] bg-white/80 text-[#55697d]")}
          {event.kind === "manual" ? renderMetaBadge(event.priority, "border-[#e4dccf] bg-white/80 text-[#725f3d]") : null}
        </div>

        <div className="space-y-1.5">
          <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{event.title}</p>
          {event.description ? <p className={cn("text-foreground/70", compact ? "text-sm leading-5" : "text-sm leading-6")}>{event.description}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {renderMetaBadge(formatTime(event), "border-border bg-white/80 text-foreground/75")}
          {event.kind === "system" ? renderMetaBadge("Abrir registro relacionado", "border-border bg-white/80 text-foreground/75") : null}
        </div>

        {event.notes && !compact ? (
          <div className="rounded-2xl border border-black/5 bg-white/60 px-3 py-2 text-sm text-foreground/70">
            {event.notes}
          </div>
        ) : null}
      </div>

      {event.kind === "manual" ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {event.href ? (
            <ButtonLink href={`${event.href}?returnTo=${encodeURIComponent(returnTo)}`} variant="secondary">
              Editar
            </ButtonLink>
          ) : null}
          <form action={deleteAgendaEventAction}>
            <input type="hidden" name="id" value={event.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Button variant="danger">Remover</Button>
          </form>
        </div>
      ) : null}
    </div>
  );

  if (event.kind === "system" && event.href) {
    return (
      <Link
        href={event.href}
        className={cn(
          "block rounded-[24px] border transition duration-200 hover:-translate-y-0.5 hover:shadow-sm",
          compact ? "p-4" : "p-5",
          getCardClassName(event),
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn("rounded-[24px] border", compact ? "p-4" : "p-5", getCardClassName(event))}>{content}</div>;
}

function EmptyState({
  createHref,
  message,
}: {
  createHref: string;
  message: string;
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-border bg-background px-6 py-10 text-center">
      <p className="text-base font-semibold text-foreground">{message}</p>
      <p className="mt-2 text-sm text-foreground/65">Crie um compromisso manual ou navegue pelo calendário ao lado.</p>
      <div className="mt-5 flex justify-center">
        <ButtonLink href={createHref}>Novo compromisso</ButtonLink>
      </div>
    </div>
  );
}

function WeekView({
  events,
  returnTo,
}: {
  events: AgendaEventItem[];
  returnTo: string;
}) {
  const eventsByDate = groupEventsByDate(events);
  const orderedDates = Object.keys(eventsByDate).sort();

  return (
    <div className="space-y-4">
      {orderedDates.map((dateKey) => {
        const dayEvents = eventsByDate[dateKey] ?? [];
        const date = parseAgendaDateKey(dateKey);

        return (
          <div key={dateKey} className="rounded-[24px] border border-border bg-background/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold capitalize text-foreground">{formatWeekdayLabel(date)}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-foreground/55">{dayEvents.length} compromisso(s)</p>
              </div>
              <ButtonLink href={getAgendaHref(dateKey, "day")} variant="secondary">
                Abrir dia
              </ButtonLink>
            </div>
            <div className="space-y-3">
              {dayEvents.map((event) => (
                <EventCard key={`${event.kind}-${event.id}`} event={event} returnTo={returnTo} compact />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlySummaryView({
  events,
}: {
  events: AgendaEventItem[];
}) {
  const eventsByDate = groupEventsByDate(events);
  const orderedDates = Object.keys(eventsByDate).sort();

  return (
    <div className="space-y-3">
      {orderedDates.map((dateKey) => {
        const dayEvents = eventsByDate[dateKey] ?? [];
        const date = parseAgendaDateKey(dateKey);

        return (
          <Link
            key={dateKey}
            href={getAgendaHref(dateKey, "day")}
            className="block rounded-[22px] border border-border bg-background/80 p-4 transition hover:border-primary/30 hover:bg-white"
          >
            <div className="grid gap-3 md:grid-cols-[140px_1fr]">
              <div>
                <p className="text-sm font-semibold capitalize text-foreground">{formatMonthDayLabel(date)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-foreground/55">{dayEvents.length} item(ns)</p>
              </div>
              <div className="space-y-2">
                {dayEvents.slice(0, 3).map((event) => (
                  <div key={`${event.kind}-${event.id}`} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 font-medium text-foreground">{event.title}</span>
                    <span className="shrink-0 text-xs uppercase tracking-[0.14em] text-foreground/55">{formatTime(event)}</span>
                  </div>
                ))}
                {dayEvents.length > 3 ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    +{dayEvents.length - 3} compromisso(s)
                  </p>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function getMarkerTypesLabel(markerType: AgendaMarkerType) {
  if (markerType === "contract") {
    return "Contrato";
  }

  if (markerType === "licitation") {
    return "Licitação";
  }

  return "Manual";
}

function getViewMeta(view: AgendaViewMode, selectedDate: Date) {
  if (view === "week") {
    const { end, start } = getAgendaWeekRange(selectedDate);
    return {
      description: `Semana de ${formatShortDate(start)} a ${formatShortDate(end)}.`,
      emptyMessage: "Nenhum compromisso para esta semana.",
      title: "Agenda semanal",
    };
  }

  if (view === "month") {
    return {
      description: `Resumo de ${formatMonthTitle(selectedDate)} com compromissos manuais e automáticos.`,
      emptyMessage: "Nenhum compromisso para este mês.",
      title: "Agenda mensal",
    };
  }

  return {
    description: "Compromissos manuais e prazos do sistema conforme as permissões do seu perfil.",
    emptyMessage: "Nenhum compromisso para este dia.",
    title: "Agenda diária",
  };
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const currentUser = await requireRouteAccess("/agenda");
  const params = await searchParams;
  const selectedDate = parseAgendaDateKey(getSearchParam(params, "date"));
  const selectedDateKey = formatAgendaDateKey(selectedDate);
  const view = parseAgendaView(getSearchParam(params, "view"));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDateKey = formatAgendaDateKey(today);
  const previousDateKey = formatAgendaDateKey(addAgendaDays(selectedDate, -1));
  const nextDateKey = formatAgendaDateKey(addAgendaDays(selectedDate, 1));
  const viewRange = view === "week" ? getAgendaWeekRange(selectedDate) : view === "month" ? getAgendaMonthRange(selectedDate) : null;
  const [events, monthMarkers] = await Promise.all([
    view === "day"
      ? getAgendaEventsForDate(currentUser, selectedDate)
      : getAgendaEventsForRange(currentUser, viewRange!.start, viewRange!.end),
    getAgendaMarkersForMonth(currentUser, selectedDate),
  ]);
  const viewMeta = getViewMeta(view, selectedDate);
  const returnTo = getAgendaHref(selectedDateKey, view);
  const createHref = buildPathWithParams("/agenda/novo", { date: selectedDateKey, returnTo });
  const previousHref = getAgendaHref(previousDateKey, view);
  const nextHref = getAgendaHref(nextDateKey, view);
  const todayHref = getAgendaHref(todayDateKey, view);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader title="Agenda" description={`Compromissos de ${formatDateTitle(selectedDate)}.`} />

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <ButtonLink href={previousHref} variant="secondary">
              Dia anterior
            </ButtonLink>
            <ButtonLink href={todayHref} variant="secondary">
              Hoje
            </ButtonLink>
            <ButtonLink href={nextHref} variant="secondary">
              Próximo dia
            </ButtonLink>
            <ButtonLink href={createHref}>Novo compromisso</ButtonLink>
          </div>

          <form action="/agenda" className="flex flex-wrap gap-2 xl:justify-end">
            <Input name="date" type="date" defaultValue={selectedDateKey} className="w-full min-w-[11rem] sm:w-auto" />
            {view !== "day" ? <input type="hidden" name="view" value={view} /> : null}
            <Button variant="secondary">Ir para data</Button>
          </form>
        </div>
      </div>

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard title={viewMeta.title} description={viewMeta.description}>
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {([
                    { label: "Diário", value: "day" },
                    { label: "Semanal", value: "week" },
                    { label: "Mensal", value: "month" },
                  ] as { label: string; value: AgendaViewMode }[]).map((option) => (
                    <Link
                      key={option.value}
                      href={getAgendaHref(selectedDateKey, option.value)}
                      className={getSegmentedTabClassName(view === option.value, "px-3 py-1.5 text-xs")}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/55">
                  {events.length} item(ns) em {selectedDateKey}
                </p>
              </div>

              {events.length > 0 ? (
                view === "week" ? (
                  <WeekView events={events} returnTo={returnTo} />
                ) : view === "month" ? (
                  <MonthlySummaryView events={events} />
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <EventCard key={`${event.kind}-${event.id}`} event={event} returnTo={returnTo} />
                    ))}
                  </div>
                )
              ) : (
                <EmptyState createHref={createHref} message={viewMeta.emptyMessage} />
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Mês" description={`Marcadores compactos por tipo em ${formatMonthTitle(selectedDate)}.`}>
          <div className="space-y-3">
            <AgendaMonthCalendar
              key={`${selectedDateKey}-${view}`}
              initialDateKey={selectedDateKey}
              initialMarkersByDate={monthMarkers}
              showLegend
              todayDateKey={todayDateKey}
            />
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-xs uppercase tracking-[0.14em] text-foreground/60">
              Dias com mais de um tipo exibem marcadores combinados: Manual, {getMarkerTypesLabel("contract")} e{" "}
              {getMarkerTypesLabel("licitation")}.
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

