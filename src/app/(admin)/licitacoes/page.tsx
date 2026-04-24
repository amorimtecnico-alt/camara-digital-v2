import { LicitationModality, LicitationStatus, PermissionModule } from "@prisma/client";

import { FilterField, ListFilters } from "@/components/filters/list-filters";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { canCreateModule, canDeleteModule, canEditModule, requireRouteAccess } from "@/lib/permissions";
import { buildPathWithParams, getTrimmedSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { formatCurrencyValue, formatContractDate } from "@/modules/contracts/formatters";
import { formatDocumentIdentifier } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Select } from "@/components/ui/select";
import { StatusMessage } from "@/components/ui/status-message";
import { deleteLicitationAction } from "@/modules/licitation/actions";
import { getLicitationsList, type LicitationListFilters } from "@/modules/licitation/queries";
import { licitationModalityLabels, licitationStatusLabels } from "@/modules/licitation/schemas";

export const dynamic = "force-dynamic";

type LicitacoesPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

function getStatusBadgeClass(status: LicitationStatus) {
  if (status === LicitationStatus.PUBLICADO || status === LicitationStatus.CONTRATADO) {
    return "rounded-full bg-[#e5f4e9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary";
  }

  if (status === LicitationStatus.EM_ANDAMENTO || status === LicitationStatus.HOMOLOGADO) {
    return "rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a16800]";
  }

  if (status === LicitationStatus.CANCELADO) {
    return "rounded-full bg-[#fdecec] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-danger";
  }

  return "rounded-full bg-[#eef1f4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4b5c68]";
}

