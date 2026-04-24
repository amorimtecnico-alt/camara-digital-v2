"use server";

import { randomBytes } from "node:crypto";

import { PermissionModule, Prisma, ProtocolStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  canEditProtocol,
  requireModulePermission,
  redirectToAccessDenied,
} from "@/lib/permissions";
import { appendStatusMessage, buildPathWithParams, resolveReturnTo } from "@/lib/list-navigation";
import { prisma } from "@/lib/prisma";
import { protocolSchema } from "@/modules/protocols/schemas";

function normalizeOptionalValue(value: FormDataEntryValue | null) {
  const parsed = typeof value === "string" ? value.trim() : "";
  return parsed.length > 0 ? parsed : undefined;
}

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  redirect(appendStatusMessage(path, type, message));
}

function getProtocolInput(formData: FormData) {
  return protocolSchema.safeParse({
    subject: formData.get("subject"),
    description: normalizeOptionalValue(formData.get("description")),
    status: formData.get("status") ?? ProtocolStatus.OPEN,
  });
}

async function generateUniqueProtocolCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const code = `PRT-${year}${month}${day}-${suffix}`;

    const existingProtocol = await prisma.protocol.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existingProtocol) {
      return code;
    }
  }

  throw new Error("Não foi possível gerar um código único para o protocolo.");
}

function handleKnownPrismaError(error: unknown, fallbackPath: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    redirectWithMessage(fallbackPath, "error", "Já existe um protocolo com o código gerado. Tente novamente.");
  }

  throw error;
}

function revalidateProtocolRoutes(protocolId?: string) {
  revalidatePath("/protocolos");
  revalidatePath("/protocolos/novo");

  if (protocolId) {
    revalidatePath(`/protocolos/${protocolId}/editar`);
  }
}

export async function createProtocolAction(formData: FormData) {
  const currentUser = await requireModulePermission(PermissionModule.protocolos, "create");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/protocolos");
  const createPath = buildPathWithParams("/protocolos/novo", { returnTo });

  const parsed = getProtocolInput(formData);

  if (!parsed.success) {
    redirectWithMessage(createPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;
  const code = await generateUniqueProtocolCode();

  try {
    await prisma.protocol.create({
      data: {
        code,
        subject: input.subject,
        description: input.description ?? null,
        status: input.status,
        createdById: currentUser.id,
      },
    });
  } catch (error) {
    handleKnownPrismaError(error, createPath);
  }

  revalidateProtocolRoutes();
  redirectWithMessage(returnTo, "success", "Protocolo criado com sucesso.");
}

export async function updateProtocolAction(formData: FormData) {
  const currentUser = await requireModulePermission(PermissionModule.protocolos, "edit");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/protocolos");
  const editPath = buildPathWithParams(`/protocolos/${id}/editar`, { returnTo });
  const parsed = getProtocolInput(formData);

  if (!parsed.success) {
    redirectWithMessage(editPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;

  const existingProtocol = await prisma.protocol.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });

  if (!existingProtocol) {
    redirectWithMessage(returnTo, "error", "Protocolo não encontrado.");
  }

  if (!canEditProtocol(currentUser, existingProtocol.createdById)) {
    redirectToAccessDenied();
  }

  try {
    await prisma.protocol.update({
      where: { id },
      data: {
        subject: input.subject,
        description: input.description ?? null,
        status: input.status,
      },
    });
  } catch (error) {
    handleKnownPrismaError(error, editPath);
  }

  revalidateProtocolRoutes(id);
  redirectWithMessage(returnTo, "success", "Protocolo atualizado com sucesso.");
}

export async function deleteProtocolAction(formData: FormData) {
  await requireModulePermission(PermissionModule.protocolos, "delete");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/protocolos");

  try {
    await prisma.protocol.delete({
      where: { id },
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Não foi possível excluir o protocolo.");
  }

  revalidateProtocolRoutes(id);
  redirectWithMessage(returnTo, "success", "Protocolo removido com sucesso.");
}

