/* ============================================================================
 * FILE: lib/xyvala/services/raw-assets-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical raw assets orchestration service
 *
 * ROLE
 * - acquire provider market assets
 * - normalize provider payloads through the canonical provider mapper
 * - execute the currently available private analytical chain
 * - adapt evaluated assets into canonical PrivateScanAsset contracts
 * - validate and persist private traceability
 * - delegate the unique private-to-public projection to scan-transformer.ts
 * - expose deterministic public-safe ScanAsset contracts only
 *
 * CLASSIFICATION
 * - ORCHESTRATOR
 * - coordinates ACQUIRE / COMPUTE / OBSERVE / MUTATE / PROJECT boundaries
 * - does not implement analytical engines
 * - does not reconstruct private analytical truth
 * - does not implement public analytical reconstruction
 *
 * CURRENT EXECUTION CHAIN
 * - provider acquisition
 * - provider mapping
 * - mapping governance
 * - private RFS evaluation
 * - private MCI evaluation through its currently declared contract
 * - governed calibration boundary without synthetic Impulse samples
 * - canonical private asset adaptation
 * - private traceability validation
 * - private traceability persistence
 * - canonical public transformation
 * - public contract exposure
 *
 * TARGET ANALYTICAL CHAIN
 * - Acquisition
 * - RFS
 * - Triple Layer
 * - Impulse Layer
 * - Analytical Aggregation
 * - MCI
 * - Calibration
 * - Snapshot
 * - Transformeurs
 * - Rankings
 * - API
 * - Interface
 *
 * MIGRATION BOUNDARY
 * - Triple Layer is not represented as an independent result until its actual
 *   producer and contract have been extracted atomically
 * - Impulse Layer is not represented as an independent result until its actual
 *   producer and all consumers have been migrated atomically
 * - MCI is invoked through its actual current input contract
 * - no future or nonexistent module is imported
 * - no synthetic calibration sample is produced
 *
 * UPSTREAM
 * - CoinGecko provider
 * - lib/xyvala/mapping/coingecko-mapper.ts
 *
 * PRIVATE COMPUTE
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/engine/mci-market.ts
 * - lib/xyvala/calibration/impulse-calibration-orchestrator.ts
 *
 * PRIVATE CONTRACT BOUNDARY
 * - lib/xyvala/stores/market-traceability-adapter.ts
 * - lib/xyvala/contracts/scan-private-contract.ts
 *
 * PUBLIC CONTRACT BOUNDARY
 * - lib/xyvala/services/scan-transformer.ts
 * - lib/xyvala/contracts/scan-contract.ts
 *
 * DIRECTIVES
 * - orchestration only
 * - no API route logic
 * - no UI logic
 * - no snapshot construction
 * - no cache mutation
 * - no broker exposure
 * - no affiliate exposure
 * - no public regime exposure
 * - no public decision exposure
 * - no public opportunity exposure
 * - no public confidence exposure
 * - no public rupture exposure
 * - no public calibration exposure
 * - no direct MarketEvaluation -> ScanAsset projection
 * - no direct buildPublicStructure invocation
 * - no public label reconstruction from observable market fields
 * - no secondary private/public transformer
 * - no synthetic asset identity
 * - no synthetic Triple Layer result
 * - no synthetic Impulse result
 * - no synthetic calibration sample
 * - no silent provider-data repair
 * - no private error payload exposure
 * - no analytical alias resolution
 * - no cross-layer analytical replacement
 * - no temporary diagnostic logging
 * - ScanAsset remains the only public asset contract
 * - deterministic ordering only
 *
 * INVARIANTS
 * - EUR remains the default monetary reference
 * - RFS remains the source of structural analytical truths
 * - MCI is invoked through its currently declared canonical contract
 * - MCI never becomes a replacement source of Impulse truth
 * - absent independent Impulse truth produces no calibration sample
 * - PrivateScanAsset is the only authorized private projection input
 * - scan-transformer.ts is the only private-to-public projection boundary
 * - public layers never reconstruct analytical states
 * - traceability adaptation failure blocks public projection
 * - traceability persistence failure does not alter analytical truth
 * - null means explicitly unavailable
 * - undefined never crosses the public boundary
 * - identical normalized provider payloads, versions and orchestration metadata
 *   produce the same ordered analytical output
 *
 * FIRST DIVERGENCE RULE
 * - provider failures remain provider failures
 * - mapping failures remain mapping failures
 * - private-adapter failures block public projection
 * - traceability validation failures remain explicit warnings
 * - persistence failures remain explicit non-blocking warnings
 * - public projection failures remain blocking
 *
 * SENSITIVE ZONES
 * - provider acquisition
 * - private analytical evaluation
 * - calibration boundary
 * - private asset adaptation
 * - traceability mutation
 * - private/public boundary
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";
import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import {
  runTraceabilityRuntimeTest,
} from "@/lib/xyvala/governance/traceability-runtime-test";

import {
  mapCoinGeckoAsset,
  type CoinGeckoMappedAsset,
} from "@/lib/xyvala/mapping/coingecko-mapper";

import {
  runMappingRfs,
} from "@/lib/xyvala/mapping/mapping-rfs";

import {
  runMappingMci,
} from "@/lib/xyvala/mapping/mapping-mci";

import {
  runRfsMarket,
} from "@/lib/xyvala/engine/rfs-market";

import {
  runMciMarket,
} from "@/lib/xyvala/engine/mci-market";

import {
  orchestrateImpulseCalibration,
} from "@/lib/xyvala/calibration/impulse-calibration-orchestrator";

import {
  adaptMarketEvaluationsToPrivateScanAssets,
} from "@/lib/xyvala/stores/market-traceability-adapter";

import {
  recordScanTraceability,
} from "@/lib/xyvala/stores/traceability-store-orchestrator";

import {
  privateScanAssetsToPublicScanAssets,
} from "@/lib/xyvala/services/scan-transformer";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RawAssetsSourceMode =
  | "FULL"
  | "DEGRADED"
  | "EMERGENCY";

export type RawAssetsFallbackLevel =
  | 0
  | 1
  | 2;

export type RawAssetsPropagationMode =
  | "FULL"
  | "DEGRADED"
  | "BLOCKED";

export type RawAssetsMeta = {
  quote: Quote;

  source_mode: RawAssetsSourceMode;
  fallback_level: RawAssetsFallbackLevel;
  degradation_score: number;

  provider_raw_count: number;
  provider_mapped_count: number;
  mapping_rfs_count: number;
  propagated_count: number;

  mapping_propagation_mode:
    RawAssetsPropagationMode;
};

export type RawAssetsResult = {
  ok: boolean;
  data: ScanAsset[];
  warnings: string[];
  error: string | null;
  meta?: RawAssetsMeta;
};

/**
 * Current canonical transport contract.
 *
 * Triple Layer and Impulse Layer must not be added here until:
 * - their real authoritative producers exist independently;
 * - their contracts have been observed;
 * - MCI accepts them through its declared contract;
 * - the private adapter consumes them;
 * - all tests and stores are migrated in the same atomic lot.
 */
