/* ============================================================================
 * FILE: lib/xyvala/services/raw-assets-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical raw assets orchestration service
 *
 * ROLE
 * - load provider assets
 * - normalize provider payloads
 * - evaluate private market structure internally
 * - project evaluated assets into public ScanAsset contracts
 * - expose deterministic public-safe scan assets only
 *
 * DIRECTIVES
 * - orchestration service only
 * - no API logic
 * - no cache logic
 * - no UI logic
 * - no snapshot logic
 * - no public/private contract mixing
 * - no broker exposure
 * - no affiliate exposure
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no confidence exposure
 * - no rupture exposure
 * - no calibration exposure
 * - RFS/MCI remain internal only
 * - ScanAsset is the only public output contract
 * - deterministic output only
 * - same input => same output
 *
 * INVARIANTS
 * - EUR remains default quote
 * - snapshot layer remains passive
 * - public layers never reconstruct analytical states
 * - null means unavailable
 * - undefined must never leak
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";
import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import { buildPublicStructure } from "@/lib/xyvala/public/public-structure";

import {
  runTraceabilityRuntimeTest,
} from "@/lib/xyvala/governance/traceability-runtime-test";

import {
  mapCoinGeckoAsset,
  type CoinGeckoMappedAsset,
} from "@/lib/xyvala/mapping/coingecko-mapper";

import { runMappingRfs } from "@/lib/xyvala/mapping/mapping-rfs";
import { runMappingMci } from "@/lib/xyvala/mapping/mapping-mci";

import { runRfsMarket } from "@/lib/xyvala/engine/rfs-market";
import { runMciMarket } from "@/lib/xyvala/engine/mci-market";

import { adaptMarketEvaluationsToPrivateScanAssets } from "@/lib/xyvala/stores/market-traceability-adapter";

import { recordScanTraceability } from "@/lib/xyvala/stores/traceability-store-orchestrator";

import {
  orchestrateImpulseCalibration,
} from "@/lib/xyvala/calibration/impulse-calibration-orchestrator";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RawAssetsResult = {
  ok: boolean;
  data: ScanAsset[];
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
    mapping_propagation_mode: "FULL" | "DEGRADED" | "BLOCKED";
  };
};

type MarketEvaluation = {
  mapped: CoinGeckoMappedAsset;
  marketRfs: ReturnType<typeof runRfsMarket>;
  marketMci: ReturnType<typeof runMciMarket>;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_QUOTE: Quote = "eur";
const DEFAULT_API_BASE_URL = "https://api.coingecko.com/api/v3";
const DEFAULT_PER_PAGE = 250;
const DEFAULT_PAGE = 1;
const REQUEST_TIMEOUT_MS = 12_000;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function sanitizePublicWarnings(warnings: string[]): string[] {
  return warnings.filter(
    (warning) =>
      !warning.includes("decision") &&
      !warning.includes("allow") &&
      !warning.includes("watch") &&
      !warning.includes("block"),
  );
}

function safeUpper(value: unknown, fallback = ""): string {
  return safeString(value, fallback).toUpperCase();
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeQuote(value: Quote | string | null | undefined): Quote {
  if (value === "usd") return "usd";
  if (value === "usdt") return "usdt";

  return DEFAULT_QUOTE;
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

function normalizeSparkline(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const points = value.filter(
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
  );

  return points.length >= 2 ? points : null;
}

function mappedMarketCap(mapped: CoinGeckoMappedAsset): number {
  return safeNumber(mapped.market_cap) ?? -1;
}

/* ============================================================================
 * 4. PROVIDER LOADER
 * ========================================================================== */

async function fetchCoinGeckoMarkets(quote: Quote): Promise<unknown> {
  const baseUrl = safeString(
    process.env.COINGECKO_API_BASE_URL,
    DEFAULT_API_BASE_URL,
  );

  const apiKey = safeString(process.env.COINGECKO_API_KEY);
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`coingecko_http_${response.status}`);
  }

  return response.json();
}

/* ============================================================================
 * 5. PRIVATE MARKET EVALUATION
 * ========================================================================== */

