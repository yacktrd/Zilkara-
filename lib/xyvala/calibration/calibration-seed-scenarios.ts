/* ============================================================================
 * FILE: lib/xyvala/calibration/calibration-seed-scenarios.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala deterministic calibration seed scenarios
 *
 * ROLE
 * - provide deterministic calibration seed scenarios
 * - generate bounded regime-structured mock RFS inputs
 * - validate seed scenario coherence before orchestration
 * - isolate seed data from internal API routes and calibration orchestrators
 *
 * PARENTS
 * - app/api/internal/calibration/seed/route.ts
 * - lib/xyvala/calibration/calibration-orchestrator.ts
 *
 * DIRECTIVES
 * - calibration seed scenarios only
 * - no API response building
 * - no UI logic
 * - no store mutation
 * - no runtime mutation
 * - no MCI execution
 * - no RFS recomputation
 * - no calibration state persistence
 * - deterministic outputs only
 * - same index and count must produce the same scenario
 * - bounded scenario generation only
 * - FR / EU compatible internal tooling
 *
 * INPUTS
 * - seed index
 * - seed count
 *
 * OUTPUTS
 * - CalibrationSeedScenario
 * - CalibrationSeedRegimePlan
 *
 * INVARIANTS
 * - no random generation
 * - no Date.now usage
 * - no external data fetch
 * - no provider parsing
 * - no cache access
 * - no store access
 * - invalid scenarios must throw explicit errors
 * - generated scenarios must remain regime-coherent
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type CalibrationSeedDecision = "ALLOW" | "WATCH" | "BLOCK";

export type CalibrationSeedRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type CalibrationSeedAlignment =
  | "ALIGNED"
  | "OPPOSED"
  | "NEUTRAL"
  | "UNAVAILABLE";

export type CalibrationSeedRfsStatus =
  | "VALID"
  | "WEAK_STRUCTURE"
  | "INSUFFICIENT_DATA"
  | "INVALID";

export type CalibrationSeedMidTermState =
  | "FAVORABLE"
  | "NEUTRAL"
  | "UNFAVORABLE";

export type CalibrationSeedRegimePlan = {
  regime: CalibrationSeedRegime;
  ratio: number;
};

export type CalibrationSeedScenario = {
  asset_id: string;
  symbol: string;
  regime: CalibrationSeedRegime;

  pattern_occurrence_score: number;
  pattern_convergence_score: number;
  pattern_duration_score: number;
  pattern_frequency_score: number;
  pattern_correlation_score: number;

  stability_score: number;
  structure_score: number;
  rupture_score: number;
  mid_term_score: number;

  rupture_probability: number;
  continuity_probability: number;
  confidence_score: number;

  pattern_count: number;
  sample_size: number;
  direction_change_count: number;
  rupture_event_count: number;
  stable_run_length: number;

  dominant_direction_ratio: number;
  liquidity_support_score: number;

  confirmation_alignment: CalibrationSeedAlignment;
  rfs_status: CalibrationSeedRfsStatus;
  mid_term_state: CalibrationSeedMidTermState;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

export const CALIBRATION_SEED_REGIME_PLAN: readonly CalibrationSeedRegimePlan[] =
  [
    { regime: "STABLE", ratio: 0.35 },
    { regime: "TRANSITION", ratio: 0.45 },
    { regime: "VOLATILE", ratio: 0.2 },
  ];

const BASE_SEED_SCENARIOS: readonly CalibrationSeedScenario[] = [
  {
    asset_id: "seed-btc-stable",
    symbol: "BTC",
    regime: "STABLE",

    pattern_occurrence_score: 74,
    pattern_convergence_score: 71,
    pattern_duration_score: 73,
    pattern_frequency_score: 70,
    pattern_correlation_score: 68,

    stability_score: 82,
    structure_score: 78,
    rupture_score: 22,
    mid_term_score: 66,

    rupture_probability: 22,
    continuity_probability: 76,
    confidence_score: 71,

    pattern_count: 14,
    sample_size: 120,
    direction_change_count: 2,
    rupture_event_count: 1,
    stable_run_length: 9,

    dominant_direction_ratio: 79,
    liquidity_support_score: 72,

    confirmation_alignment: "ALIGNED",
    rfs_status: "VALID",
    mid_term_state: "FAVORABLE",
  },
  {
    asset_id: "seed-eth-stable",
    symbol: "ETH",
    regime: "STABLE",

    pattern_occurrence_score: 68,
    pattern_convergence_score: 64,
    pattern_duration_score: 67,
    pattern_frequency_score: 66,
    pattern_correlation_score: 63,

    stability_score: 76,
    structure_score: 72,
    rupture_score: 28,
    mid_term_score: 61,

    rupture_probability: 28,
    continuity_probability: 70,
    confidence_score: 66,

    pattern_count: 12,
    sample_size: 108,
    direction_change_count: 3,
    rupture_event_count: 1,
    stable_run_length: 7,

    dominant_direction_ratio: 74,
    liquidity_support_score: 67,

    confirmation_alignment: "ALIGNED",
    rfs_status: "VALID",
    mid_term_state: "FAVORABLE",
  },
  {
    asset_id: "seed-sol-transition",
    symbol: "SOL",
    regime: "TRANSITION",

    pattern_occurrence_score: 59,
    pattern_convergence_score: 57,
    pattern_duration_score: 54,
    pattern_frequency_score: 49,
    pattern_correlation_score: 55,

    stability_score: 63,
    structure_score: 58,
    rupture_score: 44,
    mid_term_score: 57,

    rupture_probability: 44,
    continuity_probability: 59,
    confidence_score: 54,

    pattern_count: 10,
    sample_size: 84,
    direction_change_count: 5,
    rupture_event_count: 2,
    stable_run_length: 4,

    dominant_direction_ratio: 66,
    liquidity_support_score: 58,

    confirmation_alignment: "NEUTRAL",
    rfs_status: "VALID",
    mid_term_state: "NEUTRAL",
  },
  {
    asset_id: "seed-link-transition",
    symbol: "LINK",
    regime: "TRANSITION",

    pattern_occurrence_score: 55,
    pattern_convergence_score: 51,
    pattern_duration_score: 50,
    pattern_frequency_score: 46,
    pattern_correlation_score: 52,

    stability_score: 58,
    structure_score: 54,
    rupture_score: 49,
    mid_term_score: 49,

    rupture_probability: 49,
    continuity_probability: 54,
    confidence_score: 50,

    pattern_count: 9,
    sample_size: 76,
    direction_change_count: 5,
    rupture_event_count: 3,
    stable_run_length: 3,

    dominant_direction_ratio: 61,
    liquidity_support_score: 51,

    confirmation_alignment: "OPPOSED",
    rfs_status: "VALID",
    mid_term_state: "NEUTRAL",
  },
  {
    asset_id: "seed-doge-volatile",
    symbol: "DOGE",
    regime: "VOLATILE",

    pattern_occurrence_score: 43,
    pattern_convergence_score: 34,
    pattern_duration_score: 29,
    pattern_frequency_score: 26,
    pattern_correlation_score: 37,

    stability_score: 31,
    structure_score: 35,
    rupture_score: 72,
    mid_term_score: 41,

    rupture_probability: 72,
    continuity_probability: 28,
    confidence_score: 33,

    pattern_count: 7,
    sample_size: 64,
    direction_change_count: 8,
    rupture_event_count: 5,
    stable_run_length: 1,

    dominant_direction_ratio: 55,
    liquidity_support_score: 44,

    confirmation_alignment: "OPPOSED",
    rfs_status: "WEAK_STRUCTURE",
    mid_term_state: "UNFAVORABLE",
  },
  {
    asset_id: "seed-pepe-volatile",
    symbol: "PEPE",
    regime: "VOLATILE",

    pattern_occurrence_score: 39,
    pattern_convergence_score: 31,
    pattern_duration_score: 24,
    pattern_frequency_score: 22,
    pattern_correlation_score: 33,

    stability_score: 27,
    structure_score: 30,
    rupture_score: 78,
    mid_term_score: 38,

    rupture_probability: 78,
    continuity_probability: 22,
    confidence_score: 28,

    pattern_count: 6,
    sample_size: 58,
    direction_change_count: 9,
    rupture_event_count: 6,
    stable_run_length: 1,

    dominant_direction_ratio: 52,
    liquidity_support_score: 39,

    confirmation_alignment: "OPPOSED",
    rfs_status: "WEAK_STRUCTURE",
    mid_term_state: "UNFAVORABLE",
  },
];

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampScore(value: unknown): number {
  const numeric = safeNumber(value, 0);

  if (numeric < 0) return 0;
  if (numeric > 100) return 100;

  return Math.round(numeric * 100) / 100;
}

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

/* ============================================================================
 * 4. VALIDATION
 * ========================================================================== */

