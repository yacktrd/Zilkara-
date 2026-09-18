/* ============================================================================
 * FILE: lib/xyvala/search/contracts/search-pipeline-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical pipeline contract
 *
 * ROLE
 * - define the official private and public contracts of Xyvala Search
 * - govern document, query, signal, scoring, aggregation, cohort and decision
 *   identities
 * - govern cross-cutting execution traceability and variable lineage
 * - define the immutable propagation chain of the Search engine
 * - separate intrinsic document truth from query-relative truth
 * - separate positive analytical evidence from penalties and constraints
 * - preserve explicit optional-evidence semantics
 * - reference the canonical private snapshot contract without redefining it
 * - define the authorized public projection surface
 *
 * CLASSIFICATION
 * - PRIVATE CONTRACT
 * - SEARCH DOMAIN
 * - NON-COMPUTE
 * - NON-OBSERVE
 * - NON-MUTATING
 * - SOURCE OF TRUTH
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - Xyvala Search Variable Lineage Registry
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage Registry
 * - Boundary Protection System
 * - Public Exposure Governance System
 * - Ranking Governance System
 * - Compute / Observe / Mutate Separation
 *
 * DIRECTIVES
 * - contracts before runtime
 * - one identity per analytical reality
 * - one source of truth per critical variable
 * - immutable contracts
 * - no local reconstruction
 * - no implicit numerical default for unavailable evidence
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no scorer-to-scorer analytical dependency
 * - positive evidence and penalties remain separated
 * - intrinsic document truth and query-relative truth remain separated
 * - private cohort evaluation and public ranking remain separated
 * - calibration remains outside the current analytical cycle
 * - traceability remains cross-cutting governance
 * - traceability never becomes analytical truth
 * - variable lineage remains registry-owned
 * - private snapshot owns only its own snapshot metadata
 * - private snapshot transports upstream analytical truth unchanged
 * - no public exposure of private decisions, weights, thresholds or traces
 * - public rankings are descriptive projections produced after snapshot
 *
 * INPUTS
 * - none
 *
 * OUTPUTS
 * - TypeScript contracts only
 *
 * INVARIANTS
 * - this file performs no calculation
 * - this file performs no observation
 * - this file performs no persistence
 * - this file performs no runtime orchestration
 * - this file publishes no event
 * - this file creates no analytical truth at runtime
 * - every critical result is versioned and traceable
 * - every missing signal is explicitly qualified
 * - every score belongs to one canonical producer
 * - optional score truth remains explicitly optional
 * - mandatory score truth is never silently demoted to optional
 * - traceability is not inserted into SearchPipelineLayer
 * - calibration is not inserted into the active analytical pipeline
 * - SearchPrivateDocumentSnapshot is not redefined in this file
 * - every public field originates from an authorized private boundary
 * ========================================================================== */

export type {
  SearchPrivateDocumentSnapshot,
} from "./search-private-snapshot-contract";

/* ============================================================================
 * 1. CONTRACT PRIMITIVES
 * ========================================================================== */

export type SearchContractVersion = string;
export type SearchModuleVersion = string;
export type SearchPolicyVersion = string;
export type SearchCorpusVersion = string;
export type SearchSnapshotVersion = string;
export type SearchSchemaVersion = string;

export type SearchDistributionId = string;
export type SearchCohortId = string;
export type SearchQueryId = string;
export type SearchDocumentId = string;
export type SearchSentenceId = string;
export type SearchAnchorId = string;
export type SearchObservationId = string;
export type SearchTraceId = string;

export type SearchAggregationResultId = string;
export type SearchEligibilityResultId = string;
export type SearchRelativeEvaluationId = string;
export type SearchPublicProjectionId = string;

export type SearchIsoTimestamp = string;
export type SearchUri = string;
export type SearchLanguageCode = string;

export type SearchNormalizedScore = number;
export type SearchRawScore = number;
export type SearchConfidenceScore = number;
export type SearchWeight = number;
export type SearchRatio = number;
export type SearchPercentile = number;
export type SearchRank = number;
export type SearchCount = number;
export type SearchDurationMilliseconds = number;

export type SearchExecutionNature =
  | "COMPUTE"
  | "OBSERVE"
  | "MUTATE";

export type SearchDataVisibility =
  | "PRIVATE"
  | "INTERNAL"
  | "PUBLIC";

export type SearchAvailabilityState =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "INSUFFICIENT_DATA"
  | "INSUFFICIENT_HISTORY"
  | "UNSUPPORTED"
  | "INVALID";

export type SearchValidationState =
  | "VALID"
  | "DEGRADED"
  | "REJECTED"
  | "UNVALIDATED";

export type SearchSourceType =
  | "WEB_PAGE"
  | "DOCUMENT"
  | "ARTICLE"
  | "CV"
  | "TECHNICAL_DOCUMENT"
  | "LEGAL_DOCUMENT"
  | "API_RESOURCE"
  | "MANUAL_TEXT"
  | "OTHER";

export type SearchMimeType =
  | "text/plain"
  | "text/html"
  | "application/pdf"
  | "application/json"
  | "application/xml"
  | "application/octet-stream"
  | string;

export interface SearchVersionedContract {
  readonly contract_version:
    SearchContractVersion;
}

export interface SearchTimestampedContract {
  readonly created_at:
    SearchIsoTimestamp;
}

export interface SearchDocumentScopedContract {
  readonly document_id:
    SearchDocumentId;
}

export interface SearchQueryScopedContract {
  readonly query_id:
    SearchQueryId;
}

export interface SearchCohortScopedContract {
  readonly cohort_id:
    SearchCohortId;
}

/* ============================================================================
 * 2. EXPLICIT AVAILABILITY
 * ----------------------------------------------------------------------------
 * AVAILABLE(0)
 * - canonical zero exists.
 *
 * Non-AVAILABLE
 * - no canonical value exists.
 * ========================================================================== */

export interface SearchAvailableValue<T> {
  readonly availability_state:
    "AVAILABLE";

  readonly value:
    T;
}

export interface SearchUnavailableValue {
  readonly availability_state:
    | "UNAVAILABLE"
    | "INSUFFICIENT_DATA"
    | "INSUFFICIENT_HISTORY"
    | "UNSUPPORTED"
    | "INVALID";

  readonly reason:
    string;
}

export type SearchOptionalEvidence<T> =
  | SearchAvailableValue<T>
  | SearchUnavailableValue;

/* ============================================================================
 * 3. PIPELINE / GOVERNANCE IDENTITIES
 * ----------------------------------------------------------------------------
 * SearchPipelineLayer
 * - canonical active analytical / projection execution layers.
 *
 * SearchGovernanceSystem
 * - cross-cutting governance systems.
 *
 * Calibration is intentionally absent from SearchPipelineLayer.
 * ========================================================================== */

export type SearchPipelineLayer =
  | "ACQUISITION"
  | "EXTRACTION"
  | "SEGMENTATION"
  | "LEXICAL_ANALYSIS"
  | "FREQUENCY_SIGNAL_DETECTION"
  | "ANCHOR_SIGNAL_DETECTION"
  | "CONTEXT_AGGREGATION"
  | "LINK_SIGNAL_DETECTION"
  | "TEMPORAL_SIGNAL_DETECTION"
  | "BEHAVIORAL_SIGNAL_DETECTION"
  | "QUERY_NORMALIZATION"
  | "QUERY_PROFILING"
  | "QUERY_DOCUMENT_SIGNAL_DETECTION"
  | "INTRINSIC_DOCUMENT_SCORING"
  | "TEMPORAL_DOCUMENT_SCORING"
  | "QUERY_RELEVANCE_SCORING"
  | "LINK_AUTHORITY_SCORING"
  | "BEHAVIORAL_CALIBRATION_SCORING"
  | "POSITIVE_SCORE_ASSEMBLY"
  | "PENALTY_EVALUATION"
  | "ANALYTICAL_AGGREGATION"
  | "ELIGIBILITY_EVALUATION"
  | "COHORT_NORMALIZATION"
  | "RELATIVE_COHORT_EVALUATION"
  | "PRIVATE_DECISION"
  | "PRIVATE_SNAPSHOT"
  | "TRANSFORMATION"
  | "PUBLIC_RANKING"
  | "API"
  | "INTERFACE";

