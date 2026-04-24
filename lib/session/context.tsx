"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { loadAccessibleCompanies, loadFirstAssignedCompanyId, pickActiveCompanyId, readActiveCompanyCookie, writeActiveCompanyCookie } from "@/lib/company";
import { resolveRole } from "@/lib/rbac";
import { clearStoredSession, getStoredSession, setStoredSession } from "@/lib/session/storage";
import { SessionUser } from "@/types/session";

type SessionContextValue = {
  user: SessionUser | null;
  hydrated: boolean;
  signIn: (user: SessionUser) => void;
  signOut: () => void;
  logout: () => Promise<void>;
  setActiveCompanyId: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;
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
  writeActiveCompanyCookie(null);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const applyUser = async (nextUser: SessionUser | null) => {
    if (!nextUser) {
      clearStoredSession();
      writeActiveCompanyCookie(null);
      setUser(null);
      return;
    }

    const resolvedRole = resolveRole(nextUser.name ?? "", nextUser.role);
    const companies = nextUser.companies ?? (await loadAccessibleCompanies(nextUser.id, resolvedRole));
    const cookieCompanyId = readActiveCompanyCookie();
    const fallbackCompanyId = resolvedRole === "god" ? null : await loadFirstAssignedCompanyId(nextUser.id);
    const activeCompanyId =
      nextUser.activeCompanyId && companies.some((company) => company.id === nextUser.activeCompanyId)
        ? nextUser.activeCompanyId
        : pickActiveCompanyId(companies, resolvedRole, cookieCompanyId, fallbackCompanyId);

    const normalizedUser: SessionUser = {
      ...nextUser,
      role: resolvedRole,
      companies,
      activeCompanyId
    };

    setStoredSession(normalizedUser);
    writeActiveCompanyCookie(activeCompanyId);
    setUser(normalizedUser);
  };

  const refreshCompanies = async () => {
    if (!user) return;
    await applyUser({
      ...user,
      companies: undefined
    });
  };

  useEffect(() => {
    const hydrateSession = async () => {
      if (hasAuthCookie()) {
        const stored = getStoredSession();
        const normalized = stored
          ? {
              ...stored,
              role: resolveRole(stored.name ?? "", stored.role)
            }
          : stored;
        await applyUser(normalized);
        setAuthCookie();
      } else {
        setUser(null);
        clearStoredSession();
        clearAuthCookie();
        clearUserCookies();
      }

      setHydrated(true);
    };

    void hydrateSession();
  }, []);

  const signIn = (nextUser: SessionUser) => {
    setAuthCookie();
    const normalizedUser: SessionUser = {
      ...nextUser,
      role: resolveRole(nextUser.name ?? "", nextUser.role)
    };

    setStoredSession(normalizedUser);
    writeActiveCompanyCookie(normalizedUser.activeCompanyId ?? null);
    setUser(normalizedUser);
  };

  const setActiveCompanyId = (companyId: string) => {
    if (!user) return;

    const normalizedUser: SessionUser = {
      ...user,
      activeCompanyId: companyId
    };

    setStoredSession(normalizedUser);
    writeActiveCompanyCookie(companyId);
    setUser(normalizedUser);
  };

  const signOut = () => {
    clearStoredSession();
    clearAuthCookie();
    clearUserCookies();
    setUser(null);
  };

  const logout = async () => {
    signOut();
  };

  const value = useMemo(
    () => ({
      user,
      hydrated,
      signIn,
      signOut,
      logout,
      setActiveCompanyId,
      refreshCompanies
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
