"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n/context";
import { useSession } from "@/lib/session/context";

function normalizeCountry(value: string) {
  if (!value) return "mx";
  if (value === "mx" || value === "us" || value === "ca" || value === "pride") return value;
  return "mx";
}

function getFlagSrc(country: string) {
  if (country === "pride") return "/flags/pride.svg";
  return `https://flagcdn.com/w40/${country}.png`;
}

export function Topbar() {
  const router = useRouter();
  const { dictionary, locale, setLocale } = useI18n();
  const { user, signOut } = useSession();
  const [cookieUser, setCookieUser] = useState("");
  const [cookieCountry, setCookieCountry] = useState("mx");

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

  const handleSignOut = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-panel/60 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-accent">{dictionary.shell.welcome}</p>
        <p className="mt-2 text-sm text-muted">
          {dictionary.shell.sessionRole}: {user?.role ?? "-"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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

        <div className="rounded-2xl border border-border bg-panelAlt/80 px-3 py-2 text-sm flex items-center gap-2">
          <img src={getFlagSrc(cookieCountry)} className="w-5 h-5 object-cover" alt={cookieCountry} />
          <span>{cookieUser || user?.name || "Admin"}</span>
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
