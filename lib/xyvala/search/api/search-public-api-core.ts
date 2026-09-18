/* ============================================================================
 * FILE: lib/xyvala/search/api/search-public-api-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical public API boundary core
 *
 * ROLE
 * - consume one canonical SearchPublicRankingProjection
 * - validate the final public Search projection before API exposure
 * - validate canonical Public Ranking contract identities
 * - preserve canonical query identity
 * - preserve canonical document and snapshot identities
 * - preserve canonical public_position values
 * - preserve canonical transformation lineage
 * - preserve canonical public-ranking lineage
 * - preserve canonical publication evidence
 * - reject malformed or private-contaminated public payloads
 * - expose the validated canonical SearchPublicRankingProjection unchanged
 *
 * CLASSIFICATION
 * - PUBLIC API BOUNDARY
 * - SEARCH DOMAIN
 * - API
 * - READ / VALIDATE / TRANSPORT
 * - PURE
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-TRANSFORMING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-MUTATING
 * - PUBLIC-SAFE
 * - FRAMEWORK-AGNOSTIC
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
 * Calibration remains outside the current live Search execution.
 *
 * API:
 * - does not execute calibration;
 * - does not inspect calibration state;
 * - does not alter policies;
 * - does not feed current public results into calibration.
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchPublicRankingProjection
 * - SearchPublicSearchResult
 * - SearchPublicResultSource
 * - SearchPublicResultExcerpt
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Public Exposure Governance System
 * - Ranking Governance System
 *
 * PRODUCER INPUT
 * - lib/xyvala/search/ranking/search-public-ranking-core.ts
 *
 * CONSUMERS
 * - Search HTTP/API adapters
 * - Search response builder
 * - Search interface orchestration
 * - public Search transport tests
 * - public/private boundary audits
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * public result content
 * <- TRANSFORMATION
 *
 * published_at
 * <- TRANSFORMATION public projection
 * <- TEMPORAL_SIGNAL_DETECTION canonical truth
 * <- ACQUISITION source publication lineage
 *
 * public_position
 * <- PUBLIC_RANKING
 *
 * SearchPublicSearchResult
 * <- PUBLIC_RANKING
 *
 * SearchPublicRankingProjection
 * <- PUBLIC_RANKING
 *
 * API transport authorization
 * <- API
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * API is not:
 * - a second transformer;
 * - a second ranking engine;
 * - a second analytical projection producer.
 *
 * It validates and returns the same canonical projection instance.
 *
 * HTTP status, headers and serialization remain downstream responsibilities.
 *
 * PUBLICATION GOVERNANCE
 * ----------------------------------------------------------------------------
 * API validates SearchPublicResultSource.published_at as existing public
 * evidence only.
 *
 * It never:
 * - substitutes fetched_at;
 * - substitutes projection.created_at;
 * - calculates publication age;
 * - reconstructs publication evidence.
 *
 * MATCHED TERM GOVERNANCE
 * ----------------------------------------------------------------------------
 * matched_terms already crossed TRANSFORMATION and PUBLIC_RANKING.
 *
 * API validates structural validity only.
 *
 * It MUST NOT:
 * - trim terms;
 * - deduplicate terms;
 * - sort terms;
 * - normalize terms;
 * - create an additional uniqueness rule absent from the canonical contract.
 *
 * VERSION GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchPublicSearchResult.contract_version
 * and
 * SearchPublicRankingProjection.contract_version
 *
 * are validated against their canonical Public Ranking producer contracts.
 *
 * public_projection_version remains an existing canonical projection field.
 *
 * API MUST NOT infer that it is semantically identical to
 * public_ranking_policy_version unless the canonical contract explicitly
 * establishes that identity.
 *
 * DIRECTIVES
 * - API validation only
 * - consume SearchPublicRankingProjection only
 * - preserve canonical projection identity
 * - preserve canonical public_position
 * - preserve transformed public fields
 * - preserve publication evidence
 * - public-safe data only
 * - no private snapshot access
 * - no private decision access
 * - no global score access
 * - no penalty access
 * - no eligibility access
 * - no cohort distribution access
 * - no relative evaluation access
 * - no analytical score access
 * - no ranking calculation
 * - no public_position assignment
 * - no public-position renumbering
 * - no label reconstruction
 * - no excerpt reconstruction
 * - no matched-term normalization
 * - no source reconstruction
 * - no publication reconstruction
 * - no language reconstruction
 * - no availability reconstruction
 * - no analytical filtering
 * - no hidden result filtering
 * - no version-semantic inference
 * - no persistence
 * - no logging
 * - no event publication
 * - no runtime mutation
 * - no local clock access
 * - no random identifier generation
 * - no HTTP-framework dependency
 *
 * INVARIANTS
 * - input is one canonical SearchPublicRankingProjection
 * - exact canonical projection contract version
 * - projection visibility is PUBLIC
 * - projection source_contract is SearchPublicResultCandidate
 * - every result uses the canonical SearchPublicSearchResult contract
 * - every result visibility is PUBLIC
 * - every result belongs to the projection query
 * - every document identity occurs at most once
 * - every snapshot_reference occurs at most once
 * - result_count equals public_results.length
 * - public_position starts at 1
 * - public_position is contiguous
 * - public_position is unique
 * - array ordering matches public_position ordering
 * - transformed content is never reconstructed
 * - publication evidence remains explicit
 * - ranking-module lineage is preserved
 * - matched terms are validated but not normalized
 * - no private analytical identity is exposed
 * - output is the exact input projection
 * - no runtime clock is read
 * - no random value is generated
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * unexpected projection contract version
 * => PUBLIC_RANKING / API contract boundary
 *
 * unexpected result contract version
 * => PUBLIC_RANKING / API contract boundary
 *
 * invalid result_count
 * => PUBLIC_RANKING producer
 *
 * non-contiguous public_position
 * => PUBLIC_RANKING producer
 *
 * duplicate document identity
 * => PUBLIC_RANKING producer
 *
 * duplicate snapshot_reference
 * => PUBLIC_RANKING lineage boundary
 *
 * result query mismatch
 * => PUBLIC_RANKING producer
 *
 * malformed published_at
 * => TEMPORAL -> SNAPSHOT -> TRANSFORMATION -> RANKING propagation
 *
 * matched terms normalized or constrained by a locally invented rule
 * => API ownership violation
 *
 * public_projection_version reinterpreted as ranking policy identity
 * => version-governance violation
 *
 * private field reaches public payload
 * => upstream public-boundary violation
 *
 * public field needed downstream but absent
 * => canonical contract ownership review
 * => API must not fabricate it
 * ========================================================================== */

