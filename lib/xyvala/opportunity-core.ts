/* ============================================================================
 * FILE: lib/xyvala/opportunity-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private MCI opportunity core
 *
 * ROLE
 * - consume canonical RFS structural truth after RFS computation
 * - evaluate comparable historical pattern occurrences
 * - aggregate correction, continuation and convergence evidence
 * - compute the private MCI opportunity score
 * - resolve a private defensive decision
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - MCI
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 *
 * PARENTS
 * - RFS
 * - Triple Layer input adapter
 * - Impulse Layer input adapter
 * - Analytical Aggregation System input adapter
 * - MCI contracts
 *
 * CONSUMERS
 * - MCI orchestrator
 * - private snapshot projection
 * - private calibration input adapter
 * - private analytical stores
 *
 * DIRECTIVES
 * - private MCI computation only
 * - no public ScanAsset dependency
 * - no RFS recomputation
 * - no pattern reclassification from prices
 * - no rupture recomputation
 * - no continuity recomputation
 * - no stability recomputation
 * - no regime reconstruction
 * - no Triple Layer computation
 * - no Impulse Layer computation
 * - no Crash System computation
 * - no calibration computation
 * - no API logic
 * - no UI logic
 * - no public exposure
 * - no score clamping as silent repair
 * - no unavailable-to-zero substitution
 * - no unavailable-to-neutral substitution
 * - no synthetic historical occurrence
 * - no unsafe array access
 * - deterministic output only
 * - same validated input and versions => same output
 *
 * INPUTS
 * - canonical RfsScoreResult
 * - observable current price series
 * - optional real historical pattern occurrences
 *
 * OUTPUTS
 * - private MCI opportunity result
 *
 * OWNERSHIP
 * - MCI owns:
 *   - correction_probability
 *   - continuation_probability
 *   - opportunity_score
 *   - decision
 *   - decision reason
 *
 * NON-OWNERSHIP
 * - RFS owns:
 *   - pattern truth
 *   - structural convergence
 *   - stability
 *   - regime
 *   - rupture
 *   - continuity probability
 *
 * - Calibration owns:
 *   - calibrated decision thresholds
 *   - calibrated distribution policies
 *
 * INVARIANTS
 * - RFS values are consumed through their canonical nested identities
 * - RFS pattern state is never recomputed from prices
 * - null remains distinct from zero
 * - missing analytical truth produces a defensive WATCH result
 * - ALLOW requires complete and valid upstream analytical truth
 * - BLOCK qualifies observed adverse evidence, not technical insufficiency
 * - historical absence never becomes a synthetic zero-probability observation
 * - no downstream layer may infer missing RFS truth from MCI output
 *
 * BOUNDARIES
 * - RFS -> MCI
 * - historical occurrence store -> MCI
 * - MCI -> private snapshot
 *
 * FIRST DIVERGENCE
 * - invalid or unavailable canonical RFS truth
 *   => RFS -> MCI boundary
 *
 * - invalid historical occurrences
 *   => historical occurrence store -> MCI boundary
 *
 * - valid MCI result altered downstream
 *   => first downstream propagation boundary
 *
 * SENSITIVE ZONES
 * - RFS nested contract reading
 * - nullability
 * - pattern identity mapping
 * - historical comparability
 * - probability aggregation
 * - defensive decision resolution
 * ========================================================================== */

import type {
  RfsComputationStatus,
  RfsPatternState,
  RfsScoreResult,
} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

/* ============================================================================
 * 1. PUBLIC CONTRACTS
 * ========================================================================== */

export type MciDecision =
  | "ALLOW"
  | "WATCH"
  | "BLOCK";

export type MciComputationStatus =
  | "computed"
  | "partial"
  | "unavailable"
  | "invalid";

export type PatternKind =
  | "UP_STREAK"
  | "DOWN_STREAK"
  | "COMPRESSION"
  | "BREAKOUT"
  | "BREAKDOWN"
  | "MEAN_REVERTING"
  | "CHAOTIC"
  | "MIXED"
  | "UNAVAILABLE";

export type PatternOccurrence = Readonly<{
  kind: PatternKind;

  similarity_score:
    number;

  led_to_correction:
    boolean;

  led_to_continuation:
    boolean;
}>;

