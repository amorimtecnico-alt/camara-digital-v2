"use server";

import {
  Prisma,
  ContractAmendmentType,
  ContractAttachmentAuditAction,
  ContractStatus,
  PermissionModule,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireModulePermission } from "@/lib/permissions";
import { appendStatusMessage, buildPathWithParams, resolveReturnTo } from "@/lib/list-navigation";
import { prisma } from "@/lib/prisma";
import { parseErrorMessage } from "@/lib/utils";
import {
  assertCanModifyContractAttachment,
} from "@/modules/contracts/attachment-permissions";
import { deleteStoredContractFile, saveContractPdf } from "@/modules/contracts/files";
import {
  contractAmendmentSchema,
  contractAttachmentAuditSchema,
  contractSchema,
} from "@/modules/contracts/schemas";

function normalizeOptionalValue(value: FormDataEntryValue | null) {
  const parsed = typeof value === "string" ? value.trim() : "";
  return parsed.length > 0 ? parsed : undefined;
}

function normalizeOptionalMoney(value: FormDataEntryValue | null) {
  const parsed = normalizeOptionalValue(value);
  return parsed?.replace(",", ".");
}

function getOptionalPdfFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return undefined;
  }

  return value;
}

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  redirect(appendStatusMessage(path, type, message));
}

function getContractInput(formData: FormData) {
  return contractSchema.safeParse({
    number: formData.get("number"),
    object: formData.get("object"),
    status: formData.get("status") ?? ContractStatus.DRAFT,
    supplierId: normalizeOptionalValue(formData.get("supplierId")),
    startDate: normalizeOptionalValue(formData.get("startDate")),
    endDate: normalizeOptionalValue(formData.get("endDate")),
    initialValue: normalizeOptionalMoney(formData.get("initialValue")),
    notes: normalizeOptionalValue(formData.get("notes")),
  });
}

function getContractAmendmentInput(formData: FormData) {
  return contractAmendmentSchema.safeParse({
    number: formData.get("number"),
    type: formData.get("type") ?? ContractAmendmentType.OUTRO,
    amendmentDate: normalizeOptionalValue(formData.get("amendmentDate")),
    description: formData.get("description"),
    previousEndDate: normalizeOptionalValue(formData.get("previousEndDate")),
    newEndDate: normalizeOptionalValue(formData.get("newEndDate")),
    previousValue: normalizeOptionalMoney(formData.get("previousValue")),
    newValue: normalizeOptionalMoney(formData.get("newValue")),
  });
}

function getContractAttachmentAuditInput(formData: FormData) {
  return contractAttachmentAuditSchema.safeParse({
    justification: normalizeOptionalValue(formData.get("justification")),
  });
}

async function ensureContractExists(id: string) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      endDate: true,
      endDateCurrent: true,
      initialValue: true,
      currentValue: true,
      attachmentName: true,
      attachmentPath: true,
      attachmentMimeType: true,
      attachmentSize: true,
      attachmentUploadedAt: true,
    },
  });

  if (!contract) {
    redirectWithMessage("/contratos", "error", "Contrato não encontrado.");
  }

  return contract;
}

async function ensureAmendmentExists(contractId: string, amendmentId: string) {
  const amendment = await prisma.contractAmendment.findFirst({
    where: {
      id: amendmentId,
      contractId,
    },
  });

  if (!amendment) {
    redirectWithMessage(`/contratos/${contractId}/editar`, "error", "Aditivo não encontrado.");
  }

  return amendment;
}

async function ensureSupplierExists(supplierId: string | undefined, fallbackPath: string) {
  if (!supplierId) {
    return;
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true },
  });

  if (!supplier) {
    redirectWithMessage(fallbackPath, "error", "Fornecedor informado não foi encontrado.");
  }
}

async function ensureNumberAvailable(number: string, fallbackPath: string, currentContractId?: string) {
  const existingContract = await prisma.contract.findUnique({
    where: { number },
    select: { id: true },
  });

  if (existingContract && existingContract.id !== currentContractId) {
    redirectWithMessage(fallbackPath, "error", "Já existe um contrato cadastrado com este número.");
  }
}

