// app/scan/page.tsx

import React from "react";
import { getXyvalaScan, type ScanAsset } from "@/lib/xyvala/scan";
import { xyvalaServerFetch } from "@/lib/xyvala/server-client";
import { ScanTable } from "@/components/scan-table";
import { MarketStatePanel } from "@/components/market-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_QUOTE = "usd";
const DEFAULT_SORT = "score_desc";
const DEFAULT_LIMIT = 100;
const MARKET_STATE_TIMEOUT_MS = 3500;

type ScanTableItem = ScanAsset & {
  affiliate_url: string;
};

type MarketState = {
  market_regime?: string | null;
  volatility_state?: string | null;
  liquidity_state?: string | null;
  risk_mode?: string | null;
  execution_bias?: string | null;
};

type ScanPageViewModel = {
  items: ScanTableItem[];
  source: string;
  quote: string;
  count: number;
  warnings: string[];
  error: string | null;
};

type MarketStateApiResponse = {
  ok?: boolean;
  state?: MarketState | null;
  error?: string | null;
  meta?: {
    warnings?: string[];
  };
};

type MarketStateResult = {
  state: MarketState | null;
  warning: string | null;
};

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
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

function normalizeItems(items: ScanAsset[] | null | undefined): ScanTableItem[] {
  return safeArray(items).map((item) => ({
    ...item,
    affiliate_url: safeString(item.affiliate_url ?? item.binance_url, "#"),
  }));
}

function normalizeUiWarning(warning: string): string | null {
  const w = safeString(warning, "");

  if (!w) return null;

  if (
    w === "missing_api_key" ||
    w === "invalid_api_key" ||
    w === "internal_key_missing" ||
    w === "internal_base_url_unavailable"
  ) {
    return "market_state_unavailable";
  }

  if (
    w === "request_timeout" ||
    w === "request_failed" ||
    w === "json_parse_failed"
  ) {
    return "market_state_unavailable";
  }

  if (w.startsWith("http_")) {
    return "market_state_unavailable";
  }

  if (w.startsWith("fetch_failed:")) {
    return "market_state_unavailable";
  }

  return w;
}

function buildScanViewModel(
  result: Awaited<ReturnType<typeof getXyvalaScan>> | null | undefined
): ScanPageViewModel {
  const items = normalizeItems(result?.data);

  return {
    items,
    source: safeString(result?.source, "fallback"),
    quote: safeString(result?.quote, DEFAULT_QUOTE),
    count: items.length,
    warnings: uniqueWarnings(result?.meta?.warnings),
    error:
      typeof result?.error === "string" && result.error.trim().length > 0
        ? result.error
        : null,
  };
}

async function getMarketState(): Promise<MarketStateResult> {
  const result = await xyvalaServerFetch<MarketStateApiResponse>("/api/state", {
    searchParams: {
      quote: DEFAULT_QUOTE,
    },
    timeoutMs: MARKET_STATE_TIMEOUT_MS,
  });

  if (!result.ok) {
    return {
      state: null,
      warning: normalizeUiWarning(
        result.error ?? result.warnings[0] ?? "market_state_unavailable"
      ),
    };
  }

  const payload = result.data;

  if (!payload || payload.ok !== true) {
    return {
      state: null,
      warning: normalizeUiWarning(
        payload?.error ?? "market_state_unavailable"
      ),
    };
  }

  return {
    state: payload.state ?? null,
    warning: null,
  };
}

function StatusPill({ children }: { children: React.ReactNode }) {
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
  tone?: "neutral" | "warning" | "error";
}) {
  const toneClasses =
    tone === "error"
      ? "border-red-500/20 bg-red-500/5 text-red-200"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
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
  let viewModel: ScanPageViewModel = buildScanViewModel(null);
  let marketState: MarketState | null = null;
  const pageWarnings: string[] = [];

  const [scanResult, stateResult] = await Promise.allSettled([
    getXyvalaScan({
      quote: DEFAULT_QUOTE,
      sort: DEFAULT_SORT,
      limit: DEFAULT_LIMIT,
    }),
    getMarketState(),
  ]);

  if (scanResult.status === "fulfilled") {
    viewModel = buildScanViewModel(scanResult.value);
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
    pageWarnings.push("market_state_unavailable");
  }

  const items = viewModel.items;
  const allWarnings = uniqueWarnings(
    viewModel.warnings,
    pageWarnings.map((warning) => normalizeUiWarning(warning)).filter(Boolean) as string[]
  );

  const hasMarketStateIssue = allWarnings.includes("market_state_unavailable");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Xyvala
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Market intelligence.
          </p>
        </div>

        {!fatalError ? (
          <div className="flex flex-wrap gap-2">
            <StatusPill>Live</StatusPill>
            <StatusPill>{viewModel.quote.toUpperCase()}</StatusPill>
            <StatusPill>{viewModel.count} assets</StatusPill>
            <StatusPill>{viewModel.source}</StatusPill>
          </div>
        ) : null}
      </div>

      {fatalError ? (
        <div className="mb-6">
          <NoticeBox title="Chargement indisponible" tone="error">
            Le moteur n’a pas pu charger cette vue.
          </NoticeBox>
        </div>
      ) : null}

      {!fatalError && viewModel.error ? (
        <div className="mb-6">
          <NoticeBox title="Source partiellement dégradée" tone="warning">
            Le scan reste disponible, mais une source secondaire a renvoyé une réponse incomplète.
          </NoticeBox>
        </div>
      ) : null}

      {!fatalError ? (
        <div className="mb-6">
          <MarketStatePanel state={marketState} />
        </div>
      ) : null}

      {!fatalError && hasMarketStateIssue ? (
        <div className="mb-6">
          <NoticeBox title="Contexte marché indisponible" tone="neutral">
            Le scan reste disponible. Le contexte global du marché n’a pas pu être enrichi pour cette requête.
          </NoticeBox>
        </div>
      ) : null}

      {!fatalError && items.length > 0 ? <ScanTable items={items} /> : null}

      {!fatalError && items.length === 0 ? (
        <div className="mt-6">
          <NoticeBox title="Aucun actif exploitable" tone="neutral">
            Aucun résultat pertinent n’a été renvoyé pour cette vue.
          </NoticeBox>
        </div>
      ) : null}
    </main>
  );
}