export default async function LicitacoesPage({ searchParams }: LicitacoesPageProps) {
  const currentUser = await requireRouteAccess("/licitacoes");
  const params = await searchParams;
  const search = getTrimmedSearchParam(params, "search");
  const status = getTrimmedSearchParam(params, "status");
  const modality = getTrimmedSearchParam(params, "modality");
  const winner = getTrimmedSearchParam(params, "winner");
  const contractGenerated = getTrimmedSearchParam(params, "contractGenerated");

  const filters: LicitationListFilters = {
    contractGenerated: contractGenerated === "yes" || contractGenerated === "no" ? contractGenerated : undefined,
    modality: Object.values(LicitationModality).includes(modality as LicitationModality)
      ? (modality as LicitationModality)
      : undefined,
    search,
    status: Object.values(LicitationStatus).includes(status as LicitationStatus)
      ? (status as LicitationStatus)
      : undefined,
    winner: winner === "with_winner" || winner === "without_winner" ? winner : undefined,
  };
  const currentPath = buildPathWithParams("/licitacoes", {
    contractGenerated: filters.contractGenerated,
    modality: filters.modality,
    search: filters.search,
    status: filters.status,
    winner: filters.winner,
  });
  const licitations = await getLicitationsList(filters);

  const total = licitations.length;
  const published = licitations.filter((item) => item.status === LicitationStatus.PUBLICADO).length;
  const inProgress = licitations.filter((item) => item.status === LicitationStatus.EM_ANDAMENTO).length;
  const homologated = licitations.filter((item) => item.status === LicitationStatus.HOMOLOGADO).length;
  const contracted = licitations.filter((item) => item.status === LicitationStatus.CONTRATADO).length;
  const cancelled = licitations.filter((item) => item.status === LicitationStatus.CANCELADO).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Licitações"
          description="Gerencie editais, homologacoes, fornecedor vencedor e situação contratual do processo."
        />
        {canCreateModule(currentUser, PermissionModule.licitacoes) ? (
          <ButtonLink href={buildPathWithParams("/licitacoes/novo", { returnTo: currentPath })}>
            Nova licitação
          </ButtonLink>
        ) : null}
      </div>

      <StatusMessage error={getTrimmedSearchParam(params, "error")} success={getTrimmedSearchParam(params, "success")} />

      <ListFilters clearHref="/licitacoes">
        <FilterField htmlFor="search" label="Busca">
          <Input
            id="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Numero ou objeto"
          />
        </FilterField>

        <FilterField htmlFor="status" label="Status">
          <Select id="status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos</option>
            <option value={LicitationStatus.RASCUNHO}>RASCUNHO</option>
            <option value={LicitationStatus.PUBLICADO}>PUBLICADO</option>
            <option value={LicitationStatus.EM_ANDAMENTO}>EM_ANDAMENTO</option>
            <option value={LicitationStatus.HOMOLOGADO}>HOMOLOGADO</option>
            <option value={LicitationStatus.CONTRATADO}>CONTRATADO</option>
            <option value={LicitationStatus.CANCELADO}>CANCELADO</option>
          </Select>
        </FilterField>

        <FilterField htmlFor="modality" label="Modalidade">
          <Select id="modality" name="modality" defaultValue={filters.modality ?? ""}>
            <option value="">Todas</option>
            <option value={LicitationModality.PREGAO}>PREGAO</option>
            <option value={LicitationModality.CONCORRENCIA}>CONCORRENCIA</option>
            <option value={LicitationModality.TOMADA_DE_PRECO}>TOMADA_DE_PRECO</option>
            <option value={LicitationModality.DISPENSA}>DISPENSA</option>
            <option value={LicitationModality.INEXIGIBILIDADE}>INEXIGIBILIDADE</option>
            <option value={LicitationModality.OUTRO}>OUTRO</option>
          </Select>
        </FilterField>

        <FilterField htmlFor="winner" label="Fornecedor vencedor">
          <Select id="winner" name="winner" defaultValue={filters.winner ?? ""}>
            <option value="">Todos</option>
            <option value="with_winner">Com vencedor</option>
            <option value="without_winner">Sem vencedor</option>
          </Select>
        </FilterField>

        <FilterField htmlFor="contractGenerated" label="Contrato gerado">
          <Select id="contractGenerated" name="contractGenerated" defaultValue={filters.contractGenerated ?? ""}>
            <option value="">Todos</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </Select>
        </FilterField>
      </ListFilters>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Total", value: total },
          { label: "Publicadas", value: published },
          { label: "Em andamento", value: inProgress },
          { label: "Homologadas", value: homologated },
          { label: "Contratadas", value: contracted },
          { label: "Canceladas", value: cancelled },
        ].map((card) => (
          <div key={card.label} className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#5f7365]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <SectionCard
        title="Lista de licitacoes"
        description="Consulte modalidade, status, valores, vencedor e situação dos anexos antes de abrir a edição."
      >
        <div className="space-y-4">
          {licitations.length === 0 ? (
            <p className="text-sm text-[#4f6557]">Nenhuma licitação cadastrada.</p>
          ) : (
            licitations.map((licitation) => (
              <div key={licitation.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{licitation.number}</h3>
                      <span className={getStatusBadgeClass(licitation.status)}>
                        {licitationStatusLabels[licitation.status]}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-[#415446] md:grid-cols-2 xl:grid-cols-5">
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Objeto</span>
                        {licitation.object}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Modalidade</span>
                        {licitationModalityLabels[licitation.modality]}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Publicacao</span>
                        {formatContractDate(licitation.publicationDate)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Abertura</span>
                        {formatContractDate(licitation.openingDate)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Valor estimado</span>
                        {formatCurrencyValue(licitation.estimatedValue)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Valor adjudicado</span>
                        {formatCurrencyValue(licitation.awardedValue)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Fornecedor vencedor</span>
                        {licitation.winnerSupplier?.companyName ?? "Não definido"}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Documento</span>
                        {formatDocumentIdentifier(licitation.winnerSupplier?.document)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Contrato gerado</span>
                        {licitation.contractGenerated ? "Sim" : "Nao"}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Anexos</span>
                        {licitation.editalFilePath ? "Edital OK" : "Sem edital"} /{" "}
                        {licitation.homologationFilePath ? "Homologacao OK" : "Sem homologacao"}
                      </p>
                    </div>
                  </div>

                  {canEditModule(currentUser, PermissionModule.licitacoes) || canDeleteModule(currentUser, PermissionModule.licitacoes) ? (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {canEditModule(currentUser, PermissionModule.licitacoes) ? (
                        <ButtonLink
                          href={buildPathWithParams(`/licitacoes/${licitation.id}/editar`, { returnTo: currentPath })}
                          variant="secondary"
                        >
                          Editar
                        </ButtonLink>
                      ) : null}
                      {canDeleteModule(currentUser, PermissionModule.licitacoes) ? (
                        <form action={deleteLicitationAction}>
                          <input type="hidden" name="id" value={licitation.id} />
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

