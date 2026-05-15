/* ============================================================================
 * FILE: app/api/internal/calibration/seed/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala internal calibration seed route
 *
 * PARENT FILES
 * - lib/xyvala/engine/mci-orchestrator.ts
 * - lib/xyvala/calibration/decision-distribution-store.ts
 * - app/api/internal/calibration/route.ts
 *
 * ROLE
 * - expose a private internal seed endpoint for calibration validation
 * - generate deterministic, contract-compliant mock RFS inputs
 * - execute the MCI orchestrator inside the same Next runtime process
 * - populate the in-memory calibration store through real orchestrator writes
 * - provide a bounded seeded result summary for audit/debug usage
 *
 * DIRECTIVES
 * - private internal route only
 * - no provider parsing
 * - no UI logic
 * - no snapshot shaping
 * - no external market fetch
 * - no raw store writes
 * - deterministic outputs only
 * - same input params => same seeded sample set
 * - authentication must fail closed
 * - authentication diagnostics must remain sanitized
 * - seed generation must be explicit, validated, regime-structured and bounded
 * ========================================================================== */

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runMciOrchestrator } from "@/lib/xyvala/engine/mci-orchestrator";
import {
  clearDecisionDistributionStore,
  getDecisionDistributionStoreStats,
} from "@/lib/xyvala/calibration/decision-distribution-store";

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

type SeedDecisionSummary = {
  asset_id: string;
  symbol: string;
  decision: SeedDecision;
  regime: SeedRegime;
  decision_reason: string;
  calibration_source: "fallback" | "bootstrap" | "calibrated" | "degraded";

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

type SeedRegimePlan = {
  regime: SeedRegime;
  ratio: number;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_ANALYTICAL_VERSION = "v8";
const DEFAULT_HORIZON = "7D";
const DEFAULT_SEED_COUNT = 24;
const MAX_SEED_COUNT = 250;

const SEED_REGIME_PLAN: readonly SeedRegimePlan[] = [
  { regime: "STABLE", ratio: 0.35 },
  { regime: "TRANSITION", ratio: 0.45 },
  { regime: "VOLATILE", ratio: 0.2 },
];

const BASE_SCENARIOS: readonly SeedScenario[] = [
  {
    asset_id: "seed-btc-stable",
    symbol: "BTC",
    regime: "STABLE",
    occurrence: 74,
    convergence: 71,
    duration: 73,
    frequency: 70,
    correlation: 68,
    stability: 82,
    structure: 78,
    rupture: 22,
    mid_term: 66,
    rupture_probability: 22,
    continuity_probability: 76,
    confidence: 71,
    pattern_count: 14,
    sample_size: 120,
    direction_changes: 2,
    rupture_events: 1,
    stable_run_length: 9,
    dominant_direction_ratio: 79,
    liquidity_support: 72,
    confirmation_alignment: "ALIGNED",
    rfs_status: "VALID",
    mid_term_state: "FAVORABLE",
  },
  {
    asset_id: "seed-eth-stable",
    symbol: "ETH",
    regime: "STABLE",
    occurrence: 68,
    convergence: 64,
    duration: 67,
    frequency: 66,
    correlation: 63,
    stability: 76,
    structure: 72,
    rupture: 28,
    mid_term: 61,
    rupture_probability: 28,
    continuity_probability: 70,
    confidence: 66,
    pattern_count: 12,
    sample_size: 108,
    direction_changes: 3,
    rupture_events: 1,
    stable_run_length: 7,
    dominant_direction_ratio: 74,
    liquidity_support: 67,
    confirmation_alignment: "ALIGNED",
    rfs_status: "VALID",
    mid_term_state: "FAVORABLE",
  },
  {
    asset_id: "seed-sol-transition",
    symbol: "SOL",
    regime: "TRANSITION",
    occurrence: 59,
    convergence: 57,
    duration: 54,
    frequency: 49,
    correlation: 55,
    stability: 63,
    structure: 58,
    rupture: 44,
    mid_term: 57,
    rupture_probability: 44,
    continuity_probability: 59,
    confidence: 54,
    pattern_count: 10,
    sample_size: 84,
    direction_changes: 5,
    rupture_events: 2,
    stable_run_length: 4,
    dominant_direction_ratio: 66,
    liquidity_support: 58,
    confirmation_alignment: "NEUTRAL",
    rfs_status: "VALID",
    mid_term_state: "NEUTRAL",
  },
  {
    asset_id: "seed-link-transition",
    symbol: "LINK",
    regime: "TRANSITION",
    occurrence: 55,
    convergence: 51,
    duration: 50,
    frequency: 46,
    correlation: 52,
    stability: 58,
    structure: 54,
    rupture: 49,
    mid_term: 49,
    rupture_probability: 49,
    continuity_probability: 54,
    confidence: 50,
    pattern_count: 9,
    sample_size: 76,
    direction_changes: 5,
    rupture_events: 3,
    stable_run_length: 3,
    dominant_direction_ratio: 61,
    liquidity_support: 51,
    confirmation_alignment: "OPPOSED",
    rfs_status: "VALID",
    mid_term_state: "NEUTRAL",
  },
  {
    asset_id: "seed-doge-volatile",
    symbol: "DOGE",
    regime: "VOLATILE",
    occurrence: 43,
    convergence: 34,
    duration: 29,
    frequency: 26,
    correlation: 37,
    stability: 31,
    structure: 35,
    rupture: 72,
    mid_term: 41,
    rupture_probability: 72,
    continuity_probability: 28,
    confidence: 33,
    pattern_count: 7,
    sample_size: 64,
    direction_changes: 8,
    rupture_events: 5,
    stable_run_length: 1,
    dominant_direction_ratio: 55,
    liquidity_support: 44,
    confirmation_alignment: "OPPOSED",
    rfs_status: "WEAK_STRUCTURE",
    mid_term_state: "UNFAVORABLE",
  },
  {
    asset_id: "seed-pepe-volatile",
    symbol: "PEPE",
    regime: "VOLATILE",
    occurrence: 39,
    convergence: 31,
    duration: 24,
    frequency: 22,
    correlation: 33,
    stability: 27,
    structure: 30,
    rupture: 78,
    mid_term: 38,
    rupture_probability: 78,
    continuity_probability: 22,
    confidence: 28,
    pattern_count: 6,
    sample_size: 58,
    direction_changes: 9,
    rupture_events: 6,
    stable_run_length: 1,
    dominant_direction_ratio: 52,
    liquidity_support: 39,
    confirmation_alignment: "OPPOSED",
    rfs_status: "WEAK_STRUCTURE",
    mid_term_state: "UNFAVORABLE",
  },
];

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
 * 4. SAFE HELPERS
 * ========================================================================== */

function safeStr(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeFinite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampScore(value: unknown): number {
  const numeric = safeFinite(value, 0);

  if (numeric < 0) return 0;
  if (numeric > 100) return 100;

  return Math.round(numeric * 100) / 100;
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

function buildJsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/* ============================================================================
 * 5. SEED VALIDATION
 * ========================================================================== */

function assertScore(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`xyvala_seed_invalid_score:${name}`);
  }
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`xyvala_seed_invalid_integer:${name}`);
  }
}

