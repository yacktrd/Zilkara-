
/* ============================================================================
 * FILE: lib/xyvala/search/scoring/search-positive-score-assembler.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical positive score assembler
 *
 * ROLE
 * - consume canonical score vectors produced by specialized scoring engines
 * - preserve explicit optional score-vector evidence
 * - assemble the official SearchPositiveScoreVector
 * - preserve document, query, score and signal-family identities
 * - validate the scoring boundary without recalculating analytical values
 * - propagate upstream degradation explicitly
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ASSEMBLER
 * - SEARCH DOMAIN
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchIntrinsicDocumentScoreVector
 * - SearchQueryRelativeScoreVector
 * - SearchTemporalDocumentScoreVector
 * - SearchLinkAuthorityScoreVector
 * - SearchBehavioralCalibrationScoreVector
 * - SearchPositiveScoreVector
 * - SearchOptionalEvidence
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Xyvala Search penalty evaluation engine
 * - Xyvala Search analytical aggregation engine
 * - Xyvala Search eligibility engine
 * - Xyvala Search calibration engine
 * - Xyvala Search private snapshot builder
 *
 * DIRECTIVES
 * - assembly only
 * - validate before propagation
 * - preserve canonical score identities
 * - preserve intrinsic and query-relative boundaries
 * - preserve optional-evidence availability exactly
 * - no score calculation
 * - no score modification
 * - no confidence aggregation
 * - no confidence reconstruction
 * - no missing-score fabrication
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no neutral default injection
 * - no penalty evaluation
 * - no weighting
 * - no overlap adjustment
 * - no global aggregation
 * - no eligibility evaluation
 * - no cohort normalization
 * - no ranking
 * - no private decision
 * - no persistence
 * - no runtime mutation
 * - no implicit timestamp
 *
 * INPUTS
 * - SearchIntrinsicDocumentScoreVector
 * - SearchQueryRelativeScoreVector
 * - SearchTemporalDocumentScoreVector
 * - SearchOptionalEvidence<SearchLinkAuthorityScoreVector>
 * - SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector>
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - SearchPositiveScoreAssemblyResult
 * - SearchPositiveScoreVector
 *
 * INVARIANTS
 * - all available inputs belong to the same document
 * - all available query-relative inputs belong to the same query
 * - intrinsic scores do not carry a query identity
 * - link authority remains document-intrinsic
 * - behavioral calibration remains query-relative
 * - every available score preserves its canonical name
 * - every available score preserves its canonical signal family
 * - every available score object is propagated without analytical modification
 * - unavailable Link Authority evidence remains unavailable
 * - unavailable Behavioral Calibration evidence remains unavailable
 * - no score is inferred from another score
 * - no unavailable evidence is converted into a SearchSubScore
 * - rejected available upstream vectors do not cross the assembly boundary
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - document identity mismatch
 * - query identity mismatch
 * - intrinsic/query-relative boundary violations
 * - optional-evidence loss
 * - incorrect score-name propagation
 * - incorrect signal-family propagation
 * - missing-score fabrication
 * - rejected upstream propagation
 * ========================================================================== */

