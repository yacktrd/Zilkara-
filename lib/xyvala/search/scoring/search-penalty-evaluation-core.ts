/* ============================================================================
 * FILE: lib/xyvala/search/scoring/search-penalty-evaluation-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical penalty evaluation engine
 *
 * ROLE
 * - consume validated canonical upstream evidence
 * - evaluate negative analytical evidence independently from positive scoring
 * - produce the canonical SearchPenaltyVector
 * - produce blocking constraints only from explicit validated evidence
 * - preserve document and query identities
 * - propagate degraded and unavailable evidence explicitly
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - SEARCH DOMAIN
 * - PENALTY EVALUATION
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - CANONICAL PRODUCER
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchLexicalDocument
 * - SearchContextAggregation
 * - SearchQueryDocumentSignals
 * - SearchLinkSignals
 * - SearchTemporalSignals
 * - SearchPenalty
 * - SearchBlockingConstraint
 * - SearchPenaltyVector
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage Registry
 * - Boundary Protection System
 * - Explicit Availability Governance
 *
 * CONSUMERS
 * - Xyvala Search analytical aggregation engine
 * - Xyvala Search eligibility engine
 * - Xyvala Search private snapshot builder
 * - Xyvala Search traceability
 *
 * DIRECTIVES
 * - negative analytical evidence only
 * - penalties remain strictly separated from positive scores
 * - blocking constraints remain strictly separated from penalties
 * - consume canonical upstream truth only
 * - calculate penalties only inside this legitimate producer layer
 * - no positive score calculation
 * - no positive score modification
 * - no score reconstruction
 * - no query relevance recalculation
 * - no lexical reconstruction
 * - no anchor reconstruction
 * - no context reconstruction
 * - no link reconstruction
 * - no temporal reconstruction
 * - no duplicate-content inference without canonical evidence
 * - no invalid-source inference without canonical evidence
 * - no unsupported-document-type inference without canonical evidence
 * - no hidden threshold
 * - no hardcoded analytical policy
 * - no neutral numerical default for unavailable evidence
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no synthetic confidence
 * - no global score aggregation
 * - no eligibility evaluation
 * - no cohort normalization
 * - no ranking
 * - no private decision
 * - no persistence
 * - no runtime mutation
 * - no implicit timestamp
 *
 * OPTIONAL CONFIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * Search 2.1 distinguishes:
 *
 * AVAILABLE(0)
 * - a canonical confidence exists and its value is exactly zero.
 *
 * non-AVAILABLE
 * - no canonical confidence value exists.
 *
 * Therefore:
 *
 * - link_signal_confidence is never coerced into a number;
 * - temporal_confidence is never coerced into a number;
 * - missing confidence never becomes 0;
 * - missing confidence never becomes a policy-derived substitute;
 * - missing confidence is propagated as degradation metadata;
 * - a link-derived SearchPenalty / SearchBlockingConstraint requiring
 *   canonical link confidence is not fabricated when that confidence is
 *   unavailable.
 *
 * TEMPORAL CONFIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * Temporal rupture events own their own event confidence.
 *
 * SearchTemporalSignals.temporal_confidence is therefore observed as upstream
 * optional evidence but is not substituted for SearchTemporalRuptureEvent
 * confidence and is not used to reconstruct it.
 *
 * INPUTS
 * - SearchLexicalDocument
 * - SearchContextAggregation
 * - SearchQueryDocumentSignals
 * - SearchLinkSignals
 * - SearchTemporalSignals
 * - SearchPenaltyEvaluationPolicy
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - SearchPenaltyVector
 *
 * INVARIANTS
 * - all documentary inputs belong to the same document
 * - the query identity comes exclusively from SearchQueryDocumentSignals
 * - every penalty is supported by explicit upstream evidence
 * - every penalty threshold comes from explicit policy
 * - every severity is normalized between 0 and 1
 * - every confidence is normalized between 0 and 1
 * - AVAILABLE(0) remains canonical zero
 * - unavailable evidence never becomes zero evidence
 * - unavailable confidence never becomes numerical confidence
 * - degraded evidence remains explicitly degraded
 * - rejected upstream contracts never cross this boundary
 * - total_penalty_value is produced only by this layer
 * - blocking constraints are produced only where the canonical contract allows
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * SearchOptionalEvidence used as number
 * => producer/consumer contract migration boundary
 *
 * missing link confidence replaced with 0
 * => explicit availability violation
 *
 * temporal confidence reconstructed from rupture-event confidence
 * => temporal ownership violation
 *
 * link confidence reconstructed from policy
 * => Link Signal Detection ownership violation
 *
 * missing evidence hidden while producing valid output
 * => degradation propagation violation
 * ========================================================================== */

