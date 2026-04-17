"use client";

import { SessionUser } from "@/types/session";

const STORAGE_KEY = "cmms-session";

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const entry = document.cookie.split("; ").find((item) => item.startsWith(`${name}=`));
  if (!entry) return "";
  return decodeURIComponent(entry.slice(name.length + 1));
}

export function getStoredSession(): SessionUser | null {
  if (typeof document === "undefined") {
    return null;
  }

  const raw = readCookie(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setStoredSession(session: SessionUser) {
  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${STORAGE_KEY}=${value}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function clearStoredSession() {
  document.cookie = `${STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}
