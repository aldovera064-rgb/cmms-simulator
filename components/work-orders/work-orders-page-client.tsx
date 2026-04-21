"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { WorkOrderDetailModal } from "@/components/work-orders/work-order-detail-modal";
import { WorkOrderFormModal } from "@/components/work-orders/work-order-form-modal";
import { WorkOrderPriorityBadge } from "@/components/work-orders/work-order-priority-badge";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status-badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { ensureSeedData, fetchAssets, fetchTechnicians, fetchWorkOrders } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
import { supabase } from "@/lib/supabase";
import { exportWorkOrderPdf } from "@/lib/work-orders/pdf";
import { buildWorkOrderQrValue } from "@/lib/work-orders/qr";
import {
  WorkOrderCreateInput,
  WorkOrderFilters,
  WorkOrderListItem,
  WorkOrderUpdateInput,
  WorkOrderPriorityValue,
  WorkOrderStatusValue,
  WorkOrderTypeValue
} from "@/types/work-orders";

type AssetOption = {
  id: string;
  tag: string;
  name: string;
  serialNumber: string;
};

type TechnicianOption = {
  id: string;
  name: string;
};

type Props = {
  initialWorkOrders: WorkOrderListItem[];
  assets: AssetOption[];
};

function normalizePriority(value: string | null): WorkOrderPriorityValue {
  if (value === "P1" || value === "P2" || value === "P3" || value === "P4") return value;
  return "P3";
}

function normalizeStatus(value: string | null): WorkOrderStatusValue {
  if (value === "OPEN" || value === "IN_PROGRESS" || value === "ON_HOLD" || value === "CLOSED") return value;
  return "OPEN";
}

function normalizeType(value: string | null): WorkOrderTypeValue {
  if (value === "CORRECTIVE" || value === "PREVENTIVE" || value === "PREDICTIVE") return value;
  return "CORRECTIVE";
}

function mapWorkOrder(row: {
  id: string;
  title: string | null;
  asset_id: string | null;
  technician_id: string | null;
  priority: string | null;
  status: string | null;
  type: string | null;
  technician: string | null;
  started_at: string | null;
  completed_at: string | null;
  description: string | null;
  root_cause: string | null;
  action_taken: string | null;
  qr_code: string | null;
  created_at: string | null;
}): WorkOrderListItem {
  const createdAt = row.created_at ?? new Date().toISOString();
  return {
    id: row.id,
    number: `OT-${row.id.slice(0, 6).toUpperCase()}`,
    assetId: row.asset_id ?? "",
    technicianId: row.technician_id,
    assetTag: "-",
    assetName: "-",
    type: normalizeType(row.type),
    priority: normalizePriority(row.priority),
    status: normalizeStatus(row.status),
    description: row.description ?? row.title ?? "",
    actionTaken: row.action_taken,
    technicianName: row.technician ?? "",
    qrCode: row.qr_code,
    createdAt,
    dueDate: new Date(new Date(createdAt).getTime() + 86400000).toISOString(),
    startedAt: row.started_at,
    closedAt: row.completed_at ?? (normalizeStatus(row.status) === "CLOSED" ? createdAt : null),
    completedAt: row.completed_at,
    rootCause: row.root_cause,
    workPerformed: row.action_taken,
    repairTimeMinutes: null
  };
}

