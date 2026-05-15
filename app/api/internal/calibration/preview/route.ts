/* ============================================================================
 * FILE: app/api/internal/calibration/preview/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala internal calibration preview route
 *
 * ROLE
 * - expose private calibration preview data
 * - read stored DecisionSample entries
 * - build decision distribution policy
 * - build readable calibration state
 * - expose bounded sample preview and store stats
 *
 * DIRECTIVES
 * - private internal route only
 * - FR/EU compliance by default
 * - EUR monetary reference by default
 * - no personalized financial advice
 * - no public exploitable trading decision
 * - no provider parsing here
 * - no UI logic here
 * - no RFS recomputation here
 * - no MCI recomputation here
 * - no calibration mutation here
 * - no store mutation here
 * - no sample normalization here
 * - no policy mapping here
 * - deterministic outputs only
 * ========================================================================== */

import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { buildDecisionDistributionPolicy } from "@/lib/xyvala/calibration/decision-distribution-core";
import { buildDecisionCalibrationState } from "@/lib/xyvala/calibration/decision-calibration-state";

import {
  getDecisionDistributionStoreStats,
  readDecisionDistributionSamples,
} from "@/lib/xyvala/calibration/decision-distribution-store";

import type {
  DecisionSample,
  EvaluationHorizon,
  PolicyResult,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const ROUTE_VERSION = "v1";

const DEFAULT_ANALYTICAL_VERSION = "v8";
const DEFAULT_HORIZON: EvaluationHorizon = "7D";

const DEFAULT_PREVIEW_LIMIT = 12;
const MAX_PREVIEW_LIMIT = 50;
const STORE_READ_LIMIT = 250;

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

type RequestContext = {
  trace_id: string;
  started_at: number;
};

/* ============================================================================
 * 3. INTERNAL ACCESS
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
    const bearerToken = authorization.slice(bearerPrefix.length).trim();
    return bearerToken.length > 0 ? bearerToken : null;
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

function unauthorized(
  message: string,
  context: RequestContext,
  status = 403,
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ts: Date.now(),
      version: ROUTE_VERSION,
      meta: {
        internal: true,
        trace_id: context.trace_id,
        duration_ms: Date.now() - context.started_at,
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
 * 4. PARAM HELPERS
 * ========================================================================== */

function parseSearchParam(request: Request, key: string): string | null {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get(key)?.trim();
  return raw && raw.length > 0 ? raw : null;
}

function normalizeAnalyticalVersion(value: string | null): string {
  return value && value.length > 0 ? value : DEFAULT_ANALYTICAL_VERSION;
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

function normalizeHorizon(value: string | null): EvaluationHorizon {
  return isEvaluationHorizon(value) ? value : DEFAULT_HORIZON;
}

function normalizeLimit(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PREVIEW_LIMIT;
  }

  return Math.max(1, Math.min(MAX_PREVIEW_LIMIT, Math.trunc(parsed)));
}

/* ============================================================================
 * 5. STATE / PREVIEW HELPERS
 * ========================================================================== */

function buildReadableStateFromPolicyResult(
  policyResult: PolicyResult,
): ReturnType<typeof buildDecisionCalibrationState> {
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

function buildScoreSamplesPreview(samples: DecisionSample[], limit: number) {
  return samples
    .slice(-limit)
    .reverse()
    .map((sample) => ({
      observed_ts: sample.observed_ts,
      observed_horizon: sample.observed_horizon,
      observed_analytical_version: sample.observed_analytical_version,

      asset_id: sample.asset_id,
      symbol: sample.symbol,

      observed_regime: sample.observed_regime,
      observed_decision: sample.observed_decision,
      observed_reason: sample.observed_reason ?? null,
      observed_reliability: sample.observed_reliability ?? null,

      mci_decision_score: sample.mci_decision_score,
      mci_allow_raw_score: sample.mci_allow_raw_score,
      mci_block_raw_score: sample.mci_block_raw_score,
      mci_risk_rupture_probability:
        sample.mci_risk_rupture_probability,
      mci_decision_support_probability:
        sample.mci_decision_support_probability,
      mci_final_decision: sample.mci_final_decision,
      mci_decision_reason: sample.mci_decision_reason ?? null,

      stability: sample.stability ?? null,
      opportunity: sample.opportunity ?? null,
      convergence: sample.convergence ?? null,
      confidence: sample.confidence ?? null,

      recovery_probability: sample.recovery_probability ?? null,
      recovery_rupture_dominance:
        sample.recovery_rupture_dominance ?? null,

      dominance_state: sample.dominance_state ?? null,

      hard_block: sample.hard_block ?? false,
      hard_allow_candidate: sample.hard_allow_candidate ?? false,
    }));
}

/* ============================================================================
 * 6. PUBLIC ROUTE
 * ========================================================================== */

export async function GET(request: Request) {
  const context: RequestContext = {
    trace_id: randomUUID(),
    started_at: Date.now(),
  };

  try {
    if (!isInternalDebugEnabled()) {
      return unauthorized("xyvala_internal_debug_disabled", context, 404);
    }

    const configuredToken = getInternalDebugToken();
    const providedToken = extractProvidedToken(request);

    if (!configuredToken) {
      return unauthorized(
        "xyvala_internal_debug_token_missing",
        context,
        500,
      );
    }

    if (!safeCompareSecrets(providedToken, configuredToken)) {
      return unauthorized(
        "xyvala_internal_debug_unauthorized",
        context,
        401,
      );
    }

    const analyticalVersion = normalizeAnalyticalVersion(
      parseSearchParam(request, "analytical_version"),
    );

    const horizon = normalizeHorizon(parseSearchParam(request, "horizon"));
    const limit = normalizeLimit(parseSearchParam(request, "limit"));

    const readResult = readDecisionDistributionSamples({
      analytical_version: analyticalVersion,
      horizon,
      limit: STORE_READ_LIMIT,
    });

    const samples = readResult.samples;

    const decisionDistributionPolicy = buildDecisionDistributionPolicy({
      samples,
      analytical_version: analyticalVersion,
      horizon,
    });

    const decisionCalibrationState = buildReadableStateFromPolicyResult(
      decisionDistributionPolicy,
    );

    const scoreSamplesPreview = buildScoreSamplesPreview(samples, limit);

    const storeStats = getDecisionDistributionStoreStats();

    return NextResponse.json(
      {
        ok: true,
        ts: Date.now(),
        version: ROUTE_VERSION,

        data: {
          decision_distribution_policy: decisionDistributionPolicy,
          decision_calibration_state: decisionCalibrationState,
          score_samples_preview: scoreSamplesPreview,
          store_stats: storeStats,

          diagnostics: {
            trace_id: context.trace_id,
            duration_ms: Date.now() - context.started_at,
            policy_source: decisionDistributionPolicy.policy_source,
            sample_size: decisionDistributionPolicy.sample_size,
            effective_sample_size:
              decisionDistributionPolicy.effective_sample_size,
            store_total: readResult.total,
            store_returned: readResult.returned,
            fallback_active:
              decisionCalibrationState.flags.fallback_active,
            global_outside_tolerance:
              decisionCalibrationState.flags.global_outside_tolerance,
            stable_outside_tolerance:
              decisionCalibrationState.flags.stable_outside_tolerance,
            transition_outside_tolerance:
              decisionCalibrationState.flags.transition_outside_tolerance,
            volatile_outside_tolerance:
              decisionCalibrationState.flags.volatile_outside_tolerance,
          },
        },

        meta: {
          internal: true,
          trace_id: context.trace_id,
          analytical_version: analyticalVersion,
          horizon,
          preview_limit: limit,
          sample_count: samples.length,
          duration_ms: Date.now() - context.started_at,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "xyvala_internal_calibration_preview_failed",
        ts: Date.now(),
        version: ROUTE_VERSION,
        meta: {
          internal: true,
          trace_id: context.trace_id,
          duration_ms: Date.now() - context.started_at,
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
