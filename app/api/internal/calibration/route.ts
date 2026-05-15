/* ============================================================================
 * FILE: app/api/internal/calibration/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala internal calibration debug route
 *
 * ROLE
 * - expose private calibration observability
 * - read stored DecisionSample entries
 * - build the decision-distribution policy
 * - build the readable calibration state
 * - expose deterministic internal calibration context
 *
 * DIRECTIVES
 * - private internal route only
 * - FR/EU compliance by default
 * - EUR monetary reference by default
 * - no personalized financial advice
 * - no public exploitable trading decision
 * - no provider parsing here
 * - no UI logic here
 * - no market recalculation here
 * - no RFS recomputation here
 * - no MCI recomputation here
 * - no sample normalization here
 * - no calibration mutation here
 * - no raw secret exposure
 * - deterministic output for identical stored samples
 * - calibration observes; it does not rebuild RFS or MCI
 * ========================================================================== */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { buildDecisionDistributionPolicy } from "@/lib/xyvala/calibration/decision-distribution-core";
import { buildDecisionCalibrationState } from "@/lib/xyvala/calibration/decision-calibration-state";

import {
  getDecisionDistributionStoreStats,
  readDecisionDistributionSamples,
} from "@/lib/xyvala/calibration/decision-distribution-store";

import type {
  DecisionDistribution,
  DecisionSample,
  EvaluationHorizon,
  PolicyBuildInput,
  PolicyResult,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const DEFAULT_ANALYTICAL_VERSION = "v8";
const DEFAULT_HORIZON: EvaluationHorizon = "7D";
const DEFAULT_SAMPLE_LIMIT = 1000;

/* ============================================================================
 * 2. INTERNAL DEBUG ACCESS
 * ========================================================================== */

function isInternalDebugEnabled(): boolean {
  return process.env.XYVALA_INTERNAL_DEBUG_ENABLED === "true";
}

function getInternalDebugToken(): string | null {
  const value = process.env.XYVALA_INTERNAL_DEBUG_TOKEN?.trim();
  return value && value.length > 0 ? value : null;
}

function extractProvidedToken(request: Request): string | null {
  const headerToken =
    request.headers.get("x-xyvala-internal-token")?.trim() ?? null;

  if (headerToken) return headerToken;

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const bearerPrefix = "Bearer ";

  if (authorization.startsWith(bearerPrefix)) {
    const token = authorization.slice(bearerPrefix.length).trim();
    return token.length > 0 ? token : null;
  }

  return null;
}

function safeCompareSecrets(
  provided: string | null,
  expected: string | null,
): boolean {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }

  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function unauthorized(message: string, status = 403) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ts: Date.now(),
      version: "v1",
      meta: {
        internal: true,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function parseSearchParam(request: Request, key: string): string | null {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get(key)?.trim();
  return raw && raw.length > 0 ? raw : null;
}

function isEvaluationHorizon(value: unknown): value is EvaluationHorizon {
  return (
    value === "24H" ||
    value === "7D" ||
    value === "14D" ||
    value === "30D" ||
    value === "default"
  );
}

function normalizeAnalyticalVersion(value: string | null): string {
  return safeString(value, DEFAULT_ANALYTICAL_VERSION);
}

function normalizeHorizon(value: string | null): EvaluationHorizon {
  return isEvaluationHorizon(value) ? value : DEFAULT_HORIZON;
}

function toPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value <= 1 ? value * 100 : value);
}

/* ============================================================================
 * 4. SAMPLE READING
 * ========================================================================== */

function loadDecisionDistributionSamples(input: {
  analytical_version: string;
  horizon: EvaluationHorizon;
}): DecisionSample[] {
  const result = readDecisionDistributionSamples({
    analytical_version: input.analytical_version,
    horizon: input.horizon,
    limit: DEFAULT_SAMPLE_LIMIT,
  });

  return result.samples;
}

/* ============================================================================
 * 5. STATE ADAPTER
 * ========================================================================== */

function buildReadableStateFromPolicyResult(
  policyResult: PolicyResult,
) {
  return buildDecisionCalibrationState({
    policy: policyResult.policy,
    policy_source: policyResult.policy_source,
    sample_size: policyResult.sample_size,
    effective_sample_size: policyResult.effective_sample_size,
    observed_distribution: policyResult.observed_distribution,
    regime_distribution: policyResult.regime_distribution,
    warnings: policyResult.warnings,
  });
}

/* ============================================================================
 * 6. SIMPLIFIED DISTRIBUTION VIEW
 * ========================================================================== */

function buildDistributionSimple(distribution: DecisionDistribution) {
  return {
    ALLOW: toPercent(distribution.allow),
    WATCH: toPercent(distribution.watch),
    BLOCK: toPercent(distribution.block),
  };
}

function buildRegimeDistributionSimple(
  regimeDistribution: PolicyResult["regime_distribution"],
) {
  return {
    STABLE: buildDistributionSimple(regimeDistribution.STABLE),
    TRANSITION: buildDistributionSimple(regimeDistribution.TRANSITION),
    VOLATILE: buildDistributionSimple(regimeDistribution.VOLATILE),
  };
}

/* ============================================================================
 * 7. ROUTE HANDLER
 * ========================================================================== */

export async function GET(request: Request) {
  try {
    if (!isInternalDebugEnabled()) {
      return unauthorized("xyvala_internal_debug_disabled", 404);
    }

    const configuredToken = getInternalDebugToken();
    const providedToken = extractProvidedToken(request);

    if (!configuredToken) {
      return unauthorized("xyvala_internal_debug_token_missing", 500);
    }

    if (!safeCompareSecrets(providedToken, configuredToken)) {
      return unauthorized("xyvala_internal_debug_unauthorized", 401);
    }

    const analyticalVersion = normalizeAnalyticalVersion(
      parseSearchParam(request, "analytical_version"),
    );

    const horizon = normalizeHorizon(parseSearchParam(request, "horizon"));

    const samples = loadDecisionDistributionSamples({
      analytical_version: analyticalVersion,
      horizon,
    });

    const policyInput: PolicyBuildInput = {
      samples,
      analytical_version: analyticalVersion,
      horizon,
    };

    const decisionDistributionPolicy =
      buildDecisionDistributionPolicy(policyInput);

    const decisionCalibrationState = buildReadableStateFromPolicyResult(
      decisionDistributionPolicy,
    );

    return NextResponse.json(
      {
        ok: true,
        ts: Date.now(),
        version: "v1",

        data: {
          decision_distribution_policy: decisionDistributionPolicy,
          decision_calibration_state: decisionCalibrationState,

          distribution_simple: buildDistributionSimple(
            decisionDistributionPolicy.observed_distribution,
          ),

          regime_distribution_simple: buildRegimeDistributionSimple(
            decisionDistributionPolicy.regime_distribution,
          ),

          store_stats: getDecisionDistributionStoreStats(),
        },

        meta: {
          internal: true,
          analytical_version: analyticalVersion,
          horizon,
          sample_count: samples.length,
          effective_sample_size:
            decisionDistributionPolicy.effective_sample_size,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "xyvala_internal_calibration_route_failed",
        ts: Date.now(),
        version: "v1",
        meta: {
          internal: true,
          details:
            error instanceof Error ? error.message : "unknown_internal_error",
        },
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
