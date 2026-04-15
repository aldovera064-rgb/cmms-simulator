import type { ReactNode } from "react";
import type { Metadata } from "next";

import { AppProviders } from "@/components/providers/app-providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CMMS Simulator",
  description: "Industrial maintenance simulator built with Next.js and Prisma."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
