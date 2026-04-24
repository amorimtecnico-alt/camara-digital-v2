import Link from "next/link";
import { UserRole, type UserModulePermission } from "@prisma/client";

import { AppBrand } from "@/components/branding/app-brand";
import { AdminNav } from "@/components/layout/admin-nav";
import { canAccessRoute } from "@/lib/permissions";
import { logoutAction } from "@/modules/auth/actions";

const navigation = [
  { href: "/dashboard", label: "Início" },
  { href: "/agenda", label: "Agenda" },
  { href: "/setores", label: "Setores" },
  { href: "/usuarios", label: "Usuários" },
  { href: "/protocolos", label: "Protocolos" },
  { href: "/contratos", label: "Contratos" },
  { href: "/licitacoes", label: "Licitações" },
  { href: "/fornecedores", label: "Fornecedores" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/configuracoes", label: "Configurações" },
];

type AdminSidebarProps = {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  modulePermissions: UserModulePermission[];
};

export function AdminSidebar({ modulePermissions, userRole }: AdminSidebarProps) {
  const visibleNavigation = navigation.filter((item) => canAccessRoute({ role: userRole, modulePermissions }, item.href));

  return (
    <aside className="flex min-h-screen w-full max-w-[280px] flex-col bg-sidebar px-6 py-8 text-sidebar-foreground">
      <Link href="/dashboard" className="group mb-8 block px-4 py-3 transition duration-200 hover:opacity-95">
        <div className="flex justify-center">
          <AppBrand align="center" />
        </div>
        <div className="mt-4 h-px w-full bg-white/10 transition group-hover:bg-white/16" />
      </Link>

      <AdminNav items={visibleNavigation} />

      <form action={logoutAction}>
        <button
          type="submit"
          className="mt-8 w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-medium text-white/80 transition duration-200 hover:scale-[1.02] hover:bg-white/10 hover:text-white"
        >
          Sair
        </button>
      </form>
    </aside>
  );
}
