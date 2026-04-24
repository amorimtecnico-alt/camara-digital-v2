import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { createProtocolAction } from "@/modules/protocols/actions";
import { ProtocolForm } from "@/modules/protocols/components/protocol-form";

export const dynamic = "force-dynamic";

type NovoProtocoloPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function NovoProtocoloPage({ searchParams }: NovoProtocoloPageProps) {
  await requireModulePermission(PermissionModule.protocolos, "create");
  const params = await searchParams;
  const returnTo = resolveReturnTo(getSearchParam(params, "returnTo"), "/protocolos");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Novo protocolo"
          description="Registre um novo protocolo administrativo seguindo o mesmo fluxo visual dos demais módulos."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <SectionCard
        title="Cadastro de protocolo"
        description="O código será gerado automaticamente e o usuário autenticado será registrado como criador."
      >
        <ProtocolForm action={createProtocolAction} returnTo={returnTo} submitLabel="Criar protocolo" />
      </SectionCard>
    </div>
  );
}

