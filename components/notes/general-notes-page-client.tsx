"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { applyCompanyFilter, getScopedCompanyId } from "@/lib/company";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type GeneralNote = {
  id: string;
  content: string;
  created_at: string | null;
};

type Props = {
  initialNotes?: GeneralNote[];
};

export function GeneralNotesPageClient({ initialNotes = [] }: Props) {
  const { user } = useSession();
  const activeCompanyId = user?.activeCompanyId ?? null;
  const companyIdForWrite = getScopedCompanyId(activeCompanyId);
  const [notes, setNotes] = useState<GeneralNote[]>(initialNotes);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!activeCompanyId) {
        setNotes([]);
        return;
      }

      let query = supabase.from("notes").select("id, content, created_at");
      query = applyCompanyFilter(query, activeCompanyId);
      const response = await query.order("created_at", { ascending: false });
      setNotes((response.data ?? []) as GeneralNote[]);
    };

    void load();
  }, [activeCompanyId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent || !companyIdForWrite) return;

    setSaving(true);
    const response = await supabase
      .from("notes")
      .insert([{ content: trimmedContent, company_id: companyIdForWrite }])
      .select("id, content, created_at")
      .single();

    if (response.data) {
      setNotes((current) => [response.data as GeneralNote, ...current]);
      setContent("");
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((current) => current.filter((entry) => entry.id !== id));
  };

  return (
    <div className="space-y-6">
      <Panel className="industrial-grid overflow-hidden p-8 border-[#d6d0b8]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Bitácora general</p>
          <h1 className="text-3xl font-semibold tracking-tight">Notas por empresa</h1>
          <p className="text-sm text-muted">Registro general para incidencias, cambios operativos y comunicación del turno.</p>
        </div>
      </Panel>

      <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={activeCompanyId ? "Escribe una nota para la empresa activa..." : "Selecciona una empresa activa"}
            rows={4}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !companyIdForWrite}>
              {saving ? "Guardando..." : "Crear nota"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Nota</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {notes.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-2 align-top">{entry.created_at ? new Date(entry.created_at).toLocaleString("es-MX") : "-"}</td>
                  <td className="px-4 py-2 whitespace-pre-wrap">{entry.content}</td>
                  <td className="px-4 py-2 text-right align-top">
                    <Button variant="danger" onClick={() => handleDelete(entry.id)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
              {notes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    No hay notas registradas para esta empresa.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
