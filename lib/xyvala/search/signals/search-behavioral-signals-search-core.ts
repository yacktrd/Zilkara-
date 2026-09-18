/* ============================================================================
 * FILE: lib/xyvala/search/signals/search-behavioral-signals-search-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical behavioral signals Search core
 *
 * ROLE
 * - produce the canonical SearchBehavioralSignals contract
 * - validate behavioral observation evidence
 * - preserve explicit behavioral evidence availability
 * - qualify behavioral evidence as CALIBRATED, INSUFFICIENT_DATA or UNAVAILABLE
 * - enforce canonical query/document identity
 * - preserve behavioral-policy lineage
 * - protect downstream consumers from behavioral evidence reconstruction
 *
 * CLASSIFICATION
 * - PRIVATE CORE
 * - SEARCH DOMAIN
 * - BEHAVIORAL_SIGNAL_DETECTION
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-PUBLIC
 * - CANONICAL PRODUCER
 *
 * POSITION IN OFFICIAL PIPELINE
 * ----------------------------------------------------------------------------
 *
 * LINK_SIGNAL_DETECTION
 *        ↓
 * TEMPORAL_SIGNAL_DETECTION
 *        ↓
 * BEHAVIORAL_SIGNAL_DETECTION
 *        ↓
 * QUERY_NORMALIZATION
 *        ↓
 * QUERY_PROFILING
 *
 * PRODUCES
 * - SearchBehavioralSignals
 *
 * DOES NOT PRODUCE
 * - SearchBehavioralCalibrationScoreVector
 * - SearchQueryRelativeScoreVector
 * - SearchGlobalScore
 * - SearchEligibilityResult
 * - SearchPrivateDecision
 * - SearchPublicResultCandidate
 * - SearchPublicRankingProjection
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchBehavioralSignals
 * - SearchOptionalEvidence
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Compute / Observe / Mutate Separation
 * - Missing Data Explicitness Rule
 *
 * CONSUMERS
 * - Behavioral Calibration Scoring
 * - Search Runtime Orchestrator
 * - Search Private Snapshot Builder
 * - Search traceability
 * - Search integration tests
 *
 * DIRECTIVES
 * - one canonical behavioral producer
 * - explicit evidence availability
 * - explicit query identity
 * - explicit document identity
 * - explicit policy lineage
 * - no runtime clock access
 * - no random identifier generation
 * - no persistence
 * - no logging
 * - no network access
 * - no provider access
 * - no behavioral observation acquisition
 * - no hidden fallback
 * - no default behavioral policy
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no score computation
 * - no relevance computation
 * - no ranking computation
 * - no private decision computation
 *
 * IMPORTANT — OBSERVATION VS CANONICAL SIGNAL
 * ----------------------------------------------------------------------------
 * This core consumes explicitly supplied behavioral observation evidence.
 *
 * Observation acquisition belongs outside this core.
 *
 * Example:
 *
 * behavioral provider / telemetry adapter
 *        ↓
 * raw behavioral observation evidence
 *        ↓
 * search-behavioral-signals-search-core.ts
 *        ↓
 * canonical SearchBehavioralSignals
 *
 * This core is the canonical Search producer because it:
 * - validates the observation evidence;
 * - validates cross-field coherence;
 * - qualifies availability;
 * - determines the canonical behavioral state;
 * - attaches canonical contract and policy lineage;
 * - publishes the governed SearchBehavioralSignals contract.
 *
 * It does NOT invent numerical evidence.
 *
 * IMPORTANT — DERIVED BEHAVIORAL VALUES
 * ----------------------------------------------------------------------------
 * The current Search pipeline contract does not define the mathematical
 * production method for:
 *
 * - observed_ctr;
 * - position_adjusted_ctr;
 * - sample_confidence.
 *
 * Therefore this core MUST NOT silently invent formulas for these identities.
 *
 * The values must enter this boundary as explicit observation/reference
 * evidence produced under an authorized upstream observation methodology.
 *
 * This core validates and canonically qualifies them.
 *
 * Future contract evolution may introduce dedicated governed computation
 * methods. Until then:
 *
 * - no observed_ctr reconstruction from impressions/clicks;
 * - no position_adjusted_ctr reconstruction from observed/expected CTR;
 * - no sample_confidence reconstruction from impression count.
 *
 * AVAILABLE ZERO SEMANTICS
 * ----------------------------------------------------------------------------
 * AVAILABLE(0) means zero was actually observed.
 *
 * It does NOT mean:
 * - unavailable;
 * - unknown;
 * - missing;
 * - neutral;
 * - insufficient evidence.
 *
 * Non-AVAILABLE evidence must remain explicitly non-AVAILABLE.
 *
 * CALIBRATION STATE
 * ----------------------------------------------------------------------------
 * CALIBRATED requires, at minimum:
 *
 * - AVAILABLE impressions;
 * - impressions >= explicit minimum_impressions policy threshold;
 * - AVAILABLE clicks;
 * - AVAILABLE observed_ctr;
 * - AVAILABLE sample_confidence.
 *
 * expected_ctr_at_position and position_adjusted_ctr remain optional supporting
 * evidence and are not required merely to establish a CALIBRATED behavioral
 * population.
 *
 * INSUFFICIENT_DATA means:
 * - some canonical behavioral evidence exists;
 * - but minimum calibrated evidence requirements are not satisfied.
 *
 * UNAVAILABLE means:
 * - no behavioral evidence field is AVAILABLE.
 *
 * CROSS-FIELD RULES
 * ----------------------------------------------------------------------------
 * - clicks cannot exceed impressions when both are available;
 * - observed_ctr requires AVAILABLE impressions and clicks;
 * - observed_ctr requires impressions > 0;
 * - position_adjusted_ctr requires AVAILABLE observed_ctr;
 * - position_adjusted_ctr requires AVAILABLE expected_ctr_at_position;
 * - unavailable evidence requires a non-empty reason;
 * - CALIBRATED output requires the canonical calibrated evidence set;
 * - UNAVAILABLE output cannot contain AVAILABLE behavioral evidence.
 *
 * VALIDATION STATE
 * ----------------------------------------------------------------------------
 * VALID:
 * - canonical behavioral evidence reached CALIBRATED state;
 * - all structural invariants are satisfied.
 *
 * DEGRADED:
 * - evidence is structurally coherent;
 * - canonical behavioral state is INSUFFICIENT_DATA or UNAVAILABLE.
 *
 * REJECTED / UNVALIDATED:
 * - never emitted by the canonical builder;
 * - invalid input fails at the producer boundary instead.
 *
 * INVARIANTS
 * - same input + same policy => same output
 * - no input object is mutated
 * - no evidence object is mutated
 * - output is immutable
 * - document identity is preserved exactly
 * - query identity is preserved exactly
 * - created_at is supplied explicitly
 * - minimum policy version is supplied explicitly
 * - no missing numerical truth is fabricated
 * - no unavailable evidence becomes zero
 * - no downstream-derived identity is created
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * invalid document/query identity
 * => Behavioral Signal Detection input boundary
 *
 * invalid evidence value
 * => Behavioral observation boundary
 *
 * clicks > impressions
 * => Behavioral observation boundary
 *
 * observed_ctr without canonical counts
 * => Behavioral observation boundary
 *
 * position_adjusted_ctr without its canonical supporting evidence
 * => Behavioral observation boundary
 *
 * invalid policy
 * => Behavioral evidence policy boundary
 *
 * missing/unavailable evidence converted to zero
 * => Behavioral producer ownership violation
 *
 * behavioral score created here
 * => Behavioral Calibration Scoring ownership violation
 * ========================================================================== */

