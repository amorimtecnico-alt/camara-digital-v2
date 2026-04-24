"use client";

import { useState } from "react";

import { LicitationModality, LicitationStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyValue } from "@/modules/contracts/formatters";
import { formatDocumentIdentifier } from "@/lib/utils";
import {
  licitationModalityOptions,
  licitationStatusOptions,
} from "@/modules/licitation/schemas";

type LicitationFormProps = {
  action: (formData: FormData) => Promise<void>;
  allowAttachmentUpload?: boolean;
  returnTo?: string;
  submitLabel: string;
  suppliers: Array<{
    id: string;
    companyName: string;
    document: string;
  }>;
  licitation?: {
    id: string;
    number: string;
    object: string;
    modality: LicitationModality;
    status: LicitationStatus;
    publicationDate: string;
    openingDate: string;
    estimatedValue: string;
    awardedValue: string;
    notes: string;
    winnerSupplierId: string | null;
    contractGenerated: boolean;
    editalFileName: string | null;
    editalFilePath: string | null;
    homologationFileName: string | null;
    homologationFilePath: string | null;
  };
};

export function LicitationForm({
  action,
  allowAttachmentUpload = false,
  licitation,
  returnTo,
  submitLabel,
  suppliers,
}: LicitationFormProps) {
  const [winnerSupplierId, setWinnerSupplierId] = useState(licitation?.winnerSupplierId ?? "");

  const selectedSupplier =
    suppliers.find((supplier) => supplier.id === winnerSupplierId) ?? null;

  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      {licitation ? <input type="hidden" name="id" value={licitation.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="number" className="text-sm font-medium">
            Numero
          </label>
          <Input id="number" name="number" defaultValue={licitation?.number ?? ""} placeholder="PE 001/2026" required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="modality" className="text-sm font-medium">
            Modalidade
          </label>
          <Select id="modality" name="modality" defaultValue={licitation?.modality ?? LicitationModality.PREGAO}>
            {licitationModalityOptions.map((modality) => (
              <option key={modality.value} value={modality.value}>
                {modality.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="object" className="text-sm font-medium">
          Objeto
        </label>
        <Input
          id="object"
          name="object"
          defaultValue={licitation?.object ?? ""}
          placeholder="Descreva o objeto da licitação"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <Select id="status" name="status" defaultValue={licitation?.status ?? LicitationStatus.RASCUNHO}>
            {licitationStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="publicationDate" className="text-sm font-medium">
            Data de publicação
          </label>
          <Input id="publicationDate" name="publicationDate" type="date" defaultValue={licitation?.publicationDate ?? ""} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="openingDate" className="text-sm font-medium">
            Data de abertura
          </label>
          <Input id="openingDate" name="openingDate" type="date" defaultValue={licitation?.openingDate ?? ""} />
        </div>

        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-[#415446]">
            <input
              type="checkbox"
              name="contractGenerated"
              value="true"
              defaultChecked={licitation?.contractGenerated ?? false}
            />
            Contrato gerado
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="estimatedValue" className="text-sm font-medium">
            Valor estimado
          </label>
          <Input
            id="estimatedValue"
            name="estimatedValue"
            type="number"
            step="0.01"
            min="0"
            defaultValue={licitation?.estimatedValue ?? ""}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="awardedValue" className="text-sm font-medium">
            Valor adjudicado
          </label>
          <Input
            id="awardedValue"
            name="awardedValue"
            type="number"
            step="0.01"
            min="0"
            defaultValue={licitation?.awardedValue ?? ""}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="winnerSupplierId" className="text-sm font-medium">
          Fornecedor vencedor
        </label>
        <Select
          id="winnerSupplierId"
          name="winnerSupplierId"
          value={winnerSupplierId}
          onChange={(event) => setWinnerSupplierId(event.currentTarget.value)}
        >
          <option value="">Não definido</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.companyName}
            </option>
          ))}
        </Select>
        {selectedSupplier ? (
          <div className="rounded-2xl border border-border bg-background p-4 text-sm text-[#415446]">
            <p className="font-medium text-foreground">{selectedSupplier.companyName}</p>
            <p className="mt-1">Documento: {formatDocumentIdentifier(selectedSupplier.document)}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4 text-sm text-[#415446]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#5f7365]">Edital principal</p>
          {licitation?.editalFilePath ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={licitation.editalFilePath}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                Abrir PDF
              </a>
              <a
                href={licitation.editalFilePath}
                download={licitation.editalFileName ?? undefined}
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                Baixar arquivo
              </a>
            </div>
          ) : (
            <p className="mt-3">Nenhum edital enviado.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 text-sm text-[#415446]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#5f7365]">Termo de homologacao</p>
          {licitation?.homologationFilePath ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={licitation.homologationFilePath}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                Abrir PDF
              </a>
              <a
                href={licitation.homologationFilePath}
                download={licitation.homologationFileName ?? undefined}
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                Baixar arquivo
              </a>
            </div>
          ) : (
            <p className="mt-3">Nenhum termo de homologacao enviado.</p>
          )}
        </div>
      </div>

      {allowAttachmentUpload ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 rounded-2xl border border-border bg-background p-4">
            <label htmlFor="editalFile" className="text-sm font-medium">
              Upload do edital em PDF
            </label>
            <input
              id="editalFile"
              name="editalFile"
              type="file"
              accept="application/pdf,.pdf"
              className="w-full cursor-pointer rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm"
            />
          </div>

          <div className="space-y-1.5 rounded-2xl border border-border bg-background p-4">
            <label htmlFor="homologationFile" className="text-sm font-medium">
              Upload do termo de homologacao em PDF
            </label>
            <input
              id="homologationFile"
              name="homologationFile"
              type="file"
              accept="application/pdf,.pdf"
              className="w-full cursor-pointer rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Observações
        </label>
        <Textarea
          id="notes"
          name="notes"
          rows={5}
          defaultValue={licitation?.notes ?? ""}
          placeholder="Informações complementares sobre a licitação"
        />
      </div>

      {licitation ? (
        <div className="rounded-2xl border border-border bg-background p-4 text-sm text-[#415446]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#5f7365]">Resumo financeiro</p>
          <p className="mt-3">Valor estimado: {formatCurrencyValue(licitation.estimatedValue)}</p>
          <p className="mt-1">Valor adjudicado: {formatCurrencyValue(licitation.awardedValue)}</p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}

