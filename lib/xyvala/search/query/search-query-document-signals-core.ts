/* ============================================================================
 * FILE: lib/xyvala/search/query/search-query-document-signals-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical query-document signal detection core
 *
 * ROLE
 * - consume one validated SearchQueryProfile
 * - consume validated documentary truths already produced upstream
 * - measure the deterministic relationship between one canonical query and
 *   one canonical document
 * - produce SearchQueryDocumentSignals
 * - preserve strict separation between intrinsic documentary truth and
 *   query-relative truth
 * - expose unavailable concept evidence explicitly when no canonical concept
 *   producer exists
 *
 * CLASSIFICATION
 * - PRIVATE
 * - SEARCH DOMAIN
 * - QUERY-DOCUMENT SIGNAL DETECTION
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-RANKING
 * - NON-DECISIONAL
 *
 * POSITION IN OFFICIAL CHAIN
 * - Acquisition
 * - Extraction
 * - Segmentation
 * - Lexical Analysis
 * - Frequency Signal Detection
 * - Anchor Signal Detection
 * - Context Aggregation
 * - Link Signal Detection
 * - Temporal Signal Detection
 * - Behavioral Signal Detection
 * - Query Normalization
 * - Query Profiling
 * - QUERY DOCUMENT SIGNAL DETECTION
 * - Intrinsic Document Scoring
 * - Temporal Document Scoring
 * - Query Relevance Scoring
 * - Link Authority Scoring
 * - Behavioral Calibration Scoring
 * - Positive Score Assembly
 * - Penalty Evaluation
 * - Analytical Aggregation
 * - Eligibility
 * - Cohort Normalization
 * - Relative Cohort Evaluation
 * - Private Decision
 * - Calibration
 * - Private Snapshot
 * - Transformation
 * - Public Ranking
 * - API
 * - Interface
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - Search pipeline canonical contract
 * - SearchQueryProfile
 * - SearchSegmentedDocument
 * - SearchLexicalDocument
 * - SearchFrequencySignals
 * - SearchAnchorSignals
 * - SearchContextAggregation
 * - SearchQueryDocumentSignals
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * PRODUCER INPUTS
 * - QUERY_PROFILING
 *   -> SearchQueryProfile
 *
 * - SEGMENTATION
 *   -> SearchSegmentedDocument
 *
 * - LEXICAL_ANALYSIS
 *   -> SearchLexicalDocument
 *
 * - FREQUENCY_SIGNAL_DETECTION
 *   -> SearchFrequencySignals
 *
 * - ANCHOR_SIGNAL_DETECTION
 *   -> SearchAnchorSignals
 *
 * - CONTEXT_AGGREGATION
 *   -> SearchContextAggregation
 *
 * CONSUMERS
 * - Query Relevance Scoring
 * - Penalty Evaluation
 * - Search scoring orchestration
 * - Private Snapshot
 * - propagation audits
 *
 * DIRECTIVES
 * - query-document relationship only
 * - consume canonical query profile only
 * - consume canonical documentary truth only
 * - preserve document identity
 * - preserve query identity
 * - no query normalization
 * - no query profiling
 * - no lexical tokenization
 * - no frequency signal reconstruction
 * - no rarity reconstruction
 * - no intrinsic anchor reconstruction
 * - no context aggregation reconstruction
 * - no link analysis
 * - no temporal analysis
 * - no behavioral analysis
 * - no intrinsic document scoring
 * - no query relevance scoring
 * - no penalty evaluation
 * - no analytical aggregation
 * - no eligibility evaluation
 * - no cohort evaluation
 * - no decision
 * - no calibration
 * - no ranking
 * - no public projection
 * - no implicit missing-data neutralization
 * - no unavailable-to-zero conversion
 * - no local clock
 * - no random values
 * - no mutation
 *
 * INPUTS
 * - SearchQueryProfile
 * - SearchSegmentedDocument
 * - SearchLexicalDocument
 * - SearchFrequencySignals
 * - SearchAnchorSignals
 * - SearchContextAggregation
 * - explicit deterministic created_at
 * - optional explicit policy
 *
 * OUTPUTS
 * - SearchQueryDocumentSignals
 *
 * OWNERSHIP
 * - exact_query_term_coverage_score
 *   <- QUERY_DOCUMENT_SIGNAL_DETECTION
 *
 * - normalized_query_term_coverage_score
 *   <- QUERY_DOCUMENT_SIGNAL_DETECTION
 *
 * - query_rare_term_proximity_score
 *   <- QUERY_DOCUMENT_SIGNAL_DETECTION
 *
 * - query_frequent_term_proximity_score
 *   <- QUERY_DOCUMENT_SIGNAL_DETECTION
 *
 * - query_anchor_signals
 *   <- QUERY_DOCUMENT_SIGNAL_DETECTION
 *
 * - query_anchor_coverage_score
 *   <- QUERY_DOCUMENT_SIGNAL_DETECTION
 *
 * - query_concept_coverage_score
 *   <- canonical concept producer when one exists
 *   <- currently UNAVAILABLE
 *
 * - query_signal_dispersion_score
 *   <- QUERY_DOCUMENT_SIGNAL_DETECTION
 *
 * - query_signal_concentration_score
 *   <- QUERY_DOCUMENT_SIGNAL_DETECTION
 *
 * NON-OWNERSHIP
 * - normalized_query
 *   <- QUERY_PROFILING
 *
 * - query_terms
 *   <- QUERY_PROFILING
 *
 * - lexical occurrences
 *   <- LEXICAL_ANALYSIS
 *
 * - frequent / rare terms
 *   <- FREQUENCY_SIGNAL_DETECTION
 *
 * - intrinsic anchors
 *   <- ANCHOR_SIGNAL_DETECTION
 *
 * - intrinsic convergence
 *   <- ANCHOR_SIGNAL_DETECTION / CONTEXT_AGGREGATION
 *
 * - query_relevance_score
 *   <- QUERY_RELEVANCE_SCORING
 *
 * INVARIANTS
 * - every input belongs to the same document where document identity exists
 * - every query-relative output belongs to exactly one canonical query
 * - REJECTED upstream contracts never cross this compute boundary
 * - exact coverage never performs local query normalization
 * - normalized coverage consumes upstream normalized terms only
 * - frequency terms are consumed, never reselected
 * - anchors are consumed, never reconstructed
 * - intrinsic anchor convergence is never reclassified as query relevance
 * - query concept coverage remains unavailable until a canonical concept
 *   producer exists
 * - no missing analytical evidence is silently converted into neutral evidence
 * - all normalized scores remain within [0, 1]
 * - identical input produces identical output
 * - no runtime clock is read
 * - no input object is mutated
 *
 * FIRST DIVERGENCE
 * - query identity mismatch
 *   => Query Profiling / orchestration boundary
 *
 * - documentary identity mismatch
 *   => upstream orchestration boundary
 *
 * - malformed query terms
 *   => Query Profiling
 *
 * - malformed lexical occurrence
 *   => Lexical Analysis
 *
 * - malformed frequency signal
 *   => Frequency Signal Detection
 *
 * - malformed intrinsic anchor
 *   => Anchor Signal Detection
 *
 * - missing conceptual producer
 *   => explicit UNAVAILABLE concept evidence
 *
 * - query relevance calculation here
 *   => ownership violation
 *
 * SENSITIVE AREAS
 * - intrinsic/query-relative separation
 * - exact vs normalized query coverage
 * - frequency proximity
 * - anchor/query convergence
 * - unavailable concept evidence
 * - deterministic positional calculations
 * ========================================================================== */