import type {
  SearchBlockingConstraint,
  SearchConfidenceScore,
  SearchContextAggregation,
  SearchContractVersion,
  SearchDocumentId,
  SearchIsoTimestamp,
  SearchLexicalDocument,
  SearchLinkSignals,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchOptionalEvidence,
  SearchPenalty,
  SearchPenaltyVector,
  SearchPolicyVersion,
  SearchQueryDocumentSignals,
  SearchQueryId,
  SearchRatio,
  SearchTemporalSignals,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME =
  "xyvala-search-penalty-evaluation-core" as const;

/**
 * Search 2.1 migration.
 *
 * 1.1.0 explicitly handles upstream optional confidence without converting
 * non-AVAILABLE evidence into numerical truth.
 */
export const XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

export const XYVALA_SEARCH_PENALTY_VECTOR_CONTRACT_VERSION:
  SearchContractVersion =
    "2.0.0";

/* ============================================================================
 * 2. POLICY CONTRACT
 * ----------------------------------------------------------------------------
 * Thresholds belong to explicit policy.
 *
 * This module must never invent, hide or silently alter analytical thresholds.
 *
 * Confidence values below apply only to upstream contracts that do not expose
 * their own canonical confidence.
 *
 * They MUST NOT replace unavailable Link or Temporal confidence evidence.
 * ========================================================================== */

export interface SearchPenaltyEvaluationPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  /* --------------------------------------------------------------------------
   * Documentary volume
   * ----------------------------------------------------------------------- */

  readonly minimum_token_count:
    number;

  /* --------------------------------------------------------------------------
   * Lexical quality
   * ----------------------------------------------------------------------- */

  readonly minimum_information_density_ratio:
    SearchRatio;

  readonly excessive_repetition_ratio_threshold:
    SearchRatio;

  /* --------------------------------------------------------------------------
   * Query/document compatibility
   * ----------------------------------------------------------------------- */

  readonly minimum_query_term_coverage_score:
    SearchNormalizedScore;

  readonly critical_query_term_coverage_score:
    SearchNormalizedScore;

  /* --------------------------------------------------------------------------
   * Structural coherence
   * ----------------------------------------------------------------------- */

  readonly minimum_anchor_coverage_ratio:
    SearchRatio;

  readonly minimum_context_convergence_score:
    SearchNormalizedScore;

  /* --------------------------------------------------------------------------
   * Link manipulation evidence
   * ----------------------------------------------------------------------- */

  readonly reciprocal_link_ratio_threshold:
    SearchRatio;

  readonly critical_reciprocal_link_ratio_threshold:
    SearchRatio;

  readonly suspected_link_cluster_ratio_threshold:
    SearchRatio;

  readonly critical_link_cluster_ratio_threshold:
    SearchRatio;

  readonly repeated_anchor_text_ratio_threshold:
    SearchRatio;

  readonly critical_repeated_anchor_text_ratio_threshold:
    SearchRatio;

  /* --------------------------------------------------------------------------
   * Temporal rupture evidence
   * ----------------------------------------------------------------------- */

  readonly temporal_rupture_penalty_threshold:
    SearchNormalizedScore;

  readonly critical_temporal_rupture_threshold:
    SearchNormalizedScore;

  /* --------------------------------------------------------------------------
   * Penalty aggregation
   * ----------------------------------------------------------------------- */

  readonly maximum_total_penalty:
    SearchNormalizedScore;

  /* --------------------------------------------------------------------------
   * Evidence confidence policy
   * --------------------------------------------------------------------------
   *
   * These policy confidences apply only when the consumed canonical source
   * contract does not itself own a dedicated confidence identity.
   *
   * In particular they MUST NOT be used as fallback for:
   * - SearchLinkSignals.link_signal_confidence;
   * - SearchTemporalSignals.temporal_confidence.
   * ----------------------------------------------------------------------- */

  readonly valid_evidence_confidence:
    SearchConfidenceScore;

  readonly degraded_evidence_confidence:
    SearchConfidenceScore;

  readonly unvalidated_evidence_confidence:
    SearchConfidenceScore;
}

/* ============================================================================
 * 3. INPUT CONTRACT
 * ========================================================================== */

export interface SearchPenaltyEvaluationInput {
  readonly lexical_document:
    SearchLexicalDocument;

  readonly context_aggregation:
    SearchContextAggregation;

  readonly query_document_signals:
    SearchQueryDocumentSignals;

  readonly link_signals:
    SearchLinkSignals;

  readonly temporal_signals:
    SearchTemporalSignals;

  readonly policy:
    SearchPenaltyEvaluationPolicy;

  /**
   * Deterministic timestamp supplied by the authorized execution boundary.
   *
   * This module never reads the runtime clock.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 4. INTERNAL ACCUMULATOR
 * ========================================================================== */

interface SearchPenaltyEvaluationAccumulator {
  readonly penalties:
    SearchPenalty[];

  readonly blocking_constraints:
    SearchBlockingConstraint[];

  readonly degradation_reasons:
    string[];
}

/* ============================================================================
 * 5. BASIC CONTRACT ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    string,

  fieldName:
    string,
): void {
  if (
    value.trim().length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must not be empty.`,
    );
  }
}

function assertFiniteNumber(
  value:
    number,

  fieldName:
    string,
): void {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be finite.`,
    );
  }
}

function assertNonNegativeNumber(
  value:
    number,

  fieldName:
    string,
): void {
  assertFiniteNumber(
    value,
    fieldName,
  );

  if (
    value <
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be non-negative.`,
    );
  }
}

function assertNormalizedNumber(
  value:
    number,

  fieldName:
    string,
): void {
  assertFiniteNumber(
    value,
    fieldName,
  );

  if (
    value <
      0 ||
    value >
      1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between 0 and 1.`,
    );
  }
}

function assertValidIsoTimestamp(
  value:
    SearchIsoTimestamp,

  fieldName:
    string,
): void {
  assertNonEmptyString(
    value,
    fieldName,
  );

  const parsed =
    Date.parse(
      value,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

/* ============================================================================
 * 6. VALIDATION-STATE GOVERNANCE
 * ========================================================================== */

function assertUpstreamNotRejected(
  contractName:
    string,

  validationState:
    SearchValidationState,
): void {
  if (
    validationState ===
      "REJECTED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        `Boundary rejection: ${contractName} has validation_state REJECTED.`,
    );
  }
}

