import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { getAssignableRoles, requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { createUserAction } from "@/modules/users/actions";
import { UserForm } from "@/modules/users/components/user-form";
import { getUserFormOptions } from "@/modules/users/queries";

export const dynamic = "force-dynamic";

type NovoUsuarioPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function NovoUsuarioPage({ searchParams }: NovoUsuarioPageProps) {
  const currentUser = await requireModulePermission(PermissionModule.usuarios, "create");
  const [params, sectors] = await Promise.all([searchParams, getUserFormOptions()]);
  const returnTo = resolveReturnTo(getSearchParam(params, "returnTo"), "/usuarios");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Novo usuário"
          description="Cadastre um novo acesso administrativo seguindo o mesmo padrão visual do painel."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <SectionCard
        title="Cadastro de usuário"
        description="O email deve ser unico. A senha sera protegida com hash antes de salvar."
      >
        <UserForm
          action={createUserAction}
          availableRoles={getAssignableRoles(currentUser)}
          mode="create"
          returnTo={returnTo}
          sectors={sectors}
          submitLabel="Criar usuário"
        />
      </SectionCard>
    </div>
  );
}

