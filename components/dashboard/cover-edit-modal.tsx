"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-context";
import { useCover } from "@/lib/cover-context";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type CoverEditModalProps = {
  open: boolean;
  onClose: () => void;
};

type TabMode = "upload" | "url";

export function CoverEditModal({ open, onClose }: CoverEditModalProps) {
  const { user } = useSession();
  const { cover, refreshCover } = useCover();
  const { showToast } = useToast();
  const activeCompanyId = user?.activeCompanyId ?? null;

  const [tab, setTab] = useState<TabMode>("upload");
  const [urlInput, setUrlInput] = useState(cover.url || "");
  const [previewUrl, setPreviewUrl] = useState(cover.url || "");
  const [position, setPosition] = useState(cover.position || "50% 50%");
  const [scale, setScale] = useState(cover.scale || 1.0);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const positionParts = position.split(" ").map((p) => parseFloat(p) || 50);
  const posX = positionParts[0] ?? 50;
  const posY = positionParts[1] ?? 50;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 2 * 1024 * 1024) {
      showToast("Imagen máximo 2MB", "error");
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setTab("upload");
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      setPreviewUrl(urlInput.trim());
      setFile(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX, posY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
    const newX = Math.min(100, Math.max(0, dragStartRef.current.posX - dx));
    const newY = Math.min(100, Math.max(0, dragStartRef.current.posY - dy));
    setPosition(`${newX.toFixed(0)}% ${newY.toFixed(0)}%`);
  };

  const handleMouseUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  /** Log cover changes to bitácora (notes table) */
  const logCoverAction = async (action: "cover_update" | "cover_deleted", coverUrl?: string) => {
    if (!activeCompanyId) return;
    const message = action === "cover_update" ? "Portada actualizada" : "Portada eliminada";
    await supabase.from("notes").insert({
      company_id: activeCompanyId,
      message,
      type: "system",
      metadata: { action, ...(coverUrl ? { cover_url: coverUrl } : {}) }
    });
  };

  const handleSave = async () => {
    if (!activeCompanyId) return;
    setSaving(true);

    let finalUrl = previewUrl;

    try {
      // If a file was selected, upload to Supabase Storage
      if (file) {
        const filePath = `company-${activeCompanyId}`;
        const { error: uploadError } = await supabase.storage
          .from("covers")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          showToast("Error al subir imagen: " + uploadError.message, "error");
          setSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("covers")
          .getPublicUrl(filePath);

        finalUrl = publicUrlData.publicUrl + "?t=" + Date.now();
      }

      // Upsert to dashboard_covers
      const { error } = await supabase
        .from("dashboard_covers")
        .upsert(
          {
            company_id: activeCompanyId,
            cover_url: finalUrl,
            cover_position: position,
            cover_scale: scale,
            updated_at: new Date().toISOString()
          },
          { onConflict: "company_id" }
        );

      if (error) {
        showToast("Error al guardar: " + error.message, "error");
      } else {
        await logCoverAction("cover_update", finalUrl);
        showToast("Portada actualizada", "success");
        await refreshCover();
        onClose();
      }
    } catch {
      showToast("Error inesperado", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCompanyId) return;
    setDeleting(true);

    try {
      // Delete from dashboard_covers table
      await supabase
        .from("dashboard_covers")
        .delete()
        .eq("company_id", activeCompanyId);

      // Remove file from Supabase Storage
      await supabase.storage
        .from("covers")
        .remove([`company-${activeCompanyId}`]);

      // Log to bitácora
      await logCoverAction("cover_deleted");

      showToast("Portada eliminada", "success");
      await refreshCover();
      setPreviewUrl("");
      setFile(null);
      setConfirmDeleteOpen(false);
      onClose();
    } catch {
      showToast("Error al eliminar portada", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal open={open} title="Editar portada" description="Sube o pega una URL de imagen para personalizar la portada." onClose={onClose}>
        <div className="space-y-5">
          {/* Tab selector */}
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === "upload" ? "bg-accent text-white" : "border border-border bg-panel text-foreground"
              }`}
              onClick={() => setTab("upload")}
            >
              Subir imagen
            </button>
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === "url" ? "bg-accent text-white" : "border border-border bg-panel text-foreground"
              }`}
              onClick={() => setTab("url")}
            >
              Pegar URL
            </button>
          </div>

          {/* Upload tab */}
          {tab === "upload" && (
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              />
              <p className="text-xs text-muted">Máximo 2MB. Formatos: JPG, PNG, WebP</p>
            </div>
          )}

          {/* URL tab */}
          {tab === "url" && (
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-2xl border border-border bg-panelAlt px-3 py-2.5 text-sm outline-none focus:border-accent"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Button onClick={handleUrlSubmit} variant="secondary">
                Previsualizar
              </Button>
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <div
              ref={containerRef}
              className="relative h-48 w-full overflow-hidden rounded-xl border border-border cursor-move select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={previewUrl}
                alt="Preview"
                className="absolute inset-0 h-full w-full pointer-events-none"
                style={{
                  objectFit: "cover",
                  objectPosition: position,
                  transform: `scale(${scale})`,
                  transformOrigin: position
                }}
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 pointer-events-none" />
              <p className="absolute bottom-2 left-3 text-xs text-white/80 pointer-events-none">
                Arrastra para mover
              </p>
            </div>
          )}

          {/* Zoom slider */}
          <label className="block space-y-2 text-sm">
            <span className="text-muted">Zoom: {scale.toFixed(1)}×</span>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
          </label>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {/* Delete cover button - left side */}
            {cover.url ? (
              <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
                Eliminar portada
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !previewUrl}>
                {saving ? "Guardando..." : "Guardar portada"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Eliminar portada"
        description="¿Estás seguro de eliminar la portada? Se restaurará la vista por defecto."
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
