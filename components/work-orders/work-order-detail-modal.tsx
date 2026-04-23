"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WorkOrderPriorityBadge } from "@/components/work-orders/work-order-priority-badge";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status-badge";
import { WorkOrderApiError, WorkOrderListItem, WorkOrderUpdateInput } from "@/types/work-orders";

type WorkOrderDetailModalProps = {
  open: boolean;
  workOrder: WorkOrderListItem | null;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onUpdate: (values: WorkOrderUpdateInput) => Promise<void>;
  onExportPdf: () => void;
  onDelete: () => Promise<void>;
  canEdit?: boolean;
};

export function WorkOrderDetailModal({
  open,
  workOrder,
  loading,
  error,
  onClose,
  onUpdate,
  onExportPdf,
  onDelete,
  canEdit = true
}: WorkOrderDetailModalProps) {
  const [technicianName, setTechnicianName] = useState("");
  const [description, setDescription] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [repairTimeMinutes, setRepairTimeMinutes] = useState("");

  useEffect(() => {
    setTechnicianName(workOrder?.technicianName ?? "");
    setDescription(workOrder?.description ?? "");
    setWorkPerformed(workOrder?.workPerformed ?? "");
    setRootCause(workOrder?.rootCause ?? "");
    setRepairTimeMinutes(workOrder?.repairTimeMinutes?.toString() ?? "");
  }, [workOrder]);

  if (!workOrder) {
    return null;
  }

  const closeLabel =
    workOrder.status === "OPEN"
      ? "Iniciar"
      : workOrder.status === "IN_PROGRESS"
        ? "Poner en espera"
        : workOrder.status === "ON_HOLD"
          ? "Reanudar"
          : "Cerrada";

  return (
    <Modal
      description="Gestiona la OT, actualiza su tecnico y ejecuta el flujo de estados."
      onClose={onClose}
      open={open}
      title={`Detalle ${workOrder.number}`}
    >
      <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6 bg-panelAlt/40 rounded-xl backdrop-blur-sm scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-panelAlt/65 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Activo</p>
            <p className="mt-2 text-lg font-semibold">
              {workOrder.assetTag} - {workOrder.assetName}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-panelAlt/65 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Estado actual</p>
            <div className="mt-2 flex items-center gap-3">
              <WorkOrderPriorityBadge value={workOrder.priority} />
              <WorkOrderStatusBadge value={workOrder.status} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-muted">Tecnico</span>
            <Input disabled={!canEdit} onChange={(event) => setTechnicianName(event.target.value)} value={technicianName} />
          </label>

          <div className="rounded-2xl border border-border bg-panelAlt/65 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Timeline</p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p>Apertura: {formatDate(workOrder.createdAt)}</p>
              <p>Inicio: {workOrder.startedAt ? formatDate(workOrder.startedAt) : "-"}</p>
              <p>Cierre: {workOrder.closedAt ? formatDate(workOrder.closedAt) : "-"}</p>
            </div>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-muted">Descripcion</span>
          <Textarea disabled={!canEdit} onChange={(event) => setDescription(event.target.value)} value={description} />
        </label>

        <div className="flex flex-wrap gap-3">
          {canEdit && workOrder.status === "OPEN" ? (
            <Button
              disabled={loading}
              onClick={() => onUpdate({ status: "IN_PROGRESS", technicianName, description })}
            >
              Iniciar OT
            </Button>
          ) : null}

          {canEdit && workOrder.status === "IN_PROGRESS" ? (
            <Button
              disabled={loading}
              onClick={() => onUpdate({ status: "ON_HOLD", technicianName, description })}
              variant="secondary"
            >
              Poner en espera
            </Button>
          ) : null}

          {canEdit && workOrder.status === "ON_HOLD" ? (
            <Button
              disabled={loading}
              onClick={() => onUpdate({ status: "IN_PROGRESS", technicianName, description })}
              variant="secondary"
            >
              Reanudar
            </Button>
          ) : null}

          {canEdit && workOrder.status !== "CLOSED" ? (
            <Button
              disabled={loading}
              onClick={() => onUpdate({ technicianName, description })}
              variant="secondary"
            >
              Guardar cambios
            </Button>
          ) : null}

          {canEdit ? (
            <Button disabled={loading} onClick={onDelete} variant="danger">
              Eliminar
            </Button>
          ) : null}

          <Button disabled={loading} onClick={onExportPdf} variant="secondary">
            Export PDF
          </Button>
        </div>

        {canEdit && workOrder.status !== "CLOSED" ? (
          <div className="space-y-4 rounded-2xl border border-border bg-panelAlt/50 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">Cierre de OT</p>
              <p className="mt-2 text-sm text-muted">
                Para cerrar una OT correctiva o preventiva debes capturar toda la informacion obligatoria.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm text-muted">Trabajo realizado</span>
              <Textarea
                onChange={(event) => setWorkPerformed(event.target.value)}
                value={workPerformed}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-muted">Causa raiz</span>
                <Textarea onChange={(event) => setRootCause(event.target.value)} value={rootCause} />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-muted">Tiempo de reparacion (min)</span>
                <Input
                  min={1}
                  onChange={(event) => setRepairTimeMinutes(event.target.value)}
                  type="number"
                  value={repairTimeMinutes}
                />
              </label>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={loading}
                onClick={() =>
                  onUpdate({
                    status: "CLOSED",
                    technicianName,
                    description,
                    workPerformed,
                    actionTaken: workPerformed,
                    rootCause,
                    repairTimeMinutes: Number(repairTimeMinutes)
                  })
                }
              >
                Cerrar OT
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
