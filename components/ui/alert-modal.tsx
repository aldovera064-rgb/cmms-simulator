"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type AlertModalProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export function AlertModal({ open, title, message, onClose }: AlertModalProps) {
  return (
    <Modal onClose={onClose} open={open} title={title}>
      <p className="text-sm text-muted mb-6">{message}</p>
      <div className="flex justify-end">
        <Button onClick={onClose}>Aceptar</Button>
      </div>
    </Modal>
  );
}
