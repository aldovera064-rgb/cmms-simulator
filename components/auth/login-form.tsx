"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import { loadAccessibleCompanies, pickActiveCompanyId, writeActiveCompanyCookie } from "@/lib/company";
import { useI18n } from "@/lib/i18n/context";
import { GOD_USERNAME, ROLE_ORDER, UserRole, normalizeRole, normalizeUsername, resolveRole } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";
import { SessionUser } from "@/types/session";

const COUNTRIES = ["mx", "us", "ca", "pride"] as const;

type Country = (typeof COUNTRIES)[number];

type AdminRow = {
  id: string;
  username: string;
  password: string;
  country: string | null;
  role?: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
};

const COUNTRY_OPTIONS: Country[] = ["mx", "us", "ca", "pride"];
const SIGNUP_ROLE_OPTIONS = ROLE_ORDER.filter((role) => role !== "god");

function getFlagSrc(country: string) {
  if (country === "pride") return "/flags/pride.svg";
  return `https://flagcdn.com/w40/${country}.png`;
}

function isRoleColumnMissing(message: string) {
  return message.toLowerCase().includes("role");
}

async function createAdmin(username: string, password: string, country: string, role: UserRole) {
  if (password.length < 5) {
    alert("Password must be at least 5 characters");
    return null;
  }

  if (!COUNTRIES.includes(country as Country)) {
    alert("Invalid country selection");
    return null;
  }

  const normalizedUsername = normalizeUsername(username);

  const { data: existing } = await supabase.from("admins").select("id").eq("username", normalizedUsername).maybeSingle();

  if (existing) {
    alert("User already exists");
    return null;
  }

  console.log("ROLE:", role);

  const preferredInsert = await supabase
    .from("admins")
    .insert([
      {
        username: normalizedUsername,
        password,
        country,
        role: normalizedUsername === GOD_USERNAME ? "god" : role
      }
    ])
    .select("id, username, password, country, role")
    .single<AdminRow>();

  if (!preferredInsert.error && preferredInsert.data) {
    return preferredInsert.data;
  }

  if (preferredInsert.error && isRoleColumnMissing(preferredInsert.error.message)) {
    const fallbackInsert = await supabase
      .from("admins")
      .insert([
        {
          username: normalizedUsername,
          password,
          country
        }
      ])
      .select("id, username, password, country")
      .single<AdminRow>();

    if (!fallbackInsert.error && fallbackInsert.data) {
      return fallbackInsert.data;
    }
  }

  alert("Could not create account");
  return null;
}

