import { WorkOrdersPageClient } from "@/components/work-orders/work-orders-page-client";
import { getWorkOrders } from "@/features/work-orders/server";

export const dynamic = "force-dynamic";

export default async function OrdenesPage() {
  const workOrders = await getWorkOrders();
  const assets: any[] = [];

  return (
    <WorkOrdersPageClient
      assets={assets}
      initialWorkOrders={workOrders}
    />
  );
}