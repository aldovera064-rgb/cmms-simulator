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
import { ManageUsersPanel } from "@/components/dashboard/manage-users-panel";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { CompanyViewsPanel } from "@/components/dashboard/company-views-panel";
import { Panel } from "@/components/ui/panel";
import { runCbmCheck } from "@/lib/cbm-check";
import { ensureSeedData, fetchAssets, fetchTechnicians, fetchWorkOrders, cleanupOldHistory } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
import { canManageUsers, isGod } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";

type DashboardPageContentProps = {
  metrics?: {
    assets: number;
    workOrders: number;
    pmPlans: number;
    technicians: number;
  };
};

type AssetLike = {
  id: string;
  name?: string | null;
  tag?: string | null;
  area: string | null;
  status: string | null;
  start_time: number | null;
  severity?: number | null;
  occurrence?: number | null;
  detection?: number | null;
};

type WorkOrderLike = {
  id: string;
  status: string | null;
  type: string | null;
  priority: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  technician?: string | null;
};

const defaultMetrics = {
  assets: 0,
  workOrders: 0,
  pmPlans: 0,
  technicians: 0
};

export function DashboardPageContent({ metrics }: DashboardPageContentProps) {
  const { dictionary } = useI18n();
  const { user } = useSession();
  const activeCompanyId = user?.activeCompanyId ?? null;
  const [mounted, setMounted] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState(metrics ?? defaultMetrics);
  const [assets, setAssets] = useState<AssetLike[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderLike[]>([]);
  const [techniciansCount, setTechniciansCount] = useState(0);
  const showManageUsers = isGod(user?.role) || canManageUsers(user?.role);

  useEffect(() => {
    const load = async () => {
      setMounted(true);
      if (!activeCompanyId) {
        setAssets([]);
        setWorkOrders([]);
        setTechniciansCount(0);
        setLiveMetrics(defaultMetrics);
        return;
      }

      await ensureSeedData(activeCompanyId);

      const [assetRows, workOrderRows, technicianRows] = await Promise.all([
        fetchAssets(activeCompanyId),
        fetchWorkOrders(activeCompanyId),
        fetchTechnicians(activeCompanyId)
      ]);

      // Run CBM threshold checks and auto-create predictive WOs
      await runCbmCheck(activeCompanyId);

      // Cleanup history records older than 365 days (temporary client-side approach)
      // TODO: Replace with Supabase Edge Function or pg_cron for production
      await cleanupOldHistory();

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
  }, [activeCompanyId]);

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

  const workOrdersPriorityData = useMemo(() => {
    const p1 = workOrders.filter((item) => item.priority === "P1").length;
    const p2 = workOrders.filter((item) => item.priority === "P2").length;
    const p3 = workOrders.filter((item) => item.priority === "P3").length;
    return [
      { name: "P1 (Alta)", value: p1 },
      { name: "P2 (Media)", value: p2 },
      { name: "P3 (Baja)", value: p3 }
    ];
  }, [workOrders]);

  const workOrdersByTechnicianData = useMemo(() => {
    const byTech = workOrders.reduce<Record<string, number>>((acc, order) => {
      if (order.technician) {
        acc[order.technician] = (acc[order.technician] || 0) + 1;
      }
      return acc;
    }, {});
    return Object.entries(byTech).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [workOrders]);

  const criticalAssets = useMemo(() => {
    return assets.map(asset => {
      const npr = (asset.severity ?? 1) * (asset.occurrence ?? 1) * (asset.detection ?? 1);
      return { ...asset, npr };
    }).sort((a, b) => b.npr - a.npr).slice(0, 5);
  }, [assets]);

  const kpis = useMemo(() => {
    const totalAssets = assets.length;
    const operativeAssets = assets.filter((asset) => asset.status !== "OUT_OF_SERVICE").length;
    const availability = totalAssets > 0 ? (operativeAssets / totalAssets) * 100 : 0;

    const closedOrders = workOrders.filter((order) => order.status === "CLOSED");
    const timestampBasedDurations = closedOrders
      .map((order) => {
        if (!order.started_at || !order.completed_at) return null;
        const duration = new Date(order.completed_at).getTime() - new Date(order.started_at).getTime();
        return duration > 0 ? duration / 3600000 : null;
      })
      .filter((value): value is number => value !== null);
    const fallbackMttr =
      closedOrders.length > 0
        ? closedOrders.reduce((acc, order) => {
            const base = order.priority === "P1" ? 6 : order.priority === "P2" ? 4 : order.priority === "P3" ? 2 : 1;
            return acc + base;
          }, 0) / closedOrders.length
        : 0;
    const mttrHours =
      timestampBasedDurations.length > 0
        ? timestampBasedDurations.reduce((acc, value) => acc + value, 0) / timestampBasedDurations.length
        : fallbackMttr;

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

    // OEE = Availability × Performance × Quality
    const totalWos = workOrders.length;
    const closedCount = closedOrders.length;
    const correctiveCount = failures;
    const performance = totalWos > 0 ? (closedCount / totalWos) * 100 : 100;
    const quality = totalWos > 0 ? (1 - correctiveCount / totalWos) * 100 : 100;
    const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

    // Backlog = open + in_progress + on_hold
    const backlog = workOrders.filter((o) => o.status !== "CLOSED").length;

    // PM Compliance = completed PM / total PM × 100
    const pmTotal = workOrders.filter((o) => o.type === "PREVENTIVE").length;
    const pmClosed = workOrders.filter((o) => o.type === "PREVENTIVE" && o.status === "CLOSED").length;
    const pmCompliance = pmTotal > 0 ? (pmClosed / pmTotal) * 100 : 100;

    return {
      availability,
      mttrHours,
      mtbf,
      overdue,
      technicians: techniciansCount,
      oee,
      performance,
      quality,
      backlog,
      pmCompliance
    };
  }, [assets, techniciansCount, workOrders]);

  const aiSuggestions = useMemo(() => {
    const suggestions = [];

    // Rule 1: High NPR assets
    const highRisk = criticalAssets.filter(a => a.npr > 20);
    if (highRisk.length > 0) {
      suggestions.push({
        type: "CRITICAL_RISK",
        title: "Activos en Riesgo Crítico",
        description: `Se detectaron ${highRisk.length} activos con NPR alto. Se recomienda crear OTs preventivas inmediatamente.`,
        confidence: "alta"
      });
    }

    // Rule 2: Low PM Compliance
    if (kpis.pmCompliance < 80 && kpis.pmCompliance > 0) {
      suggestions.push({
        type: "LOW_COMPLIANCE",
        title: "Bajo Cumplimiento Preventivo",
        description: `El cumplimiento de PM está al ${kpis.pmCompliance.toFixed(0)}%. Priorizar WOs preventivas atrasadas para evitar paros.`,
        confidence: "alta"
      });
    }

    // Rule 3: High Backlog
    if (kpis.backlog > 10) {
      suggestions.push({
        type: "HIGH_BACKLOG",
        title: "Alto Volumen de Backlog",
        description: `Hay ${kpis.backlog} OTs abiertas. Evaluar asignación de horas extra o balanceo de técnicos.`,
        confidence: "media"
      });
    }

    // Rule 4: General optimization
    if (suggestions.length === 0) {
      suggestions.push({
        type: "ROOT_CAUSE",
        title: "Operación Estable",
        description: "El sistema está estable. Se recomienda revisar parámetros de OEE para mejoras incrementales.",
        confidence: "media"
      });
    } else {
      suggestions.push({
        type: "ROOT_CAUSE",
        title: "Análisis de Causa Raíz Sugerido",
        description: "Múltiples alertas en la línea de producción. Realizar un diagrama Ishikawa (Fishbone) para evitar recurrencias.",
        confidence: "baja"
      });
    }

    return suggestions;
  }, [criticalAssets, kpis]);

  return (
    <div className="space-y-6">
      <DashboardHero description={dictionary.dashboard.description} title={dictionary.dashboard.title} />

      <DashboardSummary labels={dictionary.dashboard} metrics={liveMetrics} />
      {user?.companies && (isGod(user?.role) || user.companies.length > 1) ? <CompanyViewsPanel /> : null}
      {showManageUsers ? <ManageUsersPanel /> : null}

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

      {/* OEE + new KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea] flex flex-col items-center">
          <p className="text-sm text-muted mb-3">OEE</p>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#d6d0b8" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke={kpis.oee >= 70 ? "#6B8E23" : kpis.oee >= 40 ? "#C2A14D" : "#9f3a2f"}
              strokeWidth="10"
              strokeDasharray={`${(kpis.oee / 100) * 314} 314`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              className="transition-all duration-700"
            />
            <text x="60" y="65" textAnchor="middle" className="text-xl font-bold fill-foreground">
              {kpis.oee.toFixed(0)}%
            </text>
          </svg>
          <p className="mt-2 text-xs text-muted">A:{kpis.availability.toFixed(0)}% P:{kpis.performance.toFixed(0)}% Q:{kpis.quality.toFixed(0)}%</p>
        </Panel>
        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="text-sm text-muted">Backlog</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{kpis.backlog}</p>
          <p className="mt-1 text-xs text-muted">OTs abiertas</p>
        </Panel>
        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="text-sm text-muted">PM Compliance</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{kpis.pmCompliance.toFixed(0)}%</p>
          <p className="mt-1 text-xs text-muted">Preventivos completados</p>
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
        
        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="mb-4 text-sm font-medium text-muted">OT por Prioridad</p>
          <div className="h-56 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={workOrdersPriorityData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45}>
                    {workOrdersPriorityData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={["#9f3a2f", "#C2A14D", "#6B8E23"][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="mb-4 text-sm font-medium text-muted">Top Técnicos (Carga OT)</p>
          <div className="h-56 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workOrdersByTechnicianData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6d0b8" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#C2A14D" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
          <p className="mb-4 text-sm font-medium text-muted">Top 5 Activos Críticos (NPR)</p>
          <div className="space-y-3">
            {criticalAssets.map((asset) => (
              <div key={asset.id} className="flex justify-between items-center text-sm">
                <span className="truncate w-3/5">{asset.name || asset.tag}</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${asset.npr > 20 ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                  NPR: {asset.npr.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Acciones Recomendadas (IA Insights)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {aiSuggestions.map((suggestion, idx) => (
            <Panel key={idx} className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{suggestion.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  suggestion.confidence === "alta" ? "bg-success/20 text-success" :
                  suggestion.confidence === "media" ? "bg-accent/20 text-accent" :
                  "bg-muted/20 text-muted-foreground"
                }`}>
                  Confianza: {suggestion.confidence}
                </span>
              </div>
              <p className="text-sm text-muted">{suggestion.description}</p>
            </Panel>
          ))}
        </div>
      </div>

    </div>
  );
}