export type SearchGovernanceSystem =
  | "EXECUTION_TRACEABILITY"
  | "VARIABLE_LINEAGE_GOVERNANCE"
  | "CALIBRATION";

export type SearchTransportBoundary =
  | "SEARCH_COHORT_BATCH";

export type SearchVariableOwnershipLayer =
  | SearchPipelineLayer
  | SearchGovernanceSystem
  | SearchTransportBoundary;

export type SearchTraceableExecutionLayer =
  | SearchPipelineLayer
  | "CALIBRATION";

export const XYVALA_SEARCH_GOVERNANCE_SYSTEMS = [
  "EXECUTION_TRACEABILITY",
  "VARIABLE_LINEAGE_GOVERNANCE",
  "CALIBRATION",
] as const satisfies readonly SearchGovernanceSystem[];

/* ============================================================================
 * 4. VARIABLE LINEAGE GOVERNANCE
 * ========================================================================== */

export type SearchVariableLineageCategory =
  | "TRUTH"
  | "REFERENCE"
  | "TRANSPORT"
  | "AGGREGATED_CONTEXT"
  | "PROJECTION"
  | "METADATA"
  | "POLICY";

export type SearchVariableCriticalityLevel =
  | "CORE_TRUTH"
  | "STRUCTURAL_SUPPORT"
  | "AGGREGATED_CONTEXT"
  | "PROJECTION_VARIABLES";

export type SearchLineageStatus =
  | "PLANNED"
  | "ACTIVE"
  | "DEPRECATED"
  | "RETIRED"
  | "INVALID";

export interface SearchVariableLineage
  extends SearchVersionedContract {
  readonly variable_name:
    string;

  readonly ownership_layer:
    SearchVariableOwnershipLayer;

  readonly source_truth:
    string;

  readonly contract_source:
    string;

  readonly category:
    SearchVariableLineageCategory;

  readonly criticality_level:
    SearchVariableCriticalityLevel;

  readonly exposure_level:
    SearchDataVisibility;

  readonly propagation_path:
    readonly SearchVariableOwnershipLayer[];

  readonly upstream_dependencies:
    readonly string[];

  readonly downstream_consumers:
    readonly string[];

  readonly reconstruction_allowed:
    boolean;

  readonly public_exposure_allowed:
    boolean;

  readonly validation_required:
    boolean;

  readonly lineage_status:
    SearchLineageStatus;

  readonly protocol_reference:
    string;

  readonly producer_module:
    string;

  readonly producer_module_version:
    SearchModuleVersion;

  readonly validation_state:
    SearchValidationState;

  readonly data_type:
    string;

  readonly nullable:
    boolean;

  readonly availability_semantics:
    string;

  readonly schema_version:
    SearchSchemaVersion;

  readonly introduced_in_version:
    SearchContractVersion;

  readonly allowed_values?:
    readonly string[];

  readonly unit?:
    string;

  readonly minimum_value?:
    number;

  readonly maximum_value?:
    number;

  readonly reference_target?:
    string;

  readonly projection_source?:
    string;

  readonly deprecated_in_version?:
    SearchContractVersion;

  readonly replacement_variable?:
    string;
}

/* ============================================================================
 * 4.1. VLR VIOLATIONS
 * ========================================================================== */

export type SearchVlrViolationCode =
  | "VLR-001"
  | "VLR-002"
  | "VLR-003"
  | "VLR-004"
  | "VLR-005"
  | "VLR-006"
  | "VLR-007"
  | "VLR-008"
  | "VLR-009"
  | "VLR-010"
  | "VLR-011"
  | "VLR-012";

export const XYVALA_SEARCH_VLR_VIOLATIONS =
  Object.freeze({
    "VLR-001":
      "MULTIPLE_TRUTH_PRODUCERS",

    "VLR-002":
      "DOWNSTREAM_RECONSTRUCTION",

    "VLR-003":
      "BROKEN_LINEAGE",

    "VLR-004":
      "LOST_SOURCE_TRUTH",

    "VLR-005":
      "ILLEGAL_PUBLIC_EXPOSURE",

    "VLR-006":
      "SEMANTIC_MUTATION",

    "VLR-007":
      "SILENT_DISAPPEARANCE",

    "VLR-008":
      "AVAILABILITY_FORGERY",

    "VLR-009":
      "REFERENCE_WITHOUT_CANONICAL_TARGET",

    "VLR-010":
      "SCORE_IDENTITY_AMBIGUITY",

    "VLR-011":
      "CALIBRATION_FEEDBACK_INTO_CURRENT_CYCLE",

    "VLR-012":
      "PROJECTION_RE_ENTRY",
  } as const);

/* ============================================================================
 * 4.2. EXECUTION TRACEABILITY
 * ========================================================================== */

export interface SearchTraceRecord
  extends SearchVersionedContract,
    SearchTimestampedContract {
  readonly trace_id:
    SearchTraceId;

  readonly document_id?:
    SearchDocumentId;

  readonly query_id?:
    SearchQueryId;

  readonly cohort_id?:
    SearchCohortId;

  readonly layer:
    SearchTraceableExecutionLayer;

  readonly module_name:
    string;

  readonly module_version:
    SearchModuleVersion;

  readonly execution_nature:
    SearchExecutionNature;

  readonly method:
    string;

  readonly parameters:
    Readonly<Record<string, unknown>>;

  readonly input_contracts:
    readonly string[];

  readonly output_contract:
    string;

  readonly validation_state:
    SearchValidationState;

  readonly missing_data:
    readonly string[];

  readonly confidence:
    SearchOptionalEvidence<SearchConfidenceScore>;

  readonly corpus_version?:
    SearchCorpusVersion;

  readonly policy_version?:
    SearchPolicyVersion;

  readonly duration_ms?:
    SearchDurationMilliseconds;
}

/* ============================================================================
 * 4.3. TRACEABILITY OWNERSHIP
 * ========================================================================== */

export type SearchTraceabilityGovernanceOwner =
  | "EXECUTION_TRACEABILITY"
  | "VARIABLE_LINEAGE_GOVERNANCE"
  | "PRIVATE_SNAPSHOT";

export const XYVALA_SEARCH_TRACEABILITY_OWNERSHIP =
  Object.freeze({
    execution_traces:
      "EXECUTION_TRACEABILITY",

    variable_lineage:
      "VARIABLE_LINEAGE_GOVERNANCE",

    private_snapshot:
      "PRIVATE_SNAPSHOT",

    private_snapshot_role:
      "VALIDATE_FREEZE_TRANSPORT_ONLY",

    pipeline_layer_created:
      false,

    analytical_truth_creation:
      false,

    public_exposure_authorized:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "snapshot_generated_execution_trace",
        "snapshot_reconstructed_variable_lineage",
        "downstream_reconstructed_trace",
        "runtime_reconstructed_analytical_truth_for_traceability",
        "traceability_as_pipeline_layer",
        "public_trace_exposure",
        "public_variable_lineage_exposure",
      ] as const),
  } as const);

/* ============================================================================
 * 5. ACQUISITION CONTRACTS
 * ========================================================================== */

export interface SearchRawDocument
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly source_uri:
    SearchUri;

  readonly source_type:
    SearchSourceType;

  readonly mime_type:
    SearchMimeType;

  readonly raw_content:
    string | Uint8Array;

  readonly fetched_at:
    SearchIsoTimestamp;

  /**
   * Canonical publication timestamp observed from the source.
   *
   * Acquisition transports this evidence without interpreting it.
   *
   * fetched_at MUST NEVER be substituted for source_published_at.
   */
  readonly source_published_at:
    SearchOptionalEvidence<SearchIsoTimestamp>;

  readonly acquisition_method:
    string;

  readonly acquisition_module_version:
    SearchModuleVersion;

  readonly source_metadata:
    Readonly<
      Record<string, string | number | boolean>
    >;

  readonly content_hash:
    string;

  readonly validation_state:
    SearchValidationState;

  readonly rejection_reasons:
    readonly string[];
}

