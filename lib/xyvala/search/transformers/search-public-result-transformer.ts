/* ============================================================================
 * FILE: lib/xyvala/search/transformers/search-public-result-transformer.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical public result transformer
 *
 * ROLE
 * - consume one validated SearchPrivateDocumentSnapshot
 * - preserve canonical document and query identities
 * - project authorized acquisition metadata into public source metadata
 * - project validated documentary evidence into public-safe excerpts
 * - transform authorized query-document evidence into descriptive public labels
 * - preserve explicit evidence availability
 * - preserve canonical matched-term values and ordering
 * - produce one unranked SearchPublicResultCandidate
 *
 * CLASSIFICATION
 * - PRIVATE-TO-PUBLIC TRANSFORMER
 * - SEARCH DOMAIN
 * - TRANSFORMATION
 * - READ / VALIDATE / PROJECT
 * - PURE
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-MUTATING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - PUBLIC-SAFE OUTPUT
 *
 * POSITION IN OFFICIAL LIVE CHAIN
 * ----------------------------------------------------------------------------
 *
 * ACQUISITION
 * -> EXTRACTION
 * -> SEGMENTATION
 * -> LEXICAL_ANALYSIS
 * -> FREQUENCY_SIGNAL_DETECTION
 * -> ANCHOR_SIGNAL_DETECTION
 * -> CONTEXT_AGGREGATION
 * -> LINK_SIGNAL_DETECTION
 * -> TEMPORAL_SIGNAL_DETECTION
 * -> BEHAVIORAL_SIGNAL_DETECTION
 * -> QUERY_NORMALIZATION
 * -> QUERY_PROFILING
 * -> QUERY_DOCUMENT_SIGNAL_DETECTION
 * -> INTRINSIC_DOCUMENT_SCORING
 * -> TEMPORAL_DOCUMENT_SCORING
 * -> QUERY_RELEVANCE_SCORING
 * -> LINK_AUTHORITY_SCORING
 * -> BEHAVIORAL_CALIBRATION_SCORING
 * -> POSITIVE_SCORE_ASSEMBLY
 * -> PENALTY_EVALUATION
 * -> ANALYTICAL_AGGREGATION
 * -> ELIGIBILITY_EVALUATION
 * -> SEARCH_COHORT_BATCH
 * -> COHORT_NORMALIZATION
 * -> RELATIVE_COHORT_EVALUATION
 * -> PRIVATE_DECISION
 * -> PRIVATE_SNAPSHOT
 * -> TRANSFORMATION
 * -> PUBLIC_RANKING
 * -> API
 * -> INTERFACE
 *
 * CALIBRATION GOVERNANCE
 * ----------------------------------------------------------------------------
 * Calibration is outside the current live execution cycle.
 *
 * TRANSFORMATION consumes already-authorized policy configuration.
 *
 * It never:
 * - executes calibration;
 * - changes policy from current-query truth;
 * - feeds current-query results back into thresholds.
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchPrivateDocumentSnapshot
 * - SearchPublicResultCandidate
 * - SearchPublicResultSource
 * - SearchPublicResultExcerpt
 * - SearchPublicRelevanceLabel
 * - SearchPublicEvidenceLabel
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Public Exposure Governance System
 * - Ranking Governance System
 *
 * PRODUCER INPUT
 * - lib/xyvala/search/snapshot/search-private-snapshot-builder.ts
 *
 * CONSUMERS
 * - lib/xyvala/search/ranking/search-public-ranking-core.ts
 * - Search public projection tests
 * - private/public boundary audits
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * document_id
 * <- PRIVATE_SNAPSHOT
 *
 * query_id
 * <- PRIVATE_SNAPSHOT
 *
 * source_uri
 * <- raw_document_reference.source_uri
 *
 * source_type
 * <- raw_document_reference.source_type
 *
 * fetched_at
 * <- raw_document_reference.fetched_at
 *
 * published_at
 * <- temporal_signals.published_at
 * <- TEMPORAL_SIGNAL_DETECTION
 * <- Acquisition source_published_at lineage
 *
 * source_domain
 * <- TRANSFORMATION presentation projection
 * <- source_uri only
 * <- explicit policy authorization required
 *
 * title
 * <- TRANSFORMATION presentation projection
 * <- canonical segmented documentary evidence
 *
 * excerpts
 * <- TRANSFORMATION presentation projection
 * <- canonical query-anchor references
 * <- canonical segmented sentences
 *
 * relevance_label
 * <- TRANSFORMATION
 * <- mandatory canonical query-relevance truth
 * <- explicit public transformation policy
 *
 * evidence_labels
 * <- TRANSFORMATION
 * <- authorized already-produced evidence only
 *
 * language
 * <- extraction detected_language evidence
 *
 * availability_state
 * <- mandatory canonical public relevance evidence availability
 *
 * snapshot_reference
 * <- canonical snapshot_id
 *
 * public_position
 * <- NOT OWNED HERE
 * <- PUBLIC_RANKING
 *
 * DIRECTIVES
 * - transformation only
 * - one private snapshot -> one unranked public candidate
 * - explicit public transformation policy
 * - preserve source lineage
 * - preserve publication lineage
 * - preserve explicit unavailable evidence
 * - preserve matched-term identity and order
 * - presentation transformations only
 * - no analytical reconstruction
 * - no query reconstruction
 * - no lexical reconstruction
 * - no signal calculation
 * - no score calculation
 * - no penalty calculation
 * - no aggregation calculation
 * - no eligibility calculation
 * - no cohort calculation
 * - no relative evaluation calculation
 * - no private decision calculation
 * - no calibration execution
 * - no ranking calculation
 * - no public_position
 * - no percentile exposure
 * - no relative_position exposure
 * - no final_raw_score exposure
 * - no confidence exposure
 * - no private decision exposure
 * - no BLOCK / WATCH / ALLOW exposure
 * - no private thresholds
 * - no private weights
 * - no timestamp substitution
 * - no timestamp causal inference
 * - no missing-data reconstruction
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no runtime clock access
 * - no random identity generation
 * - no persistence
 * - no logging
 * - no event publication
 *
 * TEMPORAL LINEAGE
 * ----------------------------------------------------------------------------
 *
 * SearchRawDocument.source_published_at
 *        ↓
 * SearchTemporalSignals.published_at
 *        ↓
 * SearchPrivateDocumentSnapshot.temporal_signals.published_at
 *        ↓
 * SearchPublicResultSource.published_at
 *
 * Forbidden substitutes:
 * - fetched_at
 * - snapshot.created_at
 * - transformer created_at
 * - publication_reference_at
 * - observation timestamps
 *
 * The transformer validates propagation but does not calculate temporal truth.
 *
 * MATCHED TERM LINEAGE
 * ----------------------------------------------------------------------------
 * matched_query_terms are canonical upstream evidence.
 *
 * TRANSFORMATION may copy them into a public excerpt.
 *
 * It MUST NOT:
 * - trim canonical values;
 * - lowercase them;
 * - deduplicate them;
 * - sort them;
 * - regenerate them.
 *
 * Invalid values are rejected at the first divergence.
 *
 * OPTIONAL EVIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * Optional source-support evidence has three semantic states:
 *
 * AVAILABLE + above threshold
 * -> SOURCE_SUPPORTED
 *
 * AVAILABLE + below threshold
 * -> not source-supported
 *
 * UNAVAILABLE
 * -> remains unavailable
 *
 * UNAVAILABLE must never be silently converted into:
 * - zero;
 * - false analytical evidence;
 * - LIMITED_EVIDENCE.
 *
 * When no positive evidence label exists and source support itself is
 * unavailable, the descriptive public result uses INSUFFICIENT_DATA rather
 * than pretending that available evidence proved limited support.
 *
 * INVARIANTS
 * - input snapshot remains PRIVATE
 * - only VALID / DEGRADED snapshot crosses transformation
 * - output remains PUBLIC
 * - output remains unranked
 * - document_id is unchanged
 * - query_id is unchanged
 * - snapshot_reference is unchanged
 * - published_at preserves canonical Temporal evidence exactly
 * - source_published_at is never exposed as a second public publication truth
 * - fetched_at never becomes published_at
 * - matched terms preserve upstream values and ordering
 * - missing sentence identity is rejected
 * - unavailable optional source evidence is not converted to false truth
 * - private analytical truth does not leak
 * - public labels remain descriptive projections
 * - public_position remains absent
 * - identical inputs produce identical outputs
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * source publication evidence changes between Acquisition lineage and Temporal
 * => temporal propagation boundary
 *
 * fetched_at used as published_at
 * => temporal lineage violation
 *
 * matched_query_terms altered locally
 * => query-document lineage violation
 *
 * optional source evidence flattened into false
 * => availability governance violation
 *
 * private analytical field exposed
 * => private/public boundary violation
 *
 * public_position created here
 * => PUBLIC_RANKING ownership violation
 *
 * local timestamp ordering rule introduced
 * => temporal ownership violation
 * ========================================================================== */

