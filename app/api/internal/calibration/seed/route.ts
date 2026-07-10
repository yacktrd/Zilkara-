/* ============================================================================
 * FILE: app/api/internal/calibration/seed/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala internal calibration seed mutation route
 *
 * ROLE
 * - expose a private internal POST-only seed endpoint
 * - execute deterministic calibration seed scenarios
 * - execute the MCI orchestrator inside the same Next runtime process
 * - populate the in-memory calibration store through real orchestrator writes
 * - provide bounded seeded result summary for audit/debug usage
 *
 * PARENTS
 * - lib/xyvala/calibration/calibration-seed-scenarios.ts
 * - lib/xyvala/engine/mci-orchestrator.ts
 * - lib/xyvala/calibration/store/decision-distribution-store.ts
 *
 * DIRECTIVES
 * - private internal route only
 * - POST only because this route mutates calibration runtime state
 * - GET must never mutate
 * - no provider parsing
 * - no UI logic
 * - no snapshot shaping
 * - no external market fetch
 * - no raw store writes
 * - no direct calibration store writes except authorized reset
 * - MCI orchestrator remains the only sample producer
 * - deterministic seed scenarios only
 * - authentication must fail closed
 * - authentication diagnostics must remain sanitized
 * - no sensitive token logging
 * - no console debug logging
 * ========================================================================== */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { runMciOrchestrator } from "@/lib/xyvala/engine/mci-orchestrator";

import {
  clearDecisionDistributionStore,
  getDecisionDistributionStoreStats,
} from "@/lib/xyvala/calibration/store/decision-distribution-store";

import {
  CALIBRATION_SEED_REGIME_PLAN,
  buildCalibrationSeedScenario,
  type CalibrationSeedScenario,
} from "@/lib/xyvala/calibration/calibration-seed-scenarios";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type SeedDecision = "ALLOW" | "WATCH" | "BLOCK";
type SeedRegime = "STABLE" | "TRANSITION" | "VOLATILE";

type SeedAlignment = "ALIGNED" | "OPPOSED" | "NEUTRAL" | "UNAVAILABLE";

type SeedRfsStatus =
  | "VALID"
  | "WEAK_STRUCTURE"
  | "INSUFFICIENT_DATA"
  | "INVALID";

type SeedMidTermState = "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE";

type SeedCrashState =
  | "NONE"
  | "RISING"
  | "CRASH"
  | "UNKNOWN";

type SeedImpulseDirectionalBias = "UP" | "DOWN" | "MIXED" | "NEUTRAL";

type SeedImpulseTransitionState =
  | "COMPRESSION"
  | "PRESSURE_BUILDING"
  | "RELEASE"
  | "EXHAUSTION"
  | "NEUTRAL";

type SeedDecisionSummary = {
  asset_id: string;
  symbol: string;
  decision: SeedDecision;
  regime: SeedRegime;
  decision_reason: string;
  calibration_source: "fallback" | "calibrated" | "bootstrap";

  stability: number;
  opportunity: number;
  convergence: number;
  confidence: number;

  decision_score: number;
  allow_raw_score: number;
  block_raw_score: number;

  risk_rupture_probability: number;
  decision_support_probability: number;
  recovery_probability: number;
  recovery_rupture_dominance: number;
};

type SeedScenario = {
  asset_id: string;
  symbol: string;
  regime: SeedRegime;


  occurrence: number;
  convergence: number;
  duration: number;
  frequency: number;
  correlation: number;

  stability: number;
  structure: number;
  rupture: number;
  crash_score: number;
  crash_state: SeedCrashState;
  mid_term: number;

  rupture_probability: number;
  continuity_probability: number;
  confidence: number;

  pattern_count: number;
  sample_size: number;
  direction_changes: number;
  rupture_events: number;
  stable_run_length: number;

  dominant_direction_ratio: number;
  liquidity_support: number;

  confirmation_alignment: SeedAlignment;
  rfs_status: SeedRfsStatus;
  mid_term_state: SeedMidTermState;
};

