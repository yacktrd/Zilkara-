/* ============================================================================
 * FILE: lib/xyvala/services/raw-assets-service.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - load canonical raw assets for Xyvala rebuild pipeline
 * - fetch provider payload from CoinGecko market endpoint
 * - normalize provider payload through provider mapper
 * - validate propagation quality through mapping-rfs and mapping-mci
 * - compute market RFS and market MCI before canonical raw asset propagation
 * - return deterministic rebuild-ready raw assets only
 * - preserve universe continuity through explicit multi-level fallback
 *
 * PARENTS
 * - lib/xyvala/mapping/coingecko-mapper.ts
 * - lib/xyvala/mapping/mapping-rfs.ts
 * - lib/xyvala/mapping/mapping-mci.ts
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/engine/mci-market.ts
 * - app/api/rebuild/route.ts
 *
 * DIRECTIVES
 * - no dependency on /api/scan
 * - no dependency on snapshot cache
 * - no dependency on scan-service.ts
 * - EUR remains default quote
 * - deterministic output only
 * - same canonical input => same output shape
 * - explicit failure only if provider source is unavailable or invalid
 * - mapping propagation must remain separated from market decision logic
 * - technical propagation logic must not be exposed as product decision logic
 * - never return an empty universe when valid mapped assets still exist
 * - fallback must remain explicit, auditable and bounded
 * - ranking priority remains: stability > regime > opportunity
 *
 * INPUTS
 * - quote
 *
 * OUTPUTS
 * - RawAssetsResult
 *
 * INVARIANTS
 * - raw-assets-service never calls /api/scan
 * - raw-assets-service never reads snapshot cache
 * - nullable public fields remain nullable
 * - output is suitable for snapshot normalization
 * - technical propagation gating is handled before market decision propagation
 * - degraded fallback never mutates analytical truth already computed
 *
 * CRITICAL DEPENDENCIES
 * - CoinGecko raw market endpoint
 * - coingecko-mapper
 * - mapping-rfs
 * - mapping-mci
 * - rfs-market
 * - mci-market
 *
 * SENSITIVE ZONES
 * - upstream API availability
 * - URL construction
 * - provider payload validation
 * - canonical identity propagation
 * - mapping propagation gating
 * - market decision propagation
 * - fallback ranking and degradation scoring
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

type SourceMode = NonNullable<RawAssetsResult["meta"]>["source_mode"];

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

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeQuote(value: Quote | string | null | undefined): Quote {
  if (value === "usd") return "usd";
  if (value === "usdt") return "usdt";
  return DEFAULT_QUOTE;
}

function buildAbortSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));

  return [
    ...new Set(
      merged.filter(
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

function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/* ============================================================================
 * 4. RAW SOURCE LOADER
 * ----------------------------------------------------------------------------
 * ROLE
 * - load CoinGecko raw market source only
 * - no provider normalization here
 * - no canonical shaping here
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
 * 5. CANONICAL BUILDERS
 * ----------------------------------------------------------------------------
 * ROLE
 * - convert analytical outputs into snapshot-ready raw assets
 * - keep market outputs explicit
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
  const name = safeStr(
    identity?.name,
    safeStr(mapped.canonical_name, symbol),
  );

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
 * ----------------------------------------------------------------------------
 * ROLE
 * - evaluate each mapped asset through market RFS then market MCI
 * - keep warnings explicit
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

function sortEvaluationsByPriority(items: MarketEvaluation[]): MarketEvaluation[] {
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

function mappedMarketCap(mapped: CoinGeckoMappedAsset): number {
  return toNullableNumber(mapped.market_cap) ?? -1;
}

/* ============================================================================
 * 7. DEGRADATION / FALLBACK
 * ----------------------------------------------------------------------------
 * ROLE
 * - quantify degradation explicitly
 * - preserve a usable universe whenever possible
 * ========================================================================== */

function readMappingReadinessScore(mappingMci: ReturnType<typeof runMappingMci>): number {
  return clampScore(mappingMci.mapping_readiness_score);
}

function readPropagationRiskScore(mappingMci: ReturnType<typeof runMappingMci>): number {
  return clampScore(
    "propagation_risk_score" in mappingMci &&
      typeof mappingMci.propagation_risk_score === "number"
      ? mappingMci.propagation_risk_score
      : 50,
  );
}

function readRiskRuptureScore(mappingMci: ReturnType<typeof runMappingMci>): number {
  return clampScore(
    "risk_rupture_score" in mappingMci &&
      typeof mappingMci.risk_rupture_score === "number"
      ? mappingMci.risk_rupture_score
      : 50,
  );
}

function computeDegradationScore(input: {
  providerMappedCount: number;
  propagatedCount: number;
  mappingReadinessScore: number;
  propagationRiskScore: number;
  riskRuptureScore: number;
  sourceMode: SourceMode;
}): number {
  const coverageRatio =
    input.providerMappedCount > 0
      ? (input.propagatedCount / input.providerMappedCount) * 100
      : 0;

  const modePenalty =
    input.sourceMode === "FULL" ? 0 : input.sourceMode === "DEGRADED" ? 20 : 40;

  return clampScore(
    (100 - coverageRatio) * 0.25 +
      (100 - input.mappingReadinessScore) * 0.25 +
      input.propagationRiskScore * 0.25 +
      input.riskRuptureScore * 0.15 +
      modePenalty * 0.1,
  );
}

