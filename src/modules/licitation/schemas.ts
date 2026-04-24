import { LicitationModality, LicitationStatus } from "@prisma/client";
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

export const licitationSchema = z
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
    modality: z.enum(LicitationModality),
    status: z.enum(LicitationStatus),
    publicationDate: optionalDateString,
    openingDate: optionalDateString,
    estimatedValue: optionalMoneyString,
    awardedValue: optionalMoneyString,
    notes: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined)
      .refine((value) => !value || value.length <= 2000, "Observações devem ter no máximo 2000 caracteres."),
    winnerSupplierId: z.string().trim().optional(),
    contractGenerated: z.boolean(),
  })
  .refine(
    (data) => {
      if (!data.publicationDate || !data.openingDate) {
        return true;
      }

      return new Date(data.openingDate) >= new Date(data.publicationDate);
    },
    {
      message: "Data de abertura não pode ser anterior à data de publicação.",
      path: ["openingDate"],
    },
  );

export const licitationAttachmentSchema = z.object({
  attachmentType: z.enum(["edital", "homologation"]),
});

export const licitationModalityOptions = [
  { value: LicitationModality.PREGAO, label: "Pregao" },
  { value: LicitationModality.CONCORRENCIA, label: "Concorrencia" },
  { value: LicitationModality.TOMADA_DE_PRECO, label: "Tomada de preco" },
  { value: LicitationModality.DISPENSA, label: "Dispensa" },
  { value: LicitationModality.INEXIGIBILIDADE, label: "Inexigibilidade" },
  { value: LicitationModality.OUTRO, label: "Outro" },
] as const;

export const licitationStatusOptions = [
  { value: LicitationStatus.RASCUNHO, label: "Rascunho" },
  { value: LicitationStatus.PUBLICADO, label: "Publicado" },
  { value: LicitationStatus.EM_ANDAMENTO, label: "Em andamento" },
  { value: LicitationStatus.HOMOLOGADO, label: "Homologado" },
  { value: LicitationStatus.CONTRATADO, label: "Contratado" },
  { value: LicitationStatus.CANCELADO, label: "Cancelado" },
] as const;

export const licitationModalityLabels: Record<LicitationModality, string> = {
  [LicitationModality.PREGAO]: "Pregao",
  [LicitationModality.CONCORRENCIA]: "Concorrencia",
  [LicitationModality.TOMADA_DE_PRECO]: "Tomada de preco",
  [LicitationModality.DISPENSA]: "Dispensa",
  [LicitationModality.INEXIGIBILIDADE]: "Inexigibilidade",
  [LicitationModality.OUTRO]: "Outro",
};

export const licitationStatusLabels: Record<LicitationStatus, string> = {
  [LicitationStatus.RASCUNHO]: "Rascunho",
  [LicitationStatus.PUBLICADO]: "Publicado",
  [LicitationStatus.EM_ANDAMENTO]: "Em andamento",
  [LicitationStatus.HOMOLOGADO]: "Homologado",
  [LicitationStatus.CONTRATADO]: "Contratado",
  [LicitationStatus.CANCELADO]: "Cancelado",
};


