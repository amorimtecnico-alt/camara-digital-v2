import { PermissionModule, UserRole } from "@prisma/client";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getActivePillClassName, getSegmentedTabClassName } from "@/components/ui/selection-styles";
import { StatusMessage } from "@/components/ui/status-message";
import { getSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { requireRouteAccess } from "@/lib/permissions";
import {
  removeProfileAvatarAction,
  updateChamberConfigAction,
  updateProfileAction,
  updateUserPermissionsAction,
} from "@/modules/settings/actions";
import { configurableModules, getSettingsData, moduleLabels } from "@/modules/settings/queries";

export const dynamic = "force-dynamic";

type ConfiguracoesPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

const tabs = [
  { key: "perfil", label: "Perfil do usuário" },
  { key: "camara", label: "Configuração da Câmara" },
  { key: "permissoes", label: "Permissões por usuário" },
] as const;

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

function getPermissionValue(
  permissions: Array<{
    module: PermissionModule;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>,
  module: PermissionModule,
  action: "canCreate" | "canDelete" | "canEdit" | "canView",
) {
  return permissions.find((permission) => permission.module === module)?.[action] ?? false;
}

export default async function ConfiguracoesPage({ searchParams }: ConfiguracoesPageProps) {
  const user = await requireRouteAccess("/configuracoes");
  const params = await searchParams;
  const activeTab = getSearchParam(params, "tab") ?? "perfil";
  const data = await getSettingsData(user.id);
  const userInitials = getInitials(data.currentUser?.name ?? user.name);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Ajustes de perfil, dados da Câmara e permissões operacionais por usuário."
      />

      <StatusMessage error={getSearchParam(params, "error")} success={getSearchParam(params, "success")} />

      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/configuracoes?tab=${tab.key}`}
            className={getSegmentedTabClassName(activeTab === tab.key)}
            aria-current={activeTab === tab.key ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "perfil" ? (
        <SectionCard title="Perfil do usuário" description="Atualize seus dados de acesso e imagem de perfil.">
          <form action={updateProfileAction} className="space-y-5">
            <input type="hidden" name="returnTo" value="/configuracoes?tab=perfil" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium">
                  Nome
                </label>
                <Input id="name" name="name" defaultValue={data.currentUser?.name ?? ""} required />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input id="email" name="email" type="email" defaultValue={data.currentUser?.email ?? ""} required />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Nova senha
                </label>
                <Input id="password" name="password" type="password" placeholder="Deixe em branco para manter" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="avatarFile" className="text-sm font-medium">
                  Upload/alterar avatar
                </label>
                <Input id="avatarFile" name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" />
              </div>
            </div>

            {data.currentUser?.avatarPath ? (
              <img
                src={data.currentUser.avatarPath}
                alt="Avatar atual"
                className="size-16 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-sidebar text-lg font-semibold text-sidebar-foreground">
                {userInitials}
              </div>
            )}

            <div className="flex justify-end">
              <Button>Salvar perfil</Button>
            </div>
          </form>

          {data.currentUser?.avatarPath ? (
            <form action={removeProfileAvatarAction} className="mt-4 flex justify-end">
              <input type="hidden" name="returnTo" value="/configuracoes?tab=perfil" />
              <Button variant="secondary">Remover avatar</Button>
            </form>
          ) : null}
        </SectionCard>
      ) : null}

      {activeTab === "camara" ? (
        <SectionCard title="Configuração da Câmara" description="Dados institucionais usados no topo e em relatórios futuros.">
          <form action={updateChamberConfigAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="chamberName" className="text-sm font-medium">
                  Nome da Câmara
                </label>
                <Input id="chamberName" name="name" defaultValue={data.chamberConfig.name} required />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="logoFile" className="text-sm font-medium">
                  Logo
                </label>
                <Input id="logoFile" name="logoFile" type="file" accept="image/png,image/jpeg,image/webp" />
              </div>
            </div>

            {data.chamberConfig.logoPath ? (
              <img
                src={data.chamberConfig.logoPath}
                alt="Logo atual"
                className="max-h-20 max-w-48 object-contain"
              />
            ) : null}

            <div className="flex justify-end">
              <Button>Salvar configuração</Button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      {activeTab === "permissoes" ? (
        <SectionCard title="Permissões por usuário" description="Ajuste acesso por módulo e ação para cada usuário.">
          <div className="space-y-5">
            {data.users.map((targetUser) => (
              <form
                key={targetUser.id}
                action={updateUserPermissionsAction}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <input type="hidden" name="userId" value={targetUser.id} />
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{targetUser.name}</p>
                    <p className="text-sm text-foreground/70">
                      {targetUser.email} · {targetUser.role} · {targetUser.active ? "ativo" : "inativo"}
                    </p>
                  </div>
                  {targetUser.role === UserRole.ADMIN ? (
                    <span className={getActivePillClassName()}>
                      acesso total
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.14em] text-foreground/65">
                      <tr>
                        <th className="py-2">Módulo</th>
                        <th className="py-2">View</th>
                        <th className="py-2">Create</th>
                        <th className="py-2">Edit</th>
                        <th className="py-2">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configurableModules.map((module) => (
                        <tr key={module} className="border-t border-border">
                          <td className="py-3 font-medium text-foreground">{moduleLabels[module]}</td>
                          {[
                            ["view", "canView"],
                            ["create", "canCreate"],
                            ["edit", "canEdit"],
                            ["delete", "canDelete"],
                          ].map(([field, key]) => (
                            <td key={field} className="py-3">
                              <input
                                type="checkbox"
                                name={`${module}.${field}`}
                                defaultChecked={getPermissionValue(
                                  targetUser.modulePermissions,
                                  module,
                                  key as "canCreate" | "canDelete" | "canEdit" | "canView",
                                )}
                                disabled={targetUser.role === UserRole.ADMIN}
                                className="size-4"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button disabled={targetUser.role === UserRole.ADMIN}>Salvar permissões</Button>
                </div>
              </form>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

