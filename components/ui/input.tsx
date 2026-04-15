import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-border bg-panelAlt px-4 py-3 text-sm text-foreground placeholder:text-muted",
        className
      )}
      {...props}
    />
  );
}