type MarketEvaluation = {
  mapped: CoinGeckoMappedAsset;

  marketRfs: ReturnType<
    typeof runRfsMarket
  >;

  marketMci: ReturnType<
    typeof runMciMarket
  >;

  generated_at: string;
  analytical_version: string;
  source: "scan";
};

/* ============================================================================
 * 2. VERSION AND CONFIGURATION
 * ========================================================================== */

export const RAW_ASSETS_SERVICE_VERSION =
  "2.1.0" as const;

const DEFAULT_QUOTE: Quote = "eur";

const DEFAULT_API_BASE_URL =
  "https://api.coingecko.com/api/v3";

const DEFAULT_PER_PAGE = 250;
const DEFAULT_PAGE = 1;

const REQUEST_TIMEOUT_MS = 12_000;

const TRACEABILITY_SNAPSHOT_VERSION =
  "market-traceability-v1";

const TRACEABILITY_ANALYTICAL_VERSION =
  "market-traceability-v1";

/* ============================================================================
 * 3. SAFE PRIMITIVE HELPERS
 * ----------------------------------------------------------------------------
 * ROLE
 * - validate primitive orchestration inputs
 * - normalize configuration values and technical identifiers
 * - preserve deterministic ordering
 *
 * CLASSIFICATION
 * - VALIDATE / NORMALIZE
 *
 * DIRECTIVES
 * - no analytical scoring
 * - no RFS reconstruction
 * - no Triple Layer reconstruction
 * - no Impulse reconstruction
 * - no MCI reconstruction
 * - no calibration construction
 * - no state inference
 * - no semantic fallback
 * - no cross-layer replacement
 * - no console logging
 * - no mutation
 *
 * INVARIANTS
 * - finite numbers remain finite numbers
 * - unavailable values remain null
 * - helpers never become analytical sources of truth
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function normalizeRequiredString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function safeNumber(
  value: unknown,
): number | null {
  return isFiniteNumber(value)
    ? value
    : null;
}

function normalizeQuote(
  value:
    | Quote
    | string
    | null
    | undefined,
): Quote {
  if (value === "usd") {
    return "usd";
  }

  if (value === "usdt") {
    return "usdt";
  }

  return DEFAULT_QUOTE;
}

function compareDeterministicStrings(
  left: string,
  right: string,
): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function uniqueWarnings(
  ...groups: Array<
    readonly string[] |
    undefined |
    null
  >
): string[] {
  const warnings =
    groups
      .flatMap((group) =>
        Array.isArray(group)
          ? group
          : [],
      )
      .filter(
        (
          warning,
        ): warning is string =>
          typeof warning ===
            "string" &&
          warning.trim().length >
            0,
      )
      .map((warning) =>
        warning.trim(),
      );

  return [
    ...new Set(warnings),
  ].sort(
    compareDeterministicStrings,
  );
}

/* ============================================================================
 * 4. PUBLIC WARNING PROTECTION
 * ----------------------------------------------------------------------------
 * Public warnings may describe the failed boundary but must never expose
 * private decisions, thresholds, scores or calibration payloads.
 * ========================================================================== */

