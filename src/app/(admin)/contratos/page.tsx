import { ContractStatus, PermissionModule } from "@prisma/client";

import { FilterField, ListFilters } from "@/components/filters/list-filters";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { buildPathWithParams, getTrimmedSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { canCreateModule, canDeleteModule, canEditModule, requireRouteAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Select } from "@/components/ui/select";
import { StatusMessage } from "@/components/ui/status-message";
import {
  getContractFormOptions,
  getContractsList,
  type ContractListFilters,
} from "@/modules/contracts/queries";
import { deleteContractAction } from "@/modules/contracts/actions";
import { contractStatusLabels } from "@/modules/contracts/schemas";
import { formatContractDate, formatCurrencyValue, getDaysUntil } from "@/modules/contracts/formatters";

export const dynamic = "force-dynamic";

type ContratosPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

function getStatusBadgeClass(status: ContractStatus) {
  if (status === ContractStatus.ACTIVE) {
    return "rounded-full bg-[#e5f4e9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary";
  }

  if (status === ContractStatus.DRAFT) {
    return "rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a16800]";
  }

  if (status === ContractStatus.FINISHED) {
    return "rounded-full bg-[#eef1f4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4b5c68]";
  }

  return "rounded-full bg-[#fdecec] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-danger";
}

export default async function ContratosPage({ searchParams }: ContratosPageProps) {
  const currentUser = await requireRouteAccess("/contratos");
  const params = await searchParams;
  const search = getTrimmedSearchParam(params, "search");
  const status = getTrimmedSearchParam(params, "status");
  const expiration = getTrimmedSearchParam(params, "expiration");
  const supplierId = getTrimmedSearchParam(params, "supplierId");

  const filters: ContractListFilters = {
    expiration:
      expiration === "expired" || expiration === "days_30" || expiration === "days_60" || expiration === "days_90"
        ? expiration
        : undefined,
    search,
    status: Object.values(ContractStatus).includes(status as ContractStatus) ? (status as ContractStatus) : undefined,
    supplierId,
  };
  const currentPath = buildPathWithParams("/contratos", {
    expiration: filters.expiration,
    search: filters.search,
    status: filters.status,
    supplierId: filters.supplierId,
  });
  const [contracts, suppliers] = await Promise.all([getContractsList(filters), getContractFormOptions()]);

  const totalContracts = contracts.length;
  const activeContracts = contracts.filter((contract) => contract.status === ContractStatus.ACTIVE).length;
  const finishedContracts = contracts.filter((contract) => contract.status === ContractStatus.FINISHED).length;
  const cancelledContracts = contracts.filter((contract) => contract.status === ContractStatus.CANCELLED).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Contratos"
          description="Gerencie contratos administrativos com acompanhamento de status, vigência e fornecedor."
        />
        {canCreateModule(currentUser, PermissionModule.contratos) ? (
          <ButtonLink href={buildPathWithParams("/contratos/novo", { returnTo: currentPath })}>Novo contrato</ButtonLink>
        ) : null}
      </div>

      <StatusMessage error={getTrimmedSearchParam(params, "error")} success={getTrimmedSearchParam(params, "success")} />

      <ListFilters clearHref="/contratos">
        <FilterField htmlFor="search" label="Busca">
          <Input
            id="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Numero, objeto ou fornecedor"
          />
        </FilterField>

        <FilterField htmlFor="status" label="Status">
          <Select id="status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos</option>
            <option value={ContractStatus.DRAFT}>DRAFT</option>
            <option value={ContractStatus.ACTIVE}>ACTIVE</option>
            <option value={ContractStatus.FINISHED}>FINISHED</option>
            <option value={ContractStatus.CANCELLED}>CANCELLED</option>
          </Select>
        </FilterField>

        <FilterField htmlFor="expiration" label="Vigencia">
          <Select id="expiration" name="expiration" defaultValue={filters.expiration ?? ""}>
            <option value="">Todos</option>
            <option value="expired">Vencidos</option>
            <option value="days_30">Vence em 30 dias</option>
            <option value="days_60">Vence em 60 dias</option>
            <option value="days_90">Vence em 90 dias</option>
          </Select>
        </FilterField>

        <FilterField htmlFor="supplierId" label="Fornecedor">
          <Select id="supplierId" name="supplierId" defaultValue={filters.supplierId ?? ""}>
            <option value="">Todos</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.companyName}
              </option>
            ))}
          </Select>
        </FilterField>
      </ListFilters>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Total</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{totalContracts}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Ativos</p>
          <p className="mt-3 text-3xl font-semibold text-primary">{activeContracts}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Finalizados</p>
          <p className="mt-3 text-3xl font-semibold text-[#4b5c68]">{finishedContracts}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Cancelados</p>
          <p className="mt-3 text-3xl font-semibold text-danger">{cancelledContracts}</p>
        </div>
      </div>

      <SectionCard
        title="Lista de contratos"
        description="Consulte dados originais, vigentes, anexo principal e quantidade de aditivos antes de abrir a tela de edição."
      >
        <div className="space-y-4">
          {contracts.length === 0 ? (
            <p className="text-sm text-[#4f6557]">Nenhum contrato cadastrado.</p>
          ) : (
            contracts.map((contract) => (
              <div key={contract.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{contract.number}</h3>
                      <span className={getStatusBadgeClass(contract.status)}>{contractStatusLabels[contract.status]}</span>
                    </div>

                    <div className="grid gap-3 text-sm text-[#415446] md:grid-cols-2 xl:grid-cols-6">
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Numero</span>
                        {contract.number}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Objeto</span>
                        {contract.object}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Status</span>
                        {contractStatusLabels[contract.status]}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Fornecedor</span>
                        {contract.supplier?.companyName ?? "Não vinculado"}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Data inicial</span>
                        {formatContractDate(contract.startDate)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Data final atual</span>
                        {formatContractDate(contract.endDateCurrent ?? contract.endDate)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Valor atual</span>
                        {formatCurrencyValue(contract.currentValue ?? contract.initialValue)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Aditivos</span>
                        {contract._count.amendments}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Anexo</span>
                        {contract.attachmentPath ? "PDF disponivel" : "Sem arquivo"}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Aviso</span>
                        {contract.endDateCurrent ?? contract.endDate
                          ? `${getDaysUntil(contract.endDateCurrent ?? contract.endDate!)} dia(s)`
                          : "Sem vigência"}
                      </p>
                    </div>
                  </div>

                  {canEditModule(currentUser, PermissionModule.contratos) || canDeleteModule(currentUser, PermissionModule.contratos) ? (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {canEditModule(currentUser, PermissionModule.contratos) ? (
                        <ButtonLink
                          href={buildPathWithParams(`/contratos/${contract.id}/editar`, { returnTo: currentPath })}
                          variant="secondary"
                        >
                          Editar
                        </ButtonLink>
                      ) : null}
                      {canDeleteModule(currentUser, PermissionModule.contratos) ? (
                        <form action={deleteContractAction}>
                          <input type="hidden" name="id" value={contract.id} />
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

