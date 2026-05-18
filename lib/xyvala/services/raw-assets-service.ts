/* ============================================================================
 * FILE: lib/xyvala/services/raw-assets-service.ts
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

import {
  mapCoinGeckoAsset,
  type CoinGeckoMappedAsset,
} from "@/lib/xyvala/mapping/coingecko-mapper";

import { runMappingRfs } from "@/lib/xyvala/mapping/mapping-rfs";
import { runMappingMci } from "@/lib/xyvala/mapping/mapping-mci";
import { runRfsMarket } from "@/lib/xyvala/engine/rfs-market";
import { runMciMarket } from "@/lib/xyvala/engine/mci-market";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RawAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  stability_score: number | null;
  opportunity_score: number | null;

  regime: "STABLE" | "TRANSITION" | "VOLATILE" | null;
  decision: "ALLOW" | "WATCH" | "BLOCK" | null;

  market_cap: number | null;
  volume_24h: number | null;

  sparkline_7d: number[] | null;

  rank: number | null;
  logo_url: string | null;

  binance_url: string;
  affiliate_url: string;
};

export type RawAssetsResult = {
  ok: boolean;
  data: RawAsset[];
  warnings: string[];
  error: string | null;
  meta?: {
    quote: Quote;
    source_mode: "FULL" | "DEGRADED" | "EMERGENCY";
    fallback_level: 0 | 1 | 2;
    degradation_score: number;
    provider_raw_count: number;
    provider_mapped_count: number;
    mapping_rfs_count: number;
    propagated_count: number;
    mapping_propagation_decision: "ALLOW" | "WATCH" | "BLOCK";
    mapping_propagation_mode: "FULL" | "DEGRADED" | "BLOCKED";
  };
};

type MarketEvaluation = {
  mapped: CoinGeckoMappedAsset;
  marketRfs: ReturnType<typeof runRfsMarket>;
  marketMci: ReturnType<typeof runMciMarket>;
};

type BuildMetaInput = {
  quote: Quote;
  sourceMode: NonNullable<RawAssetsResult["meta"]>["source_mode"];
  fallbackLevel: NonNullable<RawAssetsResult["meta"]>["fallback_level"];
  degradationScore: number;
  providerRawCount: number;
  providerMappedCount: number;
  mappingRfsCount: number;
  propagatedCount: number;
  mappingPropagationDecision: NonNullable<
    RawAssetsResult["meta"]
  >["mapping_propagation_decision"];
  mappingPropagationMode: NonNullable<
    RawAssetsResult["meta"]
  >["mapping_propagation_mode"];
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_QUOTE: Quote = "eur";
const DEFAULT_API_BASE_URL = "https://api.coingecko.com/api/v3";
const DEFAULT_PER_PAGE = 250;
const DEFAULT_PAGE = 1;
const REQUEST_TIMEOUT_MS = 12_000;

const MIN_EMERGENCY_UNIVERSE = 20;
const MAX_EMERGENCY_UNIVERSE = 50;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeStr(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeUpper(value: unknown, fallback = ""): string {
  const text = safeStr(value, fallback);
  return text ? text.toUpperCase() : "";
}

function normalizeQuote(value: Quote | string | null | undefined): Quote {
  if (value === "usd") return "usd";
  if (value === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function buildAbortSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

function countWarnings(warnings: string[]): string[] {
  const counts = new Map<string, number>();

  for (const warning of warnings) {
    const key = safeStr(warning);
    if (!key) continue;

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([warning, count]) => `${warning}:${count}`);
}

function normalizeArrayOfNumbers(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const points = value.filter(
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
  );

  return points.length > 1 ? points : null;
}

function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mappedMarketCap(mapped: CoinGeckoMappedAsset): number {
  return toNullableNumber(mapped.market_cap) ?? -1;
}

function regimeRank(value: "STABLE" | "TRANSITION" | "VOLATILE" | null): number {
  if (value === "STABLE") return 3;
  if (value === "TRANSITION") return 2;
  if (value === "VOLATILE") return 1;

  return 0;
}

function decisionRank(value: "ALLOW" | "WATCH" | "BLOCK" | null): number {
  if (value === "ALLOW") return 3;
  if (value === "WATCH") return 2;
  if (value === "BLOCK") return 1;

  return 0;
}

/* ============================================================================
 * 4. PROVIDER LOADER
 * ========================================================================== */

