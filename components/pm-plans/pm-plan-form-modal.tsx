"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type AssetOption = {
  id: string;
  tag: string;
  name: string;
};

type PMPlanFormValues = {
  assetId: string;
  name: string;
  frequency: number;
  nextRunDate: string;
};

type PMPlanFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PMPlanFormValues) => Promise<void>;
  assets: AssetOption[];
  initial?: PMPlanFormValues | null;
  loading?: boolean;
  locale: "es" | "en";
  dateError?: string;
};

export function PMPlanFormModal({ open, onClose, onSubmit, assets, initial, loading, locale, dateError }: PMPlanFormModalProps) {
  const isEditing = Boolean(initial);

  const getDefaultFreq = () => (typeof window !== "undefined" ? localStorage.getItem("cmms_default_pm_freq") || "" : "");

  const [assetId, setAssetId] = useState(initial?.assetId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [frequency, setFrequency] = useState(initial?.frequency?.toString() ?? getDefaultFreq());
  const [nextRunDate, setNextRunDate] = useState(initial?.nextRunDate ?? "");

  const resetAndClose = () => {
    setAssetId(initial?.assetId ?? "");
    setName(initial?.name ?? "");
    setFrequency(initial?.frequency?.toString() ?? getDefaultFreq());
    setNextRunDate(initial?.nextRunDate ?? "");
    onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedFreq = Number(frequency);
    if (!assetId || !name.trim() || !nextRunDate) return;
    if (!Number.isFinite(parsedFreq) || parsedFreq <= 0) return;

    await onSubmit({ assetId, name: name.trim(), frequency: parsedFreq, nextRunDate });
  };

  const copy = locale === "en"
    ? { title: isEditing ? "Edit Plan" : "New Plan", asset: "Asset", selectAsset: "Select asset", planName: "Plan name", frequency: "Frequency (days)", nextRun: "Next execution", save: "Save", create: "Create", cancel: "Cancel" }
    : { title: isEditing ? "Editar Plan" : "Nuevo Plan", asset: "Activo", selectAsset: "Seleccionar activo", planName: "Nombre del plan", frequency: "Frecuencia (días)", nextRun: "Próxima ejecución", save: "Guardar", create: "Crear", cancel: "Cancelar" };

  return (
    <Modal open={open} title={copy.title} onClose={resetAndClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm">
          <span className="text-muted">{copy.asset}</span>
          <select
            className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
          >
            <option value="">{copy.selectAsset}</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.tag} - {asset.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-muted">{copy.planName}</span>
          <input
            className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Revisión trimestral"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.frequency}</span>
            <input
              type="number"
              min={1}
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.nextRun}</span>
            <input
              type="date"
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={nextRunDate}
              onChange={(e) => setNextRunDate(e.target.value)}
            />
          </label>
        </div>

        {dateError && <p className="text-sm text-danger">{dateError}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={resetAndClose}>
            {copy.cancel}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "..." : isEditing ? copy.save : copy.create}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
