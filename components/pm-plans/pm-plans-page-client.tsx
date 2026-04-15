"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

type PMPlan = {
  id: string;
  assetId: string;
  name: string;
  frequency: number;
  lastRun: string | null;
  nextRun: string;
};

type PMPlansPageClientProps = {
  initialPlans: PMPlan[];
};

type AssetOption = {
  id: string;
  tag: string;
  name: string;
};

type WorkOrder = {
  id: string;
  number: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  type: "PREVENTIVE";
  priority: "MEDIUM";
  status: "OPEN";
  description: string;
  technicianName: string;
  createdAt: string;
  dueDate: string;
  closedAt: null;
};

type StoredWorkOrder = {
  id: string;
  [key: string]: unknown;
};

const PM_STORAGE_KEY = "demo-pm-plans";
const ASSETS_STORAGE_KEY = "demo-assets";
const WORK_ORDERS_STORAGE_KEY = "demo-workorders";

export function PMPlansPageClient({ initialPlans }: PMPlansPageClientProps) {
  const [plans, setPlans] = useState<PMPlan[]>(initialPlans);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetId, setAssetId] = useState("");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("");
  const [nextRunDate, setNextRunDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadedAssets = loadAssets();
    setAssets(loadedAssets);

    const storedPlans = loadPlans();
    const existingWorkOrders = loadWorkOrders();

    const today = startOfDay(new Date());
    const todayIso = toDateOnlyISO(today);
    const nowIso = new Date().toISOString();

    const nextWorkOrders: StoredWorkOrder[] = [...existingWorkOrders];
    const nextPlans = storedPlans.map((plan, index) => {
      const planNextRun = parseDateOnly(plan.nextRun);

      if (!planNextRun || planNextRun > today) {
        return plan;
      }

      const asset = loadedAssets.find((item) => item.id === plan.assetId);
      const dueDate = addDays(today, 1).toISOString();

      nextWorkOrders.unshift({
        id: `${Date.now()}-${index}`,
        number: `OT-${Date.now()}-${index}`,
        assetId: plan.assetId,
        assetTag: asset?.tag ?? "",
        assetName: asset?.name ?? "",
        type: "PREVENTIVE",
        priority: "MEDIUM",
        status: "OPEN",
        description: `PM: ${plan.name}`,
        technicianName: "",
        createdAt: nowIso,
        dueDate,
        closedAt: null
      });

      return {
        ...plan,
        lastRun: todayIso,
        nextRun: toDateOnlyISO(addDays(today, plan.frequency))
      };
    });

    localStorage.setItem(WORK_ORDERS_STORAGE_KEY, JSON.stringify(nextWorkOrders));
    localStorage.setItem(PM_STORAGE_KEY, JSON.stringify(nextPlans));

    setPlans(sortPlans(nextPlans));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(PM_STORAGE_KEY, JSON.stringify(plans));
  }, [loaded, plans]);

  const assetsById = useMemo(() => {
    return new Map(assets.map((asset) => [asset.id, asset]));
  }, [assets]);

  const resetForm = () => {
    setAssetId("");
    setName("");
    setFrequency("");
    setNextRunDate("");
    setEditingId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const parsedFrequency = Number(frequency);
    const parsedNextRun = parseDateOnly(nextRunDate);

    if (!assetId || !trimmedName || !parsedNextRun) return;
    if (!Number.isFinite(parsedFrequency) || parsedFrequency <= 0) return;

    const normalizedNextRun = toDateOnlyISO(parsedNextRun);

    if (editingId) {
      setPlans((current) =>
        sortPlans(
          current.map((plan) =>
            plan.id === editingId
              ? {
                  ...plan,
                  assetId,
                  name: trimmedName,
                  frequency: parsedFrequency,
                  nextRun: normalizedNextRun
                }
              : plan
          )
        )
      );
      resetForm();
      return;
    }

    const newPlan: PMPlan = {
      id: `${Date.now()}`,
      assetId,
      name: trimmedName,
      frequency: parsedFrequency,
      lastRun: null,
      nextRun: normalizedNextRun
    };

    setPlans((current) => sortPlans([...current, newPlan]));
    resetForm();
  };

  const handleEdit = (plan: PMPlan) => {
    setEditingId(plan.id);
    setAssetId(plan.assetId);
    setName(plan.name);
    setFrequency(String(plan.frequency));
    setNextRunDate(toDateInputValue(plan.nextRun));
  };

  const handleDelete = (planId: string) => {
    setPlans((current) => current.filter((plan) => plan.id !== planId));
    if (editingId === planId) {
      resetForm();
    }
  };

  const today = startOfDay(new Date());

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">Preventive Maintenance</p>
            <h1 className="text-3xl font-semibold tracking-tight">PM Plans</h1>
            <p className="text-sm text-muted">Modo demo persistente (localStorage).</p>
          </div>

          <Button onClick={resetForm}>Crear plan PM</Button>
        </div>
      </Panel>

      <Panel className="p-6">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_140px_170px_auto] md:items-end" onSubmit={handleSubmit}>
          <label className="space-y-2 text-sm">
            <span className="text-muted">Activo</span>
            <select
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
            >
              <option value="">Seleccionar activo</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.tag} - {asset.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted">Nombre del plan</span>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Cambio de filtros"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted">Frecuencia (días)</span>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              type="number"
              min={1}
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
              placeholder="30"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted">Próxima ejecución</span>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              type="date"
              value={nextRunDate}
              onChange={(event) => setNextRunDate(event.target.value)}
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
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Activo</th>
                <th className="px-5 py-4">Frecuencia</th>
                <th className="px-5 py-4">Última ejecución</th>
                <th className="px-5 py-4">Próxima ejecución</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {plans.map((plan) => {
                const asset = assetsById.get(plan.assetId);
                const nextRun = parseDateOnly(plan.nextRun);
                const overdue = Boolean(nextRun && nextRun < today);

                return (
                  <tr key={plan.id}>
                    <td className="px-5 py-4">{plan.name}</td>
                    <td className="px-5 py-4">{asset ? `${asset.tag} - ${asset.name}` : "Activo no encontrado"}</td>
                    <td className="px-5 py-4">{plan.frequency} días</td>
                    <td className="px-5 py-4">{formatDate(plan.lastRun)}</td>
                    <td className={`px-5 py-4 ${overdue ? "text-danger" : ""}`}>{formatDate(plan.nextRun)}</td>
                    <td className="px-5 py-4">
                      {overdue ? <span className="rounded-full bg-danger/20 px-3 py-1 text-xs text-danger">Vencido</span> : "Al día"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => handleEdit(plan)}>Editar</Button>
                        <Button variant="danger" onClick={() => handleDelete(plan.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {plans.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted">
                    No hay planes PM registrados.
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

function loadPlans(): PMPlan[] {
  const raw = localStorage.getItem(PM_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isPMPlan).map((plan) => ({ ...plan }));
  } catch {
    return [];
  }
}

function loadAssets(): AssetOption[] {
  const raw = localStorage.getItem(ASSETS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is AssetOption => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Record<string, unknown>;
        return (
          typeof candidate.id === "string" &&
          typeof candidate.tag === "string" &&
          typeof candidate.name === "string"
        );
      })
      .map((item) => ({ id: item.id, tag: item.tag, name: item.name }));
  } catch {
    return [];
  }
}

function loadWorkOrders(): StoredWorkOrder[] {
  const raw = localStorage.getItem(WORK_ORDERS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredWorkOrder);
  } catch {
    return [];
  }
}

function isPMPlan(value: unknown): value is PMPlan {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.assetId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.frequency === "number" &&
    (typeof candidate.lastRun === "string" || candidate.lastRun === null) &&
    typeof candidate.nextRun === "string"
  );
}

function isStoredWorkOrder(value: unknown): value is StoredWorkOrder {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string";
}

function sortPlans(items: PMPlan[]) {
  return [...items].sort((a, b) => {
    const dateA = parseDateOnly(a.nextRun)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dateB = parseDateOnly(b.nextRun)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateOnly(value: string | null) {
  if (!value) return null;

  const base = new Date(value);
  if (Number.isNaN(base.getTime())) return null;

  return startOfDay(base);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateOnlyISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDateInputValue(value: string) {
  const parsed = parseDateOnly(value);
  if (!parsed) return "";
  return toDateOnlyISO(parsed);
}

function formatDate(value: string | null) {
  const parsed = parseDateOnly(value);
  if (!parsed) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(parsed);
}