function validateScenario(scenario: SeedScenario): SeedScenario {
  if (!scenario.asset_id || !scenario.symbol) {
    throw new Error("xyvala_seed_invalid_identity");
  }

  assertScore("occurrence", scenario.occurrence);
  assertScore("convergence", scenario.convergence);
  assertScore("duration", scenario.duration);
  assertScore("frequency", scenario.frequency);
  assertScore("correlation", scenario.correlation);
  assertScore("stability", scenario.stability);
  assertScore("structure", scenario.structure);
  assertScore("rupture", scenario.rupture);
  assertScore("mid_term", scenario.mid_term);
  assertScore("rupture_probability", scenario.rupture_probability);
  assertScore("continuity_probability", scenario.continuity_probability);
  assertScore("confidence", scenario.confidence);
  assertScore("dominant_direction_ratio", scenario.dominant_direction_ratio);
  assertScore("liquidity_support", scenario.liquidity_support);

  assertPositiveInteger("pattern_count", scenario.pattern_count);
  assertPositiveInteger("sample_size", scenario.sample_size);
  assertPositiveInteger("direction_changes", scenario.direction_changes);
  assertPositiveInteger("rupture_events", scenario.rupture_events);
  assertPositiveInteger("stable_run_length", scenario.stable_run_length);

  if (scenario.regime === "STABLE" && scenario.stability < 65) {
    throw new Error("xyvala_seed_incoherent_stable_low_stability");
  }

  if (scenario.regime === "STABLE" && scenario.rupture_probability > 45) {
    throw new Error("xyvala_seed_incoherent_stable_high_rupture");
  }

  if (scenario.regime === "TRANSITION") {
    if (scenario.stability < 40 || scenario.stability > 70) {
      throw new Error("xyvala_seed_incoherent_transition_stability");
    }
  }

  if (scenario.regime === "VOLATILE" && scenario.stability > 45) {
    throw new Error("xyvala_seed_incoherent_volatile_high_stability");
  }

  if (scenario.regime === "VOLATILE" && scenario.rupture_probability < 60) {
    throw new Error("xyvala_seed_incoherent_volatile_low_rupture");
  }

  return scenario;
}

