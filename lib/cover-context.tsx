"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/session/context";
import { supabase } from "@/lib/supabase";

type CoverData = {
  url: string | null;
  position: string;
  scale: number;
};

type CoverContextValue = {
  cover: CoverData;
  refreshCover: () => Promise<void>;
};

const DEFAULT_COVER: CoverData = { url: null, position: "50% 50%", scale: 1.0 };

const CoverContext = createContext<CoverContextValue | null>(null);

export function CoverProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const activeCompanyId = user?.activeCompanyId ?? null;
  const [cover, setCover] = useState<CoverData>(DEFAULT_COVER);

  const loadCover = async () => {
    if (!activeCompanyId) {
      setCover(DEFAULT_COVER);
      return;
    }

    const { data } = await supabase
      .from("dashboard_covers")
      .select("cover_url, cover_position, cover_scale")
      .eq("company_id", activeCompanyId)
      .maybeSingle();

    if (data && data.cover_url) {
      setCover({
        url: data.cover_url as string,
        position: (data.cover_position as string) || "50% 50%",
        scale: (data.cover_scale as number) || 1.0
      });
    } else {
      setCover(DEFAULT_COVER);
    }
  };

  useEffect(() => {
    void loadCover();
  }, [activeCompanyId]);

  const value = useMemo(
    () => ({ cover, refreshCover: loadCover }),
    [cover, activeCompanyId]
  );

  return <CoverContext.Provider value={value}>{children}</CoverContext.Provider>;
}

export function useCover() {
  const context = useContext(CoverContext);
  if (!context) {
    return { cover: DEFAULT_COVER, refreshCover: async () => {} };
  }
  return context;
}
