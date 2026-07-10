"use client";

/* ============================================================================
 * FILE: components/scan-table.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public structural market interface
 *
 * ROLE
 * - render public ScanAsset data
 * - display public structural labels produced upstream
 * - keep UI passive and deterministic
 *
 * DIRECTIVES
 * - public UI only
 * - no private score usage
 * - no local structural reconstruction
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration exposure
 * - no investment advice
 * - one public data source for desktop and mobile
 * - UI displays public labels only
 * ========================================================================== */

import React, { useDeferredValue, useMemo, useState } from "react";
import { Sparkline } from "./sparkline";

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import {
  buildPublicMarketStructureSummary,
  type PublicActivityLabel,
  type PublicCoreStructure,
  type PublicDecayContext,
  type PublicGrowthContext,
  type PublicImpulseContext,
  type PublicMarketClimate,
  type PublicSparklineContext7D,
  type PublicStructureTransition,
} from "@/lib/xyvala/public/public-structure";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type Quote = "EUR" | "USD" | "USDT";

type AssetInput = Partial<ScanAsset>;

type Asset = {
  key: string;
  rank: number | null;
  symbol: string;
  name: string;
  logoUrl: string | null;
  price: number | null;
  pct24h: number | null;
  pct7d: number | null;
  marketCap: number | null;
  volume24h: number | null;
  sparkline: number[] | null;

  activity: PublicActivityLabel;
  sparklineContext7D: PublicSparklineContext7D;
  transition: PublicStructureTransition;
  impulseContext: PublicImpulseContext;
};

type Props = {
  assets: unknown;
  quote?: Quote | string;
  limit?: number;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeRank(value: unknown): number | null {
  const parsed = safeNumberOrNull(value);
  return parsed !== null && parsed > 0 ? Math.trunc(parsed) : null;
}

function safeArrayNumbers(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const points = value.filter(
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
  );

  return points.length >= 2 ? points : null;
}

function normalizeQuote(value: Quote | string): Quote {
  const quote = safeString(value).toUpperCase();

  if (quote === "USD") return "USD";
  if (quote === "USDT") return "USDT";

  return "EUR";
}

function normalizeSourceAssets(value: unknown): unknown[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
  }

  return null;
}

/* ============================================================================
 * 3. PUBLIC LABEL NORMALIZERS
 * ========================================================================== */

function normalizePublicActivity(value: unknown): PublicActivityLabel {
  if (value === "Low") return "Low";
  if (value === "Normal") return "Normal";
  if (value === "High") return "High";

  return "Unavailable";
}

function normalizeSparklineContext7D(
  value: unknown,
): PublicSparklineContext7D {
  if (value === "Compression") return "Compression";
  if (value === "Expansion") return "Expansion";
  if (value === "Recovery") return "Recovery";
  if (value === "Fragmented") return "Fragmented";
  if (value === "Stable") return "Stable";
  if (value === "Neutral") return "Neutral";

  return "Unavailable";
}

function normalizeStructureTransition(
  value: unknown,
): PublicStructureTransition {
  if (value === "Compression Phase") return "Compression Phase";
  if (value === "Expansion Phase") return "Expansion Phase";
  if (value === "Recovery Structure") return "Recovery Structure";
  if (value === "Fragmentation Detected") return "Fragmentation Detected";
  if (value === "Stable Structure") return "Stable Structure";
  if (value === "Active Expansion") return "Active Expansion";

  return "Neutral Structure";
}

function normalizeImpulseContext(value: unknown): PublicImpulseContext {
  if (value === "Compression") return "Compression";
  if (value === "Pressure Building") return "Pressure Building";
  if (value === "Release") return "Release";
  if (value === "Exhaustion") return "Exhaustion";
  if (value === "Neutral") return "Neutral";

  return "Unavailable";
}

/* ============================================================================
 * 4. NORMALIZATION
 * ========================================================================== */

function normalizeAsset(input: AssetInput): Asset {
  const symbol = safeString(input.symbol, "UNKNOWN").toUpperCase();
  const name = safeString(input.name, symbol);

  console.log("XYVALA_UI_IMPULSE_MAPPING", {
  symbol: input.symbol,
  public_impulse_context: input.public_impulse_context,
});

  console.log("SCAN_TABLE_INPUT", {
  symbol: input.symbol,
  public_impulse_context: input.public_impulse_context,
  keys: Object.keys(input),
});

  return {
    key: safeString(input.id, symbol),
    rank: safeRank(input.rank),
    symbol,
    name,
    logoUrl: safeString(input.logo_url) || null,

    price: safeNumberOrNull(input.price),
    pct24h: safeNumberOrNull(input.chg_24h_pct),
    pct7d: safeNumberOrNull(input.chg_7d_pct),
    marketCap: safeNumberOrNull(input.market_cap),
    volume24h: safeNumberOrNull(input.volume_24h),
    sparkline: safeArrayNumbers(input.sparkline_7d),

    activity: normalizePublicActivity(input.public_activity),
    sparklineContext7D: normalizeSparklineContext7D(
      input.public_sparkline_context_7d,
    ),
    transition: normalizeStructureTransition(
      input.public_structure_transition,
    ),
    impulseContext: normalizeImpulseContext(input.public_impulse_context),
  };
}