import type {
  SearchAvailabilityState,
  SearchContractVersion,
  SearchIsoTimestamp,
  SearchLanguageCode,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchPublicEvidenceLabel,
  SearchPublicRelevanceLabel,
  SearchPublicResultCandidate,
  SearchPublicResultExcerpt,
  SearchPublicResultSource,
  SearchSentence,
  SearchSentenceId,
  SearchSubScore,
} from "../contracts/search-pipeline-contract";

import type {
  SearchPrivateDocumentSnapshot,
} from "../contracts/search-private-snapshot-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME =
  "xyvala-search-public-result-transformer" as const;

export const XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_VERSION:
  SearchModuleVersion =
    "1.2.0";

export const XYVALA_SEARCH_PUBLIC_RESULT_CANDIDATE_CONTRACT_VERSION:
  SearchContractVersion =
    "2.0.0";

/* ============================================================================
 * 2. TITLE POLICY
 * ========================================================================== */

export type SearchPublicTitleFallbackMode =
  | "FIRST_HEADING"
  | "FIRST_NON_EMPTY_SENTENCE"
  | "SOURCE_URI"
  | "REJECT";

/* ============================================================================
 * 3. PUBLIC TRANSFORMATION POLICY
 * ----------------------------------------------------------------------------
 * These thresholds belong only to public descriptive projection.
 *
 * They are not:
 * - private-decision thresholds;
 * - ranking thresholds;
 * - global-score thresholds;
 * - calibration outputs generated during this execution.
 * ========================================================================== */

