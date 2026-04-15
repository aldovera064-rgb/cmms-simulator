import { WorkOrdersPageClient } from "@/components/work-orders/work-orders-page-client";

export const dynamic = "force-dynamic";

export default function OrdenesPage() {
  return (
    <WorkOrdersPageClient
      assets={[]}
      initialWorkOrders={[]}
    />
  );
}