const PRIVATE_WARNING_TOKENS:
  readonly string[] = [
    "decision",
    "allow",
    "watch",
    "block",
    "opportunity",
    "confidence",
    "rupture_probability",
    "calibration_allow",
    "calibration_watch",
    "calibration_block",
    "broker",
    "affiliate",
  ];

function isPublicSafeWarning(
  warning: string,
): boolean {
  const normalized =
    warning.toLowerCase();

  return !PRIVATE_WARNING_TOKENS.some(
    (token) =>
      normalized.includes(token),
  );
}

function sanitizePublicWarnings(
  warnings: readonly string[],
): string[] {
  return uniqueWarnings(
    warnings.filter(
      isPublicSafeWarning,
    ),
  );
}

/* ============================================================================
 * 5. ERROR NORMALIZATION
 * ----------------------------------------------------------------------------
 * Internal error details remain private.
 *
 * Public results expose stable governed error identities rather than arbitrary
 * runtime messages.
 * ========================================================================== */

function normalizeInternalErrorCode(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    const normalized =
      error.message
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9:_-]+/g,
          "_",
        )
        .replace(
          /^_+|_+$/g,
          "",
        );

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return fallback;
}

/* ============================================================================
 * 6. META BUILDERS
 * ========================================================================== */

function buildRawAssetsMeta(input: {
  quote: Quote;

  sourceMode: RawAssetsSourceMode;
  fallbackLevel: RawAssetsFallbackLevel;
  degradationScore: number;

  providerRawCount: number;
  providerMappedCount: number;
  mappingRfsCount: number;
  propagatedCount: number;

  propagationMode:
    RawAssetsPropagationMode;
}): RawAssetsMeta {
  return {
    quote:
      input.quote,

    source_mode:
      input.sourceMode,

    fallback_level:
      input.fallbackLevel,

    degradation_score:
      input.degradationScore,

    provider_raw_count:
      input.providerRawCount,

    provider_mapped_count:
      input.providerMappedCount,

    mapping_rfs_count:
      input.mappingRfsCount,

    propagated_count:
      input.propagatedCount,

    mapping_propagation_mode:
      input.propagationMode,
  };
}

/* ============================================================================
 * 7. PROVIDER ACQUISITION
 * ----------------------------------------------------------------------------
 * This boundary acquires raw external data only.
 *
 * It does not:
 * - calculate analytical truth
 * - construct private assets
 * - construct public assets
 * ========================================================================== */

async function fetchCoinGeckoMarkets(
  quote: Quote,
): Promise<unknown> {
  const configuredBaseUrl =
    normalizeRequiredString(
      process.env.COINGECKO_API_BASE_URL,
    );

  const baseUrl =
    configuredBaseUrl ??
    DEFAULT_API_BASE_URL;

  const apiKey =
    normalizeRequiredString(
      process.env.COINGECKO_API_KEY,
    );

  const normalizedBaseUrl =
    `${baseUrl.replace(/\/+$/, "")}/`;

  const url =
    new URL(
      "coins/markets",
      normalizedBaseUrl,
    );

  url.searchParams.set(
    "vs_currency",
    quote,
  );

  url.searchParams.set(
    "order",
    "market_cap_desc",
  );

  url.searchParams.set(
    "per_page",
    String(DEFAULT_PER_PAGE),
  );

  url.searchParams.set(
    "page",
    String(DEFAULT_PAGE),
  );

  url.searchParams.set(
    "sparkline",
    "true",
  );

  url.searchParams.set(
    "price_change_percentage",
    "24h,7d",
  );

  const headers: Record<
    string,
    string
  > = {
    accept: "application/json",
  };

  if (apiKey !== null) {
    headers["x-cg-pro-api-key"] =
      apiKey;
  }

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        headers,
        cache: "no-store",
        signal:
          AbortSignal.timeout(
            REQUEST_TIMEOUT_MS,
          ),
      },
    );

  if (!response.ok) {
    throw new Error(
      `coingecko_http_${response.status}`,
    );
  }

  return response.json();
}

/* ============================================================================
 * 8. PRIVATE MARKET EVALUATION
 * ----------------------------------------------------------------------------
 * TITLE
 * - Canonical private market evaluation orchestration
 *
 * ROLE
 * - execute the private analytical engines currently available
 * - preserve one authoritative RFS result per mapped asset
 * - delegate MCI execution through its declared canonical contract
 * - attach orchestration metadata without analytical reconstruction
 *
 * CLASSIFICATION
 * - COMPUTE orchestration
 *
 * CURRENT EXECUTION ORDER
 * - RFS
 * - MCI through its current declared input contract
 *
 * MIGRATION BOUNDARY
 * - Triple Layer and Impulse Layer are not transported independently until
 *   their real producers, contracts and consumers are migrated atomically
 *
 * DIRECTIVES
 * - orchestration only
 * - no local analytical formula
 * - no invented engine dependency
 * - no synthetic Triple Layer result
 * - no synthetic Impulse result
 * - no calibration feedback into RFS
 * - no local clock read
 * - no console logging
 * - no public projection
 *
 * OWNERSHIP
 * - marketRfs <- runRfsMarket
 * - marketMci <- runMciMarket through its actual contract
 *
 * INVARIANTS
 * - RFS remains the structural source of truth
 * - MCI is invoked through its currently declared contract
 * - generated_at is supplied by the orchestration owner
 * - no nonexistent layer is represented as authoritative
 * ========================================================================== */

