/* ============================================================================
 * FILE: lib/xyvala/rfs/validation/rfs-temporal-contract-validator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical RFS temporal contract validator
 *
 * ROLE
 * - validate unknown runtime values against the canonical RFS temporal contract
 * - verify global, 7D and 24H temporal contract integrity
 * - verify explicit availability and degradation statuses
 * - reject undefined, invalid numbers and unsupported temporal states
 * - expose deterministic validation results
 * - support Contract Before Runtime and First Divergence Rule
 *
 * CLASSIFICATION
 * - COMPUTE
 * - pure deterministic validation
 * - no runtime mutation
 *
 * PARENTS
 * - lib/xyvala/rfs/contracts/rfs-temporal-contract.ts
 *
 * INPUTS
 * - unknown runtime value expected to satisfy RfsTemporalContext
 *
 * OUTPUTS
 * - deterministic validation result
 * - validated RfsTemporalContext when valid
 * - explicit violations and warnings when invalid or degraded
 *
 * DIRECTIVES
 * - validation only
 * - no temporal computation
 * - no RFS computation
 * - no stability computation
 * - no rupture computation
 * - no regime computation
 * - no Triple Layer computation
 * - no Impulse Layer computation
 * - no MCI computation
 * - no calibration computation
 * - no snapshot generation
 * - no public projection
 * - no persistence
 * - no cache mutation
 * - no silent repair
 * - no fallback timestamp generation
 * - no replacement of unavailable values
 * - no conversion of null into zero
 * - no conversion of undefined into null
 *
 * INVARIANTS
 * - global structure remains distinct from 7D and 24H contexts
 * - 7D contextualizes recent structure only
 * - 24H contextualizes immediate timing only
 * - temporal blocks never replace global structural truth
 * - null means explicitly unavailable
 * - undefined is never a governed business value
 * - unavailable blocks cannot expose computed analytical values
 * - computed blocks must expose complete analytical values
 * - all score values remain inside the canonical [0, 100] range
 * - all validation output ordering remains deterministic
 * - validation never changes the validated value
 *
 * FIRST DIVERGENCE RULE
 * - root-shape failures remain root-shape violations
 * - block-shape failures remain attached to their exact temporal block
 * - status failures remain status violations
 * - unavailable-value contradictions remain availability violations
 * - invalid score ranges remain score-range violations
 * - cross-horizon contradictions remain temporal-consistency warnings
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/rfs/contracts/rfs-temporal-contract.ts
 *
 * SENSITIVE ZONES
 * - nullability
 * - undefined detection
 * - temporal statuses
 * - score ranges
 * - 7D / 24H separation
 * - degraded propagation
 * ========================================================================== */

import type {
  RfsTemporalBlock,
  RfsTemporalContext,
} from "@/lib/xyvala/rfs/contracts/rfs-temporal-contract";

/* ============================================================================
 * 1. VALIDATION TYPES
 * ========================================================================== */

export type RfsTemporalContractValidationStatus =
  | "VALID"
  | "DEGRADED"
  | "INVALID";

export type RfsTemporalContractValidationResult =
  | {
      ok: true;

      status:
        | "VALID"
        | "DEGRADED";

      value:
        RfsTemporalContext;

      violation_count: 0;
      warning_count: number;

      violations: [];
      warnings: string[];
    }
  | {
      ok: false;

      status:
        "INVALID";

      value:
        null;

      violation_count: number;
      warning_count: number;

      violations: string[];
      warnings: string[];
    };

export type RfsTemporalContractAssertionError =
  Error & {
    validation_result:
      RfsTemporalContractValidationResult;
  };

/* ============================================================================
 * 2. CANONICAL VALIDATION CONSTANTS
 * ========================================================================== */

const SCORE_MIN = 0;
const SCORE_MAX = 100;

const TEMPORAL_BLOCK_NAMES =
  Object.freeze([
    "initial_7d",
    "rolling_7d",
    "initial_24h",
    "rolling_24h",
  ] as const);

