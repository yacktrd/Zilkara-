/* ============================================================================
 * FILE: lib/xyvala/search/snapshot/search-private-snapshot-builder.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical private snapshot builder
 *
 * ROLE
 * - consume validated canonical private Search truths
 * - validate document, query, cohort and distribution lineage
 * - validate canonical upstream object-reference consistency
 * - validate mandatory and optional score-vector boundaries
 * - preserve explicit unavailable evidence
 * - validate deterministic temporal causality
 * - validate traceability and variable lineage
 * - assemble the canonical SearchPrivateDocumentSnapshot
 * - establish the immutable private boundary before public transformation
 *
 * CLASSIFICATION
 * - PRIVATE SNAPSHOT BUILDER
 * - SEARCH DOMAIN
 * - PRIVATE_SNAPSHOT
 * - VALIDATE / ASSEMBLE
 * - PURE
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-MUTATING
 * - NON-PUBLIC
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchPrivateDocumentSnapshot
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage Registry
 * - Boundary Protection System
 * - Public Exposure Governance System
 *
 * DIRECTIVES
 * - snapshot assembly only
 * - validate before assembly
 * - preserve canonical producer truth
 * - preserve canonical object references where reference identity matters
 * - preserve explicit unavailable evidence
 * - preserve canonical identities
 * - preserve deterministic temporal causality
 * - no acquisition reconstruction
 * - no documentary reconstruction
 * - no signal reconstruction
 * - no score reconstruction
 * - no penalty reconstruction
 * - no analytical aggregation
 * - no eligibility reconstruction
 * - no cohort normalization
 * - no relative-cohort reconstruction
 * - no private-decision reconstruction
 * - no calibration
 * - no public transformation
 * - no public ranking
 * - no persistence
 * - no event publication
 * - no logging
 * - no runtime mutation
 * - no local clock access
 * - no random snapshot identifier generation
 * - no missing-data reconstruction
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 *
 * SCORE-VECTOR BOUNDARY
 * ----------------------------------------------------------------------------
 * Mandatory canonical score vectors:
 * - SearchIntrinsicDocumentScoreVector
 * - SearchTemporalDocumentScoreVector
 * - SearchQueryRelativeScoreVector
 *
 * Explicit optional score-vector evidence:
 * - SearchOptionalEvidence<SearchLinkAuthorityScoreVector>
 * - SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector>
 *
 * OPTIONAL means:
 * - AVAILABLE transports the exact canonical vector;
 * - non-AVAILABLE transports absence explicitly;
 * - this builder never synthesizes a replacement vector.
 *
 * INVARIANTS
 * - one snapshot belongs to exactly one document
 * - one snapshot belongs to exactly one query
 * - one snapshot belongs to exactly one cohort
 * - source metadata originates from acquisition truth
 * - every mandatory score vector exists canonically
 * - unavailable optional score-vector evidence remains unavailable
 * - global score references exact canonical positive and penalty vectors
 * - relative evaluation is never fabricated
 * - normalized-score bounds follow the canonical distribution method
 * - normalized scores are never recalculated, clamped or replaced
 * - private decision references canonical eligibility and relative evidence
 * - no REJECTED upstream contract crosses the snapshot boundary
 * - snapshot timestamp never predates transported upstream truth
 * - duplicate trace IDs are forbidden
 * - duplicate variable identities are forbidden
 * - variable-lineage producer layer must start its propagation path
 * - snapshot validation never repairs upstream truth
 * - visibility is always PRIVATE
 * ========================================================================== */

import type {
  SearchAnchorSignals,
  SearchBehavioralCalibrationScoreVector,
  SearchBehavioralSignals,
  SearchCohortDefinition,
  SearchCohortDistribution,
  SearchCohortId,
  SearchContextAggregation,
  SearchContractVersion,
  SearchDocumentId,
  SearchEligibilityResult,
  SearchExtractedDocument,
  SearchFrequencySignals,
  SearchGlobalScore,
  SearchIntrinsicDocumentScoreVector,
  SearchIsoTimestamp,
  SearchLexicalDocument,
  SearchLinkAuthorityScoreVector,
  SearchLinkSignals,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPenaltyVector,
  SearchPositiveScoreVector,
  SearchPrivateDecision,
  SearchPrivateDocumentSnapshot,
  SearchQueryDocumentSignals,
  SearchQueryId,
  SearchQueryRelativeScoreVector,
  SearchRelativeEvaluationContext,
  SearchSegmentedDocument,
  SearchSnapshotVersion,
  SearchTemporalDocumentScoreVector,
  SearchTemporalSignals,
  SearchTraceRecord,
  SearchValidationState,
  SearchVariableLineage,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME =
  "xyvala-search-private-snapshot-builder" as const;

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_VERSION:
  SearchModuleVersion = "1.2.1";

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_CONTRACT_VERSION:
  SearchContractVersion = "2.0.0";

/* ============================================================================
 * 2. RAW DOCUMENT REFERENCE
 * ----------------------------------------------------------------------------
 * Reuse the canonical snapshot property contract directly.
 *
 * This prevents a parallel local definition from drifting away from
 * SearchPrivateDocumentSnapshot.
 * ========================================================================== */

export type SearchPrivateSnapshotRawDocumentReference =
  SearchPrivateDocumentSnapshot["raw_document_reference"];

/* ============================================================================
 * 3. BUILDER INPUT
 * ----------------------------------------------------------------------------
 * This input transports upstream truth only.
 *
 * It is not an alternative analytical contract.
 * ========================================================================== */

export interface SearchPrivateSnapshotBuilderInput {
  readonly snapshot_id:
    string;

  readonly snapshot_version:
    SearchSnapshotVersion;

  readonly created_at:
    SearchIsoTimestamp;

  readonly document_id:
    SearchDocumentId;

  readonly query_id:
    SearchQueryId;

  readonly cohort_id:
    SearchCohortId;

  readonly raw_document_reference:
    SearchPrivateSnapshotRawDocumentReference;

  readonly extracted_document:
    SearchExtractedDocument;

  readonly segmented_document:
    SearchSegmentedDocument;

  readonly lexical_document:
    SearchLexicalDocument;

  readonly frequency_signals:
    SearchFrequencySignals;

  readonly intrinsic_anchor_signals:
    SearchAnchorSignals;

  readonly context_aggregation:
    SearchContextAggregation;

  readonly query_document_signals:
    SearchQueryDocumentSignals;

  readonly link_signals:
    SearchLinkSignals;

  readonly temporal_signals:
    SearchTemporalSignals;

  readonly behavioral_signals:
    SearchBehavioralSignals;

  readonly intrinsic_document_score_vector:
    SearchIntrinsicDocumentScoreVector;

  /**
   * Canonical mandatory temporal scoring truth.
   *
   * Missing temporal analytical evidence belongs inside the canonical score
   * contract through its governed missing-data/degradation semantics.
   *
   * The snapshot builder does not create an alternative optional wrapper.
   */
  readonly temporal_document_score_vector:
    SearchTemporalDocumentScoreVector;

  /**
   * Canonical mandatory query-relative scoring truth.
   */
  readonly query_relative_score_vector:
    SearchQueryRelativeScoreVector;

  /**
   * Link authority may legitimately be unavailable.
   *
   * Absence remains explicit.
   */
  readonly link_authority_score_vector:
    SearchOptionalEvidence<
      SearchLinkAuthorityScoreVector
    >;

  /**
   * Behavioral calibration may legitimately be unavailable.
   *
   * Absence remains explicit.
   */
  readonly behavioral_calibration_score_vector:
    SearchOptionalEvidence<
      SearchBehavioralCalibrationScoreVector
    >;

  readonly positive_score_vector:
    SearchPositiveScoreVector;

  readonly penalty_vector:
    SearchPenaltyVector;

  readonly global_score:
    SearchGlobalScore;

  readonly eligibility:
    SearchEligibilityResult;

  readonly cohort_definition:
    SearchCohortDefinition;

  readonly cohort_distribution:
    SearchCohortDistribution;

  readonly relative_evaluation:
    SearchOptionalEvidence<
      SearchRelativeEvaluationContext
    >;

  readonly private_decision:
    SearchPrivateDecision;

  readonly traces:
    readonly SearchTraceRecord[];

  readonly variable_lineage:
    readonly SearchVariableLineage[];
}

/* ============================================================================
 * 4. SAFE PRIMITIVE ASSERTIONS
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
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-empty string.`,
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

  if (
    !Number.isFinite(
      Date.parse(value),
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertFiniteNumber(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value)) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be finite.`,
    );
  }
}

function assertNormalizedNumber(
  value: number,
  fieldName: string,
): void {
  assertFiniteNumber(
    value,
    fieldName,
  );

  if (
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between 0 and 1.`,
    );
  }
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a positive integer.`,
    );
  }
}

/* ============================================================================
 * 5. VALIDATION-STATE BOUNDARY
 * ========================================================================== */

function assertNotRejected(
  state: SearchValidationState,
  contractName: string,
): void {
  if (state === "REJECTED") {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Snapshot boundary rejection: ${contractName} has validation_state REJECTED.`,
    );
  }
}

function assertCanonicalNormalizedProducerState(
  state: SearchValidationState,
  contractName: string,
): void {
  if (
    state !== "VALID" &&
    state !== "DEGRADED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Snapshot boundary rejection: ${contractName} must be VALID or DEGRADED.`,
    );
  }
}