function evaluateMappedAsset(
  mapped: CoinGeckoMappedAsset,
  generatedAt: string,
): MarketEvaluation {
  const marketRfs =
    runRfsMarket({
      price:
        mapped.price,

      chg_24h_pct:
        mapped.chg_24h_pct,

      chg_7d_pct:
        mapped.chg_7d_pct,

      sparkline_7d:
        mapped.sparkline_7d,

      market_cap:
        mapped.market_cap,

      volume_24h:
        mapped.volume_24h,
    });

  /*
   * Current declared MCI contract.
   *
   * Triple Layer and Impulse must not be supplied here until runMciMarket()
   * officially declares and consumes those independent upstream contracts.
   */
  const marketMci =
    runMciMarket({
      rfs:
        marketRfs,
    });

  return {
    mapped,
    marketRfs,
    marketMci,

    generated_at:
      generatedAt,

    analytical_version:
      TRACEABILITY_ANALYTICAL_VERSION,

    source:
      "scan",
  };
}

/* ============================================================================
 * 9. IMPULSE CALIBRATION SAMPLE BOUNDARY
 * ----------------------------------------------------------------------------
 * TITLE
 * - Governed Impulse calibration sample boundary
 *
 * ROLE
 * - prevent calibration sample construction while no independent authoritative
 *   Impulse Layer result is transported by MarketEvaluation
 *
 * CLASSIFICATION
 * - READ / VALIDATE
 *
 * DIRECTIVES
 * - no RFS reconstruction
 * - no Triple Layer reconstruction
 * - no Impulse reconstruction
 * - no MCI fallback
 * - no synthetic calibration sample
 * - no unavailable-to-zero conversion
 * - no console logging
 *
 * INVARIANTS
 * - absence of an authoritative Impulse result produces no sample
 * - calibration never invents analytical truth
 * - an empty sample universe is explicit and deterministic
 * ========================================================================== */

function buildImpulseCalibrationSamples(
  _evaluations:
    readonly MarketEvaluation[],
): [] {
  return [];
}

/* ============================================================================
 * 10. CANONICAL SINGLE-PASS PRIVATE EVALUATION
 * ----------------------------------------------------------------------------
 * EXECUTION
 * - one authoritative RFS evaluation per mapped asset
 * - one current-contract MCI evaluation per RFS result
 * - governed calibration invocation without synthetic samples
 *
 * CLASSIFICATION
 * - COMPUTE
 * - OBSERVE
 *
 * DIRECTIVES
 * - no bootstrap analytical universe
 * - no authoritative second pass
 * - no calibration feedback into RFS
 * - no calibration feedback into current analytical results
 * - no replacement of already-computed analytical truth
 * - no synthetic Impulse evaluation
 * - no local clock access
 * - explicit orchestration timestamp only
 *
 * INVARIANTS
 * - one orchestration cycle uses one canonical generated_at
 * - one orchestration cycle uses one canonical runtime timestamp
 * - generated_at and runtime timestamp represent the same execution instant
 * - each mapped asset is evaluated exactly once
 * - calibration receives no invented observation
 * - calibration does not change the returned MarketEvaluation universe
 * - identical mapped inputs, versions and orchestration metadata produce
 *   identical evaluations
 * ========================================================================== */

function evaluateMappedAssets(
  mappedAssets:
    readonly CoinGeckoMappedAsset[],

  generatedAt:
    string,

  runtimeTimestamp:
    number,
): MarketEvaluation[] {
  if (
    !Number.isFinite(
      runtimeTimestamp,
    ) ||
    runtimeTimestamp < 0
  ) {
    throw new RangeError(
      "RAW_ASSETS_RUNTIME_TIMESTAMP_INVALID: runtimeTimestamp must be a finite non-negative number",
    );
  }

  const evaluations =
    mappedAssets.map(
      (mapped) =>
        evaluateMappedAsset(
          mapped,
          generatedAt,
        ),
    );

  const calibrationSamples =
    buildImpulseCalibrationSamples(
      evaluations,
    );

  /*
   * Calibration remains downstream-only.
   *
   * Until an independent authoritative Impulse result is transported by
   * MarketEvaluation, no synthetic calibration sample is authorized.
   *
   * The explicit runtime timestamp belongs to the orchestration cycle.
   * The calibration orchestrator must not access the local clock.
   */
  orchestrateImpulseCalibration({
    samples:
      calibrationSamples,

    timestamp:
      runtimeTimestamp,

    write_store:
      false,
  });

  return evaluations;
}

/* ============================================================================
 * 11. INTERNAL EVALUATION ORDER
 * ----------------------------------------------------------------------------
 * This ordering is internal orchestration order only.
 *
 * It is not:
 * - a public ranking
 * - an opportunity ranking
 * - a decision ranking
 * - a Structural Transition Ranking
 *
 * Public ranking remains delegated to the governed ranking modules.
 * ========================================================================== */

function regimePriority(
  value: unknown,
): number {
  if (value === "STABLE") {
    return 3;
  }

  if (value === "TRANSITION") {
    return 2;
  }

  if (value === "VOLATILE") {
    return 1;
  }

  return 0;
}

