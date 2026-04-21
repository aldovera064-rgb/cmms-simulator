"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ensureSeedData, fetchSpareParts } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
import { supabase } from "@/lib/supabase";

type SparePart = {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  location: string;
};

type SparePartsPageClientProps = {
  initialSpareParts: SparePart[];
};

function mapSparePart(row: { id: string; name: string | null; stock: number | null; location: string | null }): SparePart {
  return {
    id: row.id,
    name: row.name ?? "",
    stock: row.stock ?? 0,
    minStock: 2,
    location: row.location ?? ""
  };
}

export function SparePartsPageClient({ initialSpareParts }: SparePartsPageClientProps) {
  const { locale } = useI18n();
  const [spareParts, setSpareParts] = useState<SparePart[]>(initialSpareParts);
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const copy =
    locale === "en"
      ? {
          registry: "Spare Parts Registry",
          title: "Spare Parts",
          subtitle: "CMMS system for industrial maintenance management.",
          create: "Create spare part",
          save: "Save",
          cancel: "Cancel",
          name: "Name",
          stock: "Stock",
          minStock: "Min stock",
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
          location: "Ubicación",
          actions: "Acciones",
          edit: "Editar",
          remove: "Eliminar",
          empty: "No hay refacciones registradas."
        };

  useEffect(() => {
    const load = async () => {
      await ensureSeedData();
      const rows = await fetchSpareParts();
      setSpareParts(rows.map(mapSparePart));
    };

    void load();
  }, []);

  const resetForm = () => {
    setName("");
    setStock("");
    setMinStock("");
    setLocation("");
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
        .update({ name: trimmedName, stock: parsedStock, location: trimmedLocation })
        .eq("id", editingId);

      setSpareParts((current) =>
        current.map((part) =>
          part.id === editingId
            ? {
                ...part,
                name: trimmedName,
                stock: parsedStock,
                minStock: parsedMinStock,
                location: trimmedLocation
              }
            : part
        )
      );
      resetForm();
      return;
    }

    await supabase.from("spare_parts").insert([{ name: trimmedName, stock: parsedStock, location: trimmedLocation }]);

    const rows = await fetchSpareParts();
    setSpareParts(rows.map(mapSparePart));
    resetForm();
  };

  const handleEdit = (part: SparePart) => {
    setEditingId(part.id);
    setName(part.name);
    setStock(part.stock.toString());
    setMinStock(part.minStock.toString());
    setLocation(part.location);
  };

  const handleDelete = async (partId: string) => {
    await supabase.from("spare_parts").delete().eq("id", partId);
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

          <Button onClick={resetForm}>{copy.create}</Button>
        </div>
      </Panel>

      <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
        <form className="grid gap-4 md:grid-cols-5 md:items-end" onSubmit={handleSubmit}>
          <label className="space-y-2 text-sm">
            <span className="text-muted">{copy.name}</span>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={copy.name}
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
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted">{copy.location}</span>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={copy.location}
            />
          </label>

          <div className="flex gap-2">
            <Button type="submit">{editingId ? copy.save : copy.create}</Button>
            {editingId ? (
              <Button type="button" variant="secondary" onClick={resetForm}>
                {copy.cancel}
              </Button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel className="border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left align-middle">{copy.name}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.stock}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.minStock}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.location}</th>
                <th className="px-4 py-2 text-right align-middle">{copy.actions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {spareParts.map((part) => (
                <tr key={part.id}>
                  <td className="px-4 py-2 text-left align-middle">{part.name}</td>
                  <td className="px-4 py-2 text-left align-middle">{part.stock}</td>
                  <td className="px-4 py-2 text-left align-middle">{part.minStock}</td>
                  <td className="px-4 py-2 text-left align-middle">{part.location}</td>
                  <td className="px-4 py-2 text-right align-middle">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => handleEdit(part)}>{copy.edit}</Button>
                      <Button variant="danger" onClick={() => handleDelete(part.id)}>
                        {copy.remove}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {spareParts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted">
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