export interface SearchPublicTransformationPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  readonly high_relevance_min:
    number;

  readonly relevant_min:
    number;

  readonly contextual_min:
    number;

  readonly strong_document_match_min:
    number;

  readonly anchor_support_min:
    number;

  readonly source_support_min:
    number;

  readonly maximum_excerpt_count:
    number;

  readonly maximum_excerpt_length:
    number;

  readonly maximum_title_length:
    number;

  readonly title_fallback_mode:
    SearchPublicTitleFallbackMode;

  readonly include_source_domain:
    boolean;
}

/* ============================================================================
 * 4. TRANSFORMER INPUT
 * ========================================================================== */

export interface SearchPublicResultTransformerInput {
  readonly snapshot:
    SearchPrivateDocumentSnapshot;

  readonly policy:
    SearchPublicTransformationPolicy;

  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 5. SAFE PRIMITIVE ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    unknown,

  fieldName:
    string,
): asserts value is string {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
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

  if (
    !Number.isFinite(
      Date.parse(
        value,
      ),
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertNormalizedScore(
  value:
    unknown,

  fieldName:
    string,
): asserts value is number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    ) ||
    value <
      0 ||
    value >
      1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between 0 and 1.`,
    );
  }
}

function assertPositiveInteger(
  value:
    unknown,

  fieldName:
    string,
): asserts value is number {
  if (
    typeof value !==
      "number" ||
    !Number.isInteger(
      value,
    ) ||
    value <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a positive integer.`,
    );
  }
}