import type {
  SearchAvailabilityState,
  SearchDocumentId,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPublicEvidenceLabel,
  SearchPublicRankingProjection,
  SearchPublicRelevanceLabel,
  SearchPublicResultExcerpt,
  SearchPublicResultSource,
  SearchPublicSearchResult,
  SearchQueryId,
} from "../contracts/search-pipeline-contract";

import {
  XYVALA_SEARCH_FORBIDDEN_PUBLIC_PRIVATE_IDENTITIES,
} from "../contracts/search-pipeline-contract";

import {
  XYVALA_SEARCH_PUBLIC_RANKING_PROJECTION_CONTRACT_VERSION,
  XYVALA_SEARCH_PUBLIC_SEARCH_RESULT_CONTRACT_VERSION,
} from "../ranking/search-public-ranking-core";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_API_MODULE_NAME =
  "xyvala-search-public-api-core" as const;

export const XYVALA_SEARCH_PUBLIC_API_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

/* ============================================================================
 * 2. API INPUT
 * ========================================================================== */

export interface SearchPublicApiInput {
  readonly projection:
    SearchPublicRankingProjection;
}

/* ============================================================================
 * 3. SAFE PRIMITIVE ASSERTIONS
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
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertNonNegativeInteger(
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
    value <
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-negative integer.`,
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
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a positive integer.`,
    );
  }
}

/* ============================================================================
 * 4. PUBLIC DOMAIN VALIDATION
 * ========================================================================== */

function assertPublicRelevanceLabel(
  value:
    SearchPublicRelevanceLabel,

  fieldName:
    string,
): void {
  switch (
    value
  ) {
    case "HIGH_RELEVANCE":
    case "RELEVANT":
    case "CONTEXTUAL":
    case "LIMITED_RELEVANCE":
    case "UNAVAILABLE":
      return;

    default: {
      const unreachable:
        never =
        value;

      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Contract violation: ${fieldName} contains unsupported public relevance label ${String(unreachable)}.`,
      );
    }
  }
}

function assertPublicEvidenceLabel(
  value:
    SearchPublicEvidenceLabel,

  fieldName:
    string,
): void {
  switch (
    value
  ) {
    case "STRONG_DOCUMENT_MATCH":
    case "ANCHOR_SUPPORTED":
    case "SOURCE_SUPPORTED":
    case "LIMITED_EVIDENCE":
    case "INSUFFICIENT_DATA":
      return;

    default: {
      const unreachable:
        never =
        value;

      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Contract violation: ${fieldName} contains unsupported public evidence label ${String(unreachable)}.`,
      );
    }
  }
}

