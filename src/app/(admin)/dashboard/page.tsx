import Link from "next/link";
import type { ReactNode } from "react";

import { CompactAgenda } from "@/components/dashboard/compact-agenda";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { formatDocumentIdentifier } from "@/lib/utils";
import { requireRouteAccess } from "@/lib/permissions";
import { getAgendaHomeEvents } from "@/modules/agenda/queries";
import { formatContractDate } from "@/modules/contracts/formatters";
import {
  getContractOperationalAlerts,
  getLicitationPendingItems,
  getProtocolOperationalItems,
  getRecentActivity,
} from "@/modules/dashboard/queries";
import { protocolStatusLabels } from "@/modules/protocols/schemas";

export const dynamic = "force-dynamic";

function getContractUrgencyTone(daysRemaining: number) {
  if (daysRemaining <= 15) {
    return "border-[#efcccc] bg-[#fff3f3] text-danger";
  }

  if (daysRemaining <= 30) {
    return "border-[#f0d9b1] bg-[#fff8ec] text-[#a16800]";
  }

  return "border-[#d7e1eb] bg-[#f4f8fb] text-[#31546d]";
}

function getRemainingDaysLabel(daysRemaining: number) {
  if (daysRemaining === 0) {
    return "hoje";
  }

  if (daysRemaining === 1) {
    return "1 dia";
  }

  return `${daysRemaining} dias`;
}

function ClickableRow({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block cursor-pointer rounded-2xl border border-border bg-background p-4 transition duration-200 hover:scale-[1.01] hover:border-primary/30 hover:bg-white"
    >
      {children}
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireRouteAccess("/dashboard");

  const [contractAlerts, licitationPendingItems, protocolItems, agendaItems, recentActivity] = await Promise.all([
    getContractOperationalAlerts(user),
    getLicitationPendingItems(user),
    getProtocolOperationalItems(user),
    getAgendaHomeEvents(user),
    getRecentActivity(user),
  ]);

  const expiringContracts = contractAlerts?.expiring ?? [];
  const pendingLicitations = licitationPendingItems ?? [];
  const agendaEvents = agendaItems.map((event) => ({
    dateKey: event.dateKey,
    kind: event.kind,
    markerType: event.markerType,
    module: event.module,
    sourceLabel: event.sourceLabel,
    title: event.title,
  }));

  return (
    <div className="space-y-8">
      <PageHeader title="Início" description="Visão operacional dos itens que precisam de atenção agora." />

      <section className="grid gap-6 xl:grid-cols-2">
        {expiringContracts.length > 0 ? (
          <SectionCard title="Contratos a vencer" description="Contratos ativos com até 60 dias para o fim da vigência atual.">
            <div className="space-y-3">
              {expiringContracts.map((contract) => (
                <ClickableRow key={contract.id} href={`/contratos/${contract.id}/editar`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">{contract.number}</p>
                      <p className="line-clamp-2 text-sm text-[#415446]">{contract.object}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getContractUrgencyTone(
                        contract.daysRemaining,
                      )}`}
                    >
                      {getRemainingDaysLabel(contract.daysRemaining)}
                    </span>
                  </div>
                </ClickableRow>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {pendingLicitations.length > 0 ? (
          <SectionCard title="Licitações com pendência" description="Processos com dados ou anexos faltantes.">
            <div className="space-y-3">
              {pendingLicitations.map((licitation) => (
                <ClickableRow key={licitation.id} href={`/licitacoes/${licitation.id}/editar`}>
                  <div className="space-y-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">{licitation.number}</p>
                      <p className="line-clamp-2 text-sm text-[#415446]">{licitation.object}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {licitation.issues.map((issue) => (
                        <span
                          key={issue}
                          className="rounded-full border border-[#f0d9b1] bg-[#fff8ec] px-3 py-1 text-xs font-semibold text-[#a16800]"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                </ClickableRow>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {protocolItems.length > 0 ? (
          <SectionCard title="Protocolos pendentes" description="Abertos e em andamento, ordenados pelos mais antigos.">
            <div className="space-y-3">
              {protocolItems.map((protocol) => (
                <ClickableRow key={protocol.id} href={`/protocolos/${protocol.id}/editar`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">{protocol.code}</p>
                      <p className="line-clamp-2 text-sm text-[#415446]">{protocol.subject}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#6b7f70]">{formatContractDate(protocol.createdAt)}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#d7e1eb] bg-[#f4f8fb] px-3 py-1 text-xs font-semibold text-[#31546d]">
                      {protocolStatusLabels[protocol.status]}
                    </span>
                  </div>
                </ClickableRow>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title="Agenda digital"
          description="Compromissos manuais e eventos automáticos do mês, conforme seus módulos liberados."
        >
          <CompactAgenda events={agendaEvents} />
        </SectionCard>
      </section>

      {recentActivity.length > 0 ? (
        <SectionCard title="Atividade recente" description="Últimos movimentos dos módulos acessíveis ao seu perfil.">
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <ClickableRow key={`${activity.module}-${activity.href}`} href={activity.href}>
                <div className="grid gap-3 md:grid-cols-[140px_1fr_auto] md:items-center">
                  <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4f6557]">
                    {activity.module}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{activity.identifier}</p>
                    <p className="line-clamp-1 text-sm text-[#415446]">
                      {activity.module === "Fornecedor" ? formatDocumentIdentifier(activity.summary) : activity.summary}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.14em] text-[#6b7f70]">{formatContractDate(activity.date)}</span>
                </div>
              </ClickableRow>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

