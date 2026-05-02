"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const UNIT_GROUPS = {
  mass: ["kg", "g", "lb"],
  volume: ["L", "ml", "gal"],
  length: ["m", "cm", "ft", "in"],
  count: ["piezas", "units"]
} as const;

type SparePartFormValues = {
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  location: string;
};

type SparePartFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: SparePartFormValues) => Promise<void>;
  initial?: SparePartFormValues | null;
  loading?: boolean;
  locale: "es" | "en";
};

export function SparePartFormModal({ open, onClose, onSubmit, initial, loading, locale }: SparePartFormModalProps) {
  const isEditing = Boolean(initial);

  const detectCategory = (u: string): keyof typeof UNIT_GROUPS => {
    for (const [cat, units] of Object.entries(UNIT_GROUPS)) {
      if ((units as readonly string[]).includes(u)) return cat as keyof typeof UNIT_GROUPS;
    }
    return "count";
  };

  const getStoredUnit = () => (typeof window !== "undefined" ? localStorage.getItem("cmms_default_unit") : null);
  const defaultUnit = initial?.unit || getStoredUnit() || "piezas";

  const [name, setName] = useState(initial?.name ?? "");
  const [stock, setStock] = useState(initial?.stock?.toString() ?? "");
  const [minStock, setMinStock] = useState(initial?.minStock?.toString() ?? "");
  const [unitCategory, setUnitCategory] = useState<keyof typeof UNIT_GROUPS>(detectCategory(defaultUnit));
  const [unit, setUnit] = useState(defaultUnit);
  const [location, setLocation] = useState(initial?.location ?? "");

  const units = useMemo(() => UNIT_GROUPS[unitCategory] ?? UNIT_GROUPS.count, [unitCategory]);

  const resetAndClose = () => {
    setName(initial?.name ?? "");
    setStock(initial?.stock?.toString() ?? "");
    setMinStock(initial?.minStock?.toString() ?? "");
    setUnit(defaultUnit);
    setUnitCategory(detectCategory(defaultUnit));
    setLocation(initial?.location ?? "");
    onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedStock = Number(stock);
    const parsedMinStock = Number(minStock);
    if (!name.trim() || !location.trim()) return;
    if (!Number.isFinite(parsedStock) || !Number.isFinite(parsedMinStock)) return;
    if (parsedStock < 0 || parsedMinStock < 0) return;

    await onSubmit({ name: name.trim(), stock: parsedStock, minStock: parsedMinStock, unit, location: location.trim() });
  };

  const copy = locale === "en"
    ? { title: isEditing ? "Edit Spare Part" : "New Spare Part", name: "Name", stock: "Stock", minStock: "Min stock", unitCategory: "Unit Category", unit: "Unit", location: "Location", save: "Save", create: "Create", cancel: "Cancel" }
    : { title: isEditing ? "Editar Refacción" : "Nueva Refacción", name: "Nombre", stock: "Stock", minStock: "Stock mínimo", unitCategory: "Categoría", unit: "Unidad", location: "Ubicación", save: "Guardar", create: "Crear", cancel: "Cancelar" };

  return (
    <Modal open={open} title={copy.title} onClose={resetAndClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm">
          <span className="text-muted">{copy.name}</span>
          <input
            className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={copy.name}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.stock}</span>
            <input
              type="number"
              min={0}
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.minStock}</span>
            <input
              type="number"
              min={0}
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.unitCategory}</span>
            <select
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={unitCategory}
              onChange={(e) => {
                const cat = e.target.value as keyof typeof UNIT_GROUPS;
                setUnitCategory(cat);
                setUnit(UNIT_GROUPS[cat][0]);
              }}
            >
              <option value="mass">Masa</option>
              <option value="volume">Volumen</option>
              <option value="length">Longitud</option>
              <option value="count">Cantidad</option>
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.unit}</span>
            <select
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="text-muted">{copy.location}</span>
          <input
            className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={copy.location}
            required
          />
        </label>

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
