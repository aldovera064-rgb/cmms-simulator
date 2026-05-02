"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type TechnicianFormValues = {
  name: string;
  specialty: string;
  phone: string;
  hireDate: string;
};

type TechnicianFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TechnicianFormValues) => Promise<void>;
  initial?: TechnicianFormValues | null;
  loading?: boolean;
  locale: "es" | "en";
};

export function TechnicianFormModal({ open, onClose, onSubmit, initial, loading, locale }: TechnicianFormModalProps) {
  const isEditing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [hireDate, setHireDate] = useState(initial?.hireDate ?? "");

  // Reset when initial changes
  const resetAndClose = () => {
    setName(initial?.name ?? "");
    setSpecialty(initial?.specialty ?? "");
    setPhone(initial?.phone ?? "");
    setHireDate(initial?.hireDate ?? "");
    onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit({ name, specialty, phone, hireDate });
  };

  const copy = locale === "en"
    ? { title: isEditing ? "Edit Technician" : "New Technician", name: "Name", specialty: "Specialty", phone: "Phone", hireDate: "Hire date", save: "Save", create: "Create", cancel: "Cancel" }
    : { title: isEditing ? "Editar Técnico" : "Nuevo Técnico", name: "Nombre", specialty: "Especialidad", phone: "Teléfono", hireDate: "Fecha de ingreso", save: "Guardar", create: "Crear", cancel: "Cancelar" };

  return (
    <Modal open={open} title={copy.title} onClose={resetAndClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm">
          <span className="text-muted">{copy.name}</span>
          <input
            className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={copy.name}
            required
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-muted">{copy.specialty}</span>
          <input
            className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder={copy.specialty}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.phone}</span>
            <input
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={copy.phone}
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">{copy.hireDate}</span>
            <input
              type="date"
              className="w-full rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={resetAndClose}>
            {copy.cancel}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "..." : isEditing ? copy.save : copy.create}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
