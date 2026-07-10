/* ============================================================================
 * FILE: lib/xyvala/services/traceability-debug-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private traceability debug service
 *
 * ROLE
 * - execute private traceability validation before public projection
 * - load provider market assets
 * - map provider assets into canonical mapped assets
 * - compute private RFS / MCI evaluations
 * - adapt evaluations into PrivateScanAsset[]
 * - run governance traceability runtime test
 * - return a compact debug-safe summary
 *
 * PARENTS
 * - lib/xyvala/mapping/coingecko-mapper.ts
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/engine/mci-market.ts
 * - lib/xyvala/stores/market-traceability-adapter.ts
 * - lib/xyvala/governance/traceability-runtime-test.ts
 *
 * DIRECTIVES
 * - debug service only
 * - local/private validation only
 * - no API response building
 * - no UI logic
 * - no cache write
 * - no persistence
 * - no event bus
 * - no public projection
 * - no broker / affiliate exposure
 * - no private analytical payload exposure
 * - deterministic summary output only
 *
 * INPUTS
 * - quote
 *
 * OUTPUTS
 * - TraceabilityDebugValidationResult
 *
 * INVARIANTS
 * - this service never exposes private scores
 * - this service never mutates runtime state
 * - this service validates PrivateScanAsset propagation before public projection
 * - raw provider data must be mapped before evaluation
 * - unavailable or invalid data must degrade explicitly
 *
 * CRITICAL DEPENDENCIES
 * - CoinGecko provider
 * - mapCoinGeckoAsset
 * - runRfsMarket
 * - runMciMarket
 * - adaptMarketEvaluationsToPrivateScanAssets
 * - runTraceabilityRuntimeTest
 *
 * SENSITIVE ZONES
 * - private analytical evaluation
 * - PrivateScanAsset construction
 * - traceability runtime test
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

import {
  mapCoinGeckoAsset,
  type CoinGeckoMappedAsset,
} from "@/lib/xyvala/mapping/coingecko-mapper";

import { runRfsMarket } from "@/lib/xyvala/engine/rfs-market";
import { runMciMarket } from "@/lib/xyvala/engine/mci-market";

import {
  adaptMarketEvaluationsToPrivateScanAssets,
} from "@/lib/xyvala/stores/market-traceability-adapter";

import type {
  TraceabilityCoverageReport,
} from "@/lib/xyvala/governance/traceability-coverage";

import type {
  VariableRegistryAuditReport,
} from "@/lib/xyvala/governance/variable-registry-audit";

import {
  runTraceabilityRuntimeTest,
} from "@/lib/xyvala/governance/traceability-runtime-test";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type TraceabilityDebugValidationResult = {
  ok: boolean;
  quote: Quote;
  stage: string;

  provider_raw_count: number;
  provider_mapped_count: number;
  evaluation_count: number;
  private_asset_count: number;

  traceability_runtime_test_executed: boolean;

  traceability?: {
    ok: boolean;
    status: string;
    asset_count: number;
    trace_count: number;
    governor_ok: boolean;
    coverage_ok: boolean;
    registry_audit_ok: boolean;
    governance_runtime_ok: boolean;

    coverage: TraceabilityCoverageReport;
    registry_audit: VariableRegistryAuditReport;
  };

  warnings: string[];
  error: string | null;
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

function failure(input: {
  quote: Quote;
  stage: string;
  error: string;
  warnings?: string[];
  provider_raw_count?: number;
  provider_mapped_count?: number;
  evaluation_count?: number;
  private_asset_count?: number;
}): TraceabilityDebugValidationResult {
  return {
    ok: false,
    quote: input.quote,
    stage: input.stage,
    provider_raw_count: input.provider_raw_count ?? 0,
    provider_mapped_count: input.provider_mapped_count ?? 0,
    evaluation_count: input.evaluation_count ?? 0,
    private_asset_count: input.private_asset_count ?? 0,
    traceability_runtime_test_executed: false,
    warnings: uniqueWarnings(input.warnings),
    error: input.error,
  };
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
});

  if (!response.ok) {
    throw new Error(`coingecko_http_${response.status}`);
  }

  return response.json();
}

/* ============================================================================
 * 5. PRIVATE EVALUATION
 * ========================================================================== */

