import { notFound } from "next/navigation";
import { PermissionModule } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { requireModulePermission } from "@/lib/permissions";
import { getSearchParam, resolveReturnTo, type SearchParamsRecord } from "@/lib/list-navigation";
import { formatDocumentIdentifier } from "@/lib/utils";
import { formatContractDate, formatDateInput, formatCurrencyValue } from "@/modules/contracts/formatters";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusMessage } from "@/components/ui/status-message";
import {
  deleteLicitationAttachmentAction,
  replaceLicitationAttachmentAction,
  updateLicitationAction,
} from "@/modules/licitation/actions";
import { LicitationForm } from "@/modules/licitation/components/licitation-form";
import { getLicitationById, getLicitationFormOptions } from "@/modules/licitation/queries";
import { licitationModalityLabels, licitationStatusLabels } from "@/modules/licitation/schemas";

export const dynamic = "force-dynamic";

type EditarLicitacaoPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<SearchParamsRecord>;
};

type AttachmentPanelProps = {
  licitationId: string;
  title: string;
  attachmentType: "edital" | "homologation";
  fileName: string | null;
  filePath: string | null;
  returnTo: string;
  uploadedAt: Date | null;
};

function AttachmentPanel({
  attachmentType,
  fileName,
  filePath,
  licitationId,
  returnTo,
  title,
  uploadedAt,
}: AttachmentPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 text-sm text-[#415446]">
      <p className="text-xs uppercase tracking-[0.18em] text-[#5f7365]">{title}</p>

      {filePath ? (
        <>
          <p className="mt-3 font-medium text-foreground">{fileName ?? "PDF"}</p>
          <p className="mt-1">Upload em: {formatContractDate(uploadedAt)}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={filePath}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary underline underline-offset-2"
            >
              Abrir PDF
            </a>
            <a
              href={filePath}
              download={fileName ?? undefined}
              className="text-sm font-medium text-primary underline underline-offset-2"
            >
              Baixar arquivo
            </a>
          </div>
        </>
      ) : (
        <p className="mt-3">Nenhum arquivo enviado.</p>
      )}

      <form action={replaceLicitationAttachmentAction} encType="multipart/form-data" className="mt-4 space-y-3">
        <input type="hidden" name="licitationId" value={licitationId} />
        <input type="hidden" name="attachmentType" value={attachmentType} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="space-y-1.5">
          <label htmlFor={`${attachmentType}File`} className="text-sm font-medium">
            {filePath ? "Substituir PDF" : "Enviar PDF"}
          </label>
          <input
            id={`${attachmentType}File`}
            name="attachmentFile"
            type="file"
            accept="application/pdf,.pdf"
            className="w-full cursor-pointer rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm"
          />
        </div>
        <Button>{filePath ? "Substituir anexo" : "Enviar anexo"}</Button>
      </form>

      {filePath ? (
        <form action={deleteLicitationAttachmentAction} className="mt-3">
          <input type="hidden" name="licitationId" value={licitationId} />
          <input type="hidden" name="attachmentType" value={attachmentType} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button variant="danger">Excluir anexo</Button>
        </form>
      ) : null}
    </div>
  );
}

export default async function EditarLicitacaoPage({ params, searchParams }: EditarLicitacaoPageProps) {
  await requireModulePermission(PermissionModule.licitacoes, "edit");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = resolveReturnTo(getSearchParam(query, "returnTo"), "/licitacoes");
  const [licitation, suppliers] = await Promise.all([getLicitationById(id), getLicitationFormOptions()]);

  if (!licitation) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Editar licitacao"
          description="Atualize dados do processo, anexos, fornecedor vencedor e situação contratual."
        />
        <ButtonLink href={returnTo} variant="secondary">
          Voltar para lista
        </ButtonLink>
      </div>

      <StatusMessage error={getSearchParam(query, "error")} success={getSearchParam(query, "success")} />

      <SectionCard
        title={licitation.number}
        description={`Modalidade: ${licitationModalityLabels[licitation.modality]}. Status: ${licitationStatusLabels[licitation.status]}.`}
      >
        <LicitationForm
          action={updateLicitationAction}
          returnTo={returnTo}
          suppliers={suppliers}
          submitLabel="Salvar alteracoes"
          licitation={{
            id: licitation.id,
            number: licitation.number,
            object: licitation.object,
            modality: licitation.modality,
            status: licitation.status,
            publicationDate: formatDateInput(licitation.publicationDate),
            openingDate: formatDateInput(licitation.openingDate),
            estimatedValue: licitation.estimatedValue?.toString() ?? "",
            awardedValue: licitation.awardedValue?.toString() ?? "",
            notes: licitation.notes ?? "",
            winnerSupplierId: licitation.winnerSupplierId,
            contractGenerated: licitation.contractGenerated,
            editalFileName: licitation.editalFileName,
            editalFilePath: licitation.editalFilePath,
            homologationFileName: licitation.homologationFileName,
            homologationFilePath: licitation.homologationFilePath,
          }}
        />
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Resumo do processo"
          description="Acompanhe a situação financeira e contratual da licitação."
        >
          <div className="grid gap-4 text-sm text-[#415446] md:grid-cols-2">
            <p>
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Fornecedor vencedor</span>
              {licitation.winnerSupplier?.companyName ?? "Não definido"}
            </p>
            <p>
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Documento</span>
              {formatDocumentIdentifier(licitation.winnerSupplier?.document)}
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
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Contrato gerado</span>
              {licitation.contractGenerated ? "Sim" : "Nao"}
            </p>
            <p>
              <span className="block text-xs uppercase tracking-[0.18em] text-[#5f7365]">Contrato vinculado</span>
              {licitation.generatedContract?.number ?? "Não vinculado"}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Anexos da licitacao"
          description="Gerencie o edital principal e o termo de homologacao em PDF."
        >
          <div className="grid gap-4">
            <AttachmentPanel
              licitationId={licitation.id}
              title="Edital principal"
              attachmentType="edital"
              fileName={licitation.editalFileName}
              filePath={licitation.editalFilePath}
              returnTo={returnTo}
              uploadedAt={licitation.editalUploadedAt}
            />
            <AttachmentPanel
              licitationId={licitation.id}
              title="Termo de homologacao"
              attachmentType="homologation"
              fileName={licitation.homologationFileName}
              filePath={licitation.homologationFilePath}
              returnTo={returnTo}
              uploadedAt={licitation.homologationUploadedAt}
            />
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
