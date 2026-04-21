import { jsPDF } from "jspdf";

type ExportWorkOrderPdfInput = {
  id: string;
  assetName: string;
  technicianName: string;
  description: string;
  rootCause: string;
  actionTaken: string;
  startedAt: string | null;
  completedAt: string | null;
  date: string;
};

function buildDuration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return "N/A";
  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (durationMs <= 0) return "N/A";
  const minutes = Math.round(durationMs / 60000);
  return `${minutes} min`;
}

export function exportWorkOrderPdf(input: ExportWorkOrderPdfInput) {
  const pdf = new jsPDF();

  pdf.setFontSize(16);
  pdf.text(`OT ${input.id}`, 16, 18);
  pdf.setFontSize(11);
  pdf.text(`Activo: ${input.assetName || "-"}`, 16, 30);
  pdf.text(`Tecnico: ${input.technicianName || "-"}`, 16, 38);
  pdf.text(`Fecha: ${input.date}`, 16, 46);
  pdf.text(`Duracion: ${buildDuration(input.startedAt, input.completedAt)}`, 16, 54);

  pdf.text("Descripcion:", 16, 68);
  pdf.text(input.description || "-", 16, 76, { maxWidth: 178 });

  pdf.text("Causa raiz:", 16, 106);
  pdf.text(input.rootCause || "-", 16, 114, { maxWidth: 178 });

  pdf.text("Accion tomada:", 16, 144);
  pdf.text(input.actionTaken || "-", 16, 152, { maxWidth: 178 });

  pdf.save(`OT_${input.id}.pdf`);
}
