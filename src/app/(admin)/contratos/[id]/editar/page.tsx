import { notFound } from "next/navigation";

import { PermissionModule, UserRole } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { canEditModule, requireModulePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import {
  deleteContractAttachmentAction,
  replaceContractAttachmentAction,
  updateContractAction,
} from "@/modules/contracts/actions";
import {
  getAttachmentCorrectionMessage,
  getAttachmentCorrectionStatus,
} from "@/modules/contracts/attachment-permissions";
import { ContractForm } from "@/modules/contracts/components/contract-form";
import {
  formatContractDate,
  formatContractDateTime,
  formatCurrencyValue,
  formatDateInput,
} from "@/modules/contracts/formatters";
import { getContractById, getContractFormOptions } from "@/modules/contracts/queries";
import { contractAmendmentTypeLabels, contractStatusLabels } from "@/modules/contracts/schemas";

export const dynamic = "force-dynamic";

type EditarContratoPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<SearchParamsRecord>;
};

export default async function EditarContratoPage({ params, searchParams }: EditarContratoPageProps) {
  const currentUser = await requireModulePermission(PermissionModule.contratos, "edit");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = resolveReturnTo(getSearchParam(query, "returnTo"), "/contratos");
  const [contract, suppliers] = await Promise.all([getContractById(id), getContractFormOptions()]);

  if (!contract) {
    notFound();
  }

  const attachmentStatus = getAttachmentCorrectionStatus({
    attachmentUploadedAt: contract.attachmentUploadedAt,
    role: currentUser.role,
  });
  const attachmentMessage = getAttachmentCorrectionMessage({
    attachmentUploadedAt: contract.attachmentUploadedAt,
    role: currentUser.role,
  });
  const showAdminJustification = currentUser.role === UserRole.ADMIN && attachmentStatus.requiresAdminJustification;
  const canEditContracts = canEditModule(currentUser, PermissionModule.contratos);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Editar contrato"
          description="Atualize dados originais, anexo principal e acompanhe o histórico completo de aditivos."
        />
        <div className="flex flex-wrap gap-2">
          {canEditContracts ? <ButtonLink href={`/contratos/${contract.id}/aditivos/novo`}>Novo aditivo</ButtonLink> : null}
          <ButtonLink href={returnTo} variant="secondary">
            Voltar para lista
          </ButtonLink>
        </div>
      </div>

      <StatusMessage error={getSearchParam(query, "error")} success={getSearchParam(query, "success")} />

      <SectionCard
        title={contract.number}
        description={`Status atual: ${contractStatusLabels[contract.status]}.`}
      >
        <ContractForm
          action={updateContractAction}
          returnTo={returnTo}
          suppliers={suppliers}
          submitLabel="Salvar alteracoes"
          contract={{
            id: contract.id,
            number: contract.number,
            object: contract.object,
            status: contract.status,
            supplierId: contract.supplierId,
            startDate: formatDateInput(contract.startDate),
            endDate: formatDateInput(contract.endDate),
            endDateCurrent: formatDateInput(contract.endDateCurrent),
            initialValue: contract.initialValue?.toString() ?? "",
            currentValue: contract.currentValue?.toString() ?? "",
            notes: contract.notes ?? "",
            attachmentName: contract.attachmentName,
            attachmentPath: contract.attachmentPath,
            attachmentUploadedAt: contract.attachmentUploadedAt ? contract.attachmentUploadedAt.toISOString().slice(0, 10) : "",
          }}
        />
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Dados vigentes"
          description="Esses campos sao atualizados automaticamente conforme os aditivos cadastrados."
        >
          <div className="grid gap-4 text-sm text-[#415446] md:grid-cols-2">
            <p>
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Fornecedor</span>
              {contract.supplier?.companyName ?? "Não vinculado"}
            </p>
            <p>
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Data inicial</span>
              {formatContractDate(contract.startDate)}
            </p>
            <p>
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Data final inicial</span>
              {formatContractDate(contract.endDate)}
            </p>
            <p>
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Data final atual</span>
              {formatContractDate(contract.endDateCurrent)}
            </p>
            <p>
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Valor inicial</span>
              {formatCurrencyValue(contract.initialValue)}
            </p>
            <p>
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Valor atual</span>
              {formatCurrencyValue(contract.currentValue)}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Anexo principal"
          description="Visualize o estado da janela de correcao e gerencie substituicao ou exclusao do PDF principal."
        >
          {contract.attachmentPath ? (
            <div className="space-y-5 text-sm text-[#415446]">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-medium text-foreground">{contract.attachmentName ?? "PDF do contrato"}</p>
                <p className="mt-2">Upload em: {formatContractDateTime(contract.attachmentUploadedAt)}</p>
                <p className="mt-1">
                  Janela de correcao: {attachmentStatus.withinWindow ? "aberta" : "expirada"}
                </p>
                {attachmentStatus.deadline ? (
                  <p className="mt-1">Limite da janela: {formatContractDateTime(attachmentStatus.deadline)}</p>
                ) : null}
                <p className="mt-3 rounded-xl bg-surface px-3 py-2">{attachmentMessage}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={contract.attachmentPath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary underline underline-offset-2"
                  >
                    Abrir PDF
                  </a>
                  <a
                    href={contract.attachmentPath}
                    download={contract.attachmentName ?? undefined}
                    className="text-sm font-medium text-primary underline underline-offset-2"
                  >
                    Baixar arquivo
                  </a>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <form
                  action={replaceContractAttachmentAction}
                  encType="multipart/form-data"
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  <input type="hidden" name="contractId" value={contract.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <p className="text-sm font-semibold text-foreground">Substituir anexo</p>
                  <p className="mt-1 text-sm text-[#4f6557]">
                    {attachmentStatus.canModify
                      ? "Envie um novo PDF para substituir o arquivo atual."
                      : "Substituicao bloqueada para este perfil apos o prazo de 15 minutos."}
                  </p>

                  <div className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="replaceAttachmentFile" className="text-sm font-medium">
                        Novo PDF
                      </label>
                      <input
                        id="replaceAttachmentFile"
                        name="attachmentFile"
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={!attachmentStatus.canModify}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>

                    {showAdminJustification ? (
                      <div className="space-y-1.5">
                        <label htmlFor="replaceJustification" className="text-sm font-medium">
                          Justificativa obrigatoria do ADMIN
                        </label>
                        <textarea
                          id="replaceJustification"
                          name="justification"
                          rows={4}
                          required
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm"
                          placeholder="Explique por que o anexo principal esta sendo substituido fora da janela."
                        />
                      </div>
                    ) : null}

                    <Button disabled={!attachmentStatus.canModify}>Substituir anexo</Button>
                  </div>
                </form>

                <form action={deleteContractAttachmentAction} className="rounded-2xl border border-border bg-background p-4">
                  <input type="hidden" name="contractId" value={contract.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <p className="text-sm font-semibold text-foreground">Excluir anexo</p>
                  <p className="mt-1 text-sm text-[#4f6557]">
                    {attachmentStatus.canModify
                      ? "Remove o PDF atual e limpa os metadados do anexo principal."
                      : "Exclusao bloqueada para este perfil apos o prazo de 15 minutos."}
                  </p>

                  <div className="mt-4 space-y-4">
                    {showAdminJustification ? (
                      <div className="space-y-1.5">
                        <label htmlFor="deleteJustification" className="text-sm font-medium">
                          Justificativa obrigatoria do ADMIN
                        </label>
                        <textarea
                          id="deleteJustification"
                          name="justification"
                          rows={4}
                          required
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm"
                          placeholder="Explique por que o anexo principal esta sendo excluido fora da janela."
                        />
                      </div>
                    ) : null}

                    <Button variant="danger" disabled={!attachmentStatus.canModify}>
                      Excluir anexo
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-[#415446]">
              <p className="text-sm text-[#4f6557]">Nenhum arquivo principal enviado para este contrato.</p>

              <form
                action={replaceContractAttachmentAction}
                encType="multipart/form-data"
                className="rounded-2xl border border-border bg-background p-4"
              >
                <input type="hidden" name="contractId" value={contract.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <p className="text-sm font-semibold text-foreground">Enviar anexo principal</p>
                <p className="mt-1 text-sm text-[#4f6557]">
                  O primeiro upload define o inicio da janela de correcao de 15 minutos para perfis nao ADMIN.
                </p>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="firstAttachmentFile" className="text-sm font-medium">
                      PDF do contrato
                    </label>
                    <input
                      id="firstAttachmentFile"
                      name="attachmentFile"
                      type="file"
                      accept="application/pdf,.pdf"
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm"
                    />
                  </div>
                  <Button>Enviar anexo</Button>
                </div>
              </form>
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Auditoria do anexo principal"
        description="Todas as substituicoes e exclusoes do anexo principal ficam registradas com usuario, horario e justificativa."
      >
        <div className="space-y-4">
          {contract.attachmentAuditLogs.length === 0 ? (
            <p className="text-sm text-[#4f6557]">Nenhum log de alteracao do anexo principal foi registrado.</p>
          ) : (
            contract.attachmentAuditLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="grid gap-3 text-sm text-[#415446] md:grid-cols-2 xl:grid-cols-3">
                  <p>
                    <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Acao</span>
                    {log.action === "SUBSTITUIU_ANEXO" ? "Substituiu anexo" : "Excluiu anexo"}
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Usuario</span>
                    {log.user.name} ({log.user.role})
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Data/hora</span>
                    {formatContractDateTime(log.createdAt)}
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Arquivo anterior</span>
                    {log.previousFileName ?? "Não informado"}
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Arquivo novo</span>
                    {log.newFileName ?? "Não informado"}
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Justificativa</span>
                    {log.justification ?? "Nao informada"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Historico de aditivos"
        description="Cada aditivo preserva os dados anteriores e pode atualizar prazo e valor vigentes."
      >
        <div className="mb-5">
          {canEditContracts ? <ButtonLink href={`/contratos/${contract.id}/aditivos/novo`}>Cadastrar aditivo</ButtonLink> : null}
        </div>

        <div className="space-y-4">
          {contract.amendments.length === 0 ? (
            <p className="text-sm text-[#4f6557]">Nenhum aditivo cadastrado para este contrato.</p>
          ) : (
            contract.amendments.map((amendment) => (
              <div key={amendment.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{amendment.number}</h3>
                      <span className="rounded-full bg-[#eef1f4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4b5c68]">
                        {contractAmendmentTypeLabels[amendment.type]}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-[#415446] md:grid-cols-2 xl:grid-cols-4">
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Data</span>
                        {formatContractDate(amendment.amendmentDate)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Prazo</span>
                        {formatContractDate(amendment.previousEndDate)} {" -> "} {formatContractDate(amendment.newEndDate)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Valor</span>
                        {formatCurrencyValue(amendment.previousValue)} {" -> "} {formatCurrencyValue(amendment.newValue)}
                      </p>
                      <p>
                        <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Arquivo</span>
                        {amendment.attachmentPath ? "PDF disponivel" : "Sem arquivo"}
                      </p>
                    </div>

                    <p className="text-sm text-[#415446]">{amendment.description}</p>

                    {amendment.attachmentPath ? (
                      <div className="flex flex-wrap gap-3">
                        <a
                          href={amendment.attachmentPath}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary underline underline-offset-2"
                        >
                          Abrir PDF
                        </a>
                        <a
                          href={amendment.attachmentPath}
                          download={amendment.attachmentName ?? undefined}
                          className="text-sm font-medium text-primary underline underline-offset-2"
                        >
                          Baixar arquivo
                        </a>
                      </div>
                    ) : null}
                  </div>

                  {canEditContracts ? (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <ButtonLink href={`/contratos/${contract.id}/aditivos/${amendment.id}/editar`} variant="secondary">
                        Editar aditivo
                      </ButtonLink>
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
