/* ============================================================================
 * FILE: lib/xyvala/rfs/validation/rfs-impulse-contract-validator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala RFS Impulse contract validator
 *
 * ROLE
 * - validate runtime values against the canonical RFS Impulse contract
 * - enforce Impulse Layer availability and completeness invariants
 * - detect undefined values, invalid scores and contradictory statuses
 * - produce deterministic contract-validation results
 * - support Contract Before Runtime, Boundary Protection and First Divergence
 *
 * CLASSIFICATION
 * - COMPUTE
 * - VALIDATE
 * - pure deterministic contract validation
 *
 * PARENTS
 * - lib/xyvala/rfs/contracts/rfs-impulse-contract.ts
 *
 * INPUTS
 * - unknown runtime value expected to implement RfsImpulseContract
 *
 * OUTPUTS
 * - deterministic RfsImpulseContractValidationResult
 * - explicit contract violations
 * - explicit non-blocking warnings
 *
 * DIRECTIVES
 * - no analytical computation
 * - no Impulse Layer computation
 * - no score reconstruction
 * - no status inference
 * - no semantic alias resolution
 * - no cross-layer fallback
 * - no default analytical values
 * - no mutation
 * - no persistence
 * - no telemetry
 * - no logging
 * - no API logic
 * - no UI logic
 * - no silent repair
 *
 * INVARIANTS
 * - the Impulse Layer remains the unique source of impulse truth
 * - validation observes values but never changes them
 * - undefined is never an authorized business value
 * - null represents explicit unavailability
 * - computed requires a complete canonical impulse contract
 * - unavailable and insufficient_data cannot carry stale analytical values
 * - partial must represent an explicitly incomplete analytical contract
 * - every score must remain finite and inside the canonical score range
 * - identical inputs produce identical validation results
 *
 * FIRST DIVERGENCE
 * - invalid root value
 *   => RICV-001
 *
 * - missing canonical property
 *   => RICV-002
 *
 * - undefined canonical property
 *   => RICV-003
 *
 * - invalid status
 *   => RICV-004
 *
 * - invalid score type
 *   => RICV-005
 *
 * - score outside canonical range
 *   => RICV-006
 *
 * - invalid categorical value
 *   => RICV-007
 *
 * - incomplete computed contract
 *   => RICV-008
 *
 * - stale value in unavailable contract
 *   => RICV-009
 *
 * - incoherent partial contract
 *   => RICV-010
 *
 * SENSITIVE ZONES
 * - impulse status semantics
 * - null / undefined distinction
 * - score range validation
 * - computed completeness
 * - degraded-state consistency
 * ========================================================================== */

import type {
  RfsImpulseContract,
} from "@/lib/xyvala/rfs/contracts/rfs-impulse-contract";

/* ============================================================================
 * 1. VALIDATION TYPES
 * ========================================================================== */

export type RfsImpulseContractValidationStatus =
  | "VALID"
  | "INVALID";

export type RfsImpulseContractValidationResult = {
  ok: boolean;

  status:
    RfsImpulseContractValidationStatus;

  violation_count: number;
  warning_count: number;

  violations: string[];
  warnings: string[];
};

export type RfsImpulseContractAssertionError =
  Error & {
    validation_result?:
      RfsImpulseContractValidationResult;
  };

/* ============================================================================
 * 2. CANONICAL VALIDATION CONSTANTS
 * ----------------------------------------------------------------------------
 * These constants define contract-validation boundaries only.
 *
 * They do not define Impulse Layer analytical policies or calculation
 * thresholds.
 * ========================================================================== */

const SCORE_MIN = 0;
const SCORE_MAX = 100;

const IMPULSE_STATUSES =
  Object.freeze([
    "computed",
    "partial",
    "insufficient_data",
    "unavailable",
  ] as const);

type GovernedImpulseStatus =
  (typeof IMPULSE_STATUSES)[number];

const SCORE_FIELDS =
  Object.freeze([
    "impulse_pressure_score",
    "impulse_acceleration_score",
    "impulse_alignment_score",
    "impulse_instability_score",
    "impulse_saturation_score",
    "impulse_exhaustion_score",
  ] as const);

type ImpulseScoreField =
  (typeof SCORE_FIELDS)[number];

const CATEGORICAL_FIELDS =
  Object.freeze([
    "impulse_directional_bias",
    "impulse_transition_state",
  ] as const);

type ImpulseCategoricalField =
  (typeof CATEGORICAL_FIELDS)[number];

const REQUIRED_FIELDS =
  Object.freeze([
    ...SCORE_FIELDS,
    ...CATEGORICAL_FIELDS,
    "impulse_status",
  ] as const);

type ImpulseRequiredField =
  (typeof REQUIRED_FIELDS)[number];