import type {
  SearchBehavioralCalibrationScoreVector,
  SearchContractVersion,
  SearchDocumentId,
  SearchIntrinsicDocumentScoreVector,
  SearchIsoTimestamp,
  SearchLinkAuthorityScoreVector,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPositiveScoreVector,
  SearchQueryId,
  SearchQueryRelativeScoreVector,
  SearchScoreName,
  SearchSignalFamily,
  SearchSubScore,
  SearchTemporalDocumentScoreVector,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME =
  "xyvala-search-positive-score-assembler" as const;

export const XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_VERSION:
  SearchModuleVersion = "1.2.0";

export const XYVALA_SEARCH_POSITIVE_SCORE_VECTOR_CONTRACT_VERSION:
  SearchContractVersion = "2.1.0";

/* ============================================================================
 * 2. ASSEMBLER INPUT
 * ----------------------------------------------------------------------------
 * Specialized scoring engines remain the exclusive producers of SearchSubScore
 * analytical truth.
 *
 * Intrinsic, temporal and query-relative scorers always transport their
 * canonical vector contracts.
 *
 * Link Authority and Behavioral Calibration may legitimately produce
 * non-AVAILABLE SearchOptionalEvidence instead of a score vector.
 *
 * This assembler must preserve that distinction exactly.
 * ========================================================================== */

export interface SearchPositiveScoreAssemblerInput {
  readonly intrinsic_document_scores:
    SearchIntrinsicDocumentScoreVector;

  readonly query_relative_scores:
    SearchQueryRelativeScoreVector;

  readonly temporal_document_scores:
    SearchTemporalDocumentScoreVector;

  /**
   * Canonical Link Authority scoring evidence.
   *
   * AVAILABLE:
   * - contains the exact SearchLinkAuthorityScoreVector produced by
   *   LINK_AUTHORITY_SCORING.
   *
   * Non-AVAILABLE:
   * - no canonical Link Authority score vector exists;
   * - no SearchSubScore may be created here.
   */
  readonly link_authority_scores:
    SearchOptionalEvidence<
      SearchLinkAuthorityScoreVector
    >;

  /**
   * Canonical Behavioral Calibration scoring evidence.
   *
   * AVAILABLE:
   * - contains the exact SearchBehavioralCalibrationScoreVector produced by
   *   BEHAVIORAL_CALIBRATION_SCORING.
   *
   * Non-AVAILABLE:
   * - no canonical Behavioral Calibration score vector exists;
   * - no SearchSubScore may be created here.
   */
  readonly behavioral_calibration_scores:
    SearchOptionalEvidence<
      SearchBehavioralCalibrationScoreVector
    >;

  /**
   * Deterministic timestamp supplied by the authorized orchestrator.
   *
   * The assembler must never read the runtime clock itself.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 3. ASSEMBLY RESULT
 * ----------------------------------------------------------------------------
 * Validation metadata remains separate from SearchPositiveScoreVector.
 *
 * The canonical vector transports score evidence only.
 *
 * It does not become an alternative source of analytical confidence truth.
 * ========================================================================== */

export interface SearchPositiveScoreAssemblyResult {
  readonly positive_score_vector:
    SearchPositiveScoreVector;

  readonly assembler_module_name:
    typeof XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME;

  readonly assembler_module_version:
    SearchModuleVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 4. EXPECTATION GOVERNANCE
 * ========================================================================== */

type SearchScoreQueryScope =
  | "INTRINSIC"
  | "QUERY_RELATIVE";

interface SearchScoreExpectation {
  readonly score:
    SearchSubScore;

  readonly expected_score_name:
    SearchScoreName;

  readonly expected_signal_family:
    SearchSignalFamily;

  readonly query_scope:
    SearchScoreQueryScope;
}

/* ============================================================================
 * 5. CONTRACT ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value: string,
  fieldName: string,
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must not be empty.`,
    );
  }
}

function assertValidIsoTimestamp(
  value: SearchIsoTimestamp,
  fieldName: string,
): void {
  assertNonEmptyString(
    value,
    fieldName,
  );

  const parsedTimestamp =
    Date.parse(value);

  if (!Number.isFinite(parsedTimestamp)) {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertNormalizedScore(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between 0 and 1.`,
    );
  }
}

function assertUpstreamVectorNotRejected(
  vectorName: string,
  validationState: SearchValidationState,
): void {
  if (validationState === "REJECTED") {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        `Boundary rejection: ${vectorName} has validation_state REJECTED.`,
    );
  }
}

/* ============================================================================
 * 6. REQUIRED VECTOR-LEVEL VALIDATION
 * ========================================================================== */

function validateIntrinsicDocumentScoreVector(
  vector: SearchIntrinsicDocumentScoreVector,
): void {
  assertNonEmptyString(
    vector.contract_version,
    "intrinsic_document_scores.contract_version",
  );

  assertValidIsoTimestamp(
    vector.created_at,
    "intrinsic_document_scores.created_at",
  );

  assertNonEmptyString(
    vector.document_id,
    "intrinsic_document_scores.document_id",
  );

  assertNonEmptyString(
    vector.scorer_module_version,
    "intrinsic_document_scores.scorer_module_version",
  );

  assertNonEmptyString(
    vector.scoring_policy_version,
    "intrinsic_document_scores.scoring_policy_version",
  );

  assertUpstreamVectorNotRejected(
    "SearchIntrinsicDocumentScoreVector",
    vector.validation_state,
  );
}

function validateQueryRelativeScoreVector(
  vector: SearchQueryRelativeScoreVector,
): void {
  assertNonEmptyString(
    vector.contract_version,
    "query_relative_scores.contract_version",
  );

  assertValidIsoTimestamp(
    vector.created_at,
    "query_relative_scores.created_at",
  );

  assertNonEmptyString(
    vector.document_id,
    "query_relative_scores.document_id",
  );

  assertNonEmptyString(
    vector.query_id,
    "query_relative_scores.query_id",
  );

  assertNonEmptyString(
    vector.scorer_module_version,
    "query_relative_scores.scorer_module_version",
  );

  assertNonEmptyString(
    vector.scoring_policy_version,
    "query_relative_scores.scoring_policy_version",
  );

  assertUpstreamVectorNotRejected(
    "SearchQueryRelativeScoreVector",
    vector.validation_state,
  );
}

function validateTemporalDocumentScoreVector(
  vector: SearchTemporalDocumentScoreVector,
): void {
  assertNonEmptyString(
    vector.contract_version,
    "temporal_document_scores.contract_version",
  );

  assertValidIsoTimestamp(
    vector.created_at,
    "temporal_document_scores.created_at",
  );

  assertNonEmptyString(
    vector.document_id,
    "temporal_document_scores.document_id",
  );

  assertNonEmptyString(
    vector.scorer_module_version,
    "temporal_document_scores.scorer_module_version",
  );

  assertNonEmptyString(
    vector.scoring_policy_version,
    "temporal_document_scores.scoring_policy_version",
  );

  assertUpstreamVectorNotRejected(
    "SearchTemporalDocumentScoreVector",
    vector.validation_state,
  );
}

/* ============================================================================
 * 7. OPTIONAL EVIDENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Availability belongs to upstream producers.
 *
 * This assembler validates the availability envelope but does not transform
 * a non-AVAILABLE state into a numerical score.
 * ========================================================================== */

function validateUnavailableEvidence(
  evidence: {
    readonly availability_state:
      | "UNAVAILABLE"
      | "INSUFFICIENT_DATA"
      | "INSUFFICIENT_HISTORY"
      | "UNSUPPORTED"
      | "INVALID";

    readonly reason:
      string;
  },
  fieldName: string,
): void {
  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

function validateLinkAuthorityScoreEvidence(
  evidence:
    SearchOptionalEvidence<
      SearchLinkAuthorityScoreVector
    >,
): void {
  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    validateUnavailableEvidence(
      evidence,
      "link_authority_scores",
    );

    return;
  }

  const vector =
    evidence.value;

  assertNonEmptyString(
    vector.contract_version,
    "link_authority_scores.value.contract_version",
  );

  assertValidIsoTimestamp(
    vector.created_at,
    "link_authority_scores.value.created_at",
  );

  assertNonEmptyString(
    vector.document_id,
    "link_authority_scores.value.document_id",
  );

  assertNonEmptyString(
    vector.scorer_module_version,
    "link_authority_scores.value.scorer_module_version",
  );

  assertNonEmptyString(
    vector.scoring_policy_version,
    "link_authority_scores.value.scoring_policy_version",
  );

  assertUpstreamVectorNotRejected(
    "SearchLinkAuthorityScoreVector",
    vector.validation_state,
  );
}

function validateBehavioralCalibrationScoreEvidence(
  evidence:
    SearchOptionalEvidence<
      SearchBehavioralCalibrationScoreVector
    >,
): void {
  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    validateUnavailableEvidence(
      evidence,
      "behavioral_calibration_scores",
    );

    return;
  }

  const vector =
    evidence.value;

  assertNonEmptyString(
    vector.contract_version,
    "behavioral_calibration_scores.value.contract_version",
  );

  assertValidIsoTimestamp(
    vector.created_at,
    "behavioral_calibration_scores.value.created_at",
  );

  assertNonEmptyString(
    vector.document_id,
    "behavioral_calibration_scores.value.document_id",
  );

  assertNonEmptyString(
    vector.query_id,
    "behavioral_calibration_scores.value.query_id",
  );

  assertNonEmptyString(
    vector.scorer_module_version,
    "behavioral_calibration_scores.value.scorer_module_version",
  );

  assertNonEmptyString(
    vector.scoring_policy_version,
    "behavioral_calibration_scores.value.scoring_policy_version",
  );

  assertUpstreamVectorNotRejected(
    "SearchBehavioralCalibrationScoreVector",
    vector.validation_state,
  );
}

/* ============================================================================
 * 8. SCOPE VALIDATION
 * ========================================================================== */

function resolveCanonicalDocumentId(
  input: SearchPositiveScoreAssemblerInput,
): SearchDocumentId {
  const canonicalDocumentId =
    input.intrinsic_document_scores.document_id;

  assertNonEmptyString(
    canonicalDocumentId,
    "canonical_document_id",
  );

  const requiredDocumentIds = [
    input.query_relative_scores.document_id,
    input.temporal_document_scores.document_id,
  ] as const;

  for (
    const documentId of
    requiredDocumentIds
  ) {
    assertNonEmptyString(
      documentId,
      "document_id",
    );

    if (
      documentId !==
      canonicalDocumentId
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
          "Boundary violation: all required score vectors must belong to the same document.",
      );
    }
  }

  if (
    input.link_authority_scores
      .availability_state ===
    "AVAILABLE"
  ) {
    const documentId =
      input.link_authority_scores
        .value
        .document_id;

    assertNonEmptyString(
      documentId,
      "link_authority_scores.value.document_id",
    );

    if (
      documentId !==
      canonicalDocumentId
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
          "Boundary violation: available Link Authority evidence belongs to a different document.",
      );
    }
  }

  if (
    input.behavioral_calibration_scores
      .availability_state ===
    "AVAILABLE"
  ) {
    const documentId =
      input.behavioral_calibration_scores
        .value
        .document_id;

    assertNonEmptyString(
      documentId,
      "behavioral_calibration_scores.value.document_id",
    );

    if (
      documentId !==
      canonicalDocumentId
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
          "Boundary violation: available Behavioral Calibration evidence belongs to a different document.",
      );
    }
  }

  return canonicalDocumentId;
}