/* ============================================================================
 * 5. SORTING
 * ========================================================================== */

function getTransitionPriority(transition: PublicStructureTransition): number {
  if (transition === "Fragmentation Detected") return 6;
  if (transition === "Active Expansion") return 5;
  if (transition === "Expansion Phase") return 4;
  if (transition === "Recovery Structure") return 3;
  if (transition === "Neutral Structure") return 2;
  if (transition === "Stable Structure") return 1;

  return 0;
}

function pickTransitionHighlights(data: Asset[]): Asset[] {
  return [...data]
    .sort((left, right) => {
      const transitionDelta =
        getTransitionPriority(right.transition) -
        getTransitionPriority(left.transition);

      if (transitionDelta !== 0) return transitionDelta;

      const leftVolume = left.volume24h ?? -1;
      const rightVolume = right.volume24h ?? -1;

      if (leftVolume !== rightVolume) return rightVolume - leftVolume;

      return left.symbol.localeCompare(right.symbol);
    })
    .slice(0, 3);
}

/* ============================================================================
 * 6. FORMATTERS
 * ========================================================================== */

function resolveValueClass(value: number | null): string {
  if (value === null) return "valueNeutral";
  if (value > 0) return "valuePositive";
  if (value < 0) return "valueNegative";

  return "valueNeutral";
}

