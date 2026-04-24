import { PermissionModule } from "@prisma/client";

import { FilterField, ListFilters } from "@/components/filters/list-filters";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { canCreateModule, canDeleteModule, canEditModule, requireRouteAccess } from "@/lib/permissions";
import { buildPathWithParams, getTrimmedSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Select } from "@/components/ui/select";
import { StatusMessage } from "@/components/ui/status-message";
import { deleteSupplierAction } from "@/modules/suppliers/actions";
import { getSuppliersList, type SupplierListFilters } from "@/modules/suppliers/queries";

export const dynamic = "force-dynamic";

type FornecedoresPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

export default async function FornecedoresPage({ searchParams }: FornecedoresPageProps) {
  const currentUser = await requireRouteAccess("/fornecedores");
  const params = await searchParams;
  const search = getTrimmedSearchParam(params, "search");
  const hasContracts = getTrimmedSearchParam(params, "hasContracts");

  const filters: SupplierListFilters = {
    hasContracts:
      hasContracts === "with_contracts" || hasContracts === "without_contracts" ? hasContracts : undefined,
    search,
  };
  const currentPath = buildPathWithParams("/fornecedores", {
    hasContracts: filters.hasContracts,
    search: filters.search,
  });
  const suppliers = await getSuppliersList(filters);

  const totalSuppliers = suppliers.length;
  const linkedSuppliers = suppliers.filter((supplier) => supplier._count.contracts > 0).length;
  const availableSuppliers = totalSuppliers - linkedSuppliers;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Fornecedores"
          description="Gerencie a base cadastral de parceiros com a mesma organização aplicada aos demais módulos."
        />
        {canCreateModule(currentUser, PermissionModule.fornecedores) ? (
          <ButtonLink href={buildPathWithParams("/fornecedores/novo", { returnTo: currentPath })}>
            Novo fornecedor
          </ButtonLink>
        ) : null}
      </div>

      <StatusMessage error={getTrimmedSearchParam(params, "error")} success={getTrimmedSearchParam(params, "success")} />

      <ListFilters clearHref="/fornecedores">
        <FilterField htmlFor="search" label="Busca">
          <Input
            id="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Razao social, fantasia, documento ou contato"
          />
        </FilterField>

        <FilterField htmlFor="hasContracts" label="Contratos">
          <Select id="hasContracts" name="hasContracts" defaultValue={filters.hasContracts ?? ""}>
            <option value="">Todos</option>
            <option value="with_contracts">Com contratos</option>
            <option value="without_contracts">Sem contratos</option>
          </Select>
        </FilterField>
      </ListFilters>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Total</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{totalSuppliers}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Com contratos</p>
          <p className="mt-3 text-3xl font-semibold text-primary">{linkedSuppliers}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Sem contratos</p>
          <p className="mt-3 text-3xl font-semibold text-danger">{availableSuppliers}</p>
        </div>
      </div>

      <SectionCard
        title="Lista de fornecedores"
        description="Acompanhe documento, contato e uso em contratos. A edição detalhada fica em uma tela própria."
      >
        <div className="space-y-4">
          {suppliers.length === 0 ? (
            <p className="text-sm text-[#4f6557]">Nenhum fornecedor cadastrado.</p>
          ) : (
            suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{supplier.companyName}</h3>
                      <span
                        className={
                          supplier._count.contracts > 0
                            ? "rounded-full bg-[#e5f4e9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary"
                            : "rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a16800]"
                        }
                      >
                        {supplier._count.contracts > 0 ? "Em uso" : "Disponível"}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-[#415446] md:grid-cols-2 xl:grid-cols-4">
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">
                          Nome fantasia
                        </span>
                        {supplier.tradeName?.trim() || "Não informado"}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Documento</span>
                        {supplier.document}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Contato</span>
                        {supplier.contactName?.trim() || supplier.email?.trim() || supplier.phone?.trim() || "Não informado"}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Contratos</span>
                        {supplier._count.contracts}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {canEditModule(currentUser, PermissionModule.fornecedores) ? (
                      <ButtonLink
                        href={buildPathWithParams(`/fornecedores/${supplier.id}/editar`, { returnTo: currentPath })}
                        variant="secondary"
                      >
                        Editar
                      </ButtonLink>
                    ) : null}

                    {canDeleteModule(currentUser, PermissionModule.fornecedores) ? (
                      <form action={deleteSupplierAction}>
                        <input type="hidden" name="id" value={supplier.id} />
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