function resolveCanonicalQueryId(
  input: SearchPositiveScoreAssemblerInput,
): SearchQueryId {
  const canonicalQueryId =
    input.query_relative_scores.query_id;

  assertNonEmptyString(
    canonicalQueryId,
    "canonical_query_id",
  );

  if (
    input.behavioral_calibration_scores
      .availability_state !==
    "AVAILABLE"
  ) {
    return canonicalQueryId;
  }

  const behavioralQueryId =
    input.behavioral_calibration_scores
      .value
      .query_id;

  assertNonEmptyString(
    behavioralQueryId,
    "behavioral_calibration_scores.value.query_id",
  );

  if (
    behavioralQueryId !==
    canonicalQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        "Boundary violation: available Behavioral Calibration evidence belongs to a different query.",
    );
  }

  return canonicalQueryId;
}

/* ============================================================================
 * 9. SUB-SCORE VALIDATION
 * ========================================================================== */

function validateSubScoreBase(
  score: SearchSubScore,
  fieldName: string,
): void {
  assertNonEmptyString(
    score.contract_version,
    `${fieldName}.contract_version`,
  );

  assertValidIsoTimestamp(
    score.created_at,
    `${fieldName}.created_at`,
  );

  assertNonEmptyString(
    score.document_id,
    `${fieldName}.document_id`,
  );

  assertNonEmptyString(
    score.score_name,
    `${fieldName}.score_name`,
  );

  assertNonEmptyString(
    score.signal_family,
    `${fieldName}.signal_family`,
  );

  assertNormalizedScore(
    score.value,
    `${fieldName}.value`,
  );

  assertNormalizedScore(
    score.confidence,
    `${fieldName}.confidence`,
  );

  assertNonEmptyString(
    score.overlap_group,
    `${fieldName}.overlap_group`,
  );

  assertNonEmptyString(
    score.method,
    `${fieldName}.method`,
  );

  assertNonEmptyString(
    score.module_name,
    `${fieldName}.module_name`,
  );

  assertNonEmptyString(
    score.module_version,
    `${fieldName}.module_version`,
  );
}