function resolveEvidenceConfidence(
  validationState:
    SearchValidationState,

  policy:
    SearchPenaltyEvaluationPolicy,
): SearchConfidenceScore {
  switch (
    validationState
  ) {
    case "VALID":
      return policy
        .valid_evidence_confidence;

    case "DEGRADED":
      return policy
        .degraded_evidence_confidence;

    case "UNVALIDATED":
      return policy
        .unvalidated_evidence_confidence;

    case "REJECTED":
      throw new Error(
        `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
          "Internal invariant violation: rejected evidence cannot be evaluated.",
      );
  }
}

/* ============================================================================
 * 7. POLICY VALIDATION
 * ========================================================================== */

function validatePenaltyPolicy(
  policy:
    SearchPenaltyEvaluationPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertNonNegativeNumber(
    policy.minimum_token_count,
    "policy.minimum_token_count",
  );

  const normalizedFields:
    readonly (
      readonly [
        string,
        number,
      ]
    )[] = [
      [
        "minimum_information_density_ratio",
        policy.minimum_information_density_ratio,
      ],
      [
        "excessive_repetition_ratio_threshold",
        policy.excessive_repetition_ratio_threshold,
      ],
      [
        "minimum_query_term_coverage_score",
        policy.minimum_query_term_coverage_score,
      ],
      [
        "critical_query_term_coverage_score",
        policy.critical_query_term_coverage_score,
      ],
      [
        "minimum_anchor_coverage_ratio",
        policy.minimum_anchor_coverage_ratio,
      ],
      [
        "minimum_context_convergence_score",
        policy.minimum_context_convergence_score,
      ],
      [
        "reciprocal_link_ratio_threshold",
        policy.reciprocal_link_ratio_threshold,
      ],
      [
        "critical_reciprocal_link_ratio_threshold",
        policy.critical_reciprocal_link_ratio_threshold,
      ],
      [
        "suspected_link_cluster_ratio_threshold",
        policy.suspected_link_cluster_ratio_threshold,
      ],
      [
        "critical_link_cluster_ratio_threshold",
        policy.critical_link_cluster_ratio_threshold,
      ],
      [
        "repeated_anchor_text_ratio_threshold",
        policy.repeated_anchor_text_ratio_threshold,
      ],
      [
        "critical_repeated_anchor_text_ratio_threshold",
        policy.critical_repeated_anchor_text_ratio_threshold,
      ],
      [
        "temporal_rupture_penalty_threshold",
        policy.temporal_rupture_penalty_threshold,
      ],
      [
        "critical_temporal_rupture_threshold",
        policy.critical_temporal_rupture_threshold,
      ],
      [
        "maximum_total_penalty",
        policy.maximum_total_penalty,
      ],
      [
        "valid_evidence_confidence",
        policy.valid_evidence_confidence,
      ],
      [
        "degraded_evidence_confidence",
        policy.degraded_evidence_confidence,
      ],
      [
        "unvalidated_evidence_confidence",
        policy.unvalidated_evidence_confidence,
      ],
    ];

  for (
    const [
      fieldName,
      value,
    ] of normalizedFields
  ) {
    assertNormalizedNumber(
      value,
      `policy.${fieldName}`,
    );
  }

  if (
    policy
      .critical_query_term_coverage_score >
    policy
      .minimum_query_term_coverage_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: critical_query_term_coverage_score must not exceed minimum_query_term_coverage_score.",
    );
  }

  if (
    policy
      .critical_reciprocal_link_ratio_threshold <
    policy
      .reciprocal_link_ratio_threshold
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: critical_reciprocal_link_ratio_threshold must be greater than or equal to reciprocal_link_ratio_threshold.",
    );
  }

  if (
    policy
      .critical_link_cluster_ratio_threshold <
    policy
      .suspected_link_cluster_ratio_threshold
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: critical_link_cluster_ratio_threshold must be greater than or equal to suspected_link_cluster_ratio_threshold.",
    );
  }

  if (
    policy
      .critical_repeated_anchor_text_ratio_threshold <
    policy
      .repeated_anchor_text_ratio_threshold
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: critical_repeated_anchor_text_ratio_threshold must be greater than or equal to repeated_anchor_text_ratio_threshold.",
    );
  }

  if (
    policy
      .critical_temporal_rupture_threshold <
    policy
      .temporal_rupture_penalty_threshold
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: critical_temporal_rupture_threshold must be greater than or equal to temporal_rupture_penalty_threshold.",
    );
  }

  if (
    policy
      .valid_evidence_confidence <
    policy
      .degraded_evidence_confidence
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: valid_evidence_confidence must be greater than or equal to degraded_evidence_confidence.",
    );
  }

  if (
    policy
      .degraded_evidence_confidence <
    policy
      .unvalidated_evidence_confidence
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: degraded_evidence_confidence must be greater than or equal to unvalidated_evidence_confidence.",
    );
  }
}

/* ============================================================================
 * 8. INPUT BOUNDARY VALIDATION
 * ========================================================================== */

function resolveCanonicalDocumentId(
  input:
    SearchPenaltyEvaluationInput,
): SearchDocumentId {
  const canonicalDocumentId =
    input.lexical_document
      .document_id;

  assertNonEmptyString(
    canonicalDocumentId,
    "lexical_document.document_id",
  );

  const downstreamDocumentIds =
    [
      input.context_aggregation
        .document_id,

      input.query_document_signals
        .document_id,

      input.link_signals
        .document_id,

      input.temporal_signals
        .document_id,
    ] as const;

  for (
    const documentId of
    downstreamDocumentIds
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
        `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
          "Boundary violation: all penalty inputs must belong to the same document.",
      );
    }
  }

  return canonicalDocumentId;
}

function resolveCanonicalQueryId(
  input:
    SearchPenaltyEvaluationInput,
): SearchQueryId {
  const queryId =
    input.query_document_signals
      .query_id;

  assertNonEmptyString(
    queryId,
    "query_document_signals.query_id",
  );

  return queryId;
}

function validatePenaltyInput(
  input:
    SearchPenaltyEvaluationInput,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validatePenaltyPolicy(
    input.policy,
  );

  assertUpstreamNotRejected(
    "SearchLexicalDocument",
    input.lexical_document
      .validation_state,
  );

  assertUpstreamNotRejected(
    "SearchContextAggregation",
    input.context_aggregation
      .validation_state,
  );

  assertUpstreamNotRejected(
    "SearchQueryDocumentSignals",
    input.query_document_signals
      .validation_state,
  );

  assertUpstreamNotRejected(
    "SearchLinkSignals",
    input.link_signals
      .validation_state,
  );

  assertUpstreamNotRejected(
    "SearchTemporalSignals",
    input.temporal_signals
      .validation_state,
  );

  resolveCanonicalDocumentId(
    input,
  );

  resolveCanonicalQueryId(
    input,
  );
}

/* ============================================================================
 * 9. NORMALIZATION HELPERS
 * ========================================================================== */