function assertBoolean(
  value:
    unknown,

  fieldName:
    string,
): asserts value is boolean {
  if (
    typeof value !==
    "boolean"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a boolean.`,
    );
  }
}

/* ============================================================================
 * 6. POLICY VALIDATION
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchPublicTransformationPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertNormalizedScore(
    policy.high_relevance_min,
    "policy.high_relevance_min",
  );

  assertNormalizedScore(
    policy.relevant_min,
    "policy.relevant_min",
  );

  assertNormalizedScore(
    policy.contextual_min,
    "policy.contextual_min",
  );

  assertNormalizedScore(
    policy.strong_document_match_min,
    "policy.strong_document_match_min",
  );

  assertNormalizedScore(
    policy.anchor_support_min,
    "policy.anchor_support_min",
  );

  assertNormalizedScore(
    policy.source_support_min,
    "policy.source_support_min",
  );

  if (
    policy.high_relevance_min <
      policy.relevant_min ||
    policy.relevant_min <
      policy.contextual_min
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Policy violation: relevance thresholds must satisfy " +
        "high_relevance_min >= relevant_min >= contextual_min.",
    );
  }

  assertPositiveInteger(
    policy.maximum_excerpt_count,
    "policy.maximum_excerpt_count",
  );

  assertPositiveInteger(
    policy.maximum_excerpt_length,
    "policy.maximum_excerpt_length",
  );

  assertPositiveInteger(
    policy.maximum_title_length,
    "policy.maximum_title_length",
  );

  assertBoolean(
    policy.include_source_domain,
    "policy.include_source_domain",
  );

  if (
    policy.title_fallback_mode !==
      "FIRST_HEADING" &&
    policy.title_fallback_mode !==
      "FIRST_NON_EMPTY_SENTENCE" &&
    policy.title_fallback_mode !==
      "SOURCE_URI" &&
    policy.title_fallback_mode !==
      "REJECT"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Policy violation: unsupported title fallback mode.",
    );
  }
}

/* ============================================================================
 * 7. OPTIONAL TIMESTAMP EVIDENCE VALIDATION
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

/* ============================================================================
 * 8. OPTIONAL TIMESTAMP PROPAGATION
 * ----------------------------------------------------------------------------
 * Exact lineage validation only.
 *
 * Nothing is repaired or substituted.
 * ========================================================================== */

function assertOptionalIsoTimestampPropagation(
  expected:
    SearchOptionalEvidence<SearchIsoTimestamp>,

  actual:
    SearchOptionalEvidence<SearchIsoTimestamp>,

  fieldName:
    string,
): void {
  if (
    actual.availability_state !==
    expected.availability_state
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        `First divergence: ${fieldName} changed canonical availability state.`,
    );
  }

  if (
    expected.availability_state ===
      "AVAILABLE" &&
    actual.availability_state ===
      "AVAILABLE"
  ) {
    if (
      actual.value !==
      expected.value
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
          `First divergence: ${fieldName} changed canonical timestamp value.`,
      );
    }

    return;
  }

  if (
    expected.availability_state !==
      "AVAILABLE" &&
    actual.availability_state !==
      "AVAILABLE" &&
    actual.reason !==
      expected.reason
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        `First divergence: ${fieldName} changed canonical unavailability reason.`,
    );
  }
}

/* ============================================================================
 * 9. SNAPSHOT BOUNDARY VALIDATION
 * ----------------------------------------------------------------------------
 * Validation is restricted to:
 * - contract integrity;
 * - identity propagation;
 * - visibility;
 * - validation state;
 * - exact publication lineage required by public projection.
 *
 * No local chronological/causal rule is inferred between independently owned
 * timestamps.
 * ========================================================================== */

function validateSnapshot(
  snapshot:
    SearchPrivateDocumentSnapshot,
): void {
  assertNonEmptyString(
    snapshot.contract_version,
    "snapshot.contract_version",
  );

  assertValidIsoTimestamp(
    snapshot.created_at,
    "snapshot.created_at",
  );

  assertNonEmptyString(
    snapshot.document_id,
    "snapshot.document_id",
  );

  assertNonEmptyString(
    snapshot.query_id,
    "snapshot.query_id",
  );

  assertNonEmptyString(
    snapshot.cohort_id,
    "snapshot.cohort_id",
  );

  assertNonEmptyString(
    snapshot.snapshot_id,
    "snapshot.snapshot_id",
  );

  assertNonEmptyString(
    snapshot.snapshot_version,
    "snapshot.snapshot_version",
  );

  if (
    snapshot.visibility !==
    "PRIVATE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: transformer input must be a PRIVATE snapshot.",
    );
  }

  if (
    snapshot.validation_state !==
      "VALID" &&
    snapshot.validation_state !==
      "DEGRADED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        `Boundary rejection: snapshot validation_state ${snapshot.validation_state} ` +
        "is not authorized for public transformation.",
    );
  }

  /* --------------------------------------------------------------------------
   * ACQUISITION LINEAGE
   * ----------------------------------------------------------------------- */

  assertNonEmptyString(
    snapshot
      .raw_document_reference
      .source_uri,
    "snapshot.raw_document_reference.source_uri",
  );

  assertNonEmptyString(
    snapshot
      .raw_document_reference
      .source_type,
    "snapshot.raw_document_reference.source_type",
  );

  assertValidIsoTimestamp(
    snapshot
      .raw_document_reference
      .fetched_at,
    "snapshot.raw_document_reference.fetched_at",
  );

  assertNonEmptyString(
    snapshot
      .raw_document_reference
      .content_hash,
    "snapshot.raw_document_reference.content_hash",
  );

  assertNonEmptyString(
    snapshot
      .raw_document_reference
      .acquisition_contract_version,
    "snapshot.raw_document_reference.acquisition_contract_version",
  );

  validateOptionalIsoTimestampEvidence(
    snapshot
      .raw_document_reference
      .source_published_at,
    "snapshot.raw_document_reference.source_published_at",
  );

  /* --------------------------------------------------------------------------
   * TEMPORAL LINEAGE
   * ----------------------------------------------------------------------- */

  assertNonEmptyString(
    snapshot
      .temporal_signals
      .contract_version,
    "snapshot.temporal_signals.contract_version",
  );

  assertValidIsoTimestamp(
    snapshot
      .temporal_signals
      .created_at,
    "snapshot.temporal_signals.created_at",
  );

  if (
    snapshot
      .temporal_signals
      .document_id !==
    snapshot.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: temporal signals belong to another document.",
    );
  }

  if (
    snapshot
      .temporal_signals
      .validation_state !==
      "VALID" &&
    snapshot
      .temporal_signals
      .validation_state !==
      "DEGRADED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        `Boundary rejection: temporal signals validation_state ` +
        `${snapshot.temporal_signals.validation_state} is not authorized ` +
        "for public transformation.",
    );
  }

  validateOptionalIsoTimestampEvidence(
    snapshot
      .temporal_signals
      .published_at,
    "snapshot.temporal_signals.published_at",
  );

  /*
   * Exact propagation assertion only.
   *
   * Acquisition source publication evidence must have survived Temporal
   * unchanged.
   */
  assertOptionalIsoTimestampPropagation(
    snapshot
      .raw_document_reference
      .source_published_at,
    snapshot
      .temporal_signals
      .published_at,
    "source_published_at -> temporal_signals.published_at",
  );

  /* --------------------------------------------------------------------------
   * DOCUMENT PROPAGATION
   * ----------------------------------------------------------------------- */

  if (
    snapshot
      .extracted_document
      .document_id !==
    snapshot.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: extracted document belongs to another document.",
    );
  }

  if (
    snapshot
      .segmented_document
      .document_id !==
    snapshot.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: segmented document belongs to another document.",
    );
  }

  if (
    snapshot
      .query_document_signals
      .document_id !==
    snapshot.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: query-document signals belong to another document.",
    );
  }

  if (
    snapshot
      .query_document_signals
      .query_id !==
    snapshot.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: query-document signals belong to another query.",
    );
  }
}

/* ============================================================================
 * 10. TEXT PROJECTION
 * ========================================================================== */

function truncatePublicText(
  value:
    string,

  maximumLength:
    number,
): string {
  const normalized =
    value.trim();

  if (
    normalized.length <=
    maximumLength
  ) {
    return normalized;
  }

  if (
    maximumLength ===
    1
  ) {
    return normalized.slice(
      0,
      1,
    );
  }

  return (
    normalized
      .slice(
        0,
        maximumLength - 1,
      )
      .trimEnd() +
    "…"
  );
}

/* ============================================================================
 * 11. TITLE RESOLUTION
 * ========================================================================== */

function findFirstSentenceByRole(
  sentences:
    readonly SearchSentence[],

  role:
    SearchSentence["structural_role"],
): SearchSentence | null {
  for (
    const sentence of
    sentences
  ) {
    if (
      sentence.structural_role ===
        role &&
      sentence.text.trim().length >
        0
    ) {
      return sentence;
    }
  }

  return null;
}

function findFirstNonEmptySentence(
  sentences:
    readonly SearchSentence[],
): SearchSentence | null {
  for (
    const sentence of
    sentences
  ) {
    if (
      sentence.text.trim().length >
      0
    ) {
      return sentence;
    }
  }

  return null;
}

function resolvePublicTitle(
  snapshot:
    SearchPrivateDocumentSnapshot,

  policy:
    SearchPublicTransformationPolicy,
): string {
  const titleSentence =
    findFirstSentenceByRole(
      snapshot
        .segmented_document
        .sentences,
      "TITLE",
    );

  if (
    titleSentence !==
    null
  ) {
    return truncatePublicText(
      titleSentence.text,
      policy.maximum_title_length,
    );
  }

  switch (
    policy.title_fallback_mode
  ) {
    case "FIRST_HEADING": {
      const heading =
        findFirstSentenceByRole(
          snapshot
            .segmented_document
            .sentences,
          "HEADING",
        );

      if (
        heading ===
        null
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
            "Public transformation unavailable: no TITLE or HEADING evidence exists.",
        );
      }

      return truncatePublicText(
        heading.text,
        policy.maximum_title_length,
      );
    }

    case "FIRST_NON_EMPTY_SENTENCE": {
      const sentence =
        findFirstNonEmptySentence(
          snapshot
            .segmented_document
            .sentences,
        );

      if (
        sentence ===
        null
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
            "Public transformation unavailable: no documentary text exists for title projection.",
        );
      }

      return truncatePublicText(
        sentence.text,
        policy.maximum_title_length,
      );
    }

    case "SOURCE_URI":
      return truncatePublicText(
        snapshot
          .raw_document_reference
          .source_uri,
        policy.maximum_title_length,
      );

    case "REJECT":
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
          "Public transformation unavailable: canonical TITLE evidence is missing and policy forbids fallback.",
      );
  }
}

/* ============================================================================
 * 12. SOURCE DOMAIN PROJECTION
 * ----------------------------------------------------------------------------
 * Deterministic presentation metadata only.
 * ========================================================================== */

function resolveSourceDomain(
  sourceUri:
    string,
): string | undefined {
  try {
    const url =
      new URL(
        sourceUri,
      );

    const hostname =
      url.hostname
        .trim()
        .toLowerCase();

    return hostname.length >
      0
      ? hostname
      : undefined;
  } catch {
    return undefined;
  }
}

/* ============================================================================
 * 13. PUBLIC SOURCE PROJECTION
 * ========================================================================== */

function buildPublicSource(
  snapshot:
    SearchPrivateDocumentSnapshot,

  policy:
    SearchPublicTransformationPolicy,
): SearchPublicResultSource {
  const publishedAt =
    snapshot
      .temporal_signals
      .published_at;

  validateOptionalIsoTimestampEvidence(
    publishedAt,
    "snapshot.temporal_signals.published_at",
  );

  const base =
    {
      source_uri:
        snapshot
          .raw_document_reference
          .source_uri,

      source_type:
        snapshot
          .raw_document_reference
          .source_type,

      fetched_at:
        snapshot
          .raw_document_reference
          .fetched_at,

      /*
       * Exact canonical Temporal evidence reference.
       *
       * No fallback.
       */
      published_at:
        publishedAt,
    } satisfies Omit<
      SearchPublicResultSource,
      "source_domain"
    >;

  if (
    !policy.include_source_domain
  ) {
    return Object.freeze({
      ...base,
    });
  }

  const sourceDomain =
    resolveSourceDomain(
      base.source_uri,
    );

  if (
    sourceDomain ===
    undefined
  ) {
    return Object.freeze({
      ...base,
    });
  }

  return Object.freeze({
    ...base,

    source_domain:
      sourceDomain,
  });
}

/* ============================================================================
 * 14. QUERY RELEVANCE EVIDENCE
 * ----------------------------------------------------------------------------
 * This is existing canonical score truth transported in the private snapshot.
 *
 * No score is calculated here.
 * ========================================================================== */

function resolveQueryRelevanceEvidence(
  snapshot:
    SearchPrivateDocumentSnapshot,
): SearchSubScore {
  return snapshot
    .positive_score_vector
    .query_relevance_score;
}

/* ============================================================================
 * 15. QUERY RELEVANCE SCOPE VALIDATION
 * ========================================================================== */

function validateQueryRelevanceScope(
  snapshot:
    SearchPrivateDocumentSnapshot,

  evidence:
    SearchSubScore,
): void {
  if (
    evidence.document_id !==
    snapshot.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: query relevance score belongs to another document.",
    );
  }

  if (
    evidence.query_id !==
    snapshot.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: query relevance score belongs to another query.",
    );
  }

  if (
    evidence.score_name !==
    "query_relevance_score"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: query relevance score identity is invalid.",
    );
  }

  if (
    evidence.signal_family !==
    "QUERY_RELEVANCE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: query relevance signal family is invalid.",
    );
  }

  assertNormalizedScore(
    evidence.value,
    "query_relevance_score.value",
  );
}

/* ============================================================================
 * 16. PUBLIC AVAILABILITY
 * ----------------------------------------------------------------------------
 * Query relevance is mandatory at this boundary.
 *
 * Availability is not reconstructed from private decision/global score.
 * ========================================================================== */

function resolvePublicAvailability(
  queryRelevance:
    SearchSubScore,
): SearchAvailabilityState {
  assertNormalizedScore(
    queryRelevance.value,
    "query_relevance_score.value",
  );

  return "AVAILABLE";
}

/* ============================================================================
 * 17. PUBLIC RELEVANCE LABEL
 * ========================================================================== */

function resolvePublicRelevanceLabel(
  queryRelevance:
    SearchSubScore,

  policy:
    SearchPublicTransformationPolicy,
): SearchPublicRelevanceLabel {
  validateQueryRelevanceIdentity(
    queryRelevance,
  );

  if (
    queryRelevance.value >=
    policy.high_relevance_min
  ) {
    return "HIGH_RELEVANCE";
  }

  if (
    queryRelevance.value >=
    policy.relevant_min
  ) {
    return "RELEVANT";
  }

  if (
    queryRelevance.value >=
    policy.contextual_min
  ) {
    return "CONTEXTUAL";
  }

  return "LIMITED_RELEVANCE";
}

function validateQueryRelevanceIdentity(
  queryRelevance:
    SearchSubScore,
): void {
  if (
    queryRelevance.score_name !==
    "query_relevance_score"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: positive score vector query relevance evidence has an incorrect score identity.",
    );
  }

  if (
    queryRelevance.signal_family !==
    "QUERY_RELEVANCE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
        "Boundary violation: query relevance evidence has an incorrect signal family.",
    );
  }

  assertNormalizedScore(
    queryRelevance.value,
    "query_relevance_score.value",
  );
}

/* ============================================================================
 * 18. SENTENCE INDEX
 * ========================================================================== */

function buildSentenceIndex(
  sentences:
    readonly SearchSentence[],
): ReadonlyMap<
  SearchSentenceId,
  SearchSentence
> {
  const index =
    new Map<
      SearchSentenceId,
      SearchSentence
    >();

  for (
    const sentence of
    sentences
  ) {
    if (
      index.has(
        sentence.sentence_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
          `Boundary violation: duplicate sentence identity ${sentence.sentence_id}.`,
      );
    }

    index.set(
      sentence.sentence_id,
      sentence,
    );
  }

  return index;
}

/* ============================================================================
 * 19. MATCHED TERM TRANSPORT
 * ----------------------------------------------------------------------------
 * Exact transport semantics.
 *
 * No trimming.
 * No deduplication.
 * No sorting.
 * No normalization.
 *
 * Invalid upstream term evidence is rejected rather than repaired.
 * ========================================================================== */

function projectMatchedTerms(
  terms:
    readonly string[],
): readonly string[] {
  for (
    const [
      index,
      term,
    ] of terms.entries()
  ) {
    assertNonEmptyString(
      term,
      `matched_query_terms[${String(index)}]`,
    );
  }

  return Object.freeze([
    ...terms,
  ]);
}

/* ============================================================================
 * 20. PUBLIC EXCERPT PROJECTION
 * ========================================================================== */

function buildPublicExcerpts(
  snapshot:
    SearchPrivateDocumentSnapshot,

  policy:
    SearchPublicTransformationPolicy,
): readonly SearchPublicResultExcerpt[] {
  const sentenceIndex =
    buildSentenceIndex(
      snapshot
        .segmented_document
        .sentences,
    );

  const excerpts:
    SearchPublicResultExcerpt[] =
    [];

  const seenSentenceIds =
    new Set<SearchSentenceId>();

  for (
    const queryAnchor of
    snapshot
      .query_document_signals
      .query_anchor_signals
  ) {
    if (
      excerpts.length >=
      policy.maximum_excerpt_count
    ) {
      break;
    }

    if (
      seenSentenceIds.has(
        queryAnchor.sentence_id,
      )
    ) {
      continue;
    }

    const sentence =
      sentenceIndex.get(
        queryAnchor.sentence_id,
      );

    if (
      sentence ===
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_NAME}] ` +
          `Propagation violation: query anchor ${queryAnchor.anchor_id} references missing sentence ${queryAnchor.sentence_id}.`,
      );
    }

    if (
      sentence.text.trim().length ===
      0
    ) {
      continue;
    }

    const matchedTerms =
      projectMatchedTerms(
        queryAnchor
          .matched_query_terms,
      );

    excerpts.push(
      Object.freeze({
        sentence_id:
          sentence.sentence_id,

        excerpt:
          truncatePublicText(
            sentence.text,
            policy.maximum_excerpt_length,
          ),

        matched_terms:
          matchedTerms,
      }),
    );

    seenSentenceIds.add(
      sentence.sentence_id,
    );
  }

  return Object.freeze(
    excerpts,
  );
}