function validateScoreExpectation(
  expectation:
    SearchScoreExpectation,
  canonicalDocumentId:
    SearchDocumentId,
  canonicalQueryId:
    SearchQueryId,
): void {
  const fieldName =
    expectation.expected_score_name;

  validateSubScoreBase(
    expectation.score,
    fieldName,
  );

  if (
    expectation.score.document_id !==
    canonicalDocumentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} belongs to a different document.`,
    );
  }

  if (
    expectation.score.score_name !==
    expectation.expected_score_name
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        `Contract violation: expected ${expectation.expected_score_name}, ` +
        `received ${expectation.score.score_name}.`,
    );
  }

  if (
    expectation.score.signal_family !==
    expectation.expected_signal_family
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must belong to ` +
        `${expectation.expected_signal_family}.`,
    );
  }

  if (
    expectation.query_scope ===
    "INTRINSIC"
  ) {
    if (
      expectation.score.query_id !==
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
          `Boundary violation: ${fieldName} must remain query-independent.`,
      );
    }

    return;
  }

  if (
    expectation.score.query_id ===
    undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be query-relative.`,
    );
  }

  assertNonEmptyString(
    expectation.score.query_id,
    `${fieldName}.query_id`,
  );

  if (
    expectation.score.query_id !==
    canonicalQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} belongs to a different query.`,
    );
  }
}

