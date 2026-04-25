"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getScopedCompanyId } from "@/lib/company";
import { ensureSeedData, fetchSpareParts } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
import { canEditModule } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

const UNIT_GROUPS = {
  mass: ["kg", "g", "lb"],
  volume: ["L", "ml", "gal"],
  length: ["m", "cm", "ft", "in"],
  count: ["piezas", "units"]
} as const;

type SparePart = {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  location: string;
};

type SparePartsPageClientProps = {
  initialSpareParts: SparePart[];
};

function mapSparePart(row: { id: string; name: string | null; stock: number | null; min_stock: number | null; unit: string | null; location: string | null }): SparePart {
  return {
    id: row.id,
    name: row.name ?? "",
    stock: row.stock ?? 0,
    minStock: row.min_stock ?? 0,
    unit: row.unit ?? "piezas",
    location: row.location ?? ""
  };
}

export function SparePartsPageClient({ initialSpareParts }: SparePartsPageClientProps) {
  const { locale } = useI18n();
  const { user } = useSession();
  const activeCompanyId = user?.activeCompanyId ?? null;
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  const [spareParts, setSpareParts] = useState<SparePart[]>(initialSpareParts);
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const getStoredUnit = () => (typeof window !== "undefined" ? localStorage.getItem("cmms_default_unit") : null);
  const defaultUnit = getStoredUnit();
  const [unit, setUnit] = useState(defaultUnit || "piezas");
  const [unitCategory, setUnitCategory] = useState<keyof typeof UNIT_GROUPS>("count");
  const [location, setLocation] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const canMutate = canEditModule(user?.role, "spare_parts");
  const readOnly = !canMutate;

  const units = useMemo(() => {
    return UNIT_GROUPS[unitCategory] ?? UNIT_GROUPS.count;
  }, [unitCategory]);

  const copy =
    locale === "en"
      ? {
          registry: "Spare Parts Registry",
          title: "Spare Parts",
          subtitle: "Inventory management for maintenance operations.",
          create: "Create spare part",
          save: "Save",
          cancel: "Cancel",
          name: "Name",
          stock: "Stock",
          minStock: "Min stock",
          unitCategory: "Unit Category",
          unit: "Unit",
          location: "Location",
          actions: "Actions",
          edit: "Edit",
          remove: "Delete",
          empty: "No spare parts"
        }
      : {
          registry: "Registro de Refacciones",
          title: "Refacciones",
          subtitle: "Control de inventario para mantenimiento.",
          create: "Crear refacción",
          save: "Guardar",
          cancel: "Cancelar",
          name: "Nombre",
          stock: "Stock",
          minStock: "Stock mínimo",
          unitCategory: "Categoría",
          unit: "Unidad",
          location: "Ubicación",
          actions: "Acciones",
          edit: "Editar",
          remove: "Eliminar",
          empty: "No hay refacciones registradas."
        };

  useEffect(() => {
    const load = async () => {
      if (!activeCompanyId) {
        setSpareParts([]);
        return;
      }

      await ensureSeedData(activeCompanyId);
      const rows = await fetchSpareParts(activeCompanyId);
      setSpareParts(rows.map(mapSparePart));
    };

    void load();
  }, [activeCompanyId]);

  useEffect(() => {
    const storedCategory = (localStorage.getItem("cmms_unit_category") || "count") as keyof typeof UNIT_GROUPS;
    setUnitCategory(storedCategory in UNIT_GROUPS ? storedCategory : "count");

    const updatedUnit = localStorage.getItem("cmms_default_unit") || "piezas";
    setUnit(updatedUnit);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "cmms_unit_category") {
        const nextCat = ((event.newValue || "count") as keyof typeof UNIT_GROUPS);
        const safeCat = nextCat in UNIT_GROUPS ? nextCat : "count";
        setUnitCategory(safeCat);
        return;
      }

      if (event.key === "cmms_default_unit") setUnit(event.newValue || "piezas");
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const resetForm = () => {
    setName("");
    setStock("");
    setMinStock("");
    setUnitCategory(((localStorage.getItem("cmms_unit_category") || "count") as keyof typeof UNIT_GROUPS) in UNIT_GROUPS ? ((localStorage.getItem("cmms_unit_category") || "count") as keyof typeof UNIT_GROUPS) : "count");
    setUnit(localStorage.getItem("cmms_default_unit") || "piezas");
    setLocation("");
    setEditingId(null);
    setFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (!canMutate || !activeCompanyId) return;
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    const parsedStock = Number(stock);
    const parsedMinStock = Number(minStock);

    if (!trimmedName || !trimmedLocation) return;
    if (!Number.isFinite(parsedStock) || !Number.isFinite(parsedMinStock)) return;
    if (parsedStock < 0 || parsedMinStock < 0) return;

    if (editingId) {
      await supabase
        .from("spare_parts")
        .update({ name: trimmedName, stock: parsedStock, min_stock: parsedMinStock, unit, location: trimmedLocation })
        .eq("id", editingId)
        .eq("company_id", activeCompanyId);

      setSpareParts((current) =>
        current.map((part) =>
          part.id === editingId
            ? {
                ...part,
                name: trimmedName,
                stock: parsedStock,
                minStock: parsedMinStock,
                unit,
                location: trimmedLocation
              }
            : part
        )
      );
      resetForm();
      return;
    }

    await supabase
      .from("spare_parts")
      .insert([{ name: trimmedName, stock: parsedStock, min_stock: parsedMinStock, unit, location: trimmedLocation, company_id: companyIdForWrite }]);

    const rows = await fetchSpareParts(activeCompanyId);
    setSpareParts(rows.map(mapSparePart));
    resetForm();
  };

  const handleEdit = (part: SparePart) => {
    if (!canMutate) return;
    setEditingId(part.id);
    setName(part.name);
    setStock(part.stock.toString());
    setMinStock(part.minStock.toString());
    setUnit(part.unit);
    setLocation(part.location);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (partId: string) => {
    if (!canMutate) return;
    await supabase.from("spare_parts").delete().eq("id", partId).eq("company_id", activeCompanyId);
    setSpareParts((current) => current.filter((part) => part.id !== partId));

    if (editingId === partId) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8 border-[#d6d0b8]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">{copy.registry}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="text-sm text-muted">{copy.subtitle}</p>
          </div>

          {canMutate ? <Button onClick={() => { resetForm(); setFormOpen(true); }}>{copy.create}</Button> : null}
        </div>
      </Panel>

      {formOpen && (
        <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
          <form className="grid gap-4 md:grid-cols-7 md:items-end" onSubmit={handleSubmit}>
            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.name}</span>
              <input
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={copy.name}
                disabled={readOnly}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.stock}</span>
              <input
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                placeholder="0"
                type="number"
                min={0}
                disabled={readOnly}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.minStock}</span>
              <input
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={minStock}
                onChange={(event) => setMinStock(event.target.value)}
                placeholder="0"
                type="number"
                min={0}
                disabled={readOnly}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.unitCategory}</span>
              <select
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={unitCategory}
                onChange={(event) => {
                  const cat = event.target.value as keyof typeof UNIT_GROUPS;
                  setUnitCategory(cat);
                  setUnit(UNIT_GROUPS[cat][0]);
                }}
                disabled={readOnly}
              >
                <option value="mass">Masa</option>
                <option value="volume">Volumen</option>
                <option value="length">Longitud</option>
                <option value="count">Cantidad</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.unit}</span>
              <select
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                disabled={readOnly}
              >
                {units.map((u) => (
                  <option key={u} value={u} className={unit === u ? "font-semibold text-accent" : ""}>
                    {u}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.location}</span>
              <input
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={copy.location}
                disabled={readOnly}
              />
            </label>

            <div className="flex gap-3 items-center flex-wrap">
              <Button type="submit" className="whitespace-nowrap" disabled={readOnly}>
                {editingId ? copy.save : copy.create}
              </Button>
              <Button type="button" variant="secondary" className="whitespace-nowrap" onClick={() => setFormOpen(false)}>
                {copy.cancel}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel className="border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left align-middle">{copy.name}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.stock}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.minStock}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.unit}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.location}</th>
                <th className="px-4 py-2 text-right align-middle">{copy.actions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {spareParts.map((part) => {
                const lowStock = part.stock <= part.minStock && part.minStock > 0;
                return (
                  <tr key={part.id}>
                    <td className="px-4 py-2 text-left align-middle">{part.name}</td>
                    <td className={`px-4 py-2 text-left align-middle ${lowStock ? "text-danger font-semibold" : ""}`}>
                      {part.stock} {part.unit}
                    </td>
                    <td className="px-4 py-2 text-left align-middle">
                      {part.minStock} {part.unit}
                    </td>
                    <td className="px-4 py-2 text-left align-middle">{part.unit}</td>
                    <td className="px-4 py-2 text-left align-middle">{part.location}</td>
                    <td className="px-4 py-2 text-right align-middle">
                      {readOnly ? (
                        <span className="text-xs text-muted">Read only</span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => handleEdit(part)}>{copy.edit}</Button>
                          <Button variant="danger" onClick={() => handleDelete(part.id)}>
                            {copy.remove}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {spareParts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
