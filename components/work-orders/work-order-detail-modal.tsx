"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IshikawaModal } from "@/components/work-orders/ishikawa-modal";
import { WorkOrderPriorityBadge } from "@/components/work-orders/work-order-priority-badge";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status-badge";
import { useI18n } from "@/lib/i18n/context";
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
  const { locale } = useI18n();
  const [technicianName, setTechnicianName] = useState("");
  const [description, setDescription] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [repairTimeMinutes, setRepairTimeMinutes] = useState("");
  const [ishikawaOpen, setIshikawaOpen] = useState(false);

  const copy =
    locale === "en"
      ? {
          detailTitle: "Detail",
          asset: "Asset",
          currentStatus: "Current status",
          technician: "Technician",
          timeline: "Timeline",
          opened: "Opened",
          started: "Started",
          closed: "Closed",
          description: "Description",
          startWo: "Start WO",
          putOnHold: "Put on hold",
          resume: "Resume",
          saveChanges: "Save changes",
          deleteWo: "Delete",
          exportPdf: "Export PDF",
          closeSection: "WO Closure",
          closeSectionDesc: "To close a corrective or preventive WO you must fill all required information.",
          workPerformed: "Work performed",
          rootCause: "Root cause",
          repairTime: "Repair time (min)",
          ishikawa: "🐟 Root cause analysis (Ishikawa)",
          closeWo: "Close WO",
          modalDesc: "Manage the WO, update its technician and execute the status flow."
        }
      : {
          detailTitle: "Detalle",
          asset: "Activo",
          currentStatus: "Estado actual",
          technician: "Técnico",
          timeline: "Timeline",
          opened: "Apertura",
          started: "Inicio",
          closed: "Cierre",
          description: "Descripción",
          startWo: "Iniciar OT",
          putOnHold: "Poner en espera",
          resume: "Reanudar",
          saveChanges: "Guardar cambios",
          deleteWo: "Eliminar",
          exportPdf: "Exportar PDF",
          closeSection: "Cierre de OT",
          closeSectionDesc: "Para cerrar una OT correctiva o preventiva debes capturar toda la información obligatoria.",
          workPerformed: "Trabajo realizado",
          rootCause: "Causa raíz",
          repairTime: "Tiempo de reparación (min)",
          ishikawa: "🐟 Análisis causa raíz (Ishikawa)",
          closeWo: "Cerrar OT",
          modalDesc: "Gestiona la OT, actualiza su técnico y ejecuta el flujo de estados."
        };

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

  return (
    <Modal
      description={copy.modalDesc}
      onClose={onClose}
      open={open}
      title={`${copy.detailTitle} ${workOrder.number}`}
    >
      <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6 bg-panelAlt/40 rounded-xl backdrop-blur-sm scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-panelAlt/65 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{copy.asset}</p>
            <p className="mt-2 text-lg font-semibold">
              {workOrder.assetTag} - {workOrder.assetName}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-panelAlt/65 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{copy.currentStatus}</p>
            <div className="mt-2 flex items-center gap-3">
              <WorkOrderPriorityBadge value={workOrder.priority} />
              <WorkOrderStatusBadge value={workOrder.status} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-muted">{copy.technician}</span>
            <Input disabled={!canEdit} onChange={(event) => setTechnicianName(event.target.value)} value={technicianName} />
          </label>

          <div className="rounded-2xl border border-border bg-panelAlt/65 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{copy.timeline}</p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p>{copy.opened}: {formatDate(workOrder.createdAt)}</p>
              <p>{copy.started}: {workOrder.startedAt ? formatDate(workOrder.startedAt) : "-"}</p>
              <p>{copy.closed}: {workOrder.closedAt ? formatDate(workOrder.closedAt) : "-"}</p>
            </div>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-muted">{copy.description}</span>
          <Textarea disabled={!canEdit} onChange={(event) => setDescription(event.target.value)} value={description} />
        </label>

        <div className="flex flex-wrap gap-3">
          {canEdit && workOrder.status === "OPEN" ? (
            <Button
              disabled={loading}
              onClick={() => onUpdate({ status: "IN_PROGRESS", technicianName, description })}
            >
              {copy.startWo}
            </Button>
          ) : null}

          {canEdit && workOrder.status === "IN_PROGRESS" ? (
            <Button
              disabled={loading}
              onClick={() => onUpdate({ status: "ON_HOLD", technicianName, description })}
              variant="secondary"
            >
              {copy.putOnHold}
            </Button>
          ) : null}

          {canEdit && workOrder.status === "ON_HOLD" ? (
            <Button
              disabled={loading}
              onClick={() => onUpdate({ status: "IN_PROGRESS", technicianName, description })}
              variant="secondary"
            >
              {copy.resume}
            </Button>
          ) : null}

          {canEdit && workOrder.status !== "CLOSED" ? (
            <Button
              disabled={loading}
              onClick={() => onUpdate({ technicianName, description })}
              variant="secondary"
            >
              {copy.saveChanges}
            </Button>
          ) : null}

          {canEdit ? (
            <Button disabled={loading} onClick={onDelete} variant="danger">
              {copy.deleteWo}
            </Button>
          ) : null}

          <Button disabled={loading} onClick={onExportPdf} variant="secondary">
            {copy.exportPdf}
          </Button>
        </div>

        {canEdit && workOrder.status !== "CLOSED" ? (
          <div className="space-y-4 rounded-2xl border border-border bg-panelAlt/50 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">{copy.closeSection}</p>
              <p className="mt-2 text-sm text-muted">
                {copy.closeSectionDesc}
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm text-muted">{copy.workPerformed}</span>
              <Textarea
                onChange={(event) => setWorkPerformed(event.target.value)}
                value={workPerformed}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-muted">{copy.rootCause}</span>
                <Textarea onChange={(event) => setRootCause(event.target.value)} value={rootCause} />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-muted">{copy.repairTime}</span>
                <Input
                  min={1}
                  onChange={(event) => setRepairTimeMinutes(event.target.value)}
                  type="number"
                  value={repairTimeMinutes}
                />
              </label>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setIshikawaOpen(true)}>
                {copy.ishikawa}
              </Button>
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
                {copy.closeWo}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <IshikawaModal
        open={ishikawaOpen}
        onClose={() => setIshikawaOpen(false)}
        onSave={(result) => setRootCause(result)}
      />
    </Modal>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
