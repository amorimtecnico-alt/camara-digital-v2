import "server-only";

import { ContractStatus, LicitationStatus, ProtocolStatus } from "@prisma/client";

import { getSearchParam, type SearchParamsRecord } from "@/lib/list-navigation";
import { canAccessRoute } from "@/lib/permissions";
import { formatCurrencyValue, formatContractDate, getDaysUntil } from "@/modules/contracts/formatters";
import { getContractFormOptions } from "@/modules/contracts/queries";
import { contractStatusLabels } from "@/modules/contracts/schemas";
import { licitationModalityLabels, licitationStatusLabels } from "@/modules/licitation/schemas";
import { protocolStatusLabels } from "@/modules/protocols/schemas";
import {
  getContractsReport,
  getLicitationsReport,
  getProtocolsReport,
  type ReportsUser,
} from "@/modules/reports/queries";

type ReportType = "contratos" | "licitacoes" | "protocolos";

type FilterSummaryItem = {
  label: string;
  value: string;
};

export type PreparedReportData = {
  fileBaseName: string;
  filtersSummary: FilterSummaryItem[];
  generatedAtLabel: string;
  headers: string[];
  rows: string[][];
  title: string;
  totalRecords: number;
  type: ReportType;
};

function formatDateStamp(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatGeneratedAt(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function getAvailableReportTypes(currentUser: ReportsUser) {
  return ([
    canAccessRoute(currentUser, "/contratos") ? "contratos" : null,
    canAccessRoute(currentUser, "/licitacoes") ? "licitacoes" : null,
    canAccessRoute(currentUser, "/protocolos") ? "protocolos" : null,
  ].filter(Boolean) as ReportType[]);
}

function resolveReportType(value: string | undefined, allowedTypes: ReportType[]) {
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

function addPeriodFilters(filtersSummary: FilterSummaryItem[], dateFrom?: string, dateTo?: string) {
  if (dateFrom) {
    filtersSummary.push({
      label: "Período inicial",
      value: formatContractDate(new Date(`${dateFrom}T00:00:00`)),
    });
  }

  if (dateTo) {
    filtersSummary.push({
      label: "Período final",
      value: formatContractDate(new Date(`${dateTo}T00:00:00`)),
    });
  }
}

export async function getPreparedReportData(
  currentUser: ReportsUser,
  searchParams: SearchParamsRecord,
): Promise<PreparedReportData | null> {
  const availableTypes = getAvailableReportTypes(currentUser);
  const selectedType = resolveReportType(getSearchParam(searchParams, "type"), availableTypes);
  const prepared = getSearchParam(searchParams, "prepared") === "1";

  if (!prepared || !selectedType) {
    return null;
  }

  const dateFrom = getSearchParam(searchParams, "dateFrom") || undefined;
  const dateTo = getSearchParam(searchParams, "dateTo") || undefined;
  const generatedAtLabel = formatGeneratedAt();
  const fileBaseName = `relatorio-${selectedType}-${formatDateStamp()}`;
  const filtersSummary: FilterSummaryItem[] = [];

  addPeriodFilters(filtersSummary, dateFrom, dateTo);

  if (selectedType === "contratos") {
    const supplierId = getSearchParam(searchParams, "supplierId") || undefined;
    const contractStatus = getSearchParam(searchParams, "contractStatus");
    const suppliers = await getContractFormOptions();
    const supplier = supplierId ? suppliers.find((item) => item.id === supplierId) : null;
    const status = Object.values(ContractStatus).includes(contractStatus as ContractStatus)
      ? (contractStatus as ContractStatus)
      : undefined;

    if (supplier) {
      filtersSummary.push({ label: "Fornecedor", value: supplier.companyName });
    }

    if (status) {
      filtersSummary.push({ label: "Status", value: contractStatusLabels[status] });
    }

    const contracts = await getContractsReport(currentUser, {
      dateFrom,
      dateTo,
      status,
      supplierId,
    });

    return {
      type: selectedType,
      title: "Relatório de contratos",
      generatedAtLabel,
      fileBaseName,
      filtersSummary,
      totalRecords: contracts.length,
      headers: [
        "Número",
        "Objeto",
        "Fornecedor",
        "Status",
        "Data inicial",
        "Data final atual",
        "Valor atual",
        "Situação",
      ],
      rows: contracts.map((item) => {
        const effectiveEndDate = item.endDateCurrent ?? item.endDate;

        return [
          item.number,
          item.object,
          item.supplier?.companyName ?? "Não vinculado",
          contractStatusLabels[item.status],
          formatContractDate(item.startDate),
          formatContractDate(effectiveEndDate),
          formatCurrencyValue(item.currentValue ?? item.initialValue),
          getContractExpirationLabel(effectiveEndDate),
        ];
      }),
    };
  }

  if (selectedType === "licitacoes") {
    const winnerSupplierId = getSearchParam(searchParams, "winnerSupplierId") || undefined;
    const licitationStatus = getSearchParam(searchParams, "licitationStatus");
    const suppliers = await getContractFormOptions();
    const winnerSupplier = winnerSupplierId ? suppliers.find((item) => item.id === winnerSupplierId) : null;
    const status = Object.values(LicitationStatus).includes(licitationStatus as LicitationStatus)
      ? (licitationStatus as LicitationStatus)
      : undefined;

    if (winnerSupplier) {
      filtersSummary.push({ label: "Fornecedor vencedor", value: winnerSupplier.companyName });
    }

    if (status) {
      filtersSummary.push({ label: "Status", value: licitationStatusLabels[status] });
    }

    const licitations = await getLicitationsReport(currentUser, {
      dateFrom,
      dateTo,
      status,
      winnerSupplierId,
    });

    return {
      type: selectedType,
      title: "Relatório de licitações",
      generatedAtLabel,
      fileBaseName,
      filtersSummary,
      totalRecords: licitations.length,
      headers: [
        "Número",
        "Objeto",
        "Modalidade",
        "Status",
        "Fornecedor vencedor",
        "Valor estimado",
        "Valor adjudicado",
        "Data de publicação",
        "Data de abertura",
        "Contrato gerado",
      ],
      rows: licitations.map((item) => [
        item.number,
        item.object,
        licitationModalityLabels[item.modality],
        licitationStatusLabels[item.status],
        item.winnerSupplier?.companyName ?? "Não definido",
        formatCurrencyValue(item.estimatedValue),
        formatCurrencyValue(item.awardedValue),
        formatContractDate(item.publicationDate),
        formatContractDate(item.openingDate),
        item.contractGenerated ? "Sim" : "Não",
      ]),
    };
  }

  const protocolStatus = getSearchParam(searchParams, "protocolStatus");
  const status = Object.values(ProtocolStatus).includes(protocolStatus as ProtocolStatus)
    ? (protocolStatus as ProtocolStatus)
    : undefined;

  if (status) {
    filtersSummary.push({ label: "Status", value: protocolStatusLabels[status] });
  }

  const protocols = await getProtocolsReport(currentUser, {
    dateFrom,
    dateTo,
    status,
  });

  return {
    type: selectedType,
    title: "Relatório de protocolos",
    generatedAtLabel,
    fileBaseName,
    filtersSummary,
    totalRecords: protocols.length,
    headers: ["Código", "Assunto", "Status", "Criado por", "Data de criação"],
    rows: protocols.map((item) => [
      item.code,
      item.subject,
      protocolStatusLabels[item.status],
      item.createdBy.name,
      item.createdAt.toLocaleDateString("pt-BR"),
    ]),
  };
}
