/**
 * FILE
 * - lib/xyvala/rfs/validation/rfs-score-contract-validator.ts
 *
 * TITLE
 * - Xyvala canonical RFS score-contract validators
 *
 * ROLE
 * - validate already-produced canonical RFS contract values
 * - centralize reusable RFS-owned validation semantics
 * - prevent downstream layers from maintaining competing validators
 * - preserve exact Structural Transition and Rupture Evolution identities
 *
 * GOVERNANCE POSITION
 * - subordinate to the Xyvala Master Protocol
 * - subordinate to the Xyvala Market Protocol
 * - subordinate to the canonical RFS contract
 * - consistent with the Market VLR
 * - enforcement / validation only
 * - never a second source of analytical truth
 *
 * CLASSIFICATION
 * - INTERNAL
 * - OBSERVE / VALIDATE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-PUBLIC
 * - NON-PRODUCER
 *
 * CANONICAL SOURCE OF TRUTH
 * - lib/xyvala/rfs/contracts/rfs-score-contract.ts
 *
 * CURRENT VALIDATION SCOPE
 * - RfsRuptureEvolutionState
 * - nullable RfsRuptureEvolutionState transport
 * - RfsStructuralTransitionReading
 * - nullable RfsStructuralTransitionReading transport
 *
 * OWNERSHIP
 * - RFS owns every semantic validated by this module
 * - this module validates RFS truth; it does not produce RFS truth
 * - validation never transfers ownership to AAS, MCI, Snapshot or any consumer
 *
 * PROHIBITIONS
 * - no RFS computation
 * - no Structural Transition computation
 * - no Rupture Evolution computation
 * - no score reconstruction
 * - no state reconstruction
 * - no fallback
 * - no clamping
 * - no coercion
 * - no null -> zero conversion
 * - no UNKNOWN -> NONE conversion
 * - no unavailable -> neutral conversion
 * - no canonical -> legacy translation
 * - no legacy -> canonical reconstruction
 * - no local clock access
 * - no persistence
 * - no API or UI dependency
 *
 * FIRST DIVERGENCE
 * - malformed canonical RFS truth must be rejected at the validation boundary
 * - this module must not repair a value for downstream compatibility
 */

import {
  isRfsStructuralTransitionEvolution,
  isRfsStructuralTransitionKind,
  isRfsStructuralTransitionState,
  type RfsAvailabilityReason,
  type RfsComputationStatus,
  type RfsRuptureEvolutionState,
  type RfsStructuralTransitionReading,
} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

const RFS_STRUCTURAL_TRANSITION_READING_KEYS =
  Object.freeze([
    "structural_transition_kind",
    "structural_transition_state",
    "structural_transition_evolution",
    "structural_transition_occurrence_score",
    "structural_transition_frequency_score",
    "structural_transition_convergence_score",
    "structural_transition_duration_score",
    "structural_transition_growth_score",
    "structural_transition_status",
    "structural_transition_availability_reason",
    "structural_transition_source_anchor_timestamp",
  ] as const);

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  source: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys =
    Object.keys(source);

  if (
    actualKeys.length !==
      expectedKeys.length
  ) {
    return false;
  }

  return expectedKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(
        source,
        key,
      ),
  );
}

function isNullableScore(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 100
    )
  );
}

function isNullableSourceTimestamp(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
    )
  );
}

function isRfsStructuralTransitionStatus(
  value: unknown,
): value is RfsComputationStatus {
  return (
    value === "computed" ||
    value === "partial" ||
    value === "insufficient_data" ||
    value === "unavailable" ||
    value === "invalid"
  );
}

function isRfsAvailabilityReason(
  value: unknown,
): value is RfsAvailabilityReason {
  return (
    value === "available" ||
    value === "input_missing" ||
    value === "input_invalid" ||
    value === "prices_insufficient" ||
    value === "timestamps_missing" ||
    value === "timestamps_invalid" ||
    value === "timestamps_unordered" ||
    value === "series_length_mismatch" ||
    value === "historical_baseline_missing" ||
    value === "historical_comparison_insufficient" ||
    value === "temporal_window_insufficient" ||
    value === "structural_transition_unavailable" ||
    value === "producer_failure" ||
    value === "contract_violation"
  );
}

export function isRfsRuptureEvolutionState(
  value: unknown,
): value is RfsRuptureEvolutionState {
  return (
    value === "EXPLOSIVE" ||
    value === "PERSISTENT" ||
    value === "INCREASING" ||
    value === "DECREASING" ||
    value === "STABLE" ||
    value === "INSUFFICIENT_DATA" ||
    value === "UNAVAILABLE"
  );
}

export function isNullableRfsRuptureEvolutionState(
  value: unknown,
): value is RfsRuptureEvolutionState | null {
  return (
    value === null ||
    isRfsRuptureEvolutionState(value)
  );
}

export function isRfsStructuralTransitionReading(
  value: unknown,
): value is RfsStructuralTransitionReading {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(
      value,
      RFS_STRUCTURAL_TRANSITION_READING_KEYS,
    )
  ) {
    return false;
  }

  const scores = [
    value.structural_transition_occurrence_score,
    value.structural_transition_frequency_score,
    value.structural_transition_convergence_score,
    value.structural_transition_duration_score,
    value.structural_transition_growth_score,
  ];

  if (
    !isRfsStructuralTransitionKind(
      value.structural_transition_kind,
    ) ||
    !isRfsStructuralTransitionState(
      value.structural_transition_state,
    ) ||
    !isRfsStructuralTransitionEvolution(
      value.structural_transition_evolution,
    ) ||
    !scores.every(
      isNullableScore,
    ) ||
    !isRfsStructuralTransitionStatus(
      value.structural_transition_status,
    ) ||
    !isRfsAvailabilityReason(
      value.structural_transition_availability_reason,
    ) ||
    !isNullableSourceTimestamp(
      value.structural_transition_source_anchor_timestamp,
    )
  ) {
    return false;
  }

  if (
    value.structural_transition_status ===
      "unavailable" ||
    value.structural_transition_status ===
      "invalid"
  ) {
    return (
      value.structural_transition_kind ===
        "UNKNOWN" &&
      value.structural_transition_state ===
        "UNKNOWN" &&
      value.structural_transition_evolution ===
        "UNKNOWN" &&
      scores.every(
        (score) =>
          score === null,
      )
    );
  }

  if (
    value.structural_transition_status ===
      "computed"
  ) {
    return (
      value.structural_transition_kind !==
        "UNKNOWN" &&
      value.structural_transition_state !==
        "UNKNOWN" &&
      value.structural_transition_evolution !==
        "UNKNOWN"
    );
  }

  return true;
}

export function isNullableRfsStructuralTransitionReading(
  value: unknown,
): value is RfsStructuralTransitionReading | null {
  return (
    value === null ||
    isRfsStructuralTransitionReading(value)
  );
}
