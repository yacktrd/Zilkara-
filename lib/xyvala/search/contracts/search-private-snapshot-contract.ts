/* ============================================================================
 * FILE: lib/xyvala/search/contracts/search-private-snapshot-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical private snapshot contract
 *
 * ROLE
 * - own the unique canonical SearchPrivateDocumentSnapshot contract
 * - define the immutable private snapshot transport boundary
 * - preserve canonical acquisition lineage
 * - preserve canonical documentary truth
 * - preserve canonical signal truth
 * - preserve canonical scoring truth
 * - preserve canonical cohort truth
 * - preserve canonical private decision truth
 * - transport execution traceability without producing it
 * - transport Variable Lineage without reconstructing it
 * - preserve the private/public boundary
 *
 * CLASSIFICATION
 * - PRIVATE CONTRACT
 * - SEARCH DOMAIN
 * - PRIVATE SNAPSHOT
 * - CANONICAL OWNER
 * - NON-COMPUTE
 * - NON-OBSERVE
 * - NON-MUTATING
 * - NON-PUBLIC
 * - SOURCE OF TRUTH
 *
 * CANONICAL OWNER
 * ----------------------------------------------------------------------------
 * lib/xyvala/search/contracts/search-private-snapshot-contract.ts
 *
 * SearchPrivateDocumentSnapshot is defined exactly once:
 *
 * search-private-snapshot-contract.ts
 * -> SearchPrivateDocumentSnapshot
 *
 * search-pipeline-contract.ts:
 * -> re-exports SearchPrivateDocumentSnapshot
 * -> does NOT redefine it
 *
 * POSITION IN OFFICIAL CHAIN
 * ----------------------------------------------------------------------------
 *
 * ...
 * -> PRIVATE_DECISION
 * -> PRIVATE_SNAPSHOT
 * -> TRANSFORMATION
 * -> PUBLIC_RANKING
 * -> API
 * -> INTERFACE
 *
 * GOVERNANCE
 * ----------------------------------------------------------------------------
 * EXECUTION_TRACEABILITY
 * - produces traces.
 *
 * VARIABLE_LINEAGE_GOVERNANCE
 * - owns lineage registry truth.
 *
 * PRIVATE_SNAPSHOT
 * - validates;
 * - freezes;
 * - transports.
 *
 * PRIVATE_SNAPSHOT never:
 * - produces upstream analytical truth;
 * - produces execution trace truth;
 * - reconstructs Variable Lineage;
 * - repairs missing evidence;
 * - changes availability semantics;
 * - recalculates temporal truth;
 * - produces public truth.
 *
 * TEMPORAL LINEAGE
 * ----------------------------------------------------------------------------
 * search.acquisition.source_published_at
 * -> transported as acquisition lineage.
 *
 * search.temporal.published_at
 * -> transported inside temporal_signals.
 *
 * search.temporal.publication_age_ms
 * -> transported inside temporal_signals.
 *
 * PRIVATE_SNAPSHOT does not produce or recalculate any of them.
 *
 * INVARIANTS
 * - exactly one SearchPrivateDocumentSnapshot TypeScript identity exists
 * - canonical owner is this file
 * - search-pipeline-contract.ts may only re-export the canonical identity
 * - no parallel snapshot contract is permitted
 * - no runtime behavior exists
 * - no runtime state exists
 * - no clock access exists
 * - no identifier generation exists
 * - no analytical reconstruction exists
 * - no unavailable evidence is converted into a value
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
  SearchOptionalEvidence,
  SearchPenaltyVector,
  SearchPositiveScoreVector,
  SearchPrivateDecision,
  SearchQueryDocumentSignals,
  SearchQueryId,
  SearchQueryRelativeScoreVector,
  SearchRelativeEvaluationContext,
  SearchSegmentedDocument,
  SearchSnapshotVersion,
  SearchSourceType,
  SearchTemporalDocumentScoreVector,
  SearchTemporalSignals,
  SearchTraceRecord,
  SearchUri,
  SearchValidationState,
  SearchVariableLineage,
} from "./search-pipeline-contract";

/* ============================================================================
 * 1. CONTRACT IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_CONTRACT_NAME =
  "xyvala-search-private-snapshot-contract" as const;

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_CONTRACT_STATUS =
  "OFFICIAL_CANONICAL_CONTRACT" as const;

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_CANONICAL_OWNER =
  "search-private-snapshot-contract" as const;

/**
 * Snapshot contract version.
 *
 * This contract is now the canonical owner of the private snapshot identity.
 *
 * It deliberately does not read XYVALA_SEARCH_PIPELINE_CONTRACT at runtime,
 * preventing a runtime circular dependency with search-pipeline-contract.ts.
 */
export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_CONTRACT_VERSION:
  SearchContractVersion =
    "2.1.0";

