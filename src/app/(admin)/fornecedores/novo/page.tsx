import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { createSupplierAction } from "@/modules/suppliers/actions";
import { SupplierForm } from "@/modules/suppliers/components/supplier-form";

export const dynamic = "force-dynamic";

type NovoFornecedorPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function NovoFornecedorPage({ searchParams }: NovoFornecedorPageProps) {
  await requireModulePermission(PermissionModule.fornecedores, "create");
  const params = await searchParams;
  const returnTo = resolveReturnTo(getSearchParam(params, "returnTo"), "/fornecedores");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Novo fornecedor"
          description="Cadastre um parceiro externo seguindo o mesmo padrão visual e operacional dos outros módulos."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <SectionCard
        title="Cadastro de fornecedor"
        description="O documento deve ser unico. CPF e CNPJ sao normalizados para evitar duplicidade."
      >
        <SupplierForm action={createSupplierAction} returnTo={returnTo} submitLabel="Criar fornecedor" />
      </SectionCard>
    </div>
  );
}

