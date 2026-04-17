import { supabase } from "@/lib/supabase";

export type AssetRow = {
  id: string;
  name: string | null;
  area: string | null;
  status: string | null;
  start_time: number | null;
  created_at: string | null;
};

export type WorkOrderRow = {
  id: string;
  title: string | null;
  priority: string | null;
  status: string | null;
  type: string | null;
  technician: string | null;
  created_at: string | null;
};

export type TechnicianRow = {
  id: string;
  name: string | null;
  skill: string | null;
};

export type SparePartRow = {
  id: string;
  name: string | null;
  stock: number | null;
  location: string | null;
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

async function ensureTableSeed<TInsert extends object>(table: string, seed: TInsert[]) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) return;
  if ((count ?? 0) > 0) return;

  await supabase.from(table).insert(seed);
}

export async function ensureSeedData() {
  await Promise.all([
    ensureTableSeed("assets", ASSET_SEED),
    ensureTableSeed("work_orders", WORK_ORDER_SEED),
    ensureTableSeed("technicians", TECHNICIAN_SEED),
    ensureTableSeed("spare_parts", SPARE_PART_SEED)
  ]);
}

export async function fetchAssets() {
  const { data } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
  return (data ?? []) as AssetRow[];
}

export async function fetchWorkOrders() {
  const { data } = await supabase.from("work_orders").select("*").order("created_at", { ascending: false });
  return (data ?? []) as WorkOrderRow[];
}

export async function fetchTechnicians() {
  const { data } = await supabase.from("technicians").select("*").order("name", { ascending: true });
  return (data ?? []) as TechnicianRow[];
}

export async function fetchSpareParts() {
  const { data } = await supabase.from("spare_parts").select("*").order("name", { ascending: true });
  return (data ?? []) as SparePartRow[];
}
