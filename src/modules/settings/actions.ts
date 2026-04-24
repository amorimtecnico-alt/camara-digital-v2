"use server";

import bcrypt from "bcryptjs";
import { PermissionModule, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { appendStatusMessage } from "@/lib/list-navigation";
import { canManageUsers, hasRole, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { parseErrorMessage } from "@/lib/utils";
import { deleteStoredSettingsFile, saveSettingsImage } from "@/modules/settings/files";
import { chamberSchema, profileSchema } from "@/modules/settings/schemas";

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  redirect(appendStatusMessage(path, type, message));
}

function getProfileReturnPath(formData: FormData) {
  return formData.get("returnTo") === "/meu-perfil" ? "/meu-perfil" : "/configuracoes?tab=perfil";
}

function getOptionalImageFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return undefined;
  }

  return value;
}

export async function updateProfileAction(formData: FormData) {
  const currentUser = await requireUser();
  const returnPath = getProfileReturnPath(formData);
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithMessage(returnPath, "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const existingEmail = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
    select: {
      id: true,
    },
  });

  if (existingEmail && existingEmail.id !== currentUser.id) {
    redirectWithMessage(returnPath, "error", "Já existe um usuário com este e-mail.");
  }

  const avatarFile = getOptionalImageFile(formData.get("avatarFile"));
  let avatarData: Awaited<ReturnType<typeof saveSettingsImage>> | undefined;

  try {
    if (avatarFile) {
      avatarData = await saveSettingsImage(avatarFile, {
        prefix: "avatar",
        scope: "avatars",
      });
    }

    const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : undefined;

    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        ...(passwordHash ? { passwordHash } : {}),
        ...(avatarData
          ? {
              avatarName: avatarData.fileName,
              avatarPath: avatarData.filePath,
              avatarMimeType: avatarData.fileMimeType,
              avatarSize: avatarData.fileSize,
              avatarUploadedAt: avatarData.uploadedAt,
            }
          : {}),
      },
    });

    if (avatarData && currentUser.avatarPath) {
      await deleteStoredSettingsFile(currentUser.avatarPath);
    }
  } catch (error) {
    if (avatarData?.filePath) {
      await deleteStoredSettingsFile(avatarData.filePath);
    }

    redirectWithMessage(returnPath, "error", parseErrorMessage(error));
  }

  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  revalidatePath("/meu-perfil");
  redirectWithMessage(returnPath, "success", "Perfil atualizado com sucesso.");
}

export async function removeProfileAvatarAction(formData: FormData) {
  const currentUser = await requireUser();
  const returnPath = getProfileReturnPath(formData);

  try {
    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        avatarName: null,
        avatarPath: null,
        avatarMimeType: null,
        avatarSize: null,
        avatarUploadedAt: null,
      },
    });

    if (currentUser.avatarPath) {
      await deleteStoredSettingsFile(currentUser.avatarPath);
    }
  } catch (error) {
    redirectWithMessage(returnPath, "error", parseErrorMessage(error));
  }

  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  revalidatePath("/meu-perfil");
  redirectWithMessage(returnPath, "success", "Avatar removido com sucesso.");
}

export async function updateChamberConfigAction(formData: FormData) {
  await requirePermission((user) => hasRole(user, [UserRole.ADMIN, UserRole.MANAGER]));

  const parsed = chamberSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    redirectWithMessage("/configuracoes?tab=camara", "error", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const existingConfig = await prisma.chamberConfig.upsert({
    where: {
      id: "default",
    },
    create: {
      id: "default",
      name: parsed.data.name,
    },
    update: {},
  });

  const logoFile = getOptionalImageFile(formData.get("logoFile"));
  let logoData: Awaited<ReturnType<typeof saveSettingsImage>> | undefined;

  try {
    if (logoFile) {
      logoData = await saveSettingsImage(logoFile, {
        prefix: "logo",
        scope: "logos",
      });
    }

    await prisma.chamberConfig.update({
      where: {
        id: "default",
      },
      data: {
        name: parsed.data.name,
        ...(logoData
          ? {
              logoName: logoData.fileName,
              logoPath: logoData.filePath,
              logoMimeType: logoData.fileMimeType,
              logoSize: logoData.fileSize,
              logoUploadedAt: logoData.uploadedAt,
            }
          : {}),
      },
    });

    if (logoData && existingConfig.logoPath) {
      await deleteStoredSettingsFile(existingConfig.logoPath);
    }
  } catch (error) {
    if (logoData?.filePath) {
      await deleteStoredSettingsFile(logoData.filePath);
    }

    redirectWithMessage("/configuracoes?tab=camara", "error", parseErrorMessage(error));
  }

  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  redirectWithMessage("/configuracoes?tab=camara", "success", "Configuração da câmara atualizada.");
}

export async function updateUserPermissionsAction(formData: FormData) {
  await requirePermission(canManageUsers);

  const userId = String(formData.get("userId"));
  const targetUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetUser) {
    redirectWithMessage("/configuracoes?tab=permissoes", "error", "Usuário não encontrado.");
  }

  const permissionModules = Object.values(PermissionModule);

  try {
    await prisma.$transaction(async (transaction) => {
      for (const permissionModule of permissionModules) {
        await transaction.userModulePermission.upsert({
          where: {
            userId_module: {
              userId,
              module: permissionModule,
            },
          },
          create: {
            userId,
            module: permissionModule,
            canView: formData.get(`${permissionModule}.view`) === "on",
            canCreate: formData.get(`${permissionModule}.create`) === "on",
            canEdit: formData.get(`${permissionModule}.edit`) === "on",
            canDelete: formData.get(`${permissionModule}.delete`) === "on",
          },
          update: {
            canView: formData.get(`${permissionModule}.view`) === "on",
            canCreate: formData.get(`${permissionModule}.create`) === "on",
            canEdit: formData.get(`${permissionModule}.edit`) === "on",
            canDelete: formData.get(`${permissionModule}.delete`) === "on",
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      redirectWithMessage("/configuracoes?tab=permissoes", "error", "Não foi possível salvar as permissões.");
    }

    redirectWithMessage("/configuracoes?tab=permissoes", "error", parseErrorMessage(error));
  }

  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  redirectWithMessage("/configuracoes?tab=permissoes", "success", "Permissões atualizadas.");
}