/* ============================================================================
 * 6. IDENTITY ASSERTIONS
 * ========================================================================== */

function assertDocumentScope(
  actualDocumentId: SearchDocumentId,
  canonicalDocumentId: SearchDocumentId,
  fieldName: string,
): void {
  assertNonEmptyString(
    actualDocumentId,
    `${fieldName}.document_id`,
  );

  if (
    actualDocumentId !==
    canonicalDocumentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} belongs to a different document.`,
    );
  }
}

function assertQueryScope(
  actualQueryId: SearchQueryId,
  canonicalQueryId: SearchQueryId,
  fieldName: string,
): void {
  assertNonEmptyString(
    actualQueryId,
    `${fieldName}.query_id`,
  );

  if (
    actualQueryId !==
    canonicalQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} belongs to a different query.`,
    );
  }
}

function assertCohortScope(
  actualCohortId: SearchCohortId,
  canonicalCohortId: SearchCohortId,
  fieldName: string,
): void {
  assertNonEmptyString(
    actualCohortId,
    `${fieldName}.cohort_id`,
  );

  if (
    actualCohortId !==
    canonicalCohortId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} belongs to a different cohort.`,
    );
  }
}

/* ============================================================================
 * 7. TEMPORAL CAUSALITY
 * ----------------------------------------------------------------------------
 * Snapshot creation cannot predate any transported canonical truth.
 * ========================================================================== */

function assertNotAfterSnapshot(
  upstreamCreatedAt: SearchIsoTimestamp,
  snapshotCreatedAt: SearchIsoTimestamp,
  fieldName: string,
): void {
  assertValidIsoTimestamp(
    upstreamCreatedAt,
    fieldName,
  );

  if (
    Date.parse(upstreamCreatedAt) >
    Date.parse(snapshotCreatedAt)
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        `Temporal boundary violation: ${fieldName} postdates snapshot creation.`,
    );
  }
}

/* ============================================================================
 * 8. OPTIONAL EVIDENCE VALIDATION
 * ========================================================================== */

function validateOptionalEvidence<T>(
  evidence: SearchOptionalEvidence<T>,
  fieldName: string,
): void {
  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

/* ============================================================================
 * 9. RAW DOCUMENT REFERENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Raw acquisition reference validation only.
 *
 * source_published_at remains canonical Acquisition source evidence.
 *
 * This builder:
 * - validates its evidence envelope;
 * - validates an AVAILABLE timestamp structurally;
 * - preserves the evidence unchanged;
 * - never substitutes fetched_at;
 * - never substitutes snapshot created_at;
 * - never reconstructs publication time.
 * ========================================================================== */

function validateOptionalIsoTimestampEvidence(
  evidence:
    SearchOptionalEvidence<SearchIsoTimestamp>,
  fieldName:
    string,
): void {
  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    assertValidIsoTimestamp(
      evidence.value,
      `${fieldName}.value`,
    );

    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

function validateRawDocumentReference(
  reference:
    SearchPrivateSnapshotRawDocumentReference,
  snapshotCreatedAt:
    SearchIsoTimestamp,
): void {
  assertNonEmptyString(
    reference.source_uri,
    "raw_document_reference.source_uri",
  );

  assertNonEmptyString(
    reference.source_type,
    "raw_document_reference.source_type",
  );

  assertValidIsoTimestamp(
    reference.fetched_at,
    "raw_document_reference.fetched_at",
  );

  assertNotAfterSnapshot(
    reference.fetched_at,
    snapshotCreatedAt,
    "raw_document_reference.fetched_at",
  );

  validateOptionalIsoTimestampEvidence(
    reference.source_published_at,
    "raw_document_reference.source_published_at",
  );

  assertNonEmptyString(
    reference.content_hash,
    "raw_document_reference.content_hash",
  );

  assertNonEmptyString(
    reference.acquisition_contract_version,
    "raw_document_reference.acquisition_contract_version",
  );
}

/* ============================================================================
 * 10. INTRINSIC DOCUMENT CONTRACT VALIDATION
 * ========================================================================== */

function validateIntrinsicDocumentContracts(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  const contracts = [
    [
      "extracted_document",
      input.extracted_document,
    ],
    [
      "segmented_document",
      input.segmented_document,
    ],
    [
      "lexical_document",
      input.lexical_document,
    ],
    [
      "frequency_signals",
      input.frequency_signals,
    ],
    [
      "intrinsic_anchor_signals",
      input.intrinsic_anchor_signals,
    ],
    [
      "context_aggregation",
      input.context_aggregation,
    ],
    [
      "link_signals",
      input.link_signals,
    ],
    [
      "temporal_signals",
      input.temporal_signals,
    ],
    [
      "intrinsic_document_score_vector",
      input.intrinsic_document_score_vector,
    ],
  ] as const;

  for (
    const [
      fieldName,
      contract,
    ] of contracts
  ) {
    assertNonEmptyString(
      contract.contract_version,
      `${fieldName}.contract_version`,
    );

    assertDocumentScope(
      contract.document_id,
      input.document_id,
      fieldName,
    );

    assertValidIsoTimestamp(
      contract.created_at,
      `${fieldName}.created_at`,
    );

    assertNotAfterSnapshot(
      contract.created_at,
      input.created_at,
      `${fieldName}.created_at`,
    );

    assertNotRejected(
      contract.validation_state,
      fieldName,
    );
  }
}

/* ============================================================================
 * 11. QUERY-SCOPED CONTRACT VALIDATION
 * ========================================================================== */

function validateQueryScopedContracts(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  const contracts = [
    [
      "query_document_signals",
      input.query_document_signals,
    ],
    [
      "behavioral_signals",
      input.behavioral_signals,
    ],
    [
      "penalty_vector",
      input.penalty_vector,
    ],
    [
      "global_score",
      input.global_score,
    ],
  ] as const;

  for (
    const [
      fieldName,
      contract,
    ] of contracts
  ) {
    assertNonEmptyString(
      contract.contract_version,
      `${fieldName}.contract_version`,
    );

    assertDocumentScope(
      contract.document_id,
      input.document_id,
      fieldName,
    );

    assertQueryScope(
      contract.query_id,
      input.query_id,
      fieldName,
    );

    assertValidIsoTimestamp(
      contract.created_at,
      `${fieldName}.created_at`,
    );

    assertNotAfterSnapshot(
      contract.created_at,
      input.created_at,
      `${fieldName}.created_at`,
    );

    assertNotRejected(
      contract.validation_state,
      fieldName,
    );
  }

  /* --------------------------------------------------------------------------
   * SearchPositiveScoreVector
   *
   * It intentionally owns no validation_state.
   * ----------------------------------------------------------------------- */

  assertNonEmptyString(
    input.positive_score_vector.contract_version,
    "positive_score_vector.contract_version",
  );

  assertDocumentScope(
    input.positive_score_vector.document_id,
    input.document_id,
    "positive_score_vector",
  );

  assertQueryScope(
    input.positive_score_vector.query_id,
    input.query_id,
    "positive_score_vector",
  );

  assertValidIsoTimestamp(
    input.positive_score_vector.created_at,
    "positive_score_vector.created_at",
  );

  assertNotAfterSnapshot(
    input.positive_score_vector.created_at,
    input.created_at,
    "positive_score_vector.created_at",
  );

  /* --------------------------------------------------------------------------
   * SearchEligibilityResult
   *
   * It intentionally owns no SearchValidationState.
   * ----------------------------------------------------------------------- */

  assertNonEmptyString(
    input.eligibility.contract_version,
    "eligibility.contract_version",
  );

  assertDocumentScope(
    input.eligibility.document_id,
    input.document_id,
    "eligibility",
  );

  assertQueryScope(
    input.eligibility.query_id,
    input.query_id,
    "eligibility",
  );

  assertValidIsoTimestamp(
    input.eligibility.created_at,
    "eligibility.created_at",
  );

  assertNotAfterSnapshot(
    input.eligibility.created_at,
    input.created_at,
    "eligibility.created_at",
  );

  assertNonEmptyString(
    input.eligibility.evaluator_module_version,
    "eligibility.evaluator_module_version",
  );

  assertNonEmptyString(
    input.eligibility.eligibility_policy_version,
    "eligibility.eligibility_policy_version",
  );

  if (
    input.eligibility.allow_eligible &&
    !input.eligibility.ranking_eligible
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: allow_eligible cannot bypass ranking_eligible.",
    );
  }
}

/* ============================================================================
 * 12. SCORE-VECTOR VALIDATION
 * ----------------------------------------------------------------------------
 * Mandatory:
 * - intrinsic
 * - temporal
 * - query relevance
 *
 * Explicit optional evidence:
 * - link authority
 * - behavioral calibration
 * ========================================================================== */

function validateScoreVectors(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  const temporalVector =
    input.temporal_document_score_vector;

  assertNonEmptyString(
    temporalVector.contract_version,
    "temporal_document_score_vector.contract_version",
  );

  assertDocumentScope(
    temporalVector.document_id,
    input.document_id,
    "temporal_document_score_vector",
  );

  assertValidIsoTimestamp(
    temporalVector.created_at,
    "temporal_document_score_vector.created_at",
  );

  assertNotAfterSnapshot(
    temporalVector.created_at,
    input.created_at,
    "temporal_document_score_vector.created_at",
  );

  assertNonEmptyString(
    temporalVector.scorer_module_version,
    "temporal_document_score_vector.scorer_module_version",
  );

  assertNonEmptyString(
    temporalVector.scoring_policy_version,
    "temporal_document_score_vector.scoring_policy_version",
  );

  assertNotRejected(
    temporalVector.validation_state,
    "temporal_document_score_vector",
  );

  const queryRelativeVector =
    input.query_relative_score_vector;

  assertNonEmptyString(
    queryRelativeVector.contract_version,
    "query_relative_score_vector.contract_version",
  );

  assertDocumentScope(
    queryRelativeVector.document_id,
    input.document_id,
    "query_relative_score_vector",
  );

  assertQueryScope(
    queryRelativeVector.query_id,
    input.query_id,
    "query_relative_score_vector",
  );

  assertValidIsoTimestamp(
    queryRelativeVector.created_at,
    "query_relative_score_vector.created_at",
  );

  assertNotAfterSnapshot(
    queryRelativeVector.created_at,
    input.created_at,
    "query_relative_score_vector.created_at",
  );

  assertNonEmptyString(
    queryRelativeVector.scorer_module_version,
    "query_relative_score_vector.scorer_module_version",
  );

  assertNonEmptyString(
    queryRelativeVector.scoring_policy_version,
    "query_relative_score_vector.scoring_policy_version",
  );

  assertNotRejected(
    queryRelativeVector.validation_state,
    "query_relative_score_vector",
  );

  validateOptionalEvidence(
    input.link_authority_score_vector,
    "link_authority_score_vector",
  );

  if (
    input.link_authority_score_vector
      .availability_state ===
    "AVAILABLE"
  ) {
    const vector =
      input.link_authority_score_vector.value;

    assertNonEmptyString(
      vector.contract_version,
      "link_authority_score_vector.contract_version",
    );

    assertDocumentScope(
      vector.document_id,
      input.document_id,
      "link_authority_score_vector",
    );

    assertValidIsoTimestamp(
      vector.created_at,
      "link_authority_score_vector.created_at",
    );

    assertNotAfterSnapshot(
      vector.created_at,
      input.created_at,
      "link_authority_score_vector.created_at",
    );

    assertNonEmptyString(
      vector.scorer_module_version,
      "link_authority_score_vector.scorer_module_version",
    );

    assertNonEmptyString(
      vector.scoring_policy_version,
      "link_authority_score_vector.scoring_policy_version",
    );

    assertNotRejected(
      vector.validation_state,
      "link_authority_score_vector",
    );
  }

  validateOptionalEvidence(
    input.behavioral_calibration_score_vector,
    "behavioral_calibration_score_vector",
  );

  if (
    input.behavioral_calibration_score_vector
      .availability_state ===
    "AVAILABLE"
  ) {
    const vector =
      input.behavioral_calibration_score_vector.value;

    assertNonEmptyString(
      vector.contract_version,
      "behavioral_calibration_score_vector.contract_version",
    );

    assertDocumentScope(
      vector.document_id,
      input.document_id,
      "behavioral_calibration_score_vector",
    );

    assertQueryScope(
      vector.query_id,
      input.query_id,
      "behavioral_calibration_score_vector",
    );

    assertValidIsoTimestamp(
      vector.created_at,
      "behavioral_calibration_score_vector.created_at",
    );

    assertNotAfterSnapshot(
      vector.created_at,
      input.created_at,
      "behavioral_calibration_score_vector.created_at",
    );

    assertNonEmptyString(
      vector.scorer_module_version,
      "behavioral_calibration_score_vector.scorer_module_version",
    );

    assertNonEmptyString(
      vector.scoring_policy_version,
      "behavioral_calibration_score_vector.scoring_policy_version",
    );

    assertNotRejected(
      vector.validation_state,
      "behavioral_calibration_score_vector",
    );
  }
}

/* ============================================================================
 * 13. COHORT CONTRACT VALIDATION
 * ========================================================================== */

function validateCohortContracts(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  const cohortDefinition =
    input.cohort_definition;

  const cohortDistribution =
    input.cohort_distribution;

  assertNonEmptyString(
    cohortDefinition.contract_version,
    "cohort_definition.contract_version",
  );

  assertValidIsoTimestamp(
    cohortDefinition.created_at,
    "cohort_definition.created_at",
  );

  assertNotAfterSnapshot(
    cohortDefinition.created_at,
    input.created_at,
    "cohort_definition.created_at",
  );

  assertCohortScope(
    cohortDefinition.cohort_id,
    input.cohort_id,
    "cohort_definition",
  );

  assertQueryScope(
    cohortDefinition.query_id,
    input.query_id,
    "cohort_definition",
  );

  assertNotRejected(
    cohortDefinition.validation_state,
    "cohort_definition",
  );

  assertNonEmptyString(
    cohortDistribution.contract_version,
    "cohort_distribution.contract_version",
  );

  assertValidIsoTimestamp(
    cohortDistribution.created_at,
    "cohort_distribution.created_at",
  );

  assertNotAfterSnapshot(
    cohortDistribution.created_at,
    input.created_at,
    "cohort_distribution.created_at",
  );

  assertCohortScope(
    cohortDistribution.cohort_id,
    input.cohort_id,
    "cohort_distribution",
  );

  assertQueryScope(
    cohortDistribution.query_id,
    input.query_id,
    "cohort_distribution",
  );

  assertNonEmptyString(
    cohortDistribution.distribution_id,
    "cohort_distribution.distribution_id",
  );

  assertNonEmptyString(
    cohortDistribution.normalizer_module_version,
    "cohort_distribution.normalizer_module_version",
  );

  assertNonEmptyString(
    cohortDistribution.normalization_policy_version,
    "cohort_distribution.normalization_policy_version",
  );

  /**
   * SearchCohortDistribution contract explicitly authorizes only VALID or
   * DEGRADED canonical producer output.
   */
  assertCanonicalNormalizedProducerState(
    cohortDistribution.validation_state,
    "cohort_distribution",
  );

  assertPositiveInteger(
    cohortDistribution.candidate_count,
    "cohort_distribution.candidate_count",
  );

  assertFiniteNumber(
    cohortDistribution.minimum_score,
    "cohort_distribution.minimum_score",
  );

  assertFiniteNumber(
    cohortDistribution.maximum_score,
    "cohort_distribution.maximum_score",
  );

  assertFiniteNumber(
    cohortDistribution.mean_score,
    "cohort_distribution.mean_score",
  );

  assertFiniteNumber(
    cohortDistribution.median_score,
    "cohort_distribution.median_score",
  );

  assertFiniteNumber(
    cohortDistribution.standard_deviation,
    "cohort_distribution.standard_deviation",
  );

  assertFiniteNumber(
    cohortDistribution.first_quartile_score,
    "cohort_distribution.first_quartile_score",
  );

  assertFiniteNumber(
    cohortDistribution.third_quartile_score,
    "cohort_distribution.third_quartile_score",
  );

  if (
    cohortDistribution.standard_deviation <
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Contract violation: cohort_distribution.standard_deviation must be non-negative.",
    );
  }

  if (
    cohortDistribution.minimum_score >
    cohortDistribution.maximum_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Contract violation: cohort distribution minimum exceeds maximum.",
    );
  }

  if (
    cohortDistribution.first_quartile_score >
      cohortDistribution.median_score ||
    cohortDistribution.median_score >
      cohortDistribution.third_quartile_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Contract violation: cohort distribution quartile ordering is invalid.",
    );
  }
}

/* ============================================================================
 * 14. RELATIVE EVALUATION VALIDATION
 * ========================================================================== */

function validateRelativeEvaluation(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  const evidence =
    input.relative_evaluation;

  validateOptionalEvidence(
    evidence,
    "relative_evaluation",
  );

  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    return;
  }

  const evaluation =
    evidence.value;

  assertNonEmptyString(
    evaluation.contract_version,
    "relative_evaluation.contract_version",
  );

  assertValidIsoTimestamp(
    evaluation.created_at,
    "relative_evaluation.created_at",
  );

  assertNotAfterSnapshot(
    evaluation.created_at,
    input.created_at,
    "relative_evaluation.created_at",
  );

  assertDocumentScope(
    evaluation.document_id,
    input.document_id,
    "relative_evaluation",
  );

  assertQueryScope(
    evaluation.query_id,
    input.query_id,
    "relative_evaluation",
  );

  assertCohortScope(
    evaluation.cohort_id,
    input.cohort_id,
    "relative_evaluation",
  );

  assertNonEmptyString(
    evaluation.distribution_id,
    "relative_evaluation.distribution_id",
  );

  if (
    evaluation.distribution_id !==
    input.cohort_distribution.distribution_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: relative evaluation references a different cohort distribution.",
    );
  }

  assertNonEmptyString(
    evaluation.evaluator_module_version,
    "relative_evaluation.evaluator_module_version",
  );

  assertNonEmptyString(
    evaluation.relative_evaluation_policy_version,
    "relative_evaluation.relative_evaluation_policy_version",
  );

  if (
    evaluation.raw_score !==
    input.global_score.final_raw_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: relative evaluation raw_score differs from canonical final_raw_score.",
    );
  }

  if (
    !evaluation.ranking_eligible
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: AVAILABLE relative evaluation cannot belong to a ranking-ineligible candidate.",
    );
  }

  if (
    evaluation.ranking_eligible !==
    input.eligibility.ranking_eligible
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: relative evaluation and eligibility disagree on ranking eligibility.",
    );
  }

  if (
    evaluation.cohort_size !==
    input.cohort_distribution.candidate_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: relative evaluation cohort size differs from canonical cohort distribution.",
    );
  }

  assertFiniteNumber(
    evaluation.raw_score,
    "relative_evaluation.raw_score",
  );

  assertFiniteNumber(
    evaluation.normalized_score,
    "relative_evaluation.normalized_score",
  );

  /*
   * The canonical distribution owns the normalization method.
   * Z scores are finite numbers, not ratios constrained to [0,1].
   * Validate the transported value without reconstructing or changing it.
   */
  const normalizationMethod =
    input.cohort_distribution.normalization_method;

  switch (normalizationMethod) {
    case "MIN_MAX":
    case "PERCENTILE_ONLY":
      assertNormalizedNumber(
        evaluation.normalized_score,
        "relative_evaluation.normalized_score",
      );
      break;

    case "Z_SCORE":
    case "ROBUST_Z_SCORE":
      break;

    case "CUSTOM":
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          "Snapshot boundary rejection: AVAILABLE relative evaluation with CUSTOM normalization requires a canonical custom normalization producer.",
      );

    default: {
      const unsupportedMethod:
        never = normalizationMethod;

      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Contract violation: unsupported cohort_distribution.normalization_method ${String(unsupportedMethod)}.`,
      );
    }
  }

  assertPositiveInteger(
    evaluation.relative_position,
    "relative_evaluation.relative_position",
  );

  assertFiniteNumber(
    evaluation.percentile,
    "relative_evaluation.percentile",
  );

  assertPositiveInteger(
    evaluation.cohort_size,
    "relative_evaluation.cohort_size",
  );

  assertFiniteNumber(
    evaluation.distance_from_median,
    "relative_evaluation.distance_from_median",
  );

  validateOptionalEvidence(
    evaluation.distance_from_previous,
    "relative_evaluation.distance_from_previous",
  );

  if (
    evaluation.distance_from_previous
      .availability_state ===
    "AVAILABLE"
  ) {
    assertFiniteNumber(
      evaluation.distance_from_previous.value,
      "relative_evaluation.distance_from_previous.value",
    );
  }

  validateOptionalEvidence(
    evaluation.distance_from_next,
    "relative_evaluation.distance_from_next",
  );

  if (
    evaluation.distance_from_next
      .availability_state ===
    "AVAILABLE"
  ) {
    assertFiniteNumber(
      evaluation.distance_from_next.value,
      "relative_evaluation.distance_from_next.value",
    );
  }
}