/* ============================================================================
 * 10. CANONICAL SCORE EXPECTATIONS
 * ----------------------------------------------------------------------------
 * Required intrinsic scores:
 * - lexical
 * - anchor
 * - occurrence
 * - frequency
 * - convergence
 * - document quality
 *
 * Required temporal scores:
 * - correlation
 * - duration
 *
 * Required query-relative score:
 * - query relevance
 *
 * Optional producer-owned scores:
 * - link authority
 * - behavioral calibration
 *
 * Optional scores enter the expectation set only when their upstream vector is
 * AVAILABLE.
 *
 * Non-AVAILABLE evidence does not create a SearchScoreExpectation because no
 * canonical SearchSubScore exists.
 * ========================================================================== */

function buildScoreExpectations(
  input: SearchPositiveScoreAssemblerInput,
): readonly SearchScoreExpectation[] {
  const expectations:
    SearchScoreExpectation[] = [
      {
        score:
          input
            .intrinsic_document_scores
            .lexical_score,

        expected_score_name:
          "lexical_score",

        expected_signal_family:
          "LEXICAL",

        query_scope:
          "INTRINSIC",
      },
      {
        score:
          input
            .intrinsic_document_scores
            .anchor_score,

        expected_score_name:
          "anchor_score",

        expected_signal_family:
          "ANCHOR",

        query_scope:
          "INTRINSIC",
      },
      {
        score:
          input
            .intrinsic_document_scores
            .occurrence_score,

        expected_score_name:
          "occurrence_score",

        expected_signal_family:
          "OCCURRENCE",

        query_scope:
          "INTRINSIC",
      },
      {
        score:
          input
            .intrinsic_document_scores
            .frequency_score,

        expected_score_name:
          "frequency_score",

        expected_signal_family:
          "FREQUENCY",

        query_scope:
          "INTRINSIC",
      },
      {
        score:
          input
            .intrinsic_document_scores
            .convergence_score,

        expected_score_name:
          "convergence_score",

        expected_signal_family:
          "CONVERGENCE",

        query_scope:
          "INTRINSIC",
      },
      {
        score:
          input
            .temporal_document_scores
            .correlation_score,

        expected_score_name:
          "correlation_score",

        expected_signal_family:
          "EVOLUTION",

        query_scope:
          "INTRINSIC",
      },
      {
        score:
          input
            .temporal_document_scores
            .duration_score,

        expected_score_name:
          "duration_score",

        expected_signal_family:
          "DURATION",

        query_scope:
          "INTRINSIC",
      },
      {
        score:
          input
            .query_relative_scores
            .query_relevance_score,

        expected_score_name:
          "query_relevance_score",

        expected_signal_family:
          "QUERY_RELEVANCE",

        query_scope:
          "QUERY_RELATIVE",
      },
      {
        score:
          input
            .intrinsic_document_scores
            .document_quality_score,

        expected_score_name:
          "document_quality_score",

        expected_signal_family:
          "DOCUMENT_QUALITY",

        query_scope:
          "INTRINSIC",
      },
    ];

  if (
    input.link_authority_scores
      .availability_state ===
    "AVAILABLE"
  ) {
    expectations.push({
      score:
        input
          .link_authority_scores
          .value
          .link_authority_score,

      expected_score_name:
        "link_authority_score",

      expected_signal_family:
        "LINK_AUTHORITY",

      query_scope:
        "INTRINSIC",
    });
  }

  if (
    input.behavioral_calibration_scores
      .availability_state ===
    "AVAILABLE"
  ) {
    expectations.push({
      score:
        input
          .behavioral_calibration_scores
          .value
          .behavioral_calibration_score,

      expected_score_name:
        "behavioral_calibration_score",

      expected_signal_family:
        "BEHAVIORAL_CALIBRATION",

      query_scope:
        "QUERY_RELATIVE",
    });
  }

  return Object.freeze(
    [...expectations],
  );
}