function evaluateMappedAsset(
  mapped: CoinGeckoMappedAsset,
  adaptivePolicy?: ReturnType<
    typeof orchestrateImpulseCalibration
  >["policy"],
): MarketEvaluation {
  const marketRfs = runRfsMarket({
    price: mapped.price,
    chg_24h_pct: mapped.chg_24h_pct,
    chg_7d_pct: mapped.chg_7d_pct,
    sparkline_7d: mapped.sparkline_7d,
    market_cap: mapped.market_cap,
    volume_24h: mapped.volume_24h,

    ...(adaptivePolicy !== undefined
      ? { adaptive_policy: adaptivePolicy }
      : {}),
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

function buildImpulseCalibrationSample(
  evaluation: MarketEvaluation,
) {
  const impulse = evaluation.marketRfs.impulse;

  if (
    impulse.impulse_status !== "computed" ||
    impulse.impulse_pressure_score === null ||
    impulse.impulse_acceleration_score === null ||
    impulse.impulse_alignment_score === null ||
    impulse.impulse_instability_score === null ||
    impulse.impulse_saturation_score === null ||
    impulse.impulse_exhaustion_score === null
  ) {
    return null;
  }

  return {
    pressure_score: impulse.impulse_pressure_score,
    acceleration_score: impulse.impulse_acceleration_score,
    alignment_score: impulse.impulse_alignment_score,
    instability_score: impulse.impulse_instability_score,
    saturation_score: impulse.impulse_saturation_score,
    exhaustion_score: impulse.impulse_exhaustion_score,

    growth_score: null,
    core_score: null,
    decay_score: null,

    transition_state: impulse.impulse_transition_state,
  };
}

function buildImpulseCalibrationSamples(
  evaluations: readonly MarketEvaluation[],
) {
  return evaluations
    .map(buildImpulseCalibrationSample)
    .filter((sample): sample is NonNullable<typeof sample> => sample !== null);
}

function evaluateMappedAssets(
  mappedAssets: readonly CoinGeckoMappedAsset[],
): MarketEvaluation[] {
  const firstPassEvaluations = mappedAssets.map((mapped) =>
    evaluateMappedAsset(mapped),
  );

  const samples = buildImpulseCalibrationSamples(firstPassEvaluations);

  const calibration = orchestrateImpulseCalibration({
    samples,
    write_store: false,
  });

  return mappedAssets.map((mapped) =>
    evaluateMappedAsset(mapped, calibration.policy),
  );
}

function regimeRank(value: unknown): number {
  if (value === "STABLE") return 3;
  if (value === "TRANSITION") return 2;
  if (value === "VOLATILE") return 1;

  return 0;
}

function sortEvaluations(items: MarketEvaluation[]): MarketEvaluation[] {
  return [...items].sort((left, right) => {
    const leftStability = safeNumber(left.marketRfs.scores.stability) ?? 0;
    const rightStability = safeNumber(right.marketRfs.scores.stability) ?? 0;

    if (leftStability !== rightStability) {
      return rightStability - leftStability;
    }

    const leftRegime = regimeRank(left.marketRfs.states.regime);
    const rightRegime = regimeRank(right.marketRfs.states.regime);

    if (leftRegime !== rightRegime) {
      return rightRegime - leftRegime;
    }

    const marketCapDelta =
      mappedMarketCap(right.mapped) - mappedMarketCap(left.mapped);

    if (marketCapDelta !== 0) {
      return marketCapDelta;
    }

    return safeString(left.mapped.canonical_id).localeCompare(
      safeString(right.mapped.canonical_id),
    );
  });
}

/* ============================================================================
 * 6. PRIVATE EVALUATION → PUBLIC SAFE PROJECTION
 * ========================================================================== */

function buildPublicScanAsset(
  evaluation: MarketEvaluation,
): ScanAsset {
  const { mapped, marketMci } = evaluation;

  const symbol = safeUpper(mapped.canonical_symbol, "UNKNOWN");
  const id = safeString(mapped.canonical_id, symbol.toLowerCase());
  const name = safeString(mapped.canonical_name, symbol);

  const price = safeNumber(mapped.price);
  const chg24hPct = safeNumber(mapped.chg_24h_pct);
  const chg7dPct = safeNumber(mapped.chg_7d_pct);
  const marketCap = safeNumber(mapped.market_cap);
  const volume24h = safeNumber(mapped.volume_24h);
  const sparkline7d = normalizeSparkline(mapped.sparkline_7d);

  const publicLabels = buildPublicStructure({
    pct_24h: chg24hPct,
    pct_7d: chg7dPct,
    volume_24h: volume24h,
    market_cap: marketCap,
    sparkline_7d: sparkline7d,
    impulse_transition_state: marketMci.impulse_transition_state ?? null,
  });

  return {
    id,
    symbol,
    name,

    price,
    chg_24h_pct: chg24hPct,
    chg_7d_pct: chg7dPct,

    market_cap: marketCap,
    volume_24h: volume24h,

    sparkline_7d: sparkline7d,

    public_activity: publicLabels.activity,
    public_sparkline_context_7d: publicLabels.sparkline_context_7d,
    public_structure_transition: publicLabels.structure_transition,
    public_impulse_context: publicLabels.impulse_context,

    rank: safeNumber(mapped.rank),
    logo_url: safeString(mapped.logo_url) || null,
  };
}

function buildPublicAssetsFromEvaluations(
  evaluations: readonly MarketEvaluation[],
): ScanAsset[] {
  return evaluations.map(buildPublicScanAsset);
}

/* ============================================================================
 * 7. PUBLIC API
 * ============================================================================
 *
 * TRACEABILITY GOVERNANCE
 * ----------------------------------------------------------------------------
 * RESPONSIBILITY
 * - orchestrate provider → mapping → evaluation → traceability → projection
 *
 * OFFICIAL CHAIN
 * - provider acquisition
 * - provider mapping
 * - mapping governance
 * - private market evaluation
 * - private traceability adaptation
 * - traceability validation
 * - traceability persistence
 * - public projection
 * - public contract exposure
 *
 * FIRST DIVERGENCE RULE
 * - every critical boundary is observable
 * - every propagation rupture must be localizable
 * - every traceability failure must expose its first failing stage
 *
 * PUBLIC PROTECTION
 * - traceability remains private
 * - public ScanAsset contract remains isolated
 * - traceability failures never expose private analytical payloads
 *
 * DEGRADATION POLICY
 * - traceability failure does not invalidate public projection
 * - public projection failure remains blocking
 *
 * COMPUTE / OBSERVE / MUTATE
 * - evaluation              => COMPUTE
 * - runtime validation      => OBSERVE
 * - traceability persistence => MUTATE
 * - public projection       => COMPUTE
 * ========================================================================== */

export async function loadRawAssets(
  inputQuote?: Quote | string | null,
): Promise<RawAssetsResult> {
  const quote = normalizeQuote(inputQuote);

  try {
    /* -----------------------------------------------------------------------
     * STAGE 1
     * PROVIDER ACQUISITION
     * --------------------------------------------------------------------- */

    const rawSource = await fetchCoinGeckoMarkets(quote);

    if (!Array.isArray(rawSource)) {
      return {
        ok: false,
        data: [],
        warnings: ["coingecko_invalid_root_shape"],
        error: "coingecko_invalid_root_shape",
      };
    }

    /* -----------------------------------------------------------------------
     * STAGE 2
     * PROVIDER MAPPING
     * --------------------------------------------------------------------- */

    const mappedAssets = rawSource
      .map((item) => mapCoinGeckoAsset(item, quote))
      .filter(
        (item): item is CoinGeckoMappedAsset =>
          item !== null,
      );

    if (mappedAssets.length === 0) {
      return {
        ok: false,
        data: [],
        warnings: ["coingecko_provider_mapped_empty"],
        error: "coingecko_provider_mapped_empty",
      };
    }

    /* -----------------------------------------------------------------------
     * STAGE 3
     * MAPPING GOVERNANCE
     * --------------------------------------------------------------------- */

    const mappingRfs = runMappingRfs(mappedAssets);
    const mappingMci = runMappingMci(mappingRfs);

    /* -----------------------------------------------------------------------
     * STAGE 4
     * PRIVATE MARKET EVALUATION
     * --------------------------------------------------------------------- */

    const evaluations = sortEvaluations(
      evaluateMappedAssets(mappedAssets),
    );

    if (process.env.NODE_ENV !== "production") {
      console.log("XYVALA_TRACE_STAGE_1_EVALUATIONS_OK", {
        evaluations_count: evaluations.length,
      });
    }

    /* -----------------------------------------------------------------------
     * STAGE 5
     * PRIVATE TRACEABILITY ADAPTATION
     * --------------------------------------------------------------------- */

    let traceabilityAdapter:
      | ReturnType<
          typeof adaptMarketEvaluationsToPrivateScanAssets
        >
      | null = null;

    try {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "XYVALA_TRACE_STAGE_2_BEFORE_ADAPTER",
        );
      }

      traceabilityAdapter =
        adaptMarketEvaluationsToPrivateScanAssets(
          evaluations,
        );

      if (process.env.NODE_ENV !== "production") {
        console.log("XYVALA_TRACE_STAGE_3_ADAPTER_OK", {
          private_assets_count:
            traceabilityAdapter.assets.length,
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "XYVALA_TRACE_STAGE_ADAPTER_FAILED",
          error instanceof Error
            ? error.message
            : "unknown_error",
        );
      }
    }

    /* -----------------------------------------------------------------------
     * STAGE 6
     * TRACEABILITY VALIDATION
     * --------------------------------------------------------------------- */

    if (
      process.env.NODE_ENV !== "production" &&
      traceabilityAdapter &&
      traceabilityAdapter.assets.length > 0
    ) {
      try {
        console.log(
          "XYVALA_TRACE_STAGE_4_BEFORE_RUNTIME_TEST",
        );

        const traceabilityRuntimeTest =
          runTraceabilityRuntimeTest({
            assets: traceabilityAdapter.assets,
          });

        console.log(
          "XYVALA_TRACE_STAGE_5_RUNTIME_TEST_OK",
          {
            ok: traceabilityRuntimeTest.ok,
            status: traceabilityRuntimeTest.status,
            asset_count:
              traceabilityRuntimeTest.asset_count,
            trace_count:
              traceabilityRuntimeTest.trace_count,
            governor_ok:
              traceabilityRuntimeTest.governor_ok,
            coverage_ok:
              traceabilityRuntimeTest.coverage_ok,
            registry_audit_ok:
              traceabilityRuntimeTest.registry_audit_ok,
            governance_runtime_ok:
              traceabilityRuntimeTest.governance_runtime_ok,
            warnings:
              traceabilityRuntimeTest.warnings,
          },
        );
      } catch (error) {
        console.log(
          "XYVALA_TRACE_STAGE_RUNTIME_TEST_FAILED",
          error instanceof Error
            ? error.message
            : "unknown_error",
        );
      }
    }

    /* -----------------------------------------------------------------------
     * STAGE 7
     * TRACEABILITY PERSISTENCE
     * --------------------------------------------------------------------- */

    if (
      traceabilityAdapter &&
      traceabilityAdapter.assets.length > 0
    ) {
      try {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "XYVALA_TRACE_STAGE_6_BEFORE_RECORD",
          );
        }

        const traceabilityResult =
          recordScanTraceability({
            assets: traceabilityAdapter.assets,
            snapshot_version:
              "market-traceability-v1",
            analytical_version:
              "market-traceability-v1",
          });

        if (process.env.NODE_ENV !== "production") {
          console.log(
            "XYVALA_TRACE_STAGE_7_RECORD_OK",
            {
              status: traceabilityResult.status,
              count: traceabilityResult.count,
              recorded_count:
                traceabilityResult.recorded_count,
              partial_count:
                traceabilityResult.partial_count,
              invalid_count:
                traceabilityResult.invalid_count,
              warnings:
                traceabilityResult.warnings,
            },
          );
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "XYVALA_TRACE_STAGE_RECORD_FAILED",
            error instanceof Error
              ? error.message
              : "unknown_error",
          );
        }
      }
    }

    /* -----------------------------------------------------------------------
     * STAGE 8
     * PUBLIC PROJECTION
     * --------------------------------------------------------------------- */

    if (process.env.NODE_ENV !== "production") {
      console.log(
        "XYVALA_TRACE_STAGE_8_BEFORE_PUBLIC_PROJECTION",
      );
    }

    const publicAssets =
      buildPublicAssetsFromEvaluations(evaluations);

    if (publicAssets.length === 0) {
      return {
        ok: false,
        data: [],
        warnings: uniqueWarnings(
          mappingRfs.warnings,
          mappingMci.warnings,
          ["public_assets_empty"],
        ),
        error: "public_assets_empty",
      };
    }

    /* -----------------------------------------------------------------------
     * STAGE 9
     * PUBLIC CONTRACT EXPOSURE
     * --------------------------------------------------------------------- */

    return {
      ok: true,
      data: publicAssets,
      warnings: sanitizePublicWarnings(
        uniqueWarnings(
          mappingRfs.warnings,
          mappingMci.warnings,
        ),
      ),
      error: null,
      meta: {
        quote,
        source_mode: mappingMci.source_mode,
        fallback_level: mappingMci.fallback_level,
        degradation_score:
          mappingMci.degradation_score,
        provider_raw_count: rawSource.length,
        provider_mapped_count: mappedAssets.length,
        mapping_rfs_count: mappingRfs.assets.length,
        propagated_count: publicAssets.length,
        mapping_propagation_mode:
          mappingMci.mapping_propagation_mode,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "raw_assets_unknown_error";

    return {
      ok: false,
      data: [],
      warnings: uniqueWarnings([
        `raw_assets_load_failed:${message}`,
      ]),
      error: message,
      meta: {
        quote,
        source_mode: "EMERGENCY",
        fallback_level: 2,
        degradation_score: 100,
        provider_raw_count: 0,
        provider_mapped_count: 0,
        mapping_rfs_count: 0,
        propagated_count: 0,
        mapping_propagation_mode: "BLOCKED",
      },
    };
  }
}
