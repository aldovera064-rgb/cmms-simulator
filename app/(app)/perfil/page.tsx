import { Suspense } from "react";
import { ProfilePageClient } from "@/components/profile/profile-page-client";

function ProfileFallback() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-panel p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded-xl bg-border/50" />
          <div className="h-4 w-64 rounded-xl bg-border/30" />
        </div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfilePageClient />
    </Suspense>
  );
}