import type {
  SearchAnchorSignal,
  SearchAnchorSignals,
  SearchContextAggregation,
  SearchContractVersion,
  SearchFrequencySignals,
  SearchIsoTimestamp,
  SearchLexicalDocument,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchQueryAnchorSignal,
  SearchQueryDocumentSignals,
  SearchQueryProfile,
  SearchQueryTerm,
  SearchSegmentedDocument,
  SearchSentenceId,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME =
  "xyvala-search-query-document-signals-core" as const;

export const XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_VERSION:
  SearchModuleVersion = "1.0.0";

export const XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_CONTRACT_VERSION:
  SearchContractVersion = "2.0.0";

/* ============================================================================
 * 2. POLICY
 * ----------------------------------------------------------------------------
 * Policy governs only calculations owned by this layer.
 *
 * It does not alter upstream query, lexical, frequency or anchor truth.
 * ========================================================================== */

export interface SearchQueryDocumentSignalsPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  /**
   * Maximum sentence distance considered by the deterministic proximity
   * kernel.
   *
   * Distance 0 always resolves to 1.
   * Distances beyond this window resolve to 0.
   */
  readonly maximum_sentence_proximity_distance:
    number;

  /**
   * Controls how intrinsic anchor convergence participates in query-relative
   * anchor convergence.
   *
   * Query coverage remains mandatory and intrinsic convergence can only
   * qualify that coverage.
   */
  readonly anchor_intrinsic_convergence_weight:
    number;
}

export const DEFAULT_XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_POLICY:
  SearchQueryDocumentSignalsPolicy =
  Object.freeze({
    policy_version:
      "1.0.0",

    maximum_sentence_proximity_distance:
      6,

    anchor_intrinsic_convergence_weight:
      0.5,
  });

/* ============================================================================
 * 3. INPUT CONTRACT
 * ========================================================================== */

export interface SearchQueryDocumentSignalsInput {
  readonly query_profile:
    SearchQueryProfile;

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

  /**
   * Explicit deterministic orchestration timestamp.
   *
   * This module must never read the runtime clock.
   */
  readonly created_at:
    SearchIsoTimestamp;

  readonly policy?:
    SearchQueryDocumentSignalsPolicy;
}

/* ============================================================================
 * 4. BASIC ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    string,
  fieldName:
    string,
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-empty string.`,
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

  const timestamp =
    Date.parse(
      value,
    );

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
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
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be finite.`,
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
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be within [0, 1].`,
    );
  }
}

function assertNonNegativeInteger(
  value:
    number,
  fieldName:
    string,
): void {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-negative integer.`,
    );
  }
}

function clamp01(
  value:
    number,
): SearchNormalizedScore {
  assertFiniteNumber(
    value,
    "internal normalized value",
  );

  if (
    value <= 0
  ) {
    return 0;
  }

  if (
    value >= 1
  ) {
    return 1;
  }

  return value;
}

/* ============================================================================
 * 5. VALIDATION STATE GOVERNANCE
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
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        `Boundary rejection: ${contractName} has validation_state REJECTED.`,
    );
  }
}

function resolveOutputValidationState(
  states:
    readonly SearchValidationState[],
): SearchValidationState {
  if (
    states.some(
      (state) =>
        state === "UNVALIDATED",
    )
  ) {
    return "UNVALIDATED";
  }

  if (
    states.some(
      (state) =>
        state === "DEGRADED",
    )
  ) {
    return "DEGRADED";
  }

  return "VALID";
}

function collectUpstreamDegradationReasons(
  input:
    SearchQueryDocumentSignalsInput,
): readonly string[] {
  const reasons =
    new Set<string>();

  for (
    const reason of
    input.query_profile.degradation_reasons
  ) {
    reasons.add(
      `QUERY_PROFILING:${reason}`,
    );
  }

  for (
    const reason of
    input.segmented_document.degradation_reasons
  ) {
    reasons.add(
      `SEGMENTATION:${reason}`,
    );
  }

  for (
    const reason of
    input.lexical_document.degradation_reasons
  ) {
    reasons.add(
      `LEXICAL_ANALYSIS:${reason}`,
    );
  }

  for (
    const reason of
    input.frequency_signals.degradation_reasons
  ) {
    reasons.add(
      `FREQUENCY_SIGNAL_DETECTION:${reason}`,
    );
  }

  for (
    const reason of
    input.intrinsic_anchor_signals.degradation_reasons
  ) {
    reasons.add(
      `ANCHOR_SIGNAL_DETECTION:${reason}`,
    );
  }

  for (
    const reason of
    input.context_aggregation.degradation_reasons
  ) {
    reasons.add(
      `CONTEXT_AGGREGATION:${reason}`,
    );
  }

  return Object.freeze([
    ...reasons,
  ]);
}

/* ============================================================================
 * 6. POLICY VALIDATION
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchQueryDocumentSignalsPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertNonNegativeInteger(
    policy.maximum_sentence_proximity_distance,
    "policy.maximum_sentence_proximity_distance",
  );

  assertNormalizedNumber(
    policy.anchor_intrinsic_convergence_weight,
    "policy.anchor_intrinsic_convergence_weight",
  );
}

/* ============================================================================
 * 7. INPUT IDENTITY VALIDATION
 * ========================================================================== */

