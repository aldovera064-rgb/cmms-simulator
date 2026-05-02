"use client";

import { useEffect, useMemo, useState } from "react";

import { TechnicianFormModal } from "@/components/technicians/technician-form-modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast-context";
import { useCover } from "@/lib/cover-context";
import { formatDateGlobal } from "@/lib/format-date";
import { getScopedCompanyId } from "@/lib/company";
import { ensureSeedData, fetchTechnicians } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
import { GOD_USERNAME, canEditModule, normalizeUsername } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type Technician = {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  hireDate: string;
};

type TechniciansPageClientProps = {
  initialTechnicians: Technician[];
};

function mapTechnician(row: { id: string; name: string | null; skill: string | null; phone: string | null; hire_date: string | null }): Technician {
  return {
    id: row.id,
    name: row.name ?? "",
    specialty: row.skill ?? "",
    phone: row.phone ?? "",
    hireDate: row.hire_date ?? ""
  };
}

export function TechniciansPageClient({ initialTechnicians }: TechniciansPageClientProps) {
  const { locale } = useI18n();
  const { user } = useSession();
  const { cover } = useCover();
  const { showToast } = useToast();
  const activeCompanyId = user?.activeCompanyId ?? null;
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Technician | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const canMutate = canEditModule(user?.role, "technicians");
  const readOnly = !canMutate;
  const hasCover = Boolean(cover.url);

  const copy =
    locale === "en"
      ? {
          registry: "Technician Registry",
          title: "Technicians",
          create: "Create technician",
          name: "Name",
          specialty: "Specialty",
          phone: "Phone",
          hireDate: "Hire date",
          actions: "Actions",
          edit: "Edit",
          remove: "Delete",
          empty: "No technicians",
          deleteTitle: "Confirm deletion",
          deleteDesc: "Delete this technician?"
        }
      : {
          registry: "Registro de Técnicos",
          title: "Técnicos",
          create: "Crear técnico",
          name: "Nombre",
          specialty: "Especialidad",
          phone: "Teléfono",
          hireDate: "Fecha de ingreso",
          actions: "Acciones",
          edit: "Editar",
          remove: "Eliminar",
          empty: "No hay técnicos registrados",
          deleteTitle: "Confirmar eliminación",
          deleteDesc: "¿Eliminar este técnico?"
        };

  useEffect(() => {
    const load = async () => {
      if (!activeCompanyId) {
        setTechnicians([]);
        return;
      }

      await ensureSeedData(activeCompanyId);
      const rows = await fetchTechnicians(activeCompanyId);
      setTechnicians(rows.map(mapTechnician));
    };

    void load();
  }, [activeCompanyId]);

  const sortedTechnicians = useMemo(() => {
    return [...technicians].sort((a, b) => a.name.localeCompare(b.name));
  }, [technicians]);

  const openCreate = () => {
    setEditingTechnician(null);
    setFormOpen(true);
  };

  const openEdit = (technician: Technician) => {
    if (!canMutate) return;
    setEditingTechnician(technician);
    setFormOpen(true);
  };

  const handleSubmit = async (values: { name: string; specialty: string; phone: string; hireDate: string }) => {
    if (!canMutate || !activeCompanyId) return;
    setSaving(true);

    const trimmedName = values.name.trim();
    const trimmedSpecialty = values.specialty.trim();

    if (!trimmedName || !trimmedSpecialty) {
      setSaving(false);
      return;
    }

    if (editingTechnician) {
      await supabase
        .from("technicians")
        .update({
          name: trimmedName,
          skill: trimmedSpecialty,
          phone: values.phone.trim() || null,
          hire_date: values.hireDate || null,
          company_id: companyIdForWrite
        })
        .eq("id", editingTechnician.id)
        .eq("company_id", activeCompanyId);
    } else {
      await supabase.from("technicians").insert([{
        name: trimmedName,
        skill: trimmedSpecialty,
        phone: values.phone.trim() || null,
        hire_date: values.hireDate || null,
        company_id: companyIdForWrite
      }]);
      await ensureTechnicianAdminUser(trimmedName);
    }

    const rows = await fetchTechnicians(activeCompanyId);
    setTechnicians(rows.map(mapTechnician));
    setFormOpen(false);
    setEditingTechnician(null);
    setSaving(false);
    showToast(editingTechnician ? "Técnico actualizado" : "Técnico creado", "success");
  };

  const confirmDelete = async () => {
    if (!canMutate || !deleteTarget) return;
    setDeleting(true);
    await supabase.from("technicians").delete().eq("id", deleteTarget.id).eq("company_id", activeCompanyId);
    setTechnicians((current) => current.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
    showToast("Técnico eliminado", "success");
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
          <div className="space-y-3">
            <p className={`text-xs uppercase tracking-[0.28em] ${hasCover ? "text-white/80" : "text-accent"}`}>{copy.registry}</p>
            <h1 className={`text-3xl font-semibold ${hasCover ? "text-white" : ""}`}>{copy.title}</h1>
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
                <th className="px-4 py-2 text-left align-middle">{copy.specialty}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.phone}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.hireDate}</th>
                <th className="px-4 py-2 text-right align-middle">{copy.actions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {sortedTechnicians.map((technician) => (
                <tr key={technician.id}>
                  <td className="px-4 py-2 text-left align-middle">{technician.name}</td>
                  <td className="px-4 py-2 text-left align-middle">{technician.specialty}</td>
                  <td className="px-4 py-2 text-left align-middle">{technician.phone || "-"}</td>
                  <td className="px-4 py-2 text-left align-middle">{formatDateGlobal(technician.hireDate)}</td>
                  <td className="px-4 py-2 text-right align-middle">
                    {readOnly ? (
                      <span className="text-xs text-muted">Read only</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => openEdit(technician)}>{copy.edit}</Button>
                        <Button variant="danger" onClick={() => setDeleteTarget(technician)}>
                          {copy.remove}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {sortedTechnicians.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <TechnicianFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTechnician(null); }}
        onSubmit={handleSubmit}
        initial={editingTechnician ? { name: editingTechnician.name, specialty: editingTechnician.specialty, phone: editingTechnician.phone, hireDate: editingTechnician.hireDate } : null}
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

async function ensureTechnicianAdminUser(technicianName: string) {
  const normalizedUsername = normalizeUsername(technicianName);
  if (!normalizedUsername) return;

  const { data: existing } = await supabase.from("admins").select("id, role").eq("username", normalizedUsername).maybeSingle();
  if (existing) return;

  const role = normalizedUsername === GOD_USERNAME ? "god" : "technician";

  const preferredInsert = await supabase.from("admins").insert([
    {
      username: normalizedUsername,
      password: "12345",
      role
    }
  ]);

  if (!preferredInsert.error) return;

  await supabase.from("admins").insert([
    {
      username: normalizedUsername,
      password: "12345"
    }
  ]);

  if (normalizedUsername === GOD_USERNAME) {
    await supabase.from("admins").update({ role: "god" }).eq("username", normalizedUsername);
  }
}
