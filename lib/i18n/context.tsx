"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

import { dictionaries } from "@/lib/i18n/dictionaries";
import { Dictionary, Locale } from "@/types/i18n";

type I18nContextValue = {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
};

const COOKIE_KEY = "cmms-locale";

const I18nContext = createContext<I18nContextValue | null>(null);

function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie.split("; ").find((item) => item.startsWith(`${COOKIE_KEY}=`));
  if (!entry) return null;
  const value = decodeURIComponent(entry.slice(COOKIE_KEY.length + 1));
  return value === "es" || value === "en" ? value : null;
}

function writeLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readLocaleCookie() ?? "es");

  const setLocale = (value: Locale) => {
    setLocaleState(value);
    writeLocaleCookie(value);
  };

  const value = useMemo(
    () => ({
      locale,
      dictionary: dictionaries[locale],
      setLocale
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
}
