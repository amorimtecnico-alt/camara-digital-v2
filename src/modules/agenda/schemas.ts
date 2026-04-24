import { AgendaEventCategory, AgendaEventPriority } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido.")
  .optional();

export const agendaEventSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o titulo do compromisso."),
    description: optionalText,
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data valida."),
    startTime: timeSchema,
    endTime: timeSchema,
    allDay: z.boolean().default(false),
    category: z.enum(AgendaEventCategory).default(AgendaEventCategory.OUTRO),
    priority: z.enum(AgendaEventPriority).default(AgendaEventPriority.NORMAL),
    notes: optionalText,
  })
  .refine((input) => input.allDay || input.startTime, {
    message: "Informe o horário inicial ou marque como dia inteiro.",
    path: ["startTime"],
  })
  .refine((input) => !input.startTime || !input.endTime || input.endTime >= input.startTime, {
    message: "O horário final deve ser maior ou igual ao inicial.",
    path: ["endTime"],
  });

export const agendaEventCategoryLabels: Record<AgendaEventCategory, string> = {
  [AgendaEventCategory.REUNIAO]: "Reuniao",
  [AgendaEventCategory.PRAZO]: "Prazo",
  [AgendaEventCategory.TAREFA]: "Tarefa",
  [AgendaEventCategory.LEMBRETE]: "Lembrete",
  [AgendaEventCategory.OUTRO]: "Outro",
};

export const agendaEventPriorityLabels: Record<AgendaEventPriority, string> = {
  [AgendaEventPriority.BAIXA]: "Baixa",
  [AgendaEventPriority.NORMAL]: "Normal",
  [AgendaEventPriority.ALTA]: "Alta",
  [AgendaEventPriority.URGENTE]: "Urgente",
};