function validateDocumentIdentity(
  input:
    SearchQueryDocumentSignalsInput,
): void {
  const canonicalDocumentId =
    input.lexical_document.document_id;

  assertNonEmptyString(
    canonicalDocumentId,
    "lexical_document.document_id",
  );

  const documentIds =
    [
      input.segmented_document.document_id,
      input.frequency_signals.document_id,
      input.intrinsic_anchor_signals.document_id,
      input.context_aggregation.document_id,
    ] as const;

  for (
    const documentId of
    documentIds
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
        `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
          "Boundary violation: all documentary inputs must belong to the same document.",
      );
    }
  }
}

function validateQueryIdentity(
  queryProfile:
    SearchQueryProfile,
): void {
  assertNonEmptyString(
    queryProfile.query_id,
    "query_profile.query_id",
  );
}

/* ============================================================================
 * 8. QUERY PROFILE VALIDATION
 * ========================================================================== */

function validateQueryTerm(
  queryTerm:
    SearchQueryTerm,
  index:
    number,
): void {
  assertNonEmptyString(
    queryTerm.raw_term,
    `query_profile.query_terms[${index}].raw_term`,
  );

  assertNonEmptyString(
    queryTerm.normalized_term,
    `query_profile.query_terms[${index}].normalized_term`,
  );

  assertFiniteNumber(
    queryTerm.term_weight,
    `query_profile.query_terms[${index}].term_weight`,
  );

  if (
    queryTerm.term_weight < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        `Contract violation: query term ${index} has a negative weight.`,
    );
  }
}

function getActiveQueryTerms(
  queryProfile:
    SearchQueryProfile,
): readonly SearchQueryTerm[] {
  return queryProfile.query_terms.filter(
    (queryTerm) =>
      queryTerm.term_role !==
        "EXCLUDED" &&
      queryTerm.term_weight >
        0,
  );
}

function validateQueryProfile(
  queryProfile:
    SearchQueryProfile,
): void {
  assertUpstreamNotRejected(
    "SearchQueryProfile",
    queryProfile.validation_state,
  );

  assertNonEmptyString(
    queryProfile.normalized_query,
    "query_profile.normalized_query",
  );

  for (
    let index = 0;
    index <
    queryProfile.query_terms.length;
    index += 1
  ) {
    const queryTerm =
      queryProfile.query_terms[index];

    if (
      queryTerm === undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
          `Contract violation: query term ${index} is undefined.`,
      );
    }

    validateQueryTerm(
      queryTerm,
      index,
    );
  }

  if (
    getActiveQueryTerms(
      queryProfile,
    ).length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        "Boundary rejection: query profile contains no active weighted query terms.",
    );
  }
}

/* ============================================================================
 * 9. DOCUMENTARY CONTRACT VALIDATION
 * ========================================================================== */

function validateDocumentaryInputs(
  input:
    SearchQueryDocumentSignalsInput,
): void {
  assertUpstreamNotRejected(
    "SearchSegmentedDocument",
    input.segmented_document
      .validation_state,
  );

  assertUpstreamNotRejected(
    "SearchLexicalDocument",
    input.lexical_document
      .validation_state,
  );

  assertUpstreamNotRejected(
    "SearchFrequencySignals",
    input.frequency_signals
      .validation_state,
  );

  assertUpstreamNotRejected(
    "SearchAnchorSignals",
    input.intrinsic_anchor_signals
      .validation_state,
  );

  assertUpstreamNotRejected(
    "SearchContextAggregation",
    input.context_aggregation
      .validation_state,
  );

  if (
    input.segmented_document.sentences.length !==
    input.segmented_document.sentence_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        "Boundary violation: segmented document sentence_count mismatch.",
    );
  }

  if (
    input.lexical_document.term_occurrences.length !==
    input.lexical_document.token_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        "Boundary violation: lexical token_count does not match term occurrence collection.",
    );
  }

  if (
    input.intrinsic_anchor_signals.anchors.length !==
    input.intrinsic_anchor_signals.anchor_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        "Boundary violation: intrinsic anchor_count mismatch.",
    );
  }
}

/* ============================================================================
 * 10. COMPLETE INPUT VALIDATION
 * ========================================================================== */

function validateSearchQueryDocumentSignalsInput(
  input:
    SearchQueryDocumentSignalsInput,
  policy:
    SearchQueryDocumentSignalsPolicy,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validatePolicy(
    policy,
  );

  validateQueryIdentity(
    input.query_profile,
  );

  validateQueryProfile(
    input.query_profile,
  );

  validateDocumentIdentity(
    input,
  );

  validateDocumentaryInputs(
    input,
  );
}

/* ============================================================================
 * 11. SENTENCE INDEX
 * ========================================================================== */

interface SentencePositionIndex {
  readonly by_sentence_id:
    ReadonlyMap<SearchSentenceId, number>;

  readonly sentence_count:
    number;
}

function buildSentencePositionIndex(
  segmentedDocument:
    SearchSegmentedDocument,
): SentencePositionIndex {
  const bySentenceId =
    new Map<SearchSentenceId, number>();

  for (
    let index = 0;
    index <
    segmentedDocument.sentences.length;
    index += 1
  ) {
    const sentence =
      segmentedDocument.sentences[index];

    if (
      sentence === undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
          `Boundary violation: segmented sentence ${index} is undefined.`,
      );
    }

    assertNonEmptyString(
      sentence.sentence_id,
      `segmented_document.sentences[${index}].sentence_id`,
    );

    if (
      bySentenceId.has(
        sentence.sentence_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
          `Boundary violation: duplicate sentence identity ${sentence.sentence_id}.`,
      );
    }

    bySentenceId.set(
      sentence.sentence_id,
      sentence.ordinal_position,
    );
  }

  return {
    by_sentence_id:
      bySentenceId,

    sentence_count:
      segmentedDocument.sentences.length,
  };
}

/* ============================================================================
 * 12. QUERY TERM WEIGHT GOVERNANCE
 * ========================================================================== */

function sumQueryTermWeights(
  queryTerms:
    readonly SearchQueryTerm[],
): number {
  return queryTerms.reduce(
    (
      sum,
      queryTerm,
    ) =>
      sum +
      queryTerm.term_weight,
    0,
  );
}

function computeWeightedCoverage(
  activeQueryTerms:
    readonly SearchQueryTerm[],
  matcher:
    (
      queryTerm:
        SearchQueryTerm,
    ) => boolean,
): SearchNormalizedScore {
  const totalWeight =
    sumQueryTermWeights(
      activeQueryTerms,
    );

  if (
    totalWeight <=
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        "Internal invariant violation: active query term weight must be positive.",
    );
  }

  const matchedWeight =
    activeQueryTerms.reduce(
      (
        sum,
        queryTerm,
      ) =>
        matcher(
          queryTerm,
        )
          ? sum +
            queryTerm.term_weight
          : sum,
      0,
    );

  return clamp01(
    matchedWeight /
      totalWeight,
  );
}

/* ============================================================================
 * 13. EXACT QUERY TERM COVERAGE
 * ----------------------------------------------------------------------------
 * Exact means exact raw lexical-form equality.
 *
 * This module deliberately performs no local query normalization.
 * ========================================================================== */

function computeExactQueryTermCoverageScore(
  input:
    SearchQueryDocumentSignalsInput,
): SearchNormalizedScore {
  const activeQueryTerms =
    getActiveQueryTerms(
      input.query_profile,
    );

  const observedRawTerms =
    new Set(
      input.lexical_document
        .term_occurrences
        .map(
          (occurrence) =>
            occurrence.term,
        ),
    );

  return computeWeightedCoverage(
    activeQueryTerms,
    (queryTerm) =>
      observedRawTerms.has(
        queryTerm.raw_term,
      ),
  );
}

/* ============================================================================
 * 14. NORMALIZED QUERY TERM COVERAGE
 * ----------------------------------------------------------------------------
 * Normalized equality consumes only normalization truth produced upstream.
 *
 * No term is normalized locally.
 * ========================================================================== */

function computeNormalizedQueryTermCoverageScore(
  input:
    SearchQueryDocumentSignalsInput,
): SearchNormalizedScore {
  const activeQueryTerms =
    getActiveQueryTerms(
      input.query_profile,
    );

  const observedNormalizedTerms =
    new Set(
      input.lexical_document
        .term_occurrences
        .map(
          (occurrence) =>
            occurrence.normalized_term,
        ),
    );

  return computeWeightedCoverage(
    activeQueryTerms,
    (queryTerm) =>
      observedNormalizedTerms.has(
        queryTerm.normalized_term,
      ),
  );
}

/* ============================================================================
 * 15. TERM -> SENTENCE POSITION MAP
 * ========================================================================== */

function buildNormalizedTermSentencePositions(
  lexicalDocument:
    SearchLexicalDocument,
  sentenceIndex:
    SentencePositionIndex,
): ReadonlyMap<string, readonly number[]> {
  const mutableIndex =
    new Map<
      string,
      Set<number>
    >();

  for (
    const occurrence of
    lexicalDocument.term_occurrences
  ) {
    const sentencePosition =
      sentenceIndex.by_sentence_id.get(
        occurrence.sentence_id,
      );

    if (
      sentencePosition ===
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
          `Boundary violation: lexical occurrence references unknown sentence ${occurrence.sentence_id}.`,
      );
    }

    const existing =
      mutableIndex.get(
        occurrence.normalized_term,
      ) ??
      new Set<number>();

    existing.add(
      sentencePosition,
    );

    mutableIndex.set(
      occurrence.normalized_term,
      existing,
    );
  }

  const immutableIndex =
    new Map<
      string,
      readonly number[]
    >();

  for (
    const [
      normalizedTerm,
      positions,
    ] of
    mutableIndex
  ) {
    immutableIndex.set(
      normalizedTerm,
      Object.freeze(
        [
          ...positions,
        ].sort(
          (left, right) =>
            left - right,
        ),
      ),
    );
  }

  return immutableIndex;
}

/* ============================================================================
 * 16. PROXIMITY KERNEL
 * ----------------------------------------------------------------------------
 * Same sentence:
 *   distance = 0 => 1
 *
 * Inside governed window:
 *   score = 1 - distance / (window + 1)
 *
 * Beyond governed window:
 *   score = 0
 * ========================================================================== */

function resolveSentenceDistanceScore(
  distance:
    number,
  maximumDistance:
    number,
): SearchNormalizedScore {
  assertNonNegativeInteger(
    distance,
    "sentence distance",
  );

  assertNonNegativeInteger(
    maximumDistance,
    "maximum sentence distance",
  );

  if (
    distance === 0
  ) {
    return 1;
  }

  if (
    maximumDistance === 0 ||
    distance >
      maximumDistance
  ) {
    return 0;
  }

  return clamp01(
    1 -
      distance /
        (maximumDistance + 1),
  );
}

function computeMaximumCrossTermProximity(
  activeQueryTerms:
    readonly SearchQueryTerm[],
  targetNormalizedTerms:
    readonly string[],
  termSentencePositions:
    ReadonlyMap<
      string,
      readonly number[]
    >,
  maximumDistance:
    number,
): SearchNormalizedScore {
  let maximumScore =
    0;

  for (
    const queryTerm of
    activeQueryTerms
  ) {
    const queryPositions =
      termSentencePositions.get(
        queryTerm.normalized_term,
      ) ??
      [];

    if (
      queryPositions.length ===
      0
    ) {
      continue;
    }

    for (
      const targetTerm of
      targetNormalizedTerms
  ) {
      const targetPositions =
        termSentencePositions.get(
          targetTerm,
        ) ??
        [];

      for (
        const queryPosition of
        queryPositions
      ) {
        for (
          const targetPosition of
          targetPositions
        ) {
          const distance =
            Math.abs(
              queryPosition -
                targetPosition,
            );

          const score =
            resolveSentenceDistanceScore(
              distance,
              maximumDistance,
            );

          if (
            score >
            maximumScore
          ) {
            maximumScore =
              score;
          }
        }
      }
    }
  }

  return clamp01(
    maximumScore,
  );
}

/* ============================================================================
 * 17. FREQUENCY / RARITY PROXIMITY
 * ----------------------------------------------------------------------------
 * Frequency membership comes exclusively from SearchFrequencySignals.
 *
 * This layer never reselects frequent or rare terms.
 * ========================================================================== */

function getCanonicalFrequentTerms(
  frequencySignals:
    SearchFrequencySignals,
): readonly string[] {
  return Object.freeze(
    frequencySignals.frequent_terms.map(
      (signal) =>
        signal.normalized_term,
    ),
  );
}

function getCanonicalRareTerms(
  frequencySignals:
    SearchFrequencySignals,
): readonly string[] {
  return Object.freeze(
    frequencySignals.rare_terms.map(
      (signal) =>
        signal.normalized_term,
    ),
  );
}

/* ============================================================================
 * 18. SENTENCE NORMALIZED TERM INDEX
 * ========================================================================== */

function buildSentenceNormalizedTermIndex(
  lexicalDocument:
    SearchLexicalDocument,
): ReadonlyMap<
  SearchSentenceId,
  ReadonlySet<string>
> {
  const index =
    new Map<
      SearchSentenceId,
      ReadonlySet<string>
    >();

  for (
    const entry of
    lexicalDocument.sentence_term_index
  ) {
    index.set(
      entry.sentence_id,
      new Set(
        entry.normalized_terms,
      ),
    );
  }

  return index;
}

/* ============================================================================
 * 19. QUERY ANCHOR SIGNALS
 * ----------------------------------------------------------------------------
 * Intrinsic anchors remain upstream truth.
 *
 * This layer only evaluates their relationship with the active query.
 * ========================================================================== */

function computeAnchorQueryTermCoverage(
  activeQueryTerms:
    readonly SearchQueryTerm[],
  sentenceTerms:
    ReadonlySet<string>,
): SearchNormalizedScore {
  return computeWeightedCoverage(
    activeQueryTerms,
    (queryTerm) =>
      sentenceTerms.has(
        queryTerm.normalized_term,
      ),
  );
}

function getMatchedQueryTerms(
  activeQueryTerms:
    readonly SearchQueryTerm[],
  sentenceTerms:
    ReadonlySet<string>,
): readonly string[] {
  return Object.freeze(
    activeQueryTerms
      .filter(
        (queryTerm) =>
          sentenceTerms.has(
            queryTerm.normalized_term,
          ),
      )
      .map(
        (queryTerm) =>
          queryTerm.normalized_term,
      ),
  );
}

function getNearestQuerySentenceDistance(
  anchor:
    SearchAnchorSignal,
  activeQueryTerms:
    readonly SearchQueryTerm[],
  sentenceIndex:
    SentencePositionIndex,
  termSentencePositions:
    ReadonlyMap<
      string,
      readonly number[]
    >,
): number | undefined {
  const anchorPosition =
    sentenceIndex.by_sentence_id.get(
      anchor.sentence_id,
    );

  if (
    anchorPosition ===
    undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
        `Boundary violation: anchor ${anchor.anchor_id} references an unknown sentence.`,
    );
  }

  let minimumDistance:
    number | undefined;

  for (
    const queryTerm of
    activeQueryTerms
  ) {
    const queryPositions =
      termSentencePositions.get(
        queryTerm.normalized_term,
      ) ??
      [];

    for (
      const queryPosition of
      queryPositions
    ) {
      const distance =
        Math.abs(
          queryPosition -
            anchorPosition,
        );

      if (
        minimumDistance ===
          undefined ||
        distance <
          minimumDistance
      ) {
        minimumDistance =
          distance;
      }
    }
  }

  return minimumDistance;
}

function computeQueryAnchorConvergence(
  queryTermCoverage:
    SearchNormalizedScore,
  intrinsicConvergence:
    SearchNormalizedScore,
  policy:
    SearchQueryDocumentSignalsPolicy,
): SearchNormalizedScore {
  assertNormalizedNumber(
    queryTermCoverage,
    "queryTermCoverage",
  );

  assertNormalizedNumber(
    intrinsicConvergence,
    "intrinsicConvergence",
  );

  const intrinsicWeight =
    policy.anchor_intrinsic_convergence_weight;

  const queryWeight =
    1 -
    intrinsicWeight;

  /**
   * Query evidence remains mandatory.
   *
   * If query coverage is zero, convergence is zero regardless of intrinsic
   * anchor quality.
   */
  return clamp01(
    queryTermCoverage *
      (
        queryWeight +
        intrinsicConvergence *
          intrinsicWeight
      ),
  );
}

function buildQueryAnchorSignals(
  input:
    SearchQueryDocumentSignalsInput,
  policy:
    SearchQueryDocumentSignalsPolicy,
  sentenceIndex:
    SentencePositionIndex,
  termSentencePositions:
    ReadonlyMap<
      string,
      readonly number[]
    >,
): readonly SearchQueryAnchorSignal[] {
  const activeQueryTerms =
    getActiveQueryTerms(
      input.query_profile,
    );

  const sentenceTermIndex =
    buildSentenceNormalizedTermIndex(
      input.lexical_document,
    );

  const queryAnchorSignals:
    SearchQueryAnchorSignal[] =
    [];

  for (
    const anchor of
    input.intrinsic_anchor_signals
      .anchors
  ) {
    const sentenceTerms =
      sentenceTermIndex.get(
        anchor.sentence_id,
      );

    if (
      sentenceTerms ===
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
          `Boundary violation: anchor ${anchor.anchor_id} has no lexical sentence index.`,
      );
    }

    const matchedQueryTerms =
      getMatchedQueryTerms(
        activeQueryTerms,
        sentenceTerms,
      );

    /**
     * An intrinsic anchor with no query relationship does not become a
     * query-anchor signal.
     */
    if (
      matchedQueryTerms.length ===
      0
    ) {
      continue;
    }

    const queryTermCoverageScore =
      computeAnchorQueryTermCoverage(
        activeQueryTerms,
        sentenceTerms,
      );

    const nearestDistance =
      getNearestQuerySentenceDistance(
        anchor,
        activeQueryTerms,
        sentenceIndex,
        termSentencePositions,
      );

    const proximityScore =
      nearestDistance ===
      undefined
        ? 0
        : resolveSentenceDistanceScore(
            nearestDistance,
            policy.maximum_sentence_proximity_distance,
          );

    const convergenceScore =
      computeQueryAnchorConvergence(
        queryTermCoverageScore,
        anchor.local_convergence_score,
        policy,
      );

    queryAnchorSignals.push(
      Object.freeze({
        anchor_id:
          anchor.anchor_id,

        sentence_id:
          anchor.sentence_id,

        matched_query_terms:
          matchedQueryTerms,

        matched_frequent_terms:
          Object.freeze([
            ...anchor.matched_frequent_terms,
          ]),

        matched_rare_terms:
          Object.freeze([
            ...anchor.matched_rare_terms,
          ]),

        query_term_coverage_score:
          queryTermCoverageScore,

        query_anchor_proximity_score:
          proximityScore,

        query_anchor_convergence_score:
          convergenceScore,
      }),
    );
  }

  return Object.freeze(
    queryAnchorSignals,
  );
}

/* ============================================================================
 * 20. QUERY ANCHOR COVERAGE
 * ----------------------------------------------------------------------------
 * Ratio of canonical intrinsic anchors that have a validated query
 * relationship.
 *
 * No intrinsic anchor score is reused as public/query ranking truth.
 * ========================================================================== */

function computeQueryAnchorCoverageScore(
  intrinsicAnchorCount:
    number,
  queryAnchorCount:
    number,
): SearchNormalizedScore {
  assertNonNegativeInteger(
    intrinsicAnchorCount,
    "intrinsicAnchorCount",
  );

  assertNonNegativeInteger(
    queryAnchorCount,
    "queryAnchorCount",
  );

  if (
    intrinsicAnchorCount ===
    0
  ) {
    return 0;
  }

  return clamp01(
    queryAnchorCount /
      intrinsicAnchorCount,
  );
}

/* ============================================================================
 * 21. CONCEPT COVERAGE
 * ----------------------------------------------------------------------------
 * There is currently no canonical concept/semantic producer in the official
 * Search pipeline contract.
 *
 * This module must therefore NOT infer concept coverage from:
 * - lexical overlap;
 * - anchor overlap;
 * - normalized query terms;
 * - document score;
 * - embeddings that do not exist in the canonical pipeline.
 * ========================================================================== */

function buildUnavailableConceptCoverage():
  SearchOptionalEvidence<SearchNormalizedScore> {
  return Object.freeze({
    availability_state:
      "UNAVAILABLE",

    reason:
      "NO_CANONICAL_CONCEPT_SIGNAL_PRODUCER",
  });
}

/* ============================================================================
 * 22. QUERY SIGNAL POSITION COLLECTION
 * ----------------------------------------------------------------------------
 * Signal positioning is derived only from already-matched query evidence.
 *
 * No new documentary signal is created here.
 * ========================================================================== */

function collectQuerySignalSentencePositions(
  input:
    SearchQueryDocumentSignalsInput,
  queryAnchorSignals:
    readonly SearchQueryAnchorSignal[],
  sentenceIndex:
    SentencePositionIndex,
  termSentencePositions:
    ReadonlyMap<
      string,
      readonly number[]
    >,
): readonly number[] {
  const positions =
    new Set<number>();

  const activeQueryTerms =
    getActiveQueryTerms(
      input.query_profile,
    );

  for (
    const queryTerm of
    activeQueryTerms
  ) {
    const queryPositions =
      termSentencePositions.get(
        queryTerm.normalized_term,
      ) ??
      [];

    for (
      const position of
      queryPositions
    ) {
      positions.add(
        position,
      );
    }
  }

  for (
    const anchorSignal of
    queryAnchorSignals
  ) {
    const position =
      sentenceIndex.by_sentence_id.get(
        anchorSignal.sentence_id,
      );

    if (
      position ===
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
          `Boundary violation: query anchor ${anchorSignal.anchor_id} references an unknown sentence.`,
      );
    }

    positions.add(
      position,
    );
  }

  return Object.freeze(
    [
      ...positions,
    ].sort(
      (left, right) =>
        left - right,
    ),
  );
}

/* ============================================================================
 * 23. SIGNAL DISPERSION / CONCENTRATION
 * ----------------------------------------------------------------------------
 * Dispersion represents normalized document span occupied by validated
 * query-relative signals.
 *
 * Concentration is the deterministic complement of dispersion.
 *
 * A single localized signal:
 * - dispersion = 0
 * - concentration = 1
 *
 * Signals spanning the whole document:
 * - dispersion approaches 1
 * - concentration approaches 0
 * ========================================================================== */

function computeQuerySignalDispersionScore(
  positions:
    readonly number[],
  sentenceCount:
    number,
): SearchNormalizedScore {
  if (
    positions.length <=
      1 ||
    sentenceCount <=
      1
  ) {
    return 0;
  }

  const first =
    positions[0];

  const last =
    positions[
      positions.length -
        1
    ];

  if (
    first === undefined ||
    last === undefined
  ) {
    return 0;
  }

  const span =
    Math.max(
      0,
      last - first,
    );

  return clamp01(
    span /
      (sentenceCount - 1),
  );
}

function computeQuerySignalConcentrationScore(
  dispersion:
    SearchNormalizedScore,
  positionCount:
    number,
): SearchNormalizedScore {
  if (
    positionCount ===
    0
  ) {
    return 0;
  }

  return clamp01(
    1 -
      dispersion,
  );
}

/* ============================================================================
 * 24. OUTPUT VALIDATION
 * ========================================================================== */

function validateQueryAnchorSignalOutput(
  signal:
    SearchQueryAnchorSignal,
  index:
    number,
): void {
  assertNonEmptyString(
    signal.anchor_id,
    `query_anchor_signals[${index}].anchor_id`,
  );

  assertNonEmptyString(
    signal.sentence_id,
    `query_anchor_signals[${index}].sentence_id`,
  );

  assertNormalizedNumber(
    signal.query_term_coverage_score,
    `query_anchor_signals[${index}].query_term_coverage_score`,
  );

  assertNormalizedNumber(
    signal.query_anchor_proximity_score,
    `query_anchor_signals[${index}].query_anchor_proximity_score`,
  );

  assertNormalizedNumber(
    signal.query_anchor_convergence_score,
    `query_anchor_signals[${index}].query_anchor_convergence_score`,
  );
}

export function validateSearchQueryDocumentSignalsOutput(
  signals:
    SearchQueryDocumentSignals,
): void {
  assertNonEmptyString(
    signals.contract_version,
    "signals.contract_version",
  );

  assertValidIsoTimestamp(
    signals.created_at,
    "signals.created_at",
  );

  assertNonEmptyString(
    signals.document_id,
    "signals.document_id",
  );

  assertNonEmptyString(
    signals.query_id,
    "signals.query_id",
  );

  assertNormalizedNumber(
    signals.exact_query_term_coverage_score,
    "signals.exact_query_term_coverage_score",
  );

  assertNormalizedNumber(
    signals.normalized_query_term_coverage_score,
    "signals.normalized_query_term_coverage_score",
  );

  assertNormalizedNumber(
    signals.query_rare_term_proximity_score,
    "signals.query_rare_term_proximity_score",
  );

  assertNormalizedNumber(
    signals.query_frequent_term_proximity_score,
    "signals.query_frequent_term_proximity_score",
  );

  assertNormalizedNumber(
    signals.query_anchor_coverage_score,
    "signals.query_anchor_coverage_score",
  );

  assertNormalizedNumber(
    signals.query_signal_dispersion_score,
    "signals.query_signal_dispersion_score",
  );

  assertNormalizedNumber(
    signals.query_signal_concentration_score,
    "signals.query_signal_concentration_score",
  );

  if (
    signals.query_concept_coverage_score
      .availability_state ===
    "AVAILABLE"
  ) {
    assertNormalizedNumber(
      signals.query_concept_coverage_score
        .value,
      "signals.query_concept_coverage_score.value",
    );
  } else {
    assertNonEmptyString(
      signals.query_concept_coverage_score
        .reason,
      "signals.query_concept_coverage_score.reason",
    );
  }

  const seenAnchorIds =
    new Set<string>();

  for (
    let index = 0;
    index <
    signals.query_anchor_signals.length;
    index += 1
  ) {
    const signal =
      signals.query_anchor_signals[index];

    if (
      signal === undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
          `Contract violation: query anchor signal ${index} is undefined.`,
      );
    }

    validateQueryAnchorSignalOutput(
      signal,
      index,
    );

    if (
      seenAnchorIds.has(
        signal.anchor_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_NAME}] ` +
          `Contract violation: duplicate query anchor ${signal.anchor_id}.`,
      );
    }

    seenAnchorIds.add(
      signal.anchor_id,
    );
  }
}

