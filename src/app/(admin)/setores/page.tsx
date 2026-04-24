import { FilterField, ListFilters } from "@/components/filters/list-filters";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { canDelete, requireRouteAccess } from "@/lib/permissions";
import { buildPathWithParams, getTrimmedSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Select } from "@/components/ui/select";
import { StatusMessage } from "@/components/ui/status-message";
import { deleteSectorAction } from "@/modules/sectors/actions";
import { getSectorsList, type SectorListFilters } from "@/modules/sectors/queries";

export const dynamic = "force-dynamic";

type SetoresPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function SetoresPage({ searchParams }: SetoresPageProps) {
  const currentUser = await requireRouteAccess("/setores");
  const params = await searchParams;
  const search = getTrimmedSearchParam(params, "search");
  const occupancy = getTrimmedSearchParam(params, "occupancy");

  const filters: SectorListFilters = {
    occupancy: occupancy === "with_users" || occupancy === "without_users" ? occupancy : undefined,
    search,
  };

  const currentPath = buildPathWithParams("/setores", {
    occupancy: filters.occupancy,
    search: filters.search,
  });
  const sectors = await getSectorsList(filters);

  const totalSectors = sectors.length;
  const linkedSectors = sectors.filter((sector) => sector._count.users > 0).length;
  const emptySectors = totalSectors - linkedSectors;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Setores"
          description="Gerencie a estrutura organizacional usada nos vínculos de usuários do sistema."
        />
        <ButtonLink href={buildPathWithParams("/setores/novo", { returnTo: currentPath })}>Novo setor</ButtonLink>
      </div>

      <StatusMessage error={getTrimmedSearchParam(params, "error")} success={getTrimmedSearchParam(params, "success")} />

      <ListFilters clearHref="/setores">
        <FilterField htmlFor="search" label="Busca">
          <Input
            id="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Nome ou descrição"
          />
        </FilterField>

        <FilterField htmlFor="occupancy" label="Ocupação">
          <Select id="occupancy" name="occupancy" defaultValue={filters.occupancy ?? ""}>
            <option value="">Todos</option>
            <option value="with_users">Com usuários</option>
            <option value="without_users">Sem usuários</option>
          </Select>
        </FilterField>
      </ListFilters>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Total</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{totalSectors}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Com usuários</p>
          <p className="mt-3 text-3xl font-semibold text-primary">{linkedSectors}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Sem usuários</p>
          <p className="mt-3 text-3xl font-semibold text-danger">{emptySectors}</p>
        </div>
      </div>

      <SectionCard
        title="Lista de setores"
        description="Acompanhe descrição, ocupação e siga para uma tela dedicada de edição."
      >
        <div className="space-y-4">
          {sectors.length === 0 ? (
            <p className="text-sm text-[#4f6557]">Nenhum setor cadastrado.</p>
          ) : (
            sectors.map((sector) => (
              <div key={sector.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{sector.name}</h3>
                      <span
                        className={
                          sector._count.users > 0
                            ? "rounded-full bg-[#e5f4e9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                            : "rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a16800]"
                        }
                      >
                        {sector._count.users > 0 ? "Em uso" : "Disponível"}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-[#415446] md:grid-cols-2 xl:grid-cols-3">
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Descrição</span>
                        {sector.description?.trim() || "Sem descrição"}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">
                          Usuários vinculados
                        </span>
                        {sector._count.users}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Criado em</span>
                        {sector.createdAt.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <ButtonLink
                      href={buildPathWithParams(`/setores/${sector.id}/editar`, { returnTo: currentPath })}
                      variant="secondary"
                    >
                      Editar
                    </ButtonLink>

                    {canDelete(currentUser) ? (
                      <form action={deleteSectorAction}>
                        <input type="hidden" name="id" value={sector.id} />
                        <input type="hidden" name="returnTo" value={currentPath} />
                        <Button variant="danger">Excluir</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

