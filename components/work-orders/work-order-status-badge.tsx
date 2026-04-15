import { cn } from "@/lib/utils";
import { WorkOrderStatusValue } from "@/types/work-orders";

const labels: Record<WorkOrderStatusValue, string> = {
  OPEN: "Abierta",
  IN_PROGRESS: "En proceso",
  ON_HOLD: "En espera",
  CLOSED: "Cerrada"
};

const styles: Record<WorkOrderStatusValue, string> = {
  OPEN: "border-sky-400/30 bg-sky-400/15 text-sky-300",
  IN_PROGRESS: "border-accent/30 bg-accent/15 text-accent",
  ON_HOLD: "border-warning/30 bg-warning/15 text-warning",
  CLOSED: "border-success/30 bg-success/15 text-success"
};

export function WorkOrderStatusBadge({ value }: { value: WorkOrderStatusValue }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        styles[value]
      )}
    >
      {labels[value]}
    </span>
  );
}