/* ============================================================================
 * 25. QUERY-DOCUMENT SIGNAL PRODUCER
 * ----------------------------------------------------------------------------
 * Canonical producer of SearchQueryDocumentSignals.
 *
 * Execution:
 *
 * SearchQueryProfile
 * + SearchSegmentedDocument
 * + SearchLexicalDocument
 * + SearchFrequencySignals
 * + SearchAnchorSignals
 * + SearchContextAggregation
 *
 * => validate boundary
 * => exact query-term coverage
 * => normalized query-term coverage
 * => rare-term proximity
 * => frequent-term proximity
 * => query-anchor relationship
 * => query-anchor coverage
 * => explicit concept unavailability
 * => query-signal dispersion
 * => query-signal concentration
 * => SearchQueryDocumentSignals
 *
 * No relevance score is produced here.
 * ========================================================================== */

export function buildSearchQueryDocumentSignals(
  input:
    SearchQueryDocumentSignalsInput,
): SearchQueryDocumentSignals {
  const policy =
    input.policy ??
    DEFAULT_XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_POLICY;

  validateSearchQueryDocumentSignalsInput(
    input,
    policy,
  );

  const sentenceIndex =
    buildSentencePositionIndex(
      input.segmented_document,
    );

  const termSentencePositions =
    buildNormalizedTermSentencePositions(
      input.lexical_document,
      sentenceIndex,
    );

  const activeQueryTerms =
    getActiveQueryTerms(
      input.query_profile,
    );

  const exactQueryTermCoverageScore =
    computeExactQueryTermCoverageScore(
      input,
    );

  const normalizedQueryTermCoverageScore =
    computeNormalizedQueryTermCoverageScore(
      input,
    );

  const queryRareTermProximityScore =
    computeMaximumCrossTermProximity(
      activeQueryTerms,
      getCanonicalRareTerms(
        input.frequency_signals,
      ),
      termSentencePositions,
      policy.maximum_sentence_proximity_distance,
    );

  const queryFrequentTermProximityScore =
    computeMaximumCrossTermProximity(
      activeQueryTerms,
      getCanonicalFrequentTerms(
        input.frequency_signals,
      ),
      termSentencePositions,
      policy.maximum_sentence_proximity_distance,
    );

  const queryAnchorSignals =
    buildQueryAnchorSignals(
      input,
      policy,
      sentenceIndex,
      termSentencePositions,
    );

  const queryAnchorCoverageScore =
    computeQueryAnchorCoverageScore(
      input.intrinsic_anchor_signals
        .anchor_count,
      queryAnchorSignals.length,
    );

  const queryConceptCoverageScore =
    buildUnavailableConceptCoverage();

  const querySignalPositions =
    collectQuerySignalSentencePositions(
      input,
      queryAnchorSignals,
      sentenceIndex,
      termSentencePositions,
    );

  const querySignalDispersionScore =
    computeQuerySignalDispersionScore(
      querySignalPositions,
      sentenceIndex.sentence_count,
    );

  const querySignalConcentrationScore =
    computeQuerySignalConcentrationScore(
      querySignalDispersionScore,
      querySignalPositions.length,
    );

  const validationState =
    resolveOutputValidationState([
      input.query_profile
        .validation_state,
      input.segmented_document
        .validation_state,
      input.lexical_document
        .validation_state,
      input.frequency_signals
        .validation_state,
      input.intrinsic_anchor_signals
        .validation_state,
      input.context_aggregation
        .validation_state,
    ]);

  const degradationReasons =
    collectUpstreamDegradationReasons(
      input,
    );

  const result:
    SearchQueryDocumentSignals =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_CONTRACT_VERSION,

      created_at:
        input.created_at,

      document_id:
        input.lexical_document.document_id,

      query_id:
        input.query_profile.query_id,

      exact_query_term_coverage_score:
        exactQueryTermCoverageScore,

      normalized_query_term_coverage_score:
        normalizedQueryTermCoverageScore,

      query_rare_term_proximity_score:
        queryRareTermProximityScore,

      query_frequent_term_proximity_score:
        queryFrequentTermProximityScore,

      query_anchor_signals:
        queryAnchorSignals,

      query_anchor_coverage_score:
        queryAnchorCoverageScore,

      query_concept_coverage_score:
        queryConceptCoverageScore,

      query_signal_dispersion_score:
        querySignalDispersionScore,

      query_signal_concentration_score:
        querySignalConcentrationScore,

      detector_method:
        "CANONICAL_QUERY_DOCUMENT_RELATIONSHIP_V1",

      detector_module_version:
        XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_VERSION,

      validation_state:
        validationState,

      degradation_reasons:
        degradationReasons,
    });

  validateSearchQueryDocumentSignalsOutput(
    result,
  );

  return result;
}

/* ============================================================================
 * 26. ACCEPTANCE HELPER
 * ----------------------------------------------------------------------------
 * Observation helper only.
 *
 * It performs no reconstruction and no repair.
 * ========================================================================== */

export function isSearchQueryDocumentSignalsAccepted(
  signals:
    SearchQueryDocumentSignals,
): boolean {
  return (
    (
      signals.validation_state ===
        "VALID" ||
      signals.validation_state ===
        "DEGRADED"
    ) &&
    signals.document_id.trim().length >
      0 &&
    signals.query_id.trim().length >
      0
  );
}
