import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type PanelProps = HTMLAttributes<HTMLDivElement>;

export function Panel({ className, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-panel border border-border bg-panel/90 shadow-panel backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}