async function createCompanyForUser(userId: string, companyName: string) {
  try {
    if (!userId) {
      throw new Error("Missing user id");
    }

    const trimmedName = companyName.trim();
    if (!trimmedName) {
      throw new Error("Missing company name");
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert([{ name: trimmedName, created_by: userId }])
      .select("id, name")
      .single<CompanyRow>();

    if (companyError || !company) {
      throw companyError ?? new Error("Company was not returned");
    }

    const { error: relationError } = await supabase.from("user_companies").insert([
      {
        user_id: userId,
        company_id: company.id,
        role: "admin"
      }
    ]);

    if (relationError) {
      throw relationError;
    }

    return company;
  } catch (error) {
    console.error("CREATE COMPANY ERROR:", error);
    alert("No se pudo crear empresa");
    return null;
  }
}

export function LoginForm() {
  const router = useRouter();
  const { dictionary, locale, setLocale } = useI18n();
  const { hydrated, signIn, user, signOut } = useSession();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [signupRole, setSignupRole] = useState<UserRole>("viewer");
  const [shouldCreateCompany, setShouldCreateCompany] = useState<"yes" | "no">("yes");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState("");

  useEffect(() => {
    if (hydrated && user) {
      router.replace("/dashboard");
    }
  }, [hydrated, router, user]);

  const blockedAccessMessage =
    locale === "en"
      ? "Your account has been created successfully. An administrator must assign you to a company before you can access the system."
      : "Tu cuenta ha sido creada correctamente. Un administrador debe asignarte a una empresa antes de acceder al sistema.";

  const setAuthCookies = (admin: Pick<AdminRow, "username" | "country">) => {
    document.cookie = "cmms-auth=1; path=/";
    document.cookie = `cmms-user=${admin.username}; path=/`;
    document.cookie = `cmms-country=${admin.country ?? ""}; path=/`;
  };

  const persistSessionAndRedirect = async (
    admin: Pick<AdminRow, "id" | "username" | "country" | "role">,
    roleColumnExists: boolean,
    preferredCompanyId?: string | null
  ) => {
    const resolvedRole = roleColumnExists ? resolveRole(admin.username, admin.role) : resolveRole(admin.username, "admin");
    console.log("ROLE:", roleColumnExists ? admin.role : "admin");

    const companies = await loadAccessibleCompanies(admin.id, resolvedRole);

    if (resolvedRole !== "god" && companies.length === 0) {
      signOut();
      setSignupMessage(blockedAccessMessage);
      return;
    }

    const activeCompanyId = pickActiveCompanyId(companies, preferredCompanyId);
    const nextUser: SessionUser = {
      id: admin.id,
      email: admin.username,
      name: admin.username,
      role: resolvedRole,
      technicianId: null,
      companies,
      activeCompanyId
    };

    signIn(nextUser);
    setAuthCookies(admin);
    writeActiveCompanyCookie(activeCompanyId);
    window.location.href = "/dashboard";
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSignupMessage("");

    try {
      const normalizedUsername = normalizeUsername(username);

      let data: AdminRow | null = null;
      let error: { message: string } | null = null;
      let roleColumnExists = true;

      const preferredQuery = await supabase
        .from("admins")
        .select("id, username, password, country, role")
        .eq("username", normalizedUsername)
        .eq("password", password)
        .single<AdminRow>();

      data = preferredQuery.data;
      error = preferredQuery.error;

      if (error && isRoleColumnMissing(error.message)) {
        roleColumnExists = false;
        const fallbackQuery = await supabase
          .from("admins")
          .select("id, username, password, country")
          .eq("username", normalizedUsername)
          .eq("password", password)
          .single<AdminRow>();

        data = fallbackQuery.data;
        error = fallbackQuery.error;
      }

      if (error || !data) {
        alert("Invalid credentials");
        return;
      }

      if (normalizedUsername === GOD_USERNAME && normalizeRole(data.role) !== "god") {
        await supabase.from("admins").update({ role: "god" }).eq("id", data.id);
        data.role = "god";
      }

      await persistSessionAndRedirect(data, roleColumnExists);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    setSignupMessage("");

    try {
      const requestedRole = shouldCreateCompany === "yes" ? "admin" : signupRole;
      const created = await createAdmin(username, password, country, requestedRole);
      if (!created) return;

      if (shouldCreateCompany === "yes") {
        const company = await createCompanyForUser(created.id, companyName);
        if (!company) return;

        console.log("ROLE:", "admin");
        await supabase.from("admins").update({ role: "admin" }).eq("id", created.id);
        await persistSessionAndRedirect({ ...created, role: "admin" }, true, company.id);
        return;
      }

      setSignupMessage(blockedAccessMessage);
      setMode("login");
      setPassword("");
      setCompanyName("");
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

      <div className="grid grid-cols-2 gap-2 border-b border-border bg-panelAlt/50 px-8 py-4">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "login" ? "bg-accent text-white" : "border border-border bg-panel text-foreground"
          }`}
        >
          {dictionary.auth.loginMode}
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "signup" ? "bg-accent text-white" : "border border-border bg-panel text-foreground"
          }`}
        >
          {dictionary.auth.signupMode}
        </button>
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
          <p className="text-xs text-muted">{dictionary.auth.passwordMin}</p>
        </div>

        {mode === "signup" ? (
          <>
            <div className="space-y-2">
              <label className="text-sm text-muted">{dictionary.auth.country}</label>
              <div className="grid grid-cols-4 gap-3">
                {COUNTRY_OPTIONS.map((option) => {
                  const selected = country === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCountry(option)}
                      className={`h-12 w-12 flex items-center justify-center rounded-lg border transition ${
                        selected ? "border-green-600 bg-green-50" : "border-border bg-panel hover:bg-neutral-100"
                      }`}
                    >
                      <img src={getFlagSrc(option)} className="w-6 h-6 object-contain" alt={option} />
                    </button>
                  );
                })}
              </div>
              {!country ? <p className="text-xs text-muted">{dictionary.auth.selectCountry}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted">Rol</label>
              <select
                className="w-full rounded-2xl border border-border bg-panelAlt px-4 py-3 text-sm"
                value={signupRole}
                onChange={(event) => setSignupRole(normalizeRole(event.target.value))}
              >
                {SIGNUP_ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-panelAlt/60 p-4">
              <p className="text-sm font-medium text-foreground">¿Crear empresa?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShouldCreateCompany("yes")}
                  className={`rounded-xl border px-4 py-2 text-sm ${
                    shouldCreateCompany === "yes" ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setShouldCreateCompany("no")}
                  className={`rounded-xl border px-4 py-2 text-sm ${
                    shouldCreateCompany === "no" ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  No
                </button>
              </div>

              {shouldCreateCompany === "yes" ? (
                <div className="space-y-2">
                  <label className="text-sm text-muted">Empresa</label>
                  <input
                    className="w-full rounded-2xl border border-border bg-panel px-4 py-3 text-sm"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Nombre de la empresa"
                  />
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {signupMessage ? <p className="rounded-2xl border border-border bg-panelAlt/60 px-4 py-3 text-sm text-muted">{signupMessage}</p> : null}

        <p className="text-sm text-muted">{dictionary.auth.helper}</p>

        {mode === "login" ? (
          <button
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? "..." : dictionary.auth.login}
          </button>
        ) : (
          <button
            className="w-full rounded-2xl border border-border bg-panelAlt px-4 py-3 text-sm font-medium text-foreground transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
            type="button"
            onClick={handleCreateAccount}
          >
            {loading ? "..." : dictionary.auth.createAccount}
          </button>
        )}
      </form>
    </Panel>
  );
}
