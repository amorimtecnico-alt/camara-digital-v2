import type { ReactNode } from "react";
import Form from "next/form";
import { ContractStatus, LicitationStatus, ProtocolStatus } from "@prisma/client";

import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Select } from "@/components/ui/select";
import { getSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { canAccessRoute, requireRouteAccess } from "@/lib/permissions";
import { formatCurrencyValue, formatContractDate, getDaysUntil } from "@/modules/contracts/formatters";
import { getContractFormOptions } from "@/modules/contracts/queries";
import { contractStatusLabels } from "@/modules/contracts/schemas";
import { licitationModalityLabels, licitationStatusLabels } from "@/modules/licitation/schemas";
import { protocolStatusLabels } from "@/modules/protocols/schemas";
import { ReportExportActions } from "@/modules/reports/components/report-export-actions";
import { ReportSubmitButton } from "@/modules/reports/components/report-submit-button";
import {
  getContractsReport,
  getLicitationsReport,
  getProtocolsReport,
  type ReportsUser,
} from "@/modules/reports/queries";

export const dynamic = "force-dynamic";

type RelatoriosPageProps = {
  searchParams: Promise<SearchParamsRecord>;
};

type ReportType = "contratos" | "licitacoes" | "protocolos";

function buildExportHref(params: Record<string, string | undefined>, format: "pdf" | "xlsx") {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  searchParams.set("format", format);

  return `/api/reports/export?${searchParams.toString()}`;
}

function getAvailableReportTypes(currentUser: ReportsUser) {
  return ([
    canAccessRoute(currentUser, "/contratos") ? { value: "contratos", label: "Contratos" } : null,
    canAccessRoute(currentUser, "/licitacoes") ? { value: "licitacoes", label: "Licitações" } : null,
    canAccessRoute(currentUser, "/protocolos") ? { value: "protocolos", label: "Protocolos" } : null,
  ].filter(Boolean) as { value: ReportType; label: string }[]);
}

function resolveReportType(value: string | undefined, allowedTypes: ReportType[]): ReportType | null {
  if (value && allowedTypes.includes(value as ReportType)) {
    return value as ReportType;
  }

  return allowedTypes[0] ?? null;
}

function getContractExpirationLabel(endDate: Date | null | undefined) {
  if (!endDate) {
    return "Sem vigência informada";
  }

  const daysUntil = getDaysUntil(endDate);

  if (daysUntil < 0) {
    return `Vencido há ${Math.abs(daysUntil)} dia(s)`;
  }

  if (daysUntil === 0) {
    return "Vence hoje";
  }

  return `Vence em ${daysUntil} dia(s)`;
}

function EmptyResults({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-border bg-background px-6 py-10 text-center">
      <p className="text-sm text-foreground/70">{message}</p>
    </div>
  );
}

function ContractsReportTable({
  items,
}: {
  items: Awaited<ReturnType<typeof getContractsReport>>;
}) {
  return (
    <div className="overflow-x-auto rounded-[24px] border border-border bg-background">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-surface-muted/60 text-xs uppercase tracking-[0.14em] text-foreground/65">
          <tr>
            <th className="px-4 py-3">Número</th>
            <th className="px-4 py-3">Objeto</th>
            <th className="px-4 py-3">Fornecedor</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Data inicial</th>
            <th className="px-4 py-3">Data final atual</th>
            <th className="px-4 py-3">Valor atual</th>
            <th className="px-4 py-3">Situação</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const effectiveEndDate = item.endDateCurrent ?? item.endDate;

            return (
              <tr key={item.id} className="border-t border-border align-top">
                <td className="px-4 py-3 font-semibold text-foreground">{item.number}</td>
                <td className="px-4 py-3 text-foreground/75">{item.object}</td>
                <td className="px-4 py-3 text-foreground/75">{item.supplier?.companyName ?? "Não vinculado"}</td>
                <td className="px-4 py-3 text-foreground/75">{contractStatusLabels[item.status]}</td>
                <td className="px-4 py-3 text-foreground/75">{formatContractDate(item.startDate)}</td>
                <td className="px-4 py-3 text-foreground/75">{formatContractDate(effectiveEndDate)}</td>
                <td className="px-4 py-3 text-foreground/75">{formatCurrencyValue(item.currentValue ?? item.initialValue)}</td>
                <td className="px-4 py-3 text-foreground/75">{getContractExpirationLabel(effectiveEndDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LicitationsReportTable({
  items,
}: {
  items: Awaited<ReturnType<typeof getLicitationsReport>>;
}) {
  return (
    <div className="overflow-x-auto rounded-[24px] border border-border bg-background">
      <table className="min-w-[1120px] w-full text-left text-sm">
        <thead className="bg-surface-muted/60 text-xs uppercase tracking-[0.14em] text-foreground/65">
          <tr>
            <th className="px-4 py-3">Número</th>
            <th className="px-4 py-3">Objeto</th>
            <th className="px-4 py-3">Modalidade</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Fornecedor vencedor</th>
            <th className="px-4 py-3">Valor estimado</th>
            <th className="px-4 py-3">Valor adjudicado</th>
            <th className="px-4 py-3">Data de publicação</th>
            <th className="px-4 py-3">Data de abertura</th>
            <th className="px-4 py-3">Contrato gerado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border align-top">
              <td className="px-4 py-3 font-semibold text-foreground">{item.number}</td>
              <td className="px-4 py-3 text-foreground/75">{item.object}</td>
              <td className="px-4 py-3 text-foreground/75">{licitationModalityLabels[item.modality]}</td>
              <td className="px-4 py-3 text-foreground/75">{licitationStatusLabels[item.status]}</td>
              <td className="px-4 py-3 text-foreground/75">{item.winnerSupplier?.companyName ?? "Não definido"}</td>
              <td className="px-4 py-3 text-foreground/75">{formatCurrencyValue(item.estimatedValue)}</td>
              <td className="px-4 py-3 text-foreground/75">{formatCurrencyValue(item.awardedValue)}</td>
              <td className="px-4 py-3 text-foreground/75">{formatContractDate(item.publicationDate)}</td>
              <td className="px-4 py-3 text-foreground/75">{formatContractDate(item.openingDate)}</td>
              <td className="px-4 py-3 text-foreground/75">{item.contractGenerated ? "Sim" : "Não"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProtocolsReportTable({
  items,
}: {
  items: Awaited<ReturnType<typeof getProtocolsReport>>;
}) {
  return (
    <div className="overflow-x-auto rounded-[24px] border border-border bg-background">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead className="bg-surface-muted/60 text-xs uppercase tracking-[0.14em] text-foreground/65">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Assunto</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Criado por</th>
            <th className="px-4 py-3">Data de criação</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border align-top">
              <td className="px-4 py-3 font-semibold text-foreground">{item.code}</td>
              <td className="px-4 py-3 text-foreground/75">{item.subject}</td>
              <td className="px-4 py-3 text-foreground/75">{protocolStatusLabels[item.status]}</td>
              <td className="px-4 py-3 text-foreground/75">{item.createdBy.name}</td>
              <td className="px-4 py-3 text-foreground/75">{item.createdAt.toLocaleDateString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RelatoriosPage({ searchParams }: RelatoriosPageProps) {
  const currentUser = (await requireRouteAccess("/relatorios")) as ReportsUser;
  const params = await searchParams;
  const availableTypes = getAvailableReportTypes(currentUser);
  const selectedType = resolveReportType(getSearchParam(params, "type"), availableTypes.map((item) => item.value));
  const prepared = getSearchParam(params, "prepared") === "1";
  const dateFrom = getSearchParam(params, "dateFrom");
  const dateTo = getSearchParam(params, "dateTo");
  const supplierId = getSearchParam(params, "supplierId");
  const contractStatus = getSearchParam(params, "contractStatus");
  const licitationStatus = getSearchParam(params, "licitationStatus");
  const winnerSupplierId = getSearchParam(params, "winnerSupplierId");
  const protocolStatus = getSearchParam(params, "protocolStatus");

  const suppliers = availableTypes.some((type) => type.value === "contratos" || type.value === "licitacoes")
    ? await getContractFormOptions()
    : [];

  const exportParams = {
    prepared: prepared ? "1" : undefined,
    type: selectedType ?? undefined,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    supplierId: supplierId ?? undefined,
    contractStatus: contractStatus ?? undefined,
    licitationStatus: licitationStatus ?? undefined,
    winnerSupplierId: winnerSupplierId ?? undefined,
    protocolStatus: protocolStatus ?? undefined,
  };

  const excelExportHref = buildExportHref(exportParams, "xlsx");
  const pdfExportHref = buildExportHref(exportParams, "pdf");

  let reportTitle = "Resultados";
  let totalRecords = 0;
  let reportContent: ReactNode = null;

  if (prepared && selectedType === "contratos") {
    const contracts = await getContractsReport(currentUser, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: Object.values(ContractStatus).includes(contractStatus as ContractStatus)
        ? (contractStatus as ContractStatus)
        : undefined,
      supplierId: supplierId || undefined,
    });

    reportTitle = "Relatório de contratos";
    totalRecords = contracts.length;
    reportContent =
      contracts.length > 0 ? (
        <ContractsReportTable items={contracts} />
      ) : (
        <EmptyResults message="Nenhum contrato encontrado para os filtros selecionados." />
      );
  }

  if (prepared && selectedType === "licitacoes") {
    const licitations = await getLicitationsReport(currentUser, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: Object.values(LicitationStatus).includes(licitationStatus as LicitationStatus)
        ? (licitationStatus as LicitationStatus)
        : undefined,
      winnerSupplierId: winnerSupplierId || undefined,
    });

    reportTitle = "Relatório de licitações";
    totalRecords = licitations.length;
    reportContent =
      licitations.length > 0 ? (
        <LicitationsReportTable items={licitations} />
      ) : (
        <EmptyResults message="Nenhuma licitação encontrada para os filtros selecionados." />
      );
  }

  if (prepared && selectedType === "protocolos") {
    const protocols = await getProtocolsReport(currentUser, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: Object.values(ProtocolStatus).includes(protocolStatus as ProtocolStatus)
        ? (protocolStatus as ProtocolStatus)
        : undefined,
    });

    reportTitle = "Relatório de protocolos";
    totalRecords = protocols.length;
    reportContent =
      protocols.length > 0 ? (
        <ProtocolsReportTable items={protocols} />
      ) : (
        <EmptyResults message="Nenhum protocolo encontrado para os filtros selecionados." />
      );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relatórios"
        description="Prepare consultas com dados reais do sistema. Você pode exportar exatamente o resultado filtrado em PDF ou Excel."
      />

      {availableTypes.length === 0 ? (
        <SectionCard
          title="Relatórios indisponíveis"
          description="Seu perfil não possui acesso aos módulos compatíveis com relatórios."
        >
          <EmptyResults message="Não há relatórios disponíveis para o seu perfil no momento." />
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Filtros do relatório"
            description="Selecione o tipo, aplique os filtros e prepare a consulta com dados reais."
          >
            <Form action="" className="space-y-5">
              <input type="hidden" name="prepared" value="1" />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1.5">
                  <label htmlFor="type" className="text-sm font-medium">
                    Tipo
                  </label>
                  <Select id="type" name="type" defaultValue={selectedType ?? availableTypes[0]?.value}>
                    {availableTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="dateFrom" className="text-sm font-medium">
                    Período inicial
                  </label>
                  <Input id="dateFrom" name="dateFrom" type="date" defaultValue={dateFrom ?? ""} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="dateTo" className="text-sm font-medium">
                    Período final
                  </label>
                  <Input id="dateTo" name="dateTo" type="date" defaultValue={dateTo ?? ""} />
                </div>

                {selectedType === "contratos" ? (
                  <div className="space-y-1.5">
                    <label htmlFor="supplierId" className="text-sm font-medium">
                      Fornecedor
                    </label>
                    <Select id="supplierId" name="supplierId" defaultValue={supplierId ?? ""}>
                      <option value="">Todos</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.companyName}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}

                {selectedType === "licitacoes" ? (
                  <div className="space-y-1.5">
                    <label htmlFor="winnerSupplierId" className="text-sm font-medium">
                      Fornecedor vencedor
                    </label>
                    <Select id="winnerSupplierId" name="winnerSupplierId" defaultValue={winnerSupplierId ?? ""}>
                      <option value="">Todos</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.companyName}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {selectedType === "contratos" ? (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">Status de contratos</p>
                    <Select name="contractStatus" className="mt-3" defaultValue={contractStatus ?? ""}>
                      <option value="">Todos</option>
                      {Object.values(ContractStatus).map((status) => (
                        <option key={status} value={status}>
                          {contractStatusLabels[status]}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}

                {selectedType === "licitacoes" ? (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">Status de licitações</p>
                    <Select name="licitationStatus" className="mt-3" defaultValue={licitationStatus ?? ""}>
                      <option value="">Todos</option>
                      {Object.values(LicitationStatus).map((status) => (
                        <option key={status} value={status}>
                          {licitationStatusLabels[status]}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}

                {selectedType === "protocolos" ? (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">Status de protocolos</p>
                    <Select name="protocolStatus" className="mt-3" defaultValue={protocolStatus ?? ""}>
                      <option value="">Todos</option>
                      {Object.values(ProtocolStatus).map((status) => (
                        <option key={status} value={status}>
                          {protocolStatusLabels[status]}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-background p-4">
                <p className="text-sm text-foreground/70">
                  Os resultados são exibidos na própria tela. A exportação usa exatamente os mesmos filtros aplicados.
                </p>
                <ReportSubmitButton />
              </div>
            </Form>
          </SectionCard>

          <SectionCard
            title={reportTitle}
            description={prepared ? `${totalRecords} registro(s) encontrado(s).` : "Os resultados aparecem aqui após preparar o relatório."}
          >
            {prepared && totalRecords > 0 ? (
              <div className="mb-4 flex justify-end">
                <ReportExportActions excelHref={excelExportHref} pdfHref={pdfExportHref} />
              </div>
            ) : null}

            {prepared ? reportContent : <EmptyResults message="Selecione os filtros desejados e clique em Preparar relatório." />}
          </SectionCard>
        </>
      )}
    </div>
  );
}
