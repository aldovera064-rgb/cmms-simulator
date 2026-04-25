"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { applyCompanyFilter, getScopedCompanyId } from "@/lib/company";
import { ensureSeedData, fetchAssets, fetchPmPlanHistory, type PmPlanHistoryRow } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
import { canEditModule, isReadOnlyRole } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type PMPlan = {
  id: string;
  assetId: string;
  name: string;
  frequency: number;
  lastRun: string | null;
  nextRun: string;
};

type PMPlanRow = {
  id: string;
  asset_id: string | null;
  name: string | null;
  frequency: number | null;
  last_run: string | null;
  next_run: string | null;
  created_at: string | null;
  is_active?: boolean | null;
};

type PMPlansPageClientProps = {
  initialPlans: PMPlan[];
};

type AssetOption = {
  id: string;
  tag: string;
  name: string;
};

const PM_SEED: Array<Omit<PMPlanRow, "id" | "created_at">> = [
  {
    asset_id: "",
    name: "Inspección general de seguridad",
    frequency: 30,
    last_run: null,
    next_run: toDateOnlyISO(addDays(startOfDay(new Date()), 7))
  },
  {
    asset_id: "",
    name: "Lubricación de elementos críticos",
    frequency: 14,
    last_run: null,
    next_run: toDateOnlyISO(addDays(startOfDay(new Date()), 3))
  }
];

function mapPlan(row: PMPlanRow): PMPlan | null {
  if (!row.id || !row.asset_id || !row.name || !row.frequency || !row.next_run) {
    return null;
  }

  return {
    id: row.id,
    assetId: row.asset_id,
    name: row.name,
    frequency: row.frequency,
    lastRun: row.last_run,
    nextRun: row.next_run
  };
}

async function fetchPlans(activeCompanyId?: string | null) {
  let query = supabase.from("pm_plans").select("*");
  query = applyCompanyFilter(query, activeCompanyId);
  query = query.eq("is_active", true);
  const { data } = await query.order("next_run", { ascending: true });
  const rows = (data ?? []) as PMPlanRow[];
  return rows.map(mapPlan).filter((plan): plan is PMPlan => Boolean(plan));
}

async function ensurePMSeed(assets: AssetOption[], activeCompanyId?: string | null) {
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  let query = supabase.from("pm_plans").select("id", { count: "exact", head: true });
  query = applyCompanyFilter(query, activeCompanyId);
  const { count, error } = await query;
  if (error || (count ?? 0) > 0 || assets.length === 0) return;

  const insertSeed = PM_SEED.map((item, index) => ({
    ...item,
    asset_id: assets[index % assets.length]?.id ?? assets[0].id,
    company_id: companyIdForWrite
  }));
  await supabase.from("pm_plans").insert(insertSeed);
}

