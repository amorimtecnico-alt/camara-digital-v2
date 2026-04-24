import { ContractAmendmentType, ContractStatus } from "@prisma/client";
import { z } from "zod";

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Informe uma data valida.");

const optionalMoneyString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => !value || /^\d+(?:[.,]\d{1,2})?$/.test(value), "Informe um valor monetário válido.");

export const contractSchema = z
  .object({
    number: z
      .string()
      .trim()
      .min(1, "Numero e obrigatorio.")
      .max(80, "Numero deve ter no maximo 80 caracteres."),
    object: z
      .string()
      .trim()
      .min(1, "Objeto e obrigatorio.")
      .max(255, "Objeto deve ter no maximo 255 caracteres."),
    status: z.enum(ContractStatus),
    supplierId: z.string().trim().optional(),
    startDate: optionalDateString,
    endDate: optionalDateString,
    initialValue: optionalMoneyString,
    notes: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined)
      .refine((value) => !value || value.length <= 2000, "Observações devem ter no máximo 2000 caracteres."),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) {
        return true;
      }

      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: "Data final não pode ser anterior à data inicial.",
      path: ["endDate"],
    },
  );

export const contractAmendmentSchema = z
  .object({
    number: z
      .string()
      .trim()
      .min(1, "Numero do aditivo e obrigatorio.")
      .max(80, "Numero do aditivo deve ter no maximo 80 caracteres."),
    type: z.enum(ContractAmendmentType),
    amendmentDate: optionalDateString.refine((value) => Boolean(value), "Data do aditivo e obrigatoria."),
    description: z
      .string()
      .trim()
      .min(1, "Descrição é obrigatória.")
      .max(2000, "Descrição deve ter no máximo 2000 caracteres."),
    previousEndDate: optionalDateString,
    newEndDate: optionalDateString,
    previousValue: optionalMoneyString,
    newValue: optionalMoneyString,
  })
  .superRefine((data, ctx) => {
    if (data.type === ContractAmendmentType.PRAZO || data.type === ContractAmendmentType.PRAZO_E_VALOR) {
      if (!data.newEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newEndDate"],
          message: "Informe o novo prazo do aditivo.",
        });
      }
    }

    if (data.type === ContractAmendmentType.VALOR || data.type === ContractAmendmentType.PRAZO_E_VALOR) {
      if (!data.newValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newValue"],
          message: "Informe o novo valor do aditivo.",
        });
      }
    }

    if (data.previousEndDate && data.newEndDate && new Date(data.newEndDate) < new Date(data.previousEndDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newEndDate"],
        message: "O novo prazo não pode ser anterior ao prazo anterior.",
      });
    }
  });

export const contractAttachmentAuditSchema = z.object({
  justification: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || value.length <= 1000, "Justificativa deve ter no maximo 1000 caracteres."),
});

export const contractStatusOptions = [
  { value: ContractStatus.DRAFT, label: "Rascunho" },
  { value: ContractStatus.ACTIVE, label: "Ativo" },
  { value: ContractStatus.FINISHED, label: "Finalizado" },
  { value: ContractStatus.CANCELLED, label: "Cancelado" },
] as const;

export const contractStatusLabels: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: "Rascunho",
  [ContractStatus.ACTIVE]: "Ativo",
  [ContractStatus.FINISHED]: "Finalizado",
  [ContractStatus.CANCELLED]: "Cancelado",
};

export const contractAmendmentTypeOptions = [
  { value: ContractAmendmentType.PRAZO, label: "Prazo" },
  { value: ContractAmendmentType.VALOR, label: "Valor" },
  { value: ContractAmendmentType.PRAZO_E_VALOR, label: "Prazo e valor" },
  { value: ContractAmendmentType.OUTRO, label: "Outro" },
] as const;

export const contractAmendmentTypeLabels: Record<ContractAmendmentType, string> = {
  [ContractAmendmentType.PRAZO]: "Prazo",
  [ContractAmendmentType.VALOR]: "Valor",
  [ContractAmendmentType.PRAZO_E_VALOR]: "Prazo e valor",
  [ContractAmendmentType.OUTRO]: "Outro",
};


