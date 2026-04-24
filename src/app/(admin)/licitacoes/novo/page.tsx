import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { createLicitationAction } from "@/modules/licitation/actions";
import { LicitationForm } from "@/modules/licitation/components/licitation-form";
import { getLicitationFormOptions } from "@/modules/licitation/queries";

export const dynamic = "force-dynamic";

type NovaLicitacaoPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function NovaLicitacaoPage({ searchParams }: NovaLicitacaoPageProps) {
  await requireModulePermission(PermissionModule.licitacoes, "create");
  const [params, suppliers] = await Promise.all([searchParams, getLicitationFormOptions()]);
  const returnTo = resolveReturnTo(getSearchParam(params, "returnTo"), "/licitacoes");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Nova licitação"
          description="Cadastre o processo licitatorio, dados financeiros e fornecedor vencedor do edital."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <SectionCard
        title="Cadastro de licitação"
        description="O número da licitação deve ser único. Você pode enviar edital e homologação em PDF desde a criação."
      >
        <LicitationForm
          action={createLicitationAction}
          allowAttachmentUpload
          returnTo={returnTo}
          suppliers={suppliers}
          submitLabel="Criar licitação"
        />
      </SectionCard>
    </div>
  );
}

