import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireRouteAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { updateSectorAction } from "@/modules/sectors/actions";
import { SectorForm } from "@/modules/sectors/components/sector-form";
import { getSectorById } from "@/modules/sectors/queries";

export const dynamic = "force-dynamic";

type EditarSetorPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<SearchParamsRecord>;
};

export default async function EditarSetorPage({ params, searchParams }: EditarSetorPageProps) {
  await requireRouteAccess("/setores");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = resolveReturnTo(getSearchParam(query, "returnTo"), "/setores");
  const sector = await getSectorById(id);

  if (!sector) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Editar setor"
          description="Atualize nome e descrição sem sobrecarregar a listagem principal."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(query, "error")} success={getSearchParam(query, "success")} />

      <SectionCard
        title={sector.name}
        description={`${sector._count.users} usuario(s) atualmente vinculado(s) a este setor.`}
      >
        <SectorForm
          action={updateSectorAction}
          returnTo={returnTo}
          submitLabel="Salvar alteracoes"
          sector={{
            id: sector.id,
            name: sector.name,
            description: sector.description,
          }}
        />
      </SectionCard>
    </div>
  );
}
