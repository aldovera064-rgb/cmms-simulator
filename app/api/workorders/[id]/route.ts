import { NextResponse } from "next/server";

import { getWorkOrderById, updateWorkOrder } from "@/features/work-orders/server";
import { prisma } from "@/lib/prisma";
import { WorkOrderUpdateInput } from "@/types/work-orders";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const workOrder = await getWorkOrderById(id);

  if (!workOrder) {
    return NextResponse.json({ error: "OT no encontrada." }, { status: 404 });
  }

  return NextResponse.json(workOrder);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = (await request.json()) as WorkOrderUpdateInput;
  const result = await updateWorkOrder(id, payload);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!workOrder) {
    return NextResponse.json({ error: "OT no encontrada." }, { status: 404 });
  }

  await prisma.scheduleAssignment.deleteMany({
    where: { workOrderId: id }
  });

  await prisma.note.deleteMany({
    where: { workOrderId: id }
  });

  await prisma.workOrderMaterial.deleteMany({
    where: { workOrderId: id }
  });

  await prisma.workOrder.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true });
}
