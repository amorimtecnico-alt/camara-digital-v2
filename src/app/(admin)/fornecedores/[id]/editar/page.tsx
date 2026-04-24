import { notFound } from "next/navigation";
import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { updateSupplierAction } from "@/modules/suppliers/actions";
import { SupplierForm } from "@/modules/suppliers/components/supplier-form";
import { getSupplierById } from "@/modules/suppliers/queries";

export const dynamic = "force-dynamic";

type EditarFornecedorPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<SearchParamsRecord>;
};

export default async function EditarFornecedorPage({ params, searchParams }: EditarFornecedorPageProps) {
  await requireModulePermission(PermissionModule.fornecedores, "edit");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = resolveReturnTo(getSearchParam(query, "returnTo"), "/fornecedores");
  const supplier = await getSupplierById(id);

  if (!supplier) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Editar fornecedor"
          description="Atualize dados cadastrais sem concentrar a manutencao diretamente na listagem principal."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(query, "error")} success={getSearchParam(query, "success")} />

      <SectionCard
        title={supplier.companyName}
        description={`${supplier._count.contracts} contrato(s) atualmente vinculado(s) a este fornecedor.`}
      >
        <SupplierForm
          action={updateSupplierAction}
          returnTo={returnTo}
          submitLabel="Salvar alteracoes"
          supplier={{
            id: supplier.id,
            companyName: supplier.companyName,
            tradeName: supplier.tradeName,
            document: supplier.document,
            email: supplier.email,
            phone: supplier.phone,
            contactName: supplier.contactName,
          }}
        />
      </SectionCard>
    </div>
  );
}
