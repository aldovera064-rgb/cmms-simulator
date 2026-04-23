"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/activos", key: "assets" },
  { href: "/ordenes", key: "workOrders" },
  { href: "/pm-plans", key: "pmPlans" },
  { href: "/spare-parts", key: "spareParts" },
  { href: "/technicians", key: "technicians" },
  { href: "/bitacora", key: "generalNotes" }
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { dictionary } = useI18n();

  return (
    <aside className="w-full shrink-0 border-b border-[#d6d0b8] bg-[#e8e2c8] p-4 lg:w-72 lg:border-b-0 lg:border-r">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-accent">CMMS</p>
          <h1 className="mt-2 text-xl font-semibold">{dictionary.appName}</h1>
          <p className="mt-2 text-sm text-muted">{dictionary.shell.simulator}</p>
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
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