/* ============================================================================
 * 3. SAFE PRIMITIVE HELPERS
 * ========================================================================== */

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOwnProperty(
  value: Record<string, unknown>,
  propertyName: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    propertyName,
  );
}

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isCanonicalScore(
  value: unknown,
): value is number {
  return (
    isFiniteNumber(value) &&
    value >= SCORE_MIN &&
    value <= SCORE_MAX
  );
}

function normalizeNonEmptyString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function compareDeterministicStrings(
  left: string,
  right: string,
): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function uniqueSortedStrings(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values.filter(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0,
      ),
    ),
  ].sort(
    compareDeterministicStrings,
  );
}

function isGovernedImpulseStatus(
  value: unknown,
): value is GovernedImpulseStatus {
  return (
    typeof value === "string" &&
    (
      IMPULSE_STATUSES as
        readonly string[]
    ).includes(value)
  );
}

/* ============================================================================
 * 4. FIELD AVAILABILITY HELPERS
 * ========================================================================== */

function isAvailableScore(
  value: unknown,
): value is number {
  return isFiniteNumber(value);
}

function isAvailableCategoricalValue(
  value: unknown,
): value is string {
  return (
    normalizeNonEmptyString(
      value,
    ) !== null
  );
}

function isExplicitlyUnavailable(
  value: unknown,
): value is null {
  return value === null;
}

function countAvailableScores(
  contract:
    Record<string, unknown>,
): number {
  let count = 0;

  for (
    const fieldName of
    SCORE_FIELDS
  ) {
    if (
      isAvailableScore(
        contract[fieldName],
      )
    ) {
      count += 1;
    }
  }

  return count;
}

function countAvailableCategoricalValues(
  contract:
    Record<string, unknown>,
): number {
  let count = 0;

  for (
    const fieldName of
    CATEGORICAL_FIELDS
  ) {
    if (
      isAvailableCategoricalValue(
        contract[fieldName],
      )
    ) {
      count += 1;
    }
  }

  return count;
}

function countAvailableAnalyticalValues(
  contract:
    Record<string, unknown>,
): number {
  return (
    countAvailableScores(
      contract,
    ) +
    countAvailableCategoricalValues(
      contract,
    )
  );
}

function countUnavailableAnalyticalValues(
  contract:
    Record<string, unknown>,
): number {
  let count = 0;

  for (
    const fieldName of
    SCORE_FIELDS
  ) {
    if (
      isExplicitlyUnavailable(
        contract[fieldName],
      )
    ) {
      count += 1;
    }
  }

  for (
    const fieldName of
    CATEGORICAL_FIELDS
  ) {
    if (
      isExplicitlyUnavailable(
        contract[fieldName],
      )
    ) {
      count += 1;
    }
  }

  return count;
}

/* ============================================================================
 * 5. ROOT CONTRACT VALIDATION
 * ========================================================================== */

function validateRootContract(
  value: unknown,
  violations: string[],
): value is Record<string, unknown> {
  if (
    !isRecord(value)
  ) {
    violations.push(
      "RICV-001:invalid_impulse_contract_root",
    );

    return false;
  }

  return true;
}

/* ============================================================================
 * 6. REQUIRED PROPERTY VALIDATION
 * ----------------------------------------------------------------------------
 * A canonical field must:
 * - exist explicitly
 * - never contain undefined
 *
 * Absence and undefined are distinct diagnostics because they identify
 * different propagation failures.
 * ========================================================================== */

function validateRequiredProperties(
  contract:
    Record<string, unknown>,
  violations: string[],
): void {
  for (
    const fieldName of
    REQUIRED_FIELDS
  ) {
    if (
      !hasOwnProperty(
        contract,
        fieldName,
      )
    ) {
      violations.push(
        [
          "RICV-002",
          "missing_canonical_property",
          fieldName,
        ].join(":"),
      );

      continue;
    }

    if (
      contract[fieldName] ===
      undefined
    ) {
      violations.push(
        [
          "RICV-003",
          "undefined_canonical_property",
          fieldName,
        ].join(":"),
      );
    }
  }
}

/* ============================================================================
 * 7. STATUS VALIDATION
 * ========================================================================== */

function validateImpulseStatus(
  contract:
    Record<string, unknown>,
  violations: string[],
): GovernedImpulseStatus | null {
  const status =
    contract.impulse_status;

  if (
    !isGovernedImpulseStatus(
      status,
    )
  ) {
    violations.push(
      [
        "RICV-004",
        "invalid_impulse_status",
        normalizeNonEmptyString(
          status,
        ) ?? "non_string",
      ].join(":"),
    );

    return null;
  }

  return status;
}

/* ============================================================================
 * 8. SCORE FIELD VALIDATION
 * ----------------------------------------------------------------------------
 * Scores may be:
 * - a finite canonical score
 * - null when explicitly unavailable
 *
 * Scores may never be:
 * - undefined
 * - NaN
 * - Infinity
 * - strings
 * - booleans
 * - objects
 * - values outside 0..100
 * ========================================================================== */