/* ============================================================================
 * 6. REGIME-STRUCTURED SEED SELECTION
 * ========================================================================== */

function selectRegimeForIndex(index: number, count: number): SeedRegime {
  const normalizedPosition = count <= 1 ? 0 : index / count;

  let cumulative = 0;

  for (const plan of SEED_REGIME_PLAN) {
    cumulative += plan.ratio;

    if (normalizedPosition <= cumulative) {
      return plan.regime;
    }
  }

  return "TRANSITION";
}

function selectScenarioBase(index: number, count: number): SeedScenario {
  const selectedRegime = selectRegimeForIndex(index, count);

  const candidates = BASE_SCENARIOS.filter(
    (scenario) => scenario.regime === selectedRegime,
  );

  const base = candidates[index % candidates.length];

  if (!base) {
    throw new Error("xyvala_seed_regime_base_unavailable");
  }

  return base;
}

function buildScenario(index: number, count: number): SeedScenario {
  const base = selectScenarioBase(index, count);

  const cycle = Math.trunc(index / BASE_SCENARIOS.length);
  const microShift = ((index % 5) - 2) * 1.15;
  const stabilityShift = cycle % 2 === 0 ? 0 : -1.5;
  const ruptureShift = cycle % 2 === 0 ? 0 : 1.5;

  const scenario: SeedScenario = {
    asset_id: `${base.asset_id}-x${cycle + 1}`,
    symbol: base.symbol,
    regime: base.regime,

    occurrence: clampScore(base.occurrence + microShift),
    convergence: clampScore(base.convergence + microShift * 0.8),
    duration: clampScore(base.duration + microShift * 0.6),
    frequency: clampScore(base.frequency + microShift * 0.7),
    correlation: clampScore(base.correlation + microShift * 0.5),

    stability: clampScore(base.stability + stabilityShift + microShift * 0.5),
    structure: clampScore(base.structure + stabilityShift + microShift * 0.4),
    rupture: clampScore(base.rupture + ruptureShift - microShift * 0.4),
    mid_term: clampScore(base.mid_term + microShift * 0.5),

    rupture_probability: clampScore(
      base.rupture_probability + ruptureShift - microShift * 0.4,
    ),
    continuity_probability: clampScore(
      base.continuity_probability - ruptureShift + microShift * 0.4,
    ),
    confidence: clampScore(base.confidence + microShift * 0.4),

    pattern_count: Math.max(1, base.pattern_count + (index % 3 === 0 ? 1 : 0)),
    sample_size: Math.max(5, base.sample_size + cycle * 2),
    direction_changes: Math.max(
      0,
      base.direction_changes + (index % 4 === 0 ? 1 : 0),
    ),
    rupture_events: Math.max(
      0,
      base.rupture_events + (index % 6 === 0 ? 1 : 0),
    ),
    stable_run_length: Math.max(
      0,
      base.stable_run_length - (index % 5 === 0 ? 1 : 0),
    ),

    dominant_direction_ratio: clampScore(
      base.dominant_direction_ratio + microShift * 0.6,
    ),
    liquidity_support: clampScore(base.liquidity_support + microShift * 0.5),

    confirmation_alignment: base.confirmation_alignment,
    rfs_status: base.rfs_status,
    mid_term_state: base.mid_term_state,
  };

  return validateScenario(scenario);
}

/* ============================================================================
 * 7. ORCHESTRATOR BRIDGE
 * ========================================================================== */

function runSeedScenario(input: {
  scenario: SeedScenario;
  analytical_version: string;
  horizon: string;
}): SeedDecisionSummary {
  const { scenario } = input;

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
        mid_term: scenario.mid_term,
      },
      states: {
        regime: scenario.regime,
        rfs_status: scenario.rfs_status,
        mid_term_state: scenario.mid_term_state,
      },
      probabilities: {
        rupture_probability: scenario.rupture_probability,
        continuity_probability: scenario.continuity_probability,
      },
      quality: {
        confidence: scenario.confidence,
      },
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
      const scenario = buildScenario(index, count);

      seeded.push(
        runSeedScenario({
          scenario,
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
          details:
            error instanceof Error ? error.message : "unknown_internal_error",
        },
      },
      500,
    );
  }
}

export async function GET(request: Request) {
  return handleSeedRequest(request);
}

export async function POST(request: Request) {
  return handleSeedRequest(request);
}