async function ensureAmendmentNumberAvailable(contractId: string, number: string, currentAmendmentId?: string) {
  const existingAmendment = await prisma.contractAmendment.findFirst({
    where: {
      contractId,
      number,
    },
    select: { id: true },
  });

  if (existingAmendment && existingAmendment.id !== currentAmendmentId) {
    redirectWithMessage(
      currentAmendmentId
        ? `/contratos/${contractId}/aditivos/${currentAmendmentId}/editar`
        : `/contratos/${contractId}/aditivos/novo`,
      "error",
      "Já existe um aditivo cadastrado com este número para este contrato.",
    );
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function handleKnownContractError(error: unknown, fallbackPath: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    redirectWithMessage(fallbackPath, "error", "Já existe um contrato cadastrado com este número.");
  }

  throw error;
}

function handleKnownAmendmentError(error: unknown, fallbackPath: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    redirectWithMessage(fallbackPath, "error", "Já existe um aditivo cadastrado com este número para este contrato.");
  }

  throw error;
}

function revalidateContractRoutes(contractId?: string, amendmentId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/contratos");
  revalidatePath("/contratos/novo");

  if (contractId) {
    revalidatePath(`/contratos/${contractId}/editar`);
    revalidatePath(`/contratos/${contractId}/aditivos/novo`);

    if (amendmentId) {
      revalidatePath(`/contratos/${contractId}/aditivos/${amendmentId}/editar`);
    }
  }
}

function toDateOrNull(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function toDecimalOrNull(value?: string) {
  return value ? new Prisma.Decimal(value) : null;
}

function shouldUpdateEndDate(type: ContractAmendmentType) {
  return type === ContractAmendmentType.PRAZO || type === ContractAmendmentType.PRAZO_E_VALOR;
}

function shouldUpdateValue(type: ContractAmendmentType) {
  return type === ContractAmendmentType.VALOR || type === ContractAmendmentType.PRAZO_E_VALOR;
}

async function syncContractCurrentData(transaction: Prisma.TransactionClient, contractId: string) {
  const contract = await transaction.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      endDate: true,
      initialValue: true,
      amendments: {
        orderBy: [{ amendmentDate: "asc" }, { createdAt: "asc" }],
        select: {
          type: true,
          newEndDate: true,
          newValue: true,
        },
      },
    },
  });

  if (!contract) {
    return;
  }

  let endDateCurrent = contract.endDate;
  let currentValue = contract.initialValue;

  for (const amendment of contract.amendments) {
    if (shouldUpdateEndDate(amendment.type) && amendment.newEndDate) {
      endDateCurrent = amendment.newEndDate;
    }

    if (shouldUpdateValue(amendment.type) && amendment.newValue) {
      currentValue = amendment.newValue;
    }
  }

  await transaction.contract.update({
    where: { id: contractId },
    data: {
      endDateCurrent,
      currentValue,
    },
  });
}

