import { ProtocolStatus } from "@prisma/client";
import { z } from "zod";

export const protocolSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Assunto e obrigatorio.")
    .max(160, "Assunto deve ter no maximo 160 caracteres."),
  description: z
    .string()
    .trim()
    .max(2000, "Descrição deve ter no máximo 2000 caracteres.")
    .optional()
    .transform((value) => value || undefined),
  status: z.enum(ProtocolStatus),
});

export const protocolStatusOptions = [
  { value: ProtocolStatus.OPEN, label: "Aberto" },
  { value: ProtocolStatus.IN_PROGRESS, label: "Em andamento" },
  { value: ProtocolStatus.CLOSED, label: "Fechado" },
] as const;

export const protocolStatusLabels: Record<ProtocolStatus, string> = {
  [ProtocolStatus.OPEN]: "Aberto",
  [ProtocolStatus.IN_PROGRESS]: "Em andamento",
  [ProtocolStatus.CLOSED]: "Fechado",
};

