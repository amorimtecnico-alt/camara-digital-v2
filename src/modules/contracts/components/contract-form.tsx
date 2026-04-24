import { ContractStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatContractDate, formatCurrencyValue } from "@/modules/contracts/formatters";
import { contractStatusOptions } from "@/modules/contracts/schemas";

type ContractFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  allowAttachmentUpload?: boolean;
  returnTo?: string;
  suppliers: Array<{
    id: string;
    companyName: string;
  }>;
  contract?: {
    id: string;
    number: string;
    object: string;
    status: ContractStatus;
    supplierId: string | null;
    startDate: string;
    endDate: string;
    endDateCurrent: string;
    initialValue: string;
    currentValue: string;
    notes: string;
    attachmentName: string | null;
    attachmentPath: string | null;
    attachmentUploadedAt: string;
  };
};

export function ContractForm({
  action,
  allowAttachmentUpload = false,
  returnTo,
  submitLabel,
  suppliers,
  contract,
}: ContractFormProps) {
  const currentEndDateLabel =
    contract?.endDateCurrent ? formatContractDate(new Date(`${contract.endDateCurrent}T00:00:00`)) : "Não informada";

  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      {contract ? <input type="hidden" name="id" value={contract.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="number" className="text-sm font-medium">
            Numero
          </label>
          <Input
            id="number"
            name="number"
            defaultValue={contract?.number ?? ""}
            placeholder="Contrato 001/2026"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <Select id="status" name="status" defaultValue={contract?.status ?? ContractStatus.DRAFT}>
            {contractStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
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
          defaultValue={contract?.object ?? ""}
          placeholder="Descreva o objeto do contrato"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-3">
          <label htmlFor="supplierId" className="text-sm font-medium">
            Fornecedor
          </label>
          <Select id="supplierId" name="supplierId" defaultValue={contract?.supplierId ?? ""}>
            <option value="">Sem fornecedor vinculado</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.companyName}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="startDate" className="text-sm font-medium">
            Data inicial
          </label>
          <Input id="startDate" name="startDate" type="date" defaultValue={contract?.startDate ?? ""} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="endDate" className="text-sm font-medium">
            Data final inicial
          </label>
          <Input id="endDate" name="endDate" type="date" defaultValue={contract?.endDate ?? ""} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="initialValue" className="text-sm font-medium">
            Valor inicial
          </label>
          <Input
            id="initialValue"
            name="initialValue"
            type="number"
            step="0.01"
            min="0"
            defaultValue={contract?.initialValue ?? ""}
            placeholder="0.00"
          />
        </div>
      </div>

      {contract ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-4 text-sm text-[#415446]">
            <p className="text-xs uppercase tracking-[0.18em] text-[#5f7365]">Dados vigentes</p>
            <p className="mt-3">Data final atual: {currentEndDateLabel}</p>
            <p className="mt-1">Valor atual: {formatCurrencyValue(contract.currentValue)}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4 text-sm text-[#415446]">
            <p className="text-xs uppercase tracking-[0.18em] text-[#5f7365]">Anexo atual</p>
            {contract.attachmentPath ? (
              <>
                <p className="mt-3">{contract.attachmentName ?? "PDF do contrato"}</p>
                <p className="mt-1 text-xs text-[#5f7365]">
                  Upload em {contract.attachmentUploadedAt ? formatContractDate(new Date(`${contract.attachmentUploadedAt}T00:00:00`)) : "data não registrada"}
                </p>
              </>
            ) : (
              <p className="mt-3">Nenhum arquivo enviado.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {allowAttachmentUpload ? (
          <div className="space-y-1.5">
            <label htmlFor="attachmentFile" className="text-sm font-medium">
              Contrato digitalizado em PDF
            </label>
            <Input id="attachmentFile" name="attachmentFile" type="file" accept="application/pdf,.pdf" />
          </div>
        ) : null}

        <div className={`space-y-1.5 ${allowAttachmentUpload ? "" : "md:col-span-2"}`}>
          <label htmlFor="notes" className="text-sm font-medium">
            Observações
          </label>
          <Textarea
            id="notes"
            name="notes"
            rows={5}
            defaultValue={contract?.notes ?? ""}
            placeholder="Informacoes complementares sobre o contrato"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}