export function validateCalibrationSeedScenario(
  scenario: CalibrationSeedScenario,
): CalibrationSeedScenario {
  if (!scenario.asset_id || !scenario.symbol) {
    throw new Error("xyvala_seed_invalid_identity");
  }

  assertScore("pattern_occurrence_score", scenario.pattern_occurrence_score);
  assertScore("pattern_convergence_score", scenario.pattern_convergence_score);
  assertScore("pattern_duration_score", scenario.pattern_duration_score);
  assertScore("pattern_frequency_score", scenario.pattern_frequency_score);
  assertScore("pattern_correlation_score", scenario.pattern_correlation_score);

  assertScore("stability_score", scenario.stability_score);
  assertScore("structure_score", scenario.structure_score);
  assertScore("rupture_score", scenario.rupture_score);
  assertScore("mid_term_score", scenario.mid_term_score);

  assertScore("rupture_probability", scenario.rupture_probability);
  assertScore("continuity_probability", scenario.continuity_probability);
  assertScore("confidence_score", scenario.confidence_score);

  assertScore("dominant_direction_ratio", scenario.dominant_direction_ratio);
  assertScore("liquidity_support_score", scenario.liquidity_support_score);

  assertPositiveInteger("pattern_count", scenario.pattern_count);
  assertPositiveInteger("sample_size", scenario.sample_size);
  assertPositiveInteger("direction_change_count", scenario.direction_change_count);
  assertPositiveInteger("rupture_event_count", scenario.rupture_event_count);
  assertPositiveInteger("stable_run_length", scenario.stable_run_length);

  if (scenario.regime === "STABLE" && scenario.stability_score < 65) {
    throw new Error("xyvala_seed_incoherent_stable_low_stability");
  }

  if (scenario.regime === "STABLE" && scenario.rupture_probability > 45) {
    throw new Error("xyvala_seed_incoherent_stable_high_rupture");
  }

  if (
    scenario.regime === "TRANSITION" &&
    (scenario.stability_score < 40 || scenario.stability_score > 70)
  ) {
    throw new Error("xyvala_seed_incoherent_transition_stability");
  }

  if (scenario.regime === "VOLATILE" && scenario.stability_score > 45) {
    throw new Error("xyvala_seed_incoherent_volatile_high_stability");
  }

  if (scenario.regime === "VOLATILE" && scenario.rupture_probability < 60) {
    throw new Error("xyvala_seed_incoherent_volatile_low_rupture");
  }

  return scenario;
}

