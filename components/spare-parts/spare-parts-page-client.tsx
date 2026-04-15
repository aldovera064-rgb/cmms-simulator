"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

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

const STORAGE_KEY = "demo-spare-parts";

export function SparePartsPageClient({ initialSpareParts }: SparePartsPageClientProps) {
  const [spareParts, setSpareParts] = useState<SparePart[]>(initialSpareParts);
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      setSpareParts([]);
      setLoaded(true);
      return;
    }

    try {
      const parsed: unknown = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        setSpareParts([]);
        setLoaded(true);
        return;
      }

      const safeData = parsed
        .filter((item): item is SparePart => {
          if (!item || typeof item !== "object") return false;

          const candidate = item as Record<string, unknown>;
          return (
            typeof candidate.id === "string" &&
            typeof candidate.name === "string" &&
            typeof candidate.stock === "number" &&
            typeof candidate.minStock === "number" &&
            typeof candidate.location === "string"
          );
        })
        .map((item) => ({
          id: item.id,
          name: item.name,
          stock: item.stock,
          minStock: item.minStock,
          location: item.location
        }));

      setSpareParts(safeData);
    } catch {
      setSpareParts([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spareParts));
  }, [loaded, spareParts]);

  const resetForm = () => {
    setName("");
    setStock("");
    setMinStock("");
    setLocation("");
    setEditingId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    const parsedStock = Number(stock);
    const parsedMinStock = Number(minStock);

    if (!trimmedName || !trimmedLocation) return;
    if (!Number.isFinite(parsedStock) || !Number.isFinite(parsedMinStock)) return;
    if (parsedStock < 0 || parsedMinStock < 0) return;

    if (editingId) {
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

    const newPart: SparePart = {
      id: Date.now().toString(),
      name: trimmedName,
      stock: parsedStock,
      minStock: parsedMinStock,
      location: trimmedLocation
    };

    setSpareParts((current) => [...current, newPart]);
    resetForm();
  };

  const handleEdit = (part: SparePart) => {
    setEditingId(part.id);
    setName(part.name);
    setStock(part.stock.toString());
    setMinStock(part.minStock.toString());
    setLocation(part.location);
  };

  const handleDelete = (partId: string) => {
    setSpareParts((current) => current.filter((part) => part.id !== partId));

    if (editingId === partId) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">Spare Parts Registry</p>
            <h1 className="text-3xl font-semibold tracking-tight">Refacciones</h1>
            <p className="text-sm text-muted">Modo demo persistente (localStorage).</p>
          </div>

          <Button onClick={resetForm}>Crear refacción</Button>
        </div>
      </Panel>

      <Panel className="p-6">
        <form className="grid gap-4 md:grid-cols-5 md:items-end" onSubmit={handleSubmit}>
          <label className="space-y-2 text-sm">
            <span className="text-muted">Nombre</span>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre de la refacción"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted">Stock</span>
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
            <span className="text-muted">Stock mínimo</span>
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
            <span className="text-muted">Ubicación</span>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Almacén A / Estante 3"
            />
          </label>

          <div className="flex gap-2">
            <Button type="submit">{editingId ? "Guardar" : "Crear"}</Button>
            {editingId ? (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-panelAlt/70 text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">Stock mínimo</th>
                <th className="px-5 py-4">Ubicación</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {spareParts.map((part) => (
                <tr key={part.id}>
                  <td className="px-5 py-4">{part.name}</td>
                  <td className="px-5 py-4">{part.stock}</td>
                  <td className="px-5 py-4">{part.minStock}</td>
                  <td className="px-5 py-4">{part.location}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => handleEdit(part)}>Editar</Button>
                      <Button variant="danger" onClick={() => handleDelete(part.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {spareParts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted">
                    No hay refacciones registradas.
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
