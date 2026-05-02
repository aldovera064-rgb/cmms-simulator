"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { PFCurveModal } from "@/components/assets/pf-curve-modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CriticalityBadge } from "@/components/ui/criticality-badge";
import { Panel } from "@/components/ui/panel";
import { useCover } from "@/lib/cover-context";
import { ensureSeedData, fetchAssets } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
import { canEditModule, isReadOnlyRole } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";
import { AssetFormValues, AssetListItem } from "@/types/assets";

type AssetsPageClientProps = {
  initialAssets: AssetListItem[];
};

function mapAsset(row: {
  id: string;
  name: string | null;
  area: string | null;
  status: string | null;
  start_time: number | null;
  created_at: string | null;
  temperature?: number | null;
  vibration?: number | null;
  current_val?: number | null;
  pressure?: number | null;
  alert_threshold?: number | null;
  cbm_enabled?: boolean | null;
  severity?: number | null;
  occurrence?: number | null;
  detection?: number | null;
}): AssetListItem {
  return {
    id: row.id,
    tag: `AS-${row.id.slice(0, 4).toUpperCase()}`,
    name: row.name ?? "",
    area: row.area ?? "",
    criticality: "B",
    status: row.status === "OUT_OF_SERVICE" ? "OUT_OF_SERVICE" : row.status === "MAINTENANCE" ? "MAINTENANCE" : "OPERATIVE",
    manufacturer: "",
    model: "",
    serialNumber: "",
    installationDate: row.created_at ?? new Date().toISOString(),
    startTime: row.start_time ?? Date.now(),
    lastFailureAt: null,
    technicalSpecifications: "",
    temperature: row.temperature ?? null,
    vibration: row.vibration ?? null,
    currentVal: row.current_val ?? null,
    pressure: row.pressure ?? null,
    alertThreshold: row.alert_threshold ?? null,
    cbmEnabled: row.cbm_enabled ?? false,
    severity: row.severity ?? 1,
    occurrence: row.occurrence ?? 1,
    detection: row.detection ?? 1
  };
}

