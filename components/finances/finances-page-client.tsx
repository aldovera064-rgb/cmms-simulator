"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast-context";
import { useCover } from "@/lib/cover-context";
import { useI18n } from "@/lib/i18n/context";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type MainCat = { id: string; name: string; type: "expense" | "income" };
type SubEntry = { id: string; main_id: string; name: string; amount: number; date: string };

const SEED_EXPENSES = [
  { name: "Servicios", subs: ["Electricidad", "Agua", "Gas", "Internet"] },
  { name: "Materiales", subs: ["Herramientas", "Consumibles", "EPP"] },
  { name: "Salarios", subs: ["Operadores", "Administrativos", "Técnicos"] },
  { name: "Mantenimiento", subs: ["Preventivo", "Correctivo", "Predictivo"] },
  { name: "Refacciones", subs: ["Mecánicas", "Eléctricas", "Electrónicas"] },
  { name: "Producción", subs: ["Materia prima", "Maquila", "Empaque"] },
  { name: "Extras", subs: ["Transporte", "Capacitación", "Varios"] }
];
const SEED_INCOMES = [
  { name: "Ventas", subs: ["Producto A", "Producto B", "Servicios"] },
  { name: "Otros ingresos", subs: ["Intereses", "Subsidios", "Varios"] }
];

