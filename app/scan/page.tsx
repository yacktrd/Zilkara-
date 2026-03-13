// app/scan/page.tsx

import React from "react";
import { getRuntimeConfig } from "@/lib/xyvala/runtime-config";
import { getInternalJson } from "@/lib/xyvala/server-client";
import { ScanTable } from "@/components/scan-table";
import { MarketStatePanel } from "@/components/market-state";
import type { ScanAsset } from "@/lib/xyvala/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParamsInput = {
  quote?: string | string[];
  sort?: string | string[];
  limit?: string | string[];
};

type ScanPageProps = {
  searchParams?: Promise<SearchParamsInput> | SearchParamsInput;
};

type MarketState = Record<string, unknown> | null;

type ScanApiResponse = {
  assets?: ScanAsset[];
  marketState?: MarketState;
  warnings?: string[];
  error?: string | null;
};

const ALLOWED_SORTS = new Set([
  "score_desc",
  "score_asc",
  "price_desc",
  "price_asc",
  "chg_24h_desc",
  "chg_24h_asc",
  "volume_desc",
  "volume_asc",
  "market_cap_desc",
  "market_cap_asc",
  "symbol_asc",
  "symbol_desc",
]);

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return safeStr(value[0]);
  return safeStr(value);
}

function normalizeQuote(input: string, fallback: string): string {
  const value = input.toLowerCase();
  return value || fallback;
}

function normalizeSort(input: string, fallback: string): string {
  const value = input.trim();
  if (!value) return fallback;
  return ALLOWED_SORTS.has(value) ? value : fallback;
}

function normalizeLimit(input: string, fallback: number): number {
  const parsed = Number.parseInt(input, 10);

  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 1) return 1;
  if (parsed > 250) return 250;

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function renderWarnings(warnings: string[]) {
  if (warnings.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-800">Avertissements</p>
      <ul className="mt-2 space-y-1 text-sm text-amber-700">
        {warnings.map((warning) => (
          <li key={warning}>• {warning}</li>
        ))}
      </ul>
    </section>
  );
}

function renderError(error: string | null, warnings: string[]) {
  if (!error) return null;

  return (
    <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">Erreur: {error}</p>
      {warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-red-700">
          {warnings.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default async function ScanPage(props: ScanPageProps) {
  const runtimeConfig = await getRuntimeConfig();
  const resolvedSearchParams = props.searchParams
    ? await props.searchParams
    : {};

  const quote = normalizeQuote(
    firstValue(resolvedSearchParams.quote),
    runtimeConfig.defaultQuote
  );

  const sort = normalizeSort(
    firstValue(resolvedSearchParams.sort),
    runtimeConfig.defaultSort
  );

  const limit = normalizeLimit(
    firstValue(resolvedSearchParams.limit),
    runtimeConfig.defaultLimit
  );

  let assets: ScanAsset[] = [];
  let marketState: MarketState = null;
  let error: string | null = null;
  let warnings: string[] = runtimeConfig.warnings ?? [];

  const scanResult = await getInternalJson<ScanApiResponse>("/api/scan", {
    quote,
    sort,
    limit,
  });

  if (!scanResult.ok || !scanResult.data) {
    error = scanResult.error ?? "scan_request_failed";
    warnings = normalizeWarnings(warnings, scanResult.warnings);
  } else {
    assets = Array.isArray(scanResult.data.assets) ? scanResult.data.assets : [];
    marketState = isRecord(scanResult.data.marketState)
      ? scanResult.data.marketState
      : null;
    error = safeStr(scanResult.data.error) || null;
    warnings = normalizeWarnings(
      warnings,
      scanResult.warnings,
      scanResult.data.warnings
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <section className="mb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Xyvala Scan</h1>
          <p className="text-sm text-neutral-500">
            Runtime centralisé, transport interne unifié.
          </p>
        </div>
      </section>

      {renderError(error, warnings)}
      {!error ? renderWarnings(warnings) : null}

      <section className="mb-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border p-3">
            <div className="text-xs uppercase tracking-wide text-neutral-400">
              Quote
            </div>
            <div className="mt-1 font-medium text-neutral-900">{quote}</div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs uppercase tracking-wide text-neutral-400">
              Sort
            </div>
            <div className="mt-1 font-medium text-neutral-900">{sort}</div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs uppercase tracking-wide text-neutral-400">
              Limit
            </div>
            <div className="mt-1 font-medium text-neutral-900">{limit}</div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs uppercase tracking-wide text-neutral-400">
              Env
            </div>
            <div className="mt-1 font-medium text-neutral-900">
              {runtimeConfig.appEnv}
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs uppercase tracking-wide text-neutral-400">
              Internal Key
            </div>
            <div className="mt-1 font-medium text-neutral-900">
              {runtimeConfig.hasRequiredApiKeys ? "available" : "missing"}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <MarketStatePanel state={marketState} />
      </section>

      <section>
        <ScanTable assets={assets} quote={quote} sort={sort} limit={limit} />
      </section>
    </main>
  );
}
