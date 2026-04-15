import { WorkOrderPriority } from "@prisma/client";

import { PRIORITY_LIMITS_HOURS } from "@/lib/simulation/constants";

export function generateWorkOrderNumber(sequence: number, year = new Date().getFullYear()) {
  return `OT-${year}-${String(sequence).padStart(4, "0")}`;
}

export function getPriorityLimitHours(priority: WorkOrderPriority) {
  return PRIORITY_LIMITS_HOURS[priority];
}

export function getPriorityDueDate(priority: WorkOrderPriority, from = new Date()) {
  const limitHours = getPriorityLimitHours(priority);
  return new Date(from.getTime() + limitHours * 60 * 60 * 1000);
}
