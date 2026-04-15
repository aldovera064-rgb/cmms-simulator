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

type Props = {
  initialWorkOrders: WorkOrderListItem[];
  assets: AssetOption[];
};

export function WorkOrdersPageClient({ initialWorkOrders, assets }: Props) {
  const [workOrders, setWorkOrders] = useState<WorkOrderListItem[]>(() => {
    if (typeof window === "undefined") return initialWorkOrders;
    const stored = localStorage.getItem("demo-workorders");
    return stored ? JSON.parse(stored) : initialWorkOrders;
  });

  const [filters, setFilters] = useState<WorkOrderFilters>({
    status: "ALL",
    priority: "ALL",
    type: "ALL",
    assetId: "ALL"
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderListItem | null>(null);

  // ⏱ reloj SLA (opcional)
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 💾 guardar en localStorage
  useEffect(() => {
    localStorage.setItem("demo-workorders", JSON.stringify(workOrders));
  }, [workOrders]);

  // 🔍 filtros
  const visibleWorkOrders = useMemo(() => {
    return workOrders.filter((w) => {
      if (filters.status !== "ALL" && w.status !== filters.status) return false;
      if (filters.priority !== "ALL" && w.priority !== filters.priority) return false;
      if (filters.type !== "ALL" && w.type !== filters.type) return false;
      if (filters.assetId !== "ALL" && w.assetId !== filters.assetId) return false;
      return true;
    });
  }, [filters, workOrders]);

  // 🔥 CREATE
  function handleCreate(values: WorkOrderCreateInput) {
    const asset = assets.find((a) => a.id === values.assetId);

    const newWO = {
      id: Date.now().toString(),
      number: `OT-${Date.now()}`,
      assetId: values.assetId,
      assetTag: asset?.tag || "",
      assetName: asset?.name || "",
      type: values.type,
      priority: values.priority,
      status: "OPEN",
      description: values.description,
      technicianName: values.technicianName || "",
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      closedAt: null
    } as WorkOrderListItem;

    setWorkOrders((current) => sortWorkOrders([newWO, ...current]));
    setCreateOpen(false);
  }

  // 🔥 UPDATE
  async function handleUpdate(values: WorkOrderUpdateInput) {
    if (!selectedWorkOrder) return;

    const updated = {
      ...selectedWorkOrder,
      ...values
    };

    setWorkOrders((current) =>
      sortWorkOrders(current.map((w) => (w.id === updated.id ? updated : w)))
    );

    setSelectedWorkOrder(updated);
  }

  // 🔥 DELETE
  async function handleDelete() {
    if (!selectedWorkOrder) return;

    setWorkOrders((current) =>
      current.filter((w) => w.id !== selectedWorkOrder.id)
    );

    setSelectedWorkOrder(null);
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Órdenes de trabajo</h1>
        <Button onClick={() => setCreateOpen(true)}>Nueva OT</Button>
      </Panel>

      <Panel className="p-5">
        <Select
          value={filters.assetId}
          onChange={(e) =>
            setFilters((f) => ({ ...f, assetId: e.target.value }))
          }
        >
          <option value="ALL">Todos los activos</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.tag}
            </option>
          ))}
        </Select>
      </Panel>

      <Panel>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2">OT</th>
                <th className="px-4 py-2">Activo</th>
                <th className="px-4 py-2">Prioridad</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {visibleWorkOrders.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-2">{w.number}</td>
                  <td className="px-4 py-2">{w.assetTag}</td>
                  <td className="px-4 py-2">
                    <WorkOrderPriorityBadge value={w.priority} />
                  </td>
                  <td className="px-4 py-2">
                    <WorkOrderStatusBadge value={w.status} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button onClick={() => setSelectedWorkOrder(w)}>
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <WorkOrderFormModal
        assets={assets}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <WorkOrderDetailModal
        workOrder={selectedWorkOrder}
        open={Boolean(selectedWorkOrder)}
        onClose={() => setSelectedWorkOrder(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}

function sortWorkOrders(items: WorkOrderListItem[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}