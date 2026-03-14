// app/scan/page.tsx

import React from "react";
import { getScanService, type ScanServiceItem } from "@/lib/xyvala/services/scan-service";
import { getStateService } from "@/lib/xyvala/services/state-service";
import { ScanTable } from "@/components/scan-table";
import { MarketStatePanel } from "@/components/market-state";
import type { ScanAsset, Regime } from "@/lib/xyvala/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_QUOTE = "usd";
const DEFAULT_SORT = "score_desc";
const DEFAULT_LIMIT = 100;

type ScanTableItem = ScanAsset & {
  affiliate_url: string;
};

type MarketState = {
  market_regime?: string | null;
  volatility_state?: string | null;
  liquidity_state?: string | null;
  risk_mode?: string | null;
  execution_bias?: string | null;
  stable_ratio?: number | null;
  transition_ratio?: number | null;
  volatile_ratio?: number | null;
};

type ScanPageViewModel = {
  items: ScanTableItem[];
  source: string;
  quote: string;
  count: number;
  warnings: string[];
  error: string | null;
};

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function normalizeRegime(value: unknown): Regime {
  const regime = safeString(value, "").toUpperCase();

  if (regime === "STABLE") return "STABLE";
  if (regime === "TRANSITION") return "TRANSITION";
  if (regime === "VOLATILE") return "VOLATILE";

  return "TRANSITION";
}

function mapScanServiceItemToTableItem(item: ScanServiceItem): ScanTableItem {
    return {
  ...item,
  id: safeString(item.id, safeString(item.symbol, "unknown").toLowerCase()),
  symbol: safeString(item.symbol, "UNKNOWN"),
  name: safeString(item.name, safeString(item.symbol, "Unknown")),
  price: safeNumber(item.price, 0),
  chg_24h_pct: safeNumber(item.chg_24h_pct, 0),
  confidence_score: safeNumber(item.confidence_score, 0),
  regime: normalizeRegime(item.regime),
  binance_url: safeString(item.binance_url, "#"),
  affiliate_url: safeString(item.affiliate_url ?? item.binance_url, "#"),
  market_cap: safeOptionalNumber(item.market_cap),
  volume_24h: safeOptionalNumber(item.volume_24h),
};
}

function normalizeItems(items: ScanServiceItem[] | null | undefined): ScanTableItem[] {
  return safeArray(items).map(mapScanServiceItemToTableItem);
}

async function getScanData(): Promise<ScanPageViewModel> {
  const result = await getScanService({
    quote: DEFAULT_QUOTE,
    sort: DEFAULT_SORT,
    limit: DEFAULT_LIMIT,
    noStore: false,
  });

  return {
    items: normalizeItems(result.data),
    source: safeString(result.source, "fallback"),
    quote: safeString(result.quote, DEFAULT_QUOTE),
    count:
      typeof result.count === "number" && Number.isFinite(result.count)
        ? result.count
        : result.data.length,
    warnings: uniqueWarnings(result.warnings),
    error:
      typeof result.error === "string" && result.error.trim().length > 0
        ? result.error
        : null,
  };
}

async function getMarketState(): Promise<{
  state: MarketState | null;
  warning: string | null;
}> {
  const result = await getStateService({
    quote: DEFAULT_QUOTE,
    noStore: false,
  });

  if (!result.ok || !result.state) {
    return {
      state: null,
      warning: result.error ?? "market_state_unavailable",
    };
  }

  return {
    state: {
      market_regime: result.state.market_regime ?? null,
      volatility_state: result.state.volatility_state ?? null,
      liquidity_state: result.state.liquidity_state ?? null,
      risk_mode: result.state.risk_mode ?? null,
      execution_bias: result.state.execution_bias ?? null,
      stable_ratio: result.state.stable_ratio ?? null,
      transition_ratio: result.state.transition_ratio ?? null,
      volatile_ratio: result.state.volatile_ratio ?? null,
    },
    warning:
      result.warnings.length > 0
        ? uniqueWarnings(result.warnings).join(" | ")
        : null,
  };
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300">
      {children}
    </span>
  );
}

function NoticeBox({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "warning" | "error" | "info";
}) {
  const toneClasses =
    tone === "error"
      ? "border-red-500/20 bg-red-500/5 text-red-200"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
        : tone === "info"
          ? "border-blue-500/20 bg-blue-500/5 text-blue-200"
          : "border-neutral-800 bg-neutral-900/60 text-neutral-200";

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-1 text-sm opacity-90">{children}</div>
    </div>
  );
}

export default async function ScanPage() {
  let fatalError: string | null = null;
  let viewModel: ScanPageViewModel = {
    items: [],
    source: "fallback",
    quote: DEFAULT_QUOTE,
    count: 0,
    warnings: [],
    error: null,
  };
  let marketState: MarketState | null = null;
  const pageWarnings: string[] = [];

  const [scanResult, stateResult] = await Promise.allSettled([
    getScanData(),
    getMarketState(),
  ]);

  if (scanResult.status === "fulfilled") {
    viewModel = scanResult.value;
  } else {
    fatalError =
      scanResult.reason instanceof Error && scanResult.reason.message
        ? scanResult.reason.message
        : "scan_page_failed";
  }

  if (stateResult.status === "fulfilled") {
    marketState = stateResult.value.state;
    if (stateResult.value.warning) {
      pageWarnings.push(stateResult.value.warning);
    }
  } else {
    pageWarnings.push("market_state_request_failed");
  }

  const items = viewModel.items;
  const allWarnings = uniqueWarnings(viewModel.warnings, pageWarnings);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Xyvala Scan</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Structured crypto scan ranked by confidence score.
          </p>
        </div>

        {!fatalError ? (
          <div className="flex flex-wrap gap-2">
            <InfoPill>Source: {viewModel.source}</InfoPill>
            <InfoPill>Quote: {viewModel.quote.toUpperCase()}</InfoPill>
            <InfoPill>Assets: {viewModel.count}</InfoPill>
          </div>
        ) : null}
      </div>

      {fatalError ? (
        <div className="mb-6">
          <NoticeBox title="Erreur de chargement" tone="error">
            {fatalError}
          </NoticeBox>
        </div>
      ) : null}

      {!fatalError && viewModel.error ? (
        <div className="mb-6">
          <NoticeBox title="Source partiellement dégradée" tone="warning">
            {viewModel.error}
          </NoticeBox>
        </div>
      ) : null}

      {!fatalError && allWarnings.length > 0 ? (
        <div className="mb-6">
          <NoticeBox title="Warnings" tone="neutral">
            <ul className="space-y-1">
              {allWarnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </NoticeBox>
        </div>
      ) : null}

      {!fatalError ? (
        <div className="mb-6">
          <MarketStatePanel state={marketState} />
        </div>
      ) : null}

      {!fatalError ? (
        <ScanTable
          assets={items}
          quote={viewModel.quote}
          sort={DEFAULT_SORT}
          limit={DEFAULT_LIMIT}
        />
      ) : null}
    </main>
  );
}