/* ============================================================================
 * 11. OPTIONAL SCORE PROJECTION
 * ----------------------------------------------------------------------------
 * These functions perform transport projection only.
 *
 * AVAILABLE vector evidence:
 * - the exact producer-owned SearchSubScore reference is transported.
 *
 * Non-AVAILABLE vector evidence:
 * - the exact non-AVAILABLE envelope is propagated.
 *
 * No analytical value is created here.
 * ========================================================================== */

function projectLinkAuthorityScoreEvidence(
  evidence:
    SearchOptionalEvidence<
      SearchLinkAuthorityScoreVector
    >,
): SearchOptionalEvidence<SearchSubScore> {
  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    return evidence;
  }

  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value:
      evidence
        .value
        .link_authority_score,
  });
}

function projectBehavioralCalibrationScoreEvidence(
  evidence:
    SearchOptionalEvidence<
      SearchBehavioralCalibrationScoreVector
    >,
): SearchOptionalEvidence<SearchSubScore> {
  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    return evidence;
  }

  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value:
      evidence
        .value
        .behavioral_calibration_score,
  });
}

/* ============================================================================
 * 12. VALIDATION-STATE PROPAGATION
 * ----------------------------------------------------------------------------
 * The assembler reports upstream degradation and explicit optional-evidence
 * incompleteness.
 *
 * It does not derive analytical confidence and does not alter scores.
 *
 * Non-AVAILABLE optional scoring evidence is DEGRADED analytical completeness,
 * not a fabricated REJECTED score.
 * ========================================================================== */

function resolveAssemblyValidationState(args: {
  readonly intrinsic_state:
    SearchValidationState;

  readonly query_state:
    SearchValidationState;

  readonly temporal_state:
    SearchValidationState;

  readonly link_authority_scores:
    SearchOptionalEvidence<
      SearchLinkAuthorityScoreVector
    >;

  readonly behavioral_calibration_scores:
    SearchOptionalEvidence<
      SearchBehavioralCalibrationScoreVector
    >;

  readonly scores:
    readonly SearchSubScore[];
}): SearchValidationState {
  const requiredUpstreamStates = [
    args.intrinsic_state,
    args.query_state,
    args.temporal_state,
  ] as const;

  if (
    requiredUpstreamStates.some(
      (state) =>
        state === "REJECTED",
    )
  ) {
    return "REJECTED";
  }

  const availableOptionalStates:
    SearchValidationState[] = [];

  if (
    args.link_authority_scores
      .availability_state ===
    "AVAILABLE"
  ) {
    availableOptionalStates.push(
      args
        .link_authority_scores
        .value
        .validation_state,
    );
  }

  if (
    args.behavioral_calibration_scores
      .availability_state ===
    "AVAILABLE"
  ) {
    availableOptionalStates.push(
      args
        .behavioral_calibration_scores
        .value
        .validation_state,
    );
  }

  if (
    availableOptionalStates.some(
      (state) =>
        state === "REJECTED",
    )
  ) {
    return "REJECTED";
  }

  if (
    requiredUpstreamStates.some(
      (state) =>
        state === "DEGRADED" ||
        state === "UNVALIDATED",
    )
  ) {
    return "DEGRADED";
  }

  if (
    availableOptionalStates.some(
      (state) =>
        state === "DEGRADED" ||
        state === "UNVALIDATED",
    )
  ) {
    return "DEGRADED";
  }

  if (
    args.link_authority_scores
      .availability_state !==
      "AVAILABLE" ||
    args.behavioral_calibration_scores
      .availability_state !==
      "AVAILABLE"
  ) {
    return "DEGRADED";
  }

  if (
    args.scores.some(
      (score) =>
        score.missing_data.length > 0 ||
        score.confidence < 1,
    )
  ) {
    return "DEGRADED";
  }

  return "VALID";
}

