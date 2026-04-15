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
      const parsed = JSON.parse(stored);

      // 🔥 SOLO LOS CAMPOS QUE NECESITA OT
      const formatted = parsed.map((a: any) => ({
        id: a.id,
        tag: a.tag,
        name: a.name
      }));

      setAssets(formatted);
    }
  }, []);

  return (
    <WorkOrdersPageClient
      assets={assets}
      initialWorkOrders={workOrders}
    />
  );
}