/* ============================================================================
 * 21. SOURCE SUPPORT STATE
 * ----------------------------------------------------------------------------
 * Internal presentation state only.
 *
 * It deliberately distinguishes unavailable evidence from available evidence
 * that does not reach the public-support threshold.
 * ========================================================================== */

type SearchPublicSourceSupportState =
  | "SUPPORTED"
  | "NOT_SUPPORTED"
  | "UNAVAILABLE";

function resolveSourceSupportState(
  snapshot:
    SearchPrivateDocumentSnapshot,

  policy:
    SearchPublicTransformationPolicy,
): SearchPublicSourceSupportState {
  const evidence =
    snapshot
      .link_signals
      .source_diversity_score;

  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    assertNonEmptyString(
      evidence.reason,
      "link_signals.source_diversity_score.reason",
    );

    return "UNAVAILABLE";
  }

  assertNormalizedScore(
    evidence.value,
    "link_signals.source_diversity_score.value",
  );

  return evidence.value >=
    policy.source_support_min
    ? "SUPPORTED"
    : "NOT_SUPPORTED";
}

/* ============================================================================
 * 22. ANCHOR SUPPORT
 * ========================================================================== */

function hasAnchorSupport(
  snapshot:
    SearchPrivateDocumentSnapshot,

  policy:
    SearchPublicTransformationPolicy,
): boolean {
  const signals =
    snapshot
      .query_document_signals;

  assertNormalizedScore(
    signals.query_anchor_coverage_score,
    "query_document_signals.query_anchor_coverage_score",
  );

  return (
    signals
      .query_anchor_signals
      .length >
      0 &&
    signals.query_anchor_coverage_score >=
      policy.anchor_support_min
  );
}

