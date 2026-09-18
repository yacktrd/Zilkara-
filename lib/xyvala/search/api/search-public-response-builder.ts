/* ============================================================================
 * FILE: lib/xyvala/search/api/search-public-response-builder.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical public response builder
 *
 * ROLE
 * - consume one API-authorized SearchPublicRankingProjection
 * - preserve canonical public ranking truth unchanged
 * - preserve canonical query identity
 * - preserve canonical public result collection identity
 * - preserve canonical public result ordering
 * - preserve canonical public_position values
 * - preserve canonical result_count
 * - preserve canonical transformation and ranking lineage
 * - add explicit API transport metadata only
 * - produce one deterministic SearchPublicResponse
 *
 * CLASSIFICATION
 * - PUBLIC RESPONSE BUILDER
 * - SEARCH DOMAIN
 * - API
 * - TRANSPORT ASSEMBLY
 * - READ / ASSEMBLE
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
 * -> API_BOUNDARY
 * -> PUBLIC_RESPONSE_BUILDER
 * -> HTTP_API_ADAPTER
 * -> INTERFACE
 *
 * CALIBRATION GOVERNANCE
 * ----------------------------------------------------------------------------
 * Calibration remains outside the current live Search execution cycle.
 *
 * This module:
 * - does not execute calibration;
 * - does not consume calibration state;
 * - does not alter current ranking/transformation policy;
 * - does not create policy feedback from the current response.
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchPublicRankingProjection
 * - SearchPublicSearchResult
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - One Canonical Producer Per Reality
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Public Exposure Governance System
 * - Ranking Governance System
 *
 * PRODUCER INPUT
 * - lib/xyvala/search/api/search-public-api-core.ts
 *
 * CANONICAL UPSTREAM PRODUCER
 * - lib/xyvala/search/ranking/search-public-ranking-core.ts
 *
 * CONSUMERS
 * - Search HTTP/API adapters
 * - Search route orchestration
 * - Search interface transport
 * - public Search transport tests
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 *
 * request_id
 * <- API orchestration
 *
 * response created_at
 * <- API orchestration
 *
 * response status
 * <- PUBLIC_RESPONSE_BUILDER
 * <- transport-only projection of canonical result_count
 *
 * response contract_version
 * <- PUBLIC_RESPONSE_BUILDER
 *
 * response_builder_version
 * <- PUBLIC_RESPONSE_BUILDER
 *
 * response source_contract
 * <- PUBLIC_RESPONSE_BUILDER
 *
 * response visibility
 * <- PUBLIC_RESPONSE_BUILDER
 *
 * PRESERVED CANONICAL TRUTH
 * ----------------------------------------------------------------------------
 *
 * query_id
 * <- PUBLIC_RANKING
 *
 * results
 * <- PUBLIC_RANKING
 * <- exact canonical public_results collection reference
 *
 * result_count
 * <- PUBLIC_RANKING
 * <- MUST NOT be recalculated here
 *
 * public_position
 * <- PUBLIC_RANKING
 *
 * public result content
 * <- TRANSFORMATION
 * <- transported through PUBLIC_RANKING
 *
 * public_projection_version
 * <- PUBLIC_RANKING
 *
 * ranking_module_version
 * <- PUBLIC_RANKING
 *
 * ranking_source_contract
 * <- PUBLIC_RANKING
 *
 * NON-OWNERSHIP
 * ----------------------------------------------------------------------------
 *
 * public result ordering
 * <- PUBLIC_RANKING
 *
 * public_position
 * <- PUBLIC_RANKING
 *
 * result_count
 * <- PUBLIC_RANKING
 *
 * public labels
 * <- TRANSFORMATION
 *
 * public excerpts
 * <- TRANSFORMATION
 *
 * public source metadata
 * <- TRANSFORMATION
 *
 * API public authorization
 * <- search-public-api-core.ts
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * search-public-api-core.ts owns validation of the final public projection.
 *
 * This builder:
 * - does not duplicate that validation;
 * - does not become a second ranking validator;
 * - does not become a second private/public boundary validator;
 * - does not reconstruct result cardinality;
 * - adds transport metadata only.
 *
 * RESULT COUNT GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchPublicRankingProjection.result_count is canonical PUBLIC_RANKING truth.
 *
 * Therefore:
 *
 * response.result_count
 * <- projection.result_count
 *
 * NOT:
 *
 * response.result_count
 * <- response.results.length
 *
 * The latter would reconstruct an already-existing canonical variable in a
 * downstream layer.
 *
 * STATUS GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchPublicResponse.status is a transport-only response state.
 *
 * It may be deterministically projected from canonical result_count:
 *
 * result_count > 0
 * -> RESULTS_AVAILABLE
 *
 * result_count === 0
 * -> NO_RESULTS
 *
 * This status does NOT represent:
 * - SearchAvailabilityState;
 * - eligibility;
 * - relevance;
 * - evidence strength;
 * - validation state;
 * - private decision;
 * - ranking quality.
 *
 * RESULT COLLECTION GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchPublicRankingProjection.public_results is already the canonical ranked
 * public collection.
 *
 * The response builder therefore transports that exact collection reference.
 *
 * It MUST NOT:
 * - clone the collection unnecessarily;
 * - sort it;
 * - filter it;
 * - map it;
 * - deduplicate it;
 * - renumber it;
 * - recreate result objects.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - response transport assembly only
 * - consume API-authorized SearchPublicRankingProjection only
 * - preserve projection truth unchanged
 * - preserve exact public result collection reference
 * - preserve public result instances
 * - preserve public ordering
 * - preserve public_position
 * - preserve result_count
 * - preserve query identity
 * - preserve transformation lineage
 * - preserve ranking lineage
 * - explicit request identity only
 * - explicit response timestamp only
 * - deterministic transport status only
 *
 * - no private snapshot access
 * - no private decision access
 * - no global-score access
 * - no penalty access
 * - no eligibility access
 * - no cohort access
 * - no relative-evaluation access
 * - no calibration execution
 * - no behavioral analytical access
 *
 * - no public-boundary revalidation
 * - no ranking revalidation
 * - no public-result revalidation
 * - no private-field contamination scan
 * - no public_position validation
 * - no duplicate-document validation
 * - no ranking-cardinality reconstruction
 *
 * - no scoring
 * - no analytical computation
 * - no score reconstruction
 * - no public transformation
 * - no public ranking
 * - no sorting
 * - no filtering
 * - no deduplication
 * - no result cloning
 * - no result mutation
 * - no public_position reconstruction
 * - no result_count reconstruction
 * - no label reconstruction
 * - no excerpt reconstruction
 * - no source reconstruction
 * - no ranking lineage reconstruction
 * - no hidden fallback
 *
 * - no persistence
 * - no cache logic
 * - no logging
 * - no event publication
 * - no HTTP-framework dependency
 * - no runtime clock access
 * - no random identifier generation
 *
 * INPUTS
 * ----------------------------------------------------------------------------
 * - API-authorized SearchPublicRankingProjection
 * - explicit deterministic request_id
 * - explicit deterministic created_at
 *
 * OUTPUTS
 * ----------------------------------------------------------------------------
 * - SearchPublicResponse
 *
 * INVARIANTS
 * ----------------------------------------------------------------------------
 * - input projection has already crossed the canonical API boundary
 * - input projection is treated as immutable canonical public truth
 * - query identity is transported unchanged
 * - public result collection reference is transported unchanged
 * - public result instances are transported unchanged
 * - public result order is transported unchanged
 * - public_position values are transported unchanged
 * - result_count is transported unchanged
 * - public projection lineage is transported unchanged
 * - ranking lineage is transported unchanged
 * - status is transport metadata only
 * - response visibility is always PUBLIC
 * - response source contract is SearchPublicRankingProjection
 * - no upstream truth is recalculated
 * - no upstream divergence is repaired
 * - no input object is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * malformed SearchPublicRankingProjection
 * => search-public-api-core.ts
 *
 * private field contamination
 * => search-public-api-core.ts
 *
 * invalid public_position
 * => PUBLIC_RANKING / API boundary
 *
 * duplicate ranked document
 * => PUBLIC_RANKING / API boundary
 *
 * query mismatch in ranked result
 * => PUBLIC_RANKING / API boundary
 *
 * malformed public source/excerpt/label
 * => TRANSFORMATION / PUBLIC_RANKING / API boundary
 *
 * response recalculates result_count from results.length
 * => PUBLIC_RANKING ownership violation
 *
 * response clones/rebuilds ranked result collection
 * => canonical transport identity divergence
 *
 * invalid request_id
 * => PUBLIC_RESPONSE_BUILDER input boundary
 *
 * invalid response created_at
 * => PUBLIC_RESPONSE_BUILDER input boundary
 *
 * incorrect response status
 * => PUBLIC_RESPONSE_BUILDER
 *
 * altered ranking lineage
 * => PUBLIC_RESPONSE_BUILDER
 *
 * reordered results
 * => PUBLIC_RESPONSE_BUILDER ownership violation
 * ========================================================================== */

