"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import { useI18n } from "@/lib/i18n/context";
import { useSession } from "@/lib/session/context";
import { SessionUser } from "@/types/session";

export function LoginForm() {
  const router = useRouter();
  const { dictionary, locale, setLocale } = useI18n();
  const { hydrated, signIn, user } = useSession();
  const [email, setEmail] = useState("admin@cmms.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && user) {
      router.replace("/dashboard");
    }
  }, [hydrated, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        setError(dictionary.auth.invalid);
        setLoading(false);
        return;
      }

      const user = (await response.json()) as SessionUser;
      localStorage.setItem("user", JSON.stringify(user));
signIn(user);

router.replace("/dashboard");
    } catch {
      setError(dictionary.auth.invalid);
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
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              {dictionary.auth.subtitle}
            </p>
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

      <form className="space-y-5 px-8 py-8" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm text-muted" htmlFor="email">
            {dictionary.auth.email}
          </label>
          <input
            className="w-full rounded-2xl border border-border bg-panelAlt px-4 py-3 text-sm"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
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

        <p className="text-sm text-muted">{dictionary.auth.helper}</p>
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <button
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? "..." : dictionary.auth.submit}
        </button>
      </form>
    </Panel>
  );
}