export type MciInput = Readonly<{
  rfs:
    RfsScoreResult;

  prices:
    readonly number[];

  timestamps?:
    readonly number[];

  historical_patterns?:
    readonly PatternOccurrence[];
}>;

export type MciResult = Readonly<{
  status:
    MciComputationStatus;

  pattern_kind:
    PatternKind;

  pattern_occurrence_count:
    number;

  comparable_occurrence_count:
    number;

  pattern_similarity_score:
    number | null;

  convergence_score:
    number | null;

  correction_probability:
    number | null;

  continuation_probability:
    number | null;

  opportunity_score:
    number | null;

  decision:
    MciDecision;

  reason:
    string;
}>;

/* ============================================================================
 * 2. GOVERNED CONSTANTS
 * ----------------------------------------------------------------------------
 * These thresholds belong to the current deterministic MCI implementation.
 *
 * They are not calibration values and must not be altered by runtime data.
 * A future calibrated policy must be injected by the MCI orchestrator through
 * a dedicated versioned contract rather than read implicitly here.
 * ========================================================================== */

const MINIMUM_CURRENT_PRICE_COUNT =
  3;

const RUPTURE_DETECTED_THRESHOLD =
  60;

const STABILITY_STRONG_THRESHOLD =
  60;

const STABILITY_MODERATE_THRESHOLD =
  45;

const ALLOW_CORRECTION_THRESHOLD =
  60;

const ALLOW_CONVERGENCE_THRESHOLD =
  55;

const ALLOW_STABILITY_THRESHOLD =
  55;

const WATCH_CORRECTION_THRESHOLD =
  40;

const WATCH_OPPORTUNITY_THRESHOLD =
  45;

/* ============================================================================
 * 3. PURE NUMERIC READERS
 * ----------------------------------------------------------------------------
 * These helpers validate values.
 *
 * They never:
 * - clamp invalid producer values
 * - repair invalid values
 * - replace null with zero
 * - synthesize analytical truth
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isScoreValue(
  value: unknown,
): value is number {
  return (
    isFiniteNumber(value) &&
    value >= 0 &&
    value <= 100
  );
}

function readNullableScore(
  value: unknown,
  variableName: string,
): number | null {
  if (value === null) {
    return null;
  }

  if (!isScoreValue(value)) {
    throw new RangeError(
      `MCI_UPSTREAM_SCORE_INVALID: ${variableName} must be null or a finite score between 0 and 100`,
    );
  }

  return value;
}

function roundToTwoDecimals(
  value: number,
): number {
  if (!isFiniteNumber(value)) {
    throw new RangeError(
      "MCI_NUMERIC_RESULT_INVALID: result must be finite",
    );
  }

  return (
    Math.round(value * 100) /
    100
  );
}

function normalizeComputedScore(
  value: number,
): number {
  if (!isFiniteNumber(value)) {
    throw new RangeError(
      "MCI_SCORE_INVALID: computed score must be finite",
    );
  }

  if (
    value < 0 ||
    value > 100
  ) {
    throw new RangeError(
      "MCI_SCORE_OUT_OF_RANGE: computed score must remain between 0 and 100",
    );
  }

  return roundToTwoDecimals(
    value,
  );
}

function average(
  values: readonly number[],
): number | null {
  if (values.length === 0) {
    return null;
  }

  const total =
    values.reduce(
      (sum, value) => {
        if (!isFiniteNumber(value)) {
          throw new RangeError(
            "MCI_AVERAGE_INPUT_INVALID: all values must be finite",
          );
        }

        return sum + value;
      },
      0,
    );

  return total / values.length;
}

function firstNumber(
  values: readonly number[],
): number | null {
  const value =
    values[0];

  return isFiniteNumber(value)
    ? value
    : null;
}

function lastNumber(
  values: readonly number[],
): number | null {
  const value =
    values.at(-1);

  return isFiniteNumber(value)
    ? value
    : null;
}

function computePercentageChange(
  from: number,
  to: number,
): number {
  if (
    !isFiniteNumber(from) ||
    !isFiniteNumber(to) ||
    from <= 0
  ) {
    throw new RangeError(
      "MCI_PERCENTAGE_CHANGE_INPUT_INVALID: prices must be finite and the initial price must be positive",
    );
  }

  return (
    (to - from) /
    from
  ) * 100;
}

/* ============================================================================
 * 4. OBSERVABLE PRICE VALIDATION
 * ----------------------------------------------------------------------------
 * Prices are used only as immediate observable MCI evidence.
 *
 * They are not used to:
 * - classify the canonical RFS pattern
 * - recompute stability
 * - recompute rupture
 * - recompute continuity
 * - reconstruct missing timestamps
 * ========================================================================== */

