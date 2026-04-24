"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

const ISHIKAWA_CATEGORIES = [
  { key: "method", label: "Método", icon: "📋" },
  { key: "machine", label: "Máquina", icon: "⚙️" },
  { key: "manpower", label: "Mano de obra", icon: "👷" },
  { key: "material", label: "Material", icon: "📦" },
  { key: "environment", label: "Medio ambiente", icon: "🌿" },
] as const;

type IshikawaValues = Record<string, string>;

type IshikawaModalProps = {
  open: boolean;
  initialValues?: IshikawaValues;
  onClose: () => void;
  onSave: (result: string) => void;
};

export function IshikawaModal({ open, initialValues, onClose, onSave }: IshikawaModalProps) {
  const [values, setValues] = useState<IshikawaValues>(() => {
    const defaults: IshikawaValues = {};
    ISHIKAWA_CATEGORIES.forEach((cat) => {
      defaults[cat.key] = initialValues?.[cat.key] ?? "";
    });
    return defaults;
  });

  const handleSave = () => {
    const parts = ISHIKAWA_CATEGORIES
      .filter((cat) => values[cat.key]?.trim())
      .map((cat) => `[${cat.label}] ${values[cat.key]!.trim()}`);

    onSave(parts.join("\n"));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Análisis Causa Raíz — Ishikawa"
      description="Identifica las causas raíz en cada categoría del diagrama de Ishikawa (espina de pescado)."
    >
      <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
        {ISHIKAWA_CATEGORIES.map((cat) => (
          <div key={cat.key} className="rounded-2xl border border-border bg-panelAlt/50 p-4 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </label>
            <Textarea
              placeholder={`Causa relacionada con ${cat.label.toLowerCase()}...`}
              value={values[cat.key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [cat.key]: e.target.value }))
              }
            />
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar análisis
          </Button>
        </div>
      </div>
    </Modal>
  );
}
