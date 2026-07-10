"use client";

/* ============================================================================
 * FILE: components/dashboard/dashboard-sidebar.tsx
 * ========================================================================== */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type DashboardNavItem = {
  label: string;
  href: string;
  status: "active" | "ready" | "soon";
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    status: "ready",
  },
  {
    label: "Account",
    href: "/account",
    status: "ready",
  },
  {
    label: "Scan",
    href: "/scan",
    status: "ready",
  },
  {
    label: "Usage",
    href: "/dashboard/usage",
    status: "soon",
  },
  {
    label: "API Keys",
    href: "/dashboard/api-keys",
    status: "soon",
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    status: "soon",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    status: "soon",
  },
];

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;

  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function statusLabel(status: DashboardNavItem["status"]): string | null {
  if (status === "soon") return "Soon";
  if (status === "active") return "Active";

  return null;
}

/* ============================================================================
 * 4. SIDEBAR
 * ========================================================================== */

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-5 px-2">
        <p className="text-xs uppercase tracking-[0.25em] text-white/35">
          Workspace
        </p>

        <p className="mt-2 text-sm leading-6 text-white/50">
          Private Xyvala navigation.
        </p>
      </div>

      <nav className="space-y-1">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const label = statusLabel(active ? "active" : item.status);
          const disabled = item.status === "soon";

          if (disabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2 text-sm text-white/30"
              >
                <span>{item.label}</span>

                {label ? (
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-white/30">
                    {label}
                  </span>
                ) : null}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "border border-white/15 bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/[0.06] hover:text-white",
              ].join(" ")}
            >
              <span>{item.label}</span>

              {label ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-white/45">
                  {label}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
