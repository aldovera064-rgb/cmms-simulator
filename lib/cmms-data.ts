import { applyCompanyFilter, getScopedCompanyId } from "@/lib/company";
import { supabase } from "@/lib/supabase";

export type AssetRow = {
  id: string;
  name: string | null;
  area: string | null;
  status: string | null;
  start_time: number | null;
  serial_number: string | null;
  criticality: string | null;
  location: string | null;
  created_at: string | null;
  company_id?: string | null;
  // CBM fields
  temperature: number | null;
  vibration: number | null;
  current_val: number | null;
  pressure: number | null;
  alert_threshold: number | null;
  cbm_enabled: boolean | null;
  // NPR fields
  severity: number | null;
  occurrence: number | null;
  detection: number | null;
};

export type WorkOrderRow = {
  id: string;
  title: string | null;
  asset_id: string | null;
  technician_id: string | null;
  priority: string | null;
  status: string | null;
  type: string | null;
  technician: string | null;
  started_at: string | null;
  completed_at: string | null;
  description: string | null;
  root_cause: string | null;
  action_taken: string | null;
  qr_code: string | null;
  created_at: string | null;
  company_id?: string | null;
};

export type TechnicianRow = {
  id: string;
  name: string | null;
  skill: string | null;
  active: boolean | null;
  company_id?: string | null;
};

export type SparePartRow = {
  id: string;
  name: string | null;
  stock: number | null;
  location: string | null;
  min_stock: number | null;
  company_id?: string | null;
};

const ASSET_SEED: Array<Pick<AssetRow, "name" | "area" | "status" | "start_time">> = [
  { name: "Torno CNC Haas ST-20", area: "Maquinado", status: "OPERATIVE", start_time: Date.now() - 86_400_000 * 12 },
  { name: "Fresadora Bridgeport", area: "Maquinado", status: "OPERATIVE", start_time: Date.now() - 86_400_000 * 10 },
  { name: "Prensa hidráulica 50T", area: "Formado", status: "OPERATIVE", start_time: Date.now() - 86_400_000 * 8 },
  { name: "Compresor Atlas Copco", area: "Servicios", status: "OPERATIVE", start_time: Date.now() - 86_400_000 * 15 },
  { name: "Línea ensamblaje A1", area: "Producción", status: "OPERATIVE", start_time: Date.now() - 86_400_000 * 6 }
];

const WORK_ORDER_SEED: Array<Pick<WorkOrderRow, "title" | "priority" | "status" | "type" | "technician">> = [
  { title: "Cambio de baleros", priority: "P1", status: "OPEN", type: "CORRECTIVE", technician: "Carlos Méndez" },
  { title: "Lubricación preventiva", priority: "P2", status: "IN_PROGRESS", type: "PREVENTIVE", technician: "Ana Torres" },
  { title: "Revisión eléctrica", priority: "P1", status: "OPEN", type: "CORRECTIVE", technician: "Luis Ramírez" },
  { title: "Calibración CNC", priority: "P4", status: "ON_HOLD", type: "PREVENTIVE", technician: "Jorge Salas" },
  { title: "Cambio de banda", priority: "P2", status: "CLOSED", type: "CORRECTIVE", technician: "María López" }
];

const TECHNICIAN_SEED: Array<Pick<TechnicianRow, "name" | "skill">> = [
  { name: "Carlos Méndez", skill: "Mecánico" },
  { name: "Ana Torres", skill: "Eléctrico" },
  { name: "Luis Ramírez", skill: "Electromecánico" },
  { name: "Jorge Salas", skill: "CNC" },
  { name: "María López", skill: "General" }
];

const SPARE_PART_SEED: Array<Pick<SparePartRow, "name" | "stock" | "location">> = [
  { name: "Rodamiento 6205", stock: 18, location: "A1" },
  { name: "Banda A-42", stock: 12, location: "B2" },
  { name: "Aceite ISO 68", stock: 25, location: "C1" },
  { name: "Sensor inductivo", stock: 9, location: "D3" },
  { name: "Fusible 10A", stock: 50, location: "E1" }
];

async function ensureTableSeed<TInsert extends object>(table: string, seed: TInsert[], activeCompanyId?: string | null) {
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  let countQuery = supabase.from(table).select("id", { count: "exact", head: true });
  countQuery = applyCompanyFilter(countQuery, activeCompanyId);
  const { count, error } = await countQuery;
  if (error) return;
  if ((count ?? 0) > 0) return;

  const payload = seed.map((entry) => (companyIdForWrite ? { ...entry, company_id: companyIdForWrite } : entry));
  const insertResult = await supabase.from(table).insert(payload);
  if (insertResult.error && companyIdForWrite && insertResult.error.message.toLowerCase().includes("company_id")) {
    await supabase.from(table).insert(seed);
  }
}

async function safeSelectOrdered<T>(table: string, orderBy: string, ascending: boolean, activeCompanyId?: string | null) {
  let orderedQuery = supabase.from(table).select("*");
  orderedQuery = applyCompanyFilter(orderedQuery, activeCompanyId);
  const ordered = await orderedQuery.order(orderBy, { ascending });
  if (!ordered.error && ordered.data) return ordered.data as T[];

  let fallbackQuery = supabase.from(table).select("*");
  fallbackQuery = applyCompanyFilter(fallbackQuery, activeCompanyId);
  const fallback = await fallbackQuery;
  return (fallback.data ?? []) as T[];
}

export async function ensureSeedData(activeCompanyId?: string | null) {
  if (activeCompanyId) {
    return;
  }

  await Promise.all([
    ensureTableSeed("assets", ASSET_SEED, activeCompanyId),
    ensureTableSeed("work_orders", WORK_ORDER_SEED, activeCompanyId),
    ensureTableSeed("technicians", TECHNICIAN_SEED, activeCompanyId),
    ensureTableSeed("spare_parts", SPARE_PART_SEED, activeCompanyId)
  ]);
}

export async function fetchAssets(activeCompanyId?: string | null) {
  return await safeSelectOrdered<AssetRow>("assets", "created_at", false, activeCompanyId);
}

export async function fetchWorkOrders(activeCompanyId?: string | null) {
  return await safeSelectOrdered<WorkOrderRow>("work_orders", "created_at", false, activeCompanyId);
}

export async function fetchTechnicians(activeCompanyId?: string | null) {
  return await safeSelectOrdered<TechnicianRow>("technicians", "name", true, activeCompanyId);
}

export async function fetchSpareParts(activeCompanyId?: string | null) {
  return await safeSelectOrdered<SparePartRow>("spare_parts", "name", true, activeCompanyId);
}
