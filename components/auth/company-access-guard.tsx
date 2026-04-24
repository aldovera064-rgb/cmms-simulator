"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useSession } from "@/lib/session/context";

export function CompanyAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, user } = useSession();

  useEffect(() => {
    if (!hydrated || !user) return;
    if (pathname === "/select-company") return;
    if (user.activeCompanyId) return;

    router.replace("/select-company");
  }, [hydrated, pathname, router, user]);

  return <>{children}</>;
}
