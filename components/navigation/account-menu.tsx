"use client";

/* ============================================================================
 * FILE: components/navigation/account-menu.tsx
 * ========================================================================== */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function planLabel(value: string | undefined): string {
  if (value === "demo") return "Demo";
  if (value === "trader") return "Trader";
  if (value === "pro") return "Pro";
  if (value === "enterprise") return "Enterprise";

  return "Unknown";
}

function displayIdentity(input: {
  displayName: string | null | undefined;
  email: string | undefined;
}): string {
  if (input.displayName && input.displayName.trim().length > 0) {
    return input.displayName;
  }

  return input.email ?? "Account";
}

/* ============================================================================
 * 2. ACCOUNT MENU
 * ========================================================================== */

export default function AccountMenu() {
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

  if (auth.loading) {
    return <span className="text-sm text-white/35">Loading...</span>;
  }

  if (!auth.authenticated || !auth.account) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm text-white/60 transition hover:text-white">
          Login
        </Link>

        <Link
          href="/register"
          className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-white/90"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account"
        className="hidden rounded-xl border border-white/10 px-3 py-2 text-left transition hover:border-white/25 md:block"
      >
        <p className="max-w-[160px] truncate text-sm font-medium text-white">
          {displayIdentity({
            displayName: auth.account.display_name,
            email: auth.account.email,
          })}
        </p>

        <p className="text-xs text-white/40">
          {planLabel(auth.account.plan)}
        </p>
      </Link>

      <Link
        href="/account"
        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:border-white/25 hover:text-white md:hidden"
      >
        Account
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loggingOut ? "Signing out..." : "Logout"}
      </button>
    </div>
  );
}