function validatePrices(
  values: readonly number[],
): readonly number[] | null {
  if (
    !Array.isArray(values) ||
    values.length <
      MINIMUM_CURRENT_PRICE_COUNT
  ) {
    return null;
  }

  for (
    let index = 0;
    index < values.length;
    index += 1
  ) {
    const value =
      values[index];

    if (
      !isFiniteNumber(value) ||
      value <= 0
    ) {
      return null;
    }
  }

  return [...values];
}

function computeCurrentDistanceFromMean(
  prices: readonly number[],
): number | null {
  const meanPrice =
    average(prices);

  const latestPrice =
    lastNumber(prices);

  if (
    meanPrice === null ||
    latestPrice === null ||
    meanPrice <= 0
  ) {
    return null;
  }

  return Math.abs(
    computePercentageChange(
      meanPrice,
      latestPrice,
    ),
  );
}

/* ============================================================================
 * 5. RFS CANONICAL READERS
 * ----------------------------------------------------------------------------
 * These readers preserve the RFS contract identities.
 *
 * No flattened legacy identity is accepted here.
 * ========================================================================== */

type CanonicalRfsEvidence = Readonly<{
  pattern_kind:
    PatternKind;

  pattern_score:
    number | null;

  structural_convergence_score:
    number | null;

  stability_score:
    number | null;

  regime:
    RfsScoreResult["regime"]["regime"];

  rupture_probability:
    number | null;

  rupture_score:
    number | null;

  continuity_probability:
    number | null;

  complete:
    boolean;
}>;

function mapRfsPatternState(
  state: RfsPatternState,
): PatternKind {
  switch (state) {
    case "ASCENDING":
      return "UP_STREAK";

    case "DESCENDING":
      return "DOWN_STREAK";

    case "COMPRESSING":
      return "COMPRESSION";

    case "EXPANDING":
      return "BREAKOUT";

    case "RANGE":
      return "MEAN_REVERTING";

    case "FRAGMENTED":
    case "IRREGULAR":
      return "CHAOTIC";

    case "UNAVAILABLE":
    default:
      return "UNAVAILABLE";
  }
}

function isComputedOrPartial(
  status: RfsComputationStatus,
): boolean {
  return (
    status === "computed" ||
    status === "partial"
  );
}

function readCanonicalRfsEvidence(
  rfs: RfsScoreResult,
): CanonicalRfsEvidence {
  const patternScore =
    readNullableScore(
      rfs.pattern
        .pattern_score,
      "rfs.pattern.pattern_score",
    );

  const structuralConvergenceScore =
    readNullableScore(
      rfs.structural_axes
        .convergence_score,
      "rfs.structural_axes.convergence_score",
    );

  const stabilityScore =
    readNullableScore(
      rfs.stability
        .stability_score,
      "rfs.stability.stability_score",
    );

  const ruptureProbability =
    readNullableScore(
      rfs.rupture
        .rupture_probability,
      "rfs.rupture.rupture_probability",
    );

  const ruptureScore =
    readNullableScore(
      rfs.rupture
        .rupture_score,
      "rfs.rupture.rupture_score",
    );

  const continuityProbability =
    readNullableScore(
      rfs.rupture
        .continuity_probability,
      "rfs.rupture.continuity_probability",
    );

  const patternKind =
    mapRfsPatternState(
      rfs.pattern
        .pattern_state,
    );

  const complete =
    rfs.propagation_status ===
      "full" &&
    isComputedOrPartial(
      rfs.pattern.status,
    ) &&
    isComputedOrPartial(
      rfs.stability.status,
    ) &&
    isComputedOrPartial(
      rfs.regime.status,
    ) &&
    isComputedOrPartial(
      rfs.rupture.status,
    ) &&
    patternKind !==
      "UNAVAILABLE" &&
    patternScore !== null &&
    structuralConvergenceScore !==
      null &&
    stabilityScore !== null &&
    rfs.regime.regime !== null &&
    ruptureProbability !== null &&
    ruptureScore !== null &&
    continuityProbability !== null;

  return {
    pattern_kind:
      patternKind,

    pattern_score:
      patternScore,

    structural_convergence_score:
      structuralConvergenceScore,

    stability_score:
      stabilityScore,

    regime:
      rfs.regime.regime,

    rupture_probability:
      ruptureProbability,

    rupture_score:
      ruptureScore,

    continuity_probability:
      continuityProbability,

    complete,
  };
}

