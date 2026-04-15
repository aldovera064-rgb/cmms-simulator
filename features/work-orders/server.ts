import {
  Prisma,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderType
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateWorkOrderNumber, getPriorityDueDate } from "@/lib/simulation/work-orders";
import {
  WorkOrderCreateInput,
  WorkOrderFilters,
  WorkOrderListItem,
  WorkOrderUpdateInput
} from "@/types/work-orders";

const validTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["ON_HOLD", "CLOSED"],
  ON_HOLD: ["IN_PROGRESS", "CLOSED"],
  CLOSED: []
};

function normalizeWorkOrder(workOrder: {
  id: string;
  number: string;
  assetId: string;
  asset: { tag: string; name: string };
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  description: string;
  technicianName: string;
  createdAt: Date;
  dueDate: Date | null;
  startedAt: Date | null;
  closedAt: Date | null;
  rootCause: string | null;
  workPerformed: string | null;
  repairTimeMinutes: number | null;
}): WorkOrderListItem {
  return {
    id: workOrder.id,
    number: workOrder.number,
    assetId: workOrder.assetId,
    assetTag: workOrder.asset.tag,
    assetName: workOrder.asset.name,
    type: workOrder.type,
    priority: workOrder.priority,
    status: workOrder.status,
    description: workOrder.description,
    technicianName: workOrder.technicianName,
    createdAt: workOrder.createdAt.toISOString(),
    dueDate: (workOrder.dueDate ?? getPriorityDueDate(workOrder.priority, workOrder.createdAt)).toISOString(),
    startedAt: workOrder.startedAt?.toISOString() ?? null,
    closedAt: workOrder.closedAt?.toISOString() ?? null,
    rootCause: workOrder.rootCause,
    workPerformed: workOrder.workPerformed,
    repairTimeMinutes: workOrder.repairTimeMinutes
  };
}

function getWorkOrderSelect() {
  return {
    id: true,
    number: true,
    assetId: true,
    asset: {
      select: {
        tag: true,
        name: true
      }
    },
    type: true,
    priority: true,
    status: true,
    description: true,
    technicianName: true,
    createdAt: true,
    dueDate: true,
    startedAt: true,
    closedAt: true,
    rootCause: true,
    workPerformed: true,
    repairTimeMinutes: true
  } satisfies Prisma.WorkOrderSelect;
}

export async function getWorkOrders(filters: WorkOrderFilters = {}) {
   if (process.env.VERCEL_ENV === "production") {
    return [];
  }
  const where: Prisma.WorkOrderWhereInput = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.priority && filters.priority !== "ALL") {
    where.priority = filters.priority;
  }

  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type;
  }

  if (filters.assetId && filters.assetId !== "ALL") {
    where.assetId = filters.assetId;
  }

  const workOrders = await prisma.workOrder.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    select: getWorkOrderSelect()
  });

  return workOrders.map(normalizeWorkOrder);
}

export async function getWorkOrderById(id: string) {
   if (process.env.VERCEL_ENV === "production") {
    return null;
  }
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    select: getWorkOrderSelect()
  });

  return workOrder ? normalizeWorkOrder(workOrder) : null;
}

async function getNextWorkOrderNumber() {
  const year = new Date().getFullYear();
  const prefix = `OT-${year}-`;
  const latest = await prisma.workOrder.findFirst({
    where: {
      number: {
        startsWith: prefix
      }
    },
    orderBy: {
      number: "desc"
    },
    select: {
      number: true
    }
  });

  const currentSequence = latest ? Number.parseInt(latest.number.slice(-4), 10) : 0;
  return generateWorkOrderNumber(currentSequence + 1, year);
}

export async function createWorkOrder(input: WorkOrderCreateInput) {
   if (process.env.VERCEL_ENV === "production") {
    return { error: "Simulador en produccion" as const };
  }

  const asset = await prisma.asset.findUnique({
    where: { id: input.assetId },
    select: { id: true }
  });

  if (!asset) {
    return { error: "Activo no encontrado." as const };
  }

  const number = await getNextWorkOrderNumber();
  const createdAt = new Date();

  const workOrder = await prisma.workOrder.create({
    data: {
      number,
      assetId: input.assetId,
      type: input.type,
      priority: input.priority,
      status: "OPEN",
      description: input.description.trim(),
      technicianName: input.technicianName.trim(),
      dueDate: getPriorityDueDate(input.priority, createdAt),
      createdAt
    },
    select: getWorkOrderSelect()
  });

  return { data: normalizeWorkOrder(workOrder) };
}

export async function updateWorkOrder(id: string, input: WorkOrderUpdateInput) {
   if (process.env.VERCEL_ENV === "production") {
    return { error: "Simulador en produccion" as const };
  }
  const current = await prisma.workOrder.findUnique({
    where: { id },
    select: {
      id: true,
      assetId: true,
      type: true,
      priority: true,
      status: true,
      createdAt: true
    }
  });

  if (!current) {
    return { error: "OT no encontrada." as const, status: 404 };
  }

  const data: Prisma.WorkOrderUpdateInput = {};

  if (input.description !== undefined) {
    data.description = input.description.trim();
  }

  if (input.technicianName !== undefined) {
    data.technicianName = input.technicianName.trim();
  }

  if (input.type !== undefined) {
    data.type = input.type;
  }

  if (input.priority !== undefined) {
    data.priority = input.priority;
    data.dueDate = getPriorityDueDate(input.priority, current.createdAt);
  }

  if (input.startedAt !== undefined) {
    data.startedAt = input.startedAt ? new Date(input.startedAt) : null;
  }

  if (input.status !== undefined) {
    const allowedNext = validTransitions[current.status];
    if (!allowedNext.includes(input.status)) {
      return { error: "Transicion de estado invalida." as const, status: 400 };
    }

    data.status = input.status;

    if (input.status === "IN_PROGRESS" && !input.startedAt) {
      data.startedAt = new Date();
    }

    if (input.status === "CLOSED") {
      if (!input.rootCause?.trim() || input.repairTimeMinutes === undefined || input.repairTimeMinutes <= 0) {
        return {
          error: "Para cerrar la OT debes capturar causa raiz y tiempo de reparacion." as const,
          status: 400
        };
      }

      if (!input.workPerformed?.trim()) {
        return {
          error: "Para cerrar la OT debes capturar el trabajo realizado." as const,
          status: 400
        };
      }

      const closedAt = input.closedAt ? new Date(input.closedAt) : new Date();
      data.closedAt = closedAt;
      data.rootCause = input.rootCause.trim();
      data.workPerformed = input.workPerformed.trim();
      data.repairTimeMinutes = input.repairTimeMinutes;
    }
  }

  if (input.rootCause !== undefined && input.status !== "CLOSED") {
    data.rootCause = input.rootCause.trim();
  }

  if (input.workPerformed !== undefined && input.status !== "CLOSED") {
    data.workPerformed = input.workPerformed.trim();
  }

  if (input.repairTimeMinutes !== undefined && input.status !== "CLOSED") {
    data.repairTimeMinutes = input.repairTimeMinutes;
  }

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data,
    select: getWorkOrderSelect()
  });

  if (workOrder.status === "CLOSED" && workOrder.type === "CORRECTIVE" && workOrder.closedAt) {
    await prisma.asset.update({
      where: { id: workOrder.assetId },
      data: {
        lastFailureAt: workOrder.closedAt
      }
    });
  }

  return { data: normalizeWorkOrder(workOrder) };
}
