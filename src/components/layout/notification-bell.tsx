import { NotificationType } from "@prisma/client";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notifications/actions";

type NotificationBellProps = {
  notifications: Array<{
    createdAt: Date;
    href: string;
    id: string;
    isRead: boolean;
    message: string;
    title: string;
    type: NotificationType;
  }>;
  unreadCount: number;
};

const typeClassNames: Record<NotificationType, string> = {
  [NotificationType.URGENT]: "border-danger bg-[#fff3f3] text-danger",
  [NotificationType.WARNING]: "border-[#e8b450] bg-[#fff8e8] text-[#8a5a00]",
  [NotificationType.INFO]: "border-primary/25 bg-[#eef5ff] text-primary",
};

function formatNotificationDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function NotificationBell({ notifications, unreadCount }: NotificationBellProps) {
  return (
    <details className="group relative">
      <summary
        aria-label="Notificações"
        className="relative flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm transition duration-200 hover:scale-[1.04] hover:border-primary/40 hover:bg-surface-muted [&::-webkit-details-marker]:hidden"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </summary>

      <div className="absolute right-0 top-12 z-30 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            <p className="text-xs text-foreground/65">
              {unreadCount === 0 ? "Nenhuma não lida" : `${unreadCount} não lida(s)`}
            </p>
          </div>
          {unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <Button variant="secondary" className="px-3 py-1.5 text-xs">
                Marcar todas
              </Button>
            </form>
          ) : null}
        </div>

        {notifications.length > 0 ? (
          <div className="max-h-[28rem] overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-b border-border px-4 py-3 last:border-b-0 ${
                  notification.isRead ? "bg-surface" : "bg-surface-muted/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 size-2.5 shrink-0 rounded-full border ${typeClassNames[notification.type]}`} />
                  <div className="min-w-0 flex-1">
                    <Link href={notification.href} className="block hover:text-primary">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground/70">{notification.message}</p>
                    </Link>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-foreground/55">
                        {formatNotificationDate(notification.createdAt)}
                      </p>
                      {!notification.isRead ? (
                        <form action={markNotificationReadAction}>
                          <input type="hidden" name="id" value={notification.id} />
                          <button
                            type="submit"
                            className="text-xs font-semibold text-primary transition hover:text-foreground"
                          >
                            Marcar lida
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-foreground/70">Nenhuma notificação acionável no momento.</div>
        )}
      </div>
    </details>
  );
}

