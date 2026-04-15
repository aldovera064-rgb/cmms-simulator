"use client";

import { useEffect, useState } from "react";
import { WorkOrdersPageClient } from "@/components/work-orders/work-orders-page-client";
import { demoWorkOrders } from "@/lib/demo/data";

export default function OrdenesPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>(demoWorkOrders);

  useEffect(() => {
    const stored = localStorage.getItem("demo-assets");
    if (stored) {
      setAssets(JSON.parse(stored));
    }
  }, []);

  return (
    <WorkOrdersPageClient
      assets={assets}
      initialWorkOrders={workOrders}
    />
  );
}