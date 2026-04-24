import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadsRoot = path.join(process.cwd(), "public", "uploads", "contracts");

function sanitizeBaseName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function ensurePdfFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");

  if (!isPdf) {
    throw new Error("Envie um arquivo PDF válido.");
  }

  const maxFileSize = 10 * 1024 * 1024;
  if (file.size > maxFileSize) {
    throw new Error("O arquivo PDF deve ter no maximo 10 MB.");
  }
}

function getPublicPathSegments(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");

  if (!normalized.startsWith("/uploads/contracts/")) {
    throw new Error("Caminho de arquivo inválido.");
  }

  return normalized.replace("/uploads/contracts/", "").split("/");
}

export async function saveContractPdf(
  file: File,
  options: {
    scope: "contracts" | "amendments";
    prefix: string;
  },
) {
  ensurePdfFile(file);

  const directory = path.join(uploadsRoot, options.scope);
  await mkdir(directory, { recursive: true });

  const originalName = file.name.trim() || `${options.prefix}.pdf`;
  const safeBaseName = sanitizeBaseName(originalName.replace(/\.pdf$/i, "")) || options.prefix;
  const fileName = `${options.prefix}-${safeBaseName}-${randomUUID()}.pdf`;
  const absolutePath = path.join(directory, fileName);

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(absolutePath, Buffer.from(arrayBuffer));

  return {
    attachmentName: originalName,
    attachmentPath: `/uploads/contracts/${options.scope}/${fileName}`,
    attachmentMimeType: "application/pdf",
    attachmentSize: file.size,
  };
}

export async function deleteStoredContractFile(filePath?: string | null) {
  if (!filePath) {
    return;
  }

  const absolutePath = path.join(uploadsRoot, ...getPublicPathSegments(filePath));

  try {
    await unlink(absolutePath);
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;

    if (fileError.code !== "ENOENT") {
      throw error;
    }
  }
}

