import { cn } from "@/lib/utils";
import { WorkOrderPriorityValue } from "@/types/work-orders";

const styles: Record<WorkOrderPriorityValue, string> = {
  P1: "border-danger/30 bg-danger/15 text-danger animate-pulse-danger",
  P2: "border-orange-400/30 bg-orange-400/15 text-orange-300",
  P3: "border-warning/30 bg-warning/15 text-warning",
  P4: "border-success/30 bg-success/15 text-success"
};

export function WorkOrderPriorityBadge({ value }: { value: WorkOrderPriorityValue }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        styles[value]
      )}
    >
      {value}
    </span>
  );
}