/* ============================================================================
 * 13. DEGRADATION REASON PROPAGATION
 * ========================================================================== */

function collectAssemblyDegradationReasons(args: {
  readonly intrinsic_scores:
    SearchIntrinsicDocumentScoreVector;

  readonly query_scores:
    SearchQueryRelativeScoreVector;

  readonly temporal_scores:
    SearchTemporalDocumentScoreVector;

  readonly link_authority_scores:
    SearchOptionalEvidence<
      SearchLinkAuthorityScoreVector
    >;

  readonly behavioral_calibration_scores:
    SearchOptionalEvidence<
      SearchBehavioralCalibrationScoreVector
    >;

  readonly scores:
    readonly SearchSubScore[];
}): readonly string[] {
  const reasons =
    new Set<string>();

  for (
    const reason of
    args.intrinsic_scores
      .degradation_reasons
  ) {
    reasons.add(
      `INTRINSIC_DOCUMENT_SCORING:${reason}`,
    );
  }

  for (
    const reason of
    args.query_scores
      .degradation_reasons
  ) {
    reasons.add(
      `QUERY_RELEVANCE_SCORING:${reason}`,
    );
  }

  for (
    const reason of
    args.temporal_scores
      .degradation_reasons
  ) {
    reasons.add(
      `TEMPORAL_DOCUMENT_SCORING:${reason}`,
    );
  }

  if (
    args.link_authority_scores
      .availability_state ===
    "AVAILABLE"
  ) {
    for (
      const reason of
      args
        .link_authority_scores
        .value
        .degradation_reasons
    ) {
      reasons.add(
        `LINK_AUTHORITY_SCORING:${reason}`,
      );
    }
  } else {
    reasons.add(
      `LINK_AUTHORITY_SCORING:` +
        `${args.link_authority_scores.availability_state}:` +
        `${args.link_authority_scores.reason}`,
    );
  }

  if (
    args.behavioral_calibration_scores
      .availability_state ===
    "AVAILABLE"
  ) {
    for (
      const reason of
      args
        .behavioral_calibration_scores
        .value
        .degradation_reasons
    ) {
      reasons.add(
        `BEHAVIORAL_CALIBRATION_SCORING:${reason}`,
      );
    }
  } else {
    reasons.add(
      `BEHAVIORAL_CALIBRATION_SCORING:` +
        `${args.behavioral_calibration_scores.availability_state}:` +
        `${args.behavioral_calibration_scores.reason}`,
    );
  }

  for (
    const score of
    args.scores
  ) {
    if (
      score.confidence < 1
    ) {
      reasons.add(
        `POSITIVE_SCORE_ASSEMBLY:` +
          `${score.score_name}:REDUCED_CONFIDENCE`,
      );
    }

    for (
      const missingData of
      score.missing_data
    ) {
      reasons.add(
        `POSITIVE_SCORE_ASSEMBLY:` +
          `${score.score_name}:` +
          `${missingData}`,
      );
    }
  }

  return Object.freeze(
    [...reasons].sort(),
  );
}

/* ============================================================================
 * 14. IMMUTABLE VECTOR ASSEMBLY
 * ----------------------------------------------------------------------------
 * Existing SearchSubScore objects are referenced directly.
 *
 * Optional availability is projected without analytical reconstruction.
 *
 * The assembler does not rewrite:
 * - value
 * - confidence
 * - source_features
 * - overlap_group
 * - method
 * - module identity
 * - parameters
 * - missing_data
 * - explanation
 * - upstream non-AVAILABLE reason
 * ========================================================================== */

