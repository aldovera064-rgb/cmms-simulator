"use client";

import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n/context";
import { useSession } from "@/lib/session/context";

export function Topbar() {
  const router = useRouter();
  const { dictionary, locale, setLocale } = useI18n();
  const { user, signOut } = useSession();

  const handleSignOut = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-panel/60 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-accent">
          {dictionary.shell.welcome}
        </p>
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

        <div className="rounded-2xl border border-border bg-panelAlt/80 px-4 py-2 text-sm">
          {user?.name ?? "Demo User"}
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