function assertPublicAvailabilityState(
  value:
    SearchAvailabilityState,

  fieldName:
    string,
): void {
  switch (
    value
  ) {
    case "AVAILABLE":
    case "UNAVAILABLE":
    case "INSUFFICIENT_DATA":
    case "INSUFFICIENT_HISTORY":
    case "UNSUPPORTED":
    case "INVALID":
      return;

    default: {
      const unreachable:
        never =
        value;

      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Contract violation: ${fieldName} contains unsupported public availability state ${String(unreachable)}.`,
      );
    }
  }
}

/* ============================================================================
 * 5. OPTIONAL TIMESTAMP EVIDENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Validation only.
 *
 * No timestamp is substituted or reconstructed.
 * ========================================================================== */

function validateOptionalIsoTimestampEvidence(
  evidence:
    SearchOptionalEvidence<SearchIsoTimestamp>,

  fieldName:
    string,
): void {
  assertPublicAvailabilityState(
    evidence.availability_state,
    `${fieldName}.availability_state`,
  );

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
 * 6. PRIVATE FIELD CONTAMINATION GUARD
 * ----------------------------------------------------------------------------
 * Inspects property identities only.
 *
 * No analytical semantic inference is performed.
 * ========================================================================== */

const FORBIDDEN_PUBLIC_FIELD_NAMES:
  ReadonlySet<string> =
  new Set<string>(
    XYVALA_SEARCH_FORBIDDEN_PUBLIC_PRIVATE_IDENTITIES,
  );

function assertNoForbiddenPublicFields(
  value:
    unknown,

  fieldPath:
    string,
): void {
  if (
    value ===
      null ||
    typeof value !==
      "object"
  ) {
    return;
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    for (
      const [
        index,
        item,
      ] of value.entries()
    ) {
      assertNoForbiddenPublicFields(
        item,
        `${fieldPath}[${String(index)}]`,
      );
    }

    return;
  }

  const objectValue =
    value as Readonly<
      Record<string, unknown>
    >;

  for (
    const [
      key,
      nestedValue,
    ] of Object.entries(
      objectValue,
    )
  ) {
    if (
      FORBIDDEN_PUBLIC_FIELD_NAMES.has(
        key,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Public exposure violation: forbidden private field ${fieldPath}.${key} reached the API boundary.`,
      );
    }

    assertNoForbiddenPublicFields(
      nestedValue,
      `${fieldPath}.${key}`,
    );
  }
}

/* ============================================================================
 * 7. SOURCE VALIDATION
 * ----------------------------------------------------------------------------
 * TRANSFORMATION owns public source projection.
 *
 * API validates only transported public contract integrity.
 * ========================================================================== */

