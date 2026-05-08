"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type AdminMobileShellProps = {
  children: ReactNode;
  header: ReactNode;
  sidebar: ReactNode;
};

export function AdminMobileShell({ children, header, sidebar }: AdminMobileShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("mobile-sidebar-open", isSidebarOpen);

    return () => {
      document.body.classList.remove("mobile-sidebar-open");
    };
  }, [isSidebarOpen]);

  return (
    <div className="flex min-h-screen max-w-full bg-background">
      <button
        type="button"
        aria-label={isSidebarOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isSidebarOpen}
        aria-controls="admin-mobile-sidebar"
        onClick={() => setIsSidebarOpen((current) => !current)}
        className="fixed left-3 top-3 z-[70] inline-flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-foreground shadow-sm transition duration-200 hover:bg-surface-muted lg:hidden"
      >
        <span className="sr-only">{isSidebarOpen ? "Fechar menu" : "Abrir menu"}</span>
        <span className="flex flex-col gap-1.5" aria-hidden="true">
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>

      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <div
        id="admin-mobile-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-[min(280px,86vw)] transform transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-[280px] lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(event) => {
          const target = event.target as HTMLElement;

          if (target.closest("a,button")) {
            setIsSidebarOpen(false);
          }
        }}
      >
        {sidebar}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 pl-16 shadow-sm backdrop-blur lg:px-10 lg:py-4">
          {header}
        </header>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-5 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