function buildPositiveScoreVector(args: {
  readonly input:
    SearchPositiveScoreAssemblerInput;

  readonly document_id:
    SearchDocumentId;

  readonly query_id:
    SearchQueryId;
}): SearchPositiveScoreVector {
  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_POSITIVE_SCORE_VECTOR_CONTRACT_VERSION,

    created_at:
      args.input.created_at,

    document_id:
      args.document_id,

    query_id:
      args.query_id,

    lexical_score:
      args.input
        .intrinsic_document_scores
        .lexical_score,

    anchor_score:
      args.input
        .intrinsic_document_scores
        .anchor_score,

    occurrence_score:
      args.input
        .intrinsic_document_scores
        .occurrence_score,

    frequency_score:
      args.input
        .intrinsic_document_scores
        .frequency_score,

    convergence_score:
      args.input
        .intrinsic_document_scores
        .convergence_score,

    correlation_score:
      args.input
        .temporal_document_scores
        .correlation_score,

    duration_score:
      args.input
        .temporal_document_scores
        .duration_score,

    query_relevance_score:
      args.input
        .query_relative_scores
        .query_relevance_score,

    link_authority_score:
      projectLinkAuthorityScoreEvidence(
        args.input.link_authority_scores,
      ),

    behavioral_calibration_score:
      projectBehavioralCalibrationScoreEvidence(
        args.input
          .behavioral_calibration_scores,
      ),

    document_quality_score:
      args.input
        .intrinsic_document_scores
        .document_quality_score,
  });
}

/* ============================================================================
 * 15. PUBLIC COMPUTE FUNCTION
 * ----------------------------------------------------------------------------
 * Pure deterministic assembly boundary.
 *
 * This function:
 * - validates required upstream vector contracts;
 * - validates available optional score-vector contracts;
 * - preserves non-AVAILABLE optional score evidence;
 * - validates document and query identities;
 * - validates intrinsic/query-relative separation;
 * - validates canonical score names and signal families;
 * - assembles SearchPositiveScoreVector;
 * - propagates explicit degradation metadata.
 *
 * It performs no:
 * - score calculation;
 * - score fabrication;
 * - unavailable-to-zero conversion;
 * - unavailable-to-neutral conversion;
 * - confidence aggregation;
 * - weighting;
 * - overlap adjustment;
 * - penalty evaluation;
 * - global aggregation;
 * - persistence;
 * - ranking;
 * - decision;
 * - runtime mutation.
 * ========================================================================== */

export function assembleSearchPositiveScoreVector(
  input:
    SearchPositiveScoreAssemblerInput,
): SearchPositiveScoreAssemblyResult {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validateIntrinsicDocumentScoreVector(
    input.intrinsic_document_scores,
  );

  validateQueryRelativeScoreVector(
    input.query_relative_scores,
  );

  validateTemporalDocumentScoreVector(
    input.temporal_document_scores,
  );

  validateLinkAuthorityScoreEvidence(
    input.link_authority_scores,
  );

  validateBehavioralCalibrationScoreEvidence(
    input.behavioral_calibration_scores,
  );

  const canonicalDocumentId =
    resolveCanonicalDocumentId(input);

  const canonicalQueryId =
    resolveCanonicalQueryId(input);

  const scoreExpectations =
    buildScoreExpectations(input);

  for (
    const expectation of
    scoreExpectations
  ) {
    validateScoreExpectation(
      expectation,
      canonicalDocumentId,
      canonicalQueryId,
    );
  }

  const scores =
    Object.freeze(
      scoreExpectations.map(
        (expectation) =>
          expectation.score,
      ),
    );

  const positiveScoreVector =
    buildPositiveScoreVector({
      input,

      document_id:
        canonicalDocumentId,

      query_id:
        canonicalQueryId,
    });

  const validationState =
    resolveAssemblyValidationState({
      intrinsic_state:
        input
          .intrinsic_document_scores
          .validation_state,

      query_state:
        input
          .query_relative_scores
          .validation_state,

      temporal_state:
        input
          .temporal_document_scores
          .validation_state,

      link_authority_scores:
        input.link_authority_scores,

      behavioral_calibration_scores:
        input.behavioral_calibration_scores,

      scores,
    });

  const degradationReasons =
    collectAssemblyDegradationReasons({
      intrinsic_scores:
        input.intrinsic_document_scores,

      query_scores:
        input.query_relative_scores,

      temporal_scores:
        input.temporal_document_scores,

      link_authority_scores:
        input.link_authority_scores,

      behavioral_calibration_scores:
        input.behavioral_calibration_scores,

      scores,
    });

  return Object.freeze({
    positive_score_vector:
      positiveScoreVector,

    assembler_module_name:
      XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_NAME,

    assembler_module_version:
      XYVALA_SEARCH_POSITIVE_SCORE_ASSEMBLER_MODULE_VERSION,

    validation_state:
      validationState,

    degradation_reasons:
      degradationReasons,
  });
}