function validateScoreFields(
  contract:
    Record<string, unknown>,
  violations: string[],
): void {
  for (
    const fieldName of
    SCORE_FIELDS
  ) {
    const value =
      contract[fieldName];

    if (
      value === undefined
    ) {
      continue;
    }

    if (
      value === null
    ) {
      continue;
    }

    if (
      !isFiniteNumber(value)
    ) {
      violations.push(
        [
          "RICV-005",
          "invalid_impulse_score_type",
          fieldName,
        ].join(":"),
      );

      continue;
    }

    if (
      !isCanonicalScore(value)
    ) {
      violations.push(
        [
          "RICV-006",
          "impulse_score_out_of_range",
          fieldName,
          String(value),
        ].join(":"),
      );
    }
  }
}

/* ============================================================================
 * 9. CATEGORICAL FIELD VALIDATION
 * ----------------------------------------------------------------------------
 * Exact directional-bias and transition-state vocabularies remain owned by
 * the canonical Impulse contract.
 *
 * This validator verifies their transport shape:
 * - non-empty string when available
 * - null when explicitly unavailable
 *
 * It does not create or infer categorical analytical truth.
 * ========================================================================== */

function validateCategoricalFields(
  contract:
    Record<string, unknown>,
  violations: string[],
): void {
  for (
    const fieldName of
    CATEGORICAL_FIELDS
  ) {
    const value =
      contract[fieldName];

    if (
      value === undefined
    ) {
      continue;
    }

    if (
      value === null
    ) {
      continue;
    }

    if (
      normalizeNonEmptyString(
        value,
      ) === null
    ) {
      violations.push(
        [
          "RICV-007",
          "invalid_impulse_categorical_value",
          fieldName,
        ].join(":"),
      );
    }
  }
}

/* ============================================================================
 * 10. COMPUTED STATUS CONSISTENCY
 * ----------------------------------------------------------------------------
 * A computed contract must be complete.
 *
 * No missing, undefined or null analytical value is accepted.
 * ========================================================================== */

function validateComputedConsistency(
  contract:
    Record<string, unknown>,
  violations: string[],
): void {
  for (
    const fieldName of
    SCORE_FIELDS
  ) {
    if (
      !isCanonicalScore(
        contract[fieldName],
      )
    ) {
      violations.push(
        [
          "RICV-008",
          "computed_impulse_score_unavailable",
          fieldName,
        ].join(":"),
      );
    }
  }

  for (
    const fieldName of
    CATEGORICAL_FIELDS
  ) {
    if (
      !isAvailableCategoricalValue(
        contract[fieldName],
      )
    ) {
      violations.push(
        [
          "RICV-008",
          "computed_impulse_category_unavailable",
          fieldName,
        ].join(":"),
      );
    }
  }
}

/* ============================================================================
 * 11. UNAVAILABLE STATUS CONSISTENCY
 * ----------------------------------------------------------------------------
 * unavailable and insufficient_data must not transport stale analytical
 * values.
 *
 * Every analytical field must be explicitly null.
 * ========================================================================== */

function validateUnavailableConsistency(
  contract:
    Record<string, unknown>,
  status:
    Extract<
      GovernedImpulseStatus,
      | "unavailable"
      | "insufficient_data"
    >,
  violations: string[],
): void {
  for (
    const fieldName of
    SCORE_FIELDS
  ) {
    const value =
      contract[fieldName];

    if (
      value !== null
    ) {
      violations.push(
        [
          "RICV-009",
          "analytical_value_present_in_unavailable_contract",
          status,
          fieldName,
        ].join(":"),
      );
    }
  }

  for (
    const fieldName of
    CATEGORICAL_FIELDS
  ) {
    const value =
      contract[fieldName];

    if (
      value !== null
    ) {
      violations.push(
        [
          "RICV-009",
          "analytical_value_present_in_unavailable_contract",
          status,
          fieldName,
        ].join(":"),
      );
    }
  }
}

/* ============================================================================
 * 12. PARTIAL STATUS CONSISTENCY
 * ----------------------------------------------------------------------------
 * A partial contract must contain:
 * - at least one valid available analytical value
 * - at least one explicitly unavailable analytical value
 *
 * A fully complete contract must use computed.
 * A fully unavailable contract must use unavailable or insufficient_data.
 * ========================================================================== */

function validatePartialConsistency(
  contract:
    Record<string, unknown>,
  violations: string[],
): void {
  const availableCount =
    countAvailableAnalyticalValues(
      contract,
    );

  const unavailableCount =
    countUnavailableAnalyticalValues(
      contract,
    );

  if (
    availableCount === 0
  ) {
    violations.push(
      "RICV-010:partial_contract_has_no_available_analytical_value",
    );
  }

  if (
    unavailableCount === 0
  ) {
    violations.push(
      "RICV-010:partial_contract_is_fully_available",
    );
  }
}