/* ============================================================================
 * 2. CANONICAL ACQUISITION REFERENCE
 * ----------------------------------------------------------------------------
 * Transport contract only.
 *
 * Ownership remains ACQUISITION.
 *
 * PRIVATE_SNAPSHOT:
 * - does not reconstruct source_uri;
 * - does not reconstruct source_type;
 * - does not reconstruct fetched_at;
 * - does not reconstruct source_published_at;
 * - does not reconstruct content_hash.
 * ========================================================================== */

export interface SearchPrivateSnapshotRawDocumentReference {
  readonly source_uri:
    SearchUri;

  readonly source_type:
    SearchSourceType;

  readonly fetched_at:
    SearchIsoTimestamp;

  /**
   * Acquisition truth transported unchanged.
   *
   * fetched_at MUST NEVER be substituted for this evidence.
   */
  readonly source_published_at:
    SearchOptionalEvidence<SearchIsoTimestamp>;

  readonly content_hash:
    string;

  readonly acquisition_contract_version:
    SearchContractVersion;
}

/* ============================================================================
 * 3. CANONICAL PRIVATE SNAPSHOT
 * ----------------------------------------------------------------------------
 * PRIVATE_SNAPSHOT is an immutable transport / persistence boundary.
 *
 * It owns only:
 * - snapshot_id;
 * - snapshot_version;
 * - snapshot validation metadata;
 * - snapshot visibility.
 *
 * Everything else is upstream Truth, Reference or Transport.
 * ========================================================================== */

export interface SearchPrivateDocumentSnapshot {
  readonly contract_version:
    SearchContractVersion;

  readonly created_at:
    SearchIsoTimestamp;

  readonly document_id:
    SearchDocumentId;

  readonly query_id:
    SearchQueryId;

  readonly cohort_id:
    SearchCohortId;

  readonly snapshot_version:
    SearchSnapshotVersion;

  /**
   * Identity supplied by the authorized Snapshot Identity owner.
   *
   * The builder MUST NOT generate it locally.
   */
  readonly snapshot_id:
    string;

  /* --------------------------------------------------------------------------
   * Acquisition lineage transport
   * ----------------------------------------------------------------------- */

  readonly raw_document_reference:
    SearchPrivateSnapshotRawDocumentReference;

  /* --------------------------------------------------------------------------
   * Canonical documentary truth transport
   * ----------------------------------------------------------------------- */

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

  /* --------------------------------------------------------------------------
   * Query/document and supporting signal transport
   * ----------------------------------------------------------------------- */

  readonly query_document_signals:
    SearchQueryDocumentSignals;

  readonly link_signals:
    SearchLinkSignals;

  /**
   * Includes canonical Temporal truth such as:
   * - published_at;
   * - publication_age_ms;
   * - temporal_confidence.
   *
   * PRIVATE_SNAPSHOT transports these values unchanged.
   */
  readonly temporal_signals:
    SearchTemporalSignals;

  readonly behavioral_signals:
    SearchBehavioralSignals;

  /* --------------------------------------------------------------------------
   * Mandatory canonical score vectors
   * ----------------------------------------------------------------------- */

  readonly intrinsic_document_score_vector:
    SearchIntrinsicDocumentScoreVector;

  readonly temporal_document_score_vector:
    SearchTemporalDocumentScoreVector;

  readonly query_relative_score_vector:
    SearchQueryRelativeScoreVector;

  /* --------------------------------------------------------------------------
   * Explicit optional supporting score vectors
   * ----------------------------------------------------------------------- */

  readonly link_authority_score_vector:
    SearchOptionalEvidence<SearchLinkAuthorityScoreVector>;

  readonly behavioral_calibration_score_vector:
    SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector>;

  /* --------------------------------------------------------------------------
   * Positive / negative analytical evidence
   * ----------------------------------------------------------------------- */

  readonly positive_score_vector:
    SearchPositiveScoreVector;

  readonly penalty_vector:
    SearchPenaltyVector;

  /* --------------------------------------------------------------------------
   * Canonical analytical aggregation
   * ----------------------------------------------------------------------- */

  readonly global_score:
    SearchGlobalScore;

  /* --------------------------------------------------------------------------
   * Eligibility / cohort / relative evaluation
   * ----------------------------------------------------------------------- */

  readonly eligibility:
    SearchEligibilityResult;

  readonly cohort_definition:
    SearchCohortDefinition;

  readonly cohort_distribution:
    SearchCohortDistribution;

  readonly relative_evaluation:
    SearchOptionalEvidence<SearchRelativeEvaluationContext>;

  /* --------------------------------------------------------------------------
   * Canonical private decision
   * ----------------------------------------------------------------------- */

  readonly private_decision:
    SearchPrivateDecision;

