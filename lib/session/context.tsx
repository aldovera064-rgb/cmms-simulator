"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { clearStoredSession, getStoredSession, setStoredSession } from "@/lib/session/storage";
import { SessionUser } from "@/types/session";

type SessionContextValue = {
  user: SessionUser | null;
  hydrated: boolean;
  signIn: (user: SessionUser) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const AUTH_COOKIE = "cmms-auth";
const USER_COOKIE = "cmms-user";
const COUNTRY_COOKIE = "cmms-country";

function hasAuthCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((cookie) => cookie.startsWith(`${AUTH_COOKIE}=`));
}

function setAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=1; Path=/; SameSite=Lax`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function clearUserCookies() {
  if (typeof document === "undefined") return;
  document.cookie = `${USER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${COUNTRY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hasAuthCookie()) {
      const stored = getStoredSession();
      setUser(stored);
      setAuthCookie();
    } else {
      setUser(null);
      clearStoredSession();
      clearAuthCookie();
      clearUserCookies();
    }

    setHydrated(true);
  }, []);

  const signIn = (nextUser: SessionUser) => {
    setStoredSession(nextUser);
    setAuthCookie();
    setUser(nextUser);
  };

  const signOut = () => {
    clearStoredSession();
    clearAuthCookie();
    clearUserCookies();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      hydrated,
      signIn,
      signOut
    }),
    [hydrated, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }

  return context;
}
