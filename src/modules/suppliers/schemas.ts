import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional();

const supplierDocumentSchema = z
  .string()
  .trim()
  .min(1, "Informe o documento.")
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 11 || value.length === 14, "Documento inválido.");

export const supplierSchema = z.object({
  companyName: z.string().trim().min(3, "Razao social deve ter ao menos 3 caracteres.").max(150),
  tradeName: optionalTrimmedString(150),
  document: supplierDocumentSchema,
  email: z.email("Informe um e-mail válido.").optional(),
  phone: optionalTrimmedString(30),
  contactName: optionalTrimmedString(120),
});

