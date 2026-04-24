import { AssetCriticality, AssetStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  AssetDetail,
  AssetDetailUpdateInput,
  AssetFormValues,
  AssetListItem
} from "@/types/assets";

function normalizeAsset(asset: {
  id: string;
  tag: string;
  name: string;
  area: string;
  criticality: AssetCriticality;
  status: AssetStatus;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate: Date;
  lastFailureAt: Date | null;
  technicalSpecifications: string;
}): AssetListItem {
  return {
    id: asset.id,
    tag: asset.tag,
    name: asset.name,
    area: asset.area,
    criticality: asset.criticality,
    status: asset.status,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serialNumber,
    installationDate: asset.installationDate.toISOString(),
    lastFailureAt: asset.lastFailureAt?.toISOString() ?? null,
    technicalSpecifications: asset.technicalSpecifications,
    temperature: null,
    vibration: null,
    currentVal: null,
    pressure: null,
    alertThreshold: null,
    cbmEnabled: false,
    severity: 1,
    occurrence: 1,
    detection: 1
  };
}

function normalizeAssetDetail(asset: {
  id: string;
  tag: string;
  name: string;
  description: string;
  area: string;
  criticality: AssetCriticality;
  status: AssetStatus;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate: Date;
  lastFailureAt: Date | null;
  technicalSpecifications: string;
  operatingSince: Date;
  baselineOperatingHours: number;
  workOrders: Array<{
    id: string;
    number: string;
    createdAt: Date;
    closedAt: Date | null;
    repairTimeMinutes: number | null;
  }>;
}): AssetDetail {
  return {
    ...normalizeAsset(asset),
    description: asset.description,
    operatingSince: asset.operatingSince.toISOString(),
    baselineOperatingHours: asset.baselineOperatingHours,
    correctiveClosedWorkOrders: asset.workOrders.map((workOrder) => ({
      id: workOrder.id,
      number: workOrder.number,
      createdAt: workOrder.createdAt.toISOString(),
      closedAt: workOrder.closedAt?.toISOString() ?? null,
      repairTimeMinutes: workOrder.repairTimeMinutes
    }))
  };
}

export async function getAssets() {
  if (process.env.VERCEL_ENV === "production") {
    return [];
  }

  const assets = await prisma.asset.findMany({
    orderBy: [{ criticality: "asc" }, { tag: "asc" }],
    select: {
      id: true,
      tag: true,
      name: true,
      area: true,
      criticality: true,
      status: true,
      manufacturer: true,
      model: true,
      serialNumber: true,
      installationDate: true,
      lastFailureAt: true,
      technicalSpecifications: true
    }
  });

  return assets.map(normalizeAsset);
}

export async function getAssetById(id: string) {
    if (process.env.VERCEL_ENV === "production") {
    return null;
  }

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      id: true,
      tag: true,
      name: true,
      description: true,
      area: true,
      criticality: true,
      status: true,
      manufacturer: true,
      model: true,
      serialNumber: true,
      installationDate: true,
      lastFailureAt: true,
      technicalSpecifications: true,
      operatingSince: true,
      baselineOperatingHours: true,
      workOrders: {
        where: {
          type: "CORRECTIVE",
          status: "CLOSED"
        },
        orderBy: {
          createdAt: "asc"
        },
        select: {
          id: true,
          number: true,
          createdAt: true,
          closedAt: true,
          repairTimeMinutes: true
        }
      }
    }
  });

  if (!asset) {
    return null;
  }

  return normalizeAssetDetail(asset);
}

export function parseAssetPayload(payload: Partial<AssetFormValues>) {
  const tag = payload.tag?.trim().toUpperCase() ?? "";
  const name = payload.name?.trim() ?? "";
  const area = payload.area?.trim() ?? "";
  const manufacturer = payload.manufacturer?.trim() ?? "";
  const model = payload.model?.trim() ?? "";
  const serialNumber = payload.serialNumber?.trim() ?? "";
  const technicalSpecifications = payload.technicalSpecifications?.trim() ?? "";
  const criticality = payload.criticality ?? "C";
  const installationDate =
    payload.installationDate && !Number.isNaN(Date.parse(payload.installationDate))
      ? new Date(payload.installationDate)
      : new Date();

  if (!tag) {
    return {
      error: "El TAG es obligatorio."
    };
  }

  if (!["A", "B", "C"].includes(criticality)) {
    return {
      error: "Criticidad invalida."
    };
  }

  return {
    data: {
      tag,
      name,
      description: name || `Activo ${tag}`,
      area,
      criticality: criticality as AssetCriticality,
      status: AssetStatus.OPERATIVE,
      manufacturer,
      model,
      serialNumber,
      installationDate,
      lastFailureAt: null,
      technicalSpecifications,
      operatingSince: installationDate,
      baselineOperatingHours: 0
    }
  };
}

export function parseAssetDetailUpdatePayload(payload: AssetDetailUpdateInput) {
  const data: {
    name?: string;
    description?: string;
    area?: string;
    criticality?: AssetCriticality;
    manufacturer?: string;
    model?: string;
    technicalSpecifications?: string;
    status?: AssetStatus;
    lastFailureAt?: Date | null;
  } = {};

  if (payload.name !== undefined) {
    data.name = payload.name.trim();
    data.description = data.name || undefined;
  }

  if (payload.area !== undefined) {
    data.area = payload.area.trim();
  }

  if (payload.criticality !== undefined) {
    if (!["A", "B", "C"].includes(payload.criticality)) {
      return { error: "Criticidad invalida." };
    }

    data.criticality = payload.criticality as AssetCriticality;
  }

  if (payload.manufacturer !== undefined) {
    data.manufacturer = payload.manufacturer.trim();
  }

  if (payload.model !== undefined) {
    data.model = payload.model.trim();
  }

  if (payload.technicalSpecifications !== undefined) {
    data.technicalSpecifications = payload.technicalSpecifications.trim();
  }

  if (payload.status !== undefined) {
    if (!["OPERATIVE", "MAINTENANCE", "OUT_OF_SERVICE"].includes(payload.status)) {
      return { error: "Estado invalido." };
    }

    data.status = payload.status as AssetStatus;
  }

  if (payload.lastFailureAt !== undefined) {
    if (payload.lastFailureAt === null) {
      data.lastFailureAt = null;
    } else if (!Number.isNaN(Date.parse(payload.lastFailureAt))) {
      data.lastFailureAt = new Date(payload.lastFailureAt);
    } else {
      return { error: "Fecha de falla invalida." };
    }
  }

  if (Object.keys(data).length === 0) {
    return { error: "No hay campos para actualizar." };
  }

  return { data };
}
