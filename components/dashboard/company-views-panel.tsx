"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast-context";
import { useI18n } from "@/lib/i18n/context";
import { isGod, isReadOnlyRole } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

export function CompanyViewsPanel() {
  const { locale } = useI18n();
  const { user, setActiveCompanyId, refreshCompanies } = useSession();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const companies = user?.companies ?? [];
  const activeCompanyId = user?.activeCompanyId ?? null;

  if (companies.length === 0) {
    return null;
  }

  // Viewers should not see company switcher
  if (isReadOnlyRole(user?.role)) {
    return null;
  }

  const copy =
    locale === "en"
      ? {
          viewsGod: "Views",
          viewsAdmin: "View companies",
          availableCompanies: "Available companies",
          companyHeader: "Company",
          roleHeader: "Role",
          viewHeader: "View",
          active: "Active",
          enter: "Enter",
          remove: "Delete",
          confirmDelete: "Delete this company and all its assignments?"
        }
      : {
          viewsGod: "Vistas",
          viewsAdmin: "Ver empresas",
          availableCompanies: "Empresas disponibles",
          companyHeader: "Empresa",
          roleHeader: "Rol",
          viewHeader: "Vista",
          active: "Activa",
          enter: "Entrar",
          remove: "Eliminar",
          confirmDelete: "¿Eliminar esta empresa y todas sus asignaciones?"
        };

  const handleDeleteCompany = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    const companyId = deleteTarget.id;

    // Delete user_companies first (cascade)
    await supabase.from("user_companies").delete().eq("company_id", companyId);
    // Delete company
    const { error } = await supabase.from("companies").delete().eq("id", companyId);

    if (error) {
      showToast(locale === "en" ? "Error deleting company: " + error.message : "Error al eliminar empresa: " + error.message, "error");
    } else {
      showToast(locale === "en" ? "Company deleted" : "Empresa eliminada", "success");

      // If deleted company was active, switch to another
      if (user?.activeCompanyId === companyId) {
        const remaining = (user?.companies ?? []).filter((c) => c.id !== companyId);
        if (remaining.length > 0) {
          setActiveCompanyId(remaining[0].id);
        }
      }

      await refreshCompanies();
    }

    setDeleteTarget(null);
    setDeleteLoading(false);
  };

  return (
    <>
      <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">{user?.role === "god" ? copy.viewsGod : copy.viewsAdmin}</p>
            <h2 className="mt-2 text-xl font-semibold">{copy.availableCompanies}</h2>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
              <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2 text-left">{copy.companyHeader}</th>
                  <th className="px-4 py-2 text-left">{copy.roleHeader}</th>
                  <th className="px-4 py-2 text-right">{copy.viewHeader}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td className="px-4 py-2">{company.name}</td>
                    <td className="px-4 py-2">{company.role}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {company.id === activeCompanyId ? (
                          <span className="text-xs text-muted">{copy.active}</span>
                        ) : (
                          <Button variant="secondary" onClick={() => setActiveCompanyId(company.id)}>
                            {copy.enter}
                          </Button>
                        )}
                        {isGod(user?.role) ? (
                          <Button variant="danger" onClick={() => setDeleteTarget({ id: company.id, name: company.name ?? "" })}>
                            {copy.remove}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={locale === "en" ? "Delete Company" : "Eliminar Empresa"}
        description={(locale === "en" ? "Are you sure you want to delete " : "¿Eliminar la empresa ") + (deleteTarget?.name ?? "") + "?"}
        confirmLabel={copy.remove}
        loading={deleteLoading}
        onConfirm={handleDeleteCompany}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