function validatePublicSource(
  source:
    SearchPublicResultSource,

  fieldName:
    string,
): void {
  assertNonEmptyString(
    source.source_uri,
    `${fieldName}.source_uri`,
  );

  assertValidIsoTimestamp(
    source.fetched_at,
    `${fieldName}.fetched_at`,
  );

  validateOptionalIsoTimestampEvidence(
    source.published_at,
    `${fieldName}.published_at`,
  );

  if (
    source.source_domain !==
    undefined
  ) {
    assertNonEmptyString(
      source.source_domain,
      `${fieldName}.source_domain`,
    );
  }

  switch (
    source.source_type
  ) {
    case "WEB_PAGE":
    case "DOCUMENT":
    case "ARTICLE":
    case "CV":
    case "TECHNICAL_DOCUMENT":
    case "LEGAL_DOCUMENT":
    case "API_RESOURCE":
    case "MANUAL_TEXT":
    case "OTHER":
      return;

    default: {
      const unreachable:
        never =
        source.source_type;

      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Contract violation: ${fieldName}.source_type contains unsupported source type ${String(unreachable)}.`,
      );
    }
  }
}

/* ============================================================================
 * 8. EXCERPT VALIDATION
 * ----------------------------------------------------------------------------
 * No term normalization, deduplication or reordering is authorized here.
 * ========================================================================== */

function validatePublicExcerpt(
  excerpt:
    SearchPublicResultExcerpt,

  fieldName:
    string,
): void {
  assertNonEmptyString(
    excerpt.sentence_id,
    `${fieldName}.sentence_id`,
  );

  assertNonEmptyString(
    excerpt.excerpt,
    `${fieldName}.excerpt`,
  );

  for (
    const [
      index,
      term,
    ] of excerpt
      .matched_terms
      .entries()
  ) {
    assertNonEmptyString(
      term,
      `${fieldName}.matched_terms[${String(index)}]`,
    );
  }
}

/* ============================================================================
 * 9. OPTIONAL LANGUAGE VALIDATION
 * ========================================================================== */

function validatePublicLanguage(
  result:
    SearchPublicSearchResult,

  fieldName:
    string,
): void {
  const language =
    result.language;

  assertPublicAvailabilityState(
    language.availability_state,
    `${fieldName}.language.availability_state`,
  );

  if (
    language.availability_state ===
      "AVAILABLE"
  ) {
    assertNonEmptyString(
      language.value,
      `${fieldName}.language.value`,
    );

    return;
  }

  assertNonEmptyString(
    language.reason,
    `${fieldName}.language.reason`,
  );
}

/* ============================================================================
 * 10. EVIDENCE LABEL VALIDATION
 * ----------------------------------------------------------------------------
 * API validates existing transformed label truth only.
 *
 * No labels are added, removed or reordered.
 * ========================================================================== */

function validateEvidenceLabels(
  labels:
    readonly SearchPublicEvidenceLabel[],

  fieldName:
    string,
): void {
  if (
    labels.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must contain at least one public evidence label.`,
    );
  }

  const seen =
    new Set<SearchPublicEvidenceLabel>();

  for (
    const [
      index,
      label,
    ] of labels.entries()
  ) {
    assertPublicEvidenceLabel(
      label,
      `${fieldName}[${String(index)}]`,
    );

    if (
      seen.has(
        label,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Boundary violation: duplicate public evidence label ${label}.`,
      );
    }

    seen.add(
      label,
    );
  }
}

/* ============================================================================
 * 11. PUBLIC RESULT VALIDATION
 * ========================================================================== */

function validatePublicResult(
  result:
    SearchPublicSearchResult,

  queryId:
    SearchQueryId,

  expectedPosition:
    number,

  fieldName:
    string,
): void {
  assertNonEmptyString(
    result.contract_version,
    `${fieldName}.contract_version`,
  );

  if (
    result.contract_version !==
    XYVALA_SEARCH_PUBLIC_SEARCH_RESULT_CONTRACT_VERSION
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        `Contract boundary violation: ${fieldName}.contract_version is ${result.contract_version}, expected ${XYVALA_SEARCH_PUBLIC_SEARCH_RESULT_CONTRACT_VERSION}.`,
    );
  }

  assertValidIsoTimestamp(
    result.created_at,
    `${fieldName}.created_at`,
  );

  assertNonEmptyString(
    result.document_id,
    `${fieldName}.document_id`,
  );

  assertNonEmptyString(
    result.query_id,
    `${fieldName}.query_id`,
  );

  if (
    result.query_id !==
    queryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        `Query boundary violation: ${fieldName} belongs to query ${result.query_id} instead of canonical query ${queryId}.`,
    );
  }

  if (
    result.visibility !==
    "PUBLIC"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        `Public boundary violation: ${fieldName} must remain PUBLIC.`,
    );
  }

  assertPositiveInteger(
    result.public_position,
    `${fieldName}.public_position`,
  );

  if (
    result.public_position !==
    expectedPosition
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        `Ranking boundary violation: ${fieldName}.public_position must equal ${String(expectedPosition)}.`,
    );
  }

  assertNonEmptyString(
    result.title,
    `${fieldName}.title`,
  );

  validatePublicSource(
    result.source,
    `${fieldName}.source`,
  );

  const sentenceIds =
    new Set<string>();

  for (
    const [
      index,
      excerpt,
    ] of result
      .excerpts
      .entries()
  ) {
    const excerptFieldName =
      `${fieldName}.excerpts[${String(index)}]`;

    validatePublicExcerpt(
      excerpt,
      excerptFieldName,
    );

    if (
      sentenceIds.has(
        excerpt.sentence_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Boundary violation: ${fieldName} contains duplicate public excerpt sentence ${excerpt.sentence_id}.`,
      );
    }

    sentenceIds.add(
      excerpt.sentence_id,
    );
  }

  assertPublicRelevanceLabel(
    result.relevance_label,
    `${fieldName}.relevance_label`,
  );

  validateEvidenceLabels(
    result.evidence_labels,
    `${fieldName}.evidence_labels`,
  );

  validatePublicLanguage(
    result,
    fieldName,
  );

  assertPublicAvailabilityState(
    result.availability_state,
    `${fieldName}.availability_state`,
  );

  assertNonEmptyString(
    result.snapshot_reference,
    `${fieldName}.snapshot_reference`,
  );

  assertNonEmptyString(
    result
      .public_transformation_policy_version,
    `${fieldName}.public_transformation_policy_version`,
  );

  assertNonEmptyString(
    result.transformer_version,
    `${fieldName}.transformer_version`,
  );

  assertNonEmptyString(
    result
      .public_ranking_policy_version,
    `${fieldName}.public_ranking_policy_version`,
  );

  assertNonEmptyString(
    result.ranking_module_version,
    `${fieldName}.ranking_module_version`,
  );
}

