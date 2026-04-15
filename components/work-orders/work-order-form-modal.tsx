"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WorkOrderCreateInput } from "@/types/work-orders";

type AssetOption = {
  id: string;
  tag: string;
  name: string;
};

type WorkOrderFormModalProps = {
  open: boolean;
  assets: AssetOption[];
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: WorkOrderCreateInput) => void;
};

const initialValues: WorkOrderCreateInput = {
  assetId: "",
  type: "CORRECTIVE",
  priority: "P3",
  description: "",
  technicianName: ""
};

export function WorkOrderFormModal({
  open,
  assets,
  loading,
  error,
  onClose,
  onSubmit
}: WorkOrderFormModalProps) {
  const [values, setValues] = useState<WorkOrderCreateInput>(initialValues);
  const [search, setSearch] = useState("");

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return assets;
    }

    return assets.filter((asset) =>
      `${asset.tag} ${asset.name}`.toLowerCase().includes(query)
    );
  }, [assets, search]);

  const closeModal = () => {
    if (loading) {
      return;
    }

    setValues(initialValues);
    setSearch("");
    onClose();
  };

  return (
    <Modal
      description="Registra una orden de trabajo real ligada a un activo del sistema."
      onClose={closeModal}
      open={open}
      title="Nueva OT"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm text-muted">Buscar activo por TAG</span>
          <Input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="MX-PMP-101"
            value={search}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-muted">Activo</span>
          <Select
            onChange={(event) =>
              setValues((current) => ({ ...current, assetId: event.target.value }))
            }
            required
            value={values.assetId}
          >
            <option value="">Selecciona un activo</option>
            {filteredAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.tag} - {asset.name}
              </option>
            ))}
          </Select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-muted">Tipo</span>
            <Select
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  type: event.target.value as WorkOrderCreateInput["type"]
                }))
              }
              value={values.type}
            >
              <option value="CORRECTIVE">Correctivo</option>
              <option value="PREVENTIVE">Preventivo</option>
              <option value="PREDICTIVE">Predictivo</option>
            </Select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-muted">Prioridad</span>
            <Select
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  priority: event.target.value as WorkOrderCreateInput["priority"]
                }))
              }
              value={values.priority}
            >
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </Select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-muted">Tecnico</span>
          <Input
            onChange={(event) =>
              setValues((current) => ({ ...current, technicianName: event.target.value }))
            }
            placeholder="Nombre del tecnico"
            value={values.technicianName}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-muted">Descripcion</span>
          <Textarea
            onChange={(event) =>
              setValues((current) => ({ ...current, description: event.target.value }))
            }
            required
            value={values.description}
          />
        </label>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={closeModal} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={loading} type="submit">
            {loading ? "Creando..." : "Crear OT"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
