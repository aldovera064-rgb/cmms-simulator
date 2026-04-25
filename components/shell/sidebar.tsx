"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/activos", key: "assets" },
  { href: "/ordenes", key: "workOrders" },
  { href: "/pm-plans", key: "pmPlans" },
  { href: "/spare-parts", key: "spareParts" },
  { href: "/technicians", key: "technicians" },
  { href: "/bitacora", key: "generalNotes" },
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
        "w-full shrink-0 border-b border-[#d6d0b8] bg-[#e8e2c8] p-4 transition-all duration-300 lg:border-b-0 lg:border-r",
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
            const label = dictionary.navigation[item.key];
            const active =
              pathname === item.href ||
              (item.href === "/activos" && (pathname === "/assets" || pathname.startsWith("/activos"))) ||
              (item.href === "/ordenes" && (pathname === "/work-orders" || pathname.startsWith("/ordenes")));

            return (
              <Link
                className={cn(
                  "rounded-2xl border border-transparent px-4 py-3 text-sm transition",
                  active
                    ? "border-accent/30 bg-accentSoft text-foreground"
                    : "bg-panelAlt/70 text-muted hover:border-border hover:text-foreground"
                )}
                href={item.href}
                key={item.href}
                title={label}
              >
                <span className={cn("transition-all duration-300", open ? "lg:inline" : "lg:hidden")}>{label}</span>
                <span className={cn("font-semibold transition-all duration-300", open ? "lg:hidden" : "lg:inline")}>
                  {label.slice(0, 1).toUpperCase()}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