function mappedMarketCap(
  mapped: CoinGeckoMappedAsset,
): number {
  return (
    safeNumber(
      mapped.market_cap,
    ) ??
    -1
  );
}

function resolveMappedCanonicalId(
  mapped: CoinGeckoMappedAsset,
): string {
  return (
    normalizeRequiredString(
      mapped.canonical_id,
    ) ??
    ""
  );
}

function sortEvaluations(
  items:
    readonly MarketEvaluation[],
): MarketEvaluation[] {
  return [...items].sort(
    (left, right) => {
      const leftStability =
        safeNumber(
          left
            .marketRfs
            .scores
            .stability,
        ) ?? 0;

      const rightStability =
        safeNumber(
          right
            .marketRfs
            .scores
            .stability,
        ) ?? 0;

      if (
        leftStability !==
        rightStability
      ) {
        return (
          rightStability -
          leftStability
        );
      }

      const leftRegime =
        regimePriority(
          left
            .marketRfs
            .states
            .regime,
        );

      const rightRegime =
        regimePriority(
          right
            .marketRfs
            .states
            .regime,
        );

      if (
        leftRegime !==
        rightRegime
      ) {
        return (
          rightRegime -
          leftRegime
        );
      }

      const marketCapDelta =
        mappedMarketCap(
          right.mapped,
        ) -
        mappedMarketCap(
          left.mapped,
        );

      if (marketCapDelta !== 0) {
        return marketCapDelta;
      }

      return compareDeterministicStrings(
        resolveMappedCanonicalId(
          left.mapped,
        ),

        resolveMappedCanonicalId(
          right.mapped,
        ),
      );
    },
  );
}

/* ============================================================================
 * 12. PRIVATE TRACEABILITY VALIDATION
 * ----------------------------------------------------------------------------
 * Runtime validation observes the canonical PrivateScanAsset universe.
 *
 * Validation never changes analytical values.
 * Validation failure remains explicit but does not rewrite private truth.
 * ========================================================================== */

function validatePrivateTraceability(
  assets: Parameters<
    typeof runTraceabilityRuntimeTest
  >[0]["assets"],
): string[] {
  try {
    const result =
      runTraceabilityRuntimeTest({
        assets,
      });

    if (result.ok) {
      return [];
    }

    return uniqueWarnings([
      `traceability_runtime_validation_failed:${result.status}`,
    ]);
  } catch {
    return [
      "traceability_runtime_validation_execution_failed",
    ];
  }
}

/* ============================================================================
 * 13. PRIVATE TRACEABILITY PERSISTENCE
 * ----------------------------------------------------------------------------
 * Persistence is a MUTATE boundary.
 *
 * Persistence failure:
 * - never changes analytical truth
 * - never triggers public analytical reconstruction
 * - remains an explicit non-blocking warning
 * ========================================================================== */

function persistPrivateTraceability(
  assets: Parameters<
    typeof recordScanTraceability
  >[0]["assets"],
): string[] {
  try {
    const result =
      recordScanTraceability({
        assets,

        snapshot_version:
          TRACEABILITY_SNAPSHOT_VERSION,

        analytical_version:
          TRACEABILITY_ANALYTICAL_VERSION,
      });

    if (
      result.status === "invalid"
    ) {
      return [
        "traceability_persistence_invalid",
      ];
    }

    if (
      result.invalid_count > 0
    ) {
      return [
        `traceability_persistence_invalid_assets:${result.invalid_count}`,
      ];
    }

    if (
      result.partial_count > 0
    ) {
      return [
        `traceability_persistence_partial_assets:${result.partial_count}`,
      ];
    }

    return [];
  } catch {
    return [
      "traceability_persistence_failed",
    ];
  }
}

/* ============================================================================
 * 14. CANONICAL PUBLIC PROJECTION
 * ----------------------------------------------------------------------------
 * scan-transformer.ts is the unique private/public boundary.
 *
 * This service never:
 * - calls buildPublicStructure
 * - maps private Impulse states itself
 * - maps structural transitions itself
 * - constructs ScanAsset manually
 * - reads private scores for public exposure
 * ========================================================================== */

function projectPrivateAssetsToPublic(
  assets: Parameters<
    typeof privateScanAssetsToPublicScanAssets
  >[0],
):
  | {
      ok: true;
      data: ScanAsset[];
      warning: null;
      error: null;
    }
  | {
      ok: false;
      data: [];
      warning: string;
      error: string;
    } {
  try {
    const publicAssets =
      privateScanAssetsToPublicScanAssets(
        assets,
      );

    if (publicAssets.length === 0) {
      return {
        ok: false,
        data: [],
        warning:
          "public_projection_empty",
        error:
          "public_projection_empty",
      };
    }

    return {
      ok: true,
      data:
        publicAssets,
      warning: null,
      error: null,
    };
  } catch {
    return {
      ok: false,
      data: [],
      warning:
        "public_projection_failed",
      error:
        "public_projection_failed",
    };
  }
}

