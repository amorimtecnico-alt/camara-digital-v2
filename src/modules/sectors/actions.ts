"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canDelete, canManageSectors, requirePermission } from "@/lib/permissions";
import { appendStatusMessage, buildPathWithParams, resolveReturnTo } from "@/lib/list-navigation";
import { prisma } from "@/lib/prisma";
import { parseErrorMessage } from "@/lib/utils";
import { sectorSchema } from "@/modules/sectors/schemas";

function normalizeOptionalValue(value: FormDataEntryValue | null) {
  const parsed = typeof value === "string" ? value.trim() : "";
  return parsed.length > 0 ? parsed : undefined;
}

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  redirect(appendStatusMessage(path, type, message));
}

function getSectorInput(formData: FormData) {
  return sectorSchema.safeParse({
    name: formData.get("name"),
    description: normalizeOptionalValue(formData.get("description")),
  });
}

async function ensureSectorNameAvailable(name: string, currentSectorId: string | undefined, fallbackPath: string) {
  const existingSector = await prisma.sector.findUnique({
    where: { name },
    select: { id: true },
  });

  if (existingSector && existingSector.id !== currentSectorId) {
    redirectWithMessage(fallbackPath, "error", "Já existe um setor cadastrado com este nome.");
  }
}

function handleKnownPrismaError(error: unknown, fallbackPath: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    redirectWithMessage(fallbackPath, "error", "Já existe um setor cadastrado com este nome.");
  }

  throw error;
}

function revalidateSectorRoutes(sectorId?: string) {
  revalidatePath("/setores");
  revalidatePath("/setores/novo");

  if (sectorId) {
    revalidatePath(`/setores/${sectorId}/editar`);
  }
}

export async function createSectorAction(formData: FormData) {
  await requirePermission(canManageSectors);
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/setores");
  const createPath = buildPathWithParams("/setores/novo", { returnTo });

  const parsed = getSectorInput(formData);

  if (!parsed.success) {
    redirectWithMessage(createPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;

  await ensureSectorNameAvailable(input.name, undefined, createPath);

  try {
    await prisma.sector.create({
      data: {
        name: input.name,
        description: input.description ?? null,
      },
    });
  } catch (error) {
    handleKnownPrismaError(error, createPath);
  }

  revalidateSectorRoutes();
  redirectWithMessage(returnTo, "success", "Setor criado com sucesso.");
}

export async function updateSectorAction(formData: FormData) {
  await requirePermission(canManageSectors);

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/setores");
  const editPath = buildPathWithParams(`/setores/${id}/editar`, { returnTo });
  const parsed = getSectorInput(formData);

  if (!parsed.success) {
    redirectWithMessage(editPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;

  const existingSector = await prisma.sector.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingSector) {
    redirectWithMessage(returnTo, "error", "Setor não encontrado.");
  }

  await ensureSectorNameAvailable(input.name, id, editPath);

  try {
    await prisma.sector.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description ?? null,
      },
    });
  } catch (error) {
    handleKnownPrismaError(error, editPath);
  }

  revalidateSectorRoutes(id);
  redirectWithMessage(returnTo, "success", "Setor atualizado com sucesso.");
}

export async function deleteSectorAction(formData: FormData) {
  await requirePermission(canDelete);

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/setores");

  const linkedUsers = await prisma.user.count({
    where: { sectorId: id },
  });

  if (linkedUsers > 0) {
    redirectWithMessage(returnTo, "error", "Há usuários vinculados a este setor.");
  }

  try {
    await prisma.sector.delete({
      where: { id },
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", parseErrorMessage(error));
  }

  revalidateSectorRoutes(id);
  redirectWithMessage(returnTo, "success", "Setor removido com sucesso.");
}

