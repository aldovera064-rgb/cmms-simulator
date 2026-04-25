"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssetFormValues, AssetListItem } from "@/types/assets";

type AssetFormModalProps = {
  open: boolean;
  asset?: AssetListItem | null;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: AssetFormValues) => void;
};

const emptyValues: AssetFormValues = {
  tag: "",
  name: "",
  area: "",
  criticality: "C",
  manufacturer: "",
  model: "",
  serialNumber: "",
  installationDate: "",
  technicalSpecifications: "",
  temperature: 0,
  vibration: 0,
  currentVal: 0,
  pressure: 0,
  alertThreshold: 50,
  cbmEnabled: false,
  severity: 1,
  occurrence: 1,
  detection: 1
};

export function AssetFormModal({
  open,
  asset,
  loading,
  error,
  onClose,
  onSubmit
}: AssetFormModalProps) {
  const [values, setValues] = useState<AssetFormValues>(emptyValues);

  useEffect(() => {
    if (!asset) {
      setValues(emptyValues);
      return;
    }

    setValues({
      tag: asset.tag,
      name: asset.name,
      area: asset.area,
      criticality: asset.criticality,
      manufacturer: asset.manufacturer,
      model: asset.model,
      serialNumber: asset.serialNumber,
      installationDate: asset.installationDate.slice(0, 10),
      technicalSpecifications: asset.technicalSpecifications,
      temperature: asset.temperature ?? 0,
      vibration: asset.vibration ?? 0,
      currentVal: asset.currentVal ?? 0,
      pressure: asset.pressure ?? 0,
      alertThreshold: asset.alertThreshold ?? 50,
      cbmEnabled: asset.cbmEnabled ?? false,
      severity: asset.severity ?? 1,
      occurrence: asset.occurrence ?? 1,
      detection: asset.detection ?? 1
    });
  }, [asset, open]);

  const title = asset ? "Editar activo" : "Nuevo activo";

  return (
    <Modal
      description="Captura la informacion principal del activo para el simulador."
      onClose={onClose}
      open={open}
      title={title}
    >
      <form
        className="max-h-[70vh] overflow-y-auto pr-2 space-y-6 bg-panelAlt/40 rounded-xl backdrop-blur-sm scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);

          for (const pair of formData.entries()) {
            console.log("FIELD:", pair[0], "VALUE:", pair[1]);
          }

          const raw = Object.fromEntries(formData.entries());
          console.log("RAW PAYLOAD:", raw);

          const nextValues: AssetFormValues = {
            ...values,
            tag: String(raw.tag ?? values.tag ?? ""),
            name: String(raw.name ?? values.name ?? ""),
            area: String(raw.area ?? values.area ?? ""),
            criticality: (raw.criticality as AssetFormValues["criticality"]) ?? values.criticality,
            manufacturer: String(raw.manufacturer ?? values.manufacturer ?? ""),
            model: String(raw.model ?? values.model ?? ""),
            serialNumber: String(raw.serialNumber ?? values.serialNumber ?? ""),
            installationDate: String(raw.installationDate ?? values.installationDate ?? ""),
            technicalSpecifications: String(raw.technicalSpecifications ?? values.technicalSpecifications ?? ""),
            cbmEnabled: raw.cbmEnabled === "on" ? true : Boolean(values.cbmEnabled),
            temperature: Number(raw.temperature ?? values.temperature ?? 0),
            vibration: Number(raw.vibration ?? values.vibration ?? 0),
            currentVal: Number(raw.currentVal ?? values.currentVal ?? 0),
            pressure: Number(raw.pressure ?? values.pressure ?? 0),
            alertThreshold: Number(raw.alertThreshold ?? values.alertThreshold ?? 50),
            severity: Number(raw.severity ?? values.severity ?? 1),
            occurrence: Number(raw.occurrence ?? values.occurrence ?? 1),
            detection: Number(raw.detection ?? values.detection ?? 1)
          };

          onSubmit(nextValues);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="TAG *">
            <Input
              name="tag"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  tag: event.target.value.toUpperCase()
                }))
              }
              placeholder="MX-PMP-103"
              required
              value={values.tag}
            />
          </Field>
          <Field label="Nombre">
            <Input
              name="name"
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Bomba de proceso"
              value={values.name}
            />
          </Field>
          <Field label="Area">
            <Input
              name="area"
              onChange={(event) =>
                setValues((current) => ({ ...current, area: event.target.value }))
              }
              placeholder="Produccion"
              value={values.area}
            />
          </Field>
          <Field label="Criticidad">
            <Select
              name="criticality"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  criticality: event.target.value as AssetFormValues["criticality"]
                }))
              }
              value={values.criticality}
            >
              <option value="A">A - Alta</option>
              <option value="B">B - Media</option>
              <option value="C">C - Baja</option>
            </Select>
          </Field>
          <Field label="Fabricante">
            <Input
              name="manufacturer"
              onChange={(event) =>
                setValues((current) => ({ ...current, manufacturer: event.target.value }))
              }
              value={values.manufacturer}
            />
          </Field>
          <Field label="Modelo">
            <Input
              name="model"
              onChange={(event) =>
                setValues((current) => ({ ...current, model: event.target.value }))
              }
              value={values.model}
            />
          </Field>
          <Field label="Serie">
            <Input
              name="serialNumber"
              onChange={(event) =>
                setValues((current) => ({ ...current, serialNumber: event.target.value }))
              }
              value={values.serialNumber}
            />
          </Field>
          <Field label="Fecha instalacion">
            <Input
              name="installationDate"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  installationDate: event.target.value
                }))
              }
              type="date"
              value={values.installationDate}
            />
          </Field>
        </div>

        <Field label="Especificaciones">
          <Textarea
            name="technicalSpecifications"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                technicalSpecifications: event.target.value
              }))
            }
            placeholder="Especificaciones tecnicas relevantes del activo"
            value={values.technicalSpecifications}
          />
        </Field>

        <div className="space-y-4 rounded-2xl border border-border bg-panelAlt/50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Condition Based Monitoring (CBM)</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                name="cbmEnabled"
                type="checkbox"
                checked={values.cbmEnabled}
                onChange={(e) => setValues((v) => ({ ...v, cbmEnabled: e.target.checked }))}
                className="rounded border-border text-accent focus:ring-accent"
              />
              Habilitar monitoreo basado en condición
            </label>
            <div className="md:col-span-1" />
            <Field label="Temperatura (°C)">
              <Input
                name="temperature"
                type="number" step="0.1"
                onChange={(e) => setValues((v) => ({ ...v, temperature: Number(e.target.value) }))}
                value={values.temperature ?? 0}
              />
            </Field>
            <Field label="Umbral de alerta (°C)">
              <Input
                name="alertThreshold"
                type="number" step="0.1"
                onChange={(e) => setValues((v) => ({ ...v, alertThreshold: Number(e.target.value) }))}
                value={values.alertThreshold ?? 50}
              />
            </Field>
            <Field label="Vibración (mm/s)">
              <Input
                name="vibration"
                type="number" step="0.01"
                onChange={(e) => setValues((v) => ({ ...v, vibration: Number(e.target.value) }))}
                value={values.vibration ?? 0}
              />
            </Field>
            <Field label="Presión (psi)">
              <Input
                name="pressure"
                type="number" step="0.1"
                onChange={(e) => setValues((v) => ({ ...v, pressure: Number(e.target.value) }))}
                value={values.pressure ?? 0}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-panelAlt/50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Análisis de Riesgo (NPR)</p>
          <p className="text-xs text-muted">Valores del 1 al 10 (NPR = Severidad × Ocurrencia × Detección)</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Severidad">
              <Input
                name="severity"
                type="number" min="1" max="10"
                onChange={(e) => setValues((v) => ({ ...v, severity: Number(e.target.value) }))}
                value={values.severity ?? 1}
              />
            </Field>
            <Field label="Ocurrencia">
              <Input
                name="occurrence"
                type="number" min="1" max="10"
                onChange={(e) => setValues((v) => ({ ...v, occurrence: Number(e.target.value) }))}
                value={values.occurrence ?? 1}
              />
            </Field>
            <Field label="Detección">
              <Input
                name="detection"
                type="number" min="1" max="10"
                onChange={(e) => setValues((v) => ({ ...v, detection: Number(e.target.value) }))}
                value={values.detection ?? 1}
              />
            </Field>
          </div>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={loading} type="submit">
            {loading ? "Guardando..." : asset ? "Guardar cambios" : "Crear activo"}
          </Button>
        </div>
      </form>
    </Modal>
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
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}
