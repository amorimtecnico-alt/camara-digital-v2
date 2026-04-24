"use server";

import { PermissionModule, Prisma, LicitationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireModulePermission } from "@/lib/permissions";
import { appendStatusMessage, buildPathWithParams, resolveReturnTo } from "@/lib/list-navigation";
import { prisma } from "@/lib/prisma";
import { parseErrorMessage } from "@/lib/utils";
import { deleteStoredLicitationFile, saveLicitationPdf } from "@/modules/licitation/files";
import {
  licitationAttachmentSchema,
  licitationSchema,
} from "@/modules/licitation/schemas";

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

function toDateOrNull(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function toDecimalOrNull(value?: string) {
  return value ? new Prisma.Decimal(value) : null;
}

function getLicitationInput(formData: FormData) {
  return licitationSchema.safeParse({
    number: formData.get("number"),
    object: formData.get("object"),
    modality: formData.get("modality"),
    status: formData.get("status") ?? LicitationStatus.RASCUNHO,
    publicationDate: normalizeOptionalValue(formData.get("publicationDate")),
    openingDate: normalizeOptionalValue(formData.get("openingDate")),
    estimatedValue: normalizeOptionalMoney(formData.get("estimatedValue")),
    awardedValue: normalizeOptionalMoney(formData.get("awardedValue")),
    notes: normalizeOptionalValue(formData.get("notes")),
    winnerSupplierId: normalizeOptionalValue(formData.get("winnerSupplierId")),
    contractGenerated: String(formData.get("contractGenerated")) === "true",
  });
}

function getAttachmentInput(formData: FormData) {
  return licitationAttachmentSchema.safeParse({
    attachmentType: formData.get("attachmentType"),
  });
}

async function ensureLicitationExists(id: string) {
  const licitation = await prisma.licitation.findUnique({
    where: { id },
    select: {
      id: true,
      editalFileName: true,
      editalFilePath: true,
      homologationFileName: true,
      homologationFilePath: true,
    },
  });

  if (!licitation) {
    redirectWithMessage("/licitacoes", "error", "Licitação não encontrada.");
  }

  return licitation;
}

async function ensureWinnerSupplierExists(winnerSupplierId: string | undefined, fallbackPath: string) {
  if (!winnerSupplierId) {
    return;
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: winnerSupplierId },
    select: { id: true },
  });

  if (!supplier) {
    redirectWithMessage(fallbackPath, "error", "Fornecedor vencedor informado não foi encontrado.");
  }
}

async function ensureLicitationNumberAvailable(number: string, fallbackPath: string, currentId?: string) {
  const existingLicitation = await prisma.licitation.findUnique({
    where: { number },
    select: { id: true },
  });

  if (existingLicitation && existingLicitation.id !== currentId) {
    redirectWithMessage(fallbackPath, "error", "Já existe uma licitação cadastrada com este número.");
  }
}

