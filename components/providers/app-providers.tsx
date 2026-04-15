"use client";

import type { ReactNode } from "react";

import { I18nProvider } from "@/lib/i18n/context";
import { SessionProvider } from "@/lib/session/context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <SessionProvider>{children}</SessionProvider>
    </I18nProvider>
  );
}