/* ============================================================================
 * 6. EXTRACTION CONTRACTS
 * ========================================================================== */

export interface SearchExtractedDocument
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly source_document_hash:
    string;

  readonly source_uri:
    SearchUri;

  readonly source_type:
    SearchSourceType;

  readonly extracted_text:
    string;

  readonly detected_language:
    SearchOptionalEvidence<SearchLanguageCode>;

  readonly extraction_method:
    string;

  readonly extraction_module_version:
    SearchModuleVersion;

  readonly extracted_character_count:
    SearchCount;

  readonly extracted_word_estimate:
    SearchCount;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 7. SEGMENTATION CONTRACTS
 * ========================================================================== */

export interface SearchSentence {
  readonly sentence_id:
    SearchSentenceId;

  readonly text:
    string;

  readonly start_offset:
    number;

  readonly end_offset:
    number;

  readonly ordinal_position:
    number;

  readonly structural_role:
    | "TITLE"
    | "HEADING"
    | "PARAGRAPH"
    | "LIST_ITEM"
    | "CAPTION"
    | "FOOTNOTE"
    | "UNKNOWN";
}

export interface SearchSegmentedDocument
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly sentences:
    readonly SearchSentence[];

  readonly sentence_count:
    SearchCount;

  readonly segmentation_method:
    string;

  readonly segmentation_module_version:
    SearchModuleVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 8. LEXICAL CONTRACTS
 * ========================================================================== */

export interface SearchTermOccurrence {
  readonly term:
    string;

  readonly normalized_term:
    string;

  readonly sentence_id:
    SearchSentenceId;

  readonly token_position:
    number;

  readonly character_offset:
    number;
}

export interface SearchTermStatistics {
  readonly normalized_term:
    string;

  readonly raw_forms:
    readonly string[];

  readonly occurrence_count:
    SearchCount;

  readonly document_frequency_ratio:
    SearchRatio;

  readonly sentence_frequency_count:
    SearchCount;
}

export interface SearchSentenceTermIndexEntry {
  readonly sentence_id:
    SearchSentenceId;

  readonly normalized_terms:
    readonly string[];
}

export interface SearchInvertedTermIndexEntry {
  readonly normalized_term:
    string;

  readonly sentence_ids:
    readonly SearchSentenceId[];
}

export interface SearchLexicalDocument
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly token_count:
    SearchCount;

  readonly vocabulary_size:
    SearchCount;

  readonly term_statistics:
    readonly SearchTermStatistics[];

  readonly term_occurrences:
    readonly SearchTermOccurrence[];

  readonly sentence_term_index:
    readonly SearchSentenceTermIndexEntry[];

  readonly inverted_term_index:
    readonly SearchInvertedTermIndexEntry[];

  readonly tokenizer_method:
    string;

  readonly tokenizer_version:
    SearchModuleVersion;

  readonly normalization_method:
    string;

  readonly stopword_profile_version?:
    string;

  readonly lemmatization_profile_version?:
    string;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 9. FREQUENCY AND RARITY SIGNALS
 * ========================================================================== */

export type SearchFrequencySignalKind =
  | "FREQUENT"
  | "RARE";

export type SearchRarityMethod =
  | "LOCAL_OCCURRENCE"
  | "LOCAL_FREQUENCY"
  | "TF_IDF"
  | "CORPUS_IDF"
  | "CUSTOM";

export interface SearchFrequencyTermSignal {
  readonly normalized_term:
    string;

  readonly raw_forms:
    readonly string[];

  readonly signal_kind:
    SearchFrequencySignalKind;

  readonly occurrence_count:
    SearchCount;

  readonly local_frequency_ratio:
    SearchRatio;

  readonly rarity_value:
    SearchOptionalEvidence<number>;

  readonly rank_within_signal_group:
    number;
}

export interface SearchFrequencySignals
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly frequent_terms:
    readonly SearchFrequencyTermSignal[];

  readonly rare_terms:
    readonly SearchFrequencyTermSignal[];

  readonly requested_frequent_term_limit:
    number;

  readonly requested_rare_term_limit:
    number;

  readonly rarity_method:
    SearchRarityMethod;

  readonly corpus_version:
    SearchOptionalEvidence<SearchCorpusVersion>;

  readonly detector_module_version:
    SearchModuleVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 10. INTRINSIC ANCHOR SIGNALS
 * ========================================================================== */

export type SearchAnchorKind =
  | "FREQUENT_TERM"
  | "RARE_TERM"
  | "FREQUENT_RARE_CONVERGENCE";

export interface SearchAnchorSignal {
  readonly anchor_id:
    SearchAnchorId;

  readonly sentence_id:
    SearchSentenceId;

  readonly sentence_text:
    string;

  readonly anchor_kind:
    SearchAnchorKind;

  readonly matched_frequent_terms:
    readonly string[];

  readonly matched_rare_terms:
    readonly string[];

  readonly local_convergence_score:
    SearchNormalizedScore;

  readonly position_weight:
    SearchWeight;

  readonly source_features:
    readonly string[];
}

export interface SearchAnchorSignals
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly anchors:
    readonly SearchAnchorSignal[];

  readonly anchor_count:
    SearchCount;

  readonly anchor_detection_method:
    string;

  readonly detector_module_version:
    SearchModuleVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 11. DOCUMENT CONTEXT AGGREGATION
 * ========================================================================== */

export interface SearchTermPairContext {
  readonly frequent_term:
    string;

  readonly rare_term:
    string;

  readonly cooccurrence_sentence_count:
    SearchCount;

  readonly cooccurrence_sentence_ids:
    readonly SearchSentenceId[];

  readonly proximity_score:
    SearchNormalizedScore;

  readonly convergence_evidence_score:
    SearchNormalizedScore;
}

export interface SearchContextAggregation
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly anchor_sentence_count:
    SearchCount;

  readonly anchor_sentence_coverage_ratio:
    SearchRatio;

  readonly frequent_term_anchor_count:
    SearchCount;

  readonly rare_term_anchor_count:
    SearchCount;

  readonly frequent_rare_convergence_anchor_count:
    SearchCount;

  readonly unique_matched_frequent_term_count:
    SearchCount;

  readonly unique_matched_rare_term_count:
    SearchCount;

  readonly mean_local_convergence_score:
    SearchNormalizedScore;

  readonly maximum_local_convergence_score:
    SearchNormalizedScore;

  readonly mean_anchor_position_weight:
    SearchWeight;

  readonly anchor_dispersion_score:
    SearchNormalizedScore;

  readonly anchor_concentration_score:
    SearchNormalizedScore;

  readonly adjacent_anchor_ratio:
    SearchRatio;

  readonly frequent_rare_pair_contexts:
    readonly SearchTermPairContext[];

  readonly context_aggregation_method:
    string;

  readonly aggregator_module_version:
    SearchModuleVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 12. LINK SIGNALS
 * ========================================================================== */

export interface SearchLinkSignals
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly inbound_link_count:
    SearchOptionalEvidence<SearchCount>;

  readonly unique_source_page_count:
    SearchOptionalEvidence<SearchCount>;

  readonly unique_source_domain_count:
    SearchOptionalEvidence<SearchCount>;

  readonly source_diversity_score:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly anchor_text_convergence_score:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly reciprocal_link_ratio:
    SearchOptionalEvidence<SearchRatio>;

  readonly suspected_link_cluster_ratio:
    SearchOptionalEvidence<SearchRatio>;

  readonly repeated_anchor_text_ratio:
    SearchOptionalEvidence<SearchRatio>;

  /**
   * AVAILABLE(0) is a real canonical zero-confidence observation.
   * UNAVAILABLE means no canonical confidence value exists.
   */
  readonly link_signal_confidence:
    SearchOptionalEvidence<SearchConfidenceScore>;

  readonly link_data_provider:
    SearchOptionalEvidence<string>;

  readonly link_data_observed_at:
    SearchOptionalEvidence<SearchIsoTimestamp>;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 13. TEMPORAL SIGNALS
 * ========================================================================== */

