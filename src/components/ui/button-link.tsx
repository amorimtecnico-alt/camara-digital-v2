import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { getButtonClassName, type ButtonVariant } from "@/components/ui/button";

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

export function ButtonLink({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={getButtonClassName(variant, className)}>
      {children}
    </Link>
  );
}
