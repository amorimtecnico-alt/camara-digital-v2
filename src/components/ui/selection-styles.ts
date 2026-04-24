import { cn } from "@/lib/utils";

const selectedDarkClassName =
  "border-primary bg-primary !text-white hover:bg-primary/90 hover:!text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const unselectedLightClassName =
  "border-border bg-surface text-foreground hover:border-primary/40 hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function getSegmentedTabClassName(isSelected: boolean, className?: string) {
  return cn(
    "rounded-2xl border px-4 py-2 text-sm font-semibold transition duration-200 hover:scale-[1.02]",
    isSelected ? selectedDarkClassName : unselectedLightClassName,
    className,
  );
}

export function getActivePillClassName(className?: string) {
  return cn(
    "rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] !text-white",
    className,
  );
}