async function fetchCoinGeckoMarkets(quote: Quote): Promise<unknown> {
  const baseUrl = safeStr(
    process.env.COINGECKO_API_BASE_URL,
    DEFAULT_API_BASE_URL,
  );

  const apiKey = safeStr(process.env.COINGECKO_API_KEY);

  const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, "")}/`;
  const url = new URL("coins/markets", normalizedBaseUrl);

  url.searchParams.set("vs_currency", quote);
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(DEFAULT_PER_PAGE));
  url.searchParams.set("page", String(DEFAULT_PAGE));
  url.searchParams.set("sparkline", "true");
  url.searchParams.set("price_change_percentage", "24h,7d");

  const headers: Record<string, string> = {
    accept: "application/json",
  };

  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
    signal: buildAbortSignal(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`coingecko_http_${response.status}`);
  }

  return response.json();
}

/* ============================================================================
 * 5. RAW ASSET BUILDERS
 * ========================================================================== */

function buildBinanceUrl(symbol: string): string {
  return `https://www.binance.com/en/trade/${symbol.toUpperCase()}_USDT`;
}

function buildAffiliateUrl(url: string): string {
  const ref = safeStr(process.env.BINANCE_REF);
  return ref ? `${url}?ref=${ref}` : url;
}

function toRawAssetFromEvaluation(
  evaluation: MarketEvaluation,
  identity?: {
    id?: string;
    symbol?: string;
    name?: string;
  },
): RawAsset {
  const { mapped, marketRfs, marketMci } = evaluation;

  const symbol = safeUpper(
    identity?.symbol,
    safeUpper(mapped.canonical_symbol, "UNKNOWN"),
  );

  const id = safeStr(
    identity?.id,
    safeStr(mapped.canonical_id, symbol.toLowerCase()),
  );

  const name = safeStr(identity?.name, safeStr(mapped.canonical_name, symbol));

  const binanceUrl = safeStr(mapped.binance_url) || buildBinanceUrl(symbol);

  return {
    id,
    symbol,
    name,

    price: mapped.price,
    chg_24h_pct: mapped.chg_24h_pct,
    chg_7d_pct: mapped.chg_7d_pct,

    stability_score: toNullableNumber(marketRfs.scores.stability),
    opportunity_score: toNullableNumber(marketMci.opportunity_score),

    regime: marketRfs.states.regime,
    decision: marketMci.decision,

    market_cap: mapped.market_cap,
    volume_24h: mapped.volume_24h,

    sparkline_7d: normalizeArrayOfNumbers(mapped.sparkline_7d),

    rank: mapped.rank,
    logo_url: mapped.logo_url,

    binance_url: binanceUrl,
    affiliate_url: safeStr(mapped.affiliate_url) || buildAffiliateUrl(binanceUrl),
  };
}

function toEmergencyRawAsset(mapped: CoinGeckoMappedAsset): RawAsset {
  const symbol = safeUpper(mapped.canonical_symbol, "UNKNOWN");
  const id = safeStr(mapped.canonical_id, symbol.toLowerCase());
  const name = safeStr(mapped.canonical_name, symbol);
  const binanceUrl = safeStr(mapped.binance_url) || buildBinanceUrl(symbol);

  return {
    id,
    symbol,
    name,

    price: mapped.price,
    chg_24h_pct: mapped.chg_24h_pct,
    chg_7d_pct: mapped.chg_7d_pct,

    stability_score: 50,
    opportunity_score: 35,

    regime: "TRANSITION",
    decision: "WATCH",

    market_cap: mapped.market_cap,
    volume_24h: mapped.volume_24h,

    sparkline_7d: normalizeArrayOfNumbers(mapped.sparkline_7d),

    rank: mapped.rank,
    logo_url: mapped.logo_url,

    binance_url: binanceUrl,
    affiliate_url: safeStr(mapped.affiliate_url) || buildAffiliateUrl(binanceUrl),
  };
}

