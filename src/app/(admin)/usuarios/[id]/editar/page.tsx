import { notFound } from "next/navigation";
import { PermissionModule } from "@prisma/client";

import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import {
  canManageUserTarget,
  getAssignableRoles,
  redirectToAccessDenied,
  requireModulePermission,
} from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import { updateUserAction } from "@/modules/users/actions";
import { UserForm } from "@/modules/users/components/user-form";
import { getUserById, getUserFormOptions } from "@/modules/users/queries";

export const dynamic = "force-dynamic";

type EditarUsuarioPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<SearchParamsRecord>;
};

export default async function EditarUsuarioPage({ params, searchParams }: EditarUsuarioPageProps) {
  const currentUser = await requireModulePermission(PermissionModule.usuarios, "edit");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = resolveReturnTo(getSearchParam(query, "returnTo"), "/usuarios");
  const [user, sectors] = await Promise.all([getUserById(id), getUserFormOptions()]);

  if (!user) {
    notFound();
  }

  if (!canManageUserTarget(currentUser, user)) {
    redirectToAccessDenied();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Editar usuário"
          description="Atualize dados cadastrais, perfil, setor e status sem alterar a listagem principal."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(query, "error")} success={getSearchParam(query, "success")} />

      <SectionCard
        title={user.name}
        description="Deixe a senha em branco para manter a credencial atual."
      >
        <UserForm
          action={updateUserAction}
          availableRoles={getAssignableRoles(currentUser)}
          mode="edit"
          returnTo={returnTo}
          sectors={sectors}
          submitLabel="Salvar alteracoes"
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active,
            sectorId: user.sectorId,
          }}
        />
      </SectionCard>
    </div>
  );
}
