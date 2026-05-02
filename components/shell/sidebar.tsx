"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const ICONS: Record<string, string> = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4",
  assets: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  workOrders: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  pmPlans: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  spareParts: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  technicians: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  generalNotes: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  finances: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  settings: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
};

const navigation = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/activos", key: "assets" },
  { href: "/ordenes", key: "workOrders" },
  { href: "/pm-plans", key: "pmPlans" },
  { href: "/spare-parts", key: "spareParts" },
  { href: "/technicians", key: "technicians" },
  { href: "/bitacora", key: "generalNotes" },
  { href: "/finanzas", key: "finances" },
  { href: "/settings", key: "settings" }
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { dictionary } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={cn(
        "sticky top-0 h-screen w-full shrink-0 border-b border-[#d6d0b8] bg-[#e8e2c8] p-4 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:border-b-0 lg:border-r overflow-y-auto",
        open ? "lg:w-72" : "lg:w-16"
      )}
    >
      <div className="space-y-6">
        <div className={cn("overflow-hidden transition-opacity duration-300", open ? "lg:opacity-100" : "lg:opacity-0")}>
          <p className="text-xs uppercase tracking-[0.26em] text-accent whitespace-nowrap">CMMS</p>
          <h1 className="mt-2 text-xl font-semibold whitespace-nowrap">{dictionary.appName}</h1>
          <p className="mt-2 text-sm text-muted whitespace-nowrap">{dictionary.shell.simulator}</p>
        </div>

        <nav className="grid gap-2">
          {navigation.map((item) => {
            const label = (dictionary.navigation as Record<string, string>)[item.key] ?? item.key;
            const iconPath = ICONS[item.key] ?? "";
            const active =
              pathname === item.href ||
              (item.href === "/activos" && (pathname === "/assets" || pathname.startsWith("/activos"))) ||
              (item.href === "/ordenes" && (pathname === "/work-orders" || pathname.startsWith("/ordenes"))) ||
              (item.href === "/finanzas" && pathname.startsWith("/finanzas"));

            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm transition",
                  active
                    ? "border-accent/30 bg-accentSoft text-foreground"
                    : "bg-panelAlt/70 text-muted hover:border-border hover:text-foreground"
                )}
                href={item.href}
                key={item.href}
                title={label}
              >
                {/* Icon — always visible */}
                <svg
                  className={cn("h-5 w-5 shrink-0 transition-colors", active ? "text-accent" : "text-muted")}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={iconPath} />
                </svg>

                {/* Label — only when expanded */}
                <span className={cn("whitespace-nowrap transition-all duration-300", open ? "lg:inline lg:opacity-100" : "lg:hidden lg:opacity-0")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
