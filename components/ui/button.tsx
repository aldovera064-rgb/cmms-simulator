import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-accent text-slate-950 hover:brightness-110",
        variant === "secondary" &&
          "border border-border bg-panelAlt text-foreground hover:bg-panelAlt/80",
        variant === "danger" && "bg-danger text-white hover:brightness-110",
        className
      )}
      type={type}
      {...props}
    />
  );
}