/* ============================================================================
 * 15. PUBLIC SERVICE
 * ----------------------------------------------------------------------------
 * TITLE
 * - Canonical raw assets execution pipeline
 *
 * ROLE
 * - orchestrate the complete currently available private analytical rebuild
 * - preserve execution order and current contract ownership
 * - validate private propagation before public projection
 * - expose public-safe ScanAsset contracts only
 *
 * CLASSIFICATION
 * - ORCHESTRATOR
 * - ACQUIRE / COMPUTE / OBSERVE / MUTATE / PROJECT
 *
 * EXECUTION CHAIN
 * - provider acquisition
 * - provider mapping
 * - mapping governance
 * - current canonical private market evaluation
 * - canonical private contract adaptation
 * - private traceability observation
 * - private traceability persistence
 * - canonical private-to-public transformation
 * - public contract exposure
 *
 * DIRECTIVES
 * - no analytical computation implemented locally
 * - no private analytical reconstruction
 * - no public analytical reconstruction
 * - no direct MarketEvaluation -> ScanAsset projection
 * - no direct public structure construction
 * - no private variable exposure
 * - no private warning exposure
 * - no silent provider repair
 * - no synthetic asset identity
 * - no adapter timestamp generation
 * - no temporary diagnostic logging
 * - no mutation outside the explicit persistence boundary
 *
 * GOVERNANCE
 * - one execution cycle produces one canonical generated_at
 * - the canonical generated_at is attached upstream to every MarketEvaluation
 * - the private adapter receives evaluations as its only argument
 * - the private adapter validates and projects but never computes
 * - traceability observation remains non-mutating
 * - traceability persistence remains an explicit MUTATE boundary
 * - persistence failure does not modify analytical truth
 * - public projection is blocked when the private universe is empty
 * - partial private adaptation remains explicit and observable
 * - all public warnings pass through public exposure sanitization
 *
 * FIRST DIVERGENCE
 * - invalid provider root
 *   => coingecko_invalid_root_shape
 *
 * - empty provider mapping
 *   => coingecko_provider_mapped_empty
 *
 * - empty private evaluation universe
 *   => private_market_evaluations_empty
 *
 * - private adapter execution failure
 *   => private_scan_asset_adaptation_failed
 *
 * - private adapter produces no canonical asset
 *   => private_scan_assets_empty
 *
 * - public transformer failure
 *   => public_projection_failed
 *
 * - public transformer produces no asset
 *   => public_projection_empty
 *
 * INVARIANTS
 * - the same provider payload, versions and generated_at produce the same
 *   ordered analytical output
 * - the adapter never reads the local clock
 * - the transformer remains the unique private-to-public boundary
 * - private traceability warnings never alter analytical values
 * - undefined never crosses the public boundary
 * - private values never cross the public boundary
 * ========================================================================== */