export type SearchRuptureEvolutionState =
  | "EXPLOSIVE"
  | "PERSISTENT"
  | "GROWING"
  | "DECLINING"
  | "STABLE"
  | "NONE"
  | "INSUFFICIENT_HISTORY";

export interface SearchTemporalRuptureEvent {
  readonly observation_id:
    SearchObservationId;

  readonly observed_at:
    SearchIsoTimestamp;

  readonly rupture_kind:
    | "TERM_DISTRIBUTION"
    | "ANCHOR_STRUCTURE"
    | "QUERY_RELEVANCE"
    | "LINK_PROFILE"
    | "CONTENT_REPLACEMENT"
    | "OTHER";

  readonly severity:
    SearchNormalizedScore;

  readonly confidence:
    SearchConfidenceScore;

  readonly explanation:
    string;
}

export interface SearchTemporalSignals
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  /**
   * Canonical publication timestamp retained by Temporal.
   *
   * Lineage determines whether this is:
   * - Reference / Transport from Acquisition source_published_at;
   * - or a new Truth produced by explicit versioned validation /
   *   normalization.
   */
  readonly published_at:
    SearchOptionalEvidence<SearchIsoTimestamp>;

  /**
   * Produced exclusively by Temporal from the authorized publication truth
   * and an explicitly supplied analytical reference timestamp.
   *
   * No downstream layer may recalculate this value.
   */
  readonly publication_age_ms:
    SearchOptionalEvidence<SearchDurationMilliseconds>;

  readonly temporal_state:
    | "CALIBRATED"
    | "INSUFFICIENT_HISTORY"
    | "UNAVAILABLE";

  readonly first_observed_at:
    SearchOptionalEvidence<SearchIsoTimestamp>;

  readonly last_observed_at:
    SearchOptionalEvidence<SearchIsoTimestamp>;

  readonly observation_count:
    SearchCount;

  readonly signal_persistence_score:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly anchor_persistence_score:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly frequency_trend:
    SearchOptionalEvidence<number>;

  readonly convergence_trend:
    SearchOptionalEvidence<number>;

  readonly rupture_evolution_state:
    SearchRuptureEvolutionState;

  readonly rupture_events:
    readonly SearchTemporalRuptureEvent[];

  /**
   * AVAILABLE(0) is a real confidence value equal to zero.
   * UNAVAILABLE means no canonical confidence value exists.
   */
  readonly temporal_confidence:
    SearchOptionalEvidence<SearchConfidenceScore>;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 14. BEHAVIORAL SIGNALS
 * ========================================================================== */

export type SearchBehavioralState =
  | "CALIBRATED"
  | "INSUFFICIENT_DATA"
  | "UNAVAILABLE";

export interface SearchBehavioralSignals
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  readonly behavioral_state:
    SearchBehavioralState;

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

  readonly minimum_impressions_policy_version:
    SearchPolicyVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 15. QUERY CONTRACTS
 * ========================================================================== */

export interface SearchQuery
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchQueryScopedContract {
  readonly raw_query:
    string;

  readonly requested_language?:
    SearchLanguageCode;

  readonly requested_source_types:
    readonly SearchSourceType[];

  readonly requested_domain?:
    string;

  readonly requested_time_window?: {
    readonly start_at?:
      SearchIsoTimestamp;

    readonly end_at?:
      SearchIsoTimestamp;
  };

  readonly query_origin:
    | "PUBLIC_INTERFACE"
    | "PRIVATE_TEST"
    | "API"
    | "CALIBRATION"
    | "SIMULATION";

  readonly validation_state:
    SearchValidationState;

  readonly rejection_reasons:
    readonly string[];
}

export interface SearchQueryTerm {
  readonly raw_term:
    string;

  readonly normalized_term:
    string;

  readonly term_weight:
    SearchWeight;

  readonly term_role:
    | "PRIMARY"
    | "SECONDARY"
    | "MODIFIER"
    | "EXCLUDED"
    | "UNKNOWN";
}

export interface SearchQueryProfile
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchQueryScopedContract {
  readonly normalized_query:
    string;

  readonly detected_language:
    SearchOptionalEvidence<SearchLanguageCode>;

  readonly query_terms:
    readonly SearchQueryTerm[];

  readonly excluded_terms:
    readonly string[];

  readonly query_intent:
    | "INFORMATIONAL"
    | "NAVIGATIONAL"
    | "COMPARATIVE"
    | "TRANSACTIONAL"
    | "UNKNOWN";

  readonly normalization_method:
    string;

  readonly profiling_method:
    string;

  readonly query_normalizer_version:
    SearchModuleVersion;

  readonly query_profiler_version:
    SearchModuleVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 16. QUERY-DOCUMENT SIGNALS
 * ========================================================================== */

export interface SearchQueryAnchorSignal {
  readonly anchor_id:
    SearchAnchorId;

  readonly sentence_id:
    SearchSentenceId;

  readonly matched_query_terms:
    readonly string[];

  readonly matched_frequent_terms:
    readonly string[];

  readonly matched_rare_terms:
    readonly string[];

  readonly query_term_coverage_score:
    SearchNormalizedScore;

  readonly query_anchor_proximity_score:
    SearchNormalizedScore;

  readonly query_anchor_convergence_score:
    SearchNormalizedScore;
}

export interface SearchQueryDocumentSignals
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  readonly exact_query_term_coverage_score:
    SearchNormalizedScore;

  readonly normalized_query_term_coverage_score:
    SearchNormalizedScore;

  readonly query_rare_term_proximity_score:
    SearchNormalizedScore;

  readonly query_frequent_term_proximity_score:
    SearchNormalizedScore;

  readonly query_anchor_signals:
    readonly SearchQueryAnchorSignal[];

  readonly query_anchor_coverage_score:
    SearchNormalizedScore;

  readonly query_concept_coverage_score:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly query_signal_dispersion_score:
    SearchNormalizedScore;

  readonly query_signal_concentration_score:
    SearchNormalizedScore;

  readonly detector_method:
    string;

  readonly detector_module_version:
    SearchModuleVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 16.1. PLANNED QUERY CONTEXT / CONCORDANCE IDENTITIES
 * ----------------------------------------------------------------------------
 * VLR status must remain PLANNED.
 *
 * No active runtime contract is introduced here.
 * ========================================================================== */

export const XYVALA_SEARCH_PLANNED_QUERY_CONTEXT_IDENTITIES =
  Object.freeze([
    "search.query_document.query_context_signal",
    "search.query_document.context_concordance_state",
    "search.query_document.context_concordance_score",
    "search.query_document.matched_contexts",
    "search.query_document.conflicting_contexts",
    "search.query_document.context_evidence",
    "search.query_document.context_confidence",
    "search.query_document.context_missing_data",
    "search.query_document.context_ambiguity_state",
    "search.query_document.entity_concordance",
  ] as const);

/* ============================================================================
 * 17. SCORING INPUT ASSEMBLY
 * ========================================================================== */

export interface SearchScoringInput
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
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
}

/* ============================================================================
 * 18. SCORE GOVERNANCE
 * ========================================================================== */

export type SearchSignalFamily =
  | "LEXICAL"
  | "ANCHOR"
  | "OCCURRENCE"
  | "FREQUENCY"
  | "CONVERGENCE"
  | "EVOLUTION"
  | "DURATION"
  | "QUERY_RELEVANCE"
  | "LINK_AUTHORITY"
  | "BEHAVIORAL_CALIBRATION"
  | "DOCUMENT_QUALITY";

export type SearchScoreName =
  | "lexical_score"
  | "anchor_score"
  | "occurrence_score"
  | "frequency_score"
  | "convergence_score"
  | "correlation_score"
  | "duration_score"
  | "query_relevance_score"
  | "link_authority_score"
  | "behavioral_calibration_score"
  | "document_quality_score";

