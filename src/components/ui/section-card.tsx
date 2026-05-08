import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="max-w-full overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm sm:rounded-[28px] sm:p-6">
      <header className="mb-4 sm:mb-5">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
        {description ? <p className="mt-1 text-sm text-foreground/70">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
