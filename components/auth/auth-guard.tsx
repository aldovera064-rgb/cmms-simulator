"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Panel } from "@/components/ui/panel";
import { useI18n } from "@/lib/i18n/context";
import { useSession } from "@/lib/session/context";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { dictionary } = useI18n();
  const { user, hydrated } = useSession();

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, router, user]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Panel className="w-full max-w-md p-6 text-center text-sm text-muted">
          {dictionary.shell.loading}
        </Panel>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