export async function createContractAction(formData: FormData) {
  await requireModulePermission(PermissionModule.contratos, "create");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/contratos");
  const createPath = buildPathWithParams("/contratos/novo", { returnTo });

  const parsed = getContractInput(formData);

  if (!parsed.success) {
    redirectWithMessage(createPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;
  const attachmentFile = getOptionalPdfFile(formData.get("attachmentFile"));

  await ensureSupplierExists(input.supplierId, createPath);
  await ensureNumberAvailable(input.number, createPath);

  let attachmentData: Awaited<ReturnType<typeof saveContractPdf>> | undefined;

  try {
    if (attachmentFile) {
      attachmentData = await saveContractPdf(attachmentFile, {
        scope: "contracts",
        prefix: "contrato",
      });
    }

    await prisma.contract.create({
      data: {
        number: input.number,
        object: input.object,
        status: input.status,
        supplierId: input.supplierId ?? null,
        startDate: toDateOrNull(input.startDate),
        endDate: toDateOrNull(input.endDate),
        endDateCurrent: toDateOrNull(input.endDate),
        initialValue: toDecimalOrNull(input.initialValue),
        currentValue: toDecimalOrNull(input.initialValue),
        notes: input.notes ?? null,
        attachmentUploadedAt: attachmentData ? new Date() : null,
        ...attachmentData,
      },
    });
  } catch (error) {
    if (attachmentData?.attachmentPath) {
      await deleteStoredContractFile(attachmentData.attachmentPath);
    }

    if (isUniqueConstraintError(error)) {
      handleKnownContractError(error, createPath);
    }

    redirectWithMessage(createPath, "error", parseErrorMessage(error));
  }

  revalidateContractRoutes();
  redirectWithMessage(returnTo, "success", "Contrato criado com sucesso.");
}

export async function updateContractAction(formData: FormData) {
  await requireModulePermission(PermissionModule.contratos, "edit");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/contratos");
  const editPath = buildPathWithParams(`/contratos/${id}/editar`, { returnTo });
  const parsed = getContractInput(formData);

  if (!parsed.success) {
    redirectWithMessage(editPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;
  await ensureContractExists(id);

  await ensureSupplierExists(input.supplierId, editPath);
  await ensureNumberAvailable(input.number, editPath, id);

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.contract.update({
        where: { id },
        data: {
          number: input.number,
          object: input.object,
          status: input.status,
          supplierId: input.supplierId ?? null,
          startDate: toDateOrNull(input.startDate),
          endDate: toDateOrNull(input.endDate),
          initialValue: toDecimalOrNull(input.initialValue),
          notes: input.notes ?? null,
        },
      });

      await syncContractCurrentData(transaction, id);
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      handleKnownContractError(error, editPath);
    }

    redirectWithMessage(editPath, "error", parseErrorMessage(error));
  }

  revalidateContractRoutes(id);
  redirectWithMessage(returnTo, "success", "Contrato atualizado com sucesso.");
}

async function createContractAttachmentAuditLog(
  transaction: Prisma.TransactionClient,
  input: {
    contractId: string;
    userId: string;
    action: ContractAttachmentAuditAction;
    previousFileName?: string | null;
    newFileName?: string | null;
    justification: string | undefined;
  },
) {
  await transaction.contractAttachmentAuditLog.create({
    data: {
      contractId: input.contractId,
      userId: input.userId,
      action: input.action,
      previousFileName: input.previousFileName ?? null,
      newFileName: input.newFileName ?? null,
      justification: input.justification ?? null,
    },
  });
}

export async function replaceContractAttachmentAction(formData: FormData) {
  const currentUser = await requireModulePermission(PermissionModule.contratos, "edit");

  const contractId = String(formData.get("contractId"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/contratos");
  const editPath = buildPathWithParams(`/contratos/${contractId}/editar`, { returnTo });
  const existingContract = await ensureContractExists(contractId);
  const parsedAudit = getContractAttachmentAuditInput(formData);

  if (!parsedAudit.success) {
    redirectWithMessage(editPath, "error", parsedAudit.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const attachmentFile = getOptionalPdfFile(formData.get("attachmentFile"));

  if (!attachmentFile) {
    redirectWithMessage(editPath, "error", "Envie um arquivo PDF para substituir o anexo.");
  }

  const { justification } = parsedAudit.data;

  try {
    assertCanModifyContractAttachment({
      attachmentUploadedAt: existingContract.attachmentUploadedAt,
      role: currentUser.role,
      justification,
    });
  } catch (error) {
    redirectWithMessage(editPath, "error", parseErrorMessage(error));
  }

  let attachmentData: Awaited<ReturnType<typeof saveContractPdf>> | undefined;

  try {
    attachmentData = await saveContractPdf(attachmentFile, {
      scope: "contracts",
      prefix: "contrato",
    });

    const savedAttachmentData = attachmentData;

    await prisma.$transaction(async (transaction) => {
      await transaction.contract.update({
        where: { id: contractId },
        data: {
          ...savedAttachmentData,
          attachmentUploadedAt: new Date(),
        },
      });

      await createContractAttachmentAuditLog(transaction, {
        contractId,
        userId: currentUser.id,
        action: ContractAttachmentAuditAction.SUBSTITUIU_ANEXO,
        previousFileName: existingContract.attachmentName,
        newFileName: savedAttachmentData.attachmentName,
        justification,
      });
    });

    if (existingContract.attachmentPath) {
      await deleteStoredContractFile(existingContract.attachmentPath);
    }
  } catch (error) {
    if (attachmentData?.attachmentPath) {
      await deleteStoredContractFile(attachmentData.attachmentPath);
    }

    redirectWithMessage(editPath, "error", parseErrorMessage(error));
  }

  revalidateContractRoutes(contractId);
  redirectWithMessage(editPath, "success", "Anexo principal substituído com sucesso.");
}

export async function deleteContractAttachmentAction(formData: FormData) {
  const currentUser = await requireModulePermission(PermissionModule.contratos, "edit");

  const contractId = String(formData.get("contractId"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/contratos");
  const editPath = buildPathWithParams(`/contratos/${contractId}/editar`, { returnTo });
  const existingContract = await ensureContractExists(contractId);
  const parsedAudit = getContractAttachmentAuditInput(formData);

  if (!parsedAudit.success) {
    redirectWithMessage(editPath, "error", parsedAudit.error.issues[0]?.message ?? "Dados inválidos.");
  }

  if (!existingContract.attachmentPath) {
    redirectWithMessage(editPath, "error", "Não existe anexo principal para excluir.");
  }

  const { justification } = parsedAudit.data;

  try {
    assertCanModifyContractAttachment({
      attachmentUploadedAt: existingContract.attachmentUploadedAt,
      role: currentUser.role,
      justification,
    });
  } catch (error) {
    redirectWithMessage(editPath, "error", parseErrorMessage(error));
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.contract.update({
        where: { id: contractId },
        data: {
          attachmentName: null,
          attachmentPath: null,
          attachmentMimeType: null,
          attachmentSize: null,
          attachmentUploadedAt: null,
        },
      });

      await createContractAttachmentAuditLog(transaction, {
        contractId,
        userId: currentUser.id,
        action: ContractAttachmentAuditAction.EXCLUIU_ANEXO,
        previousFileName: existingContract.attachmentName,
        justification,
      });
    });

    await deleteStoredContractFile(existingContract.attachmentPath);
  } catch (error) {
    redirectWithMessage(editPath, "error", parseErrorMessage(error));
  }

  revalidateContractRoutes(contractId);
  redirectWithMessage(editPath, "success", "Anexo principal excluído com sucesso.");
}

export async function createContractAmendmentAction(formData: FormData) {
  await requireModulePermission(PermissionModule.contratos, "edit");

  const contractId = String(formData.get("contractId"));
  const contract = await ensureContractExists(contractId);
  const parsed = getContractAmendmentInput(formData);

  if (!parsed.success) {
    redirectWithMessage(
      `/contratos/${contractId}/aditivos/novo`,
      "error",
      parsed.error.issues[0]?.message ?? "Dados inválidos.",
    );
  }

  const input = parsed.data;
  const attachmentFile = getOptionalPdfFile(formData.get("attachmentFile"));
  const amendmentDate = toDateOrNull(input.amendmentDate);

  if (!amendmentDate) {
    redirectWithMessage(`/contratos/${contractId}/aditivos/novo`, "error", "Data do aditivo é obrigatória.");
  }

  await ensureAmendmentNumberAvailable(contractId, input.number);

  const previousEndDate = shouldUpdateEndDate(input.type)
    ? toDateOrNull(input.previousEndDate) ?? contract.endDateCurrent ?? contract.endDate
    : toDateOrNull(input.previousEndDate);
  const newEndDate = shouldUpdateEndDate(input.type) ? toDateOrNull(input.newEndDate) : toDateOrNull(input.newEndDate);
  const previousValue = shouldUpdateValue(input.type)
    ? toDecimalOrNull(input.previousValue) ?? contract.currentValue ?? contract.initialValue
    : toDecimalOrNull(input.previousValue);
  const newValue = shouldUpdateValue(input.type) ? toDecimalOrNull(input.newValue) : toDecimalOrNull(input.newValue);

  let attachmentData: Awaited<ReturnType<typeof saveContractPdf>> | undefined;

  try {
    if (attachmentFile) {
      attachmentData = await saveContractPdf(attachmentFile, {
        scope: "amendments",
        prefix: "aditivo",
      });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.contractAmendment.create({
        data: {
          contractId,
          number: input.number,
          type: input.type,
          amendmentDate,
          description: input.description,
          previousEndDate,
          newEndDate,
          previousValue,
          newValue,
          ...attachmentData,
        },
      });

      await syncContractCurrentData(transaction, contractId);
    });
  } catch (error) {
    if (attachmentData?.attachmentPath) {
      await deleteStoredContractFile(attachmentData.attachmentPath);
    }

    if (isUniqueConstraintError(error)) {
      handleKnownAmendmentError(error, `/contratos/${contractId}/aditivos/novo`);
    }

    redirectWithMessage(`/contratos/${contractId}/aditivos/novo`, "error", parseErrorMessage(error));
  }

  revalidateContractRoutes(contractId);
  redirectWithMessage(`/contratos/${contractId}/editar`, "success", "Aditivo criado com sucesso.");
}

export async function updateContractAmendmentAction(formData: FormData) {
  await requireModulePermission(PermissionModule.contratos, "edit");

  const contractId = String(formData.get("contractId"));
  const amendmentId = String(formData.get("id"));
  const contract = await ensureContractExists(contractId);
  const existingAmendment = await ensureAmendmentExists(contractId, amendmentId);
  const parsed = getContractAmendmentInput(formData);

  if (!parsed.success) {
    redirectWithMessage(
      `/contratos/${contractId}/aditivos/${amendmentId}/editar`,
      "error",
      parsed.error.issues[0]?.message ?? "Dados inválidos.",
    );
  }

  const input = parsed.data;
  const attachmentFile = getOptionalPdfFile(formData.get("attachmentFile"));
  const amendmentDate = toDateOrNull(input.amendmentDate);

  if (!amendmentDate) {
    redirectWithMessage(
      `/contratos/${contractId}/aditivos/${amendmentId}/editar`,
      "error",
      "Data do aditivo é obrigatória.",
    );
  }

  await ensureAmendmentNumberAvailable(contractId, input.number, amendmentId);

  const previousEndDate = shouldUpdateEndDate(input.type)
    ? toDateOrNull(input.previousEndDate) ?? existingAmendment.previousEndDate ?? contract.endDateCurrent ?? contract.endDate
    : toDateOrNull(input.previousEndDate);
  const newEndDate = shouldUpdateEndDate(input.type) ? toDateOrNull(input.newEndDate) : toDateOrNull(input.newEndDate);
  const previousValue = shouldUpdateValue(input.type)
    ? toDecimalOrNull(input.previousValue) ?? existingAmendment.previousValue ?? contract.currentValue ?? contract.initialValue
    : toDecimalOrNull(input.previousValue);
  const newValue = shouldUpdateValue(input.type) ? toDecimalOrNull(input.newValue) : toDecimalOrNull(input.newValue);

  let attachmentData: Awaited<ReturnType<typeof saveContractPdf>> | undefined;

  try {
    if (attachmentFile) {
      attachmentData = await saveContractPdf(attachmentFile, {
        scope: "amendments",
        prefix: "aditivo",
      });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.contractAmendment.update({
        where: { id: amendmentId },
        data: {
          number: input.number,
          type: input.type,
          amendmentDate,
          description: input.description,
          previousEndDate,
          newEndDate,
          previousValue,
          newValue,
          ...(attachmentData ?? {}),
        },
      });

      await syncContractCurrentData(transaction, contractId);
    });

    if (attachmentData?.attachmentPath && existingAmendment.attachmentPath) {
      await deleteStoredContractFile(existingAmendment.attachmentPath);
    }
  } catch (error) {
    if (attachmentData?.attachmentPath) {
      await deleteStoredContractFile(attachmentData.attachmentPath);
    }

    if (isUniqueConstraintError(error)) {
      handleKnownAmendmentError(error, `/contratos/${contractId}/aditivos/${amendmentId}/editar`);
    }

    redirectWithMessage(
      `/contratos/${contractId}/aditivos/${amendmentId}/editar`,
      "error",
      parseErrorMessage(error),
    );
  }

  revalidateContractRoutes(contractId, amendmentId);
  redirectWithMessage(`/contratos/${contractId}/editar`, "success", "Aditivo atualizado com sucesso.");
}

export async function deleteContractAction(formData: FormData) {
  await requireModulePermission(PermissionModule.contratos, "delete");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/contratos");

  const contract = await prisma.contract.findUnique({
    where: { id },
    select: {
      attachmentPath: true,
      amendments: {
        select: {
          attachmentPath: true,
        },
      },
    },
  });

  if (!contract) {
    redirectWithMessage(returnTo, "error", "Contrato não encontrado.");
  }

  try {
    await prisma.contract.delete({
      where: { id },
    });

    if (contract.attachmentPath) {
      await deleteStoredContractFile(contract.attachmentPath);
    }

    for (const amendment of contract.amendments) {
      if (amendment.attachmentPath) {
        await deleteStoredContractFile(amendment.attachmentPath);
      }
    }
  } catch (error) {
    redirectWithMessage(returnTo, "error", parseErrorMessage(error));
  }

  revalidateContractRoutes(id);
  redirectWithMessage(returnTo, "success", "Contrato removido com sucesso.");
}

