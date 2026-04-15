"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssetFormValues, AssetListItem } from "@/types/assets";

type AssetFormModalProps = {
  open: boolean;
  asset?: AssetListItem | null;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: AssetFormValues) => void;
};

const emptyValues: AssetFormValues = {
  tag: "",
  name: "",
  area: "",
  criticality: "C",
  manufacturer: "",
  model: "",
  serialNumber: "",
  installationDate: "",
  technicalSpecifications: ""
};

export function AssetFormModal({
  open,
  asset,
  loading,
  error,
  onClose,
  onSubmit
}: AssetFormModalProps) {
  const [values, setValues] = useState<AssetFormValues>(emptyValues);

  useEffect(() => {
    if (!asset) {
      setValues(emptyValues);
      return;
    }

    setValues({
      tag: asset.tag,
      name: asset.name,
      area: asset.area,
      criticality: asset.criticality,
      manufacturer: asset.manufacturer,
      model: asset.model,
      serialNumber: asset.serialNumber,
      installationDate: asset.installationDate.slice(0, 10),
      technicalSpecifications: asset.technicalSpecifications
    });
  }, [asset, open]);

  const title = asset ? "Editar activo" : "Nuevo activo";

  return (
    <Modal
      description="Captura la informacion principal del activo para el simulador."
      onClose={onClose}
      open={open}
      title={title}
    >
      <form
        className="max-h-[70vh] overflow-y-auto pr-2 space-y-6 bg-panelAlt/40 rounded-xl backdrop-blur-sm scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="TAG *">
            <Input
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  tag: event.target.value.toUpperCase()
                }))
              }
              placeholder="MX-PMP-103"
              required
              value={values.tag}
            />
          </Field>
          <Field label="Nombre">
            <Input
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Bomba de proceso"
              value={values.name}
            />
          </Field>
          <Field label="Area">
            <Input
              onChange={(event) =>
                setValues((current) => ({ ...current, area: event.target.value }))
              }
              placeholder="Produccion"
              value={values.area}
            />
          </Field>
          <Field label="Criticidad">
            <Select
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  criticality: event.target.value as AssetFormValues["criticality"]
                }))
              }
              value={values.criticality}
            >
              <option value="A">A - Alta</option>
              <option value="B">B - Media</option>
              <option value="C">C - Baja</option>
            </Select>
          </Field>
          <Field label="Fabricante">
            <Input
              onChange={(event) =>
                setValues((current) => ({ ...current, manufacturer: event.target.value }))
              }
              value={values.manufacturer}
            />
          </Field>
          <Field label="Modelo">
            <Input
              onChange={(event) =>
                setValues((current) => ({ ...current, model: event.target.value }))
              }
              value={values.model}
            />
          </Field>
          <Field label="Serie">
            <Input
              onChange={(event) =>
                setValues((current) => ({ ...current, serialNumber: event.target.value }))
              }
              value={values.serialNumber}
            />
          </Field>
          <Field label="Fecha instalacion">
            <Input
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  installationDate: event.target.value
                }))
              }
              type="date"
              value={values.installationDate}
            />
          </Field>
        </div>

        <Field label="Especificaciones">
          <Textarea
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                technicalSpecifications: event.target.value
              }))
            }
            placeholder="Especificaciones tecnicas relevantes del activo"
            value={values.technicalSpecifications}
          />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={loading} type="submit">
            {loading ? "Guardando..." : asset ? "Guardar cambios" : "Crear activo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}
