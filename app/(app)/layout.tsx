import type { ReactNode } from "react";

import { CompanyAccessGuard } from "@/components/auth/company-access-guard";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6">
          <CompanyAccessGuard>{children}</CompanyAccessGuard>
        </main>
      </div>
    </div>
  );
}