function evaluateMappedAsset(
  mapped: CoinGeckoMappedAsset,
): MarketEvaluation {
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

function evaluateMappedAssets(
  mappedAssets: readonly CoinGeckoMappedAsset[],
): MarketEvaluation[] {
  return mappedAssets.map(evaluateMappedAsset);
}

/* ============================================================================
 * 6. PUBLIC DEBUG SERVICE API
 * ========================================================================== */

export async function runTraceabilityDebugValidation(input?: {
  quote?: Quote | string | null;
}): Promise<TraceabilityDebugValidationResult> {
  const quote = normalizeQuote(input?.quote);

  try {
    const rawSource = await fetchCoinGeckoMarkets(quote);

    if (!Array.isArray(rawSource)) {
      return failure({
        quote,
        stage: "provider_acquisition",
        error: "coingecko_invalid_root_shape",
        warnings: ["coingecko_invalid_root_shape"],
      });
    }

    const mappedAssets = rawSource
      .map((item) => mapCoinGeckoAsset(item, quote))
      .filter(
        (item): item is CoinGeckoMappedAsset =>
          item !== null,
      );

    if (mappedAssets.length === 0) {
      return failure({
        quote,
        stage: "provider_mapping",
        error: "coingecko_provider_mapped_empty",
        warnings: ["coingecko_provider_mapped_empty"],
        provider_raw_count: rawSource.length,
      });
    }

    const evaluations = evaluateMappedAssets(mappedAssets);

    if (evaluations.length === 0) {
      return failure({
        quote,
        stage: "private_evaluation",
        error: "private_evaluations_empty",
        warnings: ["private_evaluations_empty"],
        provider_raw_count: rawSource.length,
        provider_mapped_count: mappedAssets.length,
      });
    }

    const privateAdapter =
      adaptMarketEvaluationsToPrivateScanAssets(evaluations);

    if (
      !privateAdapter ||
      !Array.isArray(privateAdapter.assets) ||
      privateAdapter.assets.length === 0
    ) {
      return failure({
        quote,
        stage: "private_traceability_adapter",
        error: "private_scan_assets_empty",
        warnings: ["private_scan_assets_empty"],
        provider_raw_count: rawSource.length,
        provider_mapped_count: mappedAssets.length,
        evaluation_count: evaluations.length,
      });
    }

    const traceabilityRuntimeTest =
      runTraceabilityRuntimeTest({
        assets: privateAdapter.assets,
      });

               return {
      ok: traceabilityRuntimeTest.ok,
      quote,
      stage: "traceability_runtime_test",
      provider_raw_count: rawSource.length,
      provider_mapped_count: mappedAssets.length,
      evaluation_count: evaluations.length,
      private_asset_count: privateAdapter.assets.length,
      traceability_runtime_test_executed: true,
      traceability: {
        ok: traceabilityRuntimeTest.ok,
        status: traceabilityRuntimeTest.status,
        asset_count: traceabilityRuntimeTest.asset_count,
        trace_count: traceabilityRuntimeTest.trace_count,
        governor_ok: traceabilityRuntimeTest.governor_ok,
        coverage_ok: traceabilityRuntimeTest.coverage_ok,
        registry_audit_ok: traceabilityRuntimeTest.registry_audit_ok,
        governance_runtime_ok: traceabilityRuntimeTest.governance_runtime_ok,
        coverage: traceabilityRuntimeTest.coverage,
        registry_audit: traceabilityRuntimeTest.registry_audit,
      },
      warnings: uniqueWarnings(
        privateAdapter.warnings,
        traceabilityRuntimeTest.warnings,
      ),
      error: traceabilityRuntimeTest.ok
        ? null
        : traceabilityRuntimeTest.error ?? "traceability_runtime_test_failed",
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "traceability_debug_validation_unknown_error";

    return failure({
      quote,
      stage: "traceability_debug_validation",
      error: message,
      warnings: [`traceability_debug_validation_failed:${message}`],
    });
  }
}