type SeedImpulse = {
  impulse_compression_score: number;
  impulse_pressure_score: number;
  impulse_acceleration_score: number;
  impulse_alignment_score: number;
  impulse_instability_score: number;
  impulse_saturation_score: number;
  impulse_exhaustion_score: number;
  impulse_directional_bias: SeedImpulseDirectionalBias;
  impulse_transition_state: SeedImpulseTransitionState;
  impulse_status: "computed";
  impulse_context: string;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_ANALYTICAL_VERSION = "v8";
const DEFAULT_HORIZON = "7D";
const DEFAULT_SEED_COUNT = 24;
const MAX_SEED_COUNT = 250;

const SEED_REGIME_PLAN = CALIBRATION_SEED_REGIME_PLAN;

/* ============================================================================
 * 3. INTERNAL DEBUG ACCESS
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

  const providedBuffer = Buffer.from(provided.trim(), "utf8");
  const expectedBuffer = Buffer.from(expected.trim(), "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function logAuthDiagnostics(input: {
  enabled: boolean;
  hasConfiguredToken: boolean;
  configuredTokenLength: number;
  providedTokenLength: number;
  path: string;
}): void {
  console.warn("[xyvala][internal][calibration-seed][auth]", {
    enabled: input.enabled,
    hasConfiguredToken: input.hasConfiguredToken,
    configuredTokenLength: input.configuredTokenLength,
    providedTokenLength: input.providedTokenLength,
    path: input.path,
  });
}

/* ============================================================================
 * 4. RESPONSE HELPERS
 * ========================================================================== */

function buildJsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function unauthorized(message: string, status = 403) {
  return buildJsonResponse(
    {
      ok: false,
      error: message,
      ts: Date.now(),
      version: "v1",
      meta: {
        internal: true,
      },
    },
    status,
  );
}

function methodNotAllowed() {
  return buildJsonResponse(
    {
      ok: false,
      error: "method_not_allowed_use_post",
      ts: Date.now(),
      version: "v1",
      meta: {
        internal: true,
        allowed_methods: ["POST"],
      },
    },
    405,
  );
}

/* ============================================================================
 * 5. SAFE HELPERS
 * ========================================================================== */

function safeStr(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeFinite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function resolveSeedCrashState(
  crashScore: number,
): SeedCrashState {
  if (crashScore >= 75) return "CRASH";
  if (crashScore >= 45) return "RISING";
  return "NONE";
}

function clampInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Math.trunc(safeFinite(value, fallback));

  if (parsed < min) return min;
  if (parsed > max) return max;

  return parsed;
}

function parseSearchParam(request: Request, key: string): string | null {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get(key)?.trim();

  return raw && raw.length > 0 ? raw : null;
}

function parseBooleanSearchParam(request: Request, key: string): boolean {
  const value = parseSearchParam(request, key);

  return value === "1" || value === "true" || value === "yes";
}

/* ============================================================================
 * 6. SEED SCENARIO ADAPTER
 * ========================================================================== */

function mapSeedScenario(input: CalibrationSeedScenario): SeedScenario {
  return {
    asset_id: input.asset_id,
    symbol: input.symbol,
    regime: input.regime,

    occurrence: input.pattern_occurrence_score,
    convergence: input.pattern_convergence_score,
    duration: input.pattern_duration_score,
    frequency: input.pattern_frequency_score,
    correlation: input.pattern_correlation_score,

    stability: input.stability_score,
structure: input.structure_score,
rupture: input.rupture_score,
crash_score: clampScore(input.rupture_score),
crash_state: resolveSeedCrashState(
  clampScore(input.rupture_score),
),

mid_term: input.mid_term_score,
    rupture_probability: input.rupture_probability,
    continuity_probability: input.continuity_probability,
    confidence: input.confidence_score,

    pattern_count: input.pattern_count,
    sample_size: input.sample_size,
    direction_changes: input.direction_change_count,
    rupture_events: input.rupture_event_count,
    stable_run_length: input.stable_run_length,

    dominant_direction_ratio: input.dominant_direction_ratio,
    liquidity_support: input.liquidity_support_score,

    confirmation_alignment: input.confirmation_alignment,
    rfs_status: input.rfs_status,
    mid_term_state: input.mid_term_state,
  };
}

function buildScenario(index: number, count: number): SeedScenario {
  return mapSeedScenario(buildCalibrationSeedScenario(index, count));
}

/* ============================================================================
 * 7. ORCHESTRATOR BRIDGE
 * ========================================================================== */

function resolveSeedImpulseDirectionalBias(
  scenario: SeedScenario,
): SeedImpulseDirectionalBias {
  if (scenario.mid_term_state === "FAVORABLE") return "UP";
  if (scenario.mid_term_state === "UNFAVORABLE") return "DOWN";

  if (
    scenario.confirmation_alignment === "OPPOSED" ||
    scenario.regime === "TRANSITION"
  ) {
    return "MIXED";
  }

  return "NEUTRAL";
}

function resolveSeedImpulseTransitionState(
  scenario: SeedScenario,
): SeedImpulseTransitionState {
  if (
    scenario.regime === "VOLATILE" ||
    scenario.rupture_probability >= 70 ||
    scenario.rupture >= 70
  ) {
    return "EXHAUSTION";
  }

  if (
    scenario.rupture_probability >= 58 &&
    scenario.convergence >= 58 &&
    scenario.frequency < 55
  ) {
    return "RELEASE";
  }

  if (
    scenario.stability >= 60 &&
    scenario.convergence >= 55 &&
    scenario.rupture_probability < 65
  ) {
    return "PRESSURE_BUILDING";
  }

  if (
    scenario.regime === "STABLE" &&
    scenario.stability >= 65 &&
    scenario.rupture_probability < 45
  ) {
    return "COMPRESSION";
  }

  return "NEUTRAL";
}

function buildSeedImpulse(scenario: SeedScenario): SeedImpulse {
  const pressureScore = clampScore(
    scenario.stability * 0.25 +
      scenario.convergence * 0.25 +
      scenario.duration * 0.15 +
      scenario.frequency * 0.15 +
      scenario.rupture_probability * 0.2,
  );

  const accelerationScore = clampScore(
    scenario.rupture_probability * 0.35 +
      scenario.rupture * 0.25 +
      (100 - scenario.duration) * 0.15 +
      scenario.convergence * 0.15 +
      scenario.correlation * 0.1,
  );

  const instabilityScore = clampScore(
    scenario.rupture * 0.45 +
      scenario.rupture_probability * 0.35 +
      (100 - scenario.stability) * 0.2,
  );

  const saturationScore = clampScore(
    pressureScore * 0.3 +
      accelerationScore * 0.2 +
      instabilityScore * 0.25 +
      (100 - scenario.stability) * 0.25,
  );

  const exhaustionScore = clampScore(
    saturationScore * 0.35 +
      instabilityScore * 0.25 +
      scenario.rupture_probability * 0.25 +
      (100 - scenario.frequency) * 0.15,
  );

  return {
    impulse_compression_score: clampScore(
      scenario.stability * 0.3 +
        scenario.duration * 0.25 +
        scenario.frequency * 0.2 +
        scenario.convergence * 0.15 +
        (100 - scenario.rupture_probability) * 0.1,
    ),
    impulse_pressure_score: pressureScore,
    impulse_acceleration_score: accelerationScore,
    impulse_alignment_score: clampScore(
      scenario.convergence * 0.45 +
        scenario.correlation * 0.35 +
        scenario.dominant_direction_ratio * 0.2,
    ),
    impulse_instability_score: instabilityScore,
    impulse_saturation_score: saturationScore,
    impulse_exhaustion_score: exhaustionScore,
    impulse_directional_bias: resolveSeedImpulseDirectionalBias(scenario),
    impulse_transition_state: resolveSeedImpulseTransitionState(scenario),
    impulse_status: "computed",
    impulse_context: "NEUTRAL",
  };
}

function runSeedScenario(input: {
  scenario: SeedScenario;
  analytical_version: string;
  horizon: string;
}): SeedDecisionSummary {
  const { scenario } = input;
  const impulse = buildSeedImpulse(scenario);

  const result = runMciOrchestrator({
    asset_id: scenario.asset_id,
    symbol: scenario.symbol,
    analytical_version: input.analytical_version,
    horizon: input.horizon,
    refresh_calibration: false,
    rfs: {
      metrics: {
        pattern_count: scenario.pattern_count,
        sample_size: scenario.sample_size,
        direction_changes: scenario.direction_changes,
        rupture_events: scenario.rupture_events,
        stable_run_length: scenario.stable_run_length,
        dominant_direction_ratio: scenario.dominant_direction_ratio,
        liquidity_support: scenario.liquidity_support,
        confirmation_alignment: scenario.confirmation_alignment,
      },
      axes: {
        occurrence: scenario.occurrence,
        convergence: scenario.convergence,
        duration: scenario.duration,
        frequency: scenario.frequency,
        correlation: scenario.correlation,
      },
      scores: {
        occurrence: scenario.occurrence,
        convergence: scenario.convergence,
        duration: scenario.duration,
        frequency: scenario.frequency,
        correlation: scenario.correlation,
        stability: scenario.stability,
        structure: scenario.structure,
        rupture: scenario.rupture,
        crash_score: scenario.crash_score,
        mid_term: scenario.mid_term,
      },
      states: {
        regime: scenario.regime,
        rfs_status: scenario.rfs_status,
        mid_term_state: scenario.mid_term_state,
        crash_state: scenario.crash_state,
      },
      probabilities: {
        rupture_probability: scenario.rupture_probability,
        continuity_probability: scenario.continuity_probability,
      },
      quality: {
        confidence: scenario.confidence,
      },
      impulse,
      warnings: [],
    },
  });

  return {
    asset_id: scenario.asset_id,
    symbol: scenario.symbol,
    decision: result.decision,
    regime: result.regime,
    decision_reason: result.decision_reason,
    calibration_source: result.calibration_source,

    stability: result.stability,
    opportunity: result.opportunity,
    convergence: result.convergence,
    confidence: result.confidence,

    decision_score: result.decision_score,
    allow_raw_score: result.allow_raw_score,
    block_raw_score: result.block_raw_score,

    risk_rupture_probability: result.risk_rupture_probability,
    decision_support_probability: result.decision_support_probability,
    recovery_probability: result.recovery_probability,
    recovery_rupture_dominance: result.recovery_rupture_dominance,
  };
}

/* ============================================================================
 * 8. ROUTE HANDLER
 * ========================================================================== */

async function handleSeedRequest(request: Request) {
  try {
    const enabled = isInternalDebugEnabled();

    if (!enabled) {
      return unauthorized("xyvala_internal_debug_disabled", 404);
    }

    const configuredToken = getInternalDebugToken();
    const providedToken = extractProvidedToken(request);

    if (!configuredToken) {
      logAuthDiagnostics({
        enabled,
        hasConfiguredToken: false,
        configuredTokenLength: 0,
        providedTokenLength: providedToken?.length ?? 0,
        path: new URL(request.url).pathname,
      });

      return unauthorized("xyvala_internal_debug_token_missing", 500);
    }

    if (!safeCompareSecrets(providedToken, configuredToken)) {
      logAuthDiagnostics({
        enabled,
        hasConfiguredToken: true,
        configuredTokenLength: configuredToken.length,
        providedTokenLength: providedToken?.length ?? 0,
        path: new URL(request.url).pathname,
      });

      return unauthorized("xyvala_internal_debug_unauthorized", 401);
    }

    const analyticalVersion = safeStr(
      parseSearchParam(request, "analytical_version"),
      DEFAULT_ANALYTICAL_VERSION,
    );

    const horizon = safeStr(
      parseSearchParam(request, "horizon"),
      DEFAULT_HORIZON,
    );

    const count = clampInteger(
      Number(parseSearchParam(request, "count")),
      DEFAULT_SEED_COUNT,
      1,
      MAX_SEED_COUNT,
    );

    const reset = parseBooleanSearchParam(request, "reset");

    if (reset) {
      clearDecisionDistributionStore();
    }

    const seeded: SeedDecisionSummary[] = [];

    for (let index = 0; index < count; index += 1) {
      seeded.push(
        runSeedScenario({
          scenario: buildScenario(index, count),
          analytical_version: analyticalVersion,
          horizon,
        }),
      );
    }

    return buildJsonResponse({
      ok: true,
      ts: Date.now(),
      version: "v1",
      data: {
        seeded_count: seeded.length,
        seeded,
        store_stats: getDecisionDistributionStoreStats(),
      },
      meta: {
        internal: true,
        mutation: true,
        analytical_version: analyticalVersion,
        horizon,
        reset_applied: reset,
        seed_distribution_plan: SEED_REGIME_PLAN,
      },
    });
  } catch (error) {
    return buildJsonResponse(
      {
        ok: false,
        error: "xyvala_internal_calibration_seed_route_failed",
        ts: Date.now(),
        version: "v1",
        meta: {
          internal: true,
          mutation: true,
          details:
            error instanceof Error ? error.message : "unknown_internal_error",
        },
      },
      500,
    );
  }
}

export async function GET() {
  return methodNotAllowed();
}

export async function POST(request: Request) {
  return handleSeedRequest(request);
}