function formatPrice(value: number | null, quote: Quote): string {
  if (value === null) return "–";

  const currency = quote === "USD" ? "USD" : "EUR";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

function formatPct(value: number | null): string {
  if (value === null) return "–";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatCompactCurrency(value: number | null, quote: Quote): string {
  if (value === null) return "–";

  const currency = quote === "USD" ? "USD" : "EUR";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRank(value: number | null, fallback: number): string {
  return String(value ?? fallback);
}

/* ============================================================================
 * 7. VIEW COMPONENTS
 * ========================================================================== */

function ContextBand({
  marketClimate,
  dominantTransition,
  impulseContext,
  growthContext,
  coreStructure,
  decayContext,
  activityContext,
  assetsCount,
}: {
  marketClimate: PublicMarketClimate;
  dominantTransition: PublicStructureTransition | "Unavailable";
  impulseContext: PublicImpulseContext;
  growthContext: PublicGrowthContext;
  coreStructure: PublicCoreStructure;
  decayContext: PublicDecayContext;
  activityContext: PublicActivityLabel;
  assetsCount: number;
}) {
  return (
    <div className="contextBand">
      <div className="contextCard contextCardMain">
        <span>Market Climate</span>
        <strong>{marketClimate}</strong>
      </div>

      <div className="contextCard">
        <span>Dominant Transition</span>
        <strong>{dominantTransition}</strong>
      </div>

      <div className="contextCard">
        <span>Impulse Context</span>
        <strong>{impulseContext}</strong>
      </div>

      <div className="contextCard">
        <span>Activity</span>
        <strong>{activityContext}</strong>
      </div>

      <div className="contextCard">
        <span>Growth Context</span>
        <strong>{growthContext}</strong>
      </div>

      <div className="contextCard">
        <span>Core Structure</span>
        <strong>{coreStructure}</strong>
      </div>

      <div className="contextCard">
        <span>Decay Context</span>
        <strong>{decayContext}</strong>
      </div>

      <div className="contextCard">
        <span>Assets Read</span>
        <strong>{assetsCount}</strong>
      </div>
    </div>
  );
}

function TransitionPanel({ assets }: { assets: Asset[] }) {
  return (
    <section className="transitionPanel">
      <div className="transitionPanelHeader">
        <h2>Structural Transitions</h2>
      </div>

      <div className="transitionGrid">
        {assets.map((asset) => (
          <article className="transitionCard" key={`transition-${asset.key}`}>
            <div>
              <strong>{asset.symbol}</strong>
              <span>{asset.name}</span>
            </div>

            <div className="transitionCardSpark">
              <Sparkline data={asset.sparkline} animated />
            </div>

            <div>
              <span>Transition</span>
              <p>{asset.transition}</p>
            </div>

            <div>
              <span>Impulse</span>
              <p>{asset.impulseContext}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DesktopMarketTable({
  assets,
  quote,
}: {
  assets: Asset[];
  quote: Quote;
}) {
  return (
    <div className="desktopMarketTable">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Asset</th>
            <th>Price</th>
            <th>24H</th>
            <th>7D</th>
            <th>Activity</th>
            <th>Impulse</th>
            <th>Volume</th>
            <th>Market Cap</th>
            <th>Transition</th>
          </tr>
        </thead>

        <tbody>
          {assets.map((asset, index) => (
            <tr key={asset.key}>
              <td>{formatRank(asset.rank, index + 1)}</td>

              <td>
                <strong>{asset.symbol}</strong>
                <div>{asset.name}</div>
              </td>

              <td className="dynamicPrice">
                {formatPrice(asset.price, quote)}
              </td>

              <td className={`dynamicPct24h ${resolveValueClass(asset.pct24h)}`}>
                {formatPct(asset.pct24h)}
              </td>

              <td>
                <Sparkline data={asset.sparkline} animated />
              </td>

              <td>{asset.activity}</td>
              <td>{asset.impulseContext}</td>

              <td>{formatCompactCurrency(asset.volume24h, quote)}</td>
              <td>{formatCompactCurrency(asset.marketCap, quote)}</td>

              <td>{asset.transition}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileMarketCards({
  assets,
  quote,
}: {
  assets: Asset[];
  quote: Quote;
}) {
  return (
    <div className="mobileMarketCards">
      {assets.map((asset, index) => (
        <article className="mobileAssetCard" key={`mobile-${asset.key}`}>
          <div className="mobileAssetHeader">
            <div>
              <span>#{formatRank(asset.rank, index + 1)}</span>
              <strong>{asset.symbol}</strong>
              <p>{asset.name}</p>
            </div>

            <div className="mobileAssetPrice">
              <strong className="dynamicPrice">
                {formatPrice(asset.price, quote)}
              </strong>

              <span className={`dynamicPct24h ${resolveValueClass(asset.pct24h)}`}>
                {formatPct(asset.pct24h)}
              </span>
            </div>
          </div>

          <div className="mobileSparkline">
            <Sparkline data={asset.sparkline} animated />
          </div>

          <div className="mobileAssetMeta">
            <div>
              <span>Transition</span>
              <strong>{asset.transition}</strong>
            </div>

            <div>
              <span>Impulse</span>
              <strong>{asset.impulseContext}</strong>
            </div>

            <div>
              <span>Activity</span>
              <strong>{asset.activity}</strong>
            </div>

            <div>
              <span>Volume</span>
              <strong>{formatCompactCurrency(asset.volume24h, quote)}</strong>
            </div>

            <div>
              <span>Market Cap</span>
              <strong>{formatCompactCurrency(asset.marketCap, quote)}</strong>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ============================================================================
 * 8. MAIN COMPONENT
 * ========================================================================== */

export default function ScanTable({
  assets,
  quote = "EUR",
  limit = 250,
}: Props) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const normalizedQuote = normalizeQuote(quote);
  const sourceAssets = normalizeSourceAssets(assets);

  const visibleData = useMemo(() => {
    if (!sourceAssets) return [];

    const q = deferredQuery.trim().toLowerCase();

    const normalized = sourceAssets.map((asset) =>
      normalizeAsset(asset as AssetInput),
    );

    const filtered = q
      ? normalized.filter(
          (asset) =>
            asset.symbol.toLowerCase().includes(q) ||
            asset.name.toLowerCase().includes(q),
        )
      : normalized;

    return filtered.slice(0, limit);
  }, [sourceAssets, deferredQuery, limit]);

  const structuralSummary = useMemo(() => {
  return buildPublicMarketStructureSummary(
    visibleData.map((asset) => ({
      activity: asset.activity,
      sparkline_context_7d: asset.sparklineContext7D,
      structure_transition: asset.transition,
      impulse_context: asset.impulseContext ?? "Unavailable",
    })),
  );
}, [visibleData]);

  const transitionHighlights = useMemo(() => {
    return pickTransitionHighlights(visibleData);
  }, [visibleData]);

  if (!sourceAssets) {
    return <div className="emptyState">No data</div>;
  }

  return (
    <section className="section">
      <header className="header">
        <h1>Xyvala</h1>
        <p>European Market Structure Intelligence</p>
        <p>Read structural market transitions before they become obvious.</p>
      </header>

      <ContextBand
        marketClimate={structuralSummary.market_climate}
        dominantTransition={structuralSummary.dominant_transition}
        impulseContext={structuralSummary.impulse_context}
        activityContext={structuralSummary.activity_context}
        growthContext={structuralSummary.growth_context}
        coreStructure={structuralSummary.core_structure}
        decayContext={structuralSummary.decay_context}
        assetsCount={structuralSummary.assets_count}
      />

      <div className="toolbar">
        <div className="marketState">
          Structural Market Context: {structuralSummary.market_climate}
        </div>

        <input
          type="search"
          placeholder="BTC, ETH, SOL..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <TransitionPanel assets={transitionHighlights} />

      <section className="marketSection">
        <div className="marketSectionHeader">
          <h2>Market Structure</h2>
        </div>

        <DesktopMarketTable assets={visibleData} quote={normalizedQuote} />
        <MobileMarketCards assets={visibleData} quote={normalizedQuote} />
      </section>

      <p>Not investment advice.</p>
    </section>
  );
}