function isRuptureDetected(
  evidence: CanonicalRfsEvidence,
): boolean | null {
  if (
    evidence.rupture_probability ===
      null ||
    evidence.rupture_score ===
      null
  ) {
    return null;
  }

  return (
    evidence.rupture_probability >=
      RUPTURE_DETECTED_THRESHOLD ||
    evidence.rupture_score >=
      RUPTURE_DETECTED_THRESHOLD
  );
}

/* ============================================================================
 * 6. HISTORICAL OCCURRENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Invalid historical occurrences are rejected.
 *
 * They are never:
 * - silently removed
 * - clamped
 * - converted to synthetic neutral occurrences
 * ========================================================================== */

function validateHistoricalOccurrences(
  occurrences:
    readonly PatternOccurrence[],
): readonly PatternOccurrence[] {
  for (
    let index = 0;
    index < occurrences.length;
    index += 1
  ) {
    const occurrence =
      occurrences[index];

    if (
      occurrence === undefined ||
      !isScoreValue(
        occurrence
          .similarity_score,
      ) ||
      typeof occurrence
        .led_to_correction !==
        "boolean" ||
      typeof occurrence
        .led_to_continuation !==
        "boolean"
    ) {
      throw new RangeError(
        `MCI_HISTORICAL_OCCURRENCE_INVALID: historical_patterns[${index}] violates the occurrence contract`,
      );
    }
  }

  return [...occurrences];
}

function selectComparableOccurrences(
  patternKind: PatternKind,
  occurrences:
    readonly PatternOccurrence[],
): readonly PatternOccurrence[] {
  if (
    patternKind ===
    "UNAVAILABLE"
  ) {
    return [];
  }

  return occurrences.filter(
    (occurrence) =>
      occurrence.kind ===
      patternKind,
  );
}

function computeCorrectionRate(
  occurrences:
    readonly PatternOccurrence[],
): number | null {
  if (occurrences.length === 0) {
    return null;
  }

  const correctionCount =
    occurrences.filter(
      (occurrence) =>
        occurrence
          .led_to_correction,
    ).length;

  return normalizeComputedScore(
    (
      correctionCount /
      occurrences.length
    ) * 100,
  );
}

function computeContinuationRate(
  occurrences:
    readonly PatternOccurrence[],
): number | null {
  if (occurrences.length === 0) {
    return null;
  }

  const continuationCount =
    occurrences.filter(
      (occurrence) =>
        occurrence
          .led_to_continuation,
    ).length;

  return normalizeComputedScore(
    (
      continuationCount /
      occurrences.length
    ) * 100,
  );
}

function computeHistoricalSimilarity(
  occurrences:
    readonly PatternOccurrence[],
): number | null {
  if (occurrences.length === 0) {
    return null;
  }

  const similarityAverage =
    average(
      occurrences.map(
        (occurrence) =>
          occurrence
            .similarity_score,
      ),
    );

  return similarityAverage === null
    ? null
    : normalizeComputedScore(
        similarityAverage,
      );
}

/* ============================================================================
 * 7. WEIGHTED AGGREGATION
 * ----------------------------------------------------------------------------
 * Missing optional evidence is excluded and remaining weights are normalized.
 *
 * Missing mandatory evidence blocks computation.
 *
 * This is not an unavailable-to-neutral substitution.
 * ========================================================================== */

type WeightedEvidence = Readonly<{
  value: number | null;
  weight: number;
  required: boolean;
}>;

