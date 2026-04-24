"use server";

import bcrypt from "bcryptjs";
import { PermissionModule, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  canAssignRole,
  canManageUserTarget,
  redirectToAccessDenied,
  requireModulePermission,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { appendStatusMessage, buildPathWithParams, resolveReturnTo } from "@/lib/list-navigation";
import { parseErrorMessage } from "@/lib/utils";
import { userSchema, userUpdateSchema } from "@/modules/users/schemas";

function normalizeOptionalValue(value: FormDataEntryValue | null) {
  const parsed = typeof value === "string" ? value.trim() : "";
  return parsed.length > 0 ? parsed : undefined;
}

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  redirect(appendStatusMessage(path, type, message));
}

async function ensureSectorExists(sectorId: string | undefined, fallbackPath: string) {
  if (!sectorId) {
    return;
  }

  const sector = await prisma.sector.findUnique({
    where: { id: sectorId },
    select: { id: true },
  });

  if (!sector) {
    redirectWithMessage(fallbackPath, "error", "Setor informado não foi encontrado.");
  }
}

async function ensureEmailAvailable(email: string, fallbackPath: string, currentUserId?: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== currentUserId) {
    redirectWithMessage(fallbackPath, "error", "Já existe um usuário cadastrado com este e-mail.");
  }
}

function handleKnownPrismaError(error: unknown, fallbackPath: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    redirectWithMessage(fallbackPath, "error", "Já existe um usuário cadastrado com este e-mail.");
  }

  throw error;
}

function revalidateUserRoutes(userId?: string) {
  revalidatePath("/usuarios");
  revalidatePath("/usuarios/novo");

  if (userId) {
    revalidatePath(`/usuarios/${userId}/editar`);
  }
}

export async function createUserAction(formData: FormData) {
  const currentUser = await requireModulePermission(PermissionModule.usuarios, "create");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/usuarios");
  const createPath = buildPathWithParams("/usuarios/novo", { returnTo });

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    active: formData.get("active") === "on",
    sectorId: normalizeOptionalValue(formData.get("sectorId")),
  });

  if (!parsed.success) {
    redirectWithMessage(createPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;

  if (!canAssignRole(currentUser, input.role)) {
    redirectToAccessDenied();
  }

  await ensureSectorExists(input.sectorId, createPath);
  await ensureEmailAvailable(input.email, createPath);

  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        active: input.active,
        sectorId: input.sectorId ?? null,
      },
    });
  } catch (error) {
    handleKnownPrismaError(error, createPath);
  }

  revalidateUserRoutes();
  redirectWithMessage(returnTo, "success", "Usuário criado com sucesso.");
}

export async function updateUserAction(formData: FormData) {
  const currentUser = await requireModulePermission(PermissionModule.usuarios, "edit");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/usuarios");
  const editPath = buildPathWithParams(`/usuarios/${id}/editar`, { returnTo });
  const parsed = userUpdateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: normalizeOptionalValue(formData.get("password")),
    role: formData.get("role"),
    active: formData.get("active") === "on",
    sectorId: normalizeOptionalValue(formData.get("sectorId")),
  });

  if (!parsed.success) {
    redirectWithMessage(editPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!existingUser) {
    redirectWithMessage(returnTo, "error", "Usuário não encontrado.");
  }

  if (!canManageUserTarget(currentUser, existingUser)) {
    redirectToAccessDenied();
  }

  if (!canAssignRole(currentUser, input.role)) {
    redirectToAccessDenied();
  }

  await ensureSectorExists(input.sectorId, editPath);
  await ensureEmailAvailable(input.email, editPath, id);

  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        active: input.active,
        sectorId: input.sectorId ?? null,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
  } catch (error) {
    handleKnownPrismaError(error, editPath);
  }

  revalidateUserRoutes(id);
  redirectWithMessage(returnTo, "success", "Usuário atualizado com sucesso.");
}

export async function toggleUserStatusAction(formData: FormData) {
  const currentUser = await requireModulePermission(PermissionModule.usuarios, "edit");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/usuarios");
  const nextActiveValue = String(formData.get("active")) === "true";

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    redirectWithMessage(returnTo, "error", "Usuário não encontrado.");
  }

  if (!canManageUserTarget(currentUser, targetUser)) {
    redirectToAccessDenied();
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        active: nextActiveValue,
      },
      select: {
        id: true,
      },
    });

    revalidateUserRoutes(user.id);
    redirectWithMessage(
      returnTo,
      "success",
      nextActiveValue ? "Usuario ativado com sucesso." : "Usuario inativado com sucesso.",
    );
  } catch (error) {
    redirectWithMessage(returnTo, "error", parseErrorMessage(error));
  }
}

export async function deleteUserAction(formData: FormData) {
  await requireModulePermission(PermissionModule.usuarios, "delete");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/usuarios");

  try {
    await prisma.user.delete({
      where: { id },
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", parseErrorMessage(error));
  }

  revalidateUserRoutes(id);
  redirectWithMessage(returnTo, "success", "Usuário removido com sucesso.");
}