/* ============================================================================
 * 6. MARKET EVALUATION
 * ========================================================================== */

function evaluateMappedAsset(mapped: CoinGeckoMappedAsset): MarketEvaluation {
  const marketRfs = runRfsMarket({
    price: mapped.price,
    chg_24h_pct: mapped.chg_24h_pct,
    chg_7d_pct: mapped.chg_7d_pct,
    sparkline_7d: mapped.sparkline_7d,
    market_cap: mapped.market_cap,
    volume_24h: mapped.volume_24h,
  });

  const marketMci = runMciMarket({
    rfs: marketRfs,
  });

  return {
    mapped,
    marketRfs,
    marketMci,
  };
}

function sortEvaluationsByPriority(
  items: MarketEvaluation[],
): MarketEvaluation[] {
  return [...items].sort((left, right) => {
    const leftStability = toNullableNumber(left.marketRfs.scores.stability) ?? 0;
    const rightStability =
      toNullableNumber(right.marketRfs.scores.stability) ?? 0;

    if (leftStability !== rightStability) {
      return rightStability - leftStability;
    }

    const leftRegime = regimeRank(left.marketRfs.states.regime);
    const rightRegime = regimeRank(right.marketRfs.states.regime);

    if (leftRegime !== rightRegime) {
      return rightRegime - leftRegime;
    }

    const leftOpportunity =
      toNullableNumber(left.marketMci.opportunity_score) ?? 0;
    const rightOpportunity =
      toNullableNumber(right.marketMci.opportunity_score) ?? 0;

    if (leftOpportunity !== rightOpportunity) {
      return rightOpportunity - leftOpportunity;
    }

    const leftDecision = decisionRank(left.marketMci.decision);
    const rightDecision = decisionRank(right.marketMci.decision);

    if (leftDecision !== rightDecision) {
      return rightDecision - leftDecision;
    }

    const leftMarketCap = mappedMarketCap(left.mapped);
    const rightMarketCap = mappedMarketCap(right.mapped);

    if (leftMarketCap !== rightMarketCap) {
      return rightMarketCap - leftMarketCap;
    }

    return safeStr(left.mapped.canonical_id).localeCompare(
      safeStr(right.mapped.canonical_id),
    );
  });
}

/* ============================================================================
 * 7. META BUILDER
 * ========================================================================== */

function buildMeta(input: BuildMetaInput): NonNullable<RawAssetsResult["meta"]> {
  return {
    quote: input.quote,
    source_mode: input.sourceMode,
    fallback_level: input.fallbackLevel,
    degradation_score: input.degradationScore,
    provider_raw_count: input.providerRawCount,
    provider_mapped_count: input.providerMappedCount,
    mapping_rfs_count: input.mappingRfsCount,
    propagated_count: input.propagatedCount,
    mapping_propagation_decision: input.mappingPropagationDecision,
    mapping_propagation_mode: input.mappingPropagationMode,
  };
}

function buildMappingMeta(input: {
  quote: Quote;
  mappingMci: ReturnType<typeof runMappingMci>;
  providerRawCount: number;
  providerMappedCount: number;
  mappingRfsCount: number;
  propagatedCount: number;
}): NonNullable<RawAssetsResult["meta"]> {
  return buildMeta({
    quote: input.quote,
    sourceMode: input.mappingMci.source_mode,
    fallbackLevel: input.mappingMci.fallback_level,
    degradationScore: input.mappingMci.degradation_score,
    providerRawCount: input.providerRawCount,
    providerMappedCount: input.providerMappedCount,
    mappingRfsCount: input.mappingRfsCount,
    propagatedCount: input.propagatedCount,
    mappingPropagationDecision: input.mappingMci.mapping_propagation_decision,
    mappingPropagationMode: input.mappingMci.mapping_propagation_mode,
  });
}

