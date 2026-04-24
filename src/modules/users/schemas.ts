import { UserRole } from "@prisma/client";
import { z } from "zod";

export const userSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter ao menos 3 caracteres.").max(120),
  email: z.email("Informe um e-mail válido.").transform((value) => value.toLowerCase()),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
  role: z.enum(UserRole),
  active: z.boolean(),
  sectorId: z.string().trim().optional(),
});

export const userUpdateSchema = userSchema.extend({
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres.").optional(),
});