/* ============================================================================
 * 15. GLOBAL SCORE REFERENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Reference identity is intentional here.
 *
 * SearchGlobalScore must transport the exact canonical vector instances that
 * crossed the snapshot boundary.
 * ========================================================================== */

function validateGlobalScoreReferences(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  if (
    input.global_score.score_vector !==
    input.positive_score_vector
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: global_score.score_vector is not the canonical positive_score_vector instance.",
    );
  }

  if (
    input.global_score.penalty_vector !==
    input.penalty_vector
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: global_score.penalty_vector is not the canonical penalty_vector instance.",
    );
  }

  if (
    input.global_score.penalty_value !==
    input.penalty_vector.total_penalty_value
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: global_score.penalty_value differs from canonical penalty_vector.total_penalty_value.",
    );
  }
}

/* ============================================================================
 * 16. PRIVATE DECISION REFERENCE VALIDATION
 * ========================================================================== */

function validatePrivateDecision(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  const decision =
    input.private_decision;

  assertNonEmptyString(
    decision.contract_version,
    "private_decision.contract_version",
  );

  assertValidIsoTimestamp(
    decision.created_at,
    "private_decision.created_at",
  );

  assertNotAfterSnapshot(
    decision.created_at,
    input.created_at,
    "private_decision.created_at",
  );

  assertDocumentScope(
    decision.document_id,
    input.document_id,
    "private_decision",
  );

  assertQueryScope(
    decision.query_id,
    input.query_id,
    "private_decision",
  );

  assertCohortScope(
    decision.cohort_id,
    input.cohort_id,
    "private_decision",
  );

  assertNonEmptyString(
    decision.decision_engine_version,
    "private_decision.decision_engine_version",
  );

  assertNonEmptyString(
    decision.decision_policy_version,
    "private_decision.decision_policy_version",
  );

  assertFiniteNumber(
    decision.global_score_reference,
    "private_decision.global_score_reference",
  );

  assertNormalizedNumber(
    decision.decision_confidence,
    "private_decision.decision_confidence",
  );

  if (
    decision.visibility !==
    "PRIVATE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: SearchPrivateDecision must remain PRIVATE.",
    );
  }

  if (
    decision.global_score_reference !==
    input.global_score.final_raw_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: private decision global-score reference differs from canonical final_raw_score.",
    );
  }

  if (
    decision.eligibility_reference !==
    input.eligibility
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: private decision does not reference the canonical eligibility instance.",
    );
  }

  const decisionRelativeEvidence =
    decision.relative_evaluation_reference;

  const snapshotRelativeEvidence =
    input.relative_evaluation;

  if (
    decisionRelativeEvidence.availability_state !==
    snapshotRelativeEvidence.availability_state
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: private decision and snapshot disagree on relative-evaluation availability.",
    );
  }

  if (
    decisionRelativeEvidence.availability_state ===
      "AVAILABLE" &&
    snapshotRelativeEvidence.availability_state ===
      "AVAILABLE"
  ) {
    if (
      decisionRelativeEvidence.value !==
      snapshotRelativeEvidence.value
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          "Boundary violation: private decision does not reference the canonical relative-evaluation instance.",
      );
    }
  }

  if (
    decisionRelativeEvidence.availability_state !==
      "AVAILABLE" &&
    snapshotRelativeEvidence.availability_state !==
      "AVAILABLE" &&
    decisionRelativeEvidence.reason !==
      snapshotRelativeEvidence.reason
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Boundary violation: private decision and snapshot disagree on relative-evaluation unavailability reason.",
    );
  }

  switch (decision.category) {
    case "BLOCK":
    case "WATCH":
    case "ALLOW":
      break;

    default: {
      const unreachable:
        never =
        decision.category;

      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Contract violation: unsupported private decision category ${String(unreachable)}.`,
      );
    }
  }
}

/* ============================================================================
 * 17. TRACE VALIDATION
 * ========================================================================== */

function validateTraces(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  const traceIds =
    new Set<string>();

  for (
    const [
      index,
      trace,
    ] of input.traces.entries()
  ) {
    const fieldName =
      `traces[${String(index)}]`;

    assertNonEmptyString(
      trace.contract_version,
      `${fieldName}.contract_version`,
    );

    assertValidIsoTimestamp(
      trace.created_at,
      `${fieldName}.created_at`,
    );

    assertNotAfterSnapshot(
      trace.created_at,
      input.created_at,
      `${fieldName}.created_at`,
    );

    assertNonEmptyString(
      trace.trace_id,
      `${fieldName}.trace_id`,
    );

    assertNonEmptyString(
      trace.module_name,
      `${fieldName}.module_name`,
    );

    assertNonEmptyString(
      trace.module_version,
      `${fieldName}.module_version`,
    );

    assertNonEmptyString(
      trace.method,
      `${fieldName}.method`,
    );

    assertNonEmptyString(
      trace.output_contract,
      `${fieldName}.output_contract`,
    );

    if (
      traceIds.has(trace.trace_id)
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Boundary violation: duplicate trace identity ${trace.trace_id}.`,
      );
    }

    traceIds.add(
      trace.trace_id,
    );

    if (
      trace.document_id !== undefined &&
      trace.document_id !== input.document_id
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Boundary violation: trace ${trace.trace_id} references a different document.`,
      );
    }

    if (
      trace.query_id !== undefined &&
      trace.query_id !== input.query_id
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Boundary violation: trace ${trace.trace_id} references a different query.`,
      );
    }

    if (
      trace.cohort_id !== undefined &&
      trace.cohort_id !== input.cohort_id
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Boundary violation: trace ${trace.trace_id} references a different cohort.`,
      );
    }
  }
}

/* ============================================================================
 * 18. VARIABLE LINEAGE VALIDATION
 * ----------------------------------------------------------------------------
 * The snapshot validates canonical VLR declarations only.
 *
 * It does not:
 * - generate lineage;
 * - repair lineage;
 * - rename lineage fields locally;
 * - infer ownership;
 * - infer exposure;
 * - reconstruct propagation paths;
 * - promote or demote public exposure.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * SearchVariableLineage.exposure_level describes the governed exposure of the
 * canonical variable itself.
 *
 * It does NOT describe the visibility of this snapshot envelope.
 *
 * Therefore a PRIVATE snapshot may legitimately transport a VLR declaration
 * whose exposure_level is INTERNAL or PUBLIC.
 *
 * Snapshot visibility remains governed independently by:
 *
 * snapshot.visibility === "PRIVATE"
 * ========================================================================== */

function validateVariableLineage(
  lineage:
    readonly SearchVariableLineage[],
): void {
  const variableNames =
    new Set<string>();

  for (
    const [
      index,
      entry,
    ] of lineage.entries()
  ) {
    const fieldName =
      `variable_lineage[${String(index)}]`;

    assertNonEmptyString(
      entry.contract_version,
      `${fieldName}.contract_version`,
    );

    assertNonEmptyString(
      entry.variable_name,
      `${fieldName}.variable_name`,
    );

    assertNonEmptyString(
      entry.source_truth,
      `${fieldName}.source_truth`,
    );

    assertNonEmptyString(
      entry.contract_source,
      `${fieldName}.contract_source`,
    );

    assertNonEmptyString(
      entry.producer_module,
      `${fieldName}.producer_module`,
    );

    assertNonEmptyString(
      entry.producer_module_version,
      `${fieldName}.producer_module_version`,
    );

    assertNonEmptyString(
      entry.protocol_reference,
      `${fieldName}.protocol_reference`,
    );

    assertNonEmptyString(
      entry.data_type,
      `${fieldName}.data_type`,
    );

    assertNonEmptyString(
      entry.availability_semantics,
      `${fieldName}.availability_semantics`,
    );

    assertNonEmptyString(
      entry.schema_version,
      `${fieldName}.schema_version`,
    );

    assertNonEmptyString(
      entry.introduced_in_version,
      `${fieldName}.introduced_in_version`,
    );

    if (
      variableNames.has(
        entry.variable_name,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Boundary violation: duplicate variable lineage identity ${entry.variable_name}.`,
      );
    }

    variableNames.add(
      entry.variable_name,
    );

    switch (
      entry.exposure_level
    ) {
      case "PRIVATE":
      case "INTERNAL":
      case "PUBLIC":
        break;

      default: {
        const unreachable:
          never =
          entry.exposure_level;

        throw new Error(
          `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
            `Contract violation: unsupported exposure level ${String(unreachable)}.`,
        );
      }
    }

    if (
      entry.propagation_path.length ===
      0
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Contract violation: ${entry.variable_name} has an empty propagation path.`,
      );
    }

    if (
      entry.propagation_path[0] !==
      entry.ownership_layer
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Lineage violation: ${entry.variable_name} propagation path does not begin at its canonical ownership layer.`,
      );
    }

    const uniqueLayers =
      new Set(
        entry.propagation_path,
      );

    if (
      uniqueLayers.size !==
      entry.propagation_path.length
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Lineage violation: ${entry.variable_name} contains a duplicated propagation layer.`,
      );
    }

    for (
      const [
        dependencyIndex,
        dependency,
      ] of entry
        .upstream_dependencies
        .entries()
    ) {
      assertNonEmptyString(
        dependency,
        `${fieldName}.upstream_dependencies[${String(dependencyIndex)}]`,
      );
    }

    for (
      const [
        consumerIndex,
        consumer,
      ] of entry
        .downstream_consumers
        .entries()
    ) {
      assertNonEmptyString(
        consumer,
        `${fieldName}.downstream_consumers[${String(consumerIndex)}]`,
      );
    }

    if (
      entry.validation_required &&
      entry.validation_state ===
        "REJECTED"
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Lineage violation: ${entry.variable_name} requires validation but its registered lineage is REJECTED.`,
      );
    }

    if (
      entry.public_exposure_allowed &&
      entry.exposure_level !==
        "PUBLIC"
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Lineage violation: ${entry.variable_name} authorizes public exposure but is not classified PUBLIC.`,
      );
    }

    if (
      !entry.public_exposure_allowed &&
      entry.exposure_level ===
        "PUBLIC"
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          `Lineage violation: ${entry.variable_name} is classified PUBLIC while public exposure is forbidden.`,
      );
    }
  }
}

