import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variants = {
  primary: "bg-primary !text-white hover:bg-primary/90 hover:!text-white",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-muted",
  danger: "bg-danger !text-white hover:bg-danger/90 hover:!text-white",
};

const baseClassName =
  "inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";

export function getButtonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cn(baseClassName, variants[variant], className);
}

export function Button({
  children,
  className,
  variant = "primary",
  type = "submit",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={getButtonClassName(variant, className)}
      {...props}
    >
      {children}
    </button>
  );
}