type RfsTemporalBlockName =
  (typeof TEMPORAL_BLOCK_NAMES)[number];

const TEMPORAL_STATUSES =
  Object.freeze([
    "computed",
    "partial",
    "insufficient_data",
    "unavailable",
  ] as const);

type CanonicalTemporalStatus =
  (typeof TEMPORAL_STATUSES)[number];

const COMPUTED_VALUE_FIELDS =
  Object.freeze([
    "price_score",
    "change_pct",
    "slope_pct",
    "stability_score",
    "rupture_score",
    "rupture_probability",
  ] as const);

type TemporalComputedValueField =
  (typeof COMPUTED_VALUE_FIELDS)[number];

const SCORE_FIELDS =
  Object.freeze([
    "price_score",
    "stability_score",
    "rupture_score",
    "rupture_probability",
  ] as const);

type TemporalScoreField =
  (typeof SCORE_FIELDS)[number];

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

function hasOwn(
  value: Record<string, unknown>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    key,
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

function isNullableFiniteNumber(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    isFiniteNumber(value)
  );
}

function isCanonicalTemporalStatus(
  value: unknown,
): value is CanonicalTemporalStatus {
  return (
    typeof value === "string" &&
    (
      TEMPORAL_STATUSES as
        readonly string[]
    ).includes(value)
  );
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

function hasUndefinedOwnProperty(
  value: Record<string, unknown>,
): boolean {
  return Object.keys(value).some(
    (key) =>
      value[key] === undefined,
  );
}

/* ============================================================================
 * 4. VALIDATION COLLECTION HELPERS
 * ========================================================================== */

type ValidationCollector = {
  violations: string[];
  warnings: string[];
};

function addViolation(
  collector: ValidationCollector,
  code: string,
): void {
  collector.violations.push(code);
}

function addWarning(
  collector: ValidationCollector,
  code: string,
): void {
  collector.warnings.push(code);
}

/* ============================================================================
 * 5. REQUIRED FIELD VALIDATION
 * ========================================================================== */

function validateRequiredFieldPresence(
  input: {
    record:
      Record<string, unknown>;

    fieldName:
      string;

    path:
      string;

    collector:
      ValidationCollector;
  },
): void {
  if (
    !hasOwn(
      input.record,
      input.fieldName,
    )
  ) {
    addViolation(
      input.collector,
      [
        "RFS-TEMPORAL-001",
        "missing_required_field",
        input.path,
        input.fieldName,
      ].join(":"),
    );

    return;
  }

  if (
    input.record[input.fieldName] ===
    undefined
  ) {
    addViolation(
      input.collector,
      [
        "RFS-TEMPORAL-002",
        "undefined_required_field",
        input.path,
        input.fieldName,
      ].join(":"),
    );
  }
}

/* ============================================================================
 * 6. SCORE VALIDATION
 * ========================================================================== */

function validateScoreValue(
  input: {
    value:
      unknown;

    path:
      string;

    fieldName:
      TemporalScoreField;

    nullable:
      boolean;

    collector:
      ValidationCollector;
  },
): void {
  if (
    input.value === null &&
    input.nullable
  ) {
    return;
  }

  if (
    !isFiniteNumber(
      input.value,
    )
  ) {
    addViolation(
      input.collector,
      [
        "RFS-TEMPORAL-003",
        "invalid_score_type",
        input.path,
        input.fieldName,
      ].join(":"),
    );

    return;
  }

  if (
    input.value < SCORE_MIN ||
    input.value > SCORE_MAX
  ) {
    addViolation(
      input.collector,
      [
        "RFS-TEMPORAL-004",
        "score_out_of_range",
        input.path,
        input.fieldName,
        String(input.value),
      ].join(":"),
    );
  }
}

function validateSignedFiniteValue(
  input: {
    value:
      unknown;

    path:
      string;

    fieldName:
      "change_pct"
      | "slope_pct";

    nullable:
      boolean;

    collector:
      ValidationCollector;
  },
): void {
  if (
    input.value === null &&
    input.nullable
  ) {
    return;
  }

  if (
    !isFiniteNumber(
      input.value,
    )
  ) {
    addViolation(
      input.collector,
      [
        "RFS-TEMPORAL-005",
        "invalid_finite_value",
        input.path,
        input.fieldName,
      ].join(":"),
    );
  }
}

/* ============================================================================
 * 7. TEMPORAL STATUS CONSISTENCY
 * ========================================================================== */

function validateUnavailableBlockValues(
  input: {
    block:
      Record<string, unknown>;

    blockName:
      RfsTemporalBlockName;

    collector:
      ValidationCollector;
  },
): void {
  for (
    const fieldName of
    COMPUTED_VALUE_FIELDS
  ) {
    const value =
      input.block[fieldName];

    if (value !== null) {
      addViolation(
        input.collector,
        [
          "RFS-TEMPORAL-006",
          "unavailable_block_exposes_value",
          input.blockName,
          fieldName,
        ].join(":"),
      );
    }
  }
}

function validateInsufficientBlockValues(
  input: {
    block:
      Record<string, unknown>;

    blockName:
      RfsTemporalBlockName;

    collector:
      ValidationCollector;
  },
): void {
  const availableValues =
    COMPUTED_VALUE_FIELDS.filter(
      (fieldName) =>
        input.block[fieldName] !==
        null,
    );

  if (
    availableValues.length > 0
  ) {
    addWarning(
      input.collector,
      [
        "RFS-TEMPORAL-WARN",
        "insufficient_data_contains_partial_values",
        input.blockName,
        availableValues.join(","),
      ].join(":"),
    );
  }
}

function validateComputedBlockValues(
  input: {
    block:
      Record<string, unknown>;

    blockName:
      RfsTemporalBlockName;

    collector:
      ValidationCollector;
  },
): void {
  for (
    const fieldName of
    COMPUTED_VALUE_FIELDS
  ) {
    if (
      input.block[fieldName] ===
      null
    ) {
      addViolation(
        input.collector,
        [
          "RFS-TEMPORAL-007",
          "computed_block_missing_value",
          input.blockName,
          fieldName,
        ].join(":"),
      );
    }
  }
}

function validatePartialBlockValues(
  input: {
    block:
      Record<string, unknown>;

    blockName:
      RfsTemporalBlockName;

    collector:
      ValidationCollector;
  },
): void {
  const availableCount =
    COMPUTED_VALUE_FIELDS.filter(
      (fieldName) =>
        input.block[fieldName] !==
        null,
    ).length;

  if (availableCount === 0) {
    addViolation(
      input.collector,
      [
        "RFS-TEMPORAL-008",
        "partial_block_without_available_value",
        input.blockName,
      ].join(":"),
    );
  }

  if (
    availableCount ===
    COMPUTED_VALUE_FIELDS.length
  ) {
    addWarning(
      input.collector,
      [
        "RFS-TEMPORAL-WARN",
        "partial_block_contains_complete_values",
        input.blockName,
      ].join(":"),
    );
  }
}

/* ============================================================================
 * 8. TEMPORAL BLOCK VALIDATION
 * ========================================================================== */

function validateTemporalBlock(
  value: unknown,
  blockName: RfsTemporalBlockName,
  collector: ValidationCollector,
): value is RfsTemporalBlock {
  if (!isRecord(value)) {
    addViolation(
      collector,
      [
        "RFS-TEMPORAL-009",
        "invalid_temporal_block_shape",
        blockName,
      ].join(":"),
    );

    return false;
  }

  if (
    hasUndefinedOwnProperty(value)
  ) {
    addViolation(
      collector,
      [
        "RFS-TEMPORAL-010",
        "undefined_value_in_temporal_block",
        blockName,
      ].join(":"),
    );
  }

  for (
    const fieldName of
    COMPUTED_VALUE_FIELDS
  ) {
    validateRequiredFieldPresence({
      record:
        value,

      fieldName,

      path:
        blockName,

      collector,
    });
  }

  validateRequiredFieldPresence({
    record:
      value,

    fieldName:
      "status",

    path:
      blockName,

    collector,
  });

  const status =
    value.status;

  if (
    !isCanonicalTemporalStatus(
      status,
    )
  ) {
    addViolation(
      collector,
      [
        "RFS-TEMPORAL-011",
        "invalid_temporal_status",
        blockName,
        typeof status === "string"
          ? status
          : typeof status,
      ].join(":"),
    );

    return false;
  }

  for (
    const scoreField of
    SCORE_FIELDS
  ) {
    validateScoreValue({
      value:
        value[scoreField],

      path:
        blockName,

      fieldName:
        scoreField,

      nullable:
        status !== "computed",

      collector,
    });
  }

  validateSignedFiniteValue({
    value:
      value.change_pct,

    path:
      blockName,

    fieldName:
      "change_pct",

    nullable:
      status !== "computed",

    collector,
  });

  validateSignedFiniteValue({
    value:
      value.slope_pct,

    path:
      blockName,

    fieldName:
      "slope_pct",

    nullable:
      status !== "computed",

    collector,
  });

  switch (status) {
    case "unavailable":
      validateUnavailableBlockValues({
        block:
          value,

        blockName,

        collector,
      });
      break;

    case "insufficient_data":
      validateInsufficientBlockValues({
        block:
          value,

        blockName,

        collector,
      });
      break;

    case "partial":
      validatePartialBlockValues({
        block:
          value,

        blockName,

        collector,
      });
      break;

    case "computed":
      validateComputedBlockValues({
        block:
          value,

        blockName,

        collector,
      });
      break;
  }

  return true;
}

/* ============================================================================
 * 9. CROSS-HORIZON VALIDATION
 * ----------------------------------------------------------------------------
 * Cross-horizon validation only detects contradictions.
 *
 * It never:
 * - recalculates a temporal block
 * - changes a status
 * - replaces missing values
 * - infers global structure
 * ========================================================================== */

function readTemporalStatus(
  value: unknown,
): CanonicalTemporalStatus | null {
  if (!isRecord(value)) {
    return null;
  }

  return isCanonicalTemporalStatus(
    value.status,
  )
    ? value.status
    : null;
}

function validateCrossHorizonConsistency(
  value: Record<string, unknown>,
  collector: ValidationCollector,
): void {
  const initial7dStatus =
    readTemporalStatus(
      value.initial_7d,
    );

  const rolling7dStatus =
    readTemporalStatus(
      value.rolling_7d,
    );

  const initial24hStatus =
    readTemporalStatus(
      value.initial_24h,
    );

  const rolling24hStatus =
    readTemporalStatus(
      value.rolling_24h,
    );

  if (
    rolling7dStatus === "computed" &&
    rolling24hStatus === "unavailable"
  ) {
    addWarning(
      collector,
      [
        "RFS-TEMPORAL-WARN",
        "rolling_7d_computed_while_rolling_24h_unavailable",
      ].join(":"),
    );
  }

  if (
    initial7dStatus === "computed" &&
    initial24hStatus === "unavailable"
  ) {
    addWarning(
      collector,
      [
        "RFS-TEMPORAL-WARN",
        "initial_7d_computed_while_initial_24h_unavailable",
      ].join(":"),
    );
  }

  if (
    initial7dStatus === "unavailable" &&
    rolling7dStatus === "computed"
  ) {
    addWarning(
      collector,
      [
        "RFS-TEMPORAL-WARN",
        "initial_7d_unavailable_while_rolling_7d_computed",
      ].join(":"),
    );
  }

  if (
    initial24hStatus === "unavailable" &&
    rolling24hStatus === "computed"
  ) {
    addWarning(
      collector,
      [
        "RFS-TEMPORAL-WARN",
        "initial_24h_unavailable_while_rolling_24h_computed",
      ].join(":"),
    );
  }
}

/* ============================================================================
 * 10. ROOT CONTRACT VALIDATION
 * ========================================================================== */

function validateRootFields(
  value: Record<string, unknown>,
  collector: ValidationCollector,
): void {
  for (
    const blockName of
    TEMPORAL_BLOCK_NAMES
  ) {
    validateRequiredFieldPresence({
      record:
        value,

      fieldName:
        blockName,

      path:
        "rfs_temporal_contract",

      collector,
    });
  }

  if (
    hasUndefinedOwnProperty(value)
  ) {
    addViolation(
      collector,
      "RFS-TEMPORAL-012:undefined_value_in_temporal_contract",
    );
  }
}

/* ============================================================================
 * 11. PUBLIC VALIDATOR
 * ----------------------------------------------------------------------------
 * CLASSIFICATION
 * - COMPUTE
 *
 * This function is:
 * - pure
 * - deterministic
 * - non-mutating
 * - contract-driven
 * ========================================================================== */

export function validateRfsTemporalContract(
  value: unknown,
): RfsTemporalContractValidationResult {
  const collector:
    ValidationCollector = {
      violations: [],
      warnings: [],
    };

  if (!isRecord(value)) {
    return {
      ok: false,

      status:
        "INVALID",

      value:
        null,

      violation_count:
        1,

      warning_count:
        0,

      violations: [
        "RFS-TEMPORAL-000:invalid_root_shape",
      ],

      warnings: [],
    };
  }

  validateRootFields(
    value,
    collector,
  );

  for (
    const blockName of
    TEMPORAL_BLOCK_NAMES
  ) {
    validateTemporalBlock(
      value[blockName],
      blockName,
      collector,
    );
  }

  validateCrossHorizonConsistency(
    value,
    collector,
  );

  const violations =
    uniqueSortedStrings(
      collector.violations,
    );

  const warnings =
    uniqueSortedStrings(
      collector.warnings,
    );

  if (
    violations.length > 0
  ) {
    return {
      ok: false,

      status:
        "INVALID",

      value:
        null,

      violation_count:
        violations.length,

      warning_count:
        warnings.length,

      violations,

      warnings,
    };
  }

  const status:
    RfsTemporalContractValidationStatus =
      warnings.length > 0
        ? "DEGRADED"
        : "VALID";

  return {
    ok: true,

    status,

    value:
      value as RfsTemporalContext,

    violation_count:
      0,

    warning_count:
      warnings.length,

    violations: [],

    warnings,
  };
}

/* ============================================================================
 * 12. TYPE GUARD
 * ----------------------------------------------------------------------------
 * OBSERVATION
 * - this function delegates to the canonical pure validator
 * - it introduces no additional interpretation
 * ========================================================================== */

export function isRfsTemporalContract(
  value: unknown,
): value is RfsTemporalContext {
  return validateRfsTemporalContract(
    value,
  ).ok;
}

/* ============================================================================
 * 13. ASSERTION
 * ----------------------------------------------------------------------------
 * CLASSIFICATION
 * - COMPUTE validation boundary
 *
 * Throwing an explicit validation error does not mutate runtime truth.
 * The original validation result remains attached for deterministic diagnosis.
 * ========================================================================== */

export function assertRfsTemporalContract(
  value: unknown,
): asserts value is RfsTemporalContext {
  const result =
    validateRfsTemporalContract(
      value,
    );

  if (result.ok) {
    return;
  }

  const error =
    new Error(
      [
        "rfs_temporal_contract_invalid",
        ...result.violations,
      ].join(":"),
    ) as RfsTemporalContractAssertionError;

  error.name =
    "RfsTemporalContractValidationError";

  error.validation_result =
    result;

  throw error;
}
