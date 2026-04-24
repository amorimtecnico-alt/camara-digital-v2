import type { ReactNode } from "react";

import Link from "next/link";

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

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        modulePermissions={user.modulePermissions}
        userName={user.name}
        userEmail={user.email}
        userRole={user.role}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-6 py-4 backdrop-blur lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {chamberConfig.logoPath ? (
                <img
                  src={chamberConfig.logoPath}
                  alt={chamberConfig.name}
                  className="max-h-12 max-w-32 shrink-0 object-contain"
                />
              ) : (
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-sm">
                  CM
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{chamberConfig.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/65">Sistema Administrativo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell
                notifications={notificationData.notifications}
                unreadCount={notificationData.unreadCount}
              />
              <Link
                href="/meu-perfil"
                className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm font-semibold text-foreground shadow-sm transition duration-200 hover:scale-[1.02] hover:border-primary/40 hover:bg-surface-muted"
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
        </header>
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