function revalidateLicitationRoutes(id?: string) {
  revalidatePath("/licitacoes");
  revalidatePath("/licitacoes/novo");

  if (id) {
    revalidatePath(`/licitacoes/${id}/editar`);
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createLicitationAction(formData: FormData) {
  await requireModulePermission(PermissionModule.licitacoes, "create");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/licitacoes");
  const createPath = buildPathWithParams("/licitacoes/novo", { returnTo });

  const parsed = getLicitationInput(formData);

  if (!parsed.success) {
    redirectWithMessage(createPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;
  const editalFile = getOptionalPdfFile(formData.get("editalFile"));
  const homologationFile = getOptionalPdfFile(formData.get("homologationFile"));

  await ensureWinnerSupplierExists(input.winnerSupplierId, createPath);
  await ensureLicitationNumberAvailable(input.number, createPath);

  let editalData: Awaited<ReturnType<typeof saveLicitationPdf>> | undefined;
  let homologationData: Awaited<ReturnType<typeof saveLicitationPdf>> | undefined;

  try {
    if (editalFile) {
      editalData = await saveLicitationPdf(editalFile, {
        scope: "edital",
        prefix: "edital",
      });
    }

    if (homologationFile) {
      homologationData = await saveLicitationPdf(homologationFile, {
        scope: "homologation",
        prefix: "homologacao",
      });
    }

    await prisma.licitation.create({
      data: {
        number: input.number,
        object: input.object,
        modality: input.modality,
        status: input.status,
        publicationDate: toDateOrNull(input.publicationDate),
        openingDate: toDateOrNull(input.openingDate),
        estimatedValue: toDecimalOrNull(input.estimatedValue),
        awardedValue: toDecimalOrNull(input.awardedValue),
        notes: input.notes ?? null,
        winnerSupplierId: input.winnerSupplierId ?? null,
        contractGenerated: input.contractGenerated,
        editalFileName: editalData?.fileName ?? null,
        editalFilePath: editalData?.filePath ?? null,
        editalFileMimeType: editalData?.fileMimeType ?? null,
        editalFileSize: editalData?.fileSize ?? null,
        editalUploadedAt: editalData?.uploadedAt ?? null,
        homologationFileName: homologationData?.fileName ?? null,
        homologationFilePath: homologationData?.filePath ?? null,
        homologationFileMimeType: homologationData?.fileMimeType ?? null,
        homologationFileSize: homologationData?.fileSize ?? null,
        homologationUploadedAt: homologationData?.uploadedAt ?? null,
      },
    });
  } catch (error) {
    if (editalData?.filePath) {
      await deleteStoredLicitationFile(editalData.filePath);
    }

    if (homologationData?.filePath) {
      await deleteStoredLicitationFile(homologationData.filePath);
    }

    if (isUniqueConstraintError(error)) {
      redirectWithMessage(createPath, "error", "Já existe uma licitação cadastrada com este número.");
    }

    redirectWithMessage(createPath, "error", parseErrorMessage(error));
  }

  revalidateLicitationRoutes();
  redirectWithMessage(returnTo, "success", "Licitação criada com sucesso.");
}

export async function updateLicitationAction(formData: FormData) {
  await requireModulePermission(PermissionModule.licitacoes, "edit");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/licitacoes");
  const editPath = buildPathWithParams(`/licitacoes/${id}/editar`, { returnTo });
  const parsed = getLicitationInput(formData);

  if (!parsed.success) {
    redirectWithMessage(editPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const input = parsed.data;

  await ensureLicitationExists(id);
  await ensureWinnerSupplierExists(input.winnerSupplierId, editPath);
  await ensureLicitationNumberAvailable(input.number, editPath, id);

  try {
    await prisma.licitation.update({
      where: { id },
      data: {
        number: input.number,
        object: input.object,
        modality: input.modality,
        status: input.status,
        publicationDate: toDateOrNull(input.publicationDate),
        openingDate: toDateOrNull(input.openingDate),
        estimatedValue: toDecimalOrNull(input.estimatedValue),
        awardedValue: toDecimalOrNull(input.awardedValue),
        notes: input.notes ?? null,
        winnerSupplierId: input.winnerSupplierId ?? null,
        contractGenerated: input.contractGenerated,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirectWithMessage(editPath, "error", "Já existe uma licitação cadastrada com este número.");
    }

    redirectWithMessage(editPath, "error", parseErrorMessage(error));
  }

  revalidateLicitationRoutes(id);
  redirectWithMessage(returnTo, "success", "Licitação atualizada com sucesso.");
}

export async function replaceLicitationAttachmentAction(formData: FormData) {
  await requireModulePermission(PermissionModule.licitacoes, "edit");

  const licitationId = String(formData.get("licitationId"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/licitacoes");
  const editPath = buildPathWithParams(`/licitacoes/${licitationId}/editar`, { returnTo });
  const licitation = await ensureLicitationExists(licitationId);
  const parsed = getAttachmentInput(formData);

  if (!parsed.success) {
    redirectWithMessage(editPath, "error", "Tipo de anexo inválido.");
  }

  const attachmentType = parsed.data.attachmentType;
  const attachmentFile = getOptionalPdfFile(formData.get("attachmentFile"));

  if (!attachmentFile) {
    redirectWithMessage(editPath, "error", "Envie um arquivo PDF válido.");
  }

  let savedAttachment: Awaited<ReturnType<typeof saveLicitationPdf>> | undefined;

  try {
    savedAttachment = await saveLicitationPdf(attachmentFile, {
      scope: attachmentType,
      prefix: attachmentType === "edital" ? "edital" : "homologacao",
    });

    await prisma.licitation.update({
      where: { id: licitationId },
      data:
        attachmentType === "edital"
          ? {
              editalFileName: savedAttachment.fileName,
              editalFilePath: savedAttachment.filePath,
              editalFileMimeType: savedAttachment.fileMimeType,
              editalFileSize: savedAttachment.fileSize,
              editalUploadedAt: savedAttachment.uploadedAt,
            }
          : {
              homologationFileName: savedAttachment.fileName,
              homologationFilePath: savedAttachment.filePath,
              homologationFileMimeType: savedAttachment.fileMimeType,
              homologationFileSize: savedAttachment.fileSize,
              homologationUploadedAt: savedAttachment.uploadedAt,
            },
    });

    const previousFilePath =
      attachmentType === "edital" ? licitation.editalFilePath : licitation.homologationFilePath;

    if (previousFilePath) {
      await deleteStoredLicitationFile(previousFilePath);
    }
  } catch (error) {
    if (savedAttachment?.filePath) {
      await deleteStoredLicitationFile(savedAttachment.filePath);
    }

    redirectWithMessage(editPath, "error", parseErrorMessage(error));
  }

  revalidateLicitationRoutes(licitationId);
  redirectWithMessage(editPath, "success", "Anexo atualizado com sucesso.");
}

export async function deleteLicitationAttachmentAction(formData: FormData) {
  await requireModulePermission(PermissionModule.licitacoes, "edit");

  const licitationId = String(formData.get("licitationId"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/licitacoes");
  const editPath = buildPathWithParams(`/licitacoes/${licitationId}/editar`, { returnTo });
  const licitation = await ensureLicitationExists(licitationId);
  const parsed = getAttachmentInput(formData);

  if (!parsed.success) {
    redirectWithMessage(editPath, "error", "Tipo de anexo inválido.");
  }

  const attachmentType = parsed.data.attachmentType;
  const previousFilePath =
    attachmentType === "edital" ? licitation.editalFilePath : licitation.homologationFilePath;

  if (!previousFilePath) {
    redirectWithMessage(editPath, "error", "Não existe arquivo para excluir.");
  }

  try {
    await prisma.licitation.update({
      where: { id: licitationId },
      data:
        attachmentType === "edital"
          ? {
              editalFileName: null,
              editalFilePath: null,
              editalFileMimeType: null,
              editalFileSize: null,
              editalUploadedAt: null,
            }
          : {
              homologationFileName: null,
              homologationFilePath: null,
              homologationFileMimeType: null,
              homologationFileSize: null,
              homologationUploadedAt: null,
            },
    });

    await deleteStoredLicitationFile(previousFilePath);
  } catch (error) {
    redirectWithMessage(editPath, "error", parseErrorMessage(error));
  }

  revalidateLicitationRoutes(licitationId);
  redirectWithMessage(editPath, "success", "Anexo removido com sucesso.");
}

export async function deleteLicitationAction(formData: FormData) {
  await requireModulePermission(PermissionModule.licitacoes, "delete");

  const id = String(formData.get("id"));
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/licitacoes");
  const licitation = await ensureLicitationExists(id);

  try {
    await prisma.licitation.delete({
      where: { id },
    });

    if (licitation.editalFilePath) {
      await deleteStoredLicitationFile(licitation.editalFilePath);
    }

    if (licitation.homologationFilePath) {
      await deleteStoredLicitationFile(licitation.homologationFilePath);
    }
  } catch (error) {
    redirectWithMessage(returnTo, "error", parseErrorMessage(error));
  }

  revalidateLicitationRoutes(id);
  redirectWithMessage(returnTo, "success", "Licitação removida com sucesso.");
}

