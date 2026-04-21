"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { Panel } from "@/components/ui/panel";
import { ensureSeedData, fetchAssets, fetchTechnicians, fetchWorkOrders } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";

type DashboardPageContentProps = {
  metrics?: {
    assets: number;
    workOrders: number;
    pmPlans: number;
    technicians: number;
  };
};

type AssetLike = {
  area: string | null;
  status: string | null;
  start_time: number | null;
};

type WorkOrderLike = {
  status: string | null;
  type: string | null;
  priority: string | null;
  created_at: string | null;
};

const defaultMetrics = {
  assets: 0,
  workOrders: 0,
  pmPlans: 0,
  technicians: 0
};

export function DashboardPageContent({ metrics }: DashboardPageContentProps) {
  const { dictionary } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState(metrics ?? defaultMetrics);
  const [assets, setAssets] = useState<AssetLike[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderLike[]>([]);
  const [techniciansCount, setTechniciansCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setMounted(true);
      await ensureSeedData();

      const [assetRows, workOrderRows, technicianRows] = await Promise.all([
        fetchAssets(),
        fetchWorkOrders(),
        fetchTechnicians()
      ]);

      setAssets(assetRows);
      setWorkOrders(workOrderRows);
      setTechniciansCount(technicianRows.length);
      setLiveMetrics({
        assets: assetRows.length,
        workOrders: workOrderRows.length,
        pmPlans: workOrderRows.filter((item) => item.type === "PREVENTIVE").length,
        technicians: technicianRows.length
      });
    };

    void load();
  }, []);

  const assetsChartData = useMemo(() => {
    const knownAreas = ["Producción", "Maquinado", "Servicios", "Formado"];
    const byArea = knownAreas.reduce<Record<string, number>>((acc, area) => {
      acc[area] = 0;
      return acc;
    }, {});

    assets.forEach((asset) => {
      const area = asset.area && byArea[asset.area] !== undefined ? asset.area : "Producción";
      byArea[area] += 1;
    });

    return Object.entries(byArea).map(([area, count]) => ({ name: area, value: count }));
  }, [assets]);

  const workOrdersStatusData = useMemo(() => {
    const open = workOrders.filter((item) => item.status === "OPEN").length;
    const inProgress = workOrders.filter((item) => item.status === "IN_PROGRESS").length;
    const onHold = workOrders.filter((item) => item.status === "ON_HOLD").length;
    const closed = workOrders.filter((item) => item.status === "CLOSED").length;

    return [
      { name: dictionary.dashboard.open, value: open },
      { name: dictionary.dashboard.inProgress, value: inProgress },
      { name: dictionary.dashboard.overdue, value: onHold },
      { name: dictionary.dashboard.closed, value: closed }
    ];
  }, [dictionary.dashboard, workOrders]);

  const pmDistributionData = useMemo(() => {
    const pm = workOrders.filter((item) => item.type === "PREVENTIVE").length;
    const corrective = workOrders.filter((item) => item.type === "CORRECTIVE").length;

    return [
      { name: dictionary.dashboard.pmLabel, value: pm },
      { name: dictionary.dashboard.correctiveLabel, value: corrective }
    ];
  }, [dictionary.dashboard, workOrders]);

  const kpis = useMemo(() => {
    const totalAssets = assets.length;
    const operativeAssets = assets.filter((asset) => asset.status !== "OUT_OF_SERVICE").length;
    const availability = totalAssets > 0 ? (operativeAssets / totalAssets) * 100 : 0;

    const closedOrders = workOrders.filter((order) => order.status === "CLOSED");
    const mttrHours =
      closedOrders.length > 0
        ? closedOrders.reduce((acc, order) => {
            const base = order.priority === "P1" ? 6 : order.priority === "P2" ? 4 : order.priority === "P3" ? 2 : 1;
            return acc + base;
          }, 0) / closedOrders.length
        : 0;

    const failures = workOrders.filter((order) => order.type === "CORRECTIVE").length;
    const totalRuntimeHours = assets.reduce((acc, asset) => {
      const start = asset.start_time ?? Date.now();
      return acc + Math.max((Date.now() - start) / 3600000, 0);
    }, 0);
    const mtbf = failures > 0 ? totalRuntimeHours / failures : totalRuntimeHours;

    const overdue = workOrders.filter((order) => {
      if (order.status === "CLOSED") return false;
      if (!order.created_at) return false;
      const age = Date.now() - new Date(order.created_at).getTime();
      return age > 7 * 24 * 3600000;
    }).length;

    return {
      availability,
      mttrHours,
      mtbf,
      overdue,
      technicians: techniciansCount
    };
  }, [assets, techniciansCount, workOrders]);

  return (
    <div className="space-y-6">
      <DashboardHero description={dictionary.dashboard.description} title={dictionary.dashboard.title} />

      <DashboardSummary labels={dictionary.dashboard} metrics={liveMetrics} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="text-sm text-muted">{dictionary.dashboard.availability}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{kpis.availability.toFixed(1)}%</p>
        </Panel>
        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="text-sm text-muted">{dictionary.dashboard.mttr}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{kpis.mttrHours.toFixed(1)} h</p>
        </Panel>
        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="text-sm text-muted">{dictionary.dashboard.mtbf}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{kpis.mtbf.toFixed(1)} h</p>
        </Panel>
        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="text-sm text-muted">{dictionary.dashboard.overdueWorkOrders}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{kpis.overdue}</p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="mb-4 text-sm font-medium text-muted">{dictionary.dashboard.assetsChart}</p>
          <div className="h-56 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6d0b8" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#556B2F" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="mb-4 text-sm font-medium text-muted">{dictionary.dashboard.workOrdersChart}</p>
          <div className="h-56 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={workOrdersStatusData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45}>
                    {workOrdersStatusData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={["#C2A14D", "#6B8E23", "#9f3a2f", "#556B2F"][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="mb-4 text-sm font-medium text-muted">{dictionary.dashboard.pmChart}</p>
          <div className="h-56 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pmDistributionData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45}>
                    {pmDistributionData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={["#6B8E23", "#556B2F"][index % 2]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Panel>
      </div>

    </div>
  );
}
