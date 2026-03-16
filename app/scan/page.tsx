// app/scan/page.tsx

import React from "react";
import {
  getScanService,
  type ScanServiceItem,
} from "@/lib/xyvala/services/scan-service";
import { getStateService } from "@/lib/xyvala/services/state-service";
import { ScanTable } from "@/components/scan-table";
import { MarketStatePanel } from "@/components/market-state";
import type { ScanAsset, Regime } from "@/lib/xyvala/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_QUOTE = "usd";
const DEFAULT_SORT = "score_desc";
const DEFAULT_SCAN_FETCH_LIMIT = 100;

const PUBLIC_VISIBLE_PERCENT = 0.1;
const PUBLIC_MIN_VISIBLE = 8;
const PUBLIC_MAX_VISIBLE = 12;
const MAX_PUBLIC_WARNINGS = 3;

type ScanTableItem = ScanAsset & {
  affiliate_url: string;
  score_delta?: number | null;
  score_trend?: string | null;
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
  totalCount: number;
  visibleCount: number;
  warnings: string[];
  error: string | null;
};

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  const merged = groups.flatMap((group) =>
    Array.isArray(group) ? group : []
  );

  return [
    ...new Set(
      merged.filter(
        (item) => typeof item === "string" && item.trim().length > 0
      )
    ),
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
    score_delta:
      typeof item.score_delta === "number" && Number.isFinite(item.score_delta)
        ? item.score_delta
        : null,
    score_trend:
      typeof item.score_trend === "string" && item.score_trend.trim().length > 0
        ? item.score_trend.trim()
        : null,
  };
}

function normalizeItems(
  items: ScanServiceItem[] | null | undefined
): ScanTableItem[] {
  return safeArray(items).map(mapScanServiceItemToTableItem);
}

function resolvePublicVisibleCount(totalCount: number): number {
  const computed = Math.floor(totalCount * PUBLIC_VISIBLE_PERCENT);

  return clamp(
    computed || PUBLIC_MIN_VISIBLE,
    PUBLIC_MIN_VISIBLE,
    PUBLIC_MAX_VISIBLE
  );
}

async function getScanData(): Promise<ScanPageViewModel> {
  const result = await getScanService({
    quote: DEFAULT_QUOTE,
    sort: DEFAULT_SORT,
    limit: DEFAULT_SCAN_FETCH_LIMIT,
    noStore: false,
  });

  const normalizedItems = normalizeItems(result.data);

  const totalCount =
    typeof result.count === "number" && Number.isFinite(result.count)
      ? result.count
      : normalizedItems.length;

  const visibleCount = Math.min(
    resolvePublicVisibleCount(totalCount),
    normalizedItems.length
  );

  return {
    items: normalizedItems.slice(0, visibleCount),
    source: safeString(result.source, "fallback"),
    quote: safeString(result.quote, DEFAULT_QUOTE),
    totalCount,
    visibleCount,
    warnings: uniqueWarnings(result.warnings).slice(0, MAX_PUBLIC_WARNINGS),
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
  return <span className="chip">{children}</span>;
}

function NoticeBox({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "warning" | "error";
}) {
  const noticeClass =
    tone === "error"
      ? "notice error"
      : tone === "warning"
        ? "notice warn"
        : "notice";

  return (
    <div className={noticeClass}>
      <p className="noticeTitle">{title}</p>
      <div className="noticeText">{children}</div>
    </div>
  );
}

function CompactStateBlock({
  state,
  warning,
}: {
  state: MarketState | null;
  warning: string | null;
}) {
  if (!state && !warning) return null;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">État</h2>
        {warning ? (
          <span className="text-xs text-neutral-500">{warning}</span>
        ) : null}
      </div>

      <MarketStatePanel state={state} />
    </div>
  );
}

export default async function ScanPage() {
  let fatalError: string | null = null;
  let viewModel: ScanPageViewModel = {
    items: [],
    source: "fallback",
    quote: DEFAULT_QUOTE,
    totalCount: 0,
    visibleCount: 0,
    warnings: [],
    error: null,
  };
  let marketState: MarketState | null = null;
  let marketStateWarning: string | null = null;
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
    marketStateWarning = stateResult.value.warning;

    if (stateResult.value.warning) {
      pageWarnings.push(stateResult.value.warning);
    }
  } else {
    pageWarnings.push("market_state_request_failed");
  }

  const allWarnings = uniqueWarnings(viewModel.warnings, pageWarnings).slice(
    0,
    MAX_PUBLIC_WARNINGS
  );

  return (
    <main className="panel">
      <section className="section flex flex-col gap-5">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Xyvala
          </h1>

          {!fatalError ? (
            <div className="chips">
              <InfoPill>Source : {viewModel.source}</InfoPill>
              <InfoPill>Quote : {viewModel.quote.toUpperCase()}</InfoPill>
              <InfoPill>
                Visibles : {viewModel.visibleCount} / {viewModel.totalCount}
              </InfoPill>
            </div>
          ) : null}
        </header>

        {fatalError ? (
          <NoticeBox title="Erreur" tone="error">
            {fatalError}
          </NoticeBox>
        ) : null}

        {!fatalError ? (
          <div className="tableWrap">
            <ScanTable
              assets={viewModel.items}
              quote={viewModel.quote}
              sort={DEFAULT_SORT}
              limit={viewModel.visibleCount}
            />
          </div>
        ) : null}

        {!fatalError ? (
          <CompactStateBlock
            state={marketState}
            warning={marketStateWarning}
          />
        ) : null}

        {!fatalError && viewModel.error ? (
          <NoticeBox title="Source dégradée" tone="warning">
            {viewModel.error}
          </NoticeBox>
        ) : null}

        {!fatalError && allWarnings.length > 0 ? (
          <NoticeBox title="Système">
            <ul className="space-y-1">
              {allWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </NoticeBox>
        ) : null}
      </section>
    </main>
  );
}
