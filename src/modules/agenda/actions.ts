"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRouteAccess } from "@/lib/permissions";
import { appendStatusMessage, buildPathWithParams, resolveReturnTo } from "@/lib/list-navigation";
import { parseErrorMessage } from "@/lib/utils";
import { agendaEventSchema } from "@/modules/agenda/schemas";
import { formatAgendaDateKey, getManualAgendaEventById, parseAgendaDateKey } from "@/modules/agenda/queries";
import { prisma } from "@/lib/prisma";

function normalizeOptionalValue(value: FormDataEntryValue | null) {
  const parsed = typeof value === "string" ? value.trim() : "";
  return parsed.length > 0 ? parsed : undefined;
}

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  redirect(appendStatusMessage(path, type, message));
}

function getAgendaEventInput(formData: FormData) {
  const allDay = formData.get("allDay") === "on";

  return agendaEventSchema.safeParse({
    title: formData.get("title"),
    description: normalizeOptionalValue(formData.get("description")),
    date: formData.get("date"),
    startTime: allDay ? undefined : normalizeOptionalValue(formData.get("startTime")),
    endTime: allDay ? undefined : normalizeOptionalValue(formData.get("endTime")),
    allDay,
    category: formData.get("category"),
    priority: formData.get("priority"),
    notes: normalizeOptionalValue(formData.get("notes")),
  });
}

function getDatePath(date: string) {
  return buildPathWithParams("/agenda", { date });
}

function revalidateAgendaRoutes(id?: string) {
  revalidatePath("/agenda");
  revalidatePath("/agenda/novo");
  revalidatePath("/dashboard");

  if (id) {
    revalidatePath(`/agenda/${id}/editar`);
  }
}

export async function createAgendaEventAction(formData: FormData) {
  const currentUser = await requireRouteAccess("/agenda");
  const fallbackDate = formatAgendaDateKey(parseAgendaDateKey(String(formData.get("date") ?? "")));
  const returnTo = resolveReturnTo(formData.get("returnTo"), getDatePath(fallbackDate));
  const createPath = buildPathWithParams("/agenda/novo", { date: fallbackDate, returnTo });
  const parsed = getAgendaEventInput(formData);

  if (!parsed.success) {
    redirectWithMessage(createPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;

  try {
    await prisma.agendaEvent.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        date: parseAgendaDateKey(input.date),
        startTime: input.allDay ? null : (input.startTime ?? null),
        endTime: input.allDay ? null : (input.endTime ?? null),
        allDay: input.allDay,
        category: input.category,
        priority: input.priority,
        notes: input.notes ?? null,
        createdById: currentUser.id,
      },
    });
  } catch (error) {
    redirectWithMessage(createPath, "error", parseErrorMessage(error));
  }

  revalidateAgendaRoutes();
  redirectWithMessage(getDatePath(input.date), "success", "Compromisso criado com sucesso.");
}

export async function updateAgendaEventAction(formData: FormData) {
  const currentUser = await requireRouteAccess("/agenda");
  const id = String(formData.get("id") ?? "");
  const fallbackDate = formatAgendaDateKey(parseAgendaDateKey(String(formData.get("date") ?? "")));
  const returnTo = resolveReturnTo(formData.get("returnTo"), getDatePath(fallbackDate));
  const editPath = buildPathWithParams(`/agenda/${id}/editar`, { returnTo });
  const event = await getManualAgendaEventById(currentUser, id);

  if (!event) {
    redirectWithMessage(returnTo, "error", "Compromisso não encontrado.");
  }

  const parsed = getAgendaEventInput(formData);

  if (!parsed.success) {
    redirectWithMessage(editPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;

  try {
    await prisma.agendaEvent.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description ?? null,
        date: parseAgendaDateKey(input.date),
        startTime: input.allDay ? null : (input.startTime ?? null),
        endTime: input.allDay ? null : (input.endTime ?? null),
        allDay: input.allDay,
        category: input.category,
        priority: input.priority,
        notes: input.notes ?? null,
      },
    });
  } catch (error) {
    redirectWithMessage(editPath, "error", parseErrorMessage(error));
  }

  revalidateAgendaRoutes(id);
  redirectWithMessage(returnTo, "success", "Compromisso atualizado com sucesso.");
}

export async function deleteAgendaEventAction(formData: FormData) {
  const currentUser = await requireRouteAccess("/agenda");
  const id = String(formData.get("id") ?? "");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/agenda");
  const event = await getManualAgendaEventById(currentUser, id);

  if (!event) {
    redirectWithMessage(returnTo, "error", "Compromisso não encontrado.");
  }

  try {
    await prisma.agendaEvent.delete({
      where: { id },
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", parseErrorMessage(error));
  }

  revalidateAgendaRoutes(id);
  redirectWithMessage(returnTo, "success", "Compromisso removido com sucesso.");
}

