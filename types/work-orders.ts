export type WorkOrderTypeValue = "CORRECTIVE" | "PREVENTIVE" | "PREDICTIVE";
export type WorkOrderPriorityValue = "P1" | "P2" | "P3" | "P4";
export type WorkOrderStatusValue = "OPEN" | "IN_PROGRESS" | "ON_HOLD" | "CLOSED";

export type WorkOrderListItem = {
  id: string;
  number: string;
  assetId: string;
  technicianId: string | null;
  assetTag: string;
  assetName: string;
  type: WorkOrderTypeValue;
  priority: WorkOrderPriorityValue;
  status: WorkOrderStatusValue;
  description: string;
  actionTaken: string | null;
  technicianName: string;
  qrCode: string | null;
  createdAt: string;
  dueDate: string;
  startedAt: string | null;
  closedAt: string | null;
  completedAt: string | null;
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
  technicianId?: string | null;
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
  technicianId: string | null;
  startedAt: string | null;
  workPerformed: string;
  actionTaken: string;
  rootCause: string;
  repairTimeMinutes: number;
  closedAt: string | null;
}>;

export type WorkOrderApiError = {
  error: string;
};
