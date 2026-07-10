/* ============================================================================
 * FILE: app/api/internal/calibration/preview/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala internal calibration preview route
 *
 * ROLE
 * - expose deterministic calibration preview
 * - read calibration samples
 * - execute calibration orchestrator
 * - expose readable runtime calibration state
 * - expose internal calibration observability
 *
 * DIRECTIVES
 * - private internal route only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no market reconstruction
 * - no UI logic
 * - no calibration mutation
 * - no local calibration rebuilding
 * - orchestrator is the single runtime source
 * - deterministic output only
 * - FR/EU compliant
 * - EUR reference by default
 *
 * INVARIANTS
 * - same samples => same response
 * - route never recalculates calibration logic
 * - route only orchestrates exposure
 * - runtime state comes from orchestrator only
 * ========================================================================== */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import {
  buildCalibrationOrchestratorResult,
} from "@/lib/xyvala/calibration/calibration-orchestrator";

import {
  getDecisionDistributionStoreStats,
  readDecisionDistributionSamples,

} from "@/lib/xyvala/calibration/store/decision-distribution-store";

import type {
  DecisionDistribution,
  EvaluationHorizon,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const DEFAULT_ANALYTICAL_VERSION = "v8";

const DEFAULT_HORIZON: EvaluationHorizon = "7D";

const DEFAULT_SAMPLE_LIMIT = 1000;

/* ============================================================================
 * 2. INTERNAL ACCESS
 * ========================================================================== */

function isInternalDebugEnabled(): boolean {
  return process.env.XYVALA_INTERNAL_DEBUG_ENABLED === "true";
}

function getInternalDebugToken(): string | null {
  const value =
    process.env.XYVALA_INTERNAL_DEBUG_TOKEN?.trim();

  return value && value.length > 0
    ? value
    : null;
}

function extractProvidedToken(
  request: Request,
): string | null {
  const headerToken =
    request.headers
      .get("x-xyvala-internal-token")
      ?.trim() ?? null;

  if (headerToken) {
    return headerToken;
  }

  const authorization =
    request.headers
      .get("authorization")
      ?.trim() ?? "";

  const bearerPrefix = "Bearer ";

  if (
    !authorization.startsWith(
      bearerPrefix,
    )
  ) {
    return null;
  }

  const token = authorization
    .slice(bearerPrefix.length)
    .trim();

  return token.length > 0
    ? token
    : null;
}

function safeCompareSecrets(
  provided: string | null,
  expected: string | null,
): boolean {
  if (
    typeof provided !== "string" ||
    typeof expected !== "string"
  ) {
    return false;
  }

  const providedBuffer = Buffer.from(
    provided,
    "utf8",
  );

  const expectedBuffer = Buffer.from(
    expected,
    "utf8",
  );

  if (
    providedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    providedBuffer,
    expectedBuffer,
  );
}

function unauthorized(
  message: string,
  status = 403,
): NextResponse {
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

function safeString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string" &&
    value.trim().length > 0
    ? value.trim()
    : fallback;
}

function parseSearchParam(
  request: Request,
  key: string,
): string | null {
  const { searchParams } =
    new URL(request.url);

  const raw =
    searchParams.get(key)?.trim();

  return raw && raw.length > 0
    ? raw
    : null;
}

function isEvaluationHorizon(
  value: unknown,
): value is EvaluationHorizon {
  return (
    value === "24H" ||
    value === "7D" ||
    value === "14D" ||
    value === "30D" ||
    value === "default"
  );
}

function normalizeAnalyticalVersion(
  value: string | null,
): string {
  return safeString(
    value,
    DEFAULT_ANALYTICAL_VERSION,
  );
}

function normalizeHorizon(
  value: string | null,
): EvaluationHorizon {
  return isEvaluationHorizon(value)
    ? value
    : DEFAULT_HORIZON;
}

function toPercent(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.round(
    value <= 1
      ? value * 100
      : value,
  );
}

/* ============================================================================
 * 4. SAMPLE ACCESS
 * ========================================================================== */

function loadDecisionDistributionSamples(
  input: {
    analytical_version: string;
    horizon: EvaluationHorizon;
  },
) {
  return readDecisionDistributionSamples({
    analytical_version:
      input.analytical_version,

    horizon: input.horizon,

    limit: DEFAULT_SAMPLE_LIMIT,
  }).samples;
}

/* ============================================================================
 * 5. READABLE VIEWS
 * ========================================================================== */

function buildDistributionSimple(
  distribution: DecisionDistribution,
) {
  return {
    ALLOW: toPercent(
      distribution.allow,
    ),

    WATCH: toPercent(
      distribution.watch,
    ),

    BLOCK: toPercent(
      distribution.block,
    ),
  };
}

function buildRegimeDistributionSimple(
  input: {
    STABLE: DecisionDistribution;
    TRANSITION: DecisionDistribution;
    VOLATILE: DecisionDistribution;
  },
) {
  return {
    STABLE:
      buildDistributionSimple(
        input.STABLE,
      ),

    TRANSITION:
      buildDistributionSimple(
        input.TRANSITION,
      ),

    VOLATILE:
      buildDistributionSimple(
        input.VOLATILE,
      ),
  };
}

/* ============================================================================
 * 6. ROUTE HANDLER
 * ========================================================================== */

export async function GET(
  request: Request,
): Promise<NextResponse> {
  try {
    if (
      !isInternalDebugEnabled()
    ) {
      return unauthorized(
        "xyvala_internal_debug_disabled",
        404,
      );
    }

    const configuredToken =
      getInternalDebugToken();

    const providedToken =
      extractProvidedToken(
        request,
      );

    if (!configuredToken) {
      return unauthorized(
        "xyvala_internal_debug_token_missing",
        500,
      );
    }

    if (
      !safeCompareSecrets(
        providedToken,
        configuredToken,
      )
    ) {
      return unauthorized(
        "xyvala_internal_debug_unauthorized",
        401,
      );
    }

    const analyticalVersion =
      normalizeAnalyticalVersion(
        parseSearchParam(
          request,
          "analytical_version",
        ),
      );

    const horizon =
      normalizeHorizon(
        parseSearchParam(
          request,
          "horizon",
        ),
      );

    const samples =
      loadDecisionDistributionSamples(
        {
          analytical_version:
            analyticalVersion,

          horizon,
        },
      );

    const calibrationResult =
      buildCalibrationOrchestratorResult(
        {
          samples,

          analytical_version:
            analyticalVersion,

          horizon,

          persist_state: false,
        },
      );

    return NextResponse.json(
      {
        ok: true,

        ts: Date.now(),

        version: "v1",

        data: {
          calibration_result:
            calibrationResult,

          decision_calibration_state:
            calibrationResult.state,

          distribution_simple:
            buildDistributionSimple(
              calibrationResult.observed_distribution,
            ),

          regime_distribution_simple:
            buildRegimeDistributionSimple(
              calibrationResult.regime_distribution,
            ),

          store_stats:
            getDecisionDistributionStoreStats(),
        },

        meta: {
          internal: true,

          analytical_version:
            analyticalVersion,

          horizon,

          sample_count:
            samples.length,

          effective_sample_size:
            calibrationResult.effective_sample_size,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          "xyvala_internal_calibration_preview_failed",

        ts: Date.now(),

        version: "v1",

        meta: {
          internal: true,

          details:
            error instanceof Error
              ? error.message
              : "unknown_internal_error",
        },
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
