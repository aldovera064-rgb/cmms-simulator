"use client";

import { useEffect, useMemo, useState } from "react";

import { SparePartFormModal } from "@/components/spare-parts/spare-part-form-modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast-context";
import { useCover } from "@/lib/cover-context";
import { getScopedCompanyId } from "@/lib/company";
import { ensureSeedData, fetchSpareParts } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
import { canEditModule } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type SparePart = {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  location: string;
};

type SparePartsPageClientProps = {
  initialSpareParts: SparePart[];
};

function mapSparePart(row: { id: string; name: string | null; stock: number | null; min_stock: number | null; unit: string | null; location: string | null }): SparePart {
  return {
    id: row.id,
    name: row.name ?? "",
    stock: row.stock ?? 0,
    minStock: row.min_stock ?? 0,
    unit: row.unit ?? "piezas",
    location: row.location ?? ""
  };
}

export function SparePartsPageClient({ initialSpareParts }: SparePartsPageClientProps) {
  const { locale } = useI18n();
  const { user } = useSession();
  const { cover } = useCover();
  const { showToast } = useToast();
  const activeCompanyId = user?.activeCompanyId ?? null;
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  const [spareParts, setSpareParts] = useState<SparePart[]>(initialSpareParts);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SparePart | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const canMutate = canEditModule(user?.role, "spare_parts");
  const readOnly = !canMutate;
  const hasCover = Boolean(cover.url);

  const copy =
    locale === "en"
      ? {
          registry: "Spare Parts Registry",
          title: "Spare Parts",
          subtitle: "Inventory management for maintenance operations.",
          create: "Create spare part",
          name: "Name",
          stock: "Stock",
          minStock: "Min stock",
          unit: "Unit",
          location: "Location",
          actions: "Actions",
          edit: "Edit",
          remove: "Delete",
          empty: "No spare parts",
          deleteTitle: "Confirm deletion",
          deleteDesc: "Delete this spare part?"
        }
      : {
          registry: "Registro de Refacciones",
          title: "Refacciones",
          subtitle: "Control de inventario para mantenimiento.",
          create: "Crear refacción",
          name: "Nombre",
          stock: "Stock",
          minStock: "Stock mínimo",
          unit: "Unidad",
          location: "Ubicación",
          actions: "Acciones",
          edit: "Editar",
          remove: "Eliminar",
          empty: "No hay refacciones registradas.",
          deleteTitle: "Confirmar eliminación",
          deleteDesc: "¿Eliminar esta refacción?"
        };

  useEffect(() => {
    const load = async () => {
      if (!activeCompanyId) {
        setSpareParts([]);
        return;
      }

      await ensureSeedData(activeCompanyId);
      const rows = await fetchSpareParts(activeCompanyId);
      setSpareParts(rows.map(mapSparePart));
    };

    void load();
  }, [activeCompanyId]);

  const openCreate = () => {
    setEditingPart(null);
    setFormOpen(true);
  };

  const openEdit = (part: SparePart) => {
    if (!canMutate) return;
    setEditingPart(part);
    setFormOpen(true);
  };

  const handleSubmit = async (values: { name: string; stock: number; minStock: number; unit: string; location: string }) => {
    if (!canMutate || !activeCompanyId) return;
    setSaving(true);

    if (editingPart) {
      await supabase
        .from("spare_parts")
        .update({ name: values.name, stock: values.stock, min_stock: values.minStock, unit: values.unit, location: values.location })
        .eq("id", editingPart.id)
        .eq("company_id", activeCompanyId);
    } else {
      await supabase
        .from("spare_parts")
        .insert([{ name: values.name, stock: values.stock, min_stock: values.minStock, unit: values.unit, location: values.location, company_id: companyIdForWrite }]);
    }

    const rows = await fetchSpareParts(activeCompanyId);
    setSpareParts(rows.map(mapSparePart));
    setFormOpen(false);
    setEditingPart(null);
    setSaving(false);
    showToast(editingPart ? "Refacción actualizada" : "Refacción creada", "success");
  };

  const confirmDelete = async () => {
    if (!canMutate || !deleteTarget) return;
    setDeleting(true);
    await supabase.from("spare_parts").delete().eq("id", deleteTarget.id).eq("company_id", activeCompanyId);
    setSpareParts((current) => current.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
    showToast("Refacción eliminada", "success");
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

          {canMutate ? <Button onClick={openCreate}>{copy.create}</Button> : null}
        </div>
      </Panel>

      <Panel className="border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left align-middle">{copy.name}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.stock}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.minStock}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.unit}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.location}</th>
                <th className="px-4 py-2 text-right align-middle">{copy.actions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {spareParts.map((part) => {
                const lowStock = part.stock <= part.minStock && part.minStock > 0;
                return (
                  <tr key={part.id}>
                    <td className="px-4 py-2 text-left align-middle">{part.name}</td>
                    <td className={`px-4 py-2 text-left align-middle ${lowStock ? "text-danger font-semibold" : ""}`}>
                      {part.stock} {part.unit}
                    </td>
                    <td className="px-4 py-2 text-left align-middle">
                      {part.minStock} {part.unit}
                    </td>
                    <td className="px-4 py-2 text-left align-middle">{part.unit}</td>
                    <td className="px-4 py-2 text-left align-middle">{part.location}</td>
                    <td className="px-4 py-2 text-right align-middle">
                      {readOnly ? (
                        <span className="text-xs text-muted">Read only</span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => openEdit(part)}>{copy.edit}</Button>
                          <Button variant="danger" onClick={() => setDeleteTarget(part)}>
                            {copy.remove}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {spareParts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <SparePartFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingPart(null); }}
        onSubmit={handleSubmit}
        initial={editingPart ? { name: editingPart.name, stock: editingPart.stock, minStock: editingPart.minStock, unit: editingPart.unit, location: editingPart.location } : null}
        loading={saving}
        locale={locale}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={copy.deleteTitle}
        description={`${copy.deleteDesc} ${deleteTarget?.name ?? ""}`}
        confirmLabel={copy.remove}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