/* ============================================================================
 * 19. VALIDATION STATE COLLECTION
 * ========================================================================== */

function collectValidationStates(
  input:
    SearchPrivateSnapshotBuilderInput,
): readonly SearchValidationState[] {
  const states:
    SearchValidationState[] = [
      input.extracted_document.validation_state,
      input.segmented_document.validation_state,
      input.lexical_document.validation_state,
      input.frequency_signals.validation_state,
      input.intrinsic_anchor_signals.validation_state,
      input.context_aggregation.validation_state,
      input.query_document_signals.validation_state,
      input.link_signals.validation_state,
      input.temporal_signals.validation_state,
      input.behavioral_signals.validation_state,

      input.intrinsic_document_score_vector.validation_state,
      input.temporal_document_score_vector.validation_state,
      input.query_relative_score_vector.validation_state,

      input.penalty_vector.validation_state,
      input.global_score.validation_state,
      input.cohort_definition.validation_state,
      input.cohort_distribution.validation_state,
    ];

  if (
    input.link_authority_score_vector
      .availability_state ===
    "AVAILABLE"
  ) {
    states.push(
      input.link_authority_score_vector
        .value
        .validation_state,
    );
  }

  if (
    input.behavioral_calibration_score_vector
      .availability_state ===
    "AVAILABLE"
  ) {
    states.push(
      input.behavioral_calibration_score_vector
        .value
        .validation_state,
    );
  }

  return Object.freeze(
    states,
  );
}

