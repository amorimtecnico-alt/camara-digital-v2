import { PermissionModule, ProtocolStatus } from "@prisma/client";

import { FilterField, ListFilters } from "@/components/filters/list-filters";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { canCreateModule, canDeleteModule, canEditProtocol, canReadAllProtocols, requireRouteAccess } from "@/lib/permissions";
import { buildPathWithParams, getTrimmedSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Select } from "@/components/ui/select";
import { StatusMessage } from "@/components/ui/status-message";
import {
  getProtocolFilterOptions,
  getProtocolsList,
  type ProtocolListFilters,
} from "@/modules/protocols/queries";
import { deleteProtocolAction } from "@/modules/protocols/actions";
import { protocolStatusLabels } from "@/modules/protocols/schemas";

export const dynamic = "force-dynamic";

type ProtocolosPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

function getStatusBadgeClass(status: ProtocolStatus) {
  if (status === ProtocolStatus.OPEN) {
    return "rounded-full bg-[#e5f4e9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary";
  }

  if (status === ProtocolStatus.IN_PROGRESS) {
    return "rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a16800]";
  }

  return "rounded-full bg-[#eef1f4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4b5c68]";
}

export default async function ProtocolosPage({ searchParams }: ProtocolosPageProps) {
  const currentUser = await requireRouteAccess("/protocolos");
  const params = await searchParams;
  const search = getTrimmedSearchParam(params, "search");
  const status = getTrimmedSearchParam(params, "status");
  const createdById = getTrimmedSearchParam(params, "createdById");
  const dateFrom = getTrimmedSearchParam(params, "dateFrom");
  const dateTo = getTrimmedSearchParam(params, "dateTo");

  const filters: ProtocolListFilters = {
    createdById: canReadAllProtocols(currentUser) ? createdById : undefined,
    dateFrom,
    dateTo,
    search,
    status: Object.values(ProtocolStatus).includes(status as ProtocolStatus) ? (status as ProtocolStatus) : undefined,
  };

  const currentPath = buildPathWithParams("/protocolos", {
    createdById: filters.createdById,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    search: filters.search,
    status: filters.status,
  });
  const [protocols, creators] = await Promise.all([
    getProtocolsList(currentUser, filters),
    canReadAllProtocols(currentUser) ? getProtocolFilterOptions() : Promise.resolve([]),
  ]);

  const totalProtocols = protocols.length;
  const openProtocols = protocols.filter((protocol) => protocol.status === ProtocolStatus.OPEN).length;
  const inProgressProtocols = protocols.filter((protocol) => protocol.status === ProtocolStatus.IN_PROGRESS).length;
  const closedProtocols = protocols.filter((protocol) => protocol.status === ProtocolStatus.CLOSED).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Protocolos"
          description="Gerencie protocolos administrativos com acompanhamento de status, autoria e data de criação."
        />
        {canCreateModule(currentUser, PermissionModule.protocolos) ? (
          <ButtonLink href={buildPathWithParams("/protocolos/novo", { returnTo: currentPath })}>Novo protocolo</ButtonLink>
        ) : null}
      </div>

      <StatusMessage error={getTrimmedSearchParam(params, "error")} success={getTrimmedSearchParam(params, "success")} />

      <ListFilters clearHref="/protocolos" fieldsClassName="xl:grid-cols-5">
        <FilterField htmlFor="search" label="Busca">
          <Input
            id="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Codigo ou assunto"
          />
        </FilterField>

        <FilterField htmlFor="status" label="Status">
          <Select id="status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos</option>
            <option value={ProtocolStatus.OPEN}>OPEN</option>
            <option value={ProtocolStatus.IN_PROGRESS}>IN_PROGRESS</option>
            <option value={ProtocolStatus.CLOSED}>CLOSED</option>
          </Select>
        </FilterField>

        {canReadAllProtocols(currentUser) ? (
          <FilterField htmlFor="createdById" label="Criador">
            <Select id="createdById" name="createdById" defaultValue={filters.createdById ?? ""}>
              <option value="">Todos</option>
              {creators.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name}
                </option>
              ))}
            </Select>
          </FilterField>
        ) : null}

        <FilterField htmlFor="dateFrom" label="Período inicial">
          <Input id="dateFrom" name="dateFrom" type="date" defaultValue={filters.dateFrom ?? ""} />
        </FilterField>

        <FilterField htmlFor="dateTo" label="Período final">
          <Input id="dateTo" name="dateTo" type="date" defaultValue={filters.dateTo ?? ""} />
        </FilterField>
      </ListFilters>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Total</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{totalProtocols}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Abertos</p>
          <p className="mt-3 text-3xl font-semibold text-primary">{openProtocols}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Em andamento</p>
          <p className="mt-3 text-3xl font-semibold text-[#a16800]">{inProgressProtocols}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">Fechados</p>
          <p className="mt-3 text-3xl font-semibold text-danger">{closedProtocols}</p>
        </div>
      </div>

      <SectionCard
        title="Lista de protocolos"
        description="Consulte código, assunto, status, criador e data de criação antes de seguir para a edição."
      >
        <div className="space-y-4">
          {protocols.length === 0 ? (
            <p className="text-sm text-[#4f6557]">Nenhum protocolo cadastrado.</p>
          ) : (
            protocols.map((protocol) => (
              <div key={protocol.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{protocol.subject}</h3>
                      <span className={getStatusBadgeClass(protocol.status)}>{protocolStatusLabels[protocol.status]}</span>
                    </div>

                    <div className="grid gap-3 text-sm text-[#415446] md:grid-cols-2 xl:grid-cols-5">
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Codigo</span>
                        {protocol.code}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Assunto</span>
                        {protocol.subject}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Status</span>
                        {protocolStatusLabels[protocol.status]}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Criado por</span>
                        {protocol.createdBy.name}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Criado em</span>
                        {protocol.createdAt.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {canEditProtocol(currentUser, protocol.createdBy.id) || canDeleteModule(currentUser, PermissionModule.protocolos) ? (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {canEditProtocol(currentUser, protocol.createdBy.id) ? (
                        <ButtonLink
                          href={buildPathWithParams(`/protocolos/${protocol.id}/editar`, { returnTo: currentPath })}
                          variant="secondary"
                        >
                          Editar
                        </ButtonLink>
                      ) : null}
                      {canDeleteModule(currentUser, PermissionModule.protocolos) ? (
                        <form action={deleteProtocolAction}>
                          <input type="hidden" name="id" value={protocol.id} />
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

