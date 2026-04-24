import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

type ListFiltersProps = {
  children: ReactNode;
  clearHref: string;
  hiddenValues?: Record<string, string | undefined>;
  fieldsClassName?: string;
};

type FilterFieldProps = {
  children: ReactNode;
  className?: string;
  htmlFor: string;
  label: string;
};

export function ListFilters({
  children,
  clearHref,
  fieldsClassName,
  hiddenValues,
}: ListFiltersProps) {
  return (
    <SectionCard
      title="Filtros"
      description="Busque registros, refine a listagem e mantenha os parametros na URL."
    >
      <form className="space-y-4">
        {hiddenValues
          ? Object.entries(hiddenValues).map(([key, value]) =>
              value ? <input key={key} type="hidden" name={key} value={value} /> : null,
            )
          : null}

        <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", fieldsClassName)}>{children}</div>

        <div className="flex flex-wrap justify-end gap-2">
          <ButtonLink href={clearHref} variant="secondary">
            Limpar filtros
          </ButtonLink>
          <Button type="submit">Aplicar filtros</Button>
        </div>
      </form>
    </SectionCard>
  );
}

export function FilterField({ children, className, htmlFor, label }: FilterFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
