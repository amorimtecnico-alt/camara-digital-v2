import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireRouteAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { createSectorAction } from "@/modules/sectors/actions";
import { SectorForm } from "@/modules/sectors/components/sector-form";

export const dynamic = "force-dynamic";

type NovoSetorPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function NovoSetorPage({ searchParams }: NovoSetorPageProps) {
  await requireRouteAccess("/setores");
  const params = await searchParams;
  const returnTo = resolveReturnTo(getSearchParam(params, "returnTo"), "/setores");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Novo setor"
          description="Cadastre uma nova area organizacional seguindo o mesmo padrão visual do painel."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <SectionCard
        title="Cadastro de setor"
        description="O nome do setor deve ser unico para evitar duplicidade na organizacao interna."
      >
        <SectorForm action={createSectorAction} returnTo={returnTo} submitLabel="Criar setor" />
      </SectionCard>
    </div>
  );
}