  /* --------------------------------------------------------------------------
   * Cross-cutting traceability transport
   * ----------------------------------------------------------------------- */

  /**
   * Produced by EXECUTION_TRACEABILITY.
   *
   * PRIVATE_SNAPSHOT transports this truth unchanged.
   */
  readonly traces:
    readonly SearchTraceRecord[];

  /**
   * Produced / governed by VARIABLE_LINEAGE_GOVERNANCE.
   *
   * PRIVATE_SNAPSHOT transports this registry truth unchanged.
   */
  readonly variable_lineage:
    readonly SearchVariableLineage[];

  /* --------------------------------------------------------------------------
   * Snapshot-owned metadata
   * ----------------------------------------------------------------------- */

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];

  readonly visibility:
    "PRIVATE";
}

/* ============================================================================
 * 4. PUBLIC-TRANSFORMATION SOURCE REQUIREMENTS
 * ----------------------------------------------------------------------------
 * Governance metadata only.
 *
 * published_at is intentionally NOT sourced from this acquisition-reference
 * list.
 *
 * Public published_at must originate from:
 *
 * snapshot.temporal_signals.published_at
 *
 * and never from fetched_at or source_published_at.
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_PUBLIC_SOURCE_REQUIREMENTS =
  Object.freeze([
    "source_uri",
    "source_type",
    "fetched_at",
  ] as const);

/* ============================================================================
 * 5. TEMPORAL LINEAGE GOVERNANCE
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_TEMPORAL_LINEAGE =
  Object.freeze({
    source_published_at: {
      canonical_owner:
        "ACQUISITION",

      snapshot_location:
        "raw_document_reference.source_published_at",

      snapshot_category:
        "TRANSPORT",

      downstream_recalculation_authorized:
        false,

      public_direct_exposure_authorized:
        false,
    },

    published_at: {
      canonical_owner:
        "TEMPORAL_SIGNAL_DETECTION",

      snapshot_location:
        "temporal_signals.published_at",

      snapshot_category:
        "TRANSPORT",

      downstream_recalculation_authorized:
        false,

      public_projection_authorized:
        true,
    },

    publication_age_ms: {
      canonical_owner:
        "TEMPORAL_SIGNAL_DETECTION",

      snapshot_location:
        "temporal_signals.publication_age_ms",

      snapshot_category:
        "TRANSPORT",

      downstream_recalculation_authorized:
        false,

      public_direct_exposure_authorized:
        false,
    },

    temporal_confidence: {
      canonical_owner:
        "TEMPORAL_SIGNAL_DETECTION",

      snapshot_location:
        "temporal_signals.temporal_confidence",

      snapshot_category:
        "TRANSPORT",

      downstream_recalculation_authorized:
        false,

      public_direct_exposure_authorized:
        false,
    },
  } as const);

/* ============================================================================
 * 6. FORBIDDEN SNAPSHOT RECONSTRUCTIONS
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_FORBIDDEN_RECONSTRUCTIONS =
  Object.freeze([
    "parallel_SearchPrivateDocumentSnapshot_definition",

    "fetched_at_from_snapshot_created_at",
    "fetched_at_from_extracted_document_created_at",

    "source_published_at_from_fetched_at",
    "published_at_from_fetched_at",
    "published_at_from_snapshot_created_at",

    "publication_age_ms_from_snapshot_created_at",
    "publication_age_ms_downstream_recalculation",

    "source_type_from_uri",
    "source_type_from_mime_type",

    "missing_score_from_other_score",
    "missing_signal_from_downstream_score",

    "unavailable_confidence_as_zero",
    "unavailable_evidence_as_zero",
    "unavailable_evidence_as_neutral",

    "private_decision_from_relative_position",

    "traceability_reconstruction",
    "variable_lineage_reconstruction",

    "public_label_inside_private_snapshot",
  ] as const);

/* ============================================================================
 * 7. FORBIDDEN DIRECT PUBLIC EXPOSURE
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_FORBIDDEN_PUBLIC_FIELDS =
  Object.freeze([
    "private_decision",

    "positive_score_vector",
    "penalty_vector",
    "global_score",

    "eligibility",

    "cohort_definition",
    "cohort_distribution",
    "relative_evaluation",

    "behavioral_signals",
    "behavioral_calibration_score_vector",

    "source_published_at",
    "publication_age_ms",
    "temporal_confidence",

    "traces",
    "variable_lineage",
  ] as const);

/* ============================================================================
 * 8. CONTRACT OWNERSHIP MIGRATION
 * ----------------------------------------------------------------------------
 * Previous architecture:
 *
 * search-pipeline-contract.ts
 * -> SearchPrivateDocumentSnapshot owner
 *
 * search-private-snapshot-contract.ts
 * -> compatibility facade
 *
 * Search 2.1 canonical architecture:
 *
 * search-private-snapshot-contract.ts
 * -> unique canonical SearchPrivateDocumentSnapshot owner
 *
 * search-pipeline-contract.ts
 * -> type re-export only
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_CONTRACT_MIGRATION =
  Object.freeze({
    migration_required:
      true,

    migration_kind:
      "RESTORE_CANONICAL_PRIVATE_SNAPSHOT_OWNERSHIP",

    previous_owner:
      "search-pipeline-contract",

    canonical_owner:
      XYVALA_SEARCH_PRIVATE_SNAPSHOT_CANONICAL_OWNER,

    pipeline_contract_role:
      "TYPE_RE_EXPORT_ONLY",

    compatibility_import_path_preserved:
      true,

    canonical_contract_version:
      XYVALA_SEARCH_PRIVATE_SNAPSHOT_CONTRACT_VERSION,

    reason:
      "enforce_single_SearchPrivateDocumentSnapshot_owner",

    preserved_truths:
      Object.freeze([
        "document_identity",
        "query_identity",
        "cohort_identity",
        "snapshot_identity",

        "acquisition_lineage",
        "source_published_at",

        "documentary_truth",
        "signal_truth",

        "published_at",
        "publication_age_ms",
        "temporal_confidence",

        "score_truth",
        "penalty_truth",
        "global_score_truth",

        "eligibility_truth",
        "cohort_truth",
        "relative_evaluation_truth",

        "private_decision_truth",

        "traceability_truth",
        "variable_lineage_truth",
      ] as const),

    prohibited_shortcuts:
      Object.freeze([
        "duplicate_snapshot_contract_owner",
        "parallel_snapshot_interface",
        "pipeline_snapshot_interface_redefinition",

        "local_score_vector_optionality_override",
        "local_relative_evaluation_override",

        "fetched_at_reconstruction",
        "source_published_at_reconstruction",
        "published_at_reconstruction",
        "publication_age_ms_reconstruction",

        "source_type_reconstruction",

        "snapshot_timestamp_substitution",
        "extraction_timestamp_substitution",

        "traceability_generation",
        "variable_lineage_generation",

        "silent_contract_change",
      ] as const),
  } as const);

/* ============================================================================
 * 9. TYPE-LEVEL ACQUISITION LINEAGE COMPLETENESS
 * ========================================================================== */

