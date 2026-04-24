import { z } from "zod";

export const sectorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter ao menos 2 caracteres.")
    .max(120, "Nome deve ter no maximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(255, "Descrição deve ter no máximo 255 caracteres.")
    .optional()
    .transform((value) => value || undefined),
});


