import { cn } from "@/lib/utils";

export function CriticalityBadge({ value }: { value: "A" | "B" | "C" }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        value === "A" && "border-danger/30 bg-danger/15 text-danger",
        value === "B" && "border-warning/30 bg-warning/15 text-warning",
        value === "C" && "border-success/30 bg-success/15 text-success"
      )}
    >
      {value}
    </span>
  );
}