/* ============================================================================
 * 23. STRONG DOCUMENT MATCH
 * ----------------------------------------------------------------------------
 * Descriptive public transformation only.
 *
 * No new score is produced.
 * ========================================================================== */

function hasStrongDocumentMatch(
  snapshot:
    SearchPrivateDocumentSnapshot,

  policy:
    SearchPublicTransformationPolicy,
): boolean {
  const signals =
    snapshot
      .query_document_signals;

  assertNormalizedScore(
    signals.normalized_query_term_coverage_score,
    "query_document_signals.normalized_query_term_coverage_score",
  );

  assertNormalizedScore(
    signals.query_anchor_coverage_score,
    "query_document_signals.query_anchor_coverage_score",
  );

  return (
    signals.normalized_query_term_coverage_score >=
      policy.strong_document_match_min &&
    signals.query_anchor_coverage_score >=
      policy.anchor_support_min
  );
}

/* ============================================================================
 * 24. EVIDENCE LABEL ORDER
 * ========================================================================== */

const PUBLIC_EVIDENCE_LABEL_ORDER:
  readonly SearchPublicEvidenceLabel[] =
  Object.freeze([
    "STRONG_DOCUMENT_MATCH",
    "ANCHOR_SUPPORTED",
    "SOURCE_SUPPORTED",
    "LIMITED_EVIDENCE",
    "INSUFFICIENT_DATA",
  ]);