export interface SearchSubScore
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly query_id?:
    SearchQueryId;

  readonly score_name:
    SearchScoreName;

  readonly signal_family:
    SearchSignalFamily;

  readonly value:
    SearchNormalizedScore;

  readonly confidence:
    SearchConfidenceScore;

  readonly source_features:
    readonly string[];

  readonly overlap_group:
    string;

  readonly method:
    string;

  readonly module_name:
    string;

  readonly module_version:
    SearchModuleVersion;

  readonly parameters:
    Readonly<Record<string, unknown>>;

  readonly missing_data:
    readonly string[];

  readonly explanation?:
    string;
}

/* ============================================================================
 * 18.1. INTRINSIC DOCUMENT SCORE VECTOR
 * ========================================================================== */

export interface SearchIntrinsicDocumentScoreVector
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly lexical_score:
    SearchSubScore;

  readonly anchor_score:
    SearchSubScore;

  readonly occurrence_score:
    SearchSubScore;

  readonly frequency_score:
    SearchSubScore;

  readonly convergence_score:
    SearchSubScore;

  readonly document_quality_score:
    SearchSubScore;

  readonly scorer_module_version:
    SearchModuleVersion;

  readonly scoring_policy_version:
    SearchPolicyVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 18.2. TEMPORAL DOCUMENT SCORE VECTOR
 * ========================================================================== */

export interface SearchTemporalDocumentScoreVector
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly correlation_score:
    SearchSubScore;

  readonly duration_score:
    SearchSubScore;

  readonly scorer_module_version:
    SearchModuleVersion;

  readonly scoring_policy_version:
    SearchPolicyVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 18.3. QUERY-RELATIVE SCORE VECTOR
 * ========================================================================== */

export interface SearchQueryRelativeScoreVector
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  readonly query_relevance_score:
    SearchSubScore;

  readonly scorer_module_version:
    SearchModuleVersion;

  readonly scoring_policy_version:
    SearchPolicyVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 18.4. LINK AUTHORITY SCORE VECTOR
 * ========================================================================== */

export interface SearchLinkAuthorityScoreVector
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract {
  readonly link_authority_score:
    SearchSubScore;

  readonly scorer_module_version:
    SearchModuleVersion;

  readonly scoring_policy_version:
    SearchPolicyVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 18.5. BEHAVIORAL CALIBRATION SCORE VECTOR
 * ========================================================================== */

export interface SearchBehavioralCalibrationScoreVector
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  readonly behavioral_calibration_score:
    SearchSubScore;

  readonly scorer_module_version:
    SearchModuleVersion;

  readonly scoring_policy_version:
    SearchPolicyVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 18.6. POSITIVE SCORE VECTOR
 * ========================================================================== */

export interface SearchPositiveScoreVector
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  readonly lexical_score:
    SearchSubScore;

  readonly anchor_score:
    SearchSubScore;

  readonly occurrence_score:
    SearchSubScore;

  readonly frequency_score:
    SearchSubScore;

  readonly convergence_score:
    SearchSubScore;

  readonly correlation_score:
    SearchSubScore;

  readonly duration_score:
    SearchSubScore;

  readonly query_relevance_score:
    SearchSubScore;

  readonly link_authority_score:
    SearchOptionalEvidence<SearchSubScore>;

  readonly behavioral_calibration_score:
    SearchOptionalEvidence<SearchSubScore>;

  readonly document_quality_score:
    SearchSubScore;
}

/* ============================================================================
 * 19. PENALTIES AND BLOCKING CONSTRAINTS
 * ========================================================================== */

export type SearchPenaltyKind =
  | "EXCESSIVE_REPETITION"
  | "LOW_INFORMATION_DENSITY"
  | "DUPLICATE_CONTENT"
  | "QUERY_MISMATCH"
  | "LINK_MANIPULATION"
  | "SOURCE_CLUSTER_CONCENTRATION"
  | "RECIPROCAL_LINK_ABUSE"
  | "ANCHOR_TEXT_MANIPULATION"
  | "STRUCTURAL_INCOHERENCE"
  | "TEMPORAL_RUPTURE"
  | "CONTENT_REPLACEMENT"
  | "LOW_TEXT_VOLUME"
  | "UNSUPPORTED_DOCUMENT_TYPE"
  | "INVALID_SOURCE";

export type SearchBlockingConstraintKind =
  | "INVALID_SOURCE"
  | "UNSUPPORTED_DOCUMENT_TYPE"
  | "CRITICAL_DUPLICATION"
  | "CRITICAL_LINK_MANIPULATION"
  | "CRITICAL_QUERY_MISMATCH"
  | "CRITICAL_TEMPORAL_RUPTURE"
  | "CONTRACT_VIOLATION";

export interface SearchPenalty {
  readonly penalty_kind:
    SearchPenaltyKind;

  readonly severity:
    SearchNormalizedScore;

  readonly confidence:
    SearchConfidenceScore;

  readonly source_features:
    readonly string[];

  readonly explanation:
    string;

  readonly method:
    string;

  readonly module_name:
    string;

  readonly module_version:
    SearchModuleVersion;

  readonly policy_version:
    SearchPolicyVersion;
}

export interface SearchBlockingConstraint {
  readonly constraint_kind:
    SearchBlockingConstraintKind;

  readonly active:
    boolean;

  readonly confidence:
    SearchConfidenceScore;

  readonly source_features:
    readonly string[];

  readonly reason:
    string;

  readonly evaluator_module_version:
    SearchModuleVersion;

  readonly policy_version:
    SearchPolicyVersion;
}

export interface SearchPenaltyVector
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  readonly penalties:
    readonly SearchPenalty[];

  readonly blocking_constraints:
    readonly SearchBlockingConstraint[];

  readonly total_penalty_value:
    SearchNormalizedScore;

  readonly critical_constraint_active:
    boolean;

  readonly evaluator_module_version:
    SearchModuleVersion;

  readonly penalty_policy_version:
    SearchPolicyVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 20. ANALYTICAL AGGREGATION
 * ========================================================================== */

export interface SearchAggregationWeight {
  readonly score_name:
    SearchScoreName;

  readonly requested_weight:
    SearchWeight;

  readonly effective_weight:
    SearchWeight;

  readonly score_confidence:
    SearchOptionalEvidence<SearchConfidenceScore>;

  readonly score_available:
    boolean;

  readonly score_included:
    boolean;

  readonly exclusion_reason?:
    string;

  readonly overlap_adjustment_applied:
    boolean;

  readonly overlap_adjustment_reason?:
    string;
}

export interface SearchOverlapControl {
  readonly overlap_group:
    string;

  readonly member_scores:
    readonly SearchScoreName[];

  readonly requested_group_weight:
    SearchWeight;

  readonly family_cap:
    SearchWeight;

  readonly effective_group_weight:
    SearchWeight;

  readonly applied_adjustment:
    SearchWeight;

  readonly adjustment_reason:
    string;

  readonly policy_version:
    SearchPolicyVersion;
}

export interface SearchScoreContribution {
  readonly score_name:
    SearchScoreName;

  readonly source_score_value:
    SearchNormalizedScore;

  readonly source_score_confidence:
    SearchConfidenceScore;

  readonly effective_weight:
    SearchWeight;

  readonly weighted_contribution:
    SearchRawScore;

  readonly overlap_group:
    string;
}

export interface SearchGlobalScore
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  /**
   * Stable analytical-result identity recommended by the Search VLR.
   */
  readonly aggregation_result_id?:
    SearchAggregationResultId;

  readonly positive_score:
    SearchRawScore;

  readonly penalty_value:
    SearchNormalizedScore;

  readonly final_raw_score:
    SearchRawScore;

  readonly aggregate_confidence:
    SearchConfidenceScore;

  readonly score_vector:
    SearchPositiveScoreVector;

  readonly penalty_vector:
    SearchPenaltyVector;

  readonly score_contributions:
    readonly SearchScoreContribution[];

  readonly weights_used:
    readonly SearchAggregationWeight[];

  readonly overlap_controls:
    readonly SearchOverlapControl[];

  readonly aggregation_method:
    string;

  readonly aggregator_module_version:
    SearchModuleVersion;

  readonly aggregation_policy_version:
    SearchPolicyVersion;

  readonly missing_score_handling_method:
    | "EXCLUDE_AND_RENORMALIZE"
    | "BLOCK_AGGREGATION"
    | "DEGRADE_CONFIDENCE";

  readonly excluded_score_names:
    readonly SearchScoreName[];

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 21. ELIGIBILITY
 * ========================================================================== */

