"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ensureSeedData, fetchTechnicians } from "@/lib/cmms-data";
import { useI18n } from "@/lib/i18n/context";
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
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

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
          empty: "No technicians"
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
          empty: "No hay técnicos registrados"
        };

  useEffect(() => {
    const load = async () => {
      await ensureSeedData();
      const rows = await fetchTechnicians();
      setTechnicians(rows.map(mapTechnician));
    };

    void load();
  }, []);

  const sortedTechnicians = useMemo(() => {
    return [...technicians].sort((a, b) => a.name.localeCompare(b.name));
  }, [technicians]);

  const resetForm = () => {
    setName("");
    setSpecialty("");
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedSpecialty = specialty.trim();

    if (!trimmedName || !trimmedSpecialty) return;

    if (editingId) {
      await supabase
        .from("technicians")
        .update({ name: trimmedName, skill: trimmedSpecialty })
        .eq("id", editingId);
    } else {
      await supabase.from("technicians").insert([{ name: trimmedName, skill: trimmedSpecialty }]);
    }

    const rows = await fetchTechnicians();
    setTechnicians(rows.map(mapTechnician));
    resetForm();
  };

  const handleEdit = (technician: Technician) => {
    setEditingId(technician.id);
    setName(technician.name);
    setSpecialty(technician.specialty);
  };

  const handleDelete = async (id: string) => {
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

          <Button onClick={resetForm}>{copy.create}</Button>
        </div>
      </Panel>

      <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]" onSubmit={handleSubmit}>
          <input
            className="rounded-2xl border border-border px-3 py-2"
            placeholder={copy.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <input
            className="rounded-2xl border border-border px-3 py-2"
            placeholder={copy.specialty}
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
          />

          <Button type="submit">{editingId ? copy.save : copy.create}</Button>

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
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => handleEdit(technician)}>{copy.edit}</Button>
                      <Button variant="danger" onClick={() => handleDelete(technician.id)}>
                        {copy.remove}
                      </Button>
                    </div>
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
