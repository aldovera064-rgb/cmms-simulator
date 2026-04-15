"use client";

import { useEffect, useState } from "react";
import { DashboardPageContent } from "@/components/dashboard/dashboard-page-content";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    assets: 0,
    workOrders: 0,
    pmPlans: 0,
    technicians: 0
  });

  useEffect(() => {
    const loadData = () => {
      const storedAssets = localStorage.getItem("demo-assets");
      const storedOT = localStorage.getItem("demo-workorders");

      const assets = storedAssets ? JSON.parse(storedAssets) : [];
      const workOrders = storedOT ? JSON.parse(storedOT) : [];

      setMetrics({
        assets: assets.length,
        workOrders: workOrders.length,
        pmPlans: 0,
        technicians: 0
      });
    };

    loadData();

    // 🔥 refresco automático cada 1s
    const interval = setInterval(loadData, 1000);

    return () => clearInterval(interval);
  }, []);

  return <DashboardPageContent metrics={metrics} />;
}