function clampNormalizedScore(
  value:
    number,
): SearchNormalizedScore {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME}] ` +
        "Internal invariant violation: normalized value must be finite.",
    );
  }

  if (
    value <=
      0
  ) {
    return 0;
  }

  if (
    value >=
      1
  ) {
    return 1;
  }

  return value;
}

function calculateUpperThresholdSeverity(
  value:
    number,

  threshold:
    number,
): SearchNormalizedScore {
  if (
    value <=
      threshold
  ) {
    return 0;
  }

  if (
    threshold >=
      1
  ) {
    return 0;
  }

  return clampNormalizedScore(
    (
      value -
      threshold
    ) /
      (
        1 -
        threshold
      ),
  );
}

function calculateLowerThresholdSeverity(
  value:
    number,

  threshold:
    number,
): SearchNormalizedScore {
  if (
    value >=
      threshold
  ) {
    return 0;
  }

  if (
    threshold <=
      0
  ) {
    return 0;
  }

  return clampNormalizedScore(
    (
      threshold -
      value
    ) /
      threshold,
  );
}

/* ============================================================================
 * 10. OPTIONAL EVIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * AVAILABLE(0) and unavailable evidence are distinct.
 *
 * These helpers never:
 * - substitute zero;
 * - substitute a policy value;
 * - infer another availability state;
 * - reconstruct upstream truth.
 * ========================================================================== */

function readAvailableEvidence<T>(
  evidence:
    SearchOptionalEvidence<T>,
): T | undefined {
  if (
    evidence
      .availability_state !==
    "AVAILABLE"
  ) {
    return undefined;
  }

  return evidence.value;
}

function recordUnavailableEvidence<T>(
  evidence:
    SearchOptionalEvidence<T>,

  fieldName:
    string,

  degradationCode:
    string,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  if (
    evidence
      .availability_state ===
    "AVAILABLE"
  ) {
    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );

  accumulator
    .degradation_reasons
    .push(
      `${degradationCode}:` +
        `${evidence.availability_state}:` +
        `${evidence.reason}`,
    );
}

function readAvailableConfidenceEvidence(
  evidence:
    SearchOptionalEvidence<SearchConfidenceScore>,

  fieldName:
    string,

  degradationCode:
    string,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): SearchConfidenceScore | undefined {
  if (
    evidence
      .availability_state !==
    "AVAILABLE"
  ) {
    recordUnavailableEvidence(
      evidence,
      fieldName,
      degradationCode,
      accumulator,
    );

    return undefined;
  }

  assertNormalizedNumber(
    evidence.value,
    `${fieldName}.value`,
  );

  return evidence.value;
}

/* ============================================================================
 * 11. CANONICAL PENALTY FACTORY
 * ========================================================================== */

function createPenalty(
  args: {
    readonly penalty_kind:
      SearchPenalty["penalty_kind"];

    readonly severity:
      SearchNormalizedScore;

    readonly confidence:
      SearchConfidenceScore;

    readonly source_features:
      readonly string[];

    readonly explanation:
      string;

    readonly policy_version:
      SearchPolicyVersion;
  },
): SearchPenalty {
  assertNormalizedNumber(
    args.severity,
    "penalty.severity",
  );

  assertNormalizedNumber(
    args.confidence,
    "penalty.confidence",
  );

  assertNonEmptyString(
    args.explanation,
    "penalty.explanation",
  );

  return Object.freeze({
    penalty_kind:
      args.penalty_kind,

    severity:
      args.severity,

    confidence:
      args.confidence,

    source_features:
      Object.freeze([
        ...args.source_features,
      ]),

    explanation:
      args.explanation,

    method:
      "DETERMINISTIC_THRESHOLD_EVALUATION",

    module_name:
      XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_VERSION,

    policy_version:
      args.policy_version,
  });
}

/* ============================================================================
 * 12. CANONICAL BLOCKING-CONSTRAINT FACTORY
 * ========================================================================== */

function createBlockingConstraint(
  args: {
    readonly constraint_kind:
      SearchBlockingConstraint["constraint_kind"];

    readonly confidence:
      SearchConfidenceScore;

    readonly source_features:
      readonly string[];

    readonly reason:
      string;

    readonly policy_version:
      SearchPolicyVersion;
  },
): SearchBlockingConstraint {
  assertNormalizedNumber(
    args.confidence,
    "blocking_constraint.confidence",
  );

  assertNonEmptyString(
    args.reason,
    "blocking_constraint.reason",
  );

  return Object.freeze({
    constraint_kind:
      args.constraint_kind,

    active:
      true,

    confidence:
      args.confidence,

    source_features:
      Object.freeze([
        ...args.source_features,
      ]),

    reason:
      args.reason,

    evaluator_module_version:
      XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_VERSION,

    policy_version:
      args.policy_version,
  });
}

/* ============================================================================
 * 13. LOW TEXT VOLUME
 * ========================================================================== */

function evaluateLowTextVolume(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const tokenCount =
    input.lexical_document
      .token_count;

  assertNonNegativeNumber(
    tokenCount,
    "lexical_document.token_count",
  );

  const minimumTokenCount =
    input.policy
      .minimum_token_count;

  if (
    tokenCount >=
      minimumTokenCount ||
    minimumTokenCount ===
      0
  ) {
    return;
  }

  const severity =
    clampNormalizedScore(
      (
        minimumTokenCount -
        tokenCount
      ) /
        minimumTokenCount,
    );

  const confidence =
    resolveEvidenceConfidence(
      input.lexical_document
        .validation_state,
      input.policy,
    );

  accumulator.penalties.push(
    createPenalty({
      penalty_kind:
        "LOW_TEXT_VOLUME",

      severity,

      confidence,

      source_features: [
        "lexical_document.token_count",
      ],

      explanation:
        "Document token volume is below the active minimum documentary volume policy.",

      policy_version:
        input.policy.policy_version,
    }),
  );
}

/* ============================================================================
 * 14. LOW INFORMATION DENSITY
 * ========================================================================== */

function evaluateLowInformationDensity(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const tokenCount =
    input.lexical_document
      .token_count;

  const vocabularySize =
    input.lexical_document
      .vocabulary_size;

  assertNonNegativeNumber(
    tokenCount,
    "lexical_document.token_count",
  );

  assertNonNegativeNumber(
    vocabularySize,
    "lexical_document.vocabulary_size",
  );

  if (
    tokenCount ===
      0
  ) {
    accumulator
      .degradation_reasons
      .push(
        "PENALTY_EVALUATION:LOW_INFORMATION_DENSITY:INSUFFICIENT_TOKEN_VOLUME",
      );

    return;
  }

  const informationDensity =
    clampNormalizedScore(
      vocabularySize /
        tokenCount,
    );

  const severity =
    calculateLowerThresholdSeverity(
      informationDensity,
      input.policy
        .minimum_information_density_ratio,
    );

  if (
    severity ===
      0
  ) {
    return;
  }

  const confidence =
    resolveEvidenceConfidence(
      input.lexical_document
        .validation_state,
      input.policy,
    );

  accumulator.penalties.push(
    createPenalty({
      penalty_kind:
        "LOW_INFORMATION_DENSITY",

      severity,

      confidence,

      source_features: [
        "lexical_document.token_count",
        "lexical_document.vocabulary_size",
      ],

      explanation:
        "Document lexical information density is below the active minimum information-density policy.",

      policy_version:
        input.policy.policy_version,
    }),
  );
}

/* ============================================================================
 * 15. EXCESSIVE REPETITION
 * ========================================================================== */

function evaluateExcessiveRepetition(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const termStatistics =
    input.lexical_document
      .term_statistics;

  if (
    termStatistics.length ===
      0
  ) {
    accumulator
      .degradation_reasons
      .push(
        "PENALTY_EVALUATION:EXCESSIVE_REPETITION:NO_TERM_STATISTICS",
      );

    return;
  }

  let maximumFrequencyRatio =
    0;

  for (
    const statistic of
    termStatistics
  ) {
    assertNormalizedNumber(
      statistic
        .document_frequency_ratio,
      "lexical_document.term_statistics.document_frequency_ratio",
    );

    maximumFrequencyRatio =
      Math.max(
        maximumFrequencyRatio,
        statistic
          .document_frequency_ratio,
      );
  }

  const severity =
    calculateUpperThresholdSeverity(
      maximumFrequencyRatio,
      input.policy
        .excessive_repetition_ratio_threshold,
    );

  if (
    severity ===
      0
  ) {
    return;
  }

  const confidence =
    resolveEvidenceConfidence(
      input.lexical_document
        .validation_state,
      input.policy,
    );

  accumulator.penalties.push(
    createPenalty({
      penalty_kind:
        "EXCESSIVE_REPETITION",

      severity,

      confidence,

      source_features: [
        "lexical_document.term_statistics.document_frequency_ratio",
      ],

      explanation:
        "At least one validated lexical term exceeds the active repetition policy threshold.",

      policy_version:
        input.policy.policy_version,
    }),
  );
}

/* ============================================================================
 * 16. QUERY MISMATCH
 * ========================================================================== */

function evaluateQueryMismatch(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const queryCoverage =
    input.query_document_signals
      .normalized_query_term_coverage_score;

  assertNormalizedNumber(
    queryCoverage,
    "query_document_signals.normalized_query_term_coverage_score",
  );

  const confidence =
    resolveEvidenceConfidence(
      input.query_document_signals
        .validation_state,
      input.policy,
    );

  const severity =
    calculateLowerThresholdSeverity(
      queryCoverage,
      input.policy
        .minimum_query_term_coverage_score,
    );

  if (
    severity >
      0
  ) {
    accumulator.penalties.push(
      createPenalty({
        penalty_kind:
          "QUERY_MISMATCH",

        severity,

        confidence,

        source_features: [
          "query_document_signals.normalized_query_term_coverage_score",
        ],

        explanation:
          "Canonical normalized query-term coverage is below the active minimum query/document compatibility policy.",

        policy_version:
          input.policy.policy_version,
      }),
    );
  }

  if (
    queryCoverage <
    input.policy
      .critical_query_term_coverage_score
  ) {
    accumulator
      .blocking_constraints
      .push(
        createBlockingConstraint({
          constraint_kind:
            "CRITICAL_QUERY_MISMATCH",

          confidence,

          source_features: [
            "query_document_signals.normalized_query_term_coverage_score",
          ],

          reason:
            "Canonical normalized query-term coverage is below the active critical query/document compatibility policy.",

          policy_version:
            input.policy.policy_version,
        }),
      );
  }
}

/* ============================================================================
 * 17. STRUCTURAL INCOHERENCE
 * ========================================================================== */

function evaluateStructuralIncoherence(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const anchorCoverage =
    input.context_aggregation
      .anchor_sentence_coverage_ratio;

  const convergenceScore =
    input.context_aggregation
      .mean_local_convergence_score;

  assertNormalizedNumber(
    anchorCoverage,
    "context_aggregation.anchor_sentence_coverage_ratio",
  );

  assertNormalizedNumber(
    convergenceScore,
    "context_aggregation.mean_local_convergence_score",
  );

  const coverageSeverity =
    calculateLowerThresholdSeverity(
      anchorCoverage,
      input.policy
        .minimum_anchor_coverage_ratio,
    );

  const convergenceSeverity =
    calculateLowerThresholdSeverity(
      convergenceScore,
      input.policy
        .minimum_context_convergence_score,
    );

  const severity =
    Math.max(
      coverageSeverity,
      convergenceSeverity,
    );

  if (
    severity ===
      0
  ) {
    return;
  }

  const confidence =
    resolveEvidenceConfidence(
      input.context_aggregation
        .validation_state,
      input.policy,
    );

  accumulator.penalties.push(
    createPenalty({
      penalty_kind:
        "STRUCTURAL_INCOHERENCE",

      severity,

      confidence,

      source_features: [
        "context_aggregation.anchor_sentence_coverage_ratio",
        "context_aggregation.mean_local_convergence_score",
      ],

      explanation:
        "Validated documentary anchor coverage or convergence is below the active structural-coherence policy.",

      policy_version:
        input.policy.policy_version,
    }),
  );
}

/* ============================================================================
 * 18. LINK CONFIDENCE RESOLUTION
 * ----------------------------------------------------------------------------
 * SearchLinkSignals owns link_signal_confidence.
 *
 * Penalty Evaluation may consume it.
 *
 * It may not:
 * - reconstruct it;
 * - replace missing confidence with zero;
 * - replace missing confidence with policy confidence.
 * ========================================================================== */

function resolveCanonicalLinkConfidence(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): SearchConfidenceScore | undefined {
  return readAvailableConfidenceEvidence(
    input.link_signals
      .link_signal_confidence,

    "link_signals.link_signal_confidence",

    "PENALTY_EVALUATION:LINK_SIGNAL_CONFIDENCE",

    accumulator,
  );
}

/* ============================================================================
 * 19. LINK SIGNAL — RECIPROCAL LINK ABUSE
 * ========================================================================== */

function evaluateReciprocalLinkAbuse(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const evidence =
    input.link_signals
      .reciprocal_link_ratio;

  const reciprocalLinkRatio =
    readAvailableEvidence(
      evidence,
    );

  if (
    reciprocalLinkRatio ===
      undefined
  ) {
    recordUnavailableEvidence(
      evidence,

      "link_signals.reciprocal_link_ratio",

      "PENALTY_EVALUATION:RECIPROCAL_LINK_RATIO",

      accumulator,
    );

    return;
  }

  assertNormalizedNumber(
    reciprocalLinkRatio,
    "link_signals.reciprocal_link_ratio.value",
  );

  const severity =
    calculateUpperThresholdSeverity(
      reciprocalLinkRatio,
      input.policy
        .reciprocal_link_ratio_threshold,
    );

  const criticalConstraintRequired =
    reciprocalLinkRatio >=
    input.policy
      .critical_reciprocal_link_ratio_threshold;

  if (
    severity ===
      0 &&
    !criticalConstraintRequired
  ) {
    return;
  }

  const linkConfidence =
    resolveCanonicalLinkConfidence(
      input,
      accumulator,
    );

  if (
    linkConfidence ===
      undefined
  ) {
    /*
     * Canonical anomaly evidence exists, but the penalty contract requires a
     * numerical confidence and Search 2.1 explicitly says missing confidence
     * is not zero.
     *
     * Therefore no synthetic penalty/constraint may be emitted.
     */
    return;
  }

  if (
    severity >
      0
  ) {
    accumulator.penalties.push(
      createPenalty({
        penalty_kind:
          "RECIPROCAL_LINK_ABUSE",

        severity,

        confidence:
          linkConfidence,

        source_features: [
          "link_signals.reciprocal_link_ratio",
          "link_signals.link_signal_confidence",
        ],

        explanation:
          "Observed reciprocal-link ratio exceeds the active defensive policy threshold.",

        policy_version:
          input.policy.policy_version,
      }),
    );
  }

  if (
    criticalConstraintRequired
  ) {
    accumulator
      .blocking_constraints
      .push(
        createBlockingConstraint({
          constraint_kind:
            "CRITICAL_LINK_MANIPULATION",

          confidence:
            linkConfidence,

          source_features: [
            "link_signals.reciprocal_link_ratio",
            "link_signals.link_signal_confidence",
          ],

          reason:
            "Observed reciprocal-link ratio exceeds the active critical link-manipulation policy.",

          policy_version:
            input.policy.policy_version,
        }),
      );
  }
}

/* ============================================================================
 * 20. LINK SIGNAL — SOURCE CLUSTER CONCENTRATION
 * ========================================================================== */

function evaluateSourceClusterConcentration(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const evidence =
    input.link_signals
      .suspected_link_cluster_ratio;

  const clusterRatio =
    readAvailableEvidence(
      evidence,
    );

  if (
    clusterRatio ===
      undefined
  ) {
    recordUnavailableEvidence(
      evidence,

      "link_signals.suspected_link_cluster_ratio",

      "PENALTY_EVALUATION:SUSPECTED_LINK_CLUSTER_RATIO",

      accumulator,
    );

    return;
  }

  assertNormalizedNumber(
    clusterRatio,
    "link_signals.suspected_link_cluster_ratio.value",
  );

  const severity =
    calculateUpperThresholdSeverity(
      clusterRatio,
      input.policy
        .suspected_link_cluster_ratio_threshold,
    );

  const criticalConstraintRequired =
    clusterRatio >=
    input.policy
      .critical_link_cluster_ratio_threshold;

  if (
    severity ===
      0 &&
    !criticalConstraintRequired
  ) {
    return;
  }

  const linkConfidence =
    resolveCanonicalLinkConfidence(
      input,
      accumulator,
    );

  if (
    linkConfidence ===
      undefined
  ) {
    return;
  }

  if (
    severity >
      0
  ) {
    accumulator.penalties.push(
      createPenalty({
        penalty_kind:
          "SOURCE_CLUSTER_CONCENTRATION",

        severity,

        confidence:
          linkConfidence,

        source_features: [
          "link_signals.suspected_link_cluster_ratio",
          "link_signals.link_signal_confidence",
        ],

        explanation:
          "Observed source-cluster concentration exceeds the active defensive policy threshold.",

        policy_version:
          input.policy.policy_version,
      }),
    );
  }

  if (
    criticalConstraintRequired
  ) {
    accumulator
      .blocking_constraints
      .push(
        createBlockingConstraint({
          constraint_kind:
            "CRITICAL_LINK_MANIPULATION",

          confidence:
            linkConfidence,

          source_features: [
            "link_signals.suspected_link_cluster_ratio",
            "link_signals.link_signal_confidence",
          ],

          reason:
            "Observed source-cluster concentration exceeds the active critical link-manipulation policy.",

          policy_version:
            input.policy.policy_version,
        }),
      );
  }
}

/* ============================================================================
 * 21. LINK SIGNAL — ANCHOR TEXT MANIPULATION
 * ========================================================================== */

function evaluateAnchorTextManipulation(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const evidence =
    input.link_signals
      .repeated_anchor_text_ratio;

  const repeatedAnchorTextRatio =
    readAvailableEvidence(
      evidence,
    );

  if (
    repeatedAnchorTextRatio ===
      undefined
  ) {
    recordUnavailableEvidence(
      evidence,

      "link_signals.repeated_anchor_text_ratio",

      "PENALTY_EVALUATION:REPEATED_ANCHOR_TEXT_RATIO",

      accumulator,
    );

    return;
  }

  assertNormalizedNumber(
    repeatedAnchorTextRatio,
    "link_signals.repeated_anchor_text_ratio.value",
  );

  const severity =
    calculateUpperThresholdSeverity(
      repeatedAnchorTextRatio,
      input.policy
        .repeated_anchor_text_ratio_threshold,
    );

  const criticalConstraintRequired =
    repeatedAnchorTextRatio >=
    input.policy
      .critical_repeated_anchor_text_ratio_threshold;

  if (
    severity ===
      0 &&
    !criticalConstraintRequired
  ) {
    return;
  }

  const linkConfidence =
    resolveCanonicalLinkConfidence(
      input,
      accumulator,
    );

  if (
    linkConfidence ===
      undefined
  ) {
    return;
  }

  if (
    severity >
      0
  ) {
    accumulator.penalties.push(
      createPenalty({
        penalty_kind:
          "ANCHOR_TEXT_MANIPULATION",

        severity,

        confidence:
          linkConfidence,

        source_features: [
          "link_signals.repeated_anchor_text_ratio",
          "link_signals.link_signal_confidence",
        ],

        explanation:
          "Observed repeated anchor-text ratio exceeds the active defensive policy threshold.",

        policy_version:
          input.policy.policy_version,
      }),
    );
  }

  if (
    criticalConstraintRequired
  ) {
    accumulator
      .blocking_constraints
      .push(
        createBlockingConstraint({
          constraint_kind:
            "CRITICAL_LINK_MANIPULATION",

          confidence:
            linkConfidence,

          source_features: [
            "link_signals.repeated_anchor_text_ratio",
            "link_signals.link_signal_confidence",
          ],

          reason:
            "Observed repeated anchor-text ratio exceeds the active critical link-manipulation policy.",

          policy_version:
            input.policy.policy_version,
        }),
      );
  }
}

/* ============================================================================
 * 22. TEMPORAL CONFIDENCE OBSERVATION
 * ----------------------------------------------------------------------------
 * SearchTemporalSignals.temporal_confidence is explicit optional evidence.
 *
 * Rupture events already expose their own canonical event confidence.
 *
 * Therefore:
 * - AVAILABLE temporal confidence is structurally validated;
 * - unavailable temporal confidence is preserved as degradation;
 * - it is NOT converted to zero;
 * - it is NOT substituted for rupture-event confidence;
 * - rupture-event confidence is NOT used to reconstruct temporal_confidence.
 * ========================================================================== */

function observeTemporalConfidenceAvailability(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const evidence =
    input.temporal_signals
      .temporal_confidence;

  if (
    evidence
      .availability_state ===
    "AVAILABLE"
  ) {
    assertNormalizedNumber(
      evidence.value,
      "temporal_signals.temporal_confidence.value",
    );

    return;
  }

  recordUnavailableEvidence(
    evidence,

    "temporal_signals.temporal_confidence",

    "PENALTY_EVALUATION:TEMPORAL_CONFIDENCE",

    accumulator,
  );
}

/* ============================================================================
 * 23. TEMPORAL RUPTURE
 * ----------------------------------------------------------------------------
 * CONTENT_REPLACEMENT and generic temporal rupture are separated to avoid
 * penalizing the same rupture event twice under two identities.
 *
 * The confidence attached to each produced penalty is the canonical
 * SearchTemporalRuptureEvent.confidence.
 * ========================================================================== */

function evaluateTemporalRupture(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  if (
    input.temporal_signals
      .temporal_state !==
    "CALIBRATED"
  ) {
    accumulator
      .degradation_reasons
      .push(
        `PENALTY_EVALUATION:TEMPORAL:${input.temporal_signals.temporal_state}`,
      );

    return;
  }

  observeTemporalConfidenceAvailability(
    input,
    accumulator,
  );

  let maximumGeneralRuptureSeverity =
    0;

  let maximumGeneralRuptureConfidence =
    0;

  let maximumContentReplacementSeverity =
    0;

  let maximumContentReplacementConfidence =
    0;

  for (
    const ruptureEvent of
    input.temporal_signals
      .rupture_events
  ) {
    assertNormalizedNumber(
      ruptureEvent.severity,
      "temporal_signals.rupture_events.severity",
    );

    assertNormalizedNumber(
      ruptureEvent.confidence,
      "temporal_signals.rupture_events.confidence",
    );

    if (
      ruptureEvent
        .rupture_kind ===
      "CONTENT_REPLACEMENT"
    ) {
      if (
        ruptureEvent.severity >
        maximumContentReplacementSeverity
      ) {
        maximumContentReplacementSeverity =
          ruptureEvent.severity;

        maximumContentReplacementConfidence =
          ruptureEvent.confidence;
      }

      continue;
    }

    if (
      ruptureEvent.severity >
      maximumGeneralRuptureSeverity
    ) {
      maximumGeneralRuptureSeverity =
        ruptureEvent.severity;

      maximumGeneralRuptureConfidence =
        ruptureEvent.confidence;
    }
  }

  if (
    maximumGeneralRuptureSeverity >=
    input.policy
      .temporal_rupture_penalty_threshold
  ) {
    accumulator.penalties.push(
      createPenalty({
        penalty_kind:
          "TEMPORAL_RUPTURE",

        severity:
          maximumGeneralRuptureSeverity,

        confidence:
          maximumGeneralRuptureConfidence,

        source_features: [
          "temporal_signals.rupture_events",
          "temporal_signals.rupture_evolution_state",
        ],

        explanation:
          "Validated temporal rupture evidence exceeds the active temporal rupture policy threshold.",

        policy_version:
          input.policy.policy_version,
      }),
    );
  }

  if (
    maximumContentReplacementSeverity >=
    input.policy
      .temporal_rupture_penalty_threshold
  ) {
    accumulator.penalties.push(
      createPenalty({
        penalty_kind:
          "CONTENT_REPLACEMENT",

        severity:
          maximumContentReplacementSeverity,

        confidence:
          maximumContentReplacementConfidence,

        source_features: [
          "temporal_signals.rupture_events.CONTENT_REPLACEMENT",
        ],

        explanation:
          "Validated temporal evidence identifies a content-replacement rupture above the active penalty threshold.",

        policy_version:
          input.policy.policy_version,
      }),
    );
  }

  const maximumCriticalSeverity =
    Math.max(
      maximumGeneralRuptureSeverity,
      maximumContentReplacementSeverity,
    );

  const maximumCriticalConfidence =
    maximumGeneralRuptureSeverity >=
    maximumContentReplacementSeverity
      ? maximumGeneralRuptureConfidence
      : maximumContentReplacementConfidence;

  if (
    maximumCriticalSeverity >=
    input.policy
      .critical_temporal_rupture_threshold
  ) {
    accumulator
      .blocking_constraints
      .push(
        createBlockingConstraint({
          constraint_kind:
            "CRITICAL_TEMPORAL_RUPTURE",

          confidence:
            maximumCriticalConfidence,

          source_features: [
            "temporal_signals.rupture_events",
          ],

          reason:
            "Validated temporal rupture evidence exceeds the active critical temporal rupture policy.",

          policy_version:
            input.policy.policy_version,
        }),
      );
  }
}

/* ============================================================================
 * 24. UPSTREAM DEGRADATION PROPAGATION
 * ========================================================================== */

function collectUpstreamDegradation(
  input:
    SearchPenaltyEvaluationInput,

  accumulator:
    SearchPenaltyEvaluationAccumulator,
): void {
  const sources =
    [
      {
        layer:
          "LEXICAL_ANALYSIS",

        validation_state:
          input.lexical_document
            .validation_state,

        degradation_reasons:
          input.lexical_document
            .degradation_reasons,
      },
      {
        layer:
          "CONTEXT_AGGREGATION",

        validation_state:
          input.context_aggregation
            .validation_state,

        degradation_reasons:
          input.context_aggregation
            .degradation_reasons,
      },
      {
        layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        validation_state:
          input.query_document_signals
            .validation_state,

        degradation_reasons:
          input.query_document_signals
            .degradation_reasons,
      },
      {
        layer:
          "LINK_SIGNAL_DETECTION",

        validation_state:
          input.link_signals
            .validation_state,

        degradation_reasons:
          input.link_signals
            .degradation_reasons,
      },
      {
        layer:
          "TEMPORAL_SIGNAL_DETECTION",

        validation_state:
          input.temporal_signals
            .validation_state,

        degradation_reasons:
          input.temporal_signals
            .degradation_reasons,
      },
    ] as const;

  for (
    const source of
    sources
  ) {
    if (
      source.validation_state ===
        "DEGRADED" ||
      source.validation_state ===
        "UNVALIDATED"
    ) {
      accumulator
        .degradation_reasons
        .push(
          `PENALTY_EVALUATION:${source.layer}:${source.validation_state}`,
        );
    }

    for (
      const reason of
      source.degradation_reasons
    ) {
      accumulator
        .degradation_reasons
        .push(
          `PENALTY_EVALUATION:${source.layer}:${reason}`,
        );
    }
  }
}

/* ============================================================================
 * 25. TOTAL PENALTY VALUE
 * ----------------------------------------------------------------------------
 * PENALTY_EVALUATION is the sole producer of total_penalty_value.
 *
 * Downstream Analytical Aggregation consumes this value without recomputing it.
 *
 * Each produced penalty contributes once.
 * ========================================================================== */

function calculateTotalPenaltyValue(
  penalties:
    readonly SearchPenalty[],

  maximumTotalPenalty:
    SearchNormalizedScore,
): SearchNormalizedScore {
  const weightedPenaltySum =
    penalties.reduce(
      (
        total,
        penalty,
      ) =>
        total +
        penalty.severity *
          penalty.confidence,
      0,
    );

  return clampNormalizedScore(
    Math.min(
      weightedPenaltySum,
      maximumTotalPenalty,
    ),
  );
}

/* ============================================================================
 * 26. FINAL VALIDATION STATE
 * ========================================================================== */

function resolvePenaltyValidationState(
  args: {
    readonly degradation_reasons:
      readonly string[];
  },
): SearchValidationState {
  if (
    args
      .degradation_reasons
      .length >
    0
  ) {
    return "DEGRADED";
  }

  return "VALID";
}

/* ============================================================================
 * 27. CANONICAL COMPUTE FUNCTION
 * ----------------------------------------------------------------------------
 * Pure deterministic penalty-evaluation boundary.
 *
 * This function:
 * - validates canonical upstream contracts;
 * - validates document and query identity;
 * - evaluates negative analytical evidence owned by this layer;
 * - produces authorized blocking constraints;
 * - preserves unavailable-data semantics;
 * - preserves optional confidence semantics;
 * - produces SearchPenaltyVector.
 *
 * It performs no:
 * - positive scoring;
 * - positive score modification;
 * - score reconstruction;
 * - global score aggregation;
 * - eligibility evaluation;
 * - cohort normalization;
 * - private decision;
 * - public ranking;
 * - persistence;
 * - event publication;
 * - runtime mutation.
 * ========================================================================== */

export function evaluateSearchPenalties(
  input:
    SearchPenaltyEvaluationInput,
): SearchPenaltyVector {
  validatePenaltyInput(
    input,
  );

  const documentId =
    resolveCanonicalDocumentId(
      input,
    );

  const queryId =
    resolveCanonicalQueryId(
      input,
    );

  const accumulator:
    SearchPenaltyEvaluationAccumulator = {
      penalties: [],
      blocking_constraints: [],
      degradation_reasons: [],
    };

  collectUpstreamDegradation(
    input,
    accumulator,
  );

  evaluateLowTextVolume(
    input,
    accumulator,
  );

  evaluateLowInformationDensity(
    input,
    accumulator,
  );

  evaluateExcessiveRepetition(
    input,
    accumulator,
  );

  evaluateQueryMismatch(
    input,
    accumulator,
  );

  evaluateStructuralIncoherence(
    input,
    accumulator,
  );

  evaluateReciprocalLinkAbuse(
    input,
    accumulator,
  );

  evaluateSourceClusterConcentration(
    input,
    accumulator,
  );

  evaluateAnchorTextManipulation(
    input,
    accumulator,
  );

  evaluateTemporalRupture(
    input,
    accumulator,
  );

  const penalties =
    Object.freeze([
      ...accumulator.penalties,
    ]);

  const blockingConstraints =
    Object.freeze([
      ...accumulator
        .blocking_constraints,
    ]);

  const degradationReasons =
    Object.freeze(
      [
        ...new Set(
          accumulator
            .degradation_reasons,
        ),
      ].sort(),
    );

  const totalPenaltyValue =
    calculateTotalPenaltyValue(
      penalties,
      input.policy
        .maximum_total_penalty,
    );

  const criticalConstraintActive =
    blockingConstraints.some(
      (
        constraint,
      ) =>
        constraint.active,
    );

  const validationState =
    resolvePenaltyValidationState({
      degradation_reasons:
        degradationReasons,
    });

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_PENALTY_VECTOR_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      documentId,

    query_id:
      queryId,

    penalties,

    blocking_constraints:
      blockingConstraints,

    total_penalty_value:
      totalPenaltyValue,

    critical_constraint_active:
      criticalConstraintActive,

    evaluator_module_version:
      XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_VERSION,

    penalty_policy_version:
      input.policy
        .policy_version,

    validation_state:
      validationState,

    degradation_reasons:
      degradationReasons,
  });
}
