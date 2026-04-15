"use client";

import Link from "next/link";
import { useState } from "react";

import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CriticalityBadge } from "@/components/ui/criticality-badge";
import { Panel } from "@/components/ui/panel";
import { AssetApiError, AssetFormValues, AssetListItem } from "@/types/assets";

type AssetsPageClientProps = {
  initialAssets: AssetListItem[];
};

export function AssetsPageClient({ initialAssets }: AssetsPageClientProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [editingAsset, setEditingAsset] = useState<AssetListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetListItem | null>(null);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingAsset(null);
    setFormError("");
  };

  const submitForm = async (values: AssetFormValues) => {
    setSaving(true);
    setFormError("");

    const isEditing = Boolean(editingAsset);
    const url = isEditing ? `/api/activos/${editingAsset?.id}` : "/api/activos";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const errorData = (await response.json()) as AssetApiError;
        setFormError(errorData.error || "No se pudo guardar el activo.");
        return;
      }

      const asset = (await response.json()) as AssetListItem;

      setAssets((current) => {
        if (isEditing) {
          return sortAssets(current.map((item) => (item.id === asset.id ? asset : item)));
        }

        return sortAssets([...current, asset]);
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
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(`/api/activos/${deleteTarget.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const errorData = (await response.json()) as AssetApiError;
        setDeleteError(errorData.error || "No se pudo eliminar el activo.");
        return;
      }

      setAssets((current) => current.filter((item) => item.id !== deleteTarget.id));
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
            <p className="text-xs uppercase tracking-[0.28em] text-accent">Asset Registry</p>
            <h1 className="text-3xl font-semibold tracking-tight">Activos</h1>
            <p className="text-sm leading-6 text-muted">
              Administra el catalogo de activos industriales del simulador con datos reales en
              SQLite mediante Prisma.
            </p>
          </div>

          <Button className="w-full sm:w-auto" onClick={openCreateModal}>
            Nuevo Activo
          </Button>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-panelAlt/70 text-left text-xs uppercase tracking-[0.2em] text-muted">
              <tr>
                <th className="px-5 py-4">TAG</th>
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Area</th>
                <th className="px-5 py-4">Criticidad</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset) => (
                <tr className="transition hover:bg-panelAlt/40" key={asset.id}>
                  <td className="px-5 py-4 font-medium">
                    <Link className="hover:text-accent" href={`/activos/${asset.id}`}>
                      {asset.tag}
                    </Link>
                  </td>
                  <td className="px-5 py-4">{asset.name || "-"}</td>
                  <td className="px-5 py-4 text-muted">{asset.area || "-"}</td>
                  <td className="px-5 py-4">
                    <CriticalityBadge value={asset.criticality} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => openEditModal(asset)} variant="secondary">
                        Editar
                      </Button>
                      <Button onClick={() => setDeleteTarget(asset)} variant="danger">
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {assets.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-muted" colSpan={5}>
                    No hay activos registrados.
                  </td>
                </tr>
              ) : null}
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
        confirmLabel="Eliminar activo"
        description={
          deleteError ||
          `Se eliminara el activo ${deleteTarget?.tag ?? ""}. Esta accion no se puede deshacer.`
        }
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
        onConfirm={confirmDelete}
        open={Boolean(deleteTarget)}
        title="Confirmar eliminacion"
      />
    </div>
  );
}

function sortAssets(items: AssetListItem[]) {
  const priority = { A: 0, B: 1, C: 2 } as const;

  return [...items].sort((left, right) => {
    const criticalityDiff = priority[left.criticality] - priority[right.criticality];

    if (criticalityDiff !== 0) {
      return criticalityDiff;
    }

    return left.tag.localeCompare(right.tag);
  });
}
