/* ============================================================================
 * FILE: app/layout.tsx
 * ========================================================================== */

import "./globals.css";

import type { Metadata } from "next";
import React from "react";

import { AuthProvider } from "@/components/auth/auth-provider";
import NavigationShell from "@/components/navigation/navigation-shell";

export const metadata: Metadata = {
  title: "Xyvala",
  description: "European Market Structure Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavigationShell>{children}</NavigationShell>
        </AuthProvider>
      </body>
    </html>
  );
}
