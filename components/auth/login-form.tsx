"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import { useI18n } from "@/lib/i18n/context";
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
};

async function createAdmin(username: string, password: string, country: string) {
  if (password.length < 5) {
    alert("Password must be at least 5 characters");
    return null;
  }

  if (!COUNTRIES.includes(country as Country)) {
    alert("Invalid country selection");
    return null;
  }

  const normalizedUsername = username.toLowerCase();

  const { data: existing } = await supabase
    .from("admins")
    .select("id")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (existing) {
    alert("User already exists");
    return null;
  }

  const { data, error } = await supabase
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

  if (error || !data) {
    alert("Could not create account");
    return null;
  }

  return data;
}

export function LoginForm() {
  const router = useRouter();
  const { dictionary, locale, setLocale } = useI18n();
  const { hydrated, signIn, user } = useSession();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && user) {
      router.replace("/dashboard");
    }
  }, [hydrated, router, user]);

  const setAuthCookies = (admin: Pick<AdminRow, "username" | "country">) => {
    document.cookie = "cmms-auth=1; path=/";
    document.cookie = `cmms-user=${admin.username}; path=/`;
    document.cookie = `cmms-country=${admin.country ?? ""}; path=/`;
  };

  const persistSessionAndRedirect = (admin: Pick<AdminRow, "id" | "username" | "country">) => {
    const nextUser: SessionUser = {
      id: admin.id,
      email: admin.username,
      name: admin.username,
      role: "admin",
      technicianId: null
    };

    signIn(nextUser);
    setAuthCookies(admin);
    window.location.href = "/dashboard";
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const normalizedUsername = username.toLowerCase();

      const { data, error } = await supabase
        .from("admins")
        .select("id, username, password, country")
        .eq("username", normalizedUsername)
        .eq("password", password)
        .single<AdminRow>();

      if (error || !data) {
        alert("Invalid credentials");
        return;
      }

      persistSessionAndRedirect(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);

    try {
      const created = await createAdmin(username, password, country);
      if (!created) return;

      persistSessionAndRedirect(created);
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
          <div className="space-y-2">
            <label className="text-sm text-muted" htmlFor="country">
              {dictionary.auth.country}
            </label>
            <select
              id="country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="w-full rounded-2xl border border-border bg-panelAlt px-4 py-3 text-xl text-center"
            >
              <option value="">{dictionary.auth.selectCountry}</option>
              <option value="mx">🇲🇽</option>
              <option value="us">🇺🇸</option>
              <option value="ca">🇨🇦</option>
              <option value="pride">🏳️‍🌈</option>
            </select>
          </div>
        ) : null}

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