/* ============================================================================
 * 25. PUBLIC EVIDENCE LABELS
 * ----------------------------------------------------------------------------
 * Optional source evidence keeps a distinct UNAVAILABLE path.
 *
 * It is never silently converted into false/zero/neutral evidence.
 * ========================================================================== */

function resolvePublicEvidenceLabels(
  snapshot:
    SearchPrivateDocumentSnapshot,

  queryRelevance:
    SearchSubScore,

  policy:
    SearchPublicTransformationPolicy,
): readonly SearchPublicEvidenceLabel[] {
  assertNormalizedScore(
    queryRelevance.value,
    "query_relevance_score.value",
  );

  const labels =
    new Set<SearchPublicEvidenceLabel>();

  if (
    hasStrongDocumentMatch(
      snapshot,
      policy,
    )
  ) {
    labels.add(
      "STRONG_DOCUMENT_MATCH",
    );
  }

  if (
    hasAnchorSupport(
      snapshot,
      policy,
    )
  ) {
    labels.add(
      "ANCHOR_SUPPORTED",
    );
  }

  const sourceSupportState =
    resolveSourceSupportState(
      snapshot,
      policy,
    );

  if (
    sourceSupportState ===
    "SUPPORTED"
  ) {
    labels.add(
      "SOURCE_SUPPORTED",
    );
  }

  /*
   * First Divergence protection:
   *
   * When no positive public evidence label exists:
   *
   * AVAILABLE but below thresholds
   * -> LIMITED_EVIDENCE
   *
   * optional source evidence unavailable
   * -> INSUFFICIENT_DATA
   *
   * Thus unavailable evidence is not silently interpreted as weak evidence.
   */
  if (
    labels.size ===
    0
  ) {
    if (
      sourceSupportState ===
      "UNAVAILABLE"
    ) {
      labels.add(
        "INSUFFICIENT_DATA",
      );
    } else {
      labels.add(
        "LIMITED_EVIDENCE",
      );
    }
  }

  return Object.freeze(
    PUBLIC_EVIDENCE_LABEL_ORDER.filter(
      (
        label,
      ) =>
        labels.has(
          label,
        ),
    ),
  );
}

/* ============================================================================
 * 26. PUBLIC LANGUAGE PROJECTION
 * ----------------------------------------------------------------------------
 * Exact evidence transport.
 * ========================================================================== */

function resolvePublicLanguage(
  snapshot:
    SearchPrivateDocumentSnapshot,
): SearchOptionalEvidence<SearchLanguageCode> {
  const evidence =
    snapshot
      .extracted_document
      .detected_language;

  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    assertNonEmptyString(
      evidence.value,
      "extracted_document.detected_language.value",
    );
  } else {
    assertNonEmptyString(
      evidence.reason,
      "extracted_document.detected_language.reason",
    );
  }

  return evidence;
}

/* ============================================================================
 * 27. COMPLETE INPUT VALIDATION
 * ========================================================================== */

function validateInput(
  input:
    SearchPublicResultTransformerInput,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validatePolicy(
    input.policy,
  );

  validateSnapshot(
    input.snapshot,
  );

  const queryRelevance =
    resolveQueryRelevanceEvidence(
      input.snapshot,
    );

  validateQueryRelevanceScope(
    input.snapshot,
    queryRelevance,
  );
}

