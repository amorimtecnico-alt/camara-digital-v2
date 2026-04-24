import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadsRoot = path.join(process.cwd(), "public", "uploads", "settings");

function sanitizeBaseName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function ensureImageFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const isImage =
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/webp" ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp");

  if (!isImage) {
    throw new Error("Envie uma imagem PNG, JPG ou WebP valida.");
  }

  const maxFileSize = 4 * 1024 * 1024;
  if (file.size > maxFileSize) {
    throw new Error("A imagem deve ter no maximo 4 MB.");
  }
}

function getExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function getPublicPathSegments(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");

  if (!normalized.startsWith("/uploads/settings/")) {
    throw new Error("Caminho de arquivo inválido.");
  }

  return normalized.replace("/uploads/settings/", "").split("/");
}

export async function saveSettingsImage(
  file: File,
  options: {
    prefix: string;
    scope: "avatars" | "logos";
  },
) {
  ensureImageFile(file);

  const directory = path.join(uploadsRoot, options.scope);
  await mkdir(directory, { recursive: true });

  const originalName = file.name.trim() || `${options.prefix}.${getExtension(file)}`;
  const safeBaseName = sanitizeBaseName(originalName.replace(/\.(png|jpg|jpeg|webp)$/i, "")) || options.prefix;
  const extension = getExtension(file);
  const fileName = `${options.prefix}-${safeBaseName}-${randomUUID()}.${extension}`;
  const absolutePath = path.join(directory, fileName);

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(absolutePath, Buffer.from(arrayBuffer));

  return {
    fileName: originalName,
    filePath: `/uploads/settings/${options.scope}/${fileName}`,
    fileMimeType: file.type || `image/${extension}`,
    fileSize: file.size,
    uploadedAt: new Date(),
  };
}

export async function deleteStoredSettingsFile(filePath?: string | null) {
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

