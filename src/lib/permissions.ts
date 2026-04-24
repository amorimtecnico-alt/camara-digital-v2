import "server-only";

import { PermissionModule, UserRole, type User, type UserModulePermission } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";

type PermissionAction = "create" | "delete" | "edit" | "view";
type RoleTarget = UserRole | (Pick<User, "role"> & { modulePermissions?: UserModulePermission[] }) | null | undefined;
type UserTarget = Pick<User, "id" | "role"> & { modulePermissions?: UserModulePermission[] };

const routePermissions = {
  "/dashboard": { module: null, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER] },
  "/agenda": { module: null, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER] },
  "/meu-perfil": { module: null, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER] },
  "/usuarios": { module: PermissionModule.usuarios, roles: null },
  "/setores": { module: null, roles: [UserRole.ADMIN, UserRole.MANAGER] },
  "/fornecedores": { module: PermissionModule.fornecedores, roles: null },
  "/protocolos": { module: PermissionModule.protocolos, roles: null },
  "/contratos": { module: PermissionModule.contratos, roles: null },
  "/licitacoes": { module: PermissionModule.licitacoes, roles: null },
  "/configuracoes": { module: null, roles: [UserRole.ADMIN, UserRole.MANAGER] },
  "/relatorios": { module: null, roles: [UserRole.ADMIN, UserRole.MANAGER] },
  "/acesso-negado": { module: null, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER] },
} as const;

function resolveRole(target: RoleTarget) {
  if (!target) {
    return null;
  }

  const role = typeof target === "string" ? target : target.role;
  return Object.values(UserRole).includes(role as UserRole) ? (role as UserRole) : null;
}

function getModulePermission(target: RoleTarget, module: PermissionModule) {
  if (!target || typeof target === "string") {
    return null;
  }

  return target.modulePermissions?.find((permission) => permission.module === module) ?? null;
}

function matchesRoute(pathname: string, route: keyof typeof routePermissions) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function hasRole(target: RoleTarget, roles: UserRole[]) {
  const role = resolveRole(target);
  return role ? roles.includes(role) : false;
}

export function hasModulePermission(target: RoleTarget, module: PermissionModule, action: PermissionAction) {
  const role = resolveRole(target);

  if (!role) {
    return false;
  }

  if (role === UserRole.ADMIN) {
    return true;
  }

  const permission = getModulePermission(target, module);
  const key = action === "view" ? "canView" : action === "create" ? "canCreate" : action === "edit" ? "canEdit" : "canDelete";
  return permission?.[key] ?? false;
}

export function canAccessRoute(target: RoleTarget, pathname: string) {
  const matchedRoute = Object.keys(routePermissions).find((route) =>
    matchesRoute(pathname, route as keyof typeof routePermissions),
  ) as keyof typeof routePermissions | undefined;

  if (!matchedRoute) {
    return true;
  }

  const permission = routePermissions[matchedRoute];

  if (permission.roles && !hasRole(target, [...permission.roles])) {
    return false;
  }

  return permission.module ? hasModulePermission(target, permission.module, "view") : true;
}

export function canManageUsers(target: RoleTarget) {
  return hasModulePermission(target, PermissionModule.usuarios, "create") || hasModulePermission(target, PermissionModule.usuarios, "edit");
}

export function canManageSectors(target: RoleTarget) {
  return hasRole(target, [UserRole.ADMIN, UserRole.MANAGER]);
}

export function canManageSuppliers(target: RoleTarget) {
  return hasModulePermission(target, PermissionModule.fornecedores, "create") || hasModulePermission(target, PermissionModule.fornecedores, "edit");
}

export function canManageProtocols(target: RoleTarget) {
  return hasModulePermission(target, PermissionModule.protocolos, "create") || hasModulePermission(target, PermissionModule.protocolos, "edit");
}

export function canManageContracts(target: RoleTarget) {
  return hasModulePermission(target, PermissionModule.contratos, "create") || hasModulePermission(target, PermissionModule.contratos, "edit");
}

export function canManageLicitations(target: RoleTarget) {
  return hasModulePermission(target, PermissionModule.licitacoes, "create") || hasModulePermission(target, PermissionModule.licitacoes, "edit");
}

export function canDelete(target: RoleTarget) {
  return hasRole(target, [UserRole.ADMIN]);
}

export function canDeleteModule(target: RoleTarget, module: PermissionModule) {
  return hasModulePermission(target, module, "delete");
}

export function canCreateModule(target: RoleTarget, module: PermissionModule) {
  return hasModulePermission(target, module, "create");
}

export function canEditModule(target: RoleTarget, module: PermissionModule) {
  return hasModulePermission(target, module, "edit");
}

export function canReadAllProtocols(target: RoleTarget) {
  return hasRole(target, [UserRole.ADMIN, UserRole.MANAGER]);
}

export function canEditProtocol(target: (Pick<User, "id" | "role"> & { modulePermissions?: UserModulePermission[] }) | null | undefined, createdById: string) {
  if (!target) {
    return false;
  }

  return hasModulePermission(target, PermissionModule.protocolos, "edit") && (canReadAllProtocols(target) || target.id === createdById);
}

export function canAssignRole(target: RoleTarget, nextRole: UserRole) {
  if (hasRole(target, [UserRole.ADMIN])) {
    return true;
  }

  if (hasRole(target, [UserRole.MANAGER])) {
    return nextRole !== UserRole.ADMIN;
  }

  return false;
}

export function canManageUserTarget(actor: UserTarget, target: UserTarget) {
  if (hasRole(actor, [UserRole.ADMIN])) {
    return true;
  }

  if (hasModulePermission(actor, PermissionModule.usuarios, "edit")) {
    return target.role !== UserRole.ADMIN;
  }

  return false;
}

export function getAssignableRoles(target: RoleTarget) {
  if (hasRole(target, [UserRole.ADMIN])) {
    return [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER];
  }

  if (hasModulePermission(target, PermissionModule.usuarios, "create") || hasModulePermission(target, PermissionModule.usuarios, "edit")) {
    return [UserRole.MANAGER, UserRole.USER];
  }

  return [];
}

export function redirectToAccessDenied(): never {
  redirect("/acesso-negado");
}

export async function requireRouteAccess(pathname: string) {
  const user = await requireUser();

  if (!canAccessRoute(user, pathname)) {
    redirectToAccessDenied();
  }

  return user;
}

export async function requirePermission(permission: (user: Awaited<ReturnType<typeof requireUser>>) => boolean) {
  const user = await requireUser();

  if (!permission(user)) {
    redirectToAccessDenied();
  }

  return user;
}

export async function requireModulePermission(module: PermissionModule, action: PermissionAction) {
  const user = await requireUser();

  if (!hasModulePermission(user, module, action)) {
    redirectToAccessDenied();
  }

  return user;
}