/* ============================================================================
 * 5. REGIME SELECTION
 * ========================================================================== */

export function selectCalibrationSeedRegime(
  index: number,
  count: number,
): CalibrationSeedRegime {
  const safeCount = Math.max(1, Math.trunc(safeNumber(count, 1)));
  const safeIndex = Math.max(0, Math.trunc(safeNumber(index, 0)));
  const normalizedPosition = safeCount <= 1 ? 0 : safeIndex / safeCount;

  let cumulative = 0;

  for (const plan of CALIBRATION_SEED_REGIME_PLAN) {
    cumulative += plan.ratio;

    if (normalizedPosition <= cumulative) {
      return plan.regime;
    }
  }

  return "TRANSITION";
}

export function selectCalibrationSeedBaseScenario(
  index: number,
  count: number,
): CalibrationSeedScenario {
  const selectedRegime = selectCalibrationSeedRegime(index, count);

  const candidates = BASE_SEED_SCENARIOS.filter(
    (scenario) => scenario.regime === selectedRegime,
  );

  const safeIndex = Math.max(0, Math.trunc(safeNumber(index, 0)));
  const base = candidates[safeIndex % candidates.length];

  if (!base) {
    throw new Error("xyvala_seed_regime_base_unavailable");
  }

  return base;
}

