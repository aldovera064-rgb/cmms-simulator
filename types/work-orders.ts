export type WorkOrderTypeValue = "CORRECTIVE" | "PREVENTIVE" | "PREDICTIVE";
export type WorkOrderPriorityValue = "P1" | "P2" | "P3" | "P4";
export type WorkOrderStatusValue = "OPEN" | "IN_PROGRESS" | "ON_HOLD" | "CLOSED";

export type WorkOrderListItem = {
  id: string;
  number: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  type: WorkOrderTypeValue;
  priority: WorkOrderPriorityValue;
  status: WorkOrderStatusValue;
  description: string;
  technicianName: string;
  createdAt: string;
  dueDate: string;
  startedAt: string | null;
  closedAt: string | null;
  rootCause: string | null;
  workPerformed: string | null;
  repairTimeMinutes: number | null;
};

export type WorkOrderFilters = {
  status?: WorkOrderStatusValue | "ALL";
  priority?: WorkOrderPriorityValue | "ALL";
  type?: WorkOrderTypeValue | "ALL";
  assetId?: string | "ALL";
};

export type WorkOrderCreateInput = {
  assetId: string;
  type: WorkOrderTypeValue;
  priority: WorkOrderPriorityValue;
  description: string;
  technicianName: string;
};

export type WorkOrderUpdateInput = Partial<{
  type: WorkOrderTypeValue;
  priority: WorkOrderPriorityValue;
  status: WorkOrderStatusValue;
  description: string;
  technicianName: string;
  startedAt: string | null;
  workPerformed: string;
  rootCause: string;
  repairTimeMinutes: number;
  closedAt: string | null;
}>;

export type WorkOrderApiError = {
  error: string;
};