function computeWeightedScore(
  evidence:
    readonly WeightedEvidence[],
): number | null {
  const requiredUnavailable =
    evidence.some(
      (item) =>
        item.required &&
        item.value === null,
    );

  if (requiredUnavailable) {
    return null;
  }

  const availableEvidence =
    evidence.filter(
      (
        item,
      ): item is Readonly<{
        value: number;
        weight: number;
        required: boolean;
      }> =>
        item.value !== null,
    );

  if (
    availableEvidence.length === 0
  ) {
    return null;
  }

  const totalWeight =
    availableEvidence.reduce(
      (total, item) =>
        total + item.weight,
      0,
    );

  if (
    !isFiniteNumber(totalWeight) ||
    totalWeight <= 0
  ) {
    throw new RangeError(
      "MCI_WEIGHT_CONFIGURATION_INVALID: total available weight must be positive",
    );
  }

  const weightedTotal =
    availableEvidence.reduce(
      (total, item) =>
        total +
        item.value *
          item.weight,
      0,
    );

  return normalizeComputedScore(
    weightedTotal /
      totalWeight,
  );
}

/* ============================================================================
 * 8. CONVERGENCE
 * ----------------------------------------------------------------------------
 * MCI convergence aggregates upstream and observable evidence.
 *
 * It does not replace RFS structural convergence.
 * ========================================================================== */

function computeMciConvergenceScore(
  input: Readonly<{
    evidence:
      CanonicalRfsEvidence;

    current_distance_pct:
      number | null;
  }>,
): number | null {
  const ruptureDetected =
    isRuptureDetected(
      input.evidence,
    );

  if (
    ruptureDetected === null ||
    input.evidence
      .structural_convergence_score ===
      null ||
    input.evidence
      .stability_score === null ||
    input.evidence.regime ===
      null ||
    input.current_distance_pct ===
      null
  ) {
    return null;
  }

  const ruptureEvidenceScore =
    ruptureDetected
      ? 100
      : 0;

  const regimeEvidenceScore =
    input.evidence.regime ===
      "STABLE"
      ? 100
      : input.evidence.regime ===
          "TRANSITION"
        ? 60
        : 20;

  const distanceEvidenceScore =
    input.current_distance_pct <= 4
      ? 100
      : input.current_distance_pct <=
          8
        ? 50
        : 0;

  const patternIntegrityScore =
    input.evidence.pattern_kind ===
      "CHAOTIC"
      ? 20
      : input.evidence
            .pattern_kind ===
          "UNAVAILABLE"
        ? 0
        : 100;

  return computeWeightedScore([
    {
      value:
        input.evidence
          .structural_convergence_score,

      weight:
        0.3,

      required:
        true,
    },
    {
      value:
        ruptureEvidenceScore,

      weight:
        0.2,

      required:
        true,
    },
    {
      value:
        input.evidence
          .stability_score,

      weight:
        0.18,

      required:
        true,
    },
    {
      value:
        regimeEvidenceScore,

      weight:
        0.14,

      required:
        true,
    },
    {
      value:
        patternIntegrityScore,

      weight:
        0.08,

      required:
        true,
    },
    {
      value:
        distanceEvidenceScore,

      weight:
        0.1,

      required:
        true,
    },
  ]);
}

/* ============================================================================
 * 9. PROBABILITY AND OPPORTUNITY AGGREGATION
 * ========================================================================== */

function computeCorrectionProbability(
  input: Readonly<{
    historical_correction_rate:
      number | null;

    convergence_score:
      number | null;

    rupture_probability:
      number | null;

    historical_similarity:
      number | null;
  }>,
): number | null {
  return computeWeightedScore([
    {
      value:
        input
          .historical_correction_rate,

      weight:
        0.45,

      required:
        false,
    },
    {
      value:
        input
          .convergence_score,

      weight:
        0.3,

      required:
        true,
    },
    {
      value:
        input
          .rupture_probability,

      weight:
        0.15,

      required:
        true,
    },
    {
      value:
        input
          .historical_similarity,

      weight:
        0.1,

      required:
        false,
    },
  ]);
}

function computeContinuationProbability(
  input: Readonly<{
    historical_continuation_rate:
      number | null;

    rfs_continuity_probability:
      number | null;

    current_pattern_score:
      number | null;
  }>,
): number | null {
  return computeWeightedScore([
    {
      value:
        input
          .historical_continuation_rate,

      weight:
        0.45,

      required:
        false,
    },
    {
      value:
        input
          .rfs_continuity_probability,

      weight:
        0.35,

      required:
        true,
    },
    {
      value:
        input
          .current_pattern_score,

      weight:
        0.2,

      required:
        true,
    },
  ]);
}

