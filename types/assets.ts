export type AssetListItem = {
  id: string;
  tag: string;
  name: string;
  area: string;
  criticality: "A" | "B" | "C";
  status: "OPERATIVE" | "MAINTENANCE" | "OUT_OF_SERVICE";
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  startTime?: number;
  lastFailureAt: string | null;
  technicalSpecifications: string;
};

export type AssetFormValues = {
  tag: string;
  name: string;
  area: string;
  criticality: "A" | "B" | "C";
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  technicalSpecifications: string;
};

export type AssetStatus = AssetListItem["status"];

export type AssetDetail = AssetListItem & {
  description: string;
  operatingSince: string;
  baselineOperatingHours: number;
  correctiveClosedWorkOrders: Array<{
    id: string;
    number: string;
    createdAt: string;
    closedAt: string | null;
    repairTimeMinutes: number | null;
  }>;
};

export type AssetDetailUpdateInput = Partial<
  Pick<
    AssetDetail,
    | "name"
    | "area"
    | "criticality"
    | "manufacturer"
    | "model"
    | "technicalSpecifications"
    | "status"
    | "lastFailureAt"
  >
>;

export type AssetApiError = {
  error: string;
};
