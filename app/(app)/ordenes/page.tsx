import { WorkOrdersPageClient } from "@/components/work-orders/work-orders-page-client";
import { getWorkOrders } from "@/features/work-orders/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrdenesPage() {
  const [workOrders, assets] = await Promise.all([
    getWorkOrders(),
    prisma.asset.findMany({
      orderBy: { tag: "asc" },
      select: {
        id: true,
        tag: true,
        name: true
      }
    })
  ]);

  return <WorkOrdersPageClient assets={assets} initialWorkOrders={workOrders} />;
}