export function FinancesPageClient() {
  const { locale } = useI18n();
  const { user } = useSession();
  const { cover } = useCover();
  const { showToast } = useToast();
  const companyId = user?.activeCompanyId ?? null;
  const hasCover = Boolean(cover.url);

  const [mains, setMains] = useState<MainCat[]>([]);
  const [subs, setSubs] = useState<SubEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<"expense" | "income">("expense");
  const [addMainId, setAddMainId] = useState("");
  const [addName, setAddName] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addDate, setAddDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  const [editId, setEditId] = useState<string | null>(null);

  const t = locale === "en"
    ? { title: "Finances", sub: "Expense and income tracking", expenses: "Expenses", income: "Income",
        result: "Operating Result", total: "Total", save: "Save", cancel: "Cancel",
        addExpense: "Add expense", addIncome: "Add income", group: "Group",
        concept: "Subconcept", amount: "Amount", date: "Date", surplus: "Surplus",
        deficit: "Deficit", balanced: "Balanced", chart: "Last 5 weeks", del: "Delete", edit: "Edit" }
    : { title: "Finanzas", sub: "Control de gastos e ingresos", expenses: "Gastos", income: "Ingresos",
        result: "Resultado Operativo", total: "Total", save: "Guardar", cancel: "Cancelar",
        addExpense: "Agregar gasto", addIncome: "Agregar ingreso", group: "Grupo",
        concept: "Subconcepto", amount: "Monto", date: "Fecha", surplus: "Superávit",
        deficit: "Déficit", balanced: "Equilibrado", chart: "Últimas 5 semanas", del: "Eliminar", edit: "Editar" };

  // ── LOAD ──
  useEffect(() => {
    if (!companyId) { setMains([]); setSubs([]); setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      let { data: mainData } = await supabase.from("finance_main").select("id, name, type").eq("company_id", companyId);
      if (!mainData || mainData.length === 0) {
        await seedDefaults(companyId);
        const r = await supabase.from("finance_main").select("id, name, type").eq("company_id", companyId);
        mainData = r.data;
      }
      const parsed = (mainData ?? []).map(r => ({ id: r.id as string, name: r.name as string, type: r.type as "expense" | "income" }));
      setMains(parsed);

      const mainIds = parsed.map(m => m.id);
      if (mainIds.length > 0) {
        const { data: subData } = await supabase.from("finance_sub").select("id, main_id, name, amount, date").in("main_id", mainIds).order("date", { ascending: false });
        setSubs((subData ?? []).map(r => ({ id: r.id as string, main_id: r.main_id as string, name: r.name as string, amount: Number(r.amount) || 0, date: (r.date as string) ?? "" })));
      }
      setLoading(false);
    };
    void load();
  }, [companyId]);

  async function seedDefaults(cid: string) {
    for (const group of SEED_EXPENSES) {
      const { data } = await supabase.from("finance_main").insert({ company_id: cid, name: group.name, type: "expense" }).select("id").single();
      if (data) {
        const rows = group.subs.map(s => ({ main_id: data.id, name: s, amount: 0, date: new Date().toISOString().split("T")[0] }));
        await supabase.from("finance_sub").insert(rows);
      }
    }
    for (const group of SEED_INCOMES) {
      const { data } = await supabase.from("finance_main").insert({ company_id: cid, name: group.name, type: "income" }).select("id").single();
      if (data) {
        const rows = group.subs.map(s => ({ main_id: data.id, name: s, amount: 0, date: new Date().toISOString().split("T")[0] }));
        await supabase.from("finance_sub").insert(rows);
      }
    }
  }

  // ── Computed ──
  const subsForMain = (mainId: string) => subs.filter(s => s.main_id === mainId);
  const mainTotal = (mainId: string) => subsForMain(mainId).reduce((s, e) => s + e.amount, 0);

  const expenseMains = mains.filter(m => m.type === "expense");
  const incomeMains = mains.filter(m => m.type === "income");
  const totalExpenses = expenseMains.reduce((s, m) => s + mainTotal(m.id), 0);
  const totalIncome = incomeMains.reduce((s, m) => s + mainTotal(m.id), 0);
  const opResult = totalIncome - totalExpenses;

  // Chart (ISO Week)
  const getWeekNumber = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
    return Math.ceil((days + firstDay.getDay() + 1) / 7);
  };

  const weeklyData = useMemo(() => {
    const weeks: Array<{ label: string; balance: number }> = [];
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const expIds = new Set(expenseMains.map(m => m.id));
    const incIds = new Set(incomeMains.map(m => m.id));
    
    for (let w = 4; w >= 0; w--) {
      const end = new Date(now); end.setDate(now.getDate() - w * 7);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      const s = fmt(start), e = fmt(end);
      let inc = 0, exp = 0;
      for (const sub of subs) {
        if (sub.date >= s && sub.date <= e) {
          if (incIds.has(sub.main_id)) inc += sub.amount;
          if (expIds.has(sub.main_id)) exp += sub.amount;
        }
      }
      weeks.push({ label: `S${currentWeek - w}`, balance: inc - exp });
    }
    return weeks;
  }, [subs, mains]);
  const maxChart = Math.max(1, ...weeklyData.map(w => Math.abs(w.balance)));

  // ── SAVE (ADD or EDIT) ──
  const handleSave = async () => {
    if (!addMainId || !addName.trim() || !addAmount || !addDate) return;
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (editId) {
      const { error } = await supabase.from("finance_sub")
        .update({ main_id: addMainId, name: addName.trim(), amount, date: addDate })
        .eq("id", editId);
      
      if (error) { console.error("FINANCE UPDATE ERROR:", error); showToast("Error: " + error.message, "error"); return; }
      setSubs(prev => prev.map(s => s.id === editId ? { ...s, main_id: addMainId, name: addName.trim(), amount, date: addDate } : s));
      showToast(locale === "en" ? "Entry updated" : "Registro actualizado", "success");
    } else {
      const { data, error } = await supabase.from("finance_sub")
        .insert({ main_id: addMainId, name: addName.trim(), amount, date: addDate })
        .select("id, main_id, name, amount, date").single();

      if (error) { console.error("FINANCE INSERT ERROR:", error); showToast("Error: " + error.message, "error"); return; }
      if (data) setSubs(prev => [{ id: data.id as string, main_id: data.main_id as string, name: data.name as string, amount: Number(data.amount), date: data.date as string }, ...prev]);
      showToast(locale === "en" ? "Entry added" : "Registro agregado", "success");
    }
    setAddOpen(false);
    setEditId(null);
  };

  // ── DELETE entry ──
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("finance_sub").delete().eq("id", id);
    if (error) { console.error("FINANCE DELETE ERROR:", error); showToast("Error: " + error.message, "error"); return; }
    setSubs(prev => prev.filter(s => s.id !== id));
    showToast(locale === "en" ? "Deleted" : "Eliminado", "success");
  };

  const openAdd = (type: "expense" | "income") => {
    setAddType(type);
    const list = type === "expense" ? expenseMains : incomeMains;
    setAddMainId(list[0]?.id ?? "");
    setAddName(""); setAddAmount(""); setAddDate(new Date().toISOString().split("T")[0]);
    setEditId(null);
    setAddOpen(true);
  };

  const openEdit = (sub: SubEntry, type: "expense" | "income") => {
    setAddType(type);
    setAddMainId(sub.main_id);
    setAddName(sub.name);
    setAddAmount(sub.amount.toString());
    setAddDate(sub.date);
    setEditId(sub.id);
    setAddOpen(true);
  };

  if (loading) return <Panel className="p-8"><div className="animate-pulse space-y-4"><div className="h-6 w-48 rounded-xl bg-border/50" /><div className="h-48 rounded-xl bg-border/20" /></div></Panel>;

  // ── Category Table renderer ──
  const renderTable = (list: MainCat[], color: string, label: string, total: number, type: "expense" | "income") => (
    <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
      <h2 className={`text-lg font-semibold ${color} mb-4`}>{label}</h2>
      <div className="space-y-2">
        {list.map(m => {
          const mSubs = subsForMain(m.id);
          const mTotal = mSubs.reduce((s, e) => s + e.amount, 0);
          const isExp = expanded === m.id;
          return (
            <div key={m.id} className="rounded-xl border border-border overflow-hidden">
              <button type="button" onClick={() => setExpanded(isExp ? null : m.id)}
                className="flex w-full items-center justify-between px-4 py-3 bg-panelAlt hover:bg-panel transition text-sm">
                <span className="font-medium">{m.name}</span>
                <div className="flex items-center gap-3">
                  <span className={`${color} font-semibold`}>${mTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  <svg className={`h-4 w-4 text-muted transition-transform ${isExp ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>
              {isExp && (
                <div className="divide-y divide-border">
                  {mSubs.length === 0 && <p className="px-6 py-3 text-xs text-muted">—</p>}
                  {mSubs.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-6 py-2 text-sm bg-black/5 border-l-4 border-accent">
                      <div className="flex items-center gap-3">
                        <span className="text-muted">{sub.name}</span>
                        <span className="text-[10px] text-muted/60">{sub.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`${color} font-medium`}>${sub.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        <button type="button" onClick={() => openEdit(sub, type)} className="text-accent text-xs hover:underline">{t.edit}</button>
                        <button type="button" onClick={() => void handleDelete(sub.id)} className="text-danger text-xs hover:underline">{t.del}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className={`flex justify-between px-4 py-3 rounded-xl border text-sm font-semibold ${color.includes("red") ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
          <span>{t.total} {label}</span>
          <span className={color}>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </Panel>
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Panel className="relative overflow-hidden p-8 border-[#d6d0b8]">
        {hasCover && (<><img src={cover.url!} alt="" className="absolute inset-0 h-full w-full object-cover pointer-events-none" style={{ objectPosition: cover.position, transform: `scale(${cover.scale})`, transformOrigin: cover.position }} draggable={false} /><div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 pointer-events-none" /></>)}
        {!hasCover && <div className="absolute inset-0 industrial-grid pointer-events-none" />}
        <div className="relative z-10 space-y-3">
          <p className={`text-xs uppercase tracking-[0.28em] ${hasCover ? "text-white/80" : "text-accent"}`}>💰</p>
          <h1 className={`text-3xl font-semibold tracking-tight ${hasCover ? "text-white" : ""}`}>{t.title}</h1>
          <p className={`text-sm ${hasCover ? "text-white/80" : "text-muted"}`}>{t.sub}</p>
        </div>
      </Panel>

      {/* Operating Result */}
      <Panel className={`p-6 border-2 ${opResult >= 0 ? "border-green-400/40 bg-green-50/50" : "border-red-400/40 bg-red-50/50"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">{t.result}</p>
            <p className={`text-3xl font-bold mt-1 ${opResult >= 0 ? "text-green-600" : "text-red-600"}`}>${opResult.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className={`rounded-full px-4 py-1.5 text-sm font-medium ${opResult > 0 ? "bg-green-100 text-green-700" : opResult < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
            {opResult > 0 ? t.surplus : opResult < 0 ? t.deficit : t.balanced}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="rounded-xl border border-green-200 bg-white/60 p-3 text-center">
            <p className="text-xs text-muted">{t.income}</p>
            <p className="text-lg font-semibold text-green-600">${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-white/60 p-3 text-center">
            <p className="text-xs text-muted">{t.expenses}</p>
            <p className="text-lg font-semibold text-red-600">${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </Panel>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="danger" onClick={() => openAdd("expense")}>+ {t.addExpense}</Button>
        <Button onClick={() => openAdd("income")} className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700">+ {t.addIncome}</Button>
      </div>

      {/* Chart */}
      <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
        <h2 className="text-sm font-semibold mb-4">{t.chart}</h2>
        <div className="flex items-end justify-between gap-3 h-40">
          {weeklyData.map((w, i) => {
            const h = maxChart > 0 ? (Math.abs(w.balance) / maxChart) * 100 : 0;
            const pos = w.balance >= 0;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className={`text-xs font-medium ${pos ? "text-green-600" : "text-red-600"}`}>{w.balance !== 0 ? `$${Math.abs(w.balance).toLocaleString()}` : "—"}</span>
                <div className="w-full flex items-end justify-center" style={{ height: "100px" }}>
                  <div className={`w-full max-w-[40px] rounded-t-lg transition-all ${pos ? "bg-green-400" : "bg-red-400"}`} style={{ height: `${Math.max(4, h)}%` }} />
                </div>
                <span className="text-xs text-muted">{w.label}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* EXPENSES TABLE */}
      {renderTable(expenseMains, "text-red-600", t.expenses, totalExpenses, "expense")}

      {/* INCOME TABLE */}
      {renderTable(incomeMains, "text-green-600", t.income, totalIncome, "income")}

      {/* Add/Edit Modal */}
      <Modal open={addOpen} title={editId ? t.edit : (addType === "expense" ? t.addExpense : t.addIncome)} onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{t.group}</span>
            <select className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent" value={addMainId} onChange={e => setAddMainId(e.target.value)}>
              {(addType === "expense" ? expenseMains : incomeMains).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{t.concept}</span>
            <input className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent" value={addName} onChange={e => setAddName(e.target.value)} placeholder="Ej: Electricidad" />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{t.amount}</span>
            <input type="number" min="0" step="0.01" className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent" value={addAmount} onChange={e => setAddAmount(e.target.value)} />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{t.date}</span>
            <input type="date" className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent" value={addDate} onChange={e => setAddDate(e.target.value)} />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleSave}>{t.save}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