/* ============================================================================
 * 28. PUBLIC TRANSFORMER API
 * ----------------------------------------------------------------------------
 * PRIVATE_SNAPSHOT
 * -> validate
 * -> public-safe presentation projections only
 * -> SearchPublicResultCandidate
 *
 * No PUBLIC_RANKING truth is created here.
 * ========================================================================== */

export function transformSearchPrivateSnapshotToPublicResult(
  input:
    SearchPublicResultTransformerInput,
): SearchPublicResultCandidate {
  validateInput(
    input,
  );

  const snapshot =
    input.snapshot;

  const policy =
    input.policy;

  const queryRelevance =
    resolveQueryRelevanceEvidence(
      snapshot,
    );

  const title =
    resolvePublicTitle(
      snapshot,
      policy,
    );

  const source =
    buildPublicSource(
      snapshot,
      policy,
    );

  const excerpts =
    buildPublicExcerpts(
      snapshot,
      policy,
    );

  const relevanceLabel =
    resolvePublicRelevanceLabel(
      queryRelevance,
      policy,
    );

  const evidenceLabels =
    resolvePublicEvidenceLabels(
      snapshot,
      queryRelevance,
      policy,
    );

  const language =
    resolvePublicLanguage(
      snapshot,
    );

  const availabilityState =
    resolvePublicAvailability(
      queryRelevance,
    );

  const candidate = {
    contract_version:
      XYVALA_SEARCH_PUBLIC_RESULT_CANDIDATE_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      snapshot.document_id,

    query_id:
      snapshot.query_id,

    title,

    source,

    excerpts,

    relevance_label:
      relevanceLabel,

    evidence_labels:
      evidenceLabels,

    language,

    availability_state:
      availabilityState,

    snapshot_reference:
      snapshot.snapshot_id,

    public_transformation_policy_version:
      policy.policy_version,

    transformer_version:
      XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_VERSION,

    visibility:
      "PUBLIC",
  } satisfies SearchPublicResultCandidate;

  return Object.freeze(
    candidate,
  );
}

/* ============================================================================
 * 29. STATIC TRANSFORMATION OWNERSHIP
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_OWNERSHIP =
  Object.freeze({
    transformation_owner:
      "TRANSFORMATION",

    input_truth_owner:
      "PRIVATE_SNAPSHOT",

    publication_truth_owner:
      "TEMPORAL_SIGNAL_DETECTION",

    source_publication_origin_owner:
      "ACQUISITION",

    query_relevance_truth_owner:
      "QUERY_RELEVANCE_SCORING",

    public_position_owner:
      "PUBLIC_RANKING",

    transformer_creates_analytical_truth:
      false,

    transformer_reconstructs_analytical_truth:
      false,

    transformer_calculates_public_position:
      false,

    transformer_reads_runtime_clock:
      false,

    transformer_generates_identity:
      false,

    transformer_mutates_runtime:
      false,
  } as const);

/* ============================================================================
 * 30. STATIC TRANSFORMATION GOVERNANCE
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_GOVERNANCE =
  Object.freeze({
    transformation_only:
      true,

    analytical_owner:
      false,

    canonical_analytical_producer:
      false,

    private_to_public_boundary:
      true,

    explicit_policy_required:
      true,

    source_publication_reconstruction_allowed:
      false,

    fetched_at_as_published_at_allowed:
      false,

    timestamp_causal_inference_allowed:
      false,

    publication_age_calculation_allowed:
      false,

    matched_term_normalization_allowed:
      false,

    matched_term_deduplication_allowed:
      false,

    matched_term_reordering_allowed:
      false,

    optional_evidence_flattening_allowed:
      false,

    unavailable_to_zero_allowed:
      false,

    unavailable_to_false_truth_allowed:
      false,

    unavailable_to_neutral_allowed:
      false,

    score_calculation_allowed:
      false,

    penalty_calculation_allowed:
      false,

    aggregation_calculation_allowed:
      false,

    eligibility_calculation_allowed:
      false,

    cohort_calculation_allowed:
      false,

    relative_evaluation_calculation_allowed:
      false,

    private_decision_calculation_allowed:
      false,

    calibration_execution_allowed:
      false,

    public_ranking_allowed:
      false,

    public_position_assignment_allowed:
      false,

    private_score_exposure_allowed:
      false,

    private_decision_exposure_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    persistence_allowed:
      false,

    logging_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "fetched_at_as_published_at",
        "snapshot_created_at_as_published_at",
        "transformer_created_at_as_published_at",

        "transformer_calculated_publication_age",
        "transformer_inferred_timestamp_causality",

        "transformer_trimmed_matched_terms",
        "transformer_deduplicated_matched_terms",
        "transformer_sorted_matched_terms",
        "transformer_reconstructed_matched_terms",

        "unavailable_source_support_as_false_truth",
        "unavailable_source_support_as_limited_evidence",
        "unavailable_to_zero",
        "unavailable_to_neutral",

        "private_global_score_as_public_relevance",
        "private_decision_as_public_relevance",
        "private_relative_position_as_public_position",

        "transformer_assigned_public_position",
        "transformer_ranked_public_candidates",

        "transformer_runtime_clock_access",
        "transformer_random_identity_generation",
      ] as const),
  } as const);
