"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CriticalityBadge } from "@/components/ui/criticality-badge";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FailureTrendCard } from "@/components/assets/failure-trend-card";
import { formatDateGlobal } from "@/lib/format-date";
import { AssetApiError, AssetDetail, AssetStatus } from "@/types/assets";

type AssetDetailClientProps = {
  initialAsset: AssetDetail;
};

type EditableState = Pick<
  AssetDetail,
  "name" | "area" | "criticality" | "manufacturer" | "model" | "technicalSpecifications"
>;

const statusOptions: Record<AssetStatus, string> = {
  OPERATIVE: "Operativo",
  MAINTENANCE: "En mantenimiento",
  OUT_OF_SERVICE: "Fuera de servicio"
};

export function AssetDetailClient({ initialAsset }: AssetDetailClientProps) {
  const router = useRouter();
  const [asset, setAsset] = useState(initialAsset);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<EditableState>({
    name: initialAsset.name,
    area: initialAsset.area,
    criticality: initialAsset.criticality,
    manufacturer: initialAsset.manufacturer,
    model: initialAsset.model,
    technicalSpecifications: initialAsset.technicalSpecifications
  });
  const [elapsedMs, setElapsedMs] = useState(0);

  const referenceDate = asset.lastFailureAt ?? asset.installationDate;

  useEffect(() => {
    setDraft({
      name: asset.name,
      area: asset.area,
      criticality: asset.criticality,
      manufacturer: asset.manufacturer,
      model: asset.model,
      technicalSpecifications: asset.technicalSpecifications
    });
  }, [asset]);

  useEffect(() => {
    const updateElapsed = () => {
      setElapsedMs(Math.max(0, Date.now() - new Date(referenceDate).getTime()));
    };

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(interval);
  }, [referenceDate]);

  const elapsedLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const totalHours = Math.floor(totalSeconds / 3600);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return `${days} dias / ${hours} horas`;
  }, [elapsedMs]);

  const saveInline = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/activos/${asset.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(draft)
      });

      if (!response.ok) {
        const errorData = (await response.json()) as AssetApiError;
        setError(errorData.error || "No se pudo actualizar el activo.");
        return;
      }

      const updated = (await response.json()) as AssetDetail;
      setAsset((current) => ({
        ...current,
        ...updated,
        operatingSince: current.operatingSince,
        baselineOperatingHours: current.baselineOperatingHours
      }));
      setEditing(false);
    } catch {
      setError("No se pudo actualizar el activo.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: AssetStatus) => {
    setStatusSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/activos/${asset.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = (await response.json()) as AssetApiError;
        setError(errorData.error || "No se pudo actualizar el estado.");
        return;
      }

      const updated = (await response.json()) as AssetDetail;
      setAsset((current) => ({
        ...current,
        ...updated,
        operatingSince: current.operatingSince,
        baselineOperatingHours: current.baselineOperatingHours
      }));
    } catch {
      setError("No se pudo actualizar el estado.");
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => router.back()} variant="secondary">
          Volver
        </Button>
        <Link className="text-sm text-muted hover:text-foreground" href="/activos">
          Ver todos los activos
        </Link>
      </div>

      <Panel className="industrial-grid overflow-hidden p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">{asset.tag}</p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">{asset.name || "Activo"}</h1>
              <p className="text-sm text-muted">{asset.area || "Area sin definir"}</p>
            </div>
            <CriticalityBadge value={asset.criticality} />
          </div>

          <Button onClick={() => setEditing((current) => !current)} variant="secondary">
            {editing ? "Cancelar edicion" : "Editar"}
          </Button>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-accent">
                Informacion editable
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Ficha del activo</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Nombre">
              <Input
                disabled={!editing}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                value={draft.name}
              />
            </Field>
            <Field label="Area">
              <Input
                disabled={!editing}
                onChange={(event) => setDraft((current) => ({ ...current, area: event.target.value }))}
                value={draft.area}
              />
            </Field>
            <Field label="Criticidad">
              <Select
                disabled={!editing}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    criticality: event.target.value as AssetDetail["criticality"]
                  }))
                }
                value={draft.criticality}
              >
                <option value="A">A - Alta</option>
                <option value="B">B - Media</option>
                <option value="C">C - Baja</option>
              </Select>
            </Field>
            <Field label="Fabricante">
              <Input
                disabled={!editing}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, manufacturer: event.target.value }))
                }
                value={draft.manufacturer}
              />
            </Field>
            <Field label="Modelo">
              <Input
                disabled={!editing}
                onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
                value={draft.model}
              />
            </Field>
            <Field label="Estado del activo">
              <Select
                disabled={statusSaving}
                onChange={(event) => updateStatus(event.target.value as AssetStatus)}
                value={asset.status}
              >
                {Object.entries(statusOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Especificaciones">
              <Textarea
                disabled={!editing}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    technicalSpecifications: event.target.value
                  }))
                }
                value={draft.technicalSpecifications}
              />
            </Field>
          </div>

          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

          {editing ? (
            <div className="mt-6 flex justify-end">
              <Button disabled={saving} onClick={saveInline}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel className="p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-accent">Timer operativo</p>
            <h2 className="mt-2 text-2xl font-semibold">Tiempo sin fallas</h2>
            <p className="mt-4 text-4xl font-semibold tracking-tight">{elapsedLabel}</p>
            <p className="mt-3 text-sm text-muted">
              Referencia:{" "}
              {asset.lastFailureAt
                ? "ultima falla registrada"
                : "fecha de instalacion del activo"}
            </p>
          </Panel>

          <Panel className="p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-accent">Estado actual</p>
            <h2 className="mt-2 text-2xl font-semibold">{statusOptions[asset.status]}</h2>
            <div className="mt-5 grid gap-3 text-sm text-muted">
              <p>Instalacion: {formatDate(asset.installationDate)}</p>
              <p>
                Ultima falla: {asset.lastFailureAt ? formatDate(asset.lastFailureAt) : "Sin registro"}
              </p>
              <p>Serie: {asset.serialNumber || "Sin serie"}</p>
            </div>
          </Panel>

          <FailureTrendCard
            installationDate={asset.installationDate}
            workOrders={asset.correctiveClosedWorkOrders}
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

function formatDate(value: string) {
  return formatDateGlobal(value, true);
}
