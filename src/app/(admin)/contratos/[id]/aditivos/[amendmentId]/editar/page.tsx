import { notFound } from "next/navigation";
import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { updateContractAmendmentAction } from "@/modules/contracts/actions";
import { ContractAmendmentForm } from "@/modules/contracts/components/contract-amendment-form";
import { formatDateInput } from "@/modules/contracts/formatters";
import { getContractAmendmentById, getContractById } from "@/modules/contracts/queries";
import { contractAmendmentTypeLabels } from "@/modules/contracts/schemas";

export const dynamic = "force-dynamic";

type EditarAditivoPageProps = {
  params: Promise<{
    id: string;
    amendmentId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function EditarAditivoPage({ params, searchParams }: EditarAditivoPageProps) {
  await requireModulePermission(PermissionModule.contratos, "edit");
  const [{ id, amendmentId }, query] = await Promise.all([params, searchParams]);
  const [contract, amendment] = await Promise.all([
    getContractById(id),
    getContractAmendmentById(id, amendmentId),
  ]);

  if (!contract || !amendment) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Editar aditivo contratual"
          description="Atualize os dados do aditivo mantendo o recalculo automático dos dados vigentes."
        />
        <ButtonLink href={`/contratos/${contract.id}/editar`} variant="secondary">
          Voltar ao contrato
        </ButtonLink>
      </div>

      <StatusMessage error={query.error} success={query.success} />

      <SectionCard
        title={amendment.number}
        description={`Tipo: ${contractAmendmentTypeLabels[amendment.type]}. Contrato: ${contract.number}.`}
      >
        <ContractAmendmentForm
          action={updateContractAmendmentAction}
          contractId={contract.id}
          submitLabel="Salvar aditivo"
          amendment={{
            id: amendment.id,
            number: amendment.number,
            type: amendment.type,
            amendmentDate: formatDateInput(amendment.amendmentDate),
            description: amendment.description,
            previousEndDate: formatDateInput(amendment.previousEndDate),
            newEndDate: formatDateInput(amendment.newEndDate),
            previousValue: amendment.previousValue?.toString() ?? "",
            newValue: amendment.newValue?.toString() ?? "",
            attachmentName: amendment.attachmentName,
            attachmentPath: amendment.attachmentPath,
          }}
        />
      </SectionCard>
    </div>
  );
}
