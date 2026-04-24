import { ContractAmendmentType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { contractAmendmentTypeOptions } from "@/modules/contracts/schemas";

type ContractAmendmentFormProps = {
  action: (formData: FormData) => Promise<void>;
  contractId: string;
  submitLabel: string;
  amendment?: {
    id?: string;
    number?: string;
    type?: ContractAmendmentType;
    amendmentDate?: string;
    description?: string;
    previousEndDate?: string;
    newEndDate?: string;
    previousValue?: string;
    newValue?: string;
    attachmentName: string | null;
    attachmentPath: string | null;
  };
};

export function ContractAmendmentForm({
  action,
  amendment,
  contractId,
  submitLabel,
}: ContractAmendmentFormProps) {
  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      <input type="hidden" name="contractId" value={contractId} />
      {amendment?.id ? <input type="hidden" name="id" value={amendment.id} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="number" className="text-sm font-medium">
            Numero do aditivo
          </label>
          <Input id="number" name="number" defaultValue={amendment?.number ?? ""} placeholder="Aditivo 01/2026" required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium">
            Tipo
          </label>
          <Select id="type" name="type" defaultValue={amendment?.type ?? ContractAmendmentType.PRAZO}>
            {contractAmendmentTypeOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="amendmentDate" className="text-sm font-medium">
            Data do aditivo
          </label>
          <Input id="amendmentDate" name="amendmentDate" type="date" defaultValue={amendment?.amendmentDate ?? ""} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Descrição
        </label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={amendment?.description ?? ""}
          placeholder="Descreva o motivo e o efeito do aditivo"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="previousEndDate" className="text-sm font-medium">
            Prazo anterior
          </label>
          <Input id="previousEndDate" name="previousEndDate" type="date" defaultValue={amendment?.previousEndDate ?? ""} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="newEndDate" className="text-sm font-medium">
            Prazo novo
          </label>
          <Input id="newEndDate" name="newEndDate" type="date" defaultValue={amendment?.newEndDate ?? ""} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="previousValue" className="text-sm font-medium">
            Valor anterior
          </label>
          <Input
            id="previousValue"
            name="previousValue"
            type="number"
            step="0.01"
            min="0"
            defaultValue={amendment?.previousValue ?? ""}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="newValue" className="text-sm font-medium">
            Valor novo
          </label>
          <Input
            id="newValue"
            name="newValue"
            type="number"
            step="0.01"
            min="0"
            defaultValue={amendment?.newValue ?? ""}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 text-sm text-[#415446]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#5f7365]">Arquivo do aditivo</p>
        {amendment?.attachmentPath ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={amendment.attachmentPath}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary underline underline-offset-2"
            >
              Abrir PDF atual
            </a>
            <a
              href={amendment.attachmentPath}
              download={amendment.attachmentName ?? undefined}
              className="text-sm font-medium text-primary underline underline-offset-2"
            >
              Baixar arquivo
            </a>
          </div>
        ) : (
          <p className="mt-3">Nenhum arquivo enviado.</p>
        )}

        <div className="mt-4 space-y-1.5">
          <label htmlFor="attachmentFile" className="text-sm font-medium">
            Novo arquivo em PDF
          </label>
          <Input id="attachmentFile" name="attachmentFile" type="file" accept="application/pdf,.pdf" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}

