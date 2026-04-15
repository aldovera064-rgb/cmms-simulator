import { NextResponse } from "next/server";

import { createWorkOrder, getWorkOrders } from "@/features/work-orders/server";
import {
  WorkOrderCreateInput,
  WorkOrderFilters,
  WorkOrderPriorityValue,
  WorkOrderStatusValue,
  WorkOrderTypeValue
} from "@/types/work-orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters: WorkOrderFilters = {
    status: (searchParams.get("status") as WorkOrderStatusValue | "ALL" | null) ?? undefined,
    priority: (searchParams.get("priority") as WorkOrderPriorityValue | "ALL" | null) ?? undefined,
    type: (searchParams.get("type") as WorkOrderTypeValue | "ALL" | null) ?? undefined,
    assetId: searchParams.get("assetId") ?? undefined
  };

  const workOrders = await getWorkOrders(filters);
  return NextResponse.json(workOrders);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<WorkOrderCreateInput>;

  if (!payload.assetId || !payload.type || !payload.priority || !payload.description) {
    return NextResponse.json({ error: "Faltan campos obligatorios para crear la OT." }, { status: 400 });
  }

  const result = await createWorkOrder({
    assetId: payload.assetId,
    type: payload.type,
    priority: payload.priority,
    description: payload.description,
    technicianName: payload.technicianName ?? ""
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data, { status: 201 });
}
