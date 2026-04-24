"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type CompanyOption = {
  id: string;
  name: string;
  role: string;
};

type UserCompanyRow = {
  company_id: string | null;
  role: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
};

export function SelectCompanyPageClient() {
  const router = useRouter();
  const { hydrated, logout, user, setActiveCompanyId } = useSession();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  useEffect(() => {
    const loadCompanies = async () => {
      if (!hydrated || !user?.id) return;

      console.log("SESSION USER ID:", user.id);

      const { data, error } = await supabase.from("user_companies").select("*").eq("user_id", user.id);

      console.log("COMPANIES:", data);

      if (error || !data) {
        setCompanies([]);
        return;
      }

      const userCompanies = (data as UserCompanyRow[]).filter((entry) => Boolean(entry.company_id));
      const companyIds = userCompanies
        .map((entry) => entry.company_id)
        .filter((companyId): companyId is string => Boolean(companyId));

      if (companyIds.length === 0) {
        setCompanies([]);
        return;
      }

      const { data: companiesData } = await supabase.from("companies").select("id, name").in("id", companyIds);
      const companiesById = new Map(
        ((companiesData ?? []) as CompanyRow[]).map((company) => [company.id, company.name ?? "Vista global"])
      );

      const nextCompanies = userCompanies.map((entry) => ({
        id: entry.company_id as string,
        name: companiesById.get(entry.company_id as string) ?? "Vista global",
        role: entry.role ?? "viewer"
      }));

      setCompanies(nextCompanies);
    };

    void loadCompanies();
  }, [hydrated, user?.id]);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.activeCompanyId) {
      router.replace("/dashboard");
    }
  }, [hydrated, router, user]);

  const emptyMessage = useMemo(() => {
    return "Sin empresas disponibles.";
  }, []);

  const handleSelectCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
    router.replace("/dashboard");
  };

  const handleBackToLogin = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center py-8">
      <Panel className="w-full max-w-2xl overflow-hidden">
        <div className="border-b border-border px-8 py-6">
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Company Access</p>
          <h1 className="mt-3 text-3xl font-semibold">Selecciona una empresa</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {companies.length > 0
              ? "Elige la empresa activa para cargar los datos del CMMS."
              : "Tu usuario todavía no tiene empresas asignadas. Pide acceso a un administrador."}
          </p>
        </div>

        <div className="space-y-3 px-8 py-8">
          {companies.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => handleSelectCompany(company.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-panelAlt px-5 py-4 text-left transition hover:border-accent hover:bg-panel"
            >
              <div>
                <p className="text-base font-medium">{company.name}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">{company.role}</p>
              </div>
              <span className="text-sm text-accent">Entrar</span>
            </button>
          ))}

          {companies.length === 0 ? <div className="rounded-2xl border border-border bg-panelAlt px-5 py-4 text-sm text-muted">{emptyMessage}</div> : null}
          {companies.length === 0 ? (
            <button
              type="button"
              onClick={() => void handleBackToLogin()}
              className="w-full rounded-2xl border border-border bg-panel px-5 py-4 text-sm font-medium transition hover:border-accent hover:text-foreground"
            >
              Volver al login
            </button>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
