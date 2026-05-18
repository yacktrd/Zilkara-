"use client";

/* ============================================================================
 * FILE: components/scan-client.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan dynamic client
 *
 * ROLE
 * - manage public scan refresh dynamics
 * - keep observable price, 24H and sparkline data synchronized
 * - pass public ScanAsset data to ScanTable
 * - preserve ScanTable as a passive rendering component
 *
 * PARENTS
 * - app/scan/page.tsx
 * - app/api/scan/route.ts
 * - components/scan-table.tsx
 *
 * DIRECTIVES
 * - public client transport only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration
 * - no private score usage
 * - no decision exposure
 * - no regime exposure
 * - no local structural reconstruction
 * - no fake fallback data
 * - EUR default quote
 * - same API payload => same UI payload
 *
 * INPUTS
 * - initialAssets
 * - quote
 * - limit
 *
 * OUTPUTS
 * - ScanTable receives public assets only
 *
 * INVARIANTS
 * - initial assets are always used as first stable state
 * - failed refresh keeps last valid public state
 * - client refresh updates observable public data only
 * - UI never computes analytical states
 * ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from "react";
import ScanTable from "@/components/scan-table";
import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type Quote = "EUR" | "USD" | "USDT" | "eur" | "usd" | "usdt";

type ScanClientProps = {
  initialAssets: ScanAsset[];
  quote?: Quote | string;
  limit?: number;
};

type ScanApiResponse = {
  ok: boolean;
  data?: unknown;
  warnings?: unknown;
  error?: unknown;
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const DEFAULT_QUOTE = "eur";
const DEFAULT_LIMIT = 250;
const REFRESH_INTERVAL_MS = 45_000;
const REQUEST_TIMEOUT_MS = 10_000;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeAssets(value: unknown): ScanAsset[] {
  return Array.isArray(value) ? (value as ScanAsset[]) : [];
}

function normalizeQuote(value: Quote | string | undefined): string {
  const quote = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function normalizeLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(DEFAULT_LIMIT, Math.trunc(value)));
}

function buildScanUrl(input: { quote: string; limit: number }): string {
  const params = new URLSearchParams({
    quote: input.quote,
    limit: String(input.limit),
  });

  return `/api/scan?${params.toString()}`;
}

/* ============================================================================
 * 4. MAIN COMPONENT
 * ========================================================================== */

export default function ScanClient({
  initialAssets,
  quote = DEFAULT_QUOTE,
  limit = DEFAULT_LIMIT,
}: ScanClientProps) {
  const [assets, setAssets] = useState<ScanAsset[]>(() =>
    safeAssets(initialAssets),
  );

  const abortRef = useRef<AbortController | null>(null);

  const normalizedQuote = useMemo(() => normalizeQuote(quote), [quote]);
  const normalizedLimit = useMemo(() => normalizeLimit(limit), [limit]);

  const scanUrl = useMemo(
    () =>
      buildScanUrl({
        quote: normalizedQuote,
        limit: normalizedLimit,
      }),
    [normalizedQuote, normalizedLimit],
  );

  useEffect(() => {
    let isMounted = true;

    async function refreshScan() {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      const timeout = window.setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(scanUrl, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            accept: "application/json",
          },
        });

        if (!response.ok) return;

        const payload = (await response.json()) as ScanApiResponse;

        if (!payload.ok) return;

        const nextAssets = safeAssets(payload.data);

        if (!isMounted || nextAssets.length === 0) return;

        setAssets(nextAssets);
      } catch {
        // Keep last valid public state.
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void refreshScan();

    const interval = window.setInterval(() => {
    void refreshScan();
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [scanUrl]);

  return (
    <ScanTable assets={assets} quote={normalizedQuote} limit={normalizedLimit} />
  );
}
