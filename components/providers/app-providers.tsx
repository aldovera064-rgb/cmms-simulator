"use client";

import type { ReactNode } from "react";

import { ToastProvider } from "@/components/ui/toast-context";
import { CoverProvider } from "@/lib/cover-context";
import { I18nProvider } from "@/lib/i18n/context";
import { SessionProvider } from "@/lib/session/context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <SessionProvider>
        <CoverProvider>
          <ToastProvider>{children}</ToastProvider>
        </CoverProvider>
      </SessionProvider>
    </I18nProvider>
  );
}