function computeOpportunityScore(
  input: Readonly<{
    correction_probability:
      number | null;

    convergence_score:
      number | null;

    stability_score:
      number | null;
  }>,
): number | null {
  return computeWeightedScore([
    {
      value:
        input
          .correction_probability,

      weight:
        0.55,

      required:
        true,
    },
    {
      value:
        input
          .convergence_score,

      weight:
        0.25,

      required:
        true,
    },
    {
      value:
        input
          .stability_score,

      weight:
        0.2,

      required:
        true,
    },
  ]);
}

/* ============================================================================
 * 10. DECISION RESOLUTION
 * ----------------------------------------------------------------------------
 * WATCH is the defensive response to incomplete analytical truth.
 *
 * BLOCK is reserved for complete observed evidence that fails the opportunity
 * conditions or demonstrates an adverse structural configuration.
 * ========================================================================== */

function resolveDecision(
  input: Readonly<{
    evidence:
      CanonicalRfsEvidence;

    correction_probability:
      number | null;

    convergence_score:
      number | null;

    opportunity_score:
      number | null;
  }>,
): MciDecision {
  const ruptureDetected =
    isRuptureDetected(
      input.evidence,
    );

  if (
    !input.evidence.complete ||
    ruptureDetected === null ||
    input.correction_probability ===
      null ||
    input.convergence_score ===
      null ||
    input.opportunity_score ===
      null ||
    input.evidence
      .stability_score === null
  ) {
    return "WATCH";
  }

  if (
    ruptureDetected &&
    input.correction_probability >=
      ALLOW_CORRECTION_THRESHOLD &&
    input.convergence_score >=
      ALLOW_CONVERGENCE_THRESHOLD &&
    input.evidence
      .stability_score >=
      ALLOW_STABILITY_THRESHOLD
  ) {
    return "ALLOW";
  }

  if (
    (
      ruptureDetected &&
      input.correction_probability >=
        WATCH_CORRECTION_THRESHOLD
    ) ||
    input.opportunity_score >=
      WATCH_OPPORTUNITY_THRESHOLD
  ) {
    return "WATCH";
  }

  return "BLOCK";
}

/* ============================================================================
 * 11. RESULT FACTORIES
 * ========================================================================== */

function buildUnavailableResult(
  input: Readonly<{
    pattern_kind:
      PatternKind;

    pattern_occurrence_count:
      number;

    comparable_occurrence_count:
      number;

    pattern_similarity_score:
      number | null;

    reason:
      string;
  }>,
): MciResult {
  return {
    status:
      "unavailable",

    pattern_kind:
      input.pattern_kind,

    pattern_occurrence_count:
      input
        .pattern_occurrence_count,

    comparable_occurrence_count:
      input
        .comparable_occurrence_count,

    pattern_similarity_score:
      input
        .pattern_similarity_score,

    convergence_score:
      null,

    correction_probability:
      null,

    continuation_probability:
      null,

    opportunity_score:
      null,

    decision:
      "WATCH",

    reason:
      input.reason,
  };
}

function resolveResultStatus(
  input: Readonly<{
    evidence_complete:
      boolean;

    comparable_occurrence_count:
      number;

    convergence_score:
      number | null;

    correction_probability:
      number | null;

    continuation_probability:
      number | null;

    opportunity_score:
      number | null;
  }>,
): MciComputationStatus {
  if (
    input.convergence_score ===
      null ||
    input.correction_probability ===
      null ||
    input.continuation_probability ===
      null ||
    input.opportunity_score ===
      null
  ) {
    return "unavailable";
  }

  if (
    !input.evidence_complete ||
    input.comparable_occurrence_count ===
      0
  ) {
    return "partial";
  }

  return "computed";
}

/* ============================================================================
 * 12. PUBLIC EXECUTION
 * ========================================================================== */

