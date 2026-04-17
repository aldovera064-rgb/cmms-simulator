"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, description, children, onClose }: ModalProps) {
  if (open !== true) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-panel border border-border bg-panel shadow-panel"
        )}
      >
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-2xl font-semibold">{title}</h2>
          {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
        </div>
        <div className="max-h-[calc(90vh-6.5rem)] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
