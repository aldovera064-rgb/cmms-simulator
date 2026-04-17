import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-main p-4 sm:p-6">
      <main className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        {children}
      </main>
    </div>
  );
}
