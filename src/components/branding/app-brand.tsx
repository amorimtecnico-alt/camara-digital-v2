import { cn } from "@/lib/utils";

type AppBrandProps = {
  align?: "center" | "left";
  showIcon?: boolean;
  theme?: "dark" | "light";
  titleClassName?: string;
  subtitleClassName?: string;
  iconClassName?: string;
  className?: string;
};

function InstitutionalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32 10L10 20V24H54V20L32 10Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 24V46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 24V46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 24V46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 24V46" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 46H52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 52H56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function AppBrand({
  align = "left",
  showIcon = false,
  theme = "dark",
  titleClassName,
  subtitleClassName,
  iconClassName,
  className,
}: AppBrandProps) {
  const alignmentClassName = align === "center" ? "justify-center text-center" : "justify-start text-left";
  const iconSurfaceClassName =
    theme === "dark"
      ? "border-white/10 bg-white/6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
      : "border-primary/10 bg-primary/5 text-primary shadow-[0_10px_30px_rgba(15,42,68,0.08)]";
  const primaryWordClassName = theme === "dark" ? "text-white" : "text-foreground";
  const subtitleDefaultClassName = theme === "dark" ? "text-white/62" : "text-foreground/62";

  return (
    <div className={cn("flex items-center gap-4", alignmentClassName, className)}>
      {showIcon ? (
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl border", iconSurfaceClassName)}>
          <InstitutionalIcon className={iconClassName ?? ""} />
        </div>
      ) : null}

      <div className="min-w-0">
        <p className={cn("text-lg font-semibold uppercase tracking-[0.28em]", titleClassName)}>
          <span className={primaryWordClassName}>CÂMARA</span>
          <span className="text-[#47C57A]"> DIGITAL</span>
        </p>
        <p className={cn("mt-1 text-xs uppercase tracking-[0.34em]", subtitleDefaultClassName, subtitleClassName)}>
          GESTÃO PÚBLICA
        </p>
      </div>
    </div>
  );
}
