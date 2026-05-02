"use client";

import { useState } from "react";

import { CoverEditModal } from "@/components/dashboard/cover-edit-modal";
import { Panel } from "@/components/ui/panel";
import { useCover } from "@/lib/cover-context";
import { isGod, hasMinimumRole } from "@/lib/rbac";
import { useSession } from "@/lib/session/context";

type DashboardHeroProps = {
  title: string;
  description: string;
  showEditButton?: boolean;
};

export function DashboardHero({ title, description, showEditButton = false }: DashboardHeroProps) {
  const { user } = useSession();
  const { cover } = useCover();
  const [editOpen, setEditOpen] = useState(false);

  const canEdit = showEditButton && (isGod(user?.role) || hasMinimumRole(user?.role, "admin"));
  const hasCover = Boolean(cover.url);

  return (
    <>
      <Panel className="relative overflow-hidden p-8">
        {/* Cover image background */}
        {hasCover && (
          <>
            <img
              src={cover.url!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
              style={{
                objectPosition: cover.position,
                transform: `scale(${cover.scale})`,
                transformOrigin: cover.position
              }}
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 pointer-events-none" />
          </>
        )}

        {/* Fallback grid when no cover */}
        {!hasCover && <div className="absolute inset-0 industrial-grid pointer-events-none" />}

        {/* Content */}
        <div className="relative z-10 max-w-3xl space-y-4">
          <p className={`text-xs uppercase tracking-[0.26em] ${hasCover ? "text-white/80" : "text-accent"}`}>CMMS</p>
          <h1 className={`text-3xl font-semibold tracking-tight md:text-4xl ${hasCover ? "text-white" : ""}`}>
            {title}
          </h1>
          <p className={`max-w-2xl text-sm leading-7 ${hasCover ? "text-white/80" : "text-muted"}`}>
            {description}
          </p>
        </div>

        {/* Edit button — pencil icon, top-right */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition"
            title="Editar portada"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        )}
      </Panel>

      {canEdit && <CoverEditModal open={editOpen} onClose={() => setEditOpen(false)} />}
    </>
  );
}

