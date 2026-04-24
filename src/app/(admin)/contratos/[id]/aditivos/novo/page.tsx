import { notFound } from "next/navigation";
import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { createContractAmendmentAction } from "@/modules/contracts/actions";
import { ContractAmendmentForm } from "@/modules/contracts/components/contract-amendment-form";
import { formatContractDate, formatCurrencyValue, formatDateInput } from "@/modules/contracts/formatters";
import { getContractById } from "@/modules/contracts/queries";

export const dynamic = "force-dynamic";

type NovoAditivoPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function NovoAditivoPage({ params, searchParams }: NovoAditivoPageProps) {
  await requireModulePermission(PermissionModule.contratos, "edit");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const contract = await getContractById(id);

  if (!contract) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Novo aditivo contratual"
          description="Cadastre alterações de prazo, valor ou ambos preservando o histórico do contrato."
        />
        <ButtonLink href={`/contratos/${contract.id}/editar`} variant="secondary">
          Voltar ao contrato
        </ButtonLink>
      </div>

      <StatusMessage error={query.error} success={query.success} />

      <SectionCard
        title={contract.number}
        description={`Vigencia atual: ${formatContractDate(contract.endDateCurrent)}. Valor atual: ${formatCurrencyValue(contract.currentValue)}.`}
      >
        <ContractAmendmentForm
          action={createContractAmendmentAction}
          contractId={contract.id}
          submitLabel="Criar aditivo"
          amendment={{
            number: "",
            amendmentDate: formatDateInput(new Date()),
            description: "",
            previousEndDate: formatDateInput(contract.endDateCurrent ?? contract.endDate),
            newEndDate: "",
            previousValue: contract.currentValue?.toString() ?? contract.initialValue?.toString() ?? "",
            newValue: "",
            attachmentName: null,
            attachmentPath: null,
          }}
        />
      </SectionCard>
    </div>
  );
}
