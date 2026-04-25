"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getCompanyName } from "@/lib/company";
import { useI18n } from "@/lib/i18n/context";
import { isGod } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";

function normalizeCountry(value: string) {
  if (!value) return "mx";
  if (value === "mx" || value === "us" || value === "ca") return value;
  return "mx";
}

function getFlagSrc(country: string) {
  return `https://flagcdn.com/w40/${country}.png`;
}

export function Topbar() {
  const router = useRouter();
  const { dictionary } = useI18n();
  const { user, signOut, setActiveCompanyId } = useSession();
  const [cookieUser, setCookieUser] = useState("");
  const [cookieCountry, setCookieCountry] = useState("mx");
  const role = user?.role ?? "-";
  const companies = user?.companies ?? [];
  const canSwitchCompany = user?.role === "god" || (user?.role === "admin" && companies.length > 1);
  const activeCompanyName = useMemo(
    () => getCompanyName(companies, user?.activeCompanyId) || dictionary.shell.noCompany,
    [companies, dictionary.shell.noCompany, user?.activeCompanyId]
  );
  const switcherLabel = isGod(user?.role) ? dictionary.shell.views : dictionary.shell.activeCompany;

  useEffect(() => {
    const cookies = document.cookie.split("; ").reduce<Record<string, string>>((acc, current) => {
      const [key, ...value] = current.split("=");
      if (key) {
        acc[key] = decodeURIComponent(value.join("="));
      }
      return acc;
    }, {});

    setCookieUser(cookies["cmms-user"] ?? "");
    setCookieCountry(normalizeCountry(cookies["cmms-country"] ?? ""));
  }, [user]);

  const handleCompanyChange = (companyId: string) => {
    setActiveCompanyId(companyId);
    router.refresh();
  };

  const handleSignOut = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-panel/60 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-accent">{dictionary.shell.welcome}</p>
        <p className="mt-2 text-sm text-muted">
          {dictionary.shell.sessionRole}: {role}
        </p>
        <p className="mt-1 text-sm text-muted">
          {dictionary.shell.activeCompany}: {activeCompanyName}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canSwitchCompany ? (
          <label className="flex items-center gap-2 rounded-2xl border border-border bg-panelAlt/80 px-3 py-2 text-sm">
            <span className="text-muted">{switcherLabel}</span>
            <select
              className="rounded-xl border border-border bg-panel px-3 py-2 text-sm"
              value={user?.activeCompanyId ?? ""}
              onChange={(event) => handleCompanyChange(event.target.value)}
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="rounded-2xl border border-border bg-panelAlt/80 px-3 py-2 text-sm flex items-center gap-2">
          <img src={getFlagSrc(cookieCountry)} className="w-5 h-5 object-cover" alt={cookieCountry} />
          <span>{cookieUser || user?.name || "Admin"}</span>
          <span className="rounded-full border border-border bg-panel px-2 py-0.5 text-[11px] uppercase tracking-wide">
            {role}
          </span>
        </div>

        <button
          className="rounded-2xl border border-border bg-panelAlt px-4 py-2 text-sm text-muted transition hover:text-foreground"
          onClick={handleSignOut}
          type="button"
        >
          {dictionary.shell.signOut}
        </button>
      </div>
    </header>
  );
}
