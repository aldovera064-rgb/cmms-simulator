"use client";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { isGod, isReadOnlyRole } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

export function CompanyViewsPanel() {
  const { user, setActiveCompanyId } = useSession();
  const companies = user?.companies ?? [];
  const activeCompanyId = user?.activeCompanyId ?? null;

  if (companies.length === 0) {
    return null;
  }

  // Viewers should not see company switcher
  if (isReadOnlyRole(user?.role)) {
    return null;
  }

  const handleDeleteCompany = async (companyId: string) => {
    if (!isGod(user?.role)) return;
    if (!confirm("¿Eliminar esta empresa y todas sus asignaciones?")) return;
    await supabase.from("user_companies").delete().eq("company_id", companyId);
    await supabase.from("companies").delete().eq("id", companyId);
    window.location.reload();
  };

  return (
    <Panel className="p-6 border-[#d6d0b8] bg-[#f8f6ea]">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">{user?.role === "god" ? "Vistas" : "Ver empresas"}</p>
          <h2 className="mt-2 text-xl font-semibold">Empresas disponibles</h2>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full border-collapse divide-y divide-border text-sm">
            <thead className="bg-[#f5f5dc] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2 text-left">Empresa</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-right">Vista</th>
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
                        <span className="text-xs text-muted">Activa</span>
                      ) : (
                        <Button variant="secondary" onClick={() => setActiveCompanyId(company.id)}>
                          Entrar
                        </Button>
                      )}
                      {isGod(user?.role) && company.id !== activeCompanyId ? (
                        <Button variant="danger" onClick={() => void handleDeleteCompany(company.id)}>
                          Eliminar
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
  );
}
