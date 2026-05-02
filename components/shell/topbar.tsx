"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getCompanyName } from "@/lib/company";
import { useI18n } from "@/lib/i18n/context";
import { isGod } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

function normalizeCountry(value: string) {
  if (!value) return "mx";
  if (value === "mx" || value === "us" || value === "ca") return value;
  return "mx";
}

function getFlagSrc(country: string) {
  return `https://flagcdn.com/w40/${country}.png`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || "US").toUpperCase();
}

export function Topbar() {
  const router = useRouter();
  const { dictionary } = useI18n();
  const { user, signOut, setActiveCompanyId } = useSession();
  const [cookieUser, setCookieUser] = useState("");
  const [cookieCountry, setCookieCountry] = useState("mx");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const role = user?.role ?? "-";
  const companies = user?.companies ?? [];
  const canSwitchCompany = user?.role === "god" || (user?.role === "admin" && companies.length > 1);
  const activeCompanyName = useMemo(
    () => getCompanyName(companies, user?.activeCompanyId) || dictionary.shell.noCompany,
    [companies, dictionary.shell.noCompany, user?.activeCompanyId]
  );
  const switcherLabel = isGod(user?.role) ? dictionary.shell.views : dictionary.shell.activeCompany;
  const displayName = cookieUser || user?.name || "Admin";

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

    if (user?.id) {
      supabase.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
    }
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCompanyChange = (companyId: string) => {
    setActiveCompanyId(companyId);
    router.refresh();
  };

  const handleSignOut = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <header className="relative z-[9999] flex flex-col gap-4 border-b border-border bg-panel/60 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
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

        {/* Avatar + Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-2xl border border-border bg-panelAlt/80 px-3 py-2 text-sm transition hover:border-accent/50"
          >
            <img src={getFlagSrc(cookieCountry)} className="w-5 h-5 object-cover rounded-sm" alt={cookieCountry} />

            {/* Avatar circle */}
            {avatarUrl ? (
              <img src={avatarUrl} className="h-8 w-8 rounded-full object-cover border border-border" alt="Avatar" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
                {getInitials(displayName)}
              </div>
            )}

            <span className="hidden sm:inline">{displayName}</span>
            <span className="rounded-full border border-border bg-panel px-2 py-0.5 text-[11px] uppercase tracking-wide">
              {role}
            </span>

            {/* Chevron */}
            <svg className={`h-4 w-4 text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-[9999] mt-2 w-48 rounded-2xl border border-border bg-panel shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              <Link
                href="/perfil"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-panelAlt"
              >
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Perfil
              </Link>
              <button
                type="button"
                onClick={() => { setDropdownOpen(false); handleSignOut(); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-danger transition hover:bg-panelAlt"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {dictionary.shell.signOut}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
