"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  variant?: "danger" | "warning" | "info";
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  loading,
  variant = "danger",
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  const buttonVariant = variant === "danger" ? "danger" : variant === "warning" ? "secondary" : "primary";
  const loadingLabel = variant === "danger" ? "Eliminando..." : "Procesando...";

  return (
    <Modal description={description} onClose={onCancel} open={open} title={title}>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={loading} onClick={onConfirm} variant={buttonVariant}>
          {loading ? loadingLabel : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
