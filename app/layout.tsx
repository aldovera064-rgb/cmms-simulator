import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "CMMS Simulator",
  description: "CMMS demo app"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-main text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
