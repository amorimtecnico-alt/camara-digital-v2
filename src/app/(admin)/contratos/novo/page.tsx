import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { createContractAction } from "@/modules/contracts/actions";
import { ContractForm } from "@/modules/contracts/components/contract-form";
import { getContractFormOptions } from "@/modules/contracts/queries";

export const dynamic = "force-dynamic";

type NovoContratoPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function NovoContratoPage({ searchParams }: NovoContratoPageProps) {
  await requireModulePermission(PermissionModule.contratos, "create");
  const [params, suppliers] = await Promise.all([searchParams, getContractFormOptions()]);
  const returnTo = resolveReturnTo(getSearchParam(params, "returnTo"), "/contratos");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Novo contrato"
          description="Cadastre um contrato administrativo seguindo o mesmo fluxo visual dos demais módulos."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <SectionCard
        title="Cadastro de contrato"
        description="Informe dados iniciais, valor inicial, vigência original e anexo principal em PDF."
      >
        <ContractForm
          action={createContractAction}
          allowAttachmentUpload
          returnTo={returnTo}
          suppliers={suppliers}
          submitLabel="Criar contrato"
        />
      </SectionCard>
    </div>
  );
}

