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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('cmms_theme') || 'theme-default';
                document.documentElement.classList.add(theme);
              } catch (e) {}
            `
          }}
        />
      </head>
      <body className="bg-main text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
