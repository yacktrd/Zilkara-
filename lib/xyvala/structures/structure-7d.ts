/* ============================================================================
 * FILE: lib/xyvala/structures/structure-7d.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala RFS 7D validation layer
 *
 * ROLE
 * - centralize 7D RFS validation logic
 * - separate 7D price metrics from 7D validation scores
 * - validate short-term structure without defining stability, regime or decision
 * - preserve backward-compatible public fields for scan-service and UI
 *
 * DIRECTIVES
 * - deterministic output only
 * - no route logic
 * - no UI logic
 * - no cache logic
 * - no MCI decision here
 * - no final ALLOW / WATCH / BLOCK decision here
 * - 7D validates or degrades short-term structure only
 * - 7D never defines stability
 * - 7D never defines regime alone
 * - sparkline_7d remains visual support
 * - null means explicitly unavailable
 * - undefined must never be exposed
 * - READ -> VALIDATE -> COMPUTE -> RETURN
 * ========================================================================== */

export type Structure7DStatus =
  | "computed"
  | "partial"
  | "insufficient_data"
  | "unavailable";

export type Structure7DValidationState =
  | "CONFIRM"
  | "WEAKEN"
  | "BREAK"
  | "UNAVAILABLE";

export type Structure7DPatternState =
  | "COHERENT"
  | "MIXED"
  | "UNSTABLE"
  | "UNAVAILABLE";

export type Structure7DMetrics = {
  chg_7d_pct: number | null;
  initial_7d_chg_pct: number | null;

  rolling_7d_price_path: number[] | null;
  initial_7d_price_path: number[] | null;
  sparkline_7d: number[] | null;

  rolling_7d_return_count: number;
  initial_7d_return_count: number;

  rolling_7d_break_count: number | null;
  initial_7d_break_count: number | null;

  rolling_7d_directional_bias: number | null;
  initial_7d_directional_bias: number | null;

  rolling_7d_noise_ratio: number | null;
  initial_7d_noise_ratio: number | null;
};

export type Structure7DScores = {
  rolling_7d_validation_score: number | null;
  initial_7d_validation_score: number | null;

  rolling_7d_consistency_score: number | null;
  initial_7d_consistency_score: number | null;

  rolling_7d_convergence_score: number | null;
  initial_7d_convergence_score: number | null;

  rolling_7d_rupture_penalty: number | null;
  initial_7d_rupture_penalty: number | null;
};

export type Structure7DStates = {
  rolling_7d_validation_state: Structure7DValidationState;
  initial_7d_validation_state: Structure7DValidationState;

  rolling_7d_pattern_state: Structure7DPatternState;
  initial_7d_pattern_state: Structure7DPatternState;

  rolling_7d_status: Structure7DStatus;
  initial_7d_status: Structure7DStatus;
};

export type Structure7D = {
  metrics: Structure7DMetrics;
  scores: Structure7DScores;
  states: Structure7DStates;

  initial_7d_structure_score: number | null;
  initial_7d_structure_status: Structure7DStatus;
  initial_7d_structure_valid: boolean;

  rolling_7d_structure_score: number | null;
  rolling_7d_structure_status: Structure7DStatus;
  rolling_7d_structure_valid: boolean;

  chg_7d_pct: number | null;
  sparkline_7d: number[] | null;
};

