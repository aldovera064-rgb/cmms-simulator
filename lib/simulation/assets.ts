import { AssetCriticality } from "@prisma/client";

export function getCriticalityMeta(criticality: AssetCriticality) {
  switch (criticality) {
    case "A":
      return { label: "Alta", color: "bg-danger/15 text-danger border-danger/30" };
    case "B":
      return { label: "Media", color: "bg-warning/15 text-warning border-warning/30" };
    case "C":
      return { label: "Baja", color: "bg-success/15 text-success border-success/30" };
    default:
      return { label: criticality, color: "bg-panelAlt text-foreground border-border" };
  }
}
