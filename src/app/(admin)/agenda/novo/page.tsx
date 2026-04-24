import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireRouteAccess } from "@/lib/permissions";
import { createAgendaEventAction } from "@/modules/agenda/actions";
import { AgendaEventForm } from "@/modules/agenda/components/agenda-event-form";
import { formatAgendaDateKey, parseAgendaDateKey } from "@/modules/agenda/queries";

export const dynamic = "force-dynamic";

type NovoAgendaPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function NovoAgendaPage({ searchParams }: NovoAgendaPageProps) {
  await requireRouteAccess("/agenda");
  const params = await searchParams;
  const defaultDate = formatAgendaDateKey(parseAgendaDateKey(getSearchParam(params, "date")));
  const returnTo = resolveReturnTo(getSearchParam(params, "returnTo"), `/agenda?date=${defaultDate}`);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader title="Novo compromisso" description="Crie um compromisso manual na sua agenda." />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para agenda
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <SectionCard title="Dados do compromisso" description="Compromissos manuais podem ser alterados ou removidos depois.">
        <AgendaEventForm
          action={createAgendaEventAction}
          defaultDate={defaultDate}
          returnTo={returnTo}
          submitLabel="Criar compromisso"
        />
      </SectionCard>
    </div>
  );
}
