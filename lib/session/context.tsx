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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getStoredSession());
    setHydrated(true);
  }, []);

  const signIn = (nextUser: SessionUser) => {
    setStoredSession(nextUser);
    setUser(nextUser);
  };

  const signOut = () => {
    clearStoredSession();
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