export type BuildStructure7DInput = {
  sparkline_7d?: unknown;
  chg_7d_pct?: unknown;

  initial_7d_price_path?: unknown;
  rolling_7d_price_path?: unknown;

  initial_7d_structure_score?: unknown;
  initial_7d_structure_status?: unknown;

  intro_7d_score?: unknown;
  intro_7d_status?: unknown;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function clampScore(value: unknown): number | null {
  const n = safeNumber(value);
  if (n === null) return null;
  return round2(clamp(n, 0, 100));
}

function normalizeStatus(value: unknown): Structure7DStatus {
  if (value === "computed") return "computed";
  if (value === "partial") return "partial";
  if (value === "insufficient_data") return "insufficient_data";
  return "unavailable";
}

function normalizePricePath(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const points = value.filter(
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
  );

  return points.length >= 2 ? points : null;
}

function computePctChangeFromPoints(points: number[] | null): number | null {
  if (!points || points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];

  if (
    typeof first !== "number" ||
    typeof last !== "number" ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first === 0
  ) {
    return null;
  }

  return round2(((last - first) / Math.abs(first)) * 100);
}

function computeReturns(points: number[] | null): number[] {
  if (!points || points.length < 2) return [];

  const returns: number[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (
      typeof previous !== "number" ||
      typeof current !== "number" ||
      !Number.isFinite(previous) ||
      !Number.isFinite(current) ||
      previous === 0
    ) {
      continue;
    }

    returns.push(((current - previous) / Math.abs(previous)) * 100);
  }

  return returns;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;

  const mean = average(values);
  if (mean === null) return null;

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

/* ============================================================================
 * 3. RFS 7D METRICS
 * ========================================================================== */

function countDirectionalBreaks(returns: number[]): number | null {
  if (returns.length < 2) return null;

  let breaks = 0;

  for (let index = 1; index < returns.length; index += 1) {
    const previous = returns[index - 1];
    const current = returns[index];

    if (
      typeof previous !== "number" ||
      typeof current !== "number" ||
      !Number.isFinite(previous) ||
      !Number.isFinite(current) ||
      previous === 0 ||
      current === 0
    ) {
      continue;
    }

    const previousDirection = previous > 0 ? 1 : -1;
    const currentDirection = current > 0 ? 1 : -1;

    if (previousDirection !== currentDirection) {
      breaks += 1;
    }
  }

  return breaks;
}

function computeDirectionalBias(returns: number[]): number | null {
  if (returns.length === 0) return null;

  const positive = returns.filter((value) => value > 0).length;
  const negative = returns.filter((value) => value < 0).length;
  const active = positive + negative;

  if (active === 0) return 0;

  return round2(Math.abs(positive - negative) / active);
}

function computeNoiseRatio(returns: number[]): number | null {
  if (returns.length < 2) return null;

  const avg = average(returns);
  const std = standardDeviation(returns);

  if (avg === null || std === null) return null;

  const scale = Math.max(Math.abs(avg), 1);

  return round2(clamp(std / scale, 0, 10));
}

function buildWindowMetrics(points: number[] | null): {
  change_pct: number | null;
  return_count: number;
  break_count: number | null;
  directional_bias: number | null;
  noise_ratio: number | null;
} {
  const returns = computeReturns(points);

  return {
    change_pct: computePctChangeFromPoints(points),
    return_count: returns.length,
    break_count: countDirectionalBreaks(returns),
    directional_bias: computeDirectionalBias(returns),
    noise_ratio: computeNoiseRatio(returns),
  };
}

/* ============================================================================
 * 4. SCORE BUILDERS
 * ========================================================================== */

function scoreConsistency(input: {
  directional_bias: number | null;
  noise_ratio: number | null;
  return_count: number;
}): number | null {
  if (input.return_count < 1) return null;

  const biasScore =
    input.directional_bias === null
      ? 50
      : clamp(input.directional_bias * 100, 0, 100);

  const noisePenalty =
    input.noise_ratio === null ? 20 : clamp(input.noise_ratio * 12, 0, 70);

  return round2(clamp(biasScore - noisePenalty + 20, 0, 100));
}

function scoreConvergence(input: {
  change_pct: number | null;
  directional_bias: number | null;
  noise_ratio: number | null;
}): number | null {
  if (input.change_pct === null) return null;

  const directionComponent = clamp(50 + input.change_pct, 0, 100);

  const biasComponent =
    input.directional_bias === null
      ? 50
      : clamp(input.directional_bias * 100, 0, 100);

  const noisePenalty =
    input.noise_ratio === null ? 15 : clamp(input.noise_ratio * 10, 0, 60);

  return round2(
    clamp(
      directionComponent * 0.45 +
        biasComponent * 0.4 -
        noisePenalty +
        15,
      0,
      100,
    ),
  );
}

function scoreRupturePenalty(input: {
  break_count: number | null;
  return_count: number;
  noise_ratio: number | null;
}): number | null {
  if (input.return_count < 1) return null;

  const breakRatio =
    input.break_count === null
      ? 0
      : clamp(input.break_count / Math.max(input.return_count, 1), 0, 1);

  const noise =
    input.noise_ratio === null ? 0 : clamp(input.noise_ratio / 5, 0, 1);

  return round2(clamp((breakRatio * 0.65 + noise * 0.35) * 100, 0, 100));
}

function computeValidationScore(input: {
  change_pct: number | null;
  return_count: number;
  break_count: number | null;
  directional_bias: number | null;
  noise_ratio: number | null;
  explicit_score?: unknown;
}): {
  score: number | null;
  consistency_score: number | null;
  convergence_score: number | null;
  rupture_penalty: number | null;
} {
  const explicit = clampScore(input.explicit_score);

  const consistency = scoreConsistency(input);
  const convergence = scoreConvergence(input);
  const rupturePenalty = scoreRupturePenalty(input);

  if (explicit !== null) {
    return {
      score: explicit,
      consistency_score: consistency,
      convergence_score: convergence,
      rupture_penalty: rupturePenalty,
    };
  }

  if (consistency === null || convergence === null || rupturePenalty === null) {
    return {
      score: null,
      consistency_score: consistency,
      convergence_score: convergence,
      rupture_penalty: rupturePenalty,
    };
  }

  const score =
    consistency * 0.35 +
    convergence * 0.4 +
    (100 - rupturePenalty) * 0.25;

  return {
    score: round2(clamp(score, 0, 100)),
    consistency_score: consistency,
    convergence_score: convergence,
    rupture_penalty: rupturePenalty,
  };
}

/* ============================================================================
 * 5. STATE RESOLVERS
 * ========================================================================== */

function resolveValidationState(
  score: number | null,
  rupturePenalty: number | null,
): Structure7DValidationState {
  if (score === null) return "UNAVAILABLE";
  if (rupturePenalty !== null && rupturePenalty >= 65) return "BREAK";
  if (score >= 60) return "CONFIRM";
  if (score >= 40) return "WEAKEN";
  return "BREAK";
}

function resolvePatternState(input: {
  score: number | null;
  rupture_penalty: number | null;
}): Structure7DPatternState {
  if (input.score === null) return "UNAVAILABLE";
  if (input.rupture_penalty !== null && input.rupture_penalty >= 65) {
    return "UNSTABLE";
  }
  if (input.score >= 60) return "COHERENT";
  if (input.score >= 40) return "MIXED";
  return "UNSTABLE";
}

function resolveStatus(input: {
  path: number[] | null;
  score: number | null;
  explicit_status?: unknown;
}): Structure7DStatus {
  const explicit = normalizeStatus(input.explicit_status);

  if (explicit !== "unavailable") return explicit;
  if (!input.path) return "unavailable";
  if (input.path.length < 2) return "insufficient_data";
  if (input.score === null) return "partial";
  if (input.path.length >= 7) return "computed";

  return "partial";
}

/* ============================================================================
 * 6. PUBLIC BUILDER
 * ========================================================================== */

export function buildStructure7D(input: BuildStructure7DInput): Structure7D {
  const visualSparkline7d = normalizePricePath(input.sparkline_7d);
  const initialPath = normalizePricePath(input.initial_7d_price_path);
  const rollingPath =
    normalizePricePath(input.rolling_7d_price_path) ?? visualSparkline7d;

  const rollingMetrics = buildWindowMetrics(rollingPath);
  const initialMetrics = buildWindowMetrics(initialPath);

  const rollingChangePct =
    safeNumber(input.chg_7d_pct) ?? rollingMetrics.change_pct ?? null;

  const initialExplicitScore =
    input.initial_7d_structure_score ?? input.intro_7d_score;

  const initialExplicitStatus =
    input.initial_7d_structure_status ?? input.intro_7d_status;

  const rollingScore = computeValidationScore({
    ...rollingMetrics,
    change_pct: rollingChangePct,
  });

  const initialScore = computeValidationScore({
    ...initialMetrics,
    explicit_score: initialExplicitScore,
  });

  const rollingStatus = resolveStatus({
    path: rollingPath,
    score: rollingScore.score,
  });

  const initialStatus = resolveStatus({
    path: initialPath,
    score: initialScore.score,
    explicit_status: initialExplicitStatus,
  });

  const rollingState = resolveValidationState(
    rollingScore.score,
    rollingScore.rupture_penalty,
  );

  const initialState = resolveValidationState(
    initialScore.score,
    initialScore.rupture_penalty,
  );

  const metrics: Structure7DMetrics = {
    chg_7d_pct: rollingChangePct,
    initial_7d_chg_pct: initialMetrics.change_pct,

    rolling_7d_price_path: rollingPath,
    initial_7d_price_path: initialPath,
    sparkline_7d: visualSparkline7d,

    rolling_7d_return_count: rollingMetrics.return_count,
    initial_7d_return_count: initialMetrics.return_count,

    rolling_7d_break_count: rollingMetrics.break_count,
    initial_7d_break_count: initialMetrics.break_count,

    rolling_7d_directional_bias: rollingMetrics.directional_bias,
    initial_7d_directional_bias: initialMetrics.directional_bias,

    rolling_7d_noise_ratio: rollingMetrics.noise_ratio,
    initial_7d_noise_ratio: initialMetrics.noise_ratio,
  };

  const scores: Structure7DScores = {
    rolling_7d_validation_score: rollingScore.score,
    initial_7d_validation_score: initialScore.score,

    rolling_7d_consistency_score: rollingScore.consistency_score,
    initial_7d_consistency_score: initialScore.consistency_score,

    rolling_7d_convergence_score: rollingScore.convergence_score,
    initial_7d_convergence_score: initialScore.convergence_score,

    rolling_7d_rupture_penalty: rollingScore.rupture_penalty,
    initial_7d_rupture_penalty: initialScore.rupture_penalty,
  };

  const states: Structure7DStates = {
    rolling_7d_validation_state: rollingState,
    initial_7d_validation_state: initialState,

    rolling_7d_pattern_state: resolvePatternState({
      score: rollingScore.score,
      rupture_penalty: rollingScore.rupture_penalty,
    }),

    initial_7d_pattern_state: resolvePatternState({
      score: initialScore.score,
      rupture_penalty: initialScore.rupture_penalty,
    }),

    rolling_7d_status: rollingStatus,
    initial_7d_status: initialStatus,
  };

  return {
    metrics,
    scores,
    states,

    initial_7d_structure_score: scores.initial_7d_validation_score,
    initial_7d_structure_status: states.initial_7d_status,
    initial_7d_structure_valid:
      states.initial_7d_status === "computed" ||
      states.initial_7d_status === "partial",

    rolling_7d_structure_score: scores.rolling_7d_validation_score,
    rolling_7d_structure_status: states.rolling_7d_status,
    rolling_7d_structure_valid:
      states.rolling_7d_status === "computed" ||
      states.rolling_7d_status === "partial",

    chg_7d_pct: metrics.chg_7d_pct,
    sparkline_7d: metrics.sparkline_7d,
  };
}