/* ============================================================================
 * 12. UNIQUE RESULT IDENTITIES
 * ----------------------------------------------------------------------------
 * Both document identity and snapshot lineage must remain unique.
 *
 * No silent deduplication is authorized.
 * ========================================================================== */

function validateUniqueResultIdentities(
  results:
    readonly SearchPublicSearchResult[],
): void {
  const documentIds =
    new Set<SearchDocumentId>();

  const snapshotReferences =
    new Set<string>();

  for (
    const result of
    results
  ) {
    if (
      documentIds.has(
        result.document_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Boundary violation: duplicate public result document identity ${result.document_id}.`,
      );
    }

    documentIds.add(
      result.document_id,
    );

    if (
      snapshotReferences.has(
        result.snapshot_reference,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Boundary violation: duplicate public snapshot reference ${result.snapshot_reference}.`,
      );
    }

    snapshotReferences.add(
      result.snapshot_reference,
    );
  }
}

/* ============================================================================
 * 13. PROJECTION VALIDATION
 * ----------------------------------------------------------------------------
 * No repair.
 *
 * Any divergence is rejected at the API boundary.
 * ========================================================================== */

function validateProjection(
  projection:
    SearchPublicRankingProjection,
): void {
  assertNonEmptyString(
    projection.contract_version,
    "projection.contract_version",
  );

  if (
    projection.contract_version !==
    XYVALA_SEARCH_PUBLIC_RANKING_PROJECTION_CONTRACT_VERSION
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        `Contract boundary violation: projection.contract_version is ${projection.contract_version}, expected ${XYVALA_SEARCH_PUBLIC_RANKING_PROJECTION_CONTRACT_VERSION}.`,
    );
  }

  assertValidIsoTimestamp(
    projection.created_at,
    "projection.created_at",
  );

  assertNonEmptyString(
    projection.query_id,
    "projection.query_id",
  );

  /*
   * Existing canonical field.
   *
   * API validates only its structural presence.
   * It does not infer a semantic equivalence with ranking policy version.
   */
  assertNonEmptyString(
    projection.public_projection_version,
    "projection.public_projection_version",
  );

  assertNonEmptyString(
    projection.ranking_module_version,
    "projection.ranking_module_version",
  );

  if (
    projection.visibility !==
    "PUBLIC"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        "Public boundary violation: SearchPublicRankingProjection must remain PUBLIC.",
    );
  }

  if (
    projection.source_contract !==
    "SearchPublicResultCandidate"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        "Boundary violation: projection.source_contract must be SearchPublicResultCandidate.",
    );
  }

  assertNonNegativeInteger(
    projection.result_count,
    "projection.result_count",
  );

  if (
    projection.result_count !==
    projection.public_results.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
        "Boundary violation: projection.result_count does not match public_results.length.",
    );
  }

  validateUniqueResultIdentities(
    projection.public_results,
  );

  for (
    const [
      index,
      result,
    ] of projection
      .public_results
      .entries()
  ) {
    validatePublicResult(
      result,
      projection.query_id,
      index + 1,
      `projection.public_results[${String(index)}]`,
    );
  }

  assertNoForbiddenPublicFields(
    projection,
    "projection",
  );
}

/* ============================================================================
 * 14. RANKING PRODUCER LINEAGE VALIDATION
 * ----------------------------------------------------------------------------
 * ranking_module_version is the same producer identity across one projection.
 *
 * API deliberately does NOT infer:
 *
 * projection.public_projection_version
 * ===
 * result.public_ranking_policy_version
 *
 * unless that semantic identity is established by the canonical contract.
 * ========================================================================== */