import type {
  SearchBehavioralSignals,
  SearchBehavioralState,
  SearchConfidenceScore,
  SearchContractVersion,
  SearchCount,
  SearchDocumentId,
  SearchDurationMilliseconds,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchQueryId,
  SearchRatio,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_BEHAVIORAL_SIGNALS_SEARCH_CORE_MODULE_NAME =
  "xyvala-search-behavioral-signals-search-core" as const;

export const XYVALA_SEARCH_BEHAVIORAL_SIGNALS_SEARCH_CORE_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

export const XYVALA_SEARCH_BEHAVIORAL_SIGNALS_CONTRACT_VERSION:
  SearchContractVersion =
    "1.0.0";

/* ============================================================================
 * 2. BEHAVIORAL POLICY
 * ----------------------------------------------------------------------------
 * No default policy is defined here.
 *
 * The active policy must be supplied explicitly by the authorized application
 * configuration / calibration lifecycle.
 * ========================================================================== */

export interface SearchBehavioralSignalsSearchPolicy {
  /**
   * Canonical policy identity transported into
   * SearchBehavioralSignals.minimum_impressions_policy_version.
   */
  readonly policy_version:
    SearchPolicyVersion;

  /**
   * Minimum canonical impression count required before the behavioral
   * population may be qualified as CALIBRATED.
   *
   * Must be a strictly positive integer.
   */
  readonly minimum_impressions:
    SearchCount;
}

/* ============================================================================
 * 3. CANONICAL OBSERVATION EVIDENCE INPUT
 * ----------------------------------------------------------------------------
 * This contract represents behavioral observation/reference evidence entering
 * the canonical Search behavioral producer.
 *
 * Every numerical field remains explicitly availability-qualified.
 *
 * No field may use a numerical fallback to represent absence.
 * ========================================================================== */

export interface SearchBehavioralObservationEvidence {
  readonly impressions:
    SearchOptionalEvidence<SearchCount>;

  readonly clicks:
    SearchOptionalEvidence<SearchCount>;

  readonly observed_ctr:
    SearchOptionalEvidence<SearchRatio>;

  readonly expected_ctr_at_position:
    SearchOptionalEvidence<SearchRatio>;

  readonly position_adjusted_ctr:
    SearchOptionalEvidence<SearchRatio>;

  readonly dwell_time_ms:
    SearchOptionalEvidence<SearchDurationMilliseconds>;

  readonly return_to_results_rate:
    SearchOptionalEvidence<SearchRatio>;

  readonly sample_confidence:
    SearchOptionalEvidence<SearchConfidenceScore>;
}

/* ============================================================================
 * 4. CANONICAL PRODUCER INPUT
 * ========================================================================== */

export interface SearchBehavioralSignalsSearchInput {
  readonly document_id:
    SearchDocumentId;

  readonly query_id:
    SearchQueryId;

  /**
   * Explicit producer timestamp.
   *
   * No runtime clock is read inside this core.
   */
  readonly created_at:
    SearchIsoTimestamp;

  readonly evidence:
    SearchBehavioralObservationEvidence;

  readonly policy:
    SearchBehavioralSignalsSearchPolicy;
}

/* ============================================================================
 * 5. VALIDATION RESULT
 * ========================================================================== */

export interface SearchBehavioralSignalsValidationResult {
  readonly valid:
    boolean;

  readonly errors:
    readonly string[];
}

/* ============================================================================
 * 6. EVIDENCE FIELD DOMAIN
 * ========================================================================== */

type SearchBehavioralEvidenceFieldName =
  | "impressions"
  | "clicks"
  | "observed_ctr"
  | "expected_ctr_at_position"
  | "position_adjusted_ctr"
  | "dwell_time_ms"
  | "return_to_results_rate"
  | "sample_confidence";

const SEARCH_BEHAVIORAL_EVIDENCE_FIELD_NAMES =
  Object.freeze([
    "impressions",
    "clicks",
    "observed_ctr",
    "expected_ctr_at_position",
    "position_adjusted_ctr",
    "dwell_time_ms",
    "return_to_results_rate",
    "sample_confidence",
  ] as const satisfies readonly SearchBehavioralEvidenceFieldName[]);

/* ============================================================================
 * 7. PRIMITIVE VALIDATION HELPERS
 * ========================================================================== */

function isNonEmptyString(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}

function isValidIsoTimestamp(
  value:
    unknown,
): value is SearchIsoTimestamp {
  if (
    !isNonEmptyString(
      value,
    )
  ) {
    return false;
  }

  return Number.isFinite(
    Date.parse(
      value,
    ),
  );
}

function isFiniteNumber(
  value:
    unknown,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  );
}

