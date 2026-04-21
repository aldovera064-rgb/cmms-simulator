export function buildWorkOrderQrValue(params: {
  serialNumber: string;
  status: string;
}): string {
  const random = Math.floor(Math.random() * 99) + 1;
  return `${params.serialNumber}-${Date.now()}-${params.status}-${random}`;
}