export type SearchEligibilityReason =
  | "ELIGIBLE"
  | "INSUFFICIENT_DATA"
  | "INSUFFICIENT_HISTORY"
  | "LOW_TEXT_VOLUME"
  | "DUPLICATE_CONTENT"
  | "INVALID_SOURCE"
  | "UNSUPPORTED_DOCUMENT_TYPE"
  | "CRITICAL_RUPTURE"
  | "CRITICAL_MANIPULATION"
  | "LOW_QUERY_RELEVANCE"
  | "LOW_CONFIDENCE"
  | "CONTRACT_VIOLATION";

export interface SearchEligibilityResult
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  readonly eligibility_result_id?:
    SearchEligibilityResultId;

  readonly ranking_eligible:
    boolean;

  readonly allow_eligible:
    boolean;

  readonly blocking_reasons:
    readonly SearchEligibilityReason[];

  readonly limiting_reasons:
    readonly SearchEligibilityReason[];

  readonly evaluator_module_version:
    SearchModuleVersion;

  readonly eligibility_policy_version:
    SearchPolicyVersion;
}

/* ============================================================================
 * 22. COHORT DEFINITION / BATCH
 * ========================================================================== */

export interface SearchCohortDefinition
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchCohortScopedContract,
    SearchQueryScopedContract {
  readonly language:
    SearchLanguageCode;

  readonly domain?:
    string;

  readonly allowed_source_types:
    readonly SearchSourceType[];

  readonly time_window?: {
    readonly start_at?:
      SearchIsoTimestamp;

    readonly end_at?:
      SearchIsoTimestamp;
  };

  readonly corpus_version:
    SearchCorpusVersion;

  readonly minimum_cohort_size:
    SearchCount;

  readonly comparability_policy_version:
    SearchPolicyVersion;

  readonly ranking_policy_version:
    SearchPolicyVersion;

  readonly validation_state:
    SearchValidationState;

  readonly rejection_reasons:
    readonly string[];
}

export interface SearchCohortCandidate {
  readonly document_id:
    SearchDocumentId;

  readonly query_id:
    SearchQueryId;

  readonly global_score:
    SearchGlobalScore;

  readonly eligibility:
    SearchEligibilityResult;
}