/* ============================================================================
 * 13. NON-BLOCKING CONTRACT WARNINGS
 * ----------------------------------------------------------------------------
 * Warnings describe potentially weak but contractually valid states.
 *
 * They never alter validation truth.
 * ========================================================================== */

function buildContractWarnings(
  contract:
    Record<string, unknown>,
  status:
    GovernedImpulseStatus,
): string[] {
  const warnings: string[] = [];

  if (
    status === "partial"
  ) {
    const availableCount =
      countAvailableAnalyticalValues(
        contract,
      );

    const unavailableCount =
      countUnavailableAnalyticalValues(
        contract,
      );

    warnings.push(
      [
        "RICV-WARN",
        "partial_impulse_contract",
        `available_${availableCount}`,
        `unavailable_${unavailableCount}`,
      ].join(":"),
    );
  }

  if (
    status === "insufficient_data"
  ) {
    warnings.push(
      "RICV-WARN:impulse_contract_insufficient_data",
    );
  }

  if (
    status === "unavailable"
  ) {
    warnings.push(
      "RICV-WARN:impulse_contract_unavailable",
    );
  }

  return warnings;
}

/* ============================================================================
 * 14. CANONICAL VALIDATION EXECUTION
 * ----------------------------------------------------------------------------
 * CLASSIFICATION
 * - COMPUTE / VALIDATE
 *
 * This function:
 * - reads the provided value
 * - validates its contract
 * - returns deterministic diagnostics
 *
 * This function never:
 * - mutates the input
 * - fills missing properties
 * - replaces invalid values
 * - infers status
 * - computes impulse truth
 * ========================================================================== */

export function validateRfsImpulseContract(
  value: unknown,
): RfsImpulseContractValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (
    !validateRootContract(
      value,
      violations,
    )
  ) {
    const normalizedViolations =
      uniqueSortedStrings(
        violations,
      );

    return {
      ok: false,

      status:
        "INVALID",

      violation_count:
        normalizedViolations.length,

      warning_count:
        0,

      violations:
        normalizedViolations,

      warnings: [],
    };
  }

  validateRequiredProperties(
    value,
    violations,
  );

  const status =
    validateImpulseStatus(
      value,
      violations,
    );

  validateScoreFields(
    value,
    violations,
  );

  validateCategoricalFields(
    value,
    violations,
  );

  if (
    status === "computed"
  ) {
    validateComputedConsistency(
      value,
      violations,
    );
  }

  if (
    status === "partial"
  ) {
    validatePartialConsistency(
      value,
      violations,
    );
  }

  if (
    status === "insufficient_data" ||
    status === "unavailable"
  ) {
    validateUnavailableConsistency(
      value,
      status,
      violations,
    );
  }

  if (
    status !== null
  ) {
    warnings.push(
      ...buildContractWarnings(
        value,
        status,
      ),
    );
  }

  const normalizedViolations =
    uniqueSortedStrings(
      violations,
    );

  const normalizedWarnings =
    uniqueSortedStrings(
      warnings,
    );

  const ok =
    normalizedViolations.length ===
    0;

  return {
    ok,

    status:
      ok
        ? "VALID"
        : "INVALID",

    violation_count:
      normalizedViolations.length,

    warning_count:
      normalizedWarnings.length,

    violations:
      normalizedViolations,

    warnings:
      normalizedWarnings,
  };
}

/* ============================================================================
 * 15. CONTRACT TYPE GUARD
 * ----------------------------------------------------------------------------
 * This helper delegates exclusively to the canonical validator.
 *
 * It does not implement an alternative validation path.
 * ========================================================================== */

export function isValidRfsImpulseContract(
  value: unknown,
): value is RfsImpulseContract {
  return validateRfsImpulseContract(
    value,
  ).ok;
}

/* ============================================================================
 * 16. CONTRACT ASSERTION
 * ----------------------------------------------------------------------------
 * Assertion is pure regarding system state.
 *
 * It may interrupt the current call by throwing a deterministic contract
 * error, but it performs no runtime mutation.
 * ========================================================================== */

export function assertRfsImpulseContractValid(
  value: unknown,
): asserts value is RfsImpulseContract {
  const result =
    validateRfsImpulseContract(
      value,
    );

  if (
    result.ok
  ) {
    return;
  }

  const error =
    new Error(
      [
        "rfs_impulse_contract_invalid",
        ...result.violations,
      ].join(":"),
    ) as RfsImpulseContractAssertionError;

  error.name =
    "RfsImpulseContractValidationError";

  error.validation_result =
    result;

  throw error;
}