type SearchPrivateSnapshotRequiredAcquisitionReferenceField =
  | "source_uri"
  | "source_type"
  | "fetched_at"
  | "source_published_at"
  | "content_hash"
  | "acquisition_contract_version";

type SearchPrivateSnapshotMissingAcquisitionReferenceField =
  Exclude<
    SearchPrivateSnapshotRequiredAcquisitionReferenceField,
    keyof SearchPrivateSnapshotRawDocumentReference
  >;

type SearchPrivateSnapshotUnknownAcquisitionReferenceField =
  Exclude<
    keyof SearchPrivateSnapshotRawDocumentReference,
    SearchPrivateSnapshotRequiredAcquisitionReferenceField
  >;

export type SearchPrivateSnapshotAcquisitionReferenceIsComplete =
  SearchPrivateSnapshotMissingAcquisitionReferenceField extends never
    ? true
    : false;

export type SearchPrivateSnapshotAcquisitionReferenceHasNoUnknownField =
  SearchPrivateSnapshotUnknownAcquisitionReferenceField extends never
    ? true
    : false;

/* ============================================================================
 * 10. TYPE-LEVEL PRIVATE VISIBILITY ASSERTION
 * ========================================================================== */

export type SearchPrivateSnapshotVisibilityIsPrivate =
  SearchPrivateDocumentSnapshot[
    "visibility"
  ] extends "PRIVATE"
    ? true
    : false;

/* ============================================================================
 * 11. TYPE-LEVEL OWNERSHIP ASSERTIONS
 * ========================================================================== */

export type SearchPrivateSnapshotContractIsCanonicalOwner =
  true;

export type SearchPipelineContractOwnsIndependentSnapshotContract =
  false;

/* ============================================================================
 * 12. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_SNAPSHOT_CONTRACT_OWNERSHIP =
  Object.freeze({
    canonical_contract:
      "search-private-snapshot-contract",

    canonical_type:
      "SearchPrivateDocumentSnapshot",

    pipeline_contract_role:
      "TYPE_RE_EXPORT_ONLY",

    independent_pipeline_contract_definition:
      false,

    analytical_ownership:
      false,

    snapshot_metadata_ownership:
      true,

    snapshot_producer:
      "PRIVATE_SNAPSHOT",

    public_consumer_boundary:
      "TRANSFORMATION",

    traceability_nature:
      "CROSS_CUTTING",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",
  } as const);