export function WorkOrdersPageClient({ initialWorkOrders }: Props) {
  const { locale } = useI18n();
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderListItem[]>(initialWorkOrders);
  const [qrImageMap, setQrImageMap] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<WorkOrderFilters>({
    status: "ALL",
    priority: "ALL",
    type: "ALL",
    assetId: "ALL"
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderListItem | null>(null);

  const copy =
    locale === "en"
      ? {
          title: "Work Orders",
          newOt: "New WO",
          allAssets: "All assets",
          ot: "WO",
          asset: "Asset",
          priority: "Priority",
          status: "Status",
          qr: "QR",
          actions: "Actions",
          edit: "Edit",
          noData: "No work orders"
        }
      : {
          title: "Órdenes de trabajo",
          newOt: "Nueva OT",
          allAssets: "Todos los activos",
          ot: "OT",
          asset: "Activo",
          priority: "Prioridad",
          status: "Estado",
          qr: "QR",
          actions: "Acciones",
          edit: "Editar",
          noData: "No hay órdenes"
        };

  useEffect(() => {
    const load = async () => {
      await ensureSeedData();

      const [assetRows, technicianRows, workOrderRows] = await Promise.all([
        fetchAssets(),
        fetchTechnicians(),
        fetchWorkOrders()
      ]);

      setAssets(
        assetRows.map((asset) => ({
          id: asset.id,
          tag: `AS-${asset.id.slice(0, 4).toUpperCase()}`,
          name: asset.name ?? "",
          serialNumber: asset.serial_number ?? `AS-${asset.id.slice(0, 4).toUpperCase()}`
        }))
      );
      setTechnicians(
        technicianRows.map((technician) => ({
          id: technician.id,
          name: technician.name ?? ""
        }))
      );
      setWorkOrders(workOrderRows.map(mapWorkOrder));
    };

    void load();
  }, []);

  useEffect(() => {
    const buildQrImages = async () => {
      const entries = await Promise.all(
        workOrders
          .filter((workOrder) => Boolean(workOrder.qrCode))
          .map(async (workOrder) => {
            const dataUrl = await QRCode.toDataURL(workOrder.qrCode as string);
            return [workOrder.id, dataUrl] as const;
          })
      );
      setQrImageMap(Object.fromEntries(entries));
    };

    void buildQrImages();
  }, [workOrders]);

  const visibleWorkOrders = useMemo(() => {
    return workOrders.filter((workOrder) => {
      if (filters.assetId !== "ALL" && workOrder.assetId !== filters.assetId) return false;
      return true;
    });
  }, [filters, workOrders]);

  async function refreshWorkOrders() {
    const rows = await fetchWorkOrders();
    setWorkOrders(rows.map(mapWorkOrder));
  }

  async function handleCreate(values: WorkOrderCreateInput) {
    const selectedAsset = assets.find((asset) => asset.id === values.assetId);
    const qrCode = buildWorkOrderQrValue({
      serialNumber: selectedAsset?.serialNumber ?? "NO-SN",
      status: "OPEN"
    });

    const { error } = await supabase.from("work_orders").insert([
      {
        title: values.description,
        description: values.description,
        asset_id: values.assetId,
        technician_id: values.technicianId ?? null,
        priority: values.priority,
        status: "OPEN",
        type: values.type,
        technician: values.technicianName || "",
        qr_code: qrCode
      }
    ]);

    if (!error) {
      await refreshWorkOrders();
      setCreateOpen(false);
    }
  }

  async function handleUpdate(values: WorkOrderUpdateInput) {
    if (!selectedWorkOrder) return;

    const nextStatus = values.status ?? selectedWorkOrder.status;
    const completedAt = nextStatus === "CLOSED" ? (values.closedAt ?? new Date().toISOString()) : null;
    const { error } = await supabase
      .from("work_orders")
      .update({
        title: values.description ?? selectedWorkOrder.description,
        description: values.description ?? selectedWorkOrder.description,
        priority: values.priority ?? selectedWorkOrder.priority,
        status: nextStatus,
        type: values.type ?? selectedWorkOrder.type,
        technician: values.technicianName ?? selectedWorkOrder.technicianName,
        technician_id: values.technicianId ?? selectedWorkOrder.technicianId,
        started_at: values.startedAt ?? selectedWorkOrder.startedAt,
        completed_at: completedAt ?? selectedWorkOrder.completedAt,
        root_cause: values.rootCause ?? selectedWorkOrder.rootCause,
        action_taken: values.actionTaken ?? values.workPerformed ?? selectedWorkOrder.actionTaken
      })
      .eq("id", selectedWorkOrder.id);

    if (!error) {
      if (nextStatus === "CLOSED") {
        exportWorkOrderPdf({
          id: selectedWorkOrder.id,
          assetName: selectedWorkOrder.assetName,
          technicianName: values.technicianName ?? selectedWorkOrder.technicianName,
          description: values.description ?? selectedWorkOrder.description,
          rootCause: values.rootCause ?? selectedWorkOrder.rootCause ?? "",
          actionTaken:
            values.actionTaken ?? values.workPerformed ?? selectedWorkOrder.actionTaken ?? selectedWorkOrder.workPerformed ?? "",
          startedAt: values.startedAt ?? selectedWorkOrder.startedAt,
          completedAt: completedAt ?? selectedWorkOrder.completedAt,
          date: new Date().toLocaleString("es-MX")
        });
      }
      await refreshWorkOrders();
      setSelectedWorkOrder((current) => (current ? { ...current, ...values } : current));
    }
  }

  async function handleExportPdf() {
    if (!selectedWorkOrder) return;
    exportWorkOrderPdf({
      id: selectedWorkOrder.id,
      assetName: selectedWorkOrder.assetName,
      technicianName: selectedWorkOrder.technicianName,
      description: selectedWorkOrder.description,
      rootCause: selectedWorkOrder.rootCause ?? "",
      actionTaken: selectedWorkOrder.actionTaken ?? selectedWorkOrder.workPerformed ?? "",
      startedAt: selectedWorkOrder.startedAt,
      completedAt: selectedWorkOrder.completedAt ?? selectedWorkOrder.closedAt,
      date: new Date().toLocaleString("es-MX")
    });
  }

  async function handleDelete() {
    if (!selectedWorkOrder) return;

    const { error } = await supabase.from("work_orders").delete().eq("id", selectedWorkOrder.id);

    if (!error) {
      setSelectedWorkOrder(null);
      await refreshWorkOrders();
    }
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6 flex justify-between items-center border-[#d6d0b8] bg-[#f8f6ea]">
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <Button onClick={() => setCreateOpen(true)}>{copy.newOt}</Button>
      </Panel>

      <Panel className="p-5 border-[#d6d0b8] bg-[#f8f6ea]">
        <Select
          value={filters.assetId}
          onChange={(event) => setFilters((current) => ({ ...current, assetId: event.target.value }))}
        >
          <option value="ALL">{copy.allAssets}</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.tag}
            </option>
          ))}
        </Select>
      </Panel>

      <Panel className="border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left align-middle">{copy.ot}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.asset}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.priority}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.status}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.qr}</th>
                <th className="px-4 py-2 text-right align-middle">{copy.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleWorkOrders.map((workOrder) => (
                <tr key={workOrder.id}>
                  <td className="px-4 py-2 text-left align-middle">{workOrder.number}</td>
                  <td className="px-4 py-2 text-left align-middle">{workOrder.description}</td>
                  <td className="px-4 py-2 text-left align-middle">
                    <WorkOrderPriorityBadge value={workOrder.priority} />
                  </td>
                  <td className="px-4 py-2 text-left align-middle">
                    <WorkOrderStatusBadge value={workOrder.status} />
                  </td>
                  <td className="px-4 py-2 text-left align-middle">
                    {workOrder.qrCode && qrImageMap[workOrder.id] ? (
                      <img
                        alt={`QR ${workOrder.number}`}
                        className="h-12 w-12 rounded border border-border bg-white p-1"
                        src={qrImageMap[workOrder.id]}
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2 text-right align-middle">
                    <Button variant="secondary" onClick={() => setSelectedWorkOrder(workOrder)}>
                      {copy.edit}
                    </Button>
                  </td>
                </tr>
              ))}

              {visibleWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    {copy.noData}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <WorkOrderFormModal
        assets={assets}
        technicians={technicians}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <WorkOrderDetailModal
        workOrder={selectedWorkOrder}
        open={Boolean(selectedWorkOrder)}
        onClose={() => setSelectedWorkOrder(null)}
        onUpdate={handleUpdate}
        onExportPdf={handleExportPdf}
        onDelete={handleDelete}
      />
    </div>
  );
}