export function runMCI(
  input: MciInput,
): MciResult {
  const prices =
    validatePrices(
      input.prices,
    );

  const historicalOccurrences =
    validateHistoricalOccurrences(
      input.historical_patterns ??
        [],
    );

  const rfsEvidence =
    readCanonicalRfsEvidence(
      input.rfs,
    );

  const comparableOccurrences =
    selectComparableOccurrences(
      rfsEvidence.pattern_kind,
      historicalOccurrences,
    );

  const patternOccurrenceCount =
    historicalOccurrences.length;

  const comparableOccurrenceCount =
    comparableOccurrences.length;

  const historicalSimilarity =
    computeHistoricalSimilarity(
      comparableOccurrences,
    );

  if (prices === null) {
    return buildUnavailableResult({
      pattern_kind:
        rfsEvidence.pattern_kind,

      pattern_occurrence_count:
        patternOccurrenceCount,

      comparable_occurrence_count:
        comparableOccurrenceCount,

      pattern_similarity_score:
        historicalSimilarity,

      reason:
        "mci_current_prices_unavailable",
    });
  }

  if (
    rfsEvidence.pattern_kind ===
      "UNAVAILABLE"
  ) {
    return buildUnavailableResult({
      pattern_kind:
        "UNAVAILABLE",

      pattern_occurrence_count:
        patternOccurrenceCount,

      comparable_occurrence_count:
        0,

      pattern_similarity_score:
        null,

      reason:
        "mci_rfs_pattern_unavailable",
    });
  }

  const currentDistancePct =
    computeCurrentDistanceFromMean(
      prices,
    );

  const convergenceScore =
    computeMciConvergenceScore({
      evidence:
        rfsEvidence,

      current_distance_pct:
        currentDistancePct,
    });

  const historicalCorrectionRate =
    computeCorrectionRate(
      comparableOccurrences,
    );

  const historicalContinuationRate =
    computeContinuationRate(
      comparableOccurrences,
    );

  const correctionProbability =
    computeCorrectionProbability({
      historical_correction_rate:
        historicalCorrectionRate,

      convergence_score:
        convergenceScore,

      rupture_probability:
        rfsEvidence
          .rupture_probability,

      historical_similarity:
        historicalSimilarity,
    });

  const continuationProbability =
    computeContinuationProbability({
      historical_continuation_rate:
        historicalContinuationRate,

      rfs_continuity_probability:
        rfsEvidence
          .continuity_probability,

      current_pattern_score:
        rfsEvidence
          .pattern_score,
    });

  const opportunityScore =
    computeOpportunityScore({
      correction_probability:
        correctionProbability,

      convergence_score:
        convergenceScore,

      stability_score:
        rfsEvidence
          .stability_score,
    });

  const decision =
    resolveDecision({
      evidence:
        rfsEvidence,

      correction_probability:
        correctionProbability,

      convergence_score:
        convergenceScore,

      opportunity_score:
        opportunityScore,
    });

  const status =
    resolveResultStatus({
      evidence_complete:
        rfsEvidence.complete,

      comparable_occurrence_count:
        comparableOccurrenceCount,

      convergence_score:
        convergenceScore,

      correction_probability:
        correctionProbability,

      continuation_probability:
        continuationProbability,

      opportunity_score:
        opportunityScore,
    });

  return {
    status,

    pattern_kind:
      rfsEvidence.pattern_kind,

    pattern_occurrence_count:
      patternOccurrenceCount,

    comparable_occurrence_count:
      comparableOccurrenceCount,

    /*
     * This legacy identity now represents the similarity of comparable
     * historical occurrences.
     *
     * The canonical current pattern evidence remains:
     * rfs.pattern.pattern_score.
     */
    pattern_similarity_score:
      historicalSimilarity,

    convergence_score:
      convergenceScore,

    correction_probability:
      correctionProbability,

    continuation_probability:
      continuationProbability,

    opportunity_score:
      opportunityScore,

    decision,

    reason:
      [
        `status=${status}`,
        `pattern=${rfsEvidence.pattern_kind}`,
        `occurrences=${comparableOccurrenceCount}`,
        `convergence=${convergenceScore ?? "unavailable"}`,
        `correction=${correctionProbability ?? "unavailable"}`,
        `continuation=${continuationProbability ?? "unavailable"}`,
        `opportunity=${opportunityScore ?? "unavailable"}`,
        `decision=${decision}`,
      ].join(" "),
  };
}
