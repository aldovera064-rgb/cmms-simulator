"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
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
};

type TechniciansPageClientProps = {
  initialTechnicians: Technician[];
};

function mapTechnician(row: { id: string; name: string | null; skill: string | null }): Technician {
  return {
    id: row.id,
    name: row.name ?? "",
    specialty: row.skill ?? ""
  };
}

export function TechniciansPageClient({ initialTechnicians }: TechniciansPageClientProps) {
  const { locale } = useI18n();
  const { user } = useSession();
  const activeCompanyId = user?.activeCompanyId ?? null;
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const canMutate = canEditModule(user?.role, "technicians");
  const readOnly = !canMutate;

  const copy =
    locale === "en"
      ? {
          registry: "Technician Registry",
          title: "Technicians",
          create: "Create technician",
          save: "Save",
          cancel: "Cancel",
          name: "Name",
          specialty: "Specialty",
          actions: "Actions",
          edit: "Edit",
          remove: "Delete",
          empty: "No technicians",
          tempPassword: "Temporary password: 12345"
        }
      : {
          registry: "Registro de Técnicos",
          title: "Técnicos",
          create: "Crear técnico",
          save: "Guardar",
          cancel: "Cancelar",
          name: "Nombre",
          specialty: "Especialidad",
          actions: "Acciones",
          edit: "Editar",
          remove: "Eliminar",
          empty: "No hay técnicos registrados",
          tempPassword: "Contrasena temporal: 12345"
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

  const resetForm = () => {
    setName("");
    setSpecialty("");
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (!canMutate || !activeCompanyId) return;
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedSpecialty = specialty.trim();

    if (!trimmedName || !trimmedSpecialty) return;

    if (editingId) {
      await supabase
        .from("technicians")
        .update({ name: trimmedName, skill: trimmedSpecialty, company_id: companyIdForWrite })
        .eq("id", editingId);
    } else {
      await supabase.from("technicians").insert([{ name: trimmedName, skill: trimmedSpecialty, company_id: companyIdForWrite }]);
      await ensureTechnicianAdminUser(trimmedName);
    }

    const rows = await fetchTechnicians(activeCompanyId);
    setTechnicians(rows.map(mapTechnician));
    resetForm();
  };

  const handleEdit = (technician: Technician) => {
    if (!canMutate) return;
    setEditingId(technician.id);
    setName(technician.name);
    setSpecialty(technician.specialty);
  };

  const handleDelete = async (id: string) => {
    if (!canMutate) return;
    await supabase.from("technicians").delete().eq("id", id);
    setTechnicians((current) => current.filter((technician) => technician.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8 border-[#d6d0b8]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">{copy.registry}</p>
            <h1 className="text-3xl font-semibold">{copy.title}</h1>
          </div>

          {canMutate ? <Button onClick={resetForm}>{copy.create}</Button> : null}
        </div>
      </Panel>

      <Panel className="p-4 border-[#d6d0b8] bg-[#f8f6ea]">
        <p className="text-sm text-muted">{copy.tempPassword ?? "Temporary password: 12345"}</p>
      </Panel>

      <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]" onSubmit={handleSubmit}>
          <input
            className="rounded-2xl border border-border px-3 py-2"
            placeholder={copy.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={readOnly}
          />

          <input
            className="rounded-2xl border border-border px-3 py-2"
            placeholder={copy.specialty}
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            disabled={readOnly}
          />

          <Button type="submit" disabled={readOnly}>
            {editingId ? copy.save : copy.create}
          </Button>

          {editingId ? (
            <Button type="button" variant="secondary" onClick={resetForm}>
              {copy.cancel}
            </Button>
          ) : null}
        </form>
      </Panel>

      <Panel className="border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left align-middle">{copy.name}</th>
                <th className="px-4 py-2 text-left align-middle">{copy.specialty}</th>
                <th className="px-4 py-2 text-right align-middle">{copy.actions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {sortedTechnicians.map((technician) => (
                <tr key={technician.id}>
                  <td className="px-4 py-2 text-left align-middle">{technician.name}</td>
                  <td className="px-4 py-2 text-left align-middle">{technician.specialty}</td>
                  <td className="px-4 py-2 text-right align-middle">
                    {readOnly ? (
                      <span className="text-xs text-muted">Read only</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => handleEdit(technician)}>{copy.edit}</Button>
                        <Button variant="danger" onClick={() => handleDelete(technician.id)}>
                          {copy.remove}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {sortedTechnicians.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-muted">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

async function ensureTechnicianAdminUser(technicianName: string) {
  const normalizedUsername = normalizeUsername(technicianName);
  if (!normalizedUsername) return;

  const { data: existing } = await supabase.from("admins").select("id, role").eq("username", normalizedUsername).maybeSingle();
  if (existing) return;

  const role = normalizedUsername === GOD_USERNAME ? "god" : "technician";
  console.log("ROLE:", role);

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