export interface SearchCohortBatch
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchCohortScopedContract,
    SearchQueryScopedContract {
  readonly cohort_definition:
    SearchCohortDefinition;

  readonly candidates:
    readonly SearchCohortCandidate[];

  readonly candidate_count:
    SearchCount;

  readonly distribution_id:
    SearchDistributionId;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 23. COHORT DISTRIBUTION
 * ========================================================================== */

export interface SearchCohortDistribution
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchCohortScopedContract,
    SearchQueryScopedContract {
  readonly distribution_id:
    SearchDistributionId;

  readonly candidate_count:
    SearchCount;

  readonly minimum_score:
    SearchRawScore;

  readonly maximum_score:
    SearchRawScore;

  readonly mean_score:
    SearchRawScore;

  readonly median_score:
    SearchRawScore;

  readonly standard_deviation:
    number;

  readonly first_quartile_score:
    SearchRawScore;

  readonly third_quartile_score:
    SearchRawScore;

  readonly normalization_method:
    | "MIN_MAX"
    | "Z_SCORE"
    | "ROBUST_Z_SCORE"
    | "PERCENTILE_ONLY"
    | "CUSTOM";

  readonly normalizer_module_version:
    SearchModuleVersion;

  readonly normalization_policy_version:
    SearchPolicyVersion;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 24. PRIVATE RELATIVE COHORT EVALUATION
 * ========================================================================== */

export interface SearchRelativeEvaluationContext
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract,
    SearchCohortScopedContract {
  readonly relative_evaluation_id?:
    SearchRelativeEvaluationId;

  readonly distribution_id:
    SearchDistributionId;

  readonly raw_score:
    SearchRawScore;

  readonly normalized_score:
    SearchNormalizedScore;

  readonly relative_position:
    SearchRank;

  readonly percentile:
    SearchPercentile;

  readonly cohort_size:
    SearchCount;

  readonly distance_from_median:
    number;

  readonly distance_from_previous:
    SearchOptionalEvidence<number>;

  readonly distance_from_next:
    SearchOptionalEvidence<number>;

  readonly ranking_eligible:
    boolean;

  readonly evaluator_module_version:
    SearchModuleVersion;

  readonly relative_evaluation_policy_version:
    SearchPolicyVersion;
}

/* ============================================================================
 * 25. PRIVATE DECISION
 * ========================================================================== */

export type SearchPrivateDecisionCategory =
  | "BLOCK"
  | "WATCH"
  | "ALLOW";

export interface SearchPrivateDecision
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract,
    SearchCohortScopedContract {
  readonly category:
    SearchPrivateDecisionCategory;

  readonly triggered_rule_ids:
    readonly string[];

  readonly decision_reasons:
    readonly string[];

  readonly global_score_reference:
    SearchRawScore;

  readonly relative_evaluation_reference:
    SearchOptionalEvidence<SearchRelativeEvaluationContext>;

  readonly eligibility_reference:
    SearchEligibilityResult;

  readonly decision_confidence:
    SearchConfidenceScore;

  readonly decision_engine_version:
    SearchModuleVersion;

  readonly decision_policy_version:
    SearchPolicyVersion;

  readonly visibility:
    "PRIVATE";
}

/* ============================================================================
 * 26. CALIBRATION GOVERNANCE CONTRACTS
 * ----------------------------------------------------------------------------
 * Calibration exists outside the active analytical pipeline.
 *
 * Allowed:
 * historical data / labels / snapshots
 * -> Calibration
 * -> future Policy Version
 * -> future execution
 *
 * Forbidden:
 * current cycle
 * -> Calibration
 * -> mutation of current cycle
 * ========================================================================== */

export interface SearchCalibrationDataset
  extends SearchVersionedContract,
    SearchTimestampedContract {
  readonly calibration_dataset_id:
    string;

  readonly query_ids:
    readonly SearchQueryId[];

  readonly document_ids:
    readonly SearchDocumentId[];

  readonly label_source:
    | "HUMAN_REVIEW"
    | "CTR_FEEDBACK"
    | "ENGAGEMENT_FEEDBACK"
    | "HYBRID";

  readonly corpus_version:
    SearchCorpusVersion;

  readonly dataset_hash:
    string;
}

export interface SearchCalibrationPolicyCandidate
  extends SearchVersionedContract,
    SearchTimestampedContract {
  readonly candidate_policy_id:
    string;

  readonly aggregation_weights:
    Readonly<
      Record<SearchScoreName, SearchWeight>
    >;

  readonly overlap_group_caps:
    Readonly<Record<string, SearchWeight>>;

  readonly block_thresholds:
    Readonly<Record<string, number>>;

  readonly allow_thresholds:
    Readonly<Record<string, number>>;

  readonly normalization_method:
    SearchCohortDistribution["normalization_method"];
}

export interface SearchCalibrationEvaluation {
  readonly precision_at_k:
    SearchOptionalEvidence<number>;

  readonly recall_at_k:
    SearchOptionalEvidence<number>;

  readonly mean_reciprocal_rank:
    SearchOptionalEvidence<number>;

  readonly normalized_discounted_cumulative_gain:
    SearchOptionalEvidence<number>;

  readonly block_false_negative_rate:
    SearchOptionalEvidence<number>;

  readonly allow_false_positive_rate:
    SearchOptionalEvidence<number>;

  readonly evaluation_notes:
    readonly string[];
}

export interface SearchCalibrationResult
  extends SearchVersionedContract,
    SearchTimestampedContract {
  readonly calibration_result_id:
    string;

  readonly calibration_dataset_id:
    string;

  readonly selected_policy_id:
    string;

  readonly evaluation:
    SearchCalibrationEvaluation;

  readonly resulting_policy_version:
    SearchPolicyVersion;

  readonly calibrator_module_version:
    SearchModuleVersion;

  readonly validation_state:
    SearchValidationState;
}

/* ============================================================================
 * 27. PRIVATE SNAPSHOT CONTRACT OWNERSHIP
 * ----------------------------------------------------------------------------
 * CANONICAL OWNER:
 * - search-private-snapshot-contract.ts
 *
 * This file MUST NOT redefine SearchPrivateDocumentSnapshot.
 *
 * It only re-exports the canonical type.
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_CONTRACT_OWNERSHIP =
  Object.freeze({
    contract:
      "SearchPrivateDocumentSnapshot",

    canonical_owner:
      "search-private-snapshot-contract.ts",

    pipeline_contract_role:
      "TYPE_RE_EXPORT_ONLY",

    analytical_truth_creation:
      false,

    reconstruction_authorized:
      false,

    duplicate_contract_definition_authorized:
      false,
  } as const);

/* ============================================================================
 * 28. PUBLIC PROJECTION CONTRACTS
 * ========================================================================== */

export type SearchPublicRelevanceLabel =
  | "HIGH_RELEVANCE"
  | "RELEVANT"
  | "CONTEXTUAL"
  | "LIMITED_RELEVANCE"
  | "UNAVAILABLE";

export type SearchPublicEvidenceLabel =
  | "STRONG_DOCUMENT_MATCH"
  | "ANCHOR_SUPPORTED"
  | "SOURCE_SUPPORTED"
  | "LIMITED_EVIDENCE"
  | "INSUFFICIENT_DATA";

export interface SearchPublicResultSource {
  readonly source_uri:
    SearchUri;

  readonly source_type:
    SearchSourceType;

  readonly source_domain?:
    string;

  readonly fetched_at:
    SearchIsoTimestamp;

  /**
   * Authorized public projection of canonical Temporal published_at.
   *
   * fetched_at MUST NEVER be used as a substitute.
   */
  readonly published_at:
    SearchOptionalEvidence<SearchIsoTimestamp>;
}

export interface SearchPublicResultExcerpt {
  readonly sentence_id:
    SearchSentenceId;

  readonly excerpt:
    string;

  readonly matched_terms:
    readonly string[];
}

/* ============================================================================
 * 28.1. PUBLIC RESULT CANDIDATE
 * ========================================================================== */

export interface SearchPublicResultCandidate
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  readonly title:
    string;

  readonly source:
    SearchPublicResultSource;

  readonly excerpts:
    readonly SearchPublicResultExcerpt[];

  readonly relevance_label:
    SearchPublicRelevanceLabel;

  readonly evidence_labels:
    readonly SearchPublicEvidenceLabel[];

  readonly language:
    SearchOptionalEvidence<SearchLanguageCode>;

  readonly availability_state:
    SearchAvailabilityState;

  /**
   * Temporary compatibility field.
   *
   * Target architecture:
   * public_projection_id -> internal snapshot_id relation.
   */
  readonly snapshot_reference:
    string;

  readonly public_transformation_policy_version:
    SearchPolicyVersion;

  readonly transformer_version:
    SearchModuleVersion;

  readonly visibility:
    "PUBLIC";
}

/* ============================================================================
 * 28.2. PUBLIC RANKED RESULT
 * ========================================================================== */

export interface SearchPublicSearchResult
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchDocumentScopedContract,
    SearchQueryScopedContract {
  readonly public_position:
    SearchRank;

  readonly title:
    string;

  readonly source:
    SearchPublicResultSource;

  readonly excerpts:
    readonly SearchPublicResultExcerpt[];

  readonly relevance_label:
    SearchPublicRelevanceLabel;

  readonly evidence_labels:
    readonly SearchPublicEvidenceLabel[];

  readonly language:
    SearchOptionalEvidence<SearchLanguageCode>;

  readonly availability_state:
    SearchAvailabilityState;

  readonly snapshot_reference:
    string;

  readonly public_transformation_policy_version:
    SearchPolicyVersion;

  readonly transformer_version:
    SearchModuleVersion;

  readonly public_ranking_policy_version:
    SearchPolicyVersion;

  readonly ranking_module_version:
    SearchModuleVersion;

  readonly visibility:
    "PUBLIC";
}

/* ============================================================================
 * 28.3. PUBLIC RANKING PROJECTION
 * ========================================================================== */

export interface SearchPublicRankingProjection
  extends SearchVersionedContract,
    SearchTimestampedContract,
    SearchQueryScopedContract {
  readonly public_results:
    readonly SearchPublicSearchResult[];

  readonly result_count:
    SearchCount;

  readonly public_projection_version:
    SearchPolicyVersion;

  readonly ranking_module_version:
    SearchModuleVersion;

  readonly source_contract:
    "SearchPublicResultCandidate";

  readonly visibility:
    "PUBLIC";
}

/* ============================================================================
 * 28.4. PUBLIC PROJECTION OWNERSHIP
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_PROJECTION_OWNERSHIP =
  Object.freeze({
    SearchPublicResultCandidate:
      "TRANSFORMATION",

    SearchPublicSearchResult:
      "PUBLIC_RANKING",

    SearchPublicRankingProjection:
      "PUBLIC_RANKING",

    public_position:
      "PUBLIC_RANKING",

    published_at:
      "TRANSFORMATION",

    published_at_source:
      "search.temporal.published_at",
  } as const);

/* ============================================================================
 * 28.5. FORBIDDEN PRIVATE-TO-PUBLIC IDENTITIES
 * ========================================================================== */

export const XYVALA_SEARCH_FORBIDDEN_PUBLIC_PRIVATE_IDENTITIES =
  Object.freeze([
    "private_decision",
    "category",
    "triggered_rule_ids",
    "decision_reasons",

    "positive_score",
    "penalty_value",
    "final_raw_score",
    "aggregate_confidence",

    "normalized_score",
    "relative_position",
    "percentile",
    "distance_from_median",
    "distance_from_previous",
    "distance_from_next",

    "ranking_eligible",
    "allow_eligible",

    "weights_used",
    "overlap_controls",
    "score_contributions",

    "blocking_constraints",
    "critical_constraint_active",

    "cohort_distribution",
    "minimum_score",
    "maximum_score",
    "mean_score",
    "median_score",
    "standard_deviation",

    "behavioral_signals",
    "behavioral_calibration_score",

    "block_thresholds",
    "allow_thresholds",

    "calibration_result",
    "selected_policy_id",

    "source_published_at",
    "publication_age_ms",
    "temporal_confidence",

    "traces",
    "trace_id",
    "variable_lineage",
    "producer_module",
    "producer_module_version",
    "propagation_path",
  ] as const);

/* ============================================================================
 * 28.6. PUBLIC PROJECTION CONTRACT EVOLUTION
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_PROJECTION_CONTRACT_MIGRATION =
  Object.freeze({
    migration_required:
      true,

    reason:
      "separate_public_transformation_from_public_ranking_ownership",

    introduced_contract:
      "SearchPublicResultCandidate",

    transformation_output:
      "SearchPublicResultCandidate",

    ranking_input:
      "SearchPublicResultCandidate",

    ranking_output:
      "SearchPublicSearchResult",

    final_projection:
      "SearchPublicRankingProjection",

    public_position_owner:
      "PUBLIC_RANKING",

    temporal_public_source:
      "search.temporal.published_at",

    prohibited_shortcuts:
      Object.freeze([
        "transformer_generated_public_position",
        "private_relative_position_as_public_position",
        "private_percentile_as_public_position",
        "private_decision_as_public_ranking",
        "private_raw_score_direct_public_ordering",
        "fetched_at_as_published_at",
        "source_published_at_direct_public_exposure",
        "publication_age_ms_public_exposure",
        "temporal_confidence_public_exposure",
        "silent_public_contract_change",
      ] as const),
  } as const);

/* ============================================================================
 * 29. SCORE AVAILABILITY OWNERSHIP
 * ========================================================================== */

export const XYVALA_SEARCH_SCORE_VECTOR_AVAILABILITY_OWNERSHIP =
  Object.freeze({
    intrinsic_document_score_vector:
      "MANDATORY",

    temporal_document_score_vector:
      "MANDATORY",

    query_relative_score_vector:
      "MANDATORY",

    link_authority_score_vector:
      "OPTIONAL_EXPLICIT_EVIDENCE",

    behavioral_calibration_score_vector:
      "OPTIONAL_EXPLICIT_EVIDENCE",

    positive_score_vector:
      Object.freeze({
        lexical_score:
          "MANDATORY",

        anchor_score:
          "MANDATORY",

        occurrence_score:
          "MANDATORY",

        frequency_score:
          "MANDATORY",

        convergence_score:
          "MANDATORY",

        correlation_score:
          "MANDATORY",

        duration_score:
          "MANDATORY",

        query_relevance_score:
          "MANDATORY",

        link_authority_score:
          "OPTIONAL_EXPLICIT_EVIDENCE",

        behavioral_calibration_score:
          "OPTIONAL_EXPLICIT_EVIDENCE",

        document_quality_score:
          "MANDATORY",
      } as const),
  } as const);

/* ============================================================================
 * 30. OFFICIAL PIPELINE ORDER
 * ----------------------------------------------------------------------------
 * Calibration is deliberately absent.
 *
 * Traceability and Variable Lineage Governance are deliberately absent.
 *
 * SearchCohortBatch is a transport boundary and is not a SearchPipelineLayer.
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_PIPELINE_ORDER = [
  "ACQUISITION",
  "EXTRACTION",
  "SEGMENTATION",
  "LEXICAL_ANALYSIS",
  "FREQUENCY_SIGNAL_DETECTION",
  "ANCHOR_SIGNAL_DETECTION",
  "CONTEXT_AGGREGATION",
  "LINK_SIGNAL_DETECTION",
  "TEMPORAL_SIGNAL_DETECTION",
  "BEHAVIORAL_SIGNAL_DETECTION",
  "QUERY_NORMALIZATION",
  "QUERY_PROFILING",
  "QUERY_DOCUMENT_SIGNAL_DETECTION",
  "INTRINSIC_DOCUMENT_SCORING",
  "TEMPORAL_DOCUMENT_SCORING",
  "QUERY_RELEVANCE_SCORING",
  "LINK_AUTHORITY_SCORING",
  "BEHAVIORAL_CALIBRATION_SCORING",
  "POSITIVE_SCORE_ASSEMBLY",
  "PENALTY_EVALUATION",
  "ANALYTICAL_AGGREGATION",
  "ELIGIBILITY_EVALUATION",
  "COHORT_NORMALIZATION",
  "RELATIVE_COHORT_EVALUATION",
  "PRIVATE_DECISION",
  "PRIVATE_SNAPSHOT",
] as const satisfies readonly SearchPipelineLayer[];

export const XYVALA_SEARCH_PUBLIC_PIPELINE_ORDER = [
  "PRIVATE_SNAPSHOT",
  "TRANSFORMATION",
  "PUBLIC_RANKING",
  "API",
  "INTERFACE",
] as const satisfies readonly SearchPipelineLayer[];

/* ============================================================================
 * 31. PIPELINE CONTRACT
 * ========================================================================== */

export interface XyvalaSearchPipelineContract
  extends SearchVersionedContract,
    SearchTimestampedContract {
  readonly private_pipeline_order:
    typeof XYVALA_SEARCH_PRIVATE_PIPELINE_ORDER;

  readonly public_pipeline_order:
    typeof XYVALA_SEARCH_PUBLIC_PIPELINE_ORDER;

  readonly governance_systems:
    typeof XYVALA_SEARCH_GOVERNANCE_SYSTEMS;

  readonly protocol_name:
    "XYVALA_SEARCH";

  readonly protocol_status:
    "OFFICIAL";

  readonly contract_before_runtime:
    true;

  readonly deterministic_execution_required:
    true;

  readonly immutable_contracts_required:
    true;

  readonly private_public_separation_required:
    true;

  readonly compute_observe_mutate_separation_required:
    true;

  readonly upstream_recalculation_forbidden:
    true;

  readonly downstream_truth_reconstruction_forbidden:
    true;

  readonly missing_data_must_be_explicit:
    true;

  readonly unavailable_to_zero_conversion_forbidden:
    true;

  readonly unavailable_to_neutral_conversion_forbidden:
    true;

  readonly variable_lineage_required:
    true;

  readonly execution_traceability_required:
    true;

  readonly traceability_cross_cutting_required:
    true;

  readonly traceability_pipeline_layer_forbidden:
    true;

  readonly calibration_outside_current_cycle_required:
    true;

  readonly calibration_current_cycle_feedback_forbidden:
    true;

  readonly snapshot_contract_single_owner_required:
    true;

  readonly snapshot_trace_production_forbidden:
    true;

  readonly snapshot_lineage_reconstruction_forbidden:
    true;

  readonly propagation_audit_required:
    true;

  readonly public_private_decision_exposure_forbidden:
    true;

  readonly public_private_threshold_exposure_forbidden:
    true;

  readonly public_private_calibration_exposure_forbidden:
    true;

  readonly public_private_traceability_exposure_forbidden:
    true;

  readonly source_published_at_from_fetched_at_forbidden:
    true;

  readonly publication_age_downstream_recalculation_forbidden:
    true;

  readonly unavailable_confidence_to_zero_forbidden:
    true;
}

/* ============================================================================
 * 32. OFFICIAL CONTRACT INSTANCE
 * ========================================================================== */

export const XYVALA_SEARCH_PIPELINE_CONTRACT:
  XyvalaSearchPipelineContract = {
  contract_version:
    "2.1.0",

  created_at:
    "2026-08-31T00:00:00.000Z",

  private_pipeline_order:
    XYVALA_SEARCH_PRIVATE_PIPELINE_ORDER,

  public_pipeline_order:
    XYVALA_SEARCH_PUBLIC_PIPELINE_ORDER,

  governance_systems:
    XYVALA_SEARCH_GOVERNANCE_SYSTEMS,

  protocol_name:
    "XYVALA_SEARCH",

  protocol_status:
    "OFFICIAL",

  contract_before_runtime:
    true,

  deterministic_execution_required:
    true,

  immutable_contracts_required:
    true,

  private_public_separation_required:
    true,

  compute_observe_mutate_separation_required:
    true,

  upstream_recalculation_forbidden:
    true,

  downstream_truth_reconstruction_forbidden:
    true,

  missing_data_must_be_explicit:
    true,

  unavailable_to_zero_conversion_forbidden:
    true,

  unavailable_to_neutral_conversion_forbidden:
    true,

  variable_lineage_required:
    true,

  execution_traceability_required:
    true,

  traceability_cross_cutting_required:
    true,

  traceability_pipeline_layer_forbidden:
    true,

  calibration_outside_current_cycle_required:
    true,

  calibration_current_cycle_feedback_forbidden:
    true,

  snapshot_contract_single_owner_required:
    true,

  snapshot_trace_production_forbidden:
    true,

  snapshot_lineage_reconstruction_forbidden:
    true,

  propagation_audit_required:
    true,

  public_private_decision_exposure_forbidden:
    true,

  public_private_threshold_exposure_forbidden:
    true,

  public_private_calibration_exposure_forbidden:
    true,

  public_private_traceability_exposure_forbidden:
    true,

  source_published_at_from_fetched_at_forbidden:
    true,

  publication_age_downstream_recalculation_forbidden:
    true,

  unavailable_confidence_to_zero_forbidden:
    true,
};