/* ============================================================================
 * 20. SNAPSHOT VALIDATION STATE
 * ========================================================================== */

function resolveSnapshotValidationState(
  states:
    readonly SearchValidationState[],
): SearchValidationState {
  if (
    states.some(
      (state) =>
        state === "REJECTED",
    )
  ) {
    return "REJECTED";
  }

  if (
    states.some(
      (state) =>
        state === "DEGRADED" ||
        state === "UNVALIDATED",
    )
  ) {
    return "DEGRADED";
  }

  return "VALID";
}

/* ============================================================================
 * 21. DETERMINISTIC STRING HELPERS
 * ========================================================================== */

function compareStrings(
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

function canonicalStrings(
  values:
    readonly string[],
): readonly string[] {
  return Object.freeze(
    [
      ...new Set(
        values
          .map(
            (value) =>
              value.trim(),
          )
          .filter(
            (value) =>
              value.length > 0,
          ),
      ),
    ].sort(
      compareStrings,
    ),
  );
}

/* ============================================================================
 * 22. DEGRADATION PROPAGATION
 * ----------------------------------------------------------------------------
 * This is propagation only.
 *
 * No analytical interpretation is performed here.
 * ========================================================================== */

function collectDegradationReasons(
  input:
    SearchPrivateSnapshotBuilderInput,
): readonly string[] {
  const reasons:
    string[] = [];

  const appendReasons = (
    prefix: string,
    values: readonly string[],
  ): void => {
    for (const value of values) {
      reasons.push(
        `${prefix}:${value}`,
      );
    }
  };

  appendReasons(
    "EXTRACTION",
    input.extracted_document
      .degradation_reasons,
  );

  appendReasons(
    "SEGMENTATION",
    input.segmented_document
      .degradation_reasons,
  );

  appendReasons(
    "LEXICAL_ANALYSIS",
    input.lexical_document
      .degradation_reasons,
  );

  appendReasons(
    "FREQUENCY_SIGNAL_DETECTION",
    input.frequency_signals
      .degradation_reasons,
  );

  appendReasons(
    "ANCHOR_SIGNAL_DETECTION",
    input.intrinsic_anchor_signals
      .degradation_reasons,
  );

  appendReasons(
    "CONTEXT_AGGREGATION",
    input.context_aggregation
      .degradation_reasons,
  );

  appendReasons(
    "QUERY_DOCUMENT_SIGNAL_DETECTION",
    input.query_document_signals
      .degradation_reasons,
  );

  appendReasons(
    "LINK_SIGNAL_DETECTION",
    input.link_signals
      .degradation_reasons,
  );

  appendReasons(
    "TEMPORAL_SIGNAL_DETECTION",
    input.temporal_signals
      .degradation_reasons,
  );

  appendReasons(
    "BEHAVIORAL_SIGNAL_DETECTION",
    input.behavioral_signals
      .degradation_reasons,
  );

  appendReasons(
    "INTRINSIC_DOCUMENT_SCORING",
    input.intrinsic_document_score_vector
      .degradation_reasons,
  );

  appendReasons(
    "TEMPORAL_DOCUMENT_SCORING",
    input.temporal_document_score_vector
      .degradation_reasons,
  );

  appendReasons(
    "QUERY_RELEVANCE_SCORING",
    input.query_relative_score_vector
      .degradation_reasons,
  );

  if (
    input.link_authority_score_vector
      .availability_state ===
    "AVAILABLE"
  ) {
    appendReasons(
      "LINK_AUTHORITY_SCORING",
      input.link_authority_score_vector
        .value
        .degradation_reasons,
    );
  } else {
    reasons.push(
      `LINK_AUTHORITY_SCORING:` +
        `${input.link_authority_score_vector.availability_state}:` +
        input.link_authority_score_vector.reason,
    );
  }

  if (
    input.behavioral_calibration_score_vector
      .availability_state ===
    "AVAILABLE"
  ) {
    appendReasons(
      "BEHAVIORAL_CALIBRATION_SCORING",
      input.behavioral_calibration_score_vector
        .value
        .degradation_reasons,
    );
  } else {
    reasons.push(
      `BEHAVIORAL_CALIBRATION_SCORING:` +
        `${input.behavioral_calibration_score_vector.availability_state}:` +
        input.behavioral_calibration_score_vector.reason,
    );
  }

  appendReasons(
    "PENALTY_EVALUATION",
    input.penalty_vector
      .degradation_reasons,
  );

  appendReasons(
    "ANALYTICAL_AGGREGATION",
    input.global_score
      .degradation_reasons,
  );

  appendReasons(
    "COHORT_NORMALIZATION",
    input.cohort_distribution
      .degradation_reasons,
  );

  return canonicalStrings(
    reasons,
  );
}

/* ============================================================================
 * 22.1. SOURCE PUBLICATION LINEAGE VALIDATION
 * ----------------------------------------------------------------------------
 * Acquisition source publication evidence and Temporal published_at must
 * represent the same canonical source truth.
 *
 * This is lineage validation only.
 *
 * No timestamp is created, normalized or substituted here.
 * ========================================================================== */

function validateSourcePublicationLineage(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  const acquisitionEvidence =
    input
      .raw_document_reference
      .source_published_at;

  const temporalEvidence =
    input
      .temporal_signals
      .published_at;

  if (
    acquisitionEvidence
      .availability_state !==
    temporalEvidence
      .availability_state
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Lineage violation: temporal_signals.published_at changed canonical Acquisition publication availability.",
    );
  }

  if (
    acquisitionEvidence
      .availability_state ===
      "AVAILABLE" &&
    temporalEvidence
      .availability_state ===
      "AVAILABLE"
  ) {
    if (
      acquisitionEvidence.value !==
      temporalEvidence.value
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
          "Lineage violation: temporal_signals.published_at differs from canonical Acquisition source_published_at.",
      );
    }

    return;
  }

  if (
    acquisitionEvidence
      .availability_state !==
      "AVAILABLE" &&
    temporalEvidence
      .availability_state !==
      "AVAILABLE" &&
    acquisitionEvidence.reason !==
      temporalEvidence.reason
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Lineage violation: temporal_signals.published_at changed canonical Acquisition publication unavailability reason.",
    );
  }
}

