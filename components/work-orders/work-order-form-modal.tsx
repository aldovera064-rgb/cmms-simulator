"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/context";
import { WorkOrderCreateInput } from "@/types/work-orders";

type AssetOption = {
  id: string;
  tag: string;
  name: string;
};

type TechnicianOption = {
  id: string;
  name: string;
};

type WorkOrderFormModalProps = {
  open: boolean;
  assets: AssetOption[];
  technicians: TechnicianOption[];
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
  technicians,
  loading,
  error,
  onClose,
  onSubmit
}: WorkOrderFormModalProps) {
  const { locale } = useI18n();
  const [values, setValues] = useState<WorkOrderCreateInput>(initialValues);
  const [search, setSearch] = useState("");

  const copy =
    locale === "en"
      ? {
          title: "New Work Order",
          description: "Register a real work order linked to an asset.",
          searchAsset: "Search asset by TAG",
          asset: "Asset",
          selectAsset: "Select an asset",
          type: "Type",
          priority: "Priority",
          technician: "Technician",
          selectTechnician: "Select a technician",
          noTechnicians: "No technicians available",
          details: "Description",
          cancel: "Cancel",
          create: "Create WO",
          creating: "Creating..."
        }
      : {
          title: "Nueva OT",
          description: "Registra una orden de trabajo real ligada a un activo del sistema.",
          searchAsset: "Buscar activo por TAG",
          asset: "Activo",
          selectAsset: "Selecciona un activo",
          type: "Tipo",
          priority: "Prioridad",
          technician: "Técnico",
          selectTechnician: "Selecciona un técnico",
          noTechnicians: "Sin técnicos disponibles",
          details: "Descripción",
          cancel: "Cancelar",
          create: "Crear OT",
          creating: "Creando..."
        };

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return assets;
    }

    return assets.filter((asset) => `${asset.tag} ${asset.name}`.toLowerCase().includes(query));
  }, [assets, search]);

  const closeModal = () => {
    if (loading) return;

    setValues(initialValues);
    setSearch("");
    onClose();
  };

  return (
    <Modal description={copy.description} onClose={closeModal} open={open} title={copy.title}>
      <form
        className="space-y-5 max-h-[75vh] overflow-y-auto pr-1"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm text-muted">{copy.searchAsset}</span>
          <Input onChange={(event) => setSearch(event.target.value)} placeholder="MX-PMP-101" value={search} />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-muted">{copy.asset}</span>
          <Select
            onChange={(event) => setValues((current) => ({ ...current, assetId: event.target.value }))}
            required
            value={values.assetId}
          >
            <option value="">{copy.selectAsset}</option>
            {filteredAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.tag} - {asset.name}
              </option>
            ))}
          </Select>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-muted">{copy.type}</span>
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
            <span className="text-sm text-muted">{copy.priority}</span>
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
          <span className="text-sm text-muted">{copy.technician}</span>
          <Select
            onChange={(event) =>
              setValues((current) => ({ ...current, technicianName: event.target.value }))
            }
            value={values.technicianName}
          >
            <option value="">{copy.selectTechnician}</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.name}>
                {technician.name}
              </option>
            ))}
          </Select>
          {technicians.length === 0 ? <p className="text-xs text-muted">{copy.noTechnicians}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-muted">{copy.details}</span>
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
            {copy.cancel}
          </Button>
          <Button disabled={loading} type="submit">
            {loading ? copy.creating : copy.create}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
