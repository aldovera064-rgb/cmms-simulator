"use client";

import { useEffect, useMemo, useState } from "react";

import { WorkOrderDetailModal } from "@/components/work-orders/work-order-detail-modal";
import { WorkOrderFormModal } from "@/components/work-orders/work-order-form-modal";
import { WorkOrderPriorityBadge } from "@/components/work-orders/work-order-priority-badge";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status-badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import {
  WorkOrderApiError,
  WorkOrderCreateInput,
  WorkOrderFilters,
  WorkOrderListItem,
  WorkOrderUpdateInput
} from "@/types/work-orders";

type AssetOption = {
  id: string;
  tag: string;
  name: string;
};

type WorkOrdersPageClientProps = {
  initialWorkOrders: WorkOrderListItem[];
  assets: AssetOption[];
};

export function WorkOrdersPageClient({
  initialWorkOrders,
  assets
}: WorkOrdersPageClientProps) {
  const [workOrders, setWorkOrders] = useState(initialWorkOrders);
  const [filters, setFilters] = useState<WorkOrderFilters>({
    status: "ALL",
    priority: "ALL",
    type: "ALL",
    assetId: "ALL"
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderListItem | null>(null);
  const [createError, setCreateError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const visibleWorkOrders = useMemo(() => {
    return workOrders.filter((workOrder) => {
      if (filters.status && filters.status !== "ALL" && workOrder.status !== filters.status) {
        return false;
      }

      if (filters.priority && filters.priority !== "ALL" && workOrder.priority !== filters.priority) {
        return false;
      }

      if (filters.type && filters.type !== "ALL" && workOrder.type !== filters.type) {
        return false;
      }

      if (filters.assetId && filters.assetId !== "ALL" && workOrder.assetId !== filters.assetId) {
        return false;
      }

      return true;
    });
  }, [filters, workOrders]);

  const openCount = workOrders.filter((workOrder) => workOrder.status !== "CLOSED").length;
  const p1Count = workOrders.filter(
    (workOrder) => workOrder.priority === "P1" && workOrder.status !== "CLOSED"
  ).length;

  async function refreshWorkOrders() {
    const response = await fetch("/api/workorders");
    const data = (await response.json()) as WorkOrderListItem[];
    setWorkOrders(sortWorkOrders(data));
  }

  async function handleCreate(values: WorkOrderCreateInput) {
    setLoading(true);
    setCreateError("");

    try {
      const response = await fetch("/api/workorders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const errorData = (await response.json()) as WorkOrderApiError;
        setCreateError(errorData.error || "No se pudo crear la OT.");
        return;
      }

      await refreshWorkOrders();
      setCreateOpen(false);
    } catch {
      setCreateError("No se pudo crear la OT.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(values: WorkOrderUpdateInput) {
    if (!selectedWorkOrder) {
      return;
    }

    setLoading(true);
    setDetailError("");

    try {
      const response = await fetch(`/api/workorders/${selectedWorkOrder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const errorData = (await response.json()) as WorkOrderApiError;
        setDetailError(errorData.error || "No se pudo actualizar la OT.");
        return;
      }

      const updated = (await response.json()) as WorkOrderListItem;
      setSelectedWorkOrder(updated);
      setWorkOrders((current) =>
        sortWorkOrders(current.map((item) => (item.id === updated.id ? updated : item)))
      );
    } catch {
      setDetailError("No se pudo actualizar la OT.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedWorkOrder) {
      return;
    }

    setLoading(true);
    setDetailError("");

    try {
      const response = await fetch(`/api/workorders/${selectedWorkOrder.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const errorData = (await response.json()) as WorkOrderApiError;
        setDetailError(errorData.error || "No se pudo eliminar la OT.");
        return;
      }

      setWorkOrders((current) => current.filter((item) => item.id !== selectedWorkOrder.id));
      setSelectedWorkOrder(null);
    } catch {
      setDetailError("No se pudo eliminar la OT.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">Work Orders</p>
            <h1 className="text-3xl font-semibold tracking-tight">Ordenes de trabajo</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Gestiona correctivos, preventivos y predictivos con SLA real por prioridad.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="rounded-2xl border border-border bg-panelAlt/70 px-4 py-3 text-sm">
              OTs abiertas: <span className="font-semibold text-foreground">{openCount}</span>
            </div>
            <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
              Alertas P1: <span className="font-semibold">{p1Count}</span>
            </div>
            <Button onClick={() => setCreateOpen(true)}>Nueva OT</Button>
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value as WorkOrderFilters["status"] }))
            }
            value={filters.status ?? "ALL"}
          >
            <option value="ALL">Todos los estados</option>
            <option value="OPEN">Abiertas</option>
            <option value="IN_PROGRESS">En proceso</option>
            <option value="ON_HOLD">En espera</option>
            <option value="CLOSED">Cerradas</option>
          </Select>

          <Select
            onChange={(event) =>
              setFilters((current) => ({ ...current, type: event.target.value as WorkOrderFilters["type"] }))
            }
            value={filters.type ?? "ALL"}
          >
            <option value="ALL">Todos los tipos</option>
            <option value="CORRECTIVE">Correctivo</option>
            <option value="PREVENTIVE">Preventivo</option>
            <option value="PREDICTIVE">Predictivo</option>
          </Select>

          <Select
            onChange={(event) =>
              setFilters((current) => ({ ...current, priority: event.target.value as WorkOrderFilters["priority"] }))
            }
            value={filters.priority ?? "ALL"}
          >
            <option value="ALL">Todas las prioridades</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
            <option value="P4">P4</option>
          </Select>

          <Select
            onChange={(event) =>
              setFilters((current) => ({ ...current, assetId: event.target.value }))
            }
            value={filters.assetId ?? "ALL"}
          >
            <option value="ALL">Todos los activos</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.tag}
              </option>
            ))}
          </Select>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-panelAlt/70 text-left text-xs uppercase tracking-[0.2em] text-muted">
              <tr>
                <th className="px-5 py-4">OT</th>
                <th className="px-5 py-4">Activo</th>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Prioridad</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Tecnico</th>
                <th className="px-5 py-4">Apertura</th>
                <th className="px-5 py-4">SLA</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleWorkOrders.map((workOrder) => {
                const sla = getSlaState(workOrder, nowTick);

                return (
                  <tr
                    className={workOrder.priority === "P1" ? "bg-danger/5" : "hover:bg-panelAlt/30"}
                    key={workOrder.id}
                  >
                    <td className="px-5 py-4 font-medium">{workOrder.number}</td>
                    <td className="px-5 py-4">
                      <div>{workOrder.assetTag}</div>
                      <div className="text-xs text-muted">{workOrder.assetName}</div>
                    </td>
                    <td className="px-5 py-4">{typeLabel(workOrder.type)}</td>
                    <td className="px-5 py-4">
                      <WorkOrderPriorityBadge value={workOrder.priority} />
                    </td>
                    <td className="px-5 py-4">
                      <WorkOrderStatusBadge value={workOrder.status} />
                    </td>
                    <td className="px-5 py-4 text-muted">{workOrder.technicianName || "-"}</td>
                    <td className="px-5 py-4 text-muted">{formatDate(workOrder.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className={sla.color}>{sla.label}</div>
                      <div className="text-xs text-muted">{sla.elapsed}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button onClick={() => setSelectedWorkOrder(workOrder)} variant="secondary">
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {visibleWorkOrders.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-muted" colSpan={9}>
                    No hay OTs para los filtros seleccionados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <WorkOrderFormModal
        assets={assets}
        error={createError}
        loading={loading && createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateError("");
        }}
        onSubmit={handleCreate}
        open={createOpen}
      />

      <WorkOrderDetailModal
        error={detailError}
        loading={loading && Boolean(selectedWorkOrder)}
        onClose={() => {
          setSelectedWorkOrder(null);
          setDetailError("");
        }}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        open={Boolean(selectedWorkOrder)}
        workOrder={selectedWorkOrder}
      />
    </div>
  );
}

function sortWorkOrders(items: WorkOrderListItem[]) {
  const priorityRank = { P1: 0, P2: 1, P3: 2, P4: 3 } as const;
  return [...items].sort((left, right) => {
    const priorityDiff = priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function typeLabel(type: WorkOrderListItem["type"]) {
  return (
    {
      CORRECTIVE: "Correctivo",
      PREVENTIVE: "Preventivo",
      PREDICTIVE: "Predictivo"
    } as const
  )[type];
}

function getSlaState(workOrder: WorkOrderListItem, nowTick: number) {
  const end = workOrder.closedAt ? new Date(workOrder.closedAt).getTime() : nowTick;
  const elapsedMs = Math.max(0, end - new Date(workOrder.createdAt).getTime());
  const totalMs = Math.max(1, new Date(workOrder.dueDate).getTime() - new Date(workOrder.createdAt).getTime());
  const ratio = elapsedMs / totalMs;

  if (workOrder.status === "CLOSED") {
    return {
      label: "Cerrada",
      elapsed: formatElapsed(elapsedMs),
      color: "text-success"
    };
  }

  if (ratio >= 1) {
    return {
      label: "Vencida",
      elapsed: formatElapsed(elapsedMs),
      color: "text-danger"
    };
  }

  if (ratio >= 0.8) {
    return {
      label: "Por vencer",
      elapsed: formatElapsed(elapsedMs),
      color: "text-warning"
    };
  }

  return {
    label: "En tiempo",
    elapsed: formatElapsed(elapsedMs),
    color: "text-sky-300"
  };
}

function formatElapsed(value: number) {
  const totalMinutes = Math.floor(value / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