export async function loadRawAssets(
  inputQuote?:
    | Quote
    | string
    | null,
): Promise<RawAssetsResult> {
  const quote =
    normalizeQuote(
      inputQuote,
    );

  /*
   * Canonical timestamp owned by the orchestration cycle.
   *
   * It is created once and propagated to every authoritative evaluation.
   * Neither the private adapter nor downstream layers may generate a
   * replacement timestamp.
   */
  const rebuildTimestamp =
  Date.now();

const rebuildGeneratedAt =
  new Date(
    rebuildTimestamp,
  ).toISOString();

  try {
    /* -----------------------------------------------------------------------
     * STAGE 1
     * PROVIDER ACQUISITION
     *
     * CLASSIFICATION
     * - ACQUIRE
     *
     * OUTPUT
     * - unknown provider payload
     * --------------------------------------------------------------------- */

    const rawSource =
      await fetchCoinGeckoMarkets(
        quote,
      );

    if (
      !Array.isArray(
        rawSource,
      )
    ) {
      return {
        ok: false,

        data: [],

        warnings: [
          "coingecko_invalid_root_shape",
        ],

        error:
          "coingecko_invalid_root_shape",

        meta:
          buildRawAssetsMeta({
            quote,

            sourceMode:
              "EMERGENCY",

            fallbackLevel:
              2,

            degradationScore:
              100,

            providerRawCount:
              0,

            providerMappedCount:
              0,

            mappingRfsCount:
              0,

            propagatedCount:
              0,

            propagationMode:
              "BLOCKED",
          }),
      };
    }

    /* -----------------------------------------------------------------------
     * STAGE 2
     * PROVIDER MAPPING
     *
     * CLASSIFICATION
     * - VALIDATE / NORMALIZE
     *
     * INVARIANT
     * - the canonical mapper is the only provider normalization boundary
     * --------------------------------------------------------------------- */

    const mappedAssets =
      rawSource
        .map(
          (item) =>
            mapCoinGeckoAsset(
              item,
              quote,
            ),
        )
        .filter(
          (
            item,
          ): item is CoinGeckoMappedAsset =>
            item !== null,
        );

    if (
      mappedAssets.length === 0
    ) {
      return {
        ok: false,

        data: [],

        warnings: [
          "coingecko_provider_mapped_empty",
        ],

        error:
          "coingecko_provider_mapped_empty",

        meta:
          buildRawAssetsMeta({
            quote,

            sourceMode:
              "EMERGENCY",

            fallbackLevel:
              2,

            degradationScore:
              100,

            providerRawCount:
              rawSource.length,

            providerMappedCount:
              0,

            mappingRfsCount:
              0,

            propagatedCount:
              0,

            propagationMode:
              "BLOCKED",
          }),
      };
    }

    /* -----------------------------------------------------------------------
     * STAGE 3
     * MAPPING GOVERNANCE
     *
     * CLASSIFICATION
     * - COMPUTE
     *
     * DIRECTIVES
     * - mapping governance qualifies provider propagation only
     * - mapping governance does not produce market analytical truth
     * --------------------------------------------------------------------- */

    const mappingRfs =
      runMappingRfs(
        mappedAssets,
      );

    const mappingMci =
      runMappingMci(
        mappingRfs,
      );

    /* -----------------------------------------------------------------------
     * STAGE 4
     * CURRENT AUTHORITATIVE SINGLE-PASS PRIVATE MARKET EVALUATION
     *
     * CLASSIFICATION
     * - COMPUTE
     *
     * EXECUTION
     * - one authoritative RFS evaluation per mapped asset
     * - one current-contract MCI evaluation per RFS result
     * - governed empty calibration observation
     *
     * INVARIANTS
     * - each mapped asset is evaluated exactly once
     * - calibration never feeds back into RFS
     * - calibration never replaces authoritative analytical truth
     * - generated_at is shared by the complete execution cycle
     * - RFS remains the structural source of truth
     * - no independent Triple Layer or Impulse result is fabricated
     * --------------------------------------------------------------------- */

    const evaluations =
  sortEvaluations(
    evaluateMappedAssets(
      mappedAssets,
      rebuildGeneratedAt,
      rebuildTimestamp,
    ),
  );

    if (
      evaluations.length === 0
    ) {
      return {
        ok: false,

        data: [],

        warnings:
          sanitizePublicWarnings(
            uniqueWarnings(
              mappingRfs.warnings,
              mappingMci.warnings,
              [
                "private_market_evaluations_empty",
              ],
            ),
          ),

        error:
          "private_market_evaluations_empty",

        meta:
          buildRawAssetsMeta({
            quote,

            sourceMode:
              mappingMci.source_mode,

            fallbackLevel:
              mappingMci.fallback_level,

            degradationScore:
              mappingMci.degradation_score,

            providerRawCount:
              rawSource.length,

            providerMappedCount:
              mappedAssets.length,

            mappingRfsCount:
              mappingRfs.assets.length,

            propagatedCount:
              0,

            propagationMode:
              "BLOCKED",
          }),
      };
    }

    /* -----------------------------------------------------------------------
     * STAGE 5
     * CANONICAL PRIVATE ASSET ADAPTATION
     *
     * CLASSIFICATION
     * - READ / VALIDATE / PROJECT PRIVATE CONTRACT
     *
     * BOUNDARY
     * - MarketEvaluation -> PrivateScanAsset
     *
     * DIRECTIVES
     * - the adapter receives canonical evaluations only
     * - evaluation metadata already exists upstream
     * - no second adapter options argument
     * - no timestamp generation
     * - no analytical fallback
     * - no semantic alias reconstruction
     * - no cross-layer replacement
     * --------------------------------------------------------------------- */

    let privateAdapter:
      ReturnType<
        typeof adaptMarketEvaluationsToPrivateScanAssets
      >;

    try {
      privateAdapter =
        adaptMarketEvaluationsToPrivateScanAssets(
          evaluations,
        );
    } catch {
      return {
        ok: false,

        data: [],

        warnings:
          sanitizePublicWarnings(
            uniqueWarnings(
              mappingRfs.warnings,
              mappingMci.warnings,
              [
                "private_scan_asset_adaptation_failed",
              ],
            ),
          ),

        error:
          "private_scan_asset_adaptation_failed",

        meta:
          buildRawAssetsMeta({
            quote,

            sourceMode:
              mappingMci.source_mode,

            fallbackLevel:
              mappingMci.fallback_level,

            degradationScore:
              mappingMci.degradation_score,

            providerRawCount:
              rawSource.length,

            providerMappedCount:
              mappedAssets.length,

            mappingRfsCount:
              mappingRfs.assets.length,

            propagatedCount:
              0,

            propagationMode:
              "BLOCKED",
          }),
      };
    }

    /*
     * A partial adaptation may continue when at least one canonical private
     * asset exists.
     *
     * Rejected evaluations remain explicit through adapter warnings.
     * An entirely empty private universe blocks every downstream projection.
     */
    if (
      privateAdapter.assets.length === 0
    ) {
      return {
        ok: false,

        data: [],

        warnings:
          sanitizePublicWarnings(
            uniqueWarnings(
              mappingRfs.warnings,
              mappingMci.warnings,
              privateAdapter.warnings,
              [
                "private_scan_assets_empty",
              ],
            ),
          ),

        error:
          "private_scan_assets_empty",

        meta:
          buildRawAssetsMeta({
            quote,

            sourceMode:
              mappingMci.source_mode,

            fallbackLevel:
              mappingMci.fallback_level,

            degradationScore:
              mappingMci.degradation_score,

            providerRawCount:
              rawSource.length,

            providerMappedCount:
              mappedAssets.length,

            mappingRfsCount:
              mappingRfs.assets.length,

            propagatedCount:
              0,

            propagationMode:
              "BLOCKED",
          }),
      };
    }

    /* -----------------------------------------------------------------------
     * STAGE 6
     * PRIVATE TRACEABILITY OBSERVATION
     *
     * CLASSIFICATION
     * - OBSERVE
     *
     * DIRECTIVES
     * - reads canonical PrivateScanAsset values
     * - validates lineage and propagation
     * - never modifies analytical truth
     * - never persists
     * - never projects publicly
     * --------------------------------------------------------------------- */

    const traceabilityValidationWarnings =
      validatePrivateTraceability(
        privateAdapter.assets,
      );

    /* -----------------------------------------------------------------------
     * STAGE 7
     * PRIVATE TRACEABILITY PERSISTENCE
     *
     * CLASSIFICATION
     * - MUTATE
     *
     * DIRECTIVES
     * - explicit private persistence boundary
     * - persistence failure remains non-blocking
     * - persistence failure never rewrites analytical values
     * - persistence failure never triggers analytical reconstruction
     * --------------------------------------------------------------------- */

    const traceabilityPersistenceWarnings =
      persistPrivateTraceability(
        privateAdapter.assets,
      );

    /* -----------------------------------------------------------------------
     * STAGE 8
     * UNIQUE CANONICAL PUBLIC PROJECTION
     *
     * CLASSIFICATION
     * - VALIDATE / MAP / PROJECT
     *
     * BOUNDARY
     * - PrivateScanAsset -> ScanAsset
     *
     * INVARIANT
     * - scan-transformer.ts is the only authorized private-to-public
     *   transformation boundary
     * --------------------------------------------------------------------- */

    const publicProjection =
      projectPrivateAssetsToPublic(
        privateAdapter.assets,
      );

    if (
      !publicProjection.ok
    ) {
      return {
        ok: false,

        data: [],

        warnings:
          sanitizePublicWarnings(
            uniqueWarnings(
              mappingRfs.warnings,
              mappingMci.warnings,
              privateAdapter.warnings,
              traceabilityValidationWarnings,
              traceabilityPersistenceWarnings,
              [
                publicProjection.warning,
              ],
            ),
          ),

        error:
          publicProjection.error,

        meta:
          buildRawAssetsMeta({
            quote,

            sourceMode:
              mappingMci.source_mode,

            fallbackLevel:
              mappingMci.fallback_level,

            degradationScore:
              mappingMci.degradation_score,

            providerRawCount:
              rawSource.length,

            providerMappedCount:
              mappedAssets.length,

            mappingRfsCount:
              mappingRfs.assets.length,

            propagatedCount:
              0,

            propagationMode:
              "BLOCKED",
          }),
      };
    }

    /* -----------------------------------------------------------------------
     * STAGE 9
     * PUBLIC CONTRACT EXPOSURE
     *
     * CLASSIFICATION
     * - RETURN
     *
     * PUBLIC BOUNDARY
     * - ScanAsset only
     * - public-safe warnings only
     * - no private analytical values
     * - no private governance payload
     * --------------------------------------------------------------------- */

    return {
      ok: true,

      data:
        publicProjection.data,

      warnings:
        sanitizePublicWarnings(
          uniqueWarnings(
            mappingRfs.warnings,
            mappingMci.warnings,
            privateAdapter.warnings,
            traceabilityValidationWarnings,
            traceabilityPersistenceWarnings,
          ),
        ),

      error:
        null,

      meta:
        buildRawAssetsMeta({
          quote,

          sourceMode:
            mappingMci.source_mode,

          fallbackLevel:
            mappingMci.fallback_level,

          degradationScore:
            mappingMci.degradation_score,

          providerRawCount:
            rawSource.length,

          providerMappedCount:
            mappedAssets.length,

          mappingRfsCount:
            mappingRfs.assets.length,

          propagatedCount:
            publicProjection.data.length,

          propagationMode:
            mappingMci
              .mapping_propagation_mode,
        }),
    };
  } catch (error) {
    /* -----------------------------------------------------------------------
     * UNHANDLED ORCHESTRATION FAILURE
     *
     * FIRST DIVERGENCE
     * - the exact internal boundary was not converted into a controlled result
     *
     * PUBLIC PROTECTION
     * - normalized error identity only
     * - no stack
     * - no private payload
     * - no analytical values
     * --------------------------------------------------------------------- */

    const internalErrorCode =
      normalizeInternalErrorCode(
        error,
        "raw_assets_unknown_error",
      );

    return {
      ok: false,

      data: [],

      warnings:
        sanitizePublicWarnings(
          uniqueWarnings([
            `raw_assets_load_failed:${internalErrorCode}`,
          ]),
        ),

      error:
        internalErrorCode,

      meta:
        buildRawAssetsMeta({
          quote,

          sourceMode:
            "EMERGENCY",

          fallbackLevel:
            2,

          degradationScore:
            100,

          providerRawCount:
            0,

          providerMappedCount:
            0,

          mappingRfsCount:
            0,

          propagatedCount:
            0,

          propagationMode:
            "BLOCKED",
        }),
    };
  }
}
