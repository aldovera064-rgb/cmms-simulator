import { supabase } from "@/lib/supabase";
import { getScopedCompanyId } from "@/lib/company";

type CbmAsset = {
  id: string;
  name: string | null;
  temperature: number | null;
  alert_threshold: number | null;
  cbm_enabled: boolean | null;
  company_id: string | null;
};

/**
 * Checks all CBM-enabled assets. If temperature exceeds alert_threshold
 * and no open PREDICTIVE work order already exists for that asset,
 * auto-creates one.
 */
export async function runCbmCheck(activeCompanyId?: string | null) {
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  if (!companyIdForWrite) return [];

  // Fetch CBM-enabled assets with threshold
  let query = supabase
    .from("assets")
    .select("id, name, temperature, alert_threshold, cbm_enabled, company_id")
    .eq("cbm_enabled", true)
    .eq("company_id", companyIdForWrite);

  const { data: assets, error } = await query;
  if (error || !assets) return [];

  const triggered: string[] = [];

  for (const asset of assets as CbmAsset[]) {
    if (
      asset.temperature == null ||
      asset.alert_threshold == null ||
      asset.temperature <= asset.alert_threshold
    ) {
      continue;
    }

    // Check if open predictive WO already exists for this asset
    const { data: existingWo } = await supabase
      .from("work_orders")
      .select("id")
      .eq("asset_id", asset.id)
      .eq("type", "PREDICTIVE")
      .neq("status", "CLOSED")
      .eq("company_id", companyIdForWrite)
      .limit(1)
      .maybeSingle();

    if (existingWo) continue;

    // Auto-create predictive work order
    const { error: insertError } = await supabase.from("work_orders").insert({
      title: `Auto: umbral excedido en ${asset.name ?? "activo"}`,
      description: `Orden generada automáticamente — temperatura (${asset.temperature}) excede umbral (${asset.alert_threshold})`,
      asset_id: asset.id,
      priority: "P2",
      status: "OPEN",
      type: "PREDICTIVE",
      technician: "",
      company_id: companyIdForWrite,
    });

    if (!insertError) {
      triggered.push(asset.id);
      console.log("CBM: Auto work order created for asset", asset.id, asset.name);
    }
  }

  return triggered;
}