function validateRankingLineage(
  projection:
    SearchPublicRankingProjection,
): void {
  for (
    const [
      index,
      result,
    ] of projection
      .public_results
      .entries()
  ) {
    if (
      result.ranking_module_version !==
      projection.ranking_module_version
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_API_MODULE_NAME}] ` +
          `Boundary violation: projection.public_results[${String(index)}].ranking_module_version differs from projection.ranking_module_version.`,
      );
    }
  }
}

/* ============================================================================
 * 15. COMPLETE INPUT VALIDATION
 * ========================================================================== */

function validateInput(
  input:
    SearchPublicApiInput,
): void {
  validateProjection(
    input.projection,
  );

  validateRankingLineage(
    input.projection,
  );
}

/* ============================================================================
 * 16. PUBLIC API CORE
 * ----------------------------------------------------------------------------
 * SearchPublicRankingProjection
 * -> validate canonical PUBLIC_RANKING contract
 * -> validate query/result identities
 * -> validate canonical public_position
 * -> validate producer lineage
 * -> validate public source publication evidence
 * -> validate public-safe transport fields
 * -> reject private-field contamination
 * -> return exact canonical projection
 *
 * No projection is rebuilt here.
 * ========================================================================== */

export function exposeSearchPublicRankingProjection(
  input:
    SearchPublicApiInput,
): SearchPublicRankingProjection {
  validateInput(
    input,
  );

  return input.projection;
}

/* ============================================================================
 * 17. STATIC API OWNERSHIP
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_API_OWNERSHIP =
  Object.freeze({
    api_boundary_owner:
      "API",

    input_projection_owner:
      "PUBLIC_RANKING",

    public_result_content_owner:
      "TRANSFORMATION",

    public_position_owner:
      "PUBLIC_RANKING",

    publication_truth_owner:
      "TEMPORAL_SIGNAL_DETECTION",

    public_publication_projection_owner:
      "TRANSFORMATION",

    api_creates_analytical_truth:
      false,

    api_creates_public_projection:
      false,

    api_reconstructs_public_truth:
      false,

    api_calculates_ranking:
      false,

    api_assigns_public_position:
      false,

    api_reads_runtime_clock:
      false,

    api_generates_identity:
      false,

    api_mutates_runtime:
      false,
  } as const);

/* ============================================================================
 * 18. STATIC API GOVERNANCE
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_API_GOVERNANCE =
  Object.freeze({
    api_boundary_only:
      true,

    analytical_owner:
      false,

    canonical_projection_producer:
      false,

    exact_projection_contract_required:
      true,

    exact_result_contract_required:
      true,

    canonical_projection_identity_preserved:
      true,

    private_field_contamination_rejected:
      true,

    publication_reconstruction_allowed:
      false,

    publication_age_calculation_allowed:
      false,

    matched_term_normalization_allowed:
      false,

    matched_term_deduplication_allowed:
      false,

    matched_term_reordering_allowed:
      false,

    label_reconstruction_allowed:
      false,

    excerpt_reconstruction_allowed:
      false,

    source_reconstruction_allowed:
      false,

    language_reconstruction_allowed:
      false,

    availability_reconstruction_allowed:
      false,

    ranking_calculation_allowed:
      false,

    public_position_assignment_allowed:
      false,

    public_position_renumbering_allowed:
      false,

    analytical_filtering_allowed:
      false,

    hidden_result_filtering_allowed:
      false,

    projection_version_semantic_inference_allowed:
      false,

    calibration_execution_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    persistence_allowed:
      false,

    logging_allowed:
      false,

    http_framework_dependency_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "api_reconstructed_public_projection",
        "api_reconstructed_public_result",

        "api_reconstructed_source",
        "api_reconstructed_published_at",
        "fetched_at_as_published_at",

        "api_trimmed_matched_terms",
        "api_deduplicated_matched_terms",
        "api_sorted_matched_terms",

        "api_reconstructed_labels",
        "api_reconstructed_language",
        "api_reconstructed_availability",

        "api_renumbered_public_position",
        "api_reordered_public_results",
        "api_filtered_public_results",

        "public_projection_version_as_inferred_ranking_policy_identity",

        "api_private_analytical_access",
        "api_runtime_clock_access",
        "api_random_identity_generation",
        "api_persistence",
      ] as const),
  } as const);
