"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Panel } from "@/components/ui/panel";
import { AssetDetail } from "@/types/assets";

type FailureTrendCardProps = {
  installationDate: string;
  workOrders: AssetDetail["correctiveClosedWorkOrders"];
};

type FailurePoint = {
  monthKey: string;
  label: string;
  failures: number;
  isPeak: boolean;
};

export function FailureTrendCard({ installationDate, workOrders }: FailureTrendCardProps) {
  const data = useMemo(() => buildFailureTrend(workOrders), [workOrders]);
  const metrics = useMemo(
    () => buildMetrics(workOrders, data, installationDate),
    [data, installationDate, workOrders]
  );
  const peak = useMemo(
    () => data.reduce((max, item) => (item.failures > max.failures ? item : max), data[0]),
    [data]
  );

  return (
    <Panel className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent">Tendencia de fallas</p>
          <h2 className="mt-2 text-2xl font-semibold">Fallas por mes</h2>
        </div>
        <div className="text-right text-xs text-muted">
          <div>Pico reciente</div>
          <div className="mt-1 text-sm text-foreground">
            {peak.label}: {peak.failures}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="MTBF"
          title="Tiempo operativo promedio entre fallas."
          value={metrics.mtbfLabel}
        />
        <KpiCard
          label="MTTR"
          title="Promedio del tiempo de reparacion en OTs correctivas cerradas."
          value={metrics.mttrLabel}
        />
        <KpiCard
          label="Disponibilidad"
          title="MTBF / (MTBF + MTTR)."
          value={metrics.availabilityLabel}
        />
        <KpiCard
          label="Fallas 6M"
          title="Total de fallas registradas en los ultimos 6 meses."
          trend={metrics.trend}
          value={String(metrics.totalFailures)}
        />
      </div>

      <div className="mt-5 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="rgba(39, 64, 83, 0.45)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: "#98afc2", fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={{ fill: "#98afc2", fontSize: 12 }}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#101e2b",
                border: "1px solid #274053",
                borderRadius: "16px",
                color: "#ecf3f9"
              }}
              cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
              formatter={(value) => [`${value ?? 0}`, "Fallas"]}
              labelStyle={{ color: "#98afc2" }}
            />
            <Bar dataKey="failures" animationDuration={500} radius={[8, 8, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  fill={entry.isPeak ? "rgba(248, 113, 113, 0.9)" : "rgba(96, 165, 250, 0.85)"}
                  key={entry.monthKey}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function buildMetrics(
  workOrders: FailureTrendCardProps["workOrders"],
  data: FailurePoint[],
  installationDate: string
) {
  const totalFailures = data.reduce((sum, item) => sum + item.failures, 0);
  const repairDurationsHours = workOrders
    .map((workOrder) => workOrder.repairTimeMinutes)
    .filter((value): value is number => typeof value === "number" && value > 0)
    .map((minutes) => minutes / 60);

  const operatingWindowHours = Math.max(
    0,
    (Date.now() - new Date(installationDate).getTime()) / (1000 * 60 * 60)
  );

  const mtbfHours =
    workOrders.length > 0 ? operatingWindowHours / Math.max(workOrders.length, 1) : null;
  const mttrHours =
    repairDurationsHours.length > 0
      ? repairDurationsHours.reduce((sum, value) => sum + value, 0) / repairDurationsHours.length
      : null;
  const availability =
    mtbfHours && mttrHours !== null && mtbfHours + mttrHours > 0
      ? (mtbfHours / (mtbfHours + mttrHours)) * 100
      : null;

  const currentMonth = data[data.length - 1]?.failures ?? 0;
  const previousMonth = data[data.length - 2]?.failures ?? 0;

  return {
    totalFailures,
    mtbfLabel: formatDuration(mtbfHours),
    mttrLabel: formatDuration(mttrHours),
    availabilityLabel: availability !== null ? `${availability.toFixed(2)}%` : "-",
    trend: buildTrend(currentMonth, previousMonth)
  };
}

function buildTrend(current: number, previous: number) {
  if (current > previous) {
    return { icon: "↑", label: "vs mes anterior", value: "Aumentan", color: "text-danger" };
  }

  if (current < previous) {
    return { icon: "↓", label: "vs mes anterior", value: "Disminuyen", color: "text-success" };
  }

  return { icon: "→", label: "vs mes anterior", value: "Sin cambio", color: "text-muted" };
}

function formatDuration(value: number | null) {
  if (value === null || Number.isNaN(value) || value <= 0) {
    return "-";
  }

  if (value >= 24) {
    return `${(value / 24).toFixed(1)} dias`;
  }

  return `${value.toFixed(1)} h`;
}

function KpiCard({
  label,
  value,
  title,
  trend
}: {
  label: string;
  value: string;
  title: string;
  trend?: {
    icon: string;
    label: string;
    value: string;
    color: string;
  };
}) {
  return (
    <div className="rounded-2xl border border-border bg-panelAlt/65 p-4" title={title}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {trend ? (
        <p className={`mt-3 text-xs ${trend.color}`}>
          {trend.icon} {trend.value}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted">{title}</p>
      )}
    </div>
  );
}

function buildFailureTrend(workOrders: FailureTrendCardProps["workOrders"]): FailurePoint[] {
  const formatter = new Intl.DateTimeFormat("es-MX", { month: "short" });
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    return {
      monthKey,
      label: formatter
        .format(date)
        .replace(".", "")
        .replace(/^\w/, (letter) => letter.toUpperCase()),
      failures: 0,
      isPeak: false
    };
  });

  const counts = new Map(months.map((month) => [month.monthKey, 0]));

  for (const workOrder of workOrders) {
    const sourceDate = new Date(workOrder.closedAt ?? workOrder.createdAt);
    const monthKey = `${sourceDate.getFullYear()}-${String(sourceDate.getMonth() + 1).padStart(2, "0")}`;

    if (counts.has(monthKey)) {
      counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
    }
  }

  const maxFailures = Math.max(...months.map((month) => counts.get(month.monthKey) ?? 0), 0);

  return months.map((month) => {
    const failures = counts.get(month.monthKey) ?? 0;

    return {
      ...month,
      failures,
      isPeak: maxFailures > 0 && failures === maxFailures
    };
  });
}
