import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm",
        "focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

