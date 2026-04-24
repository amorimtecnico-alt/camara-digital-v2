import { PermissionModule, UserRole } from "@prisma/client";

import { FilterField, ListFilters } from "@/components/filters/list-filters";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import {
  canCreateModule,
  canDeleteModule,
  canEditModule,
  canManageUserTarget,
  requireRouteAccess,
} from "@/lib/permissions";
import { buildPathWithParams, getTrimmedSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Select } from "@/components/ui/select";
import { StatusMessage } from "@/components/ui/status-message";
import { deleteUserAction, toggleUserStatusAction } from "@/modules/users/actions";
import { getUserFormOptions, getUsersList, type UserListFilters } from "@/modules/users/queries";

export const dynamic = "force-dynamic";

type UsuariosPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  const currentUser = await requireRouteAccess("/usuarios");
  const params = await searchParams;
  const search = getTrimmedSearchParam(params, "search");
  const status = getTrimmedSearchParam(params, "status");
  const role = getTrimmedSearchParam(params, "role");
  const sectorId = getTrimmedSearchParam(params, "sectorId");

  const filters: UserListFilters = {
    role: Object.values(UserRole).includes(role as UserRole) ? (role as UserRole) : undefined,
    search,
    sectorId,
    status: status === "active" || status === "inactive" ? status : undefined,
  };

  const currentPath = buildPathWithParams("/usuarios", {
    role: filters.role,
    search: filters.search,
    sectorId: filters.sectorId,
    status: filters.status,
  });

  const [users, sectors] = await Promise.all([getUsersList(filters), getUserFormOptions()]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.active).length;
  const inactiveUsers = totalUsers - activeUsers;

  const roleLabels = {
    ADMIN: "Administrador",
    MANAGER: "Gestor",
    USER: "Usuário",
  } as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Usuários"
          description="Gerencie acesso, perfil e setor dos usuários do sistema."
        />
        {canCreateModule(currentUser, PermissionModule.usuarios) ? (
          <ButtonLink href={buildPathWithParams("/usuarios/novo", { returnTo: currentPath })}>Novo usuário</ButtonLink>
        ) : null}
      </div>

      <StatusMessage error={getTrimmedSearchParam(params, "error")} success={getTrimmedSearchParam(params, "success")} />

      <ListFilters clearHref="/usuarios">
        <FilterField htmlFor="search" label="Busca">
          <Input
            id="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Nome ou e-mail"
          />
        </FilterField>

        <FilterField htmlFor="status" label="Status">
          <Select id="status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </Select>
        </FilterField>

        <FilterField htmlFor="role" label="Perfil">
          <Select id="role" name="role" defaultValue={filters.role ?? ""}>
            <option value="">Todos</option>
            <option value={UserRole.ADMIN}>ADMIN</option>
            <option value={UserRole.MANAGER}>MANAGER</option>
            <option value={UserRole.USER}>USER</option>
          </Select>
        </FilterField>

        <FilterField htmlFor="sectorId" label="Setor">
          <Select id="sectorId" name="sectorId" defaultValue={filters.sectorId ?? ""}>
            <option value="">Todos</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </Select>
        </FilterField>
      </ListFilters>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Total</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{totalUsers}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Ativos</p>
          <p className="mt-3 text-3xl font-semibold text-primary">{activeUsers}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Inativos</p>
          <p className="mt-3 text-3xl font-semibold text-danger">{inactiveUsers}</p>
        </div>
      </div>

      <SectionCard
        title="Lista de usuários"
        description="Acompanhe status, setor e perfil. A edição detalhada agora fica em uma tela própria."
      >
        <div className="space-y-4">
          {users.length === 0 ? (
            <p className="text-sm text-[#4f6557]">Nenhum usuário cadastrado.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                      <span
                        className={
                          user.active
                            ? "rounded-full bg-[#e5f4e9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                            : "rounded-full bg-[#fff0f0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-danger"
                        }
                      >
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-[#415446] md:grid-cols-2 xl:grid-cols-4">
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Email</span>
                        {user.email}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Perfil</span>
                        {roleLabels[user.role]}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Setor</span>
                        {user.sector?.name ?? "Sem setor"}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Criado em</span>
                        {user.createdAt.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {canEditModule(currentUser, PermissionModule.usuarios) && canManageUserTarget(currentUser, user) ? (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <ButtonLink
                        href={buildPathWithParams(`/usuarios/${user.id}/editar`, { returnTo: currentPath })}
                        variant="secondary"
                      >
                        Editar
                      </ButtonLink>

                      <form action={toggleUserStatusAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <input type="hidden" name="active" value={user.active ? "false" : "true"} />
                        <input type="hidden" name="returnTo" value={currentPath} />
                        <Button variant="secondary">{user.active ? "Inativar" : "Ativar"}</Button>
                      </form>

                      {canDeleteModule(currentUser, PermissionModule.usuarios) ? (
                        <form action={deleteUserAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <input type="hidden" name="returnTo" value={currentPath} />
                          <Button variant="danger">Excluir</Button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