/* ============================================================================
 * 23. TOP-LEVEL INPUT VALIDATION
 * ========================================================================== */

function validateInput(
  input:
    SearchPrivateSnapshotBuilderInput,
): void {
  assertNonEmptyString(
    input.snapshot_id,
    "snapshot_id",
  );

  assertNonEmptyString(
    input.snapshot_version,
    "snapshot_version",
  );

  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  assertNonEmptyString(
    input.document_id,
    "document_id",
  );

  assertNonEmptyString(
    input.query_id,
    "query_id",
  );

  assertNonEmptyString(
    input.cohort_id,
    "cohort_id",
  );

    validateRawDocumentReference(
    input.raw_document_reference,
    input.created_at,
  );

  validateSourcePublicationLineage(
    input,
  );

  validateIntrinsicDocumentContracts(
    input,
  );

  validateIntrinsicDocumentContracts(
    input,
  );

  validateQueryScopedContracts(
    input,
  );

  validateScoreVectors(
    input,
  );

  validateCohortContracts(
    input,
  );

  validateRelativeEvaluation(
    input,
  );

  validateGlobalScoreReferences(
    input,
  );

  validatePrivateDecision(
    input,
  );

  validateTraces(
    input,
  );

  validateVariableLineage(
    input.variable_lineage,
  );

  assertFiniteNumber(
    input.global_score.final_raw_score,
    "global_score.final_raw_score",
  );
}

