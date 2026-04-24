import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(160),
  password: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || value.length >= 6, "A senha deve ter pelo menos 6 caracteres."),
});

export const chamberSchema = z.object({
  name: z.string().trim().min(2, "Nome da camara deve ter pelo menos 2 caracteres.").max(160),
});

