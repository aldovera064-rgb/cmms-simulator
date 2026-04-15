import { TrafficLightStatus } from "@prisma/client";

export function getPmTrafficLightMeta(status: TrafficLightStatus) {
  switch (status) {
    case "GREEN":
      return { label: "En tiempo", color: "bg-success/15 text-success border-success/30" };
    case "YELLOW":
      return { label: "Próximo", color: "bg-warning/15 text-warning border-warning/30" };
    case "RED":
      return { label: "Vencido", color: "bg-danger/15 text-danger border-danger/30" };
    default:
      return { label: status, color: "bg-panelAlt text-foreground border-border" };
  }
}