/* ============================================================================
 * 6. SCENARIO BUILDER
 * ========================================================================== */

export function buildCalibrationSeedScenario(
  index: number,
  count: number,
): CalibrationSeedScenario {
  const safeIndex = Math.max(0, Math.trunc(safeNumber(index, 0)));
  const base = selectCalibrationSeedBaseScenario(safeIndex, count);

  const cycle = Math.trunc(safeIndex / BASE_SEED_SCENARIOS.length);
  const microShift = ((safeIndex % 5) - 2) * 1.15;
  const stabilityShift = cycle % 2 === 0 ? 0 : -1.5;
  const ruptureShift = cycle % 2 === 0 ? 0 : 1.5;

  const scenario: CalibrationSeedScenario = {
    asset_id: `${base.asset_id}-x${cycle + 1}`,
    symbol: base.symbol,
    regime: base.regime,

    pattern_occurrence_score: clampScore(
      base.pattern_occurrence_score + microShift,
    ),
    pattern_convergence_score: clampScore(
      base.pattern_convergence_score + microShift * 0.8,
    ),
    pattern_duration_score: clampScore(
      base.pattern_duration_score + microShift * 0.6,
    ),
    pattern_frequency_score: clampScore(
      base.pattern_frequency_score + microShift * 0.7,
    ),
    pattern_correlation_score: clampScore(
      base.pattern_correlation_score + microShift * 0.5,
    ),

    stability_score: clampScore(
      base.stability_score + stabilityShift + microShift * 0.5,
    ),
    structure_score: clampScore(
      base.structure_score + stabilityShift + microShift * 0.4,
    ),
    rupture_score: clampScore(
      base.rupture_score + ruptureShift - microShift * 0.4,
    ),
    mid_term_score: clampScore(base.mid_term_score + microShift * 0.5),

    rupture_probability: clampScore(
      base.rupture_probability + ruptureShift - microShift * 0.4,
    ),
    continuity_probability: clampScore(
      base.continuity_probability - ruptureShift + microShift * 0.4,
    ),
    confidence_score: clampScore(base.confidence_score + microShift * 0.4),

    pattern_count: Math.max(
      1,
      base.pattern_count + (safeIndex % 3 === 0 ? 1 : 0),
    ),
    sample_size: Math.max(5, base.sample_size + cycle * 2),
    direction_change_count: Math.max(
      0,
      base.direction_change_count + (safeIndex % 4 === 0 ? 1 : 0),
    ),
    rupture_event_count: Math.max(
      0,
      base.rupture_event_count + (safeIndex % 6 === 0 ? 1 : 0),
    ),
    stable_run_length: Math.max(
      0,
      base.stable_run_length - (safeIndex % 5 === 0 ? 1 : 0),
    ),

    dominant_direction_ratio: clampScore(
      base.dominant_direction_ratio + microShift * 0.6,
    ),
    liquidity_support_score: clampScore(
      base.liquidity_support_score + microShift * 0.5,
    ),

    confirmation_alignment: base.confirmation_alignment,
    rfs_status: base.rfs_status,
    mid_term_state: base.mid_term_state,
  };

  return validateCalibrationSeedScenario(scenario);
}