/* ============================================================================
 * 24. IMMUTABLE RAW REFERENCE ASSEMBLY
 * ----------------------------------------------------------------------------
 * Transport canonical Acquisition reference only.
 *
 * source_published_at is preserved exactly as supplied.
 *
 * Forbidden:
 * - fetched_at -> source_published_at
 * - created_at -> source_published_at
 * - temporal observed_at -> source_publication
 * - synthetic AVAILABLE publication evidence
 * - unavailable publication evidence repair
 * ========================================================================== */

function buildRawDocumentReference(
  input:
    SearchPrivateSnapshotRawDocumentReference,
): SearchPrivateDocumentSnapshot["raw_document_reference"] {
  return Object.freeze({
    source_uri:
      input.source_uri,

    source_type:
      input.source_type,

    fetched_at:
      input.fetched_at,

    source_published_at:
      input.source_published_at,

    content_hash:
      input.content_hash,

    acquisition_contract_version:
      input.acquisition_contract_version,
  });
}

/* ============================================================================
 * 25. PUBLIC BUILDER API
 * ----------------------------------------------------------------------------
 * Canonical producer:
 *
 * validated upstream Search truth
 * + explicit snapshot identity
 * + explicit deterministic timestamp
 * → SearchPrivateDocumentSnapshot
 *
 * No analytical truth is created here.
 * ========================================================================== */

