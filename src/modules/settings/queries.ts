import { PermissionModule } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const configurableModules = [
  PermissionModule.protocolos,
  PermissionModule.contratos,
  PermissionModule.licitacoes,
  PermissionModule.fornecedores,
  PermissionModule.usuarios,
] as const;

export const moduleLabels: Record<PermissionModule, string> = {
  [PermissionModule.protocolos]: "Protocolos",
  [PermissionModule.contratos]: "Contratos",
  [PermissionModule.licitacoes]: "Licitações",
  [PermissionModule.fornecedores]: "Fornecedores",
  [PermissionModule.usuarios]: "Usuários",
};

export async function getChamberConfig() {
  const config = await prisma.chamberConfig.findUnique({
    where: {
      id: "default",
    },
  });

  if (config) {
    return config;
  }

  return prisma.chamberConfig.create({
    data: {
      id: "default",
      name: "Câmara Municipal",
    },
  });
}

export async function getSettingsData(currentUserId: string) {
  const [currentUser, chamberConfig, users] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: currentUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarPath: true,
      },
    }),
    getChamberConfig(),
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        modulePermissions: true,
      },
    }),
  ]);

  return {
    currentUser,
    chamberConfig,
    users,
  };
}

