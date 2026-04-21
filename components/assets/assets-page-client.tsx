"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CriticalityBadge } from "@/components/ui/criticality-badge";
import { Panel } from "@/components/ui/panel";
import { ensureSeedData, fetchAssets } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
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
    technicalSpecifications: ""
  };
}

export function AssetsPageClient({ initialAssets }: AssetsPageClientProps) {
  const { locale } = useI18n();
  const [assets, setAssets] = useState<AssetListItem[]>(initialAssets);
  const [editingAsset, setEditingAsset] = useState<AssetListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetListItem | null>(null);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(Date.now());

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
      await ensureSeedData();
      const rows = await fetchAssets();
      setAssets(rows.map(mapAsset));
    };

    void load();
  }, []);

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
    setEditingAsset(null);
    setFormError("");
    setFormOpen(true);
  };

  const openEditModal = (asset: AssetListItem) => {
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
    setSaving(true);
    setFormError("");

    try {
      const isEditing = Boolean(editingAsset);

      if (isEditing) {
        const { error } = await supabase
          .from("assets")
          .update({
            name: values.name || values.tag,
            area: values.area || "Producción",
            status: "OPERATIVE",
            start_time: editingAsset?.startTime ?? Date.now()
          })
          .eq("id", editingAsset!.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("assets").insert([
          {
            name: values.name || values.tag,
            area: values.area || "Producción",
            status: "OPERATIVE",
            start_time: Date.now()
          }
        ]);

        if (error) throw error;
      }

      const rows = await fetchAssets();
      setAssets(rows.map(mapAsset));
      setFormOpen(false);
      setEditingAsset(null);
    } catch {
      setFormError(locale === "en" ? "Could not save asset." : "No se pudo guardar el activo.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const { error } = await supabase.from("assets").delete().eq("id", deleteTarget.id);
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
      <Panel className="industrial-grid overflow-hidden p-8 border-[#d6d0b8]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">{copy.registry}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="text-sm text-muted">{copy.subtitle}</p>
          </div>

          <Button onClick={openCreateModal}>{copy.newAsset}</Button>
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
                <th className="px-4 py-2 text-left align-middle">{copy.criticality}</th>
                <th className="px-4 py-2 text-right align-middle">{copy.actions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {assetsWithRuntime.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-4 py-2 text-left align-middle">
                    <Link href={`/activos/${asset.id}`}>{asset.tag}</Link>
                  </td>
                  <td className="px-4 py-2 text-left align-middle">{asset.name}</td>
                  <td className="px-4 py-2 text-left align-middle">{asset.area}</td>
                  <td className="px-4 py-2 text-left align-middle">{asset.runtimeHours.toFixed(1)} h</td>
                  <td className="px-4 py-2 text-left align-middle">
                    <CriticalityBadge value={asset.criticality} />
                  </td>
                  <td className="px-4 py-2 text-right align-middle">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => openEditModal(asset)}>{copy.edit}</Button>
                      <Button variant="danger" onClick={() => setDeleteTarget(asset)}>
                        {copy.remove}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {assetsWithRuntime.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6">
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
    </div>
  );
}