function buildMeta(input: {
  quote: Quote;
  sourceMode: SourceMode;
  fallbackLevel: 0 | 1 | 2;
  degradationScore: number;
  providerRawCount: number;
  providerMappedCount: number;
  mappingRfsCount: number;
  propagatedCount: number;
  mappingPropagationDecision: "ALLOW" | "WATCH" | "BLOCK";
  mappingPropagationMode: "FULL" | "DEGRADED" | "BLOCKED";
}): NonNullable<RawAssetsResult["meta"]> {
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

/* ============================================================================
 * 8. PUBLIC API
 * ----------------------------------------------------------------------------
 * ROLE
 * - fetch provider payload
 * - map provider payload through provider-mapper
 * - run mapping-rfs and mapping-mci
 * - propagate canonical raw assets when possible
 * - degrade explicitly instead of returning an empty universe
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
        meta: buildMeta({
          quote,
          sourceMode: "EMERGENCY",
          fallbackLevel: 2,
          degradationScore: 100,
          providerRawCount: 0,
          providerMappedCount: 0,
          mappingRfsCount: 0,
          propagatedCount: 0,
          mappingPropagationDecision: "BLOCK",
          mappingPropagationMode: "BLOCKED",
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
        meta: buildMeta({
          quote,
          sourceMode: "EMERGENCY",
          fallbackLevel: 2,
          degradationScore: 100,
          providerRawCount: rawSource.length,
          providerMappedCount: 0,
          mappingRfsCount: 0,
          propagatedCount: 0,
          mappingPropagationDecision: "BLOCK",
          mappingPropagationMode: "BLOCKED",
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

    const emergencyAssets: RawAsset[] = providerMapped
      .slice(0, emergencyUniverseSize)
      .map((mapped) => toEmergencyRawAsset(mapped));

    const finalRejectedCount = Math.max(
      0,
      providerMapped.length - fullyPropagatedAssets.length,
    );

    const mappingReadinessScore = readMappingReadinessScore(mappingMci);
    const propagationRiskScore = readPropagationRiskScore(mappingMci);
    const riskRuptureScore = readRiskRuptureScore(mappingMci);

    /**
     * LEVEL 0 — FULL
     * - mapping decision ALLOW or WATCH
     * - canonical propagation produced assets
     */
    if (
      mappingMci.mapping_propagation_decision !== "BLOCK" &&
      fullyPropagatedAssets.length > 0
    ) {
      const sourceMode: SourceMode =
        mappingMci.mapping_propagation_mode === "FULL" ? "FULL" : "DEGRADED";

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
          sourceMode === "DEGRADED" ? ["raw_assets_source_mode_degraded"] : [],
        ),
        error: null,
        meta: buildMeta({
          quote,
          sourceMode,
          fallbackLevel: sourceMode === "FULL" ? 0 : 1,
          degradationScore: computeDegradationScore({
            providerMappedCount: providerMapped.length,
            propagatedCount: fullyPropagatedAssets.length,
            mappingReadinessScore,
            propagationRiskScore,
            riskRuptureScore,
            sourceMode,
          }),
          providerRawCount: rawSource.length,
          providerMappedCount: providerMapped.length,
          mappingRfsCount: mappingRfs.assets.length,
          propagatedCount: fullyPropagatedAssets.length,
          mappingPropagationDecision: mappingMci.mapping_propagation_decision,
          mappingPropagationMode: mappingMci.mapping_propagation_mode,
        }),
      };
    }

    /**
     * LEVEL 1 — DEGRADED
     * - mapping blocked or canonical propagation empty
     * - but market-level evaluations still exist
     * - preserve universe continuity with explicit degradation
     */
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
        meta: buildMeta({
          quote,
          sourceMode: "DEGRADED",
          fallbackLevel: 1,
          degradationScore: computeDegradationScore({
            providerMappedCount: providerMapped.length,
            propagatedCount: degradedAssetsFromEvaluations.length,
            mappingReadinessScore,
            propagationRiskScore,
            riskRuptureScore,
            sourceMode: "DEGRADED",
          }),
          providerRawCount: rawSource.length,
          providerMappedCount: providerMapped.length,
          mappingRfsCount: mappingRfs.assets.length,
          propagatedCount: degradedAssetsFromEvaluations.length,
          mappingPropagationDecision: mappingMci.mapping_propagation_decision,
          mappingPropagationMode: mappingMci.mapping_propagation_mode,
        }),
      };
    }

    /**
     * LEVEL 2 — EMERGENCY
     * - analytical propagation unavailable
     * - keep a minimal universe with neutral WATCH defaults
     */
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
      meta: buildMeta({
        quote,
        sourceMode: "EMERGENCY",
        fallbackLevel: 2,
        degradationScore: computeDegradationScore({
          providerMappedCount: providerMapped.length,
          propagatedCount: emergencyAssets.length,
          mappingReadinessScore,
          propagationRiskScore,
          riskRuptureScore,
          sourceMode: "EMERGENCY",
        }),
        providerRawCount: rawSource.length,
        providerMappedCount: providerMapped.length,
        mappingRfsCount: mappingRfs.assets.length,
        propagatedCount: emergencyAssets.length,
        mappingPropagationDecision: mappingMci.mapping_propagation_decision,
        mappingPropagationMode: mappingMci.mapping_propagation_mode,
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
      meta: buildMeta({
        quote,
        sourceMode: "EMERGENCY",
        fallbackLevel: 2,
        degradationScore: 100,
        providerRawCount: 0,
        providerMappedCount: 0,
        mappingRfsCount: 0,
        propagatedCount: 0,
        mappingPropagationDecision: "BLOCK",
        mappingPropagationMode: "BLOCKED",
      }),
    };
  }
}
