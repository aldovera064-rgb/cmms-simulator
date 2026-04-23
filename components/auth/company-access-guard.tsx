"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/session/context";

export function CompanyAccessGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { hydrated, user, signOut } = useSession();

  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.role === "god") return;
    if ((user.companies ?? []).length > 0 && user.activeCompanyId) return;

    signOut();
    router.replace("/login");
  }, [hydrated, router, signOut, user]);

  return <>{children}</>;
}
