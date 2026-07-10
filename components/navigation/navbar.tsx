"use client";

/* ============================================================================
 * FILE: components/navigation/navbar.tsx
 * ========================================================================== */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

/* ============================================================================
 * 1. NAVBAR
 * ========================================================================== */

export default function Navbar() {
  const router = useRouter();
  const auth = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/account/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          accept: "application/json",
        },
      });

      auth.clear();

      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Xyvala
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/scan"
            className="text-white/60 transition hover:text-white"
          >
            Scan
          </Link>

          {auth.loading ? (
            <span className="text-white/35">Loading...</span>
          ) : auth.authenticated ? (
            <>
              <Link
                href="/account"
                className="rounded-lg border border-white/10 px-3 py-2 text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Account
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg bg-white px-3 py-2 font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
              >
                {loggingOut ? "Signing out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-white/60 transition hover:text-white"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-white px-3 py-2 font-medium text-black transition hover:bg-white/90"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
