"use server";

import { PermissionModule, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireModulePermission } from "@/lib/permissions";
import { appendStatusMessage, buildPathWithParams, resolveReturnTo } from "@/lib/list-navigation";
import { parseErrorMessage } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/modules/suppliers/schemas";

function normalizeOptionalValue(value: FormDataEntryValue | null) {
  const parsed = typeof value === "string" ? value.trim() : "";
  return parsed.length > 0 ? parsed : undefined;
}

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  redirect(appendStatusMessage(path, type, message));
}

function getSupplierInput(formData: FormData) {
  return supplierSchema.safeParse({
    companyName: formData.get("companyName"),
    tradeName: normalizeOptionalValue(formData.get("tradeName")),
    document: formData.get("document"),
    email: normalizeOptionalValue(formData.get("email")),
    phone: normalizeOptionalValue(formData.get("phone")),
    contactName: normalizeOptionalValue(formData.get("contactName")),
  });
}

async function ensureSupplierExists(id: string, fallbackPath: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!supplier) {
    redirectWithMessage(fallbackPath, "error", "Fornecedor não encontrado.");
  }
}

async function ensureDocumentAvailable(document: string, fallbackPath: string, currentSupplierId?: string) {
  const existingSupplier = await prisma.supplier.findUnique({
    where: { document },
    select: { id: true },
  });

  if (existingSupplier && existingSupplier.id !== currentSupplierId) {
    redirectWithMessage(fallbackPath, "error", "Já existe um fornecedor cadastrado com este documento.");
  }
}

function handleKnownPrismaError(error: unknown, fallbackPath: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    redirectWithMessage(fallbackPath, "error", "Já existe um fornecedor cadastrado com este documento.");
  }

  throw error;
}

function revalidateSupplierRoutes(supplierId?: string) {
  revalidatePath("/fornecedores");
  revalidatePath("/fornecedores/novo");

  if (supplierId) {
    revalidatePath(`/fornecedores/${supplierId}/editar`);
  }
}

export async function createSupplierAction(formData: FormData) {
  await requireModulePermission(PermissionModule.fornecedores, "create");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/fornecedores");
  const createPath = buildPathWithParams("/fornecedores/novo", { returnTo });

  const parsed = getSupplierInput(formData);

  if (!parsed.success) {
    redirectWithMessage(createPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;
  await ensureDocumentAvailable(input.document, createPath);

  try {
    await prisma.supplier.create({
      data: {
        companyName: input.companyName,
        tradeName: input.tradeName ?? null,
        document: input.document,
        email: input.email ?? null,
        phone: input.phone ?? null,
        contactName: input.contactName ?? null,
      },
    });
  } catch (error) {
    handleKnownPrismaError(error, createPath);
  }

  revalidateSupplierRoutes();
  redirectWithMessage(returnTo, "success", "Fornecedor criado com sucesso.");
}

export async function updateSupplierAction(formData: FormData) {
  await requireModulePermission(PermissionModule.fornecedores, "edit");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/fornecedores");
  const editPath = buildPathWithParams(`/fornecedores/${id}/editar`, { returnTo });
  const parsed = getSupplierInput(formData);

  if (!parsed.success) {
    redirectWithMessage(editPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;

  await ensureSupplierExists(id, returnTo);
  await ensureDocumentAvailable(input.document, editPath, id);

  try {
    await prisma.supplier.update({
      where: { id },
      data: {
        companyName: input.companyName,
        tradeName: input.tradeName ?? null,
        document: input.document,
        email: input.email ?? null,
        phone: input.phone ?? null,
        contactName: input.contactName ?? null,
      },
    });
  } catch (error) {
    handleKnownPrismaError(error, editPath);
  }

  revalidateSupplierRoutes(id);
  redirectWithMessage(returnTo, "success", "Fornecedor atualizado com sucesso.");
}

export async function deleteSupplierAction(formData: FormData) {
  await requireModulePermission(PermissionModule.fornecedores, "delete");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/fornecedores");

  const linkedContracts = await prisma.contract.count({
    where: { supplierId: id },
  });

  if (linkedContracts > 0) {
    redirectWithMessage(returnTo, "error", "Há contratos vinculados a este fornecedor.");
  }

  try {
    await prisma.supplier.delete({
      where: { id },
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", parseErrorMessage(error));
  }

  revalidateSupplierRoutes(id);
  redirectWithMessage(returnTo, "success", "Fornecedor removido com sucesso.");
}

