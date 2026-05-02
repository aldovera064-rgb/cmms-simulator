"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AlertModal } from "@/components/ui/alert-modal";
import { Panel } from "@/components/ui/panel";
import { loadAccessibleCompanies, pickActiveCompanyId, writeActiveCompanyCookie } from "@/lib/company";
import { useI18n } from "@/lib/i18n/context";
import { resolveRole } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";
import { SessionUser } from "@/types/session";

type AdminRow = {
  id: string;
  username: string;
  country: string | null;
  role?: string | null;
};

export function LoginForm() {
  const router = useRouter();
  const { dictionary, locale, setLocale } = useI18n();
  const { hydrated, setActiveCompanyId, signIn, user } = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (hydrated && user) {
      router.replace(user.activeCompanyId ? "/dashboard" : "/select-company");
    }
  }, [hydrated, router, user]);

  const setAuthCookies = (admin: Pick<AdminRow, "username" | "country">) => {
    document.cookie = "cmms-auth=1; path=/";
    document.cookie = `cmms-user=${admin.username}; path=/`;
    document.cookie = `cmms-country=${admin.country ?? ""}; path=/`;
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const normalizedUsername = username.trim().toLowerCase();
      const preferredQuery = await supabase
        .from("admins")
        .select("id, username, country, role")
        .eq("username", normalizedUsername)
        .eq("password", password)
        .single<AdminRow>();

      let data = preferredQuery.data;
      let error = preferredQuery.error;
      let role = data?.role;

      if (error && error.message.toLowerCase().includes("role")) {
        const fallbackQuery = await supabase
          .from("admins")
          .select("id, username, country")
          .eq("username", normalizedUsername)
          .eq("password", password)
          .single<AdminRow>();
        data = fallbackQuery.data;
        error = fallbackQuery.error;
        role = "admin";
      }

      if (error || !data) {
        setAlertModal({ title: "Error", message: "Invalid credentials" });
        return;
      }

      const resolvedRole = resolveRole(data.username, role);
      const companies = await loadAccessibleCompanies(data.id, resolvedRole);
      const activeCompanyId = pickActiveCompanyId(companies, resolvedRole);

      const nextUser: SessionUser = {
        id: data.id,
        email: data.username,
        name: data.username,
        role: resolvedRole,
        technicianId: null,
        companies,
        activeCompanyId
      };

      signIn(nextUser);
      setAuthCookies(data);
      writeActiveCompanyCookie(activeCompanyId);
      if (activeCompanyId) {
        setActiveCompanyId(activeCompanyId);
      }
      router.push(activeCompanyId ? "/dashboard" : "/select-company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel className="w-full max-w-lg overflow-hidden">
      <div className="industrial-grid border-b border-border px-8 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-accent">Industrial Demo</p>
            <h1 className="mt-3 text-3xl font-semibold">{dictionary.auth.title}</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">{dictionary.auth.subtitle}</p>
          </div>

          <div className="rounded-2xl border border-border bg-panelAlt/80 p-1">
            {(["es", "en"] as const).map((value) => (
              <button
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  locale === value ? "bg-accent text-slate-950" : "text-muted"
                }`}
                key={value}
                onClick={() => setLocale(value)}
                type="button"
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form className="space-y-5 px-8 py-8" onSubmit={handleLogin}>
        <div className="space-y-2">
          <label className="text-sm text-muted" htmlFor="username">
            {dictionary.auth.username}
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-panelAlt px-4 py-3 text-sm"
            id="username"
            onChange={(event) => setUsername(event.target.value)}
            type="text"
            value={username}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted" htmlFor="password">
            {dictionary.auth.password}
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-panelAlt px-4 py-3 text-sm"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>

        <button
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? "..." : dictionary.auth.login}
        </button>
      </form>

      {alertModal && (
        <AlertModal
          open={Boolean(alertModal)}
          title={alertModal.title}
          message={alertModal.message}
          onClose={() => setAlertModal(null)}
        />
      )}
    </Panel>
  );
}
