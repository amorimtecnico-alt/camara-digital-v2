import type { ReactNode } from "react";

import Link from "next/link";

import { AdminMobileShell } from "@/components/layout/admin-mobile-shell";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { requireUser } from "@/lib/auth";
import { getTopbarNotifications } from "@/modules/notifications/queries";
import { getChamberConfig } from "@/modules/settings/queries";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [chamberConfig, notificationData] = await Promise.all([
    getChamberConfig(),
    getTopbarNotifications(user),
  ]);
  const userInitials =
    user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  const sidebar = (
    <AdminSidebar
      modulePermissions={user.modulePermissions}
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
    />
  );

  const header = (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {chamberConfig.logoPath ? (
          <img
            src={chamberConfig.logoPath}
            alt={chamberConfig.name}
            className="max-h-10 max-w-24 shrink-0 object-contain sm:max-h-12 sm:max-w-32"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-sm sm:size-11">
            CM
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{chamberConfig.name}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.14em] text-foreground/65 sm:text-xs sm:tracking-[0.18em]">
            Sistema Administrativo
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationBell
          notifications={notificationData.notifications}
          unreadCount={notificationData.unreadCount}
        />
        <Link
          href="/meu-perfil"
          className="flex items-center gap-2 rounded-full border border-border bg-surface p-1 text-sm font-semibold text-foreground shadow-sm transition duration-200 hover:scale-[1.02] hover:border-primary/40 hover:bg-surface-muted sm:py-1 sm:pl-1 sm:pr-3"
          title="Meu perfil"
        >
          {user.avatarPath ? (
            <img src={user.avatarPath} alt={user.name} className="size-9 rounded-full object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-sidebar text-sm font-semibold text-sidebar-foreground">
              {userInitials}
            </span>
          )}
          <span className="hidden sm:inline">Meu perfil</span>
        </Link>
      </div>
    </div>
  );

  return (
    <AdminMobileShell sidebar={sidebar} header={header}>
      {children}
    </AdminMobileShell>
  );
}