import type {
  SearchContractVersion,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchPublicRankingProjection,
  SearchQueryId,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME =
  "xyvala-search-public-response-builder" as const;

export const XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

export const XYVALA_SEARCH_PUBLIC_RESPONSE_CONTRACT_VERSION:
  SearchContractVersion =
    "2.0.0";

/* ============================================================================
 * 2. RESPONSE SOURCE CONTRACT
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RESPONSE_SOURCE_CONTRACT =
  "SearchPublicRankingProjection" as const;

/* ============================================================================
 * 3. PUBLIC RESPONSE STATUS
 * ----------------------------------------------------------------------------
 * Transport-only collection state.
 * ========================================================================== */

export type SearchPublicResponseStatus =
  | "RESULTS_AVAILABLE"
  | "NO_RESULTS";

/* ============================================================================
 * 4. CANONICAL RANKING TYPE EXTRACTION
 * ----------------------------------------------------------------------------
 * Types are derived directly from the canonical ranking projection.
 *
 * No parallel ranked-result identity is introduced.
 * ========================================================================== */

type SearchPublicRankingResults =
  SearchPublicRankingProjection["public_results"];

export type SearchPublicRankedResult =
  SearchPublicRankingResults[number];

type SearchPublicProjectionVersion =
  SearchPublicRankingProjection[
    "public_projection_version"
  ];

type SearchPublicRankingModuleVersion =
  SearchPublicRankingProjection[
    "ranking_module_version"
  ];

type SearchPublicRankingSourceContract =
  SearchPublicRankingProjection[
    "source_contract"
  ];

/* ============================================================================
 * 5. PUBLIC RESPONSE CONTRACT
 * ----------------------------------------------------------------------------
 * Transport envelope only.
 *
 * `results` transports canonical SearchPublicSearchResult instances.
 *
 * `result_count` transports canonical Public Ranking cardinality.
 * ========================================================================== */

export interface SearchPublicResponse {
  readonly contract_version:
    SearchContractVersion;

  readonly created_at:
    SearchIsoTimestamp;

  readonly request_id:
    string;

  readonly query_id:
    SearchQueryId;

  readonly status:
    SearchPublicResponseStatus;

  /**
   * Canonical Public Ranking result cardinality.
   *
   * This value is transported, not recalculated.
   */
  readonly result_count:
    SearchPublicRankingProjection["result_count"];

  /**
   * Exact canonical Public Ranking result collection reference.
   */
  readonly results:
    SearchPublicRankingResults;

  readonly public_projection_version:
    SearchPublicProjectionVersion;

  readonly ranking_module_version:
    SearchPublicRankingModuleVersion;

  readonly ranking_source_contract:
    SearchPublicRankingSourceContract;

  readonly source_contract:
    typeof XYVALA_SEARCH_PUBLIC_RESPONSE_SOURCE_CONTRACT;

  readonly response_builder_version:
    SearchModuleVersion;

  readonly visibility:
    "PUBLIC";
}

/* ============================================================================
 * 6. BUILDER INPUT
 * ========================================================================== */

export interface SearchPublicResponseBuilderInput {
  readonly projection:
    SearchPublicRankingProjection;

  /**
   * Explicit deterministic request identity.
   *
   * Must originate from authorized API/transport orchestration.
   */
  readonly request_id:
    string;

  /**
   * Explicit deterministic response creation timestamp.
   *
   * No local clock access is authorized.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 7. BUILDER-OWNED PRIMITIVE ASSERTIONS
 * ----------------------------------------------------------------------------
 * Only immediate builder-owned input metadata is validated here.
 *
 * SearchPublicRankingProjection integrity belongs to search-public-api-core.ts.
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
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

/* ============================================================================
 * 8. INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Projection validation is deliberately NOT duplicated here.
 * ========================================================================== */

function validateInput(
  input:
    SearchPublicResponseBuilderInput,
): void {
  assertNonEmptyString(
    input.request_id,
    "request_id",
  );

  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );
}

/* ============================================================================
 * 9. CANONICAL PUBLIC RESULT TRANSPORT
 * ----------------------------------------------------------------------------
 * Exact reference transport.
 *
 * No array copy is created.
 *
 * PUBLIC_RANKING already owns:
 * - result collection;
 * - ordering;
 * - result identities;
 * - public_position.
 * ========================================================================== */

function transportPublicResults(
  projection:
    SearchPublicRankingProjection,
): SearchPublicRankingResults {
  return projection.public_results;
}

/* ============================================================================
 * 10. RESPONSE STATUS
 * ----------------------------------------------------------------------------
 * New transport metadata owned by this response contract.
 *
 * It observes canonical Public Ranking result_count without reproducing it.
 * ========================================================================== */

function resolveResponseStatus(
  canonicalResultCount:
    SearchPublicRankingProjection["result_count"],
): SearchPublicResponseStatus {
  return canonicalResultCount >
    0
    ? "RESULTS_AVAILABLE"
    : "NO_RESULTS";
}

/* ============================================================================
 * 11. RESPONSE CONSISTENCY
 * ----------------------------------------------------------------------------
 * Validates only truth created or transported by THIS module.
 *
 * It does not revalidate Public Ranking semantics.
 * ========================================================================== */

function assertResponseConsistency(
  response:
    SearchPublicResponse,

  input:
    SearchPublicResponseBuilderInput,
): void {
  const projection =
    input.projection;

  /* --------------------------------------------------------------------------
   * BUILDER-OWNED TRANSPORT METADATA
   * ----------------------------------------------------------------------- */

  if (
    response.contract_version !==
    XYVALA_SEARCH_PUBLIC_RESPONSE_CONTRACT_VERSION
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: response contract version is invalid.",
    );
  }

  if (
    response.created_at !==
    input.created_at
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: response created_at was not preserved.",
    );
  }

  if (
    response.request_id !==
    input.request_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: request identity was not preserved.",
    );
  }

  const expectedStatus =
    resolveResponseStatus(
      projection.result_count,
    );

  if (
    response.status !==
    expectedStatus
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: response status does not match canonical result cardinality.",
    );
  }

  if (
    response.source_contract !==
    XYVALA_SEARCH_PUBLIC_RESPONSE_SOURCE_CONTRACT
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: response source contract is invalid.",
    );
  }

  if (
    response.response_builder_version !==
    XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_VERSION
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: response builder version is invalid.",
    );
  }

  if (
    response.visibility !==
    "PUBLIC"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: Search public response must remain PUBLIC.",
    );
  }

  /* --------------------------------------------------------------------------
   * EXACT UPSTREAM TRUTH PROPAGATION
   * ----------------------------------------------------------------------- */

  if (
    response.query_id !==
    projection.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: canonical query identity was not preserved.",
    );
  }

  /*
   * PUBLIC_RANKING owns result_count.
   *
   * Compare exact transported truth.
   *
   * Do NOT recalculate from response.results.length.
   */
  if (
    response.result_count !==
    projection.result_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: canonical Public Ranking result_count was not preserved.",
    );
  }

  /*
   * Exact collection identity preservation.
   */
  if (
    response.results !==
    projection.public_results
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: canonical Public Ranking result collection reference was not preserved.",
    );
  }

  if (
    response.public_projection_version !==
    projection.public_projection_version
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: public projection version was not preserved.",
    );
  }

  if (
    response.ranking_module_version !==
    projection.ranking_module_version
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: ranking module version was not preserved.",
    );
  }

  if (
    response.ranking_source_contract !==
    projection.source_contract
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_NAME}] ` +
        "Internal transport violation: ranking source contract was not preserved.",
    );
  }
}

/* ============================================================================
 * 12. PUBLIC RESPONSE BUILDER API
 * ----------------------------------------------------------------------------
 * OFFICIAL EXECUTION
 *
 * SearchPublicRankingProjection
 * -> search-public-api-core.ts
 * -> exposeSearchPublicRankingProjection(...)
 * -> authorized canonical SearchPublicRankingProjection
 * -> buildSearchPublicResponse(...)
 * -> SearchPublicResponse
 * -> HTTP/API adapter
 * -> Interface
 *
 * THIS MODULE
 *
 * authorized SearchPublicRankingProjection
 * -> preserve exact canonical result collection
 * -> preserve canonical result_count
 * -> preserve canonical query identity
 * -> preserve canonical ranking lineage
 * -> derive transport-only response status
 * -> add explicit request identity
 * -> add explicit response timestamp
 * -> add response-builder lineage
 * -> SearchPublicResponse
 *
 * It performs no:
 * - public-boundary validation
 * - private contamination validation
 * - ranking validation
 * - result validation
 * - public_position validation
 * - ranking-cardinality reconstruction
 * - analytical computation
 * - scoring
 * - score reconstruction
 * - penalty evaluation
 * - eligibility evaluation
 * - cohort evaluation
 * - private decision
 * - calibration
 * - private snapshot access
 * - public transformation
 * - public ranking
 * - sorting
 * - filtering
 * - mapping of ranked results
 * - deduplication
 * - array cloning
 * - public_position reconstruction
 * - result_count reconstruction
 * - source reconstruction
 * - excerpt reconstruction
 * - label reconstruction
 * - persistence
 * - logging
 * - event publication
 * - runtime clock access
 * - random identifier generation
 * ========================================================================== */

export function buildSearchPublicResponse(
  input:
    SearchPublicResponseBuilderInput,
): SearchPublicResponse {
  validateInput(
    input,
  );

  const projection =
    input.projection;

  const results =
    transportPublicResults(
      projection,
    );

  /*
   * Exact canonical PUBLIC_RANKING truth.
   *
   * Never replace with:
   *
   * const resultCount = results.length;
   */
  const resultCount =
    projection.result_count;

  const response = {
    contract_version:
      XYVALA_SEARCH_PUBLIC_RESPONSE_CONTRACT_VERSION,

    created_at:
      input.created_at,

    request_id:
      input.request_id,

    query_id:
      projection.query_id,

    status:
      resolveResponseStatus(
        resultCount,
      ),

    result_count:
      resultCount,

    results,

    public_projection_version:
      projection.public_projection_version,

    ranking_module_version:
      projection.ranking_module_version,

    ranking_source_contract:
      projection.source_contract,

    source_contract:
      XYVALA_SEARCH_PUBLIC_RESPONSE_SOURCE_CONTRACT,

    response_builder_version:
      XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_MODULE_VERSION,

    visibility:
      "PUBLIC",
  } satisfies SearchPublicResponse;

  const frozenResponse =
    Object.freeze(
      response,
    );

  assertResponseConsistency(
    frozenResponse,
    input,
  );

  return frozenResponse;
}

/* ============================================================================
 * 13. STATIC RESPONSE BUILDER OWNERSHIP
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_OWNERSHIP =
  Object.freeze({
    response_transport_owner:
      "PUBLIC_RESPONSE_BUILDER",

    input_projection_owner:
      "PUBLIC_RANKING",

    query_identity_owner:
      "PUBLIC_RANKING",

    ranked_result_collection_owner:
      "PUBLIC_RANKING",

    result_count_owner:
      "PUBLIC_RANKING",

    public_position_owner:
      "PUBLIC_RANKING",

    public_result_content_owner:
      "TRANSFORMATION",

    response_status_owner:
      "PUBLIC_RESPONSE_BUILDER",

    response_contract_owner:
      "PUBLIC_RESPONSE_BUILDER",

    request_identity_owner:
      "API_ORCHESTRATION",

    response_timestamp_owner:
      "API_ORCHESTRATION",

    builder_creates_analytical_truth:
      false,

    builder_creates_ranking_truth:
      false,

    builder_reconstructs_result_count:
      false,

    builder_reconstructs_public_results:
      false,

    builder_reads_runtime_clock:
      false,

    builder_generates_identity:
      false,

    builder_mutates_runtime:
      false,
  } as const);

/* ============================================================================
 * 14. STATIC RESPONSE BUILDER GOVERNANCE
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RESPONSE_BUILDER_GOVERNANCE =
  Object.freeze({
    transport_assembly_only:
      true,

    analytical_owner:
      false,

    ranking_owner:
      false,

    canonical_projection_producer:
      false,

    canonical_result_collection_reference_preserved:
      true,

    canonical_result_count_preserved:
      true,

    response_status_is_transport_only:
      true,

    public_boundary_revalidation_allowed:
      false,

    ranking_revalidation_allowed:
      false,

    public_result_revalidation_allowed:
      false,

    result_count_reconstruction_allowed:
      false,

    result_collection_cloning_allowed:
      false,

    result_mapping_allowed:
      false,

    sorting_allowed:
      false,

    filtering_allowed:
      false,

    deduplication_allowed:
      false,

    public_position_assignment_allowed:
      false,

    public_position_renumbering_allowed:
      false,

    label_reconstruction_allowed:
      false,

    excerpt_reconstruction_allowed:
      false,

    source_reconstruction_allowed:
      false,

    ranking_lineage_reconstruction_allowed:
      false,

    calibration_execution_allowed:
      false,

    persistence_allowed:
      false,

    cache_logic_allowed:
      false,

    logging_allowed:
      false,

    event_publication_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    http_framework_dependency_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "response_recalculated_result_count",
        "response_cloned_ranked_result_collection",
        "response_rebuilt_ranked_result",
        "response_reordered_ranked_results",
        "response_filtered_ranked_results",
        "response_deduplicated_ranked_results",

        "response_reassigned_public_position",
        "response_renumbered_public_position",

        "response_reconstructed_label",
        "response_reconstructed_excerpt",
        "response_reconstructed_source",

        "response_reconstructed_ranking_lineage",

        "response_private_analytical_access",
        "response_runtime_clock_access",
        "response_random_identity_generation",
        "response_persistence",
      ] as const),
  } as const);