export function buildSearchPrivateDocumentSnapshot(
  input:
    SearchPrivateSnapshotBuilderInput,
): SearchPrivateDocumentSnapshot {
  validateInput(
    input,
  );

  const validationStates =
    collectValidationStates(
      input,
    );

  const validationState =
    resolveSnapshotValidationState(
      validationStates,
    );

  if (
    validationState ===
    "REJECTED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_SNAPSHOT_BUILDER_MODULE_NAME}] ` +
        "Snapshot boundary rejection: at least one upstream contract is REJECTED.",
    );
  }

  const degradationReasons =
    collectDegradationReasons(
      input,
    );

  /**
   * Explicit annotation here is intentional.
   *
   * Contract drift must fail exactly at the snapshot construction boundary
   * rather than leaking into a downstream transformer or runtime adapter.
   */
  const snapshot:
    SearchPrivateDocumentSnapshot =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_PRIVATE_SNAPSHOT_CONTRACT_VERSION,

      created_at:
        input.created_at,

      document_id:
        input.document_id,

      query_id:
        input.query_id,

      cohort_id:
        input.cohort_id,

      snapshot_version:
        input.snapshot_version,

      snapshot_id:
        input.snapshot_id,

      raw_document_reference:
        buildRawDocumentReference(
          input.raw_document_reference,
        ),

      extracted_document:
        input.extracted_document,

      segmented_document:
        input.segmented_document,

      lexical_document:
        input.lexical_document,

      frequency_signals:
        input.frequency_signals,

      intrinsic_anchor_signals:
        input.intrinsic_anchor_signals,

      context_aggregation:
        input.context_aggregation,

      query_document_signals:
        input.query_document_signals,

      link_signals:
        input.link_signals,

      temporal_signals:
        input.temporal_signals,

      behavioral_signals:
        input.behavioral_signals,

      intrinsic_document_score_vector:
        input.intrinsic_document_score_vector,

      temporal_document_score_vector:
        input.temporal_document_score_vector,

      query_relative_score_vector:
        input.query_relative_score_vector,

      link_authority_score_vector:
        input.link_authority_score_vector,

      behavioral_calibration_score_vector:
        input.behavioral_calibration_score_vector,

      positive_score_vector:
        input.positive_score_vector,

      penalty_vector:
        input.penalty_vector,

      global_score:
        input.global_score,

      eligibility:
        input.eligibility,

      cohort_definition:
        input.cohort_definition,

      cohort_distribution:
        input.cohort_distribution,

      relative_evaluation:
        input.relative_evaluation,

      private_decision:
        input.private_decision,

      traces:
        Object.freeze([
          ...input.traces,
        ]),

      variable_lineage:
        Object.freeze([
          ...input.variable_lineage,
        ]),

      validation_state:
        validationState,

      degradation_reasons:
        degradationReasons,

      visibility:
        "PRIVATE",
    });

  return snapshot;
}
