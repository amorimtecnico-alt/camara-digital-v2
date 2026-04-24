import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireRouteAccess } from "@/lib/permissions";
import { deleteAgendaEventAction, updateAgendaEventAction } from "@/modules/agenda/actions";
import { AgendaEventForm } from "@/modules/agenda/components/agenda-event-form";
import { formatAgendaDateKey, getManualAgendaEventById } from "@/modules/agenda/queries";

export const dynamic = "force-dynamic";

type EditarAgendaPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsRecord>;
};

export default async function EditarAgendaPage({ params, searchParams }: EditarAgendaPageProps) {
  const currentUser = await requireRouteAccess("/agenda");
  const [{ id }, queryParams] = await Promise.all([params, searchParams]);
  const event = await getManualAgendaEventById(currentUser, id);

  if (!event) {
    notFound();
  }

  const eventDate = formatAgendaDateKey(event.date);
  const returnTo = resolveReturnTo(getSearchParam(queryParams, "returnTo"), `/agenda?date=${eventDate}`);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader title="Editar compromisso" description="Atualize um compromisso manual da agenda." />
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={returnTo} variant="secondary">
            Voltar para agenda
          </ButtonLink>
          <form action={deleteAgendaEventAction}>
            <input type="hidden" name="id" value={event.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Button variant="danger">Remover</Button>
          </form>
        </div>
      </div>

      <StatusMessage error={getSearchParam(queryParams, "error")} success={getSearchParam(queryParams, "success")} />

      <SectionCard title="Dados do compromisso" description="Eventos automáticos do sistema não aparecem nesta tela de edição.">
        <AgendaEventForm
          action={updateAgendaEventAction}
          defaultDate={eventDate}
          event={event}
          returnTo={returnTo}
          submitLabel="Salvar compromisso"
        />
      </SectionCard>
    </div>
  );
}