async function autoGenerateWorkOrders(plans: PMPlan[], assets: AssetOption[], activeCompanyId?: string | null) {
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  const today = startOfDay(new Date());
  const todayIso = toDateOnlyISO(today);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  const duePlans = plans.filter((plan) => {
    const nextRun = parseDateOnly(plan.nextRun);
    return Boolean(nextRun && nextRun <= today);
  });

  if (duePlans.length === 0) return;

  const generatedOrders = duePlans.map((plan) => {
    const asset = assetsById.get(plan.assetId);
    return {
      title: `PM: ${plan.name}${asset ? ` - ${asset.name}` : ""}`,
      priority: "P2",
      status: "OPEN",
      type: "PREVENTIVE",
      technician: "",
      company_id: companyIdForWrite
    };
  });

  await supabase.from("work_orders").insert(generatedOrders);

  await Promise.all(
    duePlans.map((plan) => {
      const nextRunDate = parseDateOnly(plan.nextRun) ?? today;
      return supabase
        .from("pm_plans")
        .update({
          last_run: toDateOnlyISO(nextRunDate),
          next_run: toDateOnlyISO(addDays(nextRunDate, plan.frequency))
        })
        .eq("id", plan.id);
    })
  );
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function PMPlansPageClient({ initialPlans }: PMPlansPageClientProps) {
  const { locale } = useI18n();
  const { user } = useSession();
  const activeCompanyId = user?.activeCompanyId ?? null;
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  const [plans, setPlans] = useState<PMPlan[]>(initialPlans);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [history, setHistory] = useState<PmPlanHistoryRow[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("");
  const [nextRunDate, setNextRunDate] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateError, setDateError] = useState("");
  const canMutate = canEditModule(user?.role, "pm_plans");
  const readOnly = isReadOnlyRole(user?.role);

  const copy =
    locale === "en"
      ? {
          sectionLabel: "Preventive Maintenance",
          title: "Maintenance Plans",
          subtitle: "Preventive scheduling for operational continuity.",
          createPlan: "Create plan",
          asset: "Asset",
          selectAsset: "Select asset",
          planName: "Plan name",
          frequency: "Frequency (days)",
          nextRun: "Next execution",
          save: "Save",
          create: "Create",
          cancel: "Cancel",
          tablePlan: "Plan",
          tableAsset: "Asset",
          tableFrequency: "Frequency",
          tableLastRun: "Last execution",
          tableNextRun: "Next execution",
          tableStatus: "Status",
          tableActions: "Actions",
          overdue: "Overdue",
          upToDate: "On schedule",
          assetNotFound: "Asset not found",
          empty: "No maintenance plans registered.",
          edit: "Edit",
          remove: "Delete",
          historyTitle: "Maintenance Plan History",
          historyToggle: "View history",
          historyHide: "Hide history",
          historyAction: "Action",
          historyOriginalStatus: "Original status",
          historyDate: "Date",
          historyEmpty: "No history records",
          historyDisclaimer: "History records are automatically deleted after 365 days.",
          actionCreated: "Created",
          actionCompleted: "Completed",
          actionDeleted: "Deleted",
          dateError: "Next execution must be after last execution",
          complete: "Complete PM"
        }
      : {
          sectionLabel: "Mantenimiento preventivo",
          title: "Planes de mantenimiento",
          subtitle: "Programación preventiva para continuidad operativa.",
          createPlan: "Crear plan",
          asset: "Activo",
          selectAsset: "Seleccionar activo",
          planName: "Nombre del plan",
          frequency: "Frecuencia (días)",
          nextRun: "Próxima ejecución",
          save: "Guardar",
          create: "Crear",
          cancel: "Cancelar",
          tablePlan: "Plan",
          tableAsset: "Activo",
          tableFrequency: "Frecuencia",
          tableLastRun: "Última ejecución",
          tableNextRun: "Próxima ejecución",
          tableStatus: "Estado",
          tableActions: "Acciones",
          overdue: "Vencido",
          upToDate: "Al día",
          assetNotFound: "Activo no encontrado",
          empty: "No hay planes de mantenimiento registrados.",
          edit: "Editar",
          remove: "Eliminar",
          historyTitle: "Historial de planes de mantenimiento",
          historyToggle: "Ver historial",
          historyHide: "Ocultar historial",
          historyAction: "Acción",
          historyOriginalStatus: "Estado original",
          historyDate: "Fecha",
          historyEmpty: "No hay registros de historial",
          historyDisclaimer: "Los registros del historial se eliminan automáticamente después de 365 días.",
          actionCreated: "Creado",
          actionCompleted: "Completado",
          actionDeleted: "Eliminado",
          dateError: "La próxima ejecución debe ser posterior a la última ejecución",
          complete: "Completar PM"
        };

  useEffect(() => {
    const load = async () => {
      if (!activeCompanyId) {
        setAssets([]);
        setPlans([]);
        setHistory([]);
        return;
      }

      await ensureSeedData(activeCompanyId);
      const assetRows = await fetchAssets(activeCompanyId);
      const nextAssets = assetRows.map((asset) => ({
        id: asset.id,
        tag: `AS-${asset.id.slice(0, 4).toUpperCase()}`,
        name: asset.name ?? ""
      }));
      setAssets(nextAssets);

      await ensurePMSeed(nextAssets, activeCompanyId);
      let nextPlans = await fetchPlans(activeCompanyId);
      await autoGenerateWorkOrders(nextPlans, nextAssets, activeCompanyId);
      nextPlans = await fetchPlans(activeCompanyId);
      setPlans(sortPlans(nextPlans));

      const [historyRows, adminsData] = await Promise.all([
        fetchPmPlanHistory(activeCompanyId),
        supabase.from("admins").select("id, username")
      ]);
      setHistory(historyRows);

      if (adminsData.data) {
        const map: Record<string, string> = {};
        adminsData.data.forEach((admin: any) => {
          map[admin.id] = admin.username;
        });
        setUsersMap(map);
      }
    };

    void load();
  }, [activeCompanyId]);

  useEffect(() => {
    setFrequency(localStorage.getItem("cmms_default_pm_freq") || "");
  }, []);

  const assetsById = useMemo(() => {
    return new Map(assets.map((asset) => [asset.id, asset]));
  }, [assets]);

  const resetForm = () => {
    setAssetId("");
    setName("");
    setFrequency(localStorage.getItem("cmms_default_pm_freq") || "");
    setNextRunDate("");
    setEditingId(null);
    setDateError("");
    setFormOpen(false);
  };

  /** Save PM plan snapshot to history table */
  async function savePmPlanSnapshot(planId: string, actionType: "created" | "completed" | "deleted" | "updated", statusOriginal: string) {
    if (!activeCompanyId || !user?.id) {
      console.error("Missing user_id");
      return;
    }

    const { data } = await supabase.from("pm_plans").select("*").eq("id", planId).maybeSingle();
    if (!data) return;

    const { error } = await supabase.from("pm_plan_history").insert([
      {
        pm_plan_id: planId,
        snapshot: data,
        action_type: actionType,
        status_original: statusOriginal,
        company_id: activeCompanyId,
        user_id: user.id
      }
    ]);

    if (error) {
      console.error("History insert error:", error);
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (!canMutate || !activeCompanyId) return;
    event.preventDefault();
    setDateError("");

    const trimmedName = name.trim();
    const parsedFrequency = Number(frequency);
    const parsedNextRun = parseDateOnly(nextRunDate);

    if (!assetId || !trimmedName || !parsedNextRun) return;
    if (!Number.isFinite(parsedFrequency) || parsedFrequency <= 0) return;

    // Validation: next_execution must be > last_execution when editing
    if (editingId) {
      const currentPlan = plans.find((p) => p.id === editingId);
      if (currentPlan?.lastRun) {
        const lastRunDate = parseDateOnly(currentPlan.lastRun);
        if (lastRunDate && parsedNextRun <= lastRunDate) {
          setDateError(copy.dateError);
          return;
        }
      }
    }

    const payload = {
      asset_id: assetId,
      name: trimmedName,
      frequency: parsedFrequency,
      next_run: toDateOnlyISO(parsedNextRun)
    };

    if (editingId) {
      await supabase.from("pm_plans").update(payload).eq("id", editingId).eq("company_id", activeCompanyId);
    } else {
      const { data, error } = await supabase.from("pm_plans").insert([{ ...payload, last_run: null, company_id: companyIdForWrite }]).select("id").single();
      if (!error && data) {
        await savePmPlanSnapshot(data.id, "created", "active");
      }
    }

    const nextPlans = await fetchPlans(activeCompanyId);
    setPlans(sortPlans(nextPlans));
    resetForm();
  };

  const handleEdit = (plan: PMPlan) => {
    if (!canMutate) return;
    setEditingId(plan.id);
    setAssetId(plan.assetId);
    setName(plan.name);
    setFrequency(String(plan.frequency));
    setNextRunDate(toDateInputValue(plan.nextRun));
    setDateError("");
    setFormOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!canMutate) return;

    // Save snapshot before soft delete
    const plan = plans.find((p) => p.id === planId);
    await savePmPlanSnapshot(planId, "deleted", plan ? "active" : "unknown");

    // Soft delete
    await supabase
      .from("pm_plans")
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq("id", planId)
      .eq("company_id", activeCompanyId);

    setPlans((current) => current.filter((p) => p.id !== planId));

    if (editingId === planId) {
      resetForm();
    }

    // Refresh history
    const historyRows = await fetchPmPlanHistory(activeCompanyId);
    setHistory(historyRows);
  };

  const handleComplete = async (plan: PMPlan) => {
    if (!canMutate || !activeCompanyId) return;
    
    // Save snapshot before complete
    await savePmPlanSnapshot(plan.id, "completed", "active");

    const today = startOfDay(new Date());
    const last_execution = today;
    const next_execution = addDays(last_execution, plan.frequency);
    
    await supabase
      .from("pm_plans")
      .update({ 
        last_run: toDateOnlyISO(last_execution),
        next_run: toDateOnlyISO(next_execution)
      })
      .eq("id", plan.id)
      .eq("company_id", activeCompanyId);

    const nextPlans = await fetchPlans(activeCompanyId);
    setPlans(sortPlans(nextPlans));

    // Refresh history
    const historyRows = await fetchPmPlanHistory(activeCompanyId);
    setHistory(historyRows);
  };

  const today = startOfDay(new Date());

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8 border-[#d6d0b8]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">{copy.sectionLabel}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="text-sm text-muted">{copy.subtitle}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? copy.historyHide : copy.historyToggle}
            </Button>
            {canMutate ? <Button onClick={() => { resetForm(); setFormOpen(true); }}>{copy.createPlan}</Button> : null}
          </div>
        </div>
      </Panel>

      {formOpen && (
        <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_160px_180px_auto] md:items-end" onSubmit={handleSubmit}>
            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.asset}</span>
              <select
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
                disabled={readOnly}
              >
                <option value="">{copy.selectAsset}</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.tag} - {asset.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.planName}</span>
              <input
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 outline-none focus:border-accent"
                placeholder="Ej. Revisión trimestral"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={readOnly}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.frequency}</span>
              <input
                type="number"
                min="1"
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 outline-none focus:border-accent"
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
                disabled={readOnly}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted">{copy.nextRun}</span>
              <input
                type="date"
                className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 outline-none focus:border-accent"
                value={nextRunDate}
                onChange={(event) => {
                  setNextRunDate(event.target.value);
                  setDateError("");
                }}
                disabled={readOnly}
              />
            </label>

            <div className="flex gap-2">
              <Button type="submit" disabled={readOnly}>
                {editingId ? copy.save : copy.create}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                {copy.cancel}
              </Button>
            </div>
          </form>
          {dateError && <p className="mt-2 text-sm text-danger">{dateError}</p>}
        </Panel>
      )}

      <Panel className="border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left align-middle">{copy.tablePlan}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.tableAsset}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.tableFrequency}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.tableLastRun}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.tableNextRun}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.tableStatus}</th>
                <th className="px-4 py-2 text-right align-middle">{copy.tableActions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {plans.map((plan) => {
                const asset = assetsById.get(plan.assetId);
                const nextRun = parseDateOnly(plan.nextRun);
                const overdue = Boolean(nextRun && nextRun <= today);

                return (
                  <tr key={plan.id}>
                    <td className="px-4 py-2 text-left align-middle">{plan.name}</td>
                    <td className="px-4 py-2 text-left align-middle">
                      {asset ? `${asset.tag} - ${asset.name}` : copy.assetNotFound}
                    </td>
                    <td className="px-4 py-2 text-left align-middle">{plan.frequency}</td>
                    <td className="px-4 py-2 text-left align-middle">{formatDate(plan.lastRun, locale)}</td>
                    <td className={`px-4 py-2 text-left align-middle ${overdue ? "text-danger" : ""}`}>
                      {formatDate(plan.nextRun, locale)}
                    </td>
                    <td className="px-4 py-2 text-left align-middle">
                      {overdue ? <span className="rounded-full bg-danger/20 px-3 py-1 text-xs text-danger">{copy.overdue}</span> : copy.upToDate}
                    </td>
                    <td className="px-4 py-2 text-right align-middle">
                      {readOnly ? (
                        <span className="text-xs text-muted">Read only</span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => handleComplete(plan)}>
                            {copy.complete}
                          </Button>
                          <Button onClick={() => handleEdit(plan)}>{copy.edit}</Button>
                          <Button variant="danger" onClick={() => handleDelete(plan.id)}>
                            {copy.remove}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {plans.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── HISTORIAL DE PM ────────────────────────────────── */}
      {showHistory && (
        <Panel className="border-[#d6d0b8] bg-[#f8f6ea]">
          <div className="p-5">
            <h2 className="text-lg font-semibold mb-4">{copy.historyTitle}</h2>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
              <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2 text-left align-middle">{copy.tablePlan}</th>
                  <th className="px-4 py-2 text-left align-middle">{copy.tableAsset}</th>
                  <th className="px-4 py-2 text-left align-middle">{copy.tableFrequency}</th>
                  <th className="px-4 py-2 text-left align-middle">Usuario</th>
                  <th className="px-4 py-2 text-left align-middle">{copy.historyOriginalStatus}</th>
                  <th className="px-4 py-2 text-left align-middle">{copy.historyAction}</th>
                  <th className="px-4 py-2 text-left align-middle">{copy.historyDate}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((record) => {
                  const snap = record.snapshot as Record<string, unknown>;
                  return (
                    <tr key={record.id}>
                      <td className="px-4 py-2 text-left align-middle">{snap.name as string ?? "-"}</td>
                      <td className="px-4 py-2 text-left align-middle">
                        {(snap.asset_id as string)?.slice(0, 6)?.toUpperCase() ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-left align-middle">{(snap.frequency as number) ?? "-"}</td>
                      <td className="px-4 py-2 text-left align-middle">{usersMap[record.user_id as string] || record.user_id || "-"}</td>
                      <td className="px-4 py-2 text-left align-middle">{record.status_original ?? "-"}</td>
                      <td className="px-4 py-2 text-left align-middle">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            record.action_type === "created"
                              ? "bg-success/20 text-success"
                              : record.action_type === "completed"
                              ? "bg-[#0ea5e9]/20 text-[#0ea5e9]"
                              : "bg-danger/20 text-danger"
                          }`}
                        >
                          {record.action_type === "created"
                            ? copy.actionCreated
                            : record.action_type === "completed"
                            ? copy.actionCompleted
                            : copy.actionDeleted}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-left align-middle">
                        {formatHistoryDate(record.created_at)}
                      </td>
                    </tr>
                  );
                })}

                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted">
                      {copy.historyEmpty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 text-xs text-muted text-center border-t border-border">
            {copy.historyDisclaimer}
          </div>
        </Panel>
      )}
    </div>
  );
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

/** Parse date string with timezone-safe approach to prevent -1 day bug */
function parseDateOnly(value: string | null) {
  if (!value) return null;

  // If it's a date-only string (YYYY-MM-DD), append T00:00:00 to prevent timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const base = new Date(value + "T00:00:00");
    if (Number.isNaN(base.getTime())) return null;
    return startOfDay(base);
  }

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

function formatDate(value: string | null, locale: "es" | "en") {
  const parsed = parseDateOnly(value);
  if (!parsed) return "-";

  const formatLocale = locale === "en" ? "en-US" : "es-MX";
  return new Intl.DateTimeFormat(formatLocale, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(parsed);
}