function buildEmergencyMeta(input: {
  quote: Quote;
  providerRawCount: number;
  providerMappedCount: number;
  mappingRfsCount: number;
  propagatedCount: number;
}): NonNullable<RawAssetsResult["meta"]> {
  return buildMeta({
    quote: input.quote,
    sourceMode: "EMERGENCY",
    fallbackLevel: 2,
    degradationScore: 100,
    providerRawCount: input.providerRawCount,
    providerMappedCount: input.providerMappedCount,
    mappingRfsCount: input.mappingRfsCount,
    propagatedCount: input.propagatedCount,
    mappingPropagationDecision: "BLOCK",
    mappingPropagationMode: "BLOCKED",
  });
}

/* ============================================================================
 * 8. PUBLIC API
 * ========================================================================== */

export async function loadRawAssets(
  inputQuote?: Quote | string | null,
): Promise<RawAssetsResult> {
  const quote = normalizeQuote(inputQuote);

  try {
    const rawSource = await fetchCoinGeckoMarkets(quote);

    if (!Array.isArray(rawSource)) {
      return {
        ok: false,
        data: [],
        warnings: ["coingecko_invalid_root_shape"],
        error: "coingecko_invalid_root_shape",
        meta: buildEmergencyMeta({
          quote,
          providerRawCount: 0,
          providerMappedCount: 0,
          mappingRfsCount: 0,
          propagatedCount: 0,
        }),
      };
    }

    const providerMapped = rawSource
      .map((item) => mapCoinGeckoAsset(item, quote))
      .filter((item): item is CoinGeckoMappedAsset => item !== null);

    const providerRejectedCount = rawSource.length - providerMapped.length;

    if (providerMapped.length === 0) {
      return {
        ok: false,
        data: [],
        warnings: uniqueWarnings(
          providerRejectedCount > 0
            ? [`coingecko_provider_assets_rejected:${providerRejectedCount}`]
            : [],
          ["coingecko_provider_mapped_empty"],
        ),
        error: "coingecko_provider_mapped_empty",
        meta: buildEmergencyMeta({
          quote,
          providerRawCount: rawSource.length,
          providerMappedCount: 0,
          mappingRfsCount: 0,
          propagatedCount: 0,
        }),
      };
    }

    const mappingRfs = runMappingRfs(providerMapped);
    const mappingMci = runMappingMci(mappingRfs);

    const evaluations = sortEvaluationsByPriority(
      providerMapped.map((mapped) => evaluateMappedAsset(mapped)),
    );

    const evaluationByCanonicalId = new Map(
      evaluations
        .filter((item) => safeStr(item.mapped.canonical_id).length > 0)
        .map((item) => [safeStr(item.mapped.canonical_id), item]),
    );

    const marketWarningsAccumulator: string[] = [];

    const fullyPropagatedAssets: RawAsset[] = mappingRfs.assets
      .map((rfsAsset) => {
        const source = evaluationByCanonicalId.get(
          safeStr(rfsAsset.identity.canonical_id),
        );

        if (!source) {
          marketWarningsAccumulator.push("mapping_source_not_found");
          return null;
        }

        marketWarningsAccumulator.push(...source.marketRfs.warnings);
        marketWarningsAccumulator.push(...source.marketMci.warnings);

        return toRawAssetFromEvaluation(source, {
          id: rfsAsset.identity.canonical_id,
          symbol: rfsAsset.identity.canonical_symbol,
          name: rfsAsset.identity.canonical_name,
        });
      })
      .filter((item): item is RawAsset => item !== null);

    const degradedAssetsFromEvaluations: RawAsset[] = evaluations.map((item) => {
      marketWarningsAccumulator.push(...item.marketRfs.warnings);
      marketWarningsAccumulator.push(...item.marketMci.warnings);

      return toRawAssetFromEvaluation(item, {
        id: safeStr(item.mapped.canonical_id),
        symbol: safeUpper(item.mapped.canonical_symbol),
        name: safeStr(item.mapped.canonical_name),
      });
    });

    const emergencyUniverseSize = Math.max(
      MIN_EMERGENCY_UNIVERSE,
      Math.min(MAX_EMERGENCY_UNIVERSE, providerMapped.length),
    );

    const emergencyAssets = providerMapped
      .slice(0, emergencyUniverseSize)
      .map((mapped) => toEmergencyRawAsset(mapped));

    const finalRejectedCount = Math.max(
      0,
      providerMapped.length - fullyPropagatedAssets.length,
    );

    if (mappingMci.propagation_usable && fullyPropagatedAssets.length > 0) {
      return {
        ok: true,
        data: fullyPropagatedAssets,
        warnings: uniqueWarnings(
          providerRejectedCount > 0
            ? [`coingecko_provider_assets_rejected:${providerRejectedCount}`]
            : [],
          finalRejectedCount > 0
            ? [`mapping_assets_not_propagated:${finalRejectedCount}`]
            : [],
          mappingRfs.warnings,
          mappingMci.warnings,
          mappingMci.degraded_fields.length > 0
            ? [`mapping_degraded_fields:${mappingMci.degraded_fields.join(",")}`]
            : [],
          countWarnings(marketWarningsAccumulator),
          mappingMci.source_mode === "DEGRADED"
            ? ["raw_assets_source_mode_degraded"]
            : [],
        ),
        error: null,
        meta: buildMappingMeta({
          quote,
          mappingMci,
          providerRawCount: rawSource.length,
          providerMappedCount: providerMapped.length,
          mappingRfsCount: mappingRfs.assets.length,
          propagatedCount: fullyPropagatedAssets.length,
        }),
      };
    }

    if (degradedAssetsFromEvaluations.length > 0) {
      return {
        ok: true,
        data: degradedAssetsFromEvaluations,
        warnings: uniqueWarnings(
          providerRejectedCount > 0
            ? [`coingecko_provider_assets_rejected:${providerRejectedCount}`]
            : [],
          finalRejectedCount > 0
            ? [`mapping_assets_not_propagated:${finalRejectedCount}`]
            : [],
          mappingRfs.warnings,
          mappingMci.warnings,
          mappingMci.blocking_reasons,
          mappingMci.degraded_fields.length > 0
            ? [`mapping_degraded_fields:${mappingMci.degraded_fields.join(",")}`]
            : [],
          ["raw_assets_fallback_level_1_degraded_universe"],
          countWarnings(marketWarningsAccumulator),
        ),
        error: null,
        meta: buildMappingMeta({
          quote,
          mappingMci,
          providerRawCount: rawSource.length,
          providerMappedCount: providerMapped.length,
          mappingRfsCount: mappingRfs.assets.length,
          propagatedCount: degradedAssetsFromEvaluations.length,
        }),
      };
    }

    return {
      ok: true,
      data: emergencyAssets,
      warnings: uniqueWarnings(
        providerRejectedCount > 0
          ? [`coingecko_provider_assets_rejected:${providerRejectedCount}`]
          : [],
        mappingRfs.warnings,
        mappingMci.warnings,
        mappingMci.blocking_reasons,
        ["raw_assets_fallback_level_2_emergency_universe"],
      ),
      error: null,
      meta: buildEmergencyMeta({
        quote,
        providerRawCount: rawSource.length,
        providerMappedCount: providerMapped.length,
        mappingRfsCount: mappingRfs.assets.length,
        propagatedCount: emergencyAssets.length,
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "coingecko_unknown_error";

    return {
      ok: false,
      data: [],
      warnings: uniqueWarnings([`raw_assets_load_failed:${message}`]),
      error: message,
      meta: buildEmergencyMeta({
        quote,
        providerRawCount: 0,
        providerMappedCount: 0,
        mappingRfsCount: 0,
        propagatedCount: 0,
      }),
    };
  }
}
