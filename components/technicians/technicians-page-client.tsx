"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

type Technician = {
  id: string;
  name: string;
  specialty: string;
};

type TechniciansPageClientProps = {
  initialTechnicians: Technician[];
};

const STORAGE_KEY = "demo-technicians";

export function TechniciansPageClient({ initialTechnicians }: TechniciansPageClientProps) {
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 🔥 LOAD
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      setTechnicians([]);
      setLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setTechnicians(parsed);
      } else {
        setTechnicians([]);
      }
    } catch {
      setTechnicians([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  // 🔥 SAVE
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(technicians));
  }, [loaded, technicians]);

  // 🔥 SORTED LIST (PRO)
  const sortedTechnicians = useMemo(() => {
    return [...technicians].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [technicians]);

  const resetForm = () => {
    setName("");
    setSpecialty("");
    setEditingId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedSpecialty = specialty.trim();

    if (!trimmedName || !trimmedSpecialty) return;

    // 🔥 EVITAR DUPLICADOS
    const exists = technicians.some(
      (t) =>
        t.name.toLowerCase() === trimmedName.toLowerCase() &&
        t.specialty.toLowerCase() === trimmedSpecialty.toLowerCase() &&
        t.id !== editingId
    );

    if (exists) return;

    if (editingId) {
      setTechnicians((current) =>
        current.map((t) =>
          t.id === editingId
            ? { ...t, name: trimmedName, specialty: trimmedSpecialty }
            : t
        )
      );
      resetForm();
      return;
    }

    const newTechnician: Technician = {
      id: crypto.randomUUID(), // 🔥 MEJOR QUE Date.now()
      name: trimmedName,
      specialty: trimmedSpecialty
    };

    setTechnicians((current) => [...current, newTechnician]);
    resetForm();
  };

  const handleEdit = (technician: Technician) => {
    setEditingId(technician.id);
    setName(technician.name);
    setSpecialty(technician.specialty);
  };

  const handleDelete = (id: string) => {
    setTechnicians((current) => current.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">
              Technician Registry
            </p>
            <h1 className="text-3xl font-semibold">Técnicos</h1>
          </div>

          <Button
            onClick={() => {
              resetForm();
            }}
          >
            Crear técnico
          </Button>
        </div>
      </Panel>

      <Panel className="p-6">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]" onSubmit={handleSubmit}>
          <input
            className="rounded-2xl border border-border px-3 py-2"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="rounded-2xl border border-border px-3 py-2"
            placeholder="Especialidad"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />

          <Button type="submit">
            {editingId ? "Guardar" : "Crear"}
          </Button>

          {editingId && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </form>
      </Panel>

      <Panel>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Especialidad</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {sortedTechnicians.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.specialty}</td>
                  <td className="text-right">
                    <Button onClick={() => handleEdit(t)}>Editar</Button>
                    <Button variant="danger" onClick={() => handleDelete(t.id)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}

              {sortedTechnicians.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-muted">
                    No hay técnicos registrados
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