export function AssetsPageClient({ initialAssets }: AssetsPageClientProps) {
  const { locale } = useI18n();
  const { user } = useSession();
  const { cover } = useCover();
  const activeCompanyId = user?.activeCompanyId ?? null;
  const [assets, setAssets] = useState<AssetListItem[]>(initialAssets);
  const [editingAsset, setEditingAsset] = useState<AssetListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetListItem | null>(null);
  const [pfTarget, setPfTarget] = useState<AssetListItem | null>(null);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const canMutateAssets = canEditModule(user?.role, "assets");
  const readOnly = isReadOnlyRole(user?.role);
  const hasCover = Boolean(cover.url);

  const copy =
    locale === "en"
      ? {
          registry: "Asset Registry",
          title: "Assets",
          subtitle: "CMMS system for industrial maintenance management.",
          newAsset: "New Asset",
          tag: "TAG",
          name: "Name",
          area: "Area",
          runtime: "Runtime",
          temp: "Temp",
          vib: "Vib",
          npr: "NPR",
          criticality: "Criticality",
          actions: "Actions",
          edit: "Edit",
          remove: "Delete",
          empty: "No assets",
          deleteTitle: "Confirm deletion",
          deleteAction: "Delete"
        }
      : {
          registry: "Registro de Activos",
          title: "Activos",
          subtitle: "Monitoreo operativo de equipos industriales.",
          newAsset: "Nuevo Activo",
          tag: "TAG",
          name: "Nombre",
          area: "Área",
          runtime: "Runtime",
          temp: "Temp",
          vib: "Vib",
          npr: "NPR",
          criticality: "Criticidad",
          actions: "Acciones",
          edit: "Editar",
          remove: "Eliminar",
          empty: "No hay activos.",
          deleteTitle: "Confirmar eliminación",
          deleteAction: "Eliminar"
        };

  useEffect(() => {
    const load = async () => {
      if (!activeCompanyId) {
        setAssets([]);
        return;
      }

      await ensureSeedData(activeCompanyId);
      const rows = await fetchAssets(activeCompanyId);
      setAssets(rows.map(mapAsset));
    };

    void load();
  }, [activeCompanyId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const assetsWithRuntime = useMemo(
    () =>
      assets.map((asset) => {
        const start = asset.startTime ?? Date.now();
        const hours = (now - start) / 3600000;
        return { ...asset, runtimeHours: hours };
      }),
    [assets, now]
  );

  const openCreateModal = () => {
    if (!canMutateAssets) return;
    setEditingAsset(null);
    setFormError("");
    setFormOpen(true);
  };

  const openEditModal = (asset: AssetListItem) => {
    if (!canMutateAssets) return;
    setEditingAsset(asset);
    setFormError("");
    setFormOpen(true);
  };

  const closeFormModal = () => {
    if (saving) return;

    setFormOpen(false);
    setEditingAsset(null);
    setFormError("");
  };

  const submitForm = async (values: AssetFormValues) => {
    if (!canMutateAssets || !activeCompanyId) return;
    setSaving(true);
    setFormError("");

    try {
      console.log("COMPANY ID:", activeCompanyId);
      const { data: companyRow, error: companyLookupError } = await supabase
        .from("companies")
        .select("id")
        .eq("id", activeCompanyId)
        .maybeSingle();
      console.log("COMPANY EXISTS:", Boolean(companyRow));
      if (companyLookupError) {
        console.error("COMPANY LOOKUP ERROR:", companyLookupError);
      }

      const isEditing = Boolean(editingAsset);

      const payload = {
        tag: values.tag,
        name: values.name || "",
        area: values.area || "",
        criticality: values.criticality || "B",
        status: "OPERATIVE",
        fabricante: values.manufacturer || "",
        modelo: values.model || "",
        serie: values.serialNumber || "",
        fecha_instalacion: values.installationDate || null,
        especificaciones: values.technicalSpecifications || "",
        temperature: values.temperature ?? 0,
        vibration: values.vibration ?? 0,
        pressure: values.pressure ?? 0,
        alert_threshold: values.alertThreshold ?? 0,
        company_id: activeCompanyId
      };

      console.log("FINAL PAYLOAD:", payload);

      if (isEditing) {

        const { error } = await supabase
          .from("assets")
          .update(payload)
          .eq("id", editingAsset!.id)
          .eq("company_id", activeCompanyId);

        if (error) {
          console.error("ERROR CODE:", error.code);
          console.error("ERROR MESSAGE:", error.message);
          console.error("ERROR DETAILS:", error.details);
          throw error;
        }
      } else {
        const { error } = await supabase.from("assets").insert([
          payload
        ]);

        if (error) {
          console.error("ERROR CODE:", error.code);
          console.error("ERROR MESSAGE:", error.message);
          console.error("ERROR DETAILS:", error.details);
          throw error;
        }
      }

      const rows = await fetchAssets(activeCompanyId);
      setAssets(rows.map(mapAsset));
      setFormOpen(false);
      setEditingAsset(null);
    } catch (err) {
      console.error("SUPABASE FULL ERROR:", JSON.stringify(err, null, 2));
      setFormError(locale === "en" ? "Could not save asset." : "No se pudo guardar el activo.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!canMutateAssets) return;
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const { error } = await supabase.from("assets").delete().eq("id", deleteTarget.id).eq("company_id", activeCompanyId);
      if (error) throw error;

      setAssets((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError(locale === "en" ? "Could not delete asset." : "No se pudo eliminar el activo.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel className="relative overflow-hidden p-8 border-[#d6d0b8]">
        {hasCover && (
          <>
            <img src={cover.url!} alt="" className="absolute inset-0 h-full w-full object-cover pointer-events-none" style={{ objectPosition: cover.position, transform: `scale(${cover.scale})`, transformOrigin: cover.position }} draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 pointer-events-none" />
          </>
        )}
        {!hasCover && <div className="absolute inset-0 industrial-grid pointer-events-none" />}
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className={`text-xs uppercase tracking-[0.28em] ${hasCover ? "text-white/80" : "text-accent"}`}>{copy.registry}</p>
            <h1 className={`text-3xl font-semibold tracking-tight ${hasCover ? "text-white" : ""}`}>{copy.title}</h1>
            <p className={`text-sm ${hasCover ? "text-white/80" : "text-muted"}`}>{copy.subtitle}</p>
          </div>

          {canMutateAssets ? <Button onClick={openCreateModal}>{copy.newAsset}</Button> : null}
        </div>
      </Panel>

      <Panel className="border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left align-middle">{copy.tag}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.name}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.area}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.runtime}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.temp}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.vib}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.npr}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.criticality}</th>
                <th className="px-4 py-2 text-right align-middle">{copy.actions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {assetsWithRuntime.map((asset) => {
                const npr = asset.severity * asset.occurrence * asset.detection;
                const statusColor =
                  asset.status === "OPERATIVE" ? "bg-green-500" : asset.status === "MAINTENANCE" ? "bg-yellow-500" : "bg-red-500";
                const nprColor = npr >= 200 ? "bg-danger text-white" : npr >= 100 ? "bg-warning text-white" : "bg-success text-white";

                return (
                  <tr key={asset.id}>
                    <td className="px-4 py-2 text-left align-middle">
                      <Link href={`/activos/${asset.id}`}>{asset.tag}</Link>
                    </td>
                    <td className="px-4 py-2 text-left align-middle flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></span>
                      {asset.name}
                    </td>
                    <td className="px-4 py-2 text-left align-middle">{asset.area}</td>
                    <td className="px-4 py-2 text-left align-middle">{asset.runtimeHours.toFixed(1)} h</td>
                    <td className="px-4 py-2 text-left align-middle">{asset.temperature ?? "-"}</td>
                    <td className="px-4 py-2 text-left align-middle">{asset.vibration ?? "-"}</td>
                    <td className="px-4 py-2 text-left align-middle">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${nprColor}`}>{npr}</span>
                    </td>
                    <td className="px-4 py-2 text-left align-middle">
                      <CriticalityBadge value={asset.criticality} />
                    </td>
                    <td className="px-4 py-2 text-right align-middle">
                      {readOnly ? (
                        <span className="text-xs text-muted">Read only</span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => setPfTarget(asset)}>P-F</Button>
                          <Button onClick={() => openEditModal(asset)}>{copy.edit}</Button>
                          <Button variant="danger" onClick={() => setDeleteTarget(asset)}>
                            {copy.remove}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {assetsWithRuntime.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-6">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <AssetFormModal
        asset={editingAsset}
        error={formError}
        loading={saving}
        onClose={closeFormModal}
        onSubmit={submitForm}
        open={formOpen}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={copy.deleteTitle}
        description={deleteError || `${copy.remove} ${deleteTarget?.tag ?? ""}`}
        confirmLabel={copy.deleteAction}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {pfTarget && (
        <PFCurveModal
          open={Boolean(pfTarget)}
          onClose={() => setPfTarget(null)}
          asset={{
            name: pfTarget.name,
            tag: pfTarget.tag,
            temperature: pfTarget.temperature,
            vibration: pfTarget.vibration,
            pressure: pfTarget.pressure,
            alertThreshold: pfTarget.alertThreshold
          }}
        />
      )}
    </div>
  );
}