function isNonNegativeFiniteNumber(
  value:
    unknown,
): value is number {
  return (
    isFiniteNumber(
      value,
    ) &&
    value >= 0
  );
}

function isNonNegativeInteger(
  value:
    unknown,
): value is number {
  return (
    Number.isInteger(
      value,
    ) &&
    isNonNegativeFiniteNumber(
      value,
    )
  );
}

function isUnitIntervalNumber(
  value:
    unknown,
): value is number {
  return (
    isFiniteNumber(
      value,
    ) &&
    value >= 0 &&
    value <= 1
  );
}

/* ============================================================================
 * 8. OPTIONAL EVIDENCE STRUCTURAL VALIDATION
 * ========================================================================== */

function validateOptionalEvidenceStructure<T>(
  evidence:
    SearchOptionalEvidence<T>,

  fieldName:
    string,
): readonly string[] {
  const errors:
    string[] =
    [];

  if (
    evidence === null ||
    typeof evidence !==
      "object"
  ) {
    errors.push(
      `${fieldName} must be explicit SearchOptionalEvidence.`,
    );

    return errors;
  }

  if (
    evidence.availability_state ===
      "AVAILABLE"
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        evidence,
        "value",
      )
    ) {
      errors.push(
        `${fieldName} AVAILABLE evidence must contain value.`,
      );
    }

    return errors;
  }

  if (
    evidence.availability_state !==
      "UNAVAILABLE" &&
    evidence.availability_state !==
      "INSUFFICIENT_DATA" &&
    evidence.availability_state !==
      "INSUFFICIENT_HISTORY" &&
    evidence.availability_state !==
      "UNSUPPORTED" &&
    evidence.availability_state !==
      "INVALID"
  ) {
    errors.push(
      `${fieldName} has an unsupported availability_state.`,
    );

    return errors;
  }

  if (
    !isNonEmptyString(
      evidence.reason,
    )
  ) {
    errors.push(
      `${fieldName} non-AVAILABLE evidence requires a non-empty reason.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 9. COUNT EVIDENCE VALIDATION
 * ========================================================================== */

function validateCountEvidence(
  evidence:
    SearchOptionalEvidence<SearchCount>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isNonNegativeInteger(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a non-negative integer.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 10. UNIT-RATIO EVIDENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Used for observed CTR, expected CTR and return-to-results rate.
 *
 * These identities describe bounded proportions.
 * ========================================================================== */

function validateUnitRatioEvidence(
  evidence:
    SearchOptionalEvidence<SearchRatio>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isUnitIntervalNumber(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a finite number between 0 and 1.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 11. POSITION-ADJUSTED CTR VALIDATION
 * ----------------------------------------------------------------------------
 * The contract does not currently define whether the adjustment method must
 * remain bounded to [0, 1].
 *
 * Therefore this core validates only that canonical available evidence is
 * finite and non-negative.
 *
 * It deliberately does not introduce an undocumented upper bound.
 * ========================================================================== */

function validatePositionAdjustedCtrEvidence(
  evidence:
    SearchOptionalEvidence<SearchRatio>,
): readonly string[] {
  const fieldName =
    "position_adjusted_ctr";

  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isNonNegativeFiniteNumber(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a finite non-negative number.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 12. DURATION EVIDENCE VALIDATION
 * ========================================================================== */

function validateDurationEvidence(
  evidence:
    SearchOptionalEvidence<SearchDurationMilliseconds>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isNonNegativeFiniteNumber(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a finite non-negative duration.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 13. CONFIDENCE EVIDENCE VALIDATION
 * ========================================================================== */

function validateConfidenceEvidence(
  evidence:
    SearchOptionalEvidence<SearchConfidenceScore>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isUnitIntervalNumber(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a finite number between 0 and 1.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 14. POLICY VALIDATION
 * ========================================================================== */

function validateBehavioralPolicy(
  policy:
    SearchBehavioralSignalsSearchPolicy,
): readonly string[] {
  const errors:
    string[] =
    [];

  if (
    !isNonEmptyString(
      policy.policy_version,
    )
  ) {
    errors.push(
      "policy.policy_version must be a non-empty string.",
    );
  }

  if (
    !Number.isInteger(
      policy.minimum_impressions,
    ) ||
    policy.minimum_impressions <=
      0
  ) {
    errors.push(
      "policy.minimum_impressions must be a strictly positive integer.",
    );
  }

  return errors;
}

/* ============================================================================
 * 15. EVIDENCE CROSS-FIELD VALIDATION
 * ----------------------------------------------------------------------------
 * Cross-field validation protects producer coherence.
 *
 * It does NOT reconstruct missing evidence.
 * ========================================================================== */

function validateBehavioralEvidenceRelationships(
  evidence:
    SearchBehavioralObservationEvidence,
): readonly string[] {
  const errors:
    string[] =
    [];

  /* --------------------------------------------------------------------------
   * clicks <= impressions
   * ----------------------------------------------------------------------- */

  if (
    evidence.impressions
      .availability_state ===
      "AVAILABLE" &&
    evidence.clicks
      .availability_state ===
      "AVAILABLE" &&
    evidence.clicks.value >
      evidence.impressions.value
  ) {
    errors.push(
      "clicks cannot exceed impressions when both canonical counts are AVAILABLE.",
    );
  }

  /* --------------------------------------------------------------------------
   * observed_ctr dependency
   * ----------------------------------------------------------------------- */

  if (
    evidence.observed_ctr
      .availability_state ===
      "AVAILABLE"
  ) {
    if (
      evidence.impressions
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "AVAILABLE observed_ctr requires AVAILABLE impressions.",
      );
    }

    if (
      evidence.clicks
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "AVAILABLE observed_ctr requires AVAILABLE clicks.",
      );
    }

    if (
      evidence.impressions
        .availability_state ===
        "AVAILABLE" &&
      evidence.impressions.value ===
        0
    ) {
      errors.push(
        "AVAILABLE observed_ctr is not authorized when impressions equals zero.",
      );
    }
  }

  /* --------------------------------------------------------------------------
   * position_adjusted_ctr dependencies
   * ----------------------------------------------------------------------- */

  if (
    evidence.position_adjusted_ctr
      .availability_state ===
      "AVAILABLE"
  ) {
    if (
      evidence.observed_ctr
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "AVAILABLE position_adjusted_ctr requires AVAILABLE observed_ctr.",
      );
    }

    if (
      evidence.expected_ctr_at_position
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "AVAILABLE position_adjusted_ctr requires AVAILABLE expected_ctr_at_position.",
      );
    }
  }

  return errors;
}

/* ============================================================================
 * 16. INPUT VALIDATION
 * ========================================================================== */

export function validateSearchBehavioralSignalsInput(
  input:
    SearchBehavioralSignalsSearchInput,
): SearchBehavioralSignalsValidationResult {
  const errors:
    string[] =
    [];

  if (
    !isNonEmptyString(
      input.document_id,
    )
  ) {
    errors.push(
      "document_id must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      input.query_id,
    )
  ) {
    errors.push(
      "query_id must be a non-empty string.",
    );
  }

  if (
    !isValidIsoTimestamp(
      input.created_at,
    )
  ) {
    errors.push(
      "created_at must be a valid ISO timestamp.",
    );
  }

  errors.push(
    ...validateBehavioralPolicy(
      input.policy,
    ),
  );

  errors.push(
    ...validateCountEvidence(
      input.evidence.impressions,
      "impressions",
    ),

    ...validateCountEvidence(
      input.evidence.clicks,
      "clicks",
    ),

    ...validateUnitRatioEvidence(
      input.evidence.observed_ctr,
      "observed_ctr",
    ),

    ...validateUnitRatioEvidence(
      input.evidence.expected_ctr_at_position,
      "expected_ctr_at_position",
    ),

    ...validatePositionAdjustedCtrEvidence(
      input.evidence.position_adjusted_ctr,
    ),

    ...validateDurationEvidence(
      input.evidence.dwell_time_ms,
      "dwell_time_ms",
    ),

    ...validateUnitRatioEvidence(
      input.evidence.return_to_results_rate,
      "return_to_results_rate",
    ),

    ...validateConfidenceEvidence(
      input.evidence.sample_confidence,
      "sample_confidence",
    ),

    ...validateBehavioralEvidenceRelationships(
      input.evidence,
    ),
  );

  return Object.freeze({
    valid:
      errors.length ===
      0,

    errors:
      Object.freeze([
        ...errors,
      ]),
  });
}

/* ============================================================================
 * 17. AVAILABLE-EVIDENCE DETECTION
 * ========================================================================== */

function hasAnyAvailableBehavioralEvidence(
  evidence:
    SearchBehavioralObservationEvidence,
): boolean {
  for (
    const fieldName of
    SEARCH_BEHAVIORAL_EVIDENCE_FIELD_NAMES
  ) {
    if (
      evidence[
        fieldName
      ].availability_state ===
        "AVAILABLE"
    ) {
      return true;
    }
  }

  return false;
}

/* ============================================================================
 * 18. CANONICAL BEHAVIORAL STATE PRODUCTION
 * ----------------------------------------------------------------------------
 * Behavioral state belongs exclusively to BEHAVIORAL_SIGNAL_DETECTION.
 *
 * No downstream consumer may derive this state locally.
 * ========================================================================== */

export function computeSearchBehavioralState(
  evidence:
    SearchBehavioralObservationEvidence,

  policy:
    SearchBehavioralSignalsSearchPolicy,
): SearchBehavioralState {
  if (
    !hasAnyAvailableBehavioralEvidence(
      evidence,
    )
  ) {
    return "UNAVAILABLE";
  }

  const calibrated =
    evidence.impressions
      .availability_state ===
      "AVAILABLE" &&
    evidence.impressions.value >=
      policy.minimum_impressions &&
    evidence.clicks
      .availability_state ===
      "AVAILABLE" &&
    evidence.observed_ctr
      .availability_state ===
      "AVAILABLE" &&
    evidence.sample_confidence
      .availability_state ===
      "AVAILABLE";

  if (calibrated) {
    return "CALIBRATED";
  }

  return "INSUFFICIENT_DATA";
}

/* ============================================================================
 * 19. CANONICAL VALIDATION STATE
 * ----------------------------------------------------------------------------
 * Evidence insufficiency is represented as an explicit DEGRADED producer
 * result rather than as rejected analytical truth.
 *
 * Structural input violations fail before output construction.
 * ========================================================================== */

function computeBehavioralValidationState(
  behavioralState:
    SearchBehavioralState,
): SearchValidationState {
  if (
    behavioralState ===
      "CALIBRATED"
  ) {
    return "VALID";
  }

  return "DEGRADED";
}

/* ============================================================================
 * 20. CANONICAL DEGRADATION REASONS
 * ----------------------------------------------------------------------------
 * Field-level unavailability already carries its own reason.
 *
 * This collection therefore records only the producer-level behavioral state
 * degradation and does not duplicate every field-level reason.
 * ========================================================================== */

function buildBehavioralDegradationReasons(
  behavioralState:
    SearchBehavioralState,
): readonly string[] {
  switch (
    behavioralState
  ) {
    case "CALIBRATED":
      return Object.freeze([]);

    case "INSUFFICIENT_DATA":
      return Object.freeze([
        "behavioral_evidence_insufficient_data",
      ]);

    case "UNAVAILABLE":
      return Object.freeze([
        "behavioral_evidence_unavailable",
      ]);
  }
}

/* ============================================================================
 * 21. OPTIONAL EVIDENCE IMMUTABLE COPY
 * ----------------------------------------------------------------------------
 * Behavioral evidence values are primitive identities in the current
 * contract.
 *
 * Copying protects the canonical output from mutation of the input evidence
 * containers without altering the underlying numerical truth.
 * ========================================================================== */

function freezeOptionalEvidence<T>(
  evidence:
    SearchOptionalEvidence<T>,
): SearchOptionalEvidence<T> {
  if (
    evidence.availability_state ===
      "AVAILABLE"
  ) {
    return Object.freeze({
      availability_state:
        "AVAILABLE",

      value:
        evidence.value,
    });
  }

  return Object.freeze({
    availability_state:
      evidence.availability_state,

    reason:
      evidence.reason,
  });
}

/* ============================================================================
 * 22. OUTPUT STRUCTURAL VALIDATION
 * ========================================================================== */

export function validateSearchBehavioralSignalsOutput(
  output:
    SearchBehavioralSignals,
): SearchBehavioralSignalsValidationResult {
  const errors:
    string[] =
    [];

  if (
    !isNonEmptyString(
      output.contract_version,
    )
  ) {
    errors.push(
      "output.contract_version must be a non-empty string.",
    );
  }

  if (
    !isValidIsoTimestamp(
      output.created_at,
    )
  ) {
    errors.push(
      "output.created_at must be a valid ISO timestamp.",
    );
  }

  if (
    !isNonEmptyString(
      output.document_id,
    )
  ) {
    errors.push(
      "output.document_id must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      output.query_id,
    )
  ) {
    errors.push(
      "output.query_id must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      output.minimum_impressions_policy_version,
    )
  ) {
    errors.push(
      "output.minimum_impressions_policy_version must be a non-empty string.",
    );
  }

  errors.push(
    ...validateCountEvidence(
      output.impressions,
      "output.impressions",
    ),

    ...validateCountEvidence(
      output.clicks,
      "output.clicks",
    ),

    ...validateUnitRatioEvidence(
      output.observed_ctr,
      "output.observed_ctr",
    ),

    ...validateUnitRatioEvidence(
      output.expected_ctr_at_position,
      "output.expected_ctr_at_position",
    ),

    ...validatePositionAdjustedCtrEvidence(
      output.position_adjusted_ctr,
    ),

    ...validateDurationEvidence(
      output.dwell_time_ms,
      "output.dwell_time_ms",
    ),

    ...validateUnitRatioEvidence(
      output.return_to_results_rate,
      "output.return_to_results_rate",
    ),

    ...validateConfidenceEvidence(
      output.sample_confidence,
      "output.sample_confidence",
    ),

    ...validateBehavioralEvidenceRelationships({
      impressions:
        output.impressions,

      clicks:
        output.clicks,

      observed_ctr:
        output.observed_ctr,

      expected_ctr_at_position:
        output.expected_ctr_at_position,

      position_adjusted_ctr:
        output.position_adjusted_ctr,

      dwell_time_ms:
        output.dwell_time_ms,

      return_to_results_rate:
        output.return_to_results_rate,

      sample_confidence:
        output.sample_confidence,
    }),
  );

  if (
    output.behavioral_state ===
      "UNAVAILABLE"
  ) {
    const outputEvidence:
      SearchBehavioralObservationEvidence = {
      impressions:
        output.impressions,

      clicks:
        output.clicks,

      observed_ctr:
        output.observed_ctr,

      expected_ctr_at_position:
        output.expected_ctr_at_position,

      position_adjusted_ctr:
        output.position_adjusted_ctr,

      dwell_time_ms:
        output.dwell_time_ms,

      return_to_results_rate:
        output.return_to_results_rate,

      sample_confidence:
        output.sample_confidence,
    };

    if (
      hasAnyAvailableBehavioralEvidence(
        outputEvidence,
      )
    ) {
      errors.push(
        "UNAVAILABLE behavioral_state cannot contain AVAILABLE behavioral evidence.",
      );
    }
  }

  if (
    output.behavioral_state ===
      "CALIBRATED"
  ) {
    if (
      output.impressions
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "CALIBRATED behavioral_state requires AVAILABLE impressions.",
      );
    }

    if (
      output.clicks
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "CALIBRATED behavioral_state requires AVAILABLE clicks.",
      );
    }

    if (
      output.observed_ctr
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "CALIBRATED behavioral_state requires AVAILABLE observed_ctr.",
      );
    }

    if (
      output.sample_confidence
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "CALIBRATED behavioral_state requires AVAILABLE sample_confidence.",
      );
    }
  }

  if (
    output.validation_state !==
      "VALID" &&
    output.validation_state !==
      "DEGRADED"
  ) {
    errors.push(
      "Canonical behavioral output validation_state must be VALID or DEGRADED.",
    );
  }

  if (
    output.validation_state ===
      "VALID" &&
    output.behavioral_state !==
      "CALIBRATED"
  ) {
    errors.push(
      "VALID behavioral output requires CALIBRATED behavioral_state.",
    );
  }

  if (
    output.validation_state ===
      "DEGRADED" &&
    output.behavioral_state ===
      "CALIBRATED"
  ) {
    errors.push(
      "CALIBRATED behavioral output must not be marked DEGRADED by this canonical producer.",
    );
  }

  if (
    output.validation_state ===
      "VALID" &&
    output.degradation_reasons.length >
      0
  ) {
    errors.push(
      "VALID behavioral output must not contain degradation_reasons.",
    );
  }

  if (
    output.validation_state ===
      "DEGRADED" &&
    output.degradation_reasons.length ===
      0
  ) {
    errors.push(
      "DEGRADED behavioral output requires at least one degradation_reason.",
    );
  }

  for (
    const [
      index,
      reason,
    ] of output.degradation_reasons.entries()
  ) {
    if (
      !isNonEmptyString(
        reason,
      )
    ) {
      errors.push(
        `output.degradation_reasons[${String(index)}] must be a non-empty string.`,
      );
    }
  }

  return Object.freeze({
    valid:
      errors.length ===
      0,

    errors:
      Object.freeze([
        ...errors,
      ]),
  });
}

/* ============================================================================
 * 23. CANONICAL PRODUCER
 * ----------------------------------------------------------------------------
 * Builds one immutable SearchBehavioralSignals contract.
 *
 * No numerical evidence is reconstructed.
 * ========================================================================== */

export function buildSearchBehavioralSignals(
  input:
    SearchBehavioralSignalsSearchInput,
): SearchBehavioralSignals {
  const inputValidation =
    validateSearchBehavioralSignalsInput(
      input,
    );

  if (
    !inputValidation.valid
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_BEHAVIORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Behavioral signal input rejected: " +
        inputValidation.errors.join(
          " | ",
        ),
    );
  }

  const behavioralState =
    computeSearchBehavioralState(
      input.evidence,
      input.policy,
    );

  const validationState =
    computeBehavioralValidationState(
      behavioralState,
    );

  const degradationReasons =
    buildBehavioralDegradationReasons(
      behavioralState,
    );

  const output:
    SearchBehavioralSignals =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_BEHAVIORAL_SIGNALS_CONTRACT_VERSION,

      created_at:
        input.created_at,

      document_id:
        input.document_id,

      query_id:
        input.query_id,

      behavioral_state:
        behavioralState,

      impressions:
        freezeOptionalEvidence(
          input.evidence.impressions,
        ),

      clicks:
        freezeOptionalEvidence(
          input.evidence.clicks,
        ),

      observed_ctr:
        freezeOptionalEvidence(
          input.evidence.observed_ctr,
        ),

      expected_ctr_at_position:
        freezeOptionalEvidence(
          input.evidence.expected_ctr_at_position,
        ),

      position_adjusted_ctr:
        freezeOptionalEvidence(
          input.evidence.position_adjusted_ctr,
        ),

      dwell_time_ms:
        freezeOptionalEvidence(
          input.evidence.dwell_time_ms,
        ),

      return_to_results_rate:
        freezeOptionalEvidence(
          input.evidence.return_to_results_rate,
        ),

      sample_confidence:
        freezeOptionalEvidence(
          input.evidence.sample_confidence,
        ),

      minimum_impressions_policy_version:
        input.policy.policy_version,

      validation_state:
        validationState,

      degradation_reasons:
        degradationReasons,
    });

  const outputValidation =
    validateSearchBehavioralSignalsOutput(
      output,
    );

  if (
    !outputValidation.valid
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_BEHAVIORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: canonical SearchBehavioralSignals output is invalid: " +
        outputValidation.errors.join(
          " | ",
        ),
    );
  }

  return output;
}

/* ============================================================================
 * 24. ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * Acceptance means:
 * - structural output validation succeeds;
 * - producer validation_state is VALID or DEGRADED.
 *
 * DEGRADED evidence remains legitimate canonical truth because explicit
 * insufficiency/unavailability is part of the Search contract.
 * ========================================================================== */

export function isSearchBehavioralSignalsAccepted(
  output:
    SearchBehavioralSignals,
): boolean {
  const validation =
    validateSearchBehavioralSignalsOutput(
      output,
    );

  if (
    !validation.valid
  ) {
    return false;
  }

  return (
    output.validation_state ===
      "VALID" ||
    output.validation_state ===
      "DEGRADED"
  );
}
