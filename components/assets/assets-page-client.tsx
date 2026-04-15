"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CriticalityBadge } from "@/components/ui/criticality-badge";
import { Panel } from "@/components/ui/panel";
import { AssetFormValues, AssetListItem } from "@/types/assets";

type AssetsPageClientProps = {
  initialAssets: AssetListItem[];
};

export function AssetsPageClient({ initialAssets }: AssetsPageClientProps) {
  // ✅ PASO 5.2 — cargar desde localStorage
  const [assets, setAssets] = useState<AssetListItem[]>(() => {
    if (typeof window === "undefined") return initialAssets;

    const stored = localStorage.getItem("demo-assets");
    return stored ? JSON.parse(stored) : initialAssets;
  });

  const [editingAsset, setEditingAsset] = useState<AssetListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetListItem | null>(null);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ PASO 5.1 — guardar en localStorage
  useEffect(() => {
    localStorage.setItem("demo-assets", JSON.stringify(assets));
  }, [assets]);

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

      const newAsset: AssetListItem = {
        id: isEditing ? editingAsset!.id : Date.now().toString(),
        tag: values.tag,
        name: values.name || "",
        area: values.area || "",
        criticality: values.criticality || "B",
        status: "OPERATIVE", // ✅ ya corregido
        manufacturer: "",
        model: "",
        serialNumber: "",
        installationDate: new Date().toISOString(),
        lastFailureAt: null,
        technicalSpecifications: ""
      };

      setAssets((current) => {
        if (isEditing) {
          return sortAssets(
            current.map((item) =>
              item.id === newAsset.id ? newAsset : item
            )
          );
        }

        return sortAssets([...current, newAsset]);
      });

      setFormOpen(false);
      setEditingAsset(null);
    } catch {
      setFormError("No se pudo guardar el activo.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError("");

    try {
      setAssets((current) =>
        current.filter((item) => item.id !== deleteTarget.id)
      );

      setDeleteTarget(null);
    } catch {
      setDeleteError("No se pudo eliminar el activo.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">
              Asset Registry
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Activos
            </h1>
            <p className="text-sm text-muted">
              Modo demo persistente (localStorage).
            </p>
          </div>

          <Button onClick={openCreateModal}>
            Nuevo Activo
          </Button>
        </div>
      </Panel>

      <Panel>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-panelAlt/70 text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-4">TAG</th>
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Área</th>
                <th className="px-5 py-4">Criticidad</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-5 py-4">
                    <Link href={`/activos/${asset.id}`}>
                      {asset.tag}
                    </Link>
                  </td>
                  <td className="px-5 py-4">{asset.name}</td>
                  <td className="px-5 py-4">{asset.area}</td>
                  <td className="px-5 py-4">
                    <CriticalityBadge value={asset.criticality} />
                  </td>
                  <td className="px-5 py-4 text-right flex gap-2 justify-end">
                    <Button onClick={() => openEditModal(asset)}>
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setDeleteTarget(asset)}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}

              {assets.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6">
                    No hay activos.
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
        title="Confirmar eliminación"
        description={`Eliminar ${deleteTarget?.tag ?? ""}`}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function sortAssets(items: AssetListItem[]) {
  const priority = { A: 0, B: 1, C: 2 } as const;

  return [...items].sort((a, b) => {
    const diff = priority[a.criticality] - priority[b.criticality];
    if (diff !== 0) return diff;
    return a.tag.localeCompare(b.tag);
  });
}