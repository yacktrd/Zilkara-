/* ============================================================================
 * FILE: lib/xyvala/search/governance/search-variable-lineage-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical Variable Lineage Registry
 *
 * ROLE
 * - govern critical Search variable identities
 * - declare canonical ownership and producer boundaries
 * - declare canonical source truth and contracts
 * - declare propagation paths and downstream consumers
 * - declare availability, validation and exposure semantics
 * - distinguish Truth / Reference / Transport / Aggregated Context /
 *   Projection / Metadata / Policy
 * - distinguish ACTIVE / PLANNED / DEPRECATED / RETIRED / INVALID lineage
 * - govern cross-cutting identities without forging SearchPipelineLayer owners
 * - preserve literal producer identities for downstream governance
 * - materialize canonical SearchVariableLineage metadata
 * - provide protocol-as-code validation for the registry
 *
 * CLASSIFICATION
 * - SEARCH GOVERNANCE
 * - VARIABLE LINEAGE REGISTRY
 * - OFFICIAL
 * - NORMATIVE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-IDENTITY-PRODUCING
 * - NON-MUTATING
 * - DETERMINISTIC
 *
 * GOVERNANCE PRINCIPLES
 * - one analytical reality = one canonical variable
 * - one canonical variable = one canonical owner
 * - one canonical owner = one canonical producer
 * - downstream reconstruction forbidden
 * - unavailable evidence never becomes zero
 * - unavailable evidence never becomes neutral
 * - Reference and Transport never transfer ownership
 * - public Projection never re-enters the private analytical chain
 * - Calibration does not alter the current analytical cycle
 * - PLANNED variables never participate in active runtime materialization
 * - DEPRECATED identities are compatibility references only
 * - cross-cutting identities remain governed even when the current pipeline
 *   lineage transport cannot represent their owner directly
 *
 * PROTOCOL
 * - Xyvala Search Protocol 3.0
 * - Search VLR OFFICIAL / NORMATIVE
 * - Search Pipeline Contract 2.1
 * - Contract Before Runtime
 * - First Divergence Rule
 * ========================================================================== */

import type {
  SearchContractVersion,
  SearchDataVisibility,
  SearchLineageStatus,
  SearchModuleVersion,
  SearchPipelineLayer,
  SearchSchemaVersion,
  SearchValidationState,
  SearchVariableCriticalityLevel,
  SearchVariableLineage,
  SearchVariableLineageCategory,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE / REGISTRY IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME =
  "xyvala-search-variable-lineage-registry" as const;

export const XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_VERSION:
  SearchModuleVersion =
    "2.3.0";

export const XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_CONTRACT_VERSION:
  SearchContractVersion =
    "2.1.0";

export const XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_SCHEMA_VERSION:
  SearchSchemaVersion =
    "2.1.0";

export const XYVALA_SEARCH_VARIABLE_LINEAGE_PROTOCOL_REFERENCE =
  "XYVALA_SEARCH_PROTOCOL_3.0__SEARCH_VLR_OFFICIAL" as const;

/* ============================================================================
 * 2. LOCAL GOVERNANCE SEMANTICS
 * ========================================================================== */

export type SearchLineageVariableFamily =
  | "score"
  | "state"
  | "probability"
  | "threshold"
  | "rate"
  | "count"
  | "ratio"
  | "delta"
  | "flag"
  | "reason"
  | "status"
  | "version"
  | "identifier"
  | "label"
  | "collection"
  | "duration"
  | "timestamp"
  | "text"
  | "object";

export type SearchLineageAvailabilitySemantics =
  | "REQUIRED"
  | "OPTIONAL_EVIDENCE"
  | "CONDITIONAL"
  | "COLLECTION"
  | "PLANNED_UNAVAILABLE";

export type SearchLineagePublicExposureRule =
  | "PRIVATE_ONLY"
  | "PUBLIC_DERIVATION_ONLY"
  | "PUBLIC_DIRECT";

/* ============================================================================
 * 3. PIPELINE VARIABLE REGISTRY ENTRY
 * ----------------------------------------------------------------------------
 * PURPOSE
 * - define the canonical governance descriptor for a Search pipeline variable
 * - preserve exact compile-time identity for governance-critical fields
 * - expose the complete stable registry-entry contract for inspection
 * - derive compatibility aliases without creating independent truth
 *
 * PROTOCOL
 * - Contract Before Runtime
 * - one analytical reality = one canonical variable
 * - one canonical variable = one canonical owner
 * - one canonical owner = one canonical producer
 * - producer identity is declared and never reconstructed downstream
 * - runtime producer version is not owned or guessed here
 * - optional governance metadata remains structurally inspectable
 *
 * TYPE BOUNDARY
 * ----------------------------------------------------------------------------
 * Registry declarations need both:
 *
 * 1. exact literal identities for fields used by ownership/version governance;
 * 2. the complete SearchVariableLineageRegistryEntry surface for generic
 *    governance inspection.
 *
 * We therefore preserve literal identity only for governance-critical fields
 * while exposing the complete stable registry contract.
 *
 * COMPATIBILITY ALIASES
 * ----------------------------------------------------------------------------
 * producer_layer
 * <- ownership_layer
 *
 * source_contract
 * <- contract_source
 *
 * authorized_consumers
 * <- downstream_consumers
 *
 * visibility
 * <- exposure_level
 *
 * These aliases are metadata compatibility only.
 * They never create additional truth or transfer ownership.
 * ========================================================================== */

export interface SearchVariableLineageRegistryEntry {
  readonly variable_name:
    string;

  readonly variable_family:
    SearchLineageVariableFamily;

  readonly ownership_layer:
    SearchPipelineLayer;

  readonly source_truth:
    string;

  readonly contract_source:
    string;

  readonly contract_field:
    string;

  readonly category:
    SearchVariableLineageCategory;

  readonly criticality_level:
    SearchVariableCriticalityLevel;

  readonly exposure_level:
    SearchDataVisibility;

  readonly propagation_path:
    readonly SearchPipelineLayer[];

  readonly upstream_dependencies:
    readonly string[];

  readonly downstream_consumers:
    readonly string[];

  readonly reconstruction_allowed:
    false;

  readonly public_exposure_allowed:
    boolean;

  readonly validation_required:
    true;

  readonly lineage_status:
    SearchLineageStatus;

  readonly protocol_reference:
    string;

  readonly producer_module:
    string;

  readonly validation_state:
    SearchValidationState;

  readonly data_type:
    string;

  readonly nullable:
    boolean;

  readonly availability_semantics:
    SearchLineageAvailabilitySemantics;

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

  readonly public_exposure_rule:
    SearchLineagePublicExposureRule;

  readonly snapshot_transport_required:
    boolean;

  /* --------------------------------------------------------------------------
   * Compatibility aliases.
   * Canonical truth remains in the fields above.
   * ----------------------------------------------------------------------- */

  readonly producer_layer:
    SearchPipelineLayer;

  readonly source_contract:
    string;

  readonly authorized_consumers:
    readonly string[];

  readonly visibility:
    SearchDataVisibility;
}

/* ============================================================================
 * 3.1 PIPELINE VARIABLE DECLARATION INPUT
 * ----------------------------------------------------------------------------
 * Derived governance fields cannot be supplied independently.
 *
 * This prevents:
 * - ownership alias divergence
 * - contract alias divergence
 * - consumer alias divergence
 * - visibility alias divergence
 * - reconstruction policy mutation
 * - validation policy mutation
 * - protocol-reference drift
 * - schema-version drift
 * ========================================================================== */

type SearchVariableLineageRegistryEntryInput =
  Omit<
    SearchVariableLineageRegistryEntry,
    | "reconstruction_allowed"
    | "validation_required"
    | "protocol_reference"
    | "schema_version"
    | "producer_layer"
    | "source_contract"
    | "authorized_consumers"
    | "visibility"
  >;

/* ============================================================================
 * 3.2 GOVERNANCE-CRITICAL LITERAL IDENTITY
 * ----------------------------------------------------------------------------
 * Only identities required for canonical ownership/version governance remain
 * literal across registry declaration.
 *
 * Other metadata is intentionally inspected through the stable interface.
 * ========================================================================== */

type SearchPipelineVariableLiteralIdentityKeys =
  | "variable_name"
  | "ownership_layer"
  | "lineage_status"
  | "producer_module"
  | "snapshot_transport_required";

type SearchDefinedPipelineVariable<
  TInput extends
    SearchVariableLineageRegistryEntryInput,
> =
  Readonly<
    SearchVariableLineageRegistryEntry &
    Pick<
      TInput,
      SearchPipelineVariableLiteralIdentityKeys
    >
  >;

/* ============================================================================
 * 3.3 CANONICAL PIPELINE VARIABLE DEFINITION
 * ----------------------------------------------------------------------------
 * GOVERNANCE-ONLY MATERIALIZATION
 *
 * This function:
 * - preserves canonical declaration semantics
 * - freezes governance collections
 * - derives compatibility aliases
 * - injects protocol invariants
 * - preserves exact critical literal identities
 *
 * It does NOT:
 * - execute a Search producer
 * - calculate analytical truth
 * - resolve producer module versions
 * - generate identities
 * - infer availability
 * - perform calibration
 * - read a clock
 * - reconstruct downstream truth
 * ========================================================================== */

function defineSearchPipelineVariable<
  const TInput extends
    SearchVariableLineageRegistryEntryInput,
>(
  input:
    TInput,
): SearchDefinedPipelineVariable<TInput> {
  const propagationPath:
    readonly SearchPipelineLayer[] =
      Object.freeze([
        ...input.propagation_path,
      ]);

  const upstreamDependencies:
    readonly string[] =
      Object.freeze([
        ...input.upstream_dependencies,
      ]);

  const downstreamConsumers:
    readonly string[] =
      Object.freeze([
        ...input.downstream_consumers,
      ]);

  const allowedValues:
    readonly string[] | undefined =
      input.allowed_values === undefined
        ? undefined
        : Object.freeze([
            ...input.allowed_values,
          ]);

  /*
   * Stable governance inspection surface.
   *
   * Optional registry metadata therefore remains available even when the
   * complete registry is represented as a union of exact declarations.
   */
  const canonicalEntry:
    SearchVariableLineageRegistryEntry = {
    ...input,

    propagation_path:
      propagationPath,

    upstream_dependencies:
      upstreamDependencies,

    downstream_consumers:
      downstreamConsumers,

    ...(allowedValues === undefined
      ? {}
      : {
          allowed_values:
            allowedValues,
        }),

    reconstruction_allowed:
      false,

    validation_required:
      true,

    protocol_reference:
      XYVALA_SEARCH_VARIABLE_LINEAGE_PROTOCOL_REFERENCE,

    schema_version:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_SCHEMA_VERSION,

    producer_layer:
      input.ownership_layer,

    source_contract:
      input.contract_source,

    authorized_consumers:
      downstreamConsumers,

    visibility:
      input.exposure_level,
  };

  /*
   * Restore only governance-critical exact identities after crossing the
   * stable interface boundary.
   *
   * No semantic value is changed.
   */
  return Object.freeze({
    ...canonicalEntry,

    variable_name:
      input.variable_name,

    ownership_layer:
      input.ownership_layer,

    lineage_status:
      input.lineage_status,

    producer_module:
      input.producer_module,

    snapshot_transport_required:
      input.snapshot_transport_required,
  });
}

/* ============================================================================
 * 4. CROSS-CUTTING IDENTITY GOVERNANCE
 * ----------------------------------------------------------------------------
 * PURPOSE
 * - govern Search identities whose canonical owner is not a SearchPipelineLayer
 * - preserve exact non-pipeline ownership without fabricating pipeline ownership
 * - keep these identities inside the Search VLR
 * - prevent false SearchVariableLineage materialization
 *
 * PROTOCOL
 * - ownership precedes transport
 * - transport never transfers ownership
 * - metadata does not become analytical truth
 * - non-pipeline ownership must never be rewritten as a pipeline layer
 * - cross-cutting identities remain governed even when the current runtime
 *   lineage transport cannot represent their owner
 *
 * TYPE BOUNDARY
 * ----------------------------------------------------------------------------
 * As with pipeline variables:
 *
 * - canonical identity fields remain exact literals;
 * - governance inspection uses the complete stable interface.
 *
 * This prevents narrow-union property disappearance while preserving exact
 * owner/module identity.
 * ========================================================================== */

export type SearchCrossCuttingVariableOwner =
  | "TEMPORAL_DOCUMENT_SERIES_IDENTITY"
  | "QUERY_IDENTITY"
  | "COHORT_IDENTITY"
  | "DISTRIBUTION_IDENTITY"
  | "COHORT_BATCH_ASSEMBLY"
  | "SNAPSHOT_IDENTITY"
  | "EXECUTION_TRACEABILITY";

export type SearchCrossCuttingPropagationBoundary =
  | SearchPipelineLayer
  | SearchCrossCuttingVariableOwner;

export interface SearchCrossCuttingVariableLineageRegistryEntry {
  readonly variable_name:
    string;

  readonly variable_family:
    SearchLineageVariableFamily;

  readonly owner:
    SearchCrossCuttingVariableOwner;

  readonly owner_module:
    string;

  readonly source_truth:
    string;

  readonly contract_source:
    string;

  readonly contract_field:
    string;

  readonly category:
    SearchVariableLineageCategory;

  readonly criticality_level:
    SearchVariableCriticalityLevel;

  readonly exposure_level:
    SearchDataVisibility;

  readonly propagation_path:
    readonly SearchCrossCuttingPropagationBoundary[];

  readonly upstream_dependencies:
    readonly string[];

  readonly downstream_consumers:
    readonly string[];

  readonly reconstruction_allowed:
    false;

  readonly public_exposure_allowed:
    boolean;

  readonly validation_required:
    true;

  readonly lineage_status:
    SearchLineageStatus;

  readonly protocol_reference:
    string;

  readonly validation_state:
    SearchValidationState;

  readonly data_type:
    string;

  readonly nullable:
    boolean;

  readonly availability_semantics:
    SearchLineageAvailabilitySemantics;

  readonly schema_version:
    SearchSchemaVersion;

  readonly introduced_in_version:
    SearchContractVersion;

  readonly public_exposure_rule:
    SearchLineagePublicExposureRule;

  readonly pipeline_lineage_exclusion_reason:
    string;

  /* --------------------------------------------------------------------------
   * Compatibility aliases.
   * ----------------------------------------------------------------------- */

  readonly source_contract:
    string;

  readonly authorized_consumers:
    readonly string[];

  readonly visibility:
    SearchDataVisibility;
}

/* ============================================================================
 * 4.1 CROSS-CUTTING DECLARATION INPUT
 * ========================================================================== */

type SearchCrossCuttingVariableLineageRegistryEntryInput =
  Omit<
    SearchCrossCuttingVariableLineageRegistryEntry,
    | "reconstruction_allowed"
    | "validation_required"
    | "protocol_reference"
    | "schema_version"
    | "source_contract"
    | "authorized_consumers"
    | "visibility"
  >;

/* ============================================================================
 * 4.2 GOVERNANCE-CRITICAL CROSS-CUTTING LITERAL IDENTITY
 * ========================================================================== */

type SearchCrossCuttingVariableLiteralIdentityKeys =
  | "variable_name"
  | "owner"
  | "owner_module"
  | "lineage_status";

type SearchDefinedCrossCuttingVariable<
  TInput extends
    SearchCrossCuttingVariableLineageRegistryEntryInput,
> =
  Readonly<
    SearchCrossCuttingVariableLineageRegistryEntry &
    Pick<
      TInput,
      SearchCrossCuttingVariableLiteralIdentityKeys
    >
  >;

/* ============================================================================
 * 4.3 CANONICAL CROSS-CUTTING VARIABLE DEFINITION
 * ----------------------------------------------------------------------------
 * Governance metadata only.
 *
 * No analytical truth, identity value, trace identity or producer version is
 * generated here.
 * ========================================================================== */

function defineSearchCrossCuttingVariable<
  const TInput extends
    SearchCrossCuttingVariableLineageRegistryEntryInput,
>(
  input:
    TInput,
): SearchDefinedCrossCuttingVariable<TInput> {
  const propagationPath:
    readonly SearchCrossCuttingPropagationBoundary[] =
      Object.freeze([
        ...input.propagation_path,
      ]);

  const upstreamDependencies:
    readonly string[] =
      Object.freeze([
        ...input.upstream_dependencies,
      ]);

  const downstreamConsumers:
    readonly string[] =
      Object.freeze([
        ...input.downstream_consumers,
      ]);

  const canonicalEntry:
    SearchCrossCuttingVariableLineageRegistryEntry = {
    ...input,

    propagation_path:
      propagationPath,

    upstream_dependencies:
      upstreamDependencies,

    downstream_consumers:
      downstreamConsumers,

    reconstruction_allowed:
      false,

    validation_required:
      true,

    protocol_reference:
      XYVALA_SEARCH_VARIABLE_LINEAGE_PROTOCOL_REFERENCE,

    schema_version:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_SCHEMA_VERSION,

    source_contract:
      input.contract_source,

    authorized_consumers:
      downstreamConsumers,

    visibility:
      input.exposure_level,
  };

  return Object.freeze({
    ...canonicalEntry,

    variable_name:
      input.variable_name,

    owner:
      input.owner,

    owner_module:
      input.owner_module,

    lineage_status:
      input.lineage_status,
  });
}
/* ============================================================================
 * 5. CANONICAL PIPELINE VARIABLE LINEAGE REGISTRY
 * ========================================================================== */

export const XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY =
  Object.freeze({
    /* =========================================================================
     * ACQUISITION
     * ====================================================================== */

    "search.acquisition.raw_content":
      defineSearchPipelineVariable({
        variable_name:
          "search.acquisition.raw_content",

        variable_family:
          "object",

        ownership_layer:
          "ACQUISITION",

        source_truth:
          "search.acquisition.raw_content",

        contract_source:
          "SearchRawDocument",

        contract_field:
          "SearchRawDocument.raw_content",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ACQUISITION",
            "EXTRACTION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "EXTRACTION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/acquisition/search-acquisition-core.ts",

        validation_state:
          "VALID",

        data_type:
          "string | Uint8Array",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.acquisition.source_uri":
      defineSearchPipelineVariable({
        variable_name:
          "search.acquisition.source_uri",

        variable_family:
          "identifier",

        ownership_layer:
          "ACQUISITION",

        source_truth:
          "search.acquisition.source_uri",

        contract_source:
          "SearchRawDocument",

        contract_field:
          "SearchRawDocument.source_uri",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "INTERNAL",

        propagation_path:
          [
            "ACQUISITION",
            "EXTRACTION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "EXTRACTION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/acquisition/search-acquisition-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchUri",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.acquisition.source_type":
      defineSearchPipelineVariable({
        variable_name:
          "search.acquisition.source_type",

        variable_family:
          "label",

        ownership_layer:
          "ACQUISITION",

        source_truth:
          "search.acquisition.source_type",

        contract_source:
          "SearchRawDocument",

        contract_field:
          "SearchRawDocument.source_type",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "INTERNAL",

        propagation_path:
          [
            "ACQUISITION",
            "EXTRACTION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "EXTRACTION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/acquisition/search-acquisition-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchSourceType",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.acquisition.mime_type":
      defineSearchPipelineVariable({
        variable_name:
          "search.acquisition.mime_type",

        variable_family:
          "label",

        ownership_layer:
          "ACQUISITION",

        source_truth:
          "search.acquisition.mime_type",

        contract_source:
          "SearchRawDocument",

        contract_field:
          "SearchRawDocument.mime_type",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ACQUISITION",
            "EXTRACTION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "EXTRACTION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/acquisition/search-acquisition-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchMimeType",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.acquisition.fetched_at":
      defineSearchPipelineVariable({
        variable_name:
          "search.acquisition.fetched_at",

        variable_family:
          "timestamp",

        ownership_layer:
          "ACQUISITION",

        source_truth:
          "search.acquisition.fetched_at",

        contract_source:
          "SearchRawDocument",

        contract_field:
          "SearchRawDocument.fetched_at",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "INTERNAL",

        propagation_path:
          [
            "ACQUISITION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/acquisition/search-acquisition-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchIsoTimestamp",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.acquisition.source_published_at":
      defineSearchPipelineVariable({
        variable_name:
          "search.acquisition.source_published_at",

        variable_family:
          "timestamp",

        ownership_layer:
          "ACQUISITION",

        source_truth:
          "search.acquisition.source_published_at",

        contract_source:
          "SearchRawDocument",

        contract_field:
          "SearchRawDocument.source_published_at",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "INTERNAL",

        propagation_path:
          [
            "ACQUISITION",
            "TEMPORAL_SIGNAL_DETECTION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/acquisition/search-acquisition-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchIsoTimestamp>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.acquisition.content_hash":
      defineSearchPipelineVariable({
        variable_name:
          "search.acquisition.content_hash",

        variable_family:
          "identifier",

        ownership_layer:
          "ACQUISITION",

        source_truth:
          "search.acquisition.content_hash",

        contract_source:
          "SearchRawDocument",

        contract_field:
          "SearchRawDocument.content_hash",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ACQUISITION",
            "EXTRACTION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.acquisition.raw_content",
          ],

        downstream_consumers:
          [
            "EXTRACTION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/acquisition/search-acquisition-core.ts",

        validation_state:
          "VALID",

        data_type:
          "string",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.acquisition.document_id":
      defineSearchPipelineVariable({
        variable_name:
          "search.acquisition.document_id",

        variable_family:
          "identifier",

        ownership_layer:
          "ACQUISITION",

        source_truth:
          "search.acquisition.document_id",

        contract_source:
          "SearchRawDocument",

        contract_field:
          "SearchRawDocument.document_id",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "INTERNAL",

        propagation_path:
          [
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
            "TRANSFORMATION",
            "PUBLIC_RANKING",
          ],

        upstream_dependencies:
          [
            "search.acquisition.source_uri",
            "search.acquisition.source_type",
            "search.acquisition.mime_type",
            "search.acquisition.content_hash",
          ],

        downstream_consumers:
          [
            "SEARCH_PRIVATE_PIPELINE",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
            "PUBLIC_RANKING",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/acquisition/search-acquisition-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchDocumentId",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * EXTRACTION
     * ====================================================================== */

    "search.extraction.extracted_text":
      defineSearchPipelineVariable({
        variable_name:
          "search.extraction.extracted_text",

        variable_family:
          "text",

        ownership_layer:
          "EXTRACTION",

        source_truth:
          "search.extraction.extracted_text",

        contract_source:
          "SearchExtractedDocument",

        contract_field:
          "SearchExtractedDocument.extracted_text",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "EXTRACTION",
            "SEGMENTATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.acquisition.raw_content",
          ],

        downstream_consumers:
          [
            "SEGMENTATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/extraction/search-extraction-core.ts",

        validation_state:
          "VALID",

        data_type:
          "string",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.extraction.detected_language":
      defineSearchPipelineVariable({
        variable_name:
          "search.extraction.detected_language",

        variable_family:
          "label",

        ownership_layer:
          "EXTRACTION",

        source_truth:
          "search.extraction.detected_language",

        contract_source:
          "SearchExtractedDocument",

        contract_field:
          "SearchExtractedDocument.detected_language",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "INTERNAL",

        propagation_path:
          [
            "EXTRACTION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [
            "search.extraction.extracted_text",
          ],

        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/extraction/search-extraction-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchLanguageCode>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * SEGMENTATION
     * ====================================================================== */

    "search.segmentation.sentences":
      defineSearchPipelineVariable({
        variable_name:
          "search.segmentation.sentences",

        variable_family:
          "collection",

        ownership_layer:
          "SEGMENTATION",

        source_truth:
          "search.segmentation.sentences",

        contract_source:
          "SearchSegmentedDocument",

        contract_field:
          "SearchSegmentedDocument.sentences",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "SEGMENTATION",
            "LEXICAL_ANALYSIS",
            "ANCHOR_SIGNAL_DETECTION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [
            "search.extraction.extracted_text",
          ],

        downstream_consumers:
          [
            "LEXICAL_ANALYSIS",
            "ANCHOR_SIGNAL_DETECTION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/segmentation/search-segmentation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchSentence[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.segmentation.sentence.text":
      defineSearchPipelineVariable({
        variable_name:
          "search.segmentation.sentence.text",

        variable_family:
          "text",

        ownership_layer:
          "SEGMENTATION",

        source_truth:
          "search.segmentation.sentence.text",

        contract_source:
          "SearchSentence",

        contract_field:
          "SearchSentence.text",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "SEGMENTATION",
            "ANCHOR_SIGNAL_DETECTION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [
            "search.extraction.extracted_text",
          ],

        downstream_consumers:
          [
            "ANCHOR_SIGNAL_DETECTION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/segmentation/search-segmentation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "string",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * LEXICAL ANALYSIS
     * ====================================================================== */

    "search.lexical.term_statistics":
      defineSearchPipelineVariable({
        variable_name:
          "search.lexical.term_statistics",

        variable_family:
          "collection",

        ownership_layer:
          "LEXICAL_ANALYSIS",

        source_truth:
          "search.lexical.term_statistics",

        contract_source:
          "SearchLexicalDocument",

        contract_field:
          "SearchLexicalDocument.term_statistics",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LEXICAL_ANALYSIS",
            "FREQUENCY_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.segmentation.sentences",
          ],

        downstream_consumers:
          [
            "FREQUENCY_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/lexical/search-lexical-analysis-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchTermStatistics[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.lexical.term_occurrences":
      defineSearchPipelineVariable({
        variable_name:
          "search.lexical.term_occurrences",

        variable_family:
          "collection",

        ownership_layer:
          "LEXICAL_ANALYSIS",

        source_truth:
          "search.lexical.term_occurrences",

        contract_source:
          "SearchLexicalDocument",

        contract_field:
          "SearchLexicalDocument.term_occurrences",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LEXICAL_ANALYSIS",
            "FREQUENCY_SIGNAL_DETECTION",
            "ANCHOR_SIGNAL_DETECTION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.segmentation.sentences",
          ],

        downstream_consumers:
          [
            "FREQUENCY_SIGNAL_DETECTION",
            "ANCHOR_SIGNAL_DETECTION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/lexical/search-lexical-analysis-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchTermOccurrence[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.lexical.term.normalized_term":
      defineSearchPipelineVariable({
        variable_name:
          "search.lexical.term.normalized_term",

        variable_family:
          "label",

        ownership_layer:
          "LEXICAL_ANALYSIS",

        source_truth:
          "search.lexical.term.normalized_term",

        contract_source:
          "SearchTermStatistics",

        contract_field:
          "SearchTermStatistics.normalized_term",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LEXICAL_ANALYSIS",
            "FREQUENCY_SIGNAL_DETECTION",
            "ANCHOR_SIGNAL_DETECTION",
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.segmentation.sentences",
          ],

        downstream_consumers:
          [
            "FREQUENCY_SIGNAL_DETECTION",
            "ANCHOR_SIGNAL_DETECTION",
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/lexical/search-lexical-analysis-core.ts",

        validation_state:
          "VALID",

        data_type:
          "string",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * FREQUENCY / RARITY
     * ====================================================================== */

    "search.frequency.frequent_terms":
      defineSearchPipelineVariable({
        variable_name:
          "search.frequency.frequent_terms",

        variable_family:
          "collection",

        ownership_layer:
          "FREQUENCY_SIGNAL_DETECTION",

        source_truth:
          "search.frequency.frequent_terms",

        contract_source:
          "SearchFrequencySignals",

        contract_field:
          "SearchFrequencySignals.frequent_terms",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "FREQUENCY_SIGNAL_DETECTION",
            "ANCHOR_SIGNAL_DETECTION",
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.lexical.term_statistics",
            "search.lexical.term_occurrences",
          ],

        downstream_consumers:
          [
            "ANCHOR_SIGNAL_DETECTION",
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-frequency-signals-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchFrequencyTermSignal[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.frequency.rare_terms":
      defineSearchPipelineVariable({
        variable_name:
          "search.frequency.rare_terms",

        variable_family:
          "collection",

        ownership_layer:
          "FREQUENCY_SIGNAL_DETECTION",

        source_truth:
          "search.frequency.rare_terms",

        contract_source:
          "SearchFrequencySignals",

        contract_field:
          "SearchFrequencySignals.rare_terms",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "FREQUENCY_SIGNAL_DETECTION",
            "ANCHOR_SIGNAL_DETECTION",
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.lexical.term_statistics",
            "search.lexical.term_occurrences",
          ],

        downstream_consumers:
          [
            "ANCHOR_SIGNAL_DETECTION",
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-frequency-signals-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchFrequencyTermSignal[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * ANCHOR SIGNALS
     * ====================================================================== */

    "search.anchor.anchors":
      defineSearchPipelineVariable({
        variable_name:
          "search.anchor.anchors",

        variable_family:
          "collection",

        ownership_layer:
          "ANCHOR_SIGNAL_DETECTION",

        source_truth:
          "search.anchor.anchors",

        contract_source:
          "SearchAnchorSignals",

        contract_field:
          "SearchAnchorSignals.anchors",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ANCHOR_SIGNAL_DETECTION",
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.segmentation.sentences",
            "search.frequency.frequent_terms",
            "search.frequency.rare_terms",
          ],

        downstream_consumers:
          [
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-anchor-signals-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchAnchorSignal[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.anchor.local_convergence_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.anchor.local_convergence_score",

        variable_family:
          "score",

        ownership_layer:
          "ANCHOR_SIGNAL_DETECTION",

        source_truth:
          "search.anchor.local_convergence_score",

        contract_source:
          "SearchAnchorSignal",

        contract_field:
          "SearchAnchorSignal.local_convergence_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ANCHOR_SIGNAL_DETECTION",
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.frequency.frequent_terms",
            "search.frequency.rare_terms",
          ],

        downstream_consumers:
          [
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-anchor-signals-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * CONTEXT AGGREGATION — ACTIVE
     * ====================================================================== */

    "search.context.anchor_sentence_coverage_ratio":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.anchor_sentence_coverage_ratio",

        variable_family:
          "ratio",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.anchor_sentence_coverage_ratio",

        contract_source:
          "SearchContextAggregation",

        contract_field:
          "SearchContextAggregation.anchor_sentence_coverage_ratio",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-context-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchRatio",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.context.mean_local_convergence_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.mean_local_convergence_score",

        variable_family:
          "score",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.mean_local_convergence_score",

        contract_source:
          "SearchContextAggregation",

        contract_field:
          "SearchContextAggregation.mean_local_convergence_score",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
            "search.anchor.local_convergence_score",
          ],

        downstream_consumers:
          [
            "INTRINSIC_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-context-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.context.anchor_dispersion_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.anchor_dispersion_score",

        variable_family:
          "score",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.anchor_dispersion_score",

        contract_source:
          "SearchContextAggregation",

        contract_field:
          "SearchContextAggregation.anchor_dispersion_score",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [
            "INTRINSIC_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-context-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.context.anchor_concentration_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.anchor_concentration_score",

        variable_family:
          "score",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.anchor_concentration_score",

        contract_source:
          "SearchContextAggregation",

        contract_field:
          "SearchContextAggregation.anchor_concentration_score",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
            "INTRINSIC_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [
            "INTRINSIC_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-context-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * FUTURE INTRINSIC CONTEXT TRUTH — PLANNED
     * ====================================================================== */

    "search.context.dominant_contexts":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.dominant_contexts",

        variable_family:
          "collection",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.dominant_contexts",

        contract_source:
          "PLANNED_SEARCH_CONTEXT_CONTRACT",

        contract_field:
          "dominant_contexts",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_CONTEXT_AGGREGATION_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "readonly unknown[]",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.context.secondary_contexts":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.secondary_contexts",

        variable_family:
          "collection",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.secondary_contexts",

        contract_source:
          "PLANNED_SEARCH_CONTEXT_CONTRACT",

        contract_field:
          "secondary_contexts",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_CONTEXT_AGGREGATION_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "readonly unknown[]",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.context.context_evidence":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.context_evidence",

        variable_family:
          "collection",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.context_evidence",

        contract_source:
          "PLANNED_SEARCH_CONTEXT_CONTRACT",

        contract_field:
          "context_evidence",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_CONTEXT_AGGREGATION_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "readonly unknown[]",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.context.context_coherence":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.context_coherence",

        variable_family:
          "score",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.context_coherence",

        contract_source:
          "PLANNED_SEARCH_CONTEXT_CONTRACT",

        contract_field:
          "context_coherence",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_CONTEXT_AGGREGATION_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.context.context_ambiguity":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.context_ambiguity",

        variable_family:
          "score",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.context_ambiguity",

        contract_source:
          "PLANNED_SEARCH_CONTEXT_CONTRACT",

        contract_field:
          "context_ambiguity",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_CONTEXT_AGGREGATION_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.context.entity_contexts":
      defineSearchPipelineVariable({
        variable_name:
          "search.context.entity_contexts",

        variable_family:
          "collection",

        ownership_layer:
          "CONTEXT_AGGREGATION",

        source_truth:
          "search.context.entity_contexts",

        contract_source:
          "PLANNED_SEARCH_CONTEXT_CONTRACT",

        contract_field:
          "entity_contexts",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "AGGREGATED_CONTEXT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "CONTEXT_AGGREGATION",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_CONTEXT_AGGREGATION_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "readonly unknown[]",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    /* =========================================================================
     * LINK SIGNALS
     * ====================================================================== */

    "search.link.inbound_link_count":
      defineSearchPipelineVariable({
        variable_name:
          "search.link.inbound_link_count",

        variable_family:
          "count",

        ownership_layer:
          "LINK_SIGNAL_DETECTION",

        source_truth:
          "search.link.inbound_link_count",

        contract_source:
          "SearchLinkSignals",

        contract_field:
          "SearchLinkSignals.inbound_link_count",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LINK_SIGNAL_DETECTION",
            "LINK_AUTHORITY_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "LINK_AUTHORITY_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-link-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchCount>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.link.unique_source_domain_count":
      defineSearchPipelineVariable({
        variable_name:
          "search.link.unique_source_domain_count",

        variable_family:
          "count",

        ownership_layer:
          "LINK_SIGNAL_DETECTION",

        source_truth:
          "search.link.unique_source_domain_count",

        contract_source:
          "SearchLinkSignals",

        contract_field:
          "SearchLinkSignals.unique_source_domain_count",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LINK_SIGNAL_DETECTION",
            "LINK_AUTHORITY_SCORING",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "LINK_AUTHORITY_SCORING",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-link-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchCount>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.link.source_diversity_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.link.source_diversity_score",

        variable_family:
          "score",

        ownership_layer:
          "LINK_SIGNAL_DETECTION",

        source_truth:
          "search.link.source_diversity_score",

        contract_source:
          "SearchLinkSignals",

        contract_field:
          "SearchLinkSignals.source_diversity_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LINK_SIGNAL_DETECTION",
            "LINK_AUTHORITY_SCORING",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "LINK_AUTHORITY_SCORING",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-link-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchNormalizedScore>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.link.anchor_text_convergence_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.link.anchor_text_convergence_score",

        variable_family:
          "score",

        ownership_layer:
          "LINK_SIGNAL_DETECTION",

        source_truth:
          "search.link.anchor_text_convergence_score",

        contract_source:
          "SearchLinkSignals",

        contract_field:
          "SearchLinkSignals.anchor_text_convergence_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LINK_SIGNAL_DETECTION",
            "LINK_AUTHORITY_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "LINK_AUTHORITY_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-link-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchNormalizedScore>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.link.reciprocal_link_ratio":
      defineSearchPipelineVariable({
        variable_name:
          "search.link.reciprocal_link_ratio",

        variable_family:
          "ratio",

        ownership_layer:
          "LINK_SIGNAL_DETECTION",

        source_truth:
          "search.link.reciprocal_link_ratio",

        contract_source:
          "SearchLinkSignals",

        contract_field:
          "SearchLinkSignals.reciprocal_link_ratio",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LINK_SIGNAL_DETECTION",
            "LINK_AUTHORITY_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "LINK_AUTHORITY_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-link-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchRatio>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.link.suspected_link_cluster_ratio":
      defineSearchPipelineVariable({
        variable_name:
          "search.link.suspected_link_cluster_ratio",

        variable_family:
          "ratio",

        ownership_layer:
          "LINK_SIGNAL_DETECTION",

        source_truth:
          "search.link.suspected_link_cluster_ratio",

        contract_source:
          "SearchLinkSignals",

        contract_field:
          "SearchLinkSignals.suspected_link_cluster_ratio",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LINK_SIGNAL_DETECTION",
            "LINK_AUTHORITY_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "LINK_AUTHORITY_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-link-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchRatio>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.link.link_signal_confidence":
      defineSearchPipelineVariable({
        variable_name:
          "search.link.link_signal_confidence",

        variable_family:
          "score",

        ownership_layer:
          "LINK_SIGNAL_DETECTION",

        source_truth:
          "search.link.link_signal_confidence",

        contract_source:
          "SearchLinkSignals",

        contract_field:
          "SearchLinkSignals.link_signal_confidence",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LINK_SIGNAL_DETECTION",
            "LINK_AUTHORITY_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.link.inbound_link_count",
            "search.link.unique_source_domain_count",
            "search.link.source_diversity_score",
          ],

        downstream_consumers:
          [
            "LINK_AUTHORITY_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-link-signals-search-core.ts",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchOptionalEvidence<SearchConfidenceScore>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "2.1.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * TEMPORAL SIGNALS
     * ====================================================================== */

    /*
     * Canonical publication truth belongs to Acquisition.
     *
     * SearchTemporalSignals.published_at transports that truth unchanged.
     * Reference does not transfer ownership.
     */
    "search.temporal.published_at":
      defineSearchPipelineVariable({
        variable_name:
          "search.temporal.published_at",

        variable_family:
          "timestamp",

        ownership_layer:
          "ACQUISITION",

        source_truth:
          "search.acquisition.source_published_at",

        contract_source:
          "SearchTemporalSignals",

        contract_field:
          "SearchTemporalSignals.published_at",

        category:
          "REFERENCE",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "INTERNAL",

        propagation_path:
          [
            "ACQUISITION",
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [
            "search.acquisition.source_published_at",
          ],

        downstream_consumers:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/acquisition/search-acquisition-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchIsoTimestamp>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "2.1.0",

        reference_target:
          "search.acquisition.source_published_at",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.temporal.publication_age_ms":
      defineSearchPipelineVariable({
        variable_name:
          "search.temporal.publication_age_ms",

        variable_family:
          "duration",

        ownership_layer:
          "TEMPORAL_SIGNAL_DETECTION",

        source_truth:
          "search.temporal.publication_age_ms",

        contract_source:
          "SearchTemporalSignals",

        contract_field:
          "SearchTemporalSignals.publication_age_ms",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.document_series_id",
            "search.temporal.published_at",
          ],

        downstream_consumers:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/temporal/search-temporal-signals-search-core.ts",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchOptionalEvidence<SearchDurationMilliseconds>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "2.1.0",

        unit:
          "ms",

        minimum_value:
          0,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.temporal.temporal_state":
      defineSearchPipelineVariable({
        variable_name:
          "search.temporal.temporal_state",

        variable_family:
          "state",

        ownership_layer:
          "TEMPORAL_SIGNAL_DETECTION",

        source_truth:
          "search.temporal.temporal_state",

        contract_source:
          "SearchTemporalSignals",

        contract_field:
          "SearchTemporalSignals.temporal_state",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.published_at",
          ],

        downstream_consumers:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/temporal/search-temporal-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "\"CALIBRATED\" | \"INSUFFICIENT_HISTORY\" | \"UNAVAILABLE\"",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        allowed_values:
          [
            "CALIBRATED",
            "INSUFFICIENT_HISTORY",
            "UNAVAILABLE",
          ],

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.temporal.observation_count":
      defineSearchPipelineVariable({
        variable_name:
          "search.temporal.observation_count",

        variable_family:
          "count",

        ownership_layer:
          "TEMPORAL_SIGNAL_DETECTION",

        source_truth:
          "search.temporal.observation_count",

        contract_source:
          "SearchTemporalSignals",

        contract_field:
          "SearchTemporalSignals.observation_count",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.document_series_id",],

        downstream_consumers:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/temporal/search-temporal-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchCount",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.temporal.signal_persistence_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.temporal.signal_persistence_score",

        variable_family:
          "score",

        ownership_layer:
          "TEMPORAL_SIGNAL_DETECTION",

        source_truth:
          "search.temporal.signal_persistence_score",

        contract_source:
          "SearchTemporalSignals",

        contract_field:
          "SearchTemporalSignals.signal_persistence_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.document_series_id",
            "search.temporal.observation_count",
          ],

        downstream_consumers:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/temporal/search-temporal-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchNormalizedScore>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.temporal.anchor_persistence_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.temporal.anchor_persistence_score",

        variable_family:
          "score",

        ownership_layer:
          "TEMPORAL_SIGNAL_DETECTION",

        source_truth:
          "search.temporal.anchor_persistence_score",

        contract_source:
          "SearchTemporalSignals",

        contract_field:
          "SearchTemporalSignals.anchor_persistence_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.document_series_id",
            "search.anchor.anchors",
            "search.temporal.observation_count",
          ],

        downstream_consumers:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/temporal/search-temporal-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchNormalizedScore>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.temporal.rupture_evolution_state":
      defineSearchPipelineVariable({
        variable_name:
          "search.temporal.rupture_evolution_state",

        variable_family:
          "state",

        ownership_layer:
          "TEMPORAL_SIGNAL_DETECTION",

        source_truth:
          "search.temporal.rupture_evolution_state",

        contract_source:
          "SearchTemporalSignals",

        contract_field:
          "SearchTemporalSignals.rupture_evolution_state",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.document_series_id",
            "search.temporal.observation_count",
          ],

        downstream_consumers:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/temporal/search-temporal-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchRuptureEvolutionState",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.temporal.rupture_events":
      defineSearchPipelineVariable({
        variable_name:
          "search.temporal.rupture_events",

        variable_family:
          "collection",

        ownership_layer:
          "TEMPORAL_SIGNAL_DETECTION",

        source_truth:
          "search.temporal.rupture_events",

        contract_source:
          "SearchTemporalSignals",

        contract_field:
          "SearchTemporalSignals.rupture_events",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.document_series_id",
            "search.temporal.observation_count",
          ],

        downstream_consumers:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/temporal/search-temporal-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchTemporalRuptureEvent[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.temporal.temporal_confidence":
      defineSearchPipelineVariable({
        variable_name:
          "search.temporal.temporal_confidence",

        variable_family:
          "score",

        ownership_layer:
          "TEMPORAL_SIGNAL_DETECTION",

        source_truth:
          "search.temporal.temporal_confidence",

        contract_source:
          "SearchTemporalSignals",

        contract_field:
          "SearchTemporalSignals.temporal_confidence",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_SIGNAL_DETECTION",
            "TEMPORAL_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.document_series_id",
            "search.temporal.observation_count",
            "search.temporal.published_at",
          ],

        downstream_consumers:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/temporal/search-temporal-signals-search-core.ts",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchOptionalEvidence<SearchConfidenceScore>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "2.1.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * BEHAVIORAL SIGNALS
     * ====================================================================== */

    "search.behavioral.behavioral_state":
      defineSearchPipelineVariable({
        variable_name:
          "search.behavioral.behavioral_state",

        variable_family:
          "state",

        ownership_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        source_truth:
          "search.behavioral.behavioral_state",

        contract_source:
          "SearchBehavioralSignals",

        contract_field:
          "SearchBehavioralSignals.behavioral_state",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchBehavioralState",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.behavioral.impressions":
      defineSearchPipelineVariable({
        variable_name:
          "search.behavioral.impressions",

        variable_family:
          "count",

        ownership_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        source_truth:
          "search.behavioral.impressions",

        contract_source:
          "SearchBehavioralSignals",

        contract_field:
          "SearchBehavioralSignals.impressions",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchCount>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.behavioral.clicks":
      defineSearchPipelineVariable({
        variable_name:
          "search.behavioral.clicks",

        variable_family:
          "count",

        ownership_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        source_truth:
          "search.behavioral.clicks",

        contract_source:
          "SearchBehavioralSignals",

        contract_field:
          "SearchBehavioralSignals.clicks",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchCount>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.behavioral.observed_ctr":
      defineSearchPipelineVariable({
        variable_name:
          "search.behavioral.observed_ctr",

        variable_family:
          "rate",

        ownership_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        source_truth:
          "search.behavioral.observed_ctr",

        contract_source:
          "SearchBehavioralSignals",

        contract_field:
          "SearchBehavioralSignals.observed_ctr",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.behavioral.impressions",
            "search.behavioral.clicks",
          ],

        downstream_consumers:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchRatio>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.behavioral.expected_ctr_at_position":
      defineSearchPipelineVariable({
        variable_name:
          "search.behavioral.expected_ctr_at_position",

        variable_family:
          "rate",

        ownership_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        source_truth:
          "search.behavioral.expected_ctr_at_position",

        contract_source:
          "SearchBehavioralSignals",

        contract_field:
          "SearchBehavioralSignals.expected_ctr_at_position",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchRatio>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.behavioral.position_adjusted_ctr":
      defineSearchPipelineVariable({
        variable_name:
          "search.behavioral.position_adjusted_ctr",

        variable_family:
          "rate",

        ownership_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        source_truth:
          "search.behavioral.position_adjusted_ctr",

        contract_source:
          "SearchBehavioralSignals",

        contract_field:
          "SearchBehavioralSignals.position_adjusted_ctr",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.behavioral.observed_ctr",
            "search.behavioral.expected_ctr_at_position",
          ],

        downstream_consumers:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchRatio>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.behavioral.dwell_time_ms":
      defineSearchPipelineVariable({
        variable_name:
          "search.behavioral.dwell_time_ms",

        variable_family:
          "duration",

        ownership_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        source_truth:
          "search.behavioral.dwell_time_ms",

        contract_source:
          "SearchBehavioralSignals",

        contract_field:
          "SearchBehavioralSignals.dwell_time_ms",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchDurationMilliseconds>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        unit:
          "ms",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.behavioral.return_to_results_rate":
      defineSearchPipelineVariable({
        variable_name:
          "search.behavioral.return_to_results_rate",

        variable_family:
          "rate",

        ownership_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        source_truth:
          "search.behavioral.return_to_results_rate",

        contract_source:
          "SearchBehavioralSignals",

        contract_field:
          "SearchBehavioralSignals.return_to_results_rate",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchRatio>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.behavioral.sample_confidence":
      defineSearchPipelineVariable({
        variable_name:
          "search.behavioral.sample_confidence",

        variable_family:
          "score",

        ownership_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        source_truth:
          "search.behavioral.sample_confidence",

        contract_source:
          "SearchBehavioralSignals",

        contract_field:
          "SearchBehavioralSignals.sample_confidence",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.behavioral.impressions",
          ],

        downstream_consumers:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchConfidenceScore>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * QUERY PROFILE
     * ====================================================================== */

    "search.query_profile.normalized_query":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_profile.normalized_query",

        variable_family:
          "text",

        ownership_layer:
          "QUERY_PROFILING",

        source_truth:
          "search.query_profile.normalized_query",

        contract_source:
          "SearchQueryProfile",

        contract_field:
          "SearchQueryProfile.normalized_query",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_PROFILING",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.query.query_id",
          ],

        downstream_consumers:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/query/search-query-analysis-core.ts",

        validation_state:
          "VALID",

        data_type:
          "string",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.query_profile.query_terms":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_profile.query_terms",

        variable_family:
          "collection",

        ownership_layer:
          "QUERY_PROFILING",

        source_truth:
          "search.query_profile.query_terms",

        contract_source:
          "SearchQueryProfile",

        contract_field:
          "SearchQueryProfile.query_terms",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_PROFILING",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.query_profile.normalized_query",
          ],

        downstream_consumers:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/query/search-query-analysis-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchQueryTerm[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.query_profile.query_intent":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_profile.query_intent",

        variable_family:
          "label",

        ownership_layer:
          "QUERY_PROFILING",

        source_truth:
          "search.query_profile.query_intent",

        contract_source:
          "SearchQueryProfile",

        contract_field:
          "SearchQueryProfile.query_intent",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_PROFILING",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.query_profile.normalized_query",
          ],

        downstream_consumers:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/query/search-query-analysis-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchQueryProfile[\"query_intent\"]",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* -------------------------------------------------------------------------
     * DEPRECATED QUERY PROFILE ALIASES
     * ---------------------------------------------------------------------- */

    "search.query.normalized_query":
      defineSearchPipelineVariable({
        variable_name:
          "search.query.normalized_query",

        variable_family:
          "text",

        ownership_layer:
          "QUERY_PROFILING",

        source_truth:
          "search.query_profile.normalized_query",

        contract_source:
          "SearchQueryProfile",

        contract_field:
          "SearchQueryProfile.normalized_query",

        category:
          "REFERENCE",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_PROFILING",
          ],

        upstream_dependencies:
          [
            "search.query_profile.normalized_query",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "DEPRECATED",

        producer_module:
          "lib/xyvala/search/query/search-query-analysis-core.ts",

        validation_state:
          "VALID",

        data_type:
          "string",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        reference_target:
          "search.query_profile.normalized_query",

        deprecated_in_version:
          "2.1.0",

        replacement_variable:
          "search.query_profile.normalized_query",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query.query_terms":
      defineSearchPipelineVariable({
        variable_name:
          "search.query.query_terms",

        variable_family:
          "collection",

        ownership_layer:
          "QUERY_PROFILING",

        source_truth:
          "search.query_profile.query_terms",

        contract_source:
          "SearchQueryProfile",

        contract_field:
          "SearchQueryProfile.query_terms",

        category:
          "REFERENCE",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_PROFILING",
          ],

        upstream_dependencies:
          [
            "search.query_profile.query_terms",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "DEPRECATED",

        producer_module:
          "lib/xyvala/search/query/search-query-analysis-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchQueryTerm[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        reference_target:
          "search.query_profile.query_terms",

        deprecated_in_version:
          "2.1.0",

        replacement_variable:
          "search.query_profile.query_terms",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query.query_intent":
      defineSearchPipelineVariable({
        variable_name:
          "search.query.query_intent",

        variable_family:
          "label",

        ownership_layer:
          "QUERY_PROFILING",

        source_truth:
          "search.query_profile.query_intent",

        contract_source:
          "SearchQueryProfile",

        contract_field:
          "SearchQueryProfile.query_intent",

        category:
          "REFERENCE",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_PROFILING",
          ],

        upstream_dependencies:
          [
            "search.query_profile.query_intent",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "DEPRECATED",

        producer_module:
          "lib/xyvala/search/query/search-query-analysis-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchQueryProfile[\"query_intent\"]",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        reference_target:
          "search.query_profile.query_intent",

        deprecated_in_version:
          "2.1.0",

        replacement_variable:
          "search.query_profile.query_intent",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    /* =========================================================================
     * QUERY-DOCUMENT SIGNALS
     * ====================================================================== */

    "search.query_document.exact_query_term_coverage_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.exact_query_term_coverage_score",

        variable_family:
          "score",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.exact_query_term_coverage_score",

        contract_source:
          "SearchQueryDocumentSignals",

        contract_field:
          "SearchQueryDocumentSignals.exact_query_term_coverage_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.query_profile.query_terms",
            "search.lexical.term_occurrences",
          ],

        downstream_consumers:
          [
            "QUERY_RELEVANCE_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/query/search-query-document-signals-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.query_document.normalized_query_term_coverage_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.normalized_query_term_coverage_score",

        variable_family:
          "score",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.normalized_query_term_coverage_score",

        contract_source:
          "SearchQueryDocumentSignals",

        contract_field:
          "SearchQueryDocumentSignals.normalized_query_term_coverage_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.query_profile.query_terms",
            "search.lexical.term.normalized_term",
          ],

        downstream_consumers:
          [
            "QUERY_RELEVANCE_SCORING",
            "PENALTY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/query/search-query-document-signals-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.query_document.query_anchor_signals":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.query_anchor_signals",

        variable_family:
          "collection",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.query_anchor_signals",

        contract_source:
          "SearchQueryDocumentSignals",

        contract_field:
          "SearchQueryDocumentSignals.query_anchor_signals",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [
            "search.query_profile.query_terms",
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [
            "QUERY_RELEVANCE_SCORING",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/query/search-query-document-signals-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchQueryAnchorSignal[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.query_document.query_anchor_coverage_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.query_anchor_coverage_score",

        variable_family:
          "score",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.query_anchor_coverage_score",

        contract_source:
          "SearchQueryDocumentSignals",

        contract_field:
          "SearchQueryDocumentSignals.query_anchor_coverage_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_anchor_signals",
          ],

        downstream_consumers:
          [
            "QUERY_RELEVANCE_SCORING",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/query/search-query-document-signals-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.query_document.query_concept_coverage_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.query_concept_coverage_score",

        variable_family:
          "score",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.query_concept_coverage_score",

        contract_source:
          "SearchQueryDocumentSignals",

        contract_field:
          "SearchQueryDocumentSignals.query_concept_coverage_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.query_profile.query_terms",
          ],

        downstream_consumers:
          [
            "QUERY_RELEVANCE_SCORING",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/query/search-query-document-signals-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchOptionalEvidence<SearchNormalizedScore>",

        nullable:
          false,

        availability_semantics:
          "OPTIONAL_EVIDENCE",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * QUERY CONTEXT / CONCORDANCE — PLANNED
     * ====================================================================== */

    "search.query_document.query_context_signal":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.query_context_signal",

        variable_family:
          "object",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.query_context_signal",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "query_context_signal",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_profile.query_terms",
            "search.context.dominant_contexts",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "unknown",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query_document.context_concordance_state":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.context_concordance_state",

        variable_family:
          "state",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.context_concordance_state",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "context_concordance_state",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_context_signal",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "\"CONCORDANT\" | \"PARTIAL\" | \"DISCORDANT\" | \"UNAVAILABLE\"",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        allowed_values:
          [
            "CONCORDANT",
            "PARTIAL",
            "DISCORDANT",
            "UNAVAILABLE",
          ],

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query_document.context_concordance_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.context_concordance_score",

        variable_family:
          "score",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.context_concordance_score",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "context_concordance_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_context_signal",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchOptionalEvidence<SearchNormalizedScore>",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query_document.matched_contexts":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.matched_contexts",

        variable_family:
          "collection",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.matched_contexts",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "matched_contexts",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_context_signal",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "readonly unknown[]",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query_document.conflicting_contexts":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.conflicting_contexts",

        variable_family:
          "collection",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.conflicting_contexts",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "conflicting_contexts",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_context_signal",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "readonly unknown[]",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query_document.context_evidence":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.context_evidence",

        variable_family:
          "collection",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.context_evidence",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "context_evidence",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_context_signal",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "readonly unknown[]",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query_document.context_confidence":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.context_confidence",

        variable_family:
          "score",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.context_confidence",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "context_confidence",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_context_signal",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchOptionalEvidence<SearchConfidenceScore>",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query_document.context_missing_data":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.context_missing_data",

        variable_family:
          "collection",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.context_missing_data",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "context_missing_data",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_context_signal",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "readonly string[]",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query_document.context_ambiguity_state":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.context_ambiguity_state",

        variable_family:
          "state",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.context_ambiguity_state",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "context_ambiguity_state",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_context_signal",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "unknown",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    "search.query_document.entity_concordance":
      defineSearchPipelineVariable({
        variable_name:
          "search.query_document.entity_concordance",

        variable_family:
          "object",

        ownership_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        source_truth:
          "search.query_document.entity_concordance",

        contract_source:
          "PLANNED_QUERY_CONTEXT_SIGNAL_CONTRACT",

        contract_field:
          "entity_concordance",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
          ],

        upstream_dependencies:
          [
            "search.query_document.query_context_signal",
          ],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "PLANNED_QUERY_CONTEXT_SIGNAL_PRODUCER",

        validation_state:
          "UNVALIDATED",

        data_type:
          "unknown",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    /* =========================================================================
     * CANONICAL SCORES
     * ====================================================================== */

    "search.score.lexical_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.lexical_score",

        variable_family:
          "score",

        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",

        source_truth:
          "search.score.lexical_score",

        contract_source:
          "SearchIntrinsicDocumentScoreVector",

        contract_field:
          "SearchIntrinsicDocumentScoreVector.lexical_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "INTRINSIC_DOCUMENT_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.lexical.term_statistics",
            "search.lexical.term_occurrences",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.anchor_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.anchor_score",

        variable_family:
          "score",

        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",

        source_truth:
          "search.score.anchor_score",

        contract_source:
          "SearchIntrinsicDocumentScoreVector",

        contract_field:
          "SearchIntrinsicDocumentScoreVector.anchor_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "INTRINSIC_DOCUMENT_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.anchor.anchors",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.occurrence_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.occurrence_score",

        variable_family:
          "score",

        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",

        source_truth:
          "search.score.occurrence_score",

        contract_source:
          "SearchIntrinsicDocumentScoreVector",

        contract_field:
          "SearchIntrinsicDocumentScoreVector.occurrence_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "INTRINSIC_DOCUMENT_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.lexical.term_occurrences",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.frequency_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.frequency_score",

        variable_family:
          "score",

        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",

        source_truth:
          "search.score.frequency_score",

        contract_source:
          "SearchIntrinsicDocumentScoreVector",

        contract_field:
          "SearchIntrinsicDocumentScoreVector.frequency_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "INTRINSIC_DOCUMENT_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.frequency.frequent_terms",
            "search.frequency.rare_terms",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.convergence_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.convergence_score",

        variable_family:
          "score",

        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",

        source_truth:
          "search.score.convergence_score",

        contract_source:
          "SearchIntrinsicDocumentScoreVector",

        contract_field:
          "SearchIntrinsicDocumentScoreVector.convergence_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "INTRINSIC_DOCUMENT_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.context.mean_local_convergence_score",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.document_quality_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.document_quality_score",

        variable_family:
          "score",

        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",

        source_truth:
          "search.score.document_quality_score",

        contract_source:
          "SearchIntrinsicDocumentScoreVector",

        contract_field:
          "SearchIntrinsicDocumentScoreVector.document_quality_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "INTRINSIC_DOCUMENT_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.lexical.term_statistics",
            "search.context.anchor_sentence_coverage_ratio",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.correlation_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.correlation_score",

        variable_family:
          "score",

        ownership_layer:
          "TEMPORAL_DOCUMENT_SCORING",

        source_truth:
          "search.score.correlation_score",

        contract_source:
          "SearchTemporalDocumentScoreVector",

        contract_field:
          "SearchTemporalDocumentScoreVector.correlation_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.temporal_state",
            "search.temporal.temporal_confidence",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-temporal-document-scoring-core.ts",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "CONDITIONAL",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.duration_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.duration_score",

        variable_family:
          "score",

        ownership_layer:
          "TEMPORAL_DOCUMENT_SCORING",

        source_truth:
          "search.score.duration_score",

        contract_source:
          "SearchTemporalDocumentScoreVector",

        contract_field:
          "SearchTemporalDocumentScoreVector.duration_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "TEMPORAL_DOCUMENT_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.temporal.signal_persistence_score",
            "search.temporal.anchor_persistence_score",
            "search.temporal.publication_age_ms",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-temporal-document-scoring-core.ts",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "CONDITIONAL",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.query_relevance_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.query_relevance_score",

        variable_family:
          "score",

        ownership_layer:
          "QUERY_RELEVANCE_SCORING",

        source_truth:
          "search.score.query_relevance_score",

        contract_source:
          "SearchQueryRelativeScoreVector",

        contract_field:
          "SearchQueryRelativeScoreVector.query_relevance_score",

        category:
          "TRUTH",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "QUERY_RELEVANCE_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [
            "search.query_profile.query_terms",
            "search.query_document.exact_query_term_coverage_score",
            "search.query_document.normalized_query_term_coverage_score",
            "search.query_document.query_anchor_coverage_score",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-query-relevance-scoring-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.link_authority_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.link_authority_score",

        variable_family:
          "score",

        ownership_layer:
          "LINK_AUTHORITY_SCORING",

        source_truth:
          "search.score.link_authority_score",

        contract_source:
          "SearchLinkAuthorityScoreVector",

        contract_field:
          "SearchLinkAuthorityScoreVector.link_authority_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "LINK_AUTHORITY_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.link.inbound_link_count",
            "search.link.unique_source_domain_count",
            "search.link.source_diversity_score",
            "search.link.link_signal_confidence",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-link-authority-scoring-core.ts",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "CONDITIONAL",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.score.behavioral_calibration_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.score.behavioral_calibration_score",

        variable_family:
          "score",

        ownership_layer:
          "BEHAVIORAL_CALIBRATION_SCORING",

        source_truth:
          "search.score.behavioral_calibration_score",

        contract_source:
          "SearchBehavioralCalibrationScoreVector",

        contract_field:
          "SearchBehavioralCalibrationScoreVector.behavioral_calibration_score",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "BEHAVIORAL_CALIBRATION_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.behavioral.behavioral_state",
            "search.behavioral.sample_confidence",
          ],

        downstream_consumers:
          [
            "POSITIVE_SCORE_ASSEMBLY",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-behavioral-calibration-scoring-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchSubScore",

        nullable:
          false,

        availability_semantics:
          "CONDITIONAL",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * DEPRECATED SCORE NAME COMPATIBILITY
     * ====================================================================== */

    "search.scoring.lexical_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.lexical_score",
        variable_family:
          "score",
        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",
        source_truth:
          "search.score.lexical_score",
        contract_source:
          "SearchIntrinsicDocumentScoreVector",
        contract_field:
          "SearchIntrinsicDocumentScoreVector.lexical_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["INTRINSIC_DOCUMENT_SCORING"],
        upstream_dependencies:
          ["search.score.lexical_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.lexical_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.lexical_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.anchor_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.anchor_score",
        variable_family:
          "score",
        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",
        source_truth:
          "search.score.anchor_score",
        contract_source:
          "SearchIntrinsicDocumentScoreVector",
        contract_field:
          "SearchIntrinsicDocumentScoreVector.anchor_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["INTRINSIC_DOCUMENT_SCORING"],
        upstream_dependencies:
          ["search.score.anchor_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.anchor_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.anchor_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.occurrence_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.occurrence_score",
        variable_family:
          "score",
        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",
        source_truth:
          "search.score.occurrence_score",
        contract_source:
          "SearchIntrinsicDocumentScoreVector",
        contract_field:
          "SearchIntrinsicDocumentScoreVector.occurrence_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["INTRINSIC_DOCUMENT_SCORING"],
        upstream_dependencies:
          ["search.score.occurrence_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.occurrence_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.occurrence_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.frequency_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.frequency_score",
        variable_family:
          "score",
        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",
        source_truth:
          "search.score.frequency_score",
        contract_source:
          "SearchIntrinsicDocumentScoreVector",
        contract_field:
          "SearchIntrinsicDocumentScoreVector.frequency_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["INTRINSIC_DOCUMENT_SCORING"],
        upstream_dependencies:
          ["search.score.frequency_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.frequency_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.frequency_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.convergence_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.convergence_score",
        variable_family:
          "score",
        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",
        source_truth:
          "search.score.convergence_score",
        contract_source:
          "SearchIntrinsicDocumentScoreVector",
        contract_field:
          "SearchIntrinsicDocumentScoreVector.convergence_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["INTRINSIC_DOCUMENT_SCORING"],
        upstream_dependencies:
          ["search.score.convergence_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.convergence_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.convergence_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.document_quality_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.document_quality_score",
        variable_family:
          "score",
        ownership_layer:
          "INTRINSIC_DOCUMENT_SCORING",
        source_truth:
          "search.score.document_quality_score",
        contract_source:
          "SearchIntrinsicDocumentScoreVector",
        contract_field:
          "SearchIntrinsicDocumentScoreVector.document_quality_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["INTRINSIC_DOCUMENT_SCORING"],
        upstream_dependencies:
          ["search.score.document_quality_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-document-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.document_quality_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.document_quality_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.correlation_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.correlation_score",
        variable_family:
          "score",
        ownership_layer:
          "TEMPORAL_DOCUMENT_SCORING",
        source_truth:
          "search.score.correlation_score",
        contract_source:
          "SearchTemporalDocumentScoreVector",
        contract_field:
          "SearchTemporalDocumentScoreVector.correlation_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["TEMPORAL_DOCUMENT_SCORING"],
        upstream_dependencies:
          ["search.score.correlation_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-temporal-document-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "CONDITIONAL",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.correlation_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.correlation_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.duration_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.duration_score",
        variable_family:
          "score",
        ownership_layer:
          "TEMPORAL_DOCUMENT_SCORING",
        source_truth:
          "search.score.duration_score",
        contract_source:
          "SearchTemporalDocumentScoreVector",
        contract_field:
          "SearchTemporalDocumentScoreVector.duration_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["TEMPORAL_DOCUMENT_SCORING"],
        upstream_dependencies:
          ["search.score.duration_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-temporal-document-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "CONDITIONAL",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.duration_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.duration_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.query_relevance_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.query_relevance_score",
        variable_family:
          "score",
        ownership_layer:
          "QUERY_RELEVANCE_SCORING",
        source_truth:
          "search.score.query_relevance_score",
        contract_source:
          "SearchQueryRelativeScoreVector",
        contract_field:
          "SearchQueryRelativeScoreVector.query_relevance_score",
        category:
          "REFERENCE",
        criticality_level:
          "CORE_TRUTH",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["QUERY_RELEVANCE_SCORING"],
        upstream_dependencies:
          ["search.score.query_relevance_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-query-relevance-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.query_relevance_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.query_relevance_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.link_authority_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.link_authority_score",
        variable_family:
          "score",
        ownership_layer:
          "LINK_AUTHORITY_SCORING",
        source_truth:
          "search.score.link_authority_score",
        contract_source:
          "SearchLinkAuthorityScoreVector",
        contract_field:
          "SearchLinkAuthorityScoreVector.link_authority_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["LINK_AUTHORITY_SCORING"],
        upstream_dependencies:
          ["search.score.link_authority_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-link-authority-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "CONDITIONAL",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.link_authority_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.link_authority_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.scoring.behavioral_calibration_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.scoring.behavioral_calibration_score",
        variable_family:
          "score",
        ownership_layer:
          "BEHAVIORAL_CALIBRATION_SCORING",
        source_truth:
          "search.score.behavioral_calibration_score",
        contract_source:
          "SearchBehavioralCalibrationScoreVector",
        contract_field:
          "SearchBehavioralCalibrationScoreVector.behavioral_calibration_score",
        category:
          "REFERENCE",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          ["BEHAVIORAL_CALIBRATION_SCORING"],
        upstream_dependencies:
          ["search.score.behavioral_calibration_score"],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/scoring/search-behavioral-calibration-scoring-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSubScore",
        nullable:
          false,
        availability_semantics:
          "CONDITIONAL",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.score.behavioral_calibration_score",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.score.behavioral_calibration_score",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    /* =========================================================================
     * PENALTY EVALUATION
     * ====================================================================== */

    "search.penalty.penalties":
      defineSearchPipelineVariable({
        variable_name:
          "search.penalty.penalties",

        variable_family:
          "collection",

        ownership_layer:
          "PENALTY_EVALUATION",

        source_truth:
          "search.penalty.penalties",

        contract_source:
          "SearchPenaltyVector",

        contract_field:
          "SearchPenaltyVector.penalties",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "PENALTY_EVALUATION",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-penalty-evaluation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchPenalty[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.penalty.blocking_constraints":
      defineSearchPipelineVariable({
        variable_name:
          "search.penalty.blocking_constraints",

        variable_family:
          "collection",

        ownership_layer:
          "PENALTY_EVALUATION",

        source_truth:
          "search.penalty.blocking_constraints",

        contract_source:
          "SearchPenaltyVector",

        contract_field:
          "SearchPenaltyVector.blocking_constraints",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "PENALTY_EVALUATION",
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-penalty-evaluation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchBlockingConstraint[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.penalty.total_penalty_value":
      defineSearchPipelineVariable({
        variable_name:
          "search.penalty.total_penalty_value",

        variable_family:
          "score",

        ownership_layer:
          "PENALTY_EVALUATION",

        source_truth:
          "search.penalty.total_penalty_value",

        contract_source:
          "SearchPenaltyVector",

        contract_field:
          "SearchPenaltyVector.total_penalty_value",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "PENALTY_EVALUATION",
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.penalty.penalties",
          ],

        downstream_consumers:
          [
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-penalty-evaluation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.penalty.critical_constraint_active":
      defineSearchPipelineVariable({
        variable_name:
          "search.penalty.critical_constraint_active",

        variable_family:
          "flag",

        ownership_layer:
          "PENALTY_EVALUATION",

        source_truth:
          "search.penalty.critical_constraint_active",

        contract_source:
          "SearchPenaltyVector",

        contract_field:
          "SearchPenaltyVector.critical_constraint_active",

        category:
          "TRUTH",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "PENALTY_EVALUATION",
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.penalty.blocking_constraints",
          ],

        downstream_consumers:
          [
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-penalty-evaluation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "boolean",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * ANALYTICAL AGGREGATION
     * ====================================================================== */

    "search.aggregation.positive_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.aggregation.positive_score",

        variable_family:
          "score",

        ownership_layer:
          "ANALYTICAL_AGGREGATION",

        source_truth:
          "search.aggregation.positive_score",

        contract_source:
          "SearchGlobalScore",

        contract_field:
          "SearchGlobalScore.positive_score",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.score.lexical_score",
            "search.score.anchor_score",
            "search.score.occurrence_score",
            "search.score.frequency_score",
            "search.score.convergence_score",
            "search.score.correlation_score",
            "search.score.duration_score",
            "search.score.query_relevance_score",
            "search.score.link_authority_score",
            "search.score.behavioral_calibration_score",
            "search.score.document_quality_score",
          ],

        downstream_consumers:
          [
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchRawScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    /*
     * SearchGlobalScore.penalty_value is a carried reference to the canonical
     * Penalty Evaluation truth.
     *
     * Analytical Aggregation consumes it but does not become a second owner.
     */
    "search.aggregation.penalty_value":
      defineSearchPipelineVariable({
        variable_name:
          "search.aggregation.penalty_value",

        variable_family:
          "score",

        ownership_layer:
          "PENALTY_EVALUATION",

        source_truth:
          "search.penalty.total_penalty_value",

        contract_source:
          "SearchGlobalScore",

        contract_field:
          "SearchGlobalScore.penalty_value",

        category:
          "REFERENCE",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "PENALTY_EVALUATION",
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.penalty.total_penalty_value",
          ],

        downstream_consumers:
          [
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/scoring/search-penalty-evaluation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchNormalizedScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "2.1.0",

        reference_target:
          "search.penalty.total_penalty_value",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.aggregation.final_raw_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.aggregation.final_raw_score",

        variable_family:
          "score",

        ownership_layer:
          "ANALYTICAL_AGGREGATION",

        source_truth:
          "search.aggregation.final_raw_score",

        contract_source:
          "SearchGlobalScore",

        contract_field:
          "SearchGlobalScore.final_raw_score",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.aggregation.positive_score",
            "search.aggregation.penalty_value",
          ],

        downstream_consumers:
          [
            "ELIGIBILITY_EVALUATION",
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchRawScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.aggregation.aggregate_confidence":
      defineSearchPipelineVariable({
        variable_name:
          "search.aggregation.aggregate_confidence",

        variable_family:
          "score",

        ownership_layer:
          "ANALYTICAL_AGGREGATION",

        source_truth:
          "search.aggregation.aggregate_confidence",

        contract_source:
          "SearchGlobalScore",

        contract_field:
          "SearchGlobalScore.aggregate_confidence",

        category:
          "AGGREGATED_CONTEXT",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.score.query_relevance_score",
            "search.score.link_authority_score",
            "search.score.behavioral_calibration_score",
          ],

        downstream_consumers:
          [
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchConfidenceScore",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        minimum_value:
          0,

        maximum_value:
          1,

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.aggregation.weights_used":
      defineSearchPipelineVariable({
        variable_name:
          "search.aggregation.weights_used",

        variable_family:
          "collection",

        ownership_layer:
          "ANALYTICAL_AGGREGATION",

        source_truth:
          "search.aggregation.weights_used",

        contract_source:
          "SearchGlobalScore",

        contract_field:
          "SearchGlobalScore.weights_used",

        category:
          "METADATA",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
            "EXECUTION_TRACEABILITY",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchAggregationWeight[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.aggregation.overlap_controls":
      defineSearchPipelineVariable({
        variable_name:
          "search.aggregation.overlap_controls",

        variable_family:
          "collection",

        ownership_layer:
          "ANALYTICAL_AGGREGATION",

        source_truth:
          "search.aggregation.overlap_controls",

        contract_source:
          "SearchGlobalScore",

        contract_field:
          "SearchGlobalScore.overlap_controls",

        category:
          "METADATA",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
            "EXECUTION_TRACEABILITY",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchOverlapControl[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.aggregation.score_contributions":
      defineSearchPipelineVariable({
        variable_name:
          "search.aggregation.score_contributions",

        variable_family:
          "collection",

        ownership_layer:
          "ANALYTICAL_AGGREGATION",

        source_truth:
          "search.aggregation.score_contributions",

        contract_source:
          "SearchGlobalScore",

        contract_field:
          "SearchGlobalScore.score_contributions",

        category:
          "METADATA",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ANALYTICAL_AGGREGATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
            "EXECUTION_TRACEABILITY",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchScoreContribution[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.aggregation.aggregation_result_id":
      defineSearchPipelineVariable({
        variable_name:
          "search.aggregation.aggregation_result_id",

        variable_family:
          "identifier",

        ownership_layer:
          "ANALYTICAL_AGGREGATION",

        source_truth:
          "search.aggregation.aggregation_result_id",

        contract_source:
          "SearchGlobalScore",

        contract_field:
          "SearchGlobalScore.aggregation_result_id",

        category:
          "METADATA",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ANALYTICAL_AGGREGATION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchAggregationResultId",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    /* =========================================================================
     * ELIGIBILITY
     * ====================================================================== */

    "search.eligibility.ranking_eligible":
      defineSearchPipelineVariable({
        variable_name:
          "search.eligibility.ranking_eligible",

        variable_family:
          "flag",

        ownership_layer:
          "ELIGIBILITY_EVALUATION",

        source_truth:
          "search.eligibility.ranking_eligible",

        contract_source:
          "SearchEligibilityResult",

        contract_field:
          "SearchEligibilityResult.ranking_eligible",

        category:
          "TRUTH",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ELIGIBILITY_EVALUATION",
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.aggregation.final_raw_score",
            "search.penalty.critical_constraint_active",
          ],

        downstream_consumers:
          [
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/eligibility/search-eligibility-evaluation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "boolean",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.eligibility.allow_eligible":
      defineSearchPipelineVariable({
        variable_name:
          "search.eligibility.allow_eligible",

        variable_family:
          "flag",

        ownership_layer:
          "ELIGIBILITY_EVALUATION",

        source_truth:
          "search.eligibility.allow_eligible",

        contract_source:
          "SearchEligibilityResult",

        contract_field:
          "SearchEligibilityResult.allow_eligible",

        category:
          "TRUTH",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.aggregation.final_raw_score",
            "search.aggregation.aggregate_confidence",
            "search.penalty.critical_constraint_active",
          ],

        downstream_consumers:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/eligibility/search-eligibility-evaluation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "boolean",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.eligibility.blocking_reasons":
      defineSearchPipelineVariable({
        variable_name:
          "search.eligibility.blocking_reasons",

        variable_family:
          "collection",

        ownership_layer:
          "ELIGIBILITY_EVALUATION",

        source_truth:
          "search.eligibility.blocking_reasons",

        contract_source:
          "SearchEligibilityResult",

        contract_field:
          "SearchEligibilityResult.blocking_reasons",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ELIGIBILITY_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.penalty.blocking_constraints",
          ],

        downstream_consumers:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/eligibility/search-eligibility-evaluation-core.ts",

        validation_state:
          "VALID",

        data_type:
          "readonly SearchEligibilityReason[]",

        nullable:
          false,

        availability_semantics:
          "COLLECTION",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.eligibility.eligibility_result_id":
      defineSearchPipelineVariable({
        variable_name:
          "search.eligibility.eligibility_result_id",

        variable_family:
          "identifier",

        ownership_layer:
          "ELIGIBILITY_EVALUATION",

        source_truth:
          "search.eligibility.eligibility_result_id",

        contract_source:
          "SearchEligibilityResult",

        contract_field:
          "SearchEligibilityResult.eligibility_result_id",

        category:
          "METADATA",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "ELIGIBILITY_EVALUATION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [],

        public_exposure_allowed:
          false,

        lineage_status:
          "PLANNED",

        producer_module:
          "lib/xyvala/search/eligibility/search-eligibility-evaluation-core.ts",

        validation_state:
          "UNVALIDATED",

        data_type:
          "SearchEligibilityResultId",

        nullable:
          false,

        availability_semantics:
          "PLANNED_UNAVAILABLE",

        introduced_in_version:
          "2.1.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          false,
      }),

    /* =========================================================================
     * COHORT DISTRIBUTION
     * ====================================================================== */

    "search.cohort_distribution.candidate_count":
      defineSearchPipelineVariable({
        variable_name:
          "search.cohort_distribution.candidate_count",

        variable_family:
          "count",

        ownership_layer:
          "COHORT_NORMALIZATION",

        source_truth:
          "search.cohort_distribution.candidate_count",

        contract_source:
          "SearchCohortDistribution",

        contract_field:
          "SearchCohortDistribution.candidate_count",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.cohort_batch.candidate_count",
          ],

        downstream_consumers:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/cohort/search-cohort-normalization-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchCount",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.cohort_distribution.minimum_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.cohort_distribution.minimum_score",
        variable_family:
          "score",
        ownership_layer:
          "COHORT_NORMALIZATION",
        source_truth:
          "search.cohort_distribution.minimum_score",
        contract_source:
          "SearchCohortDistribution",
        contract_field:
          "SearchCohortDistribution.minimum_score",
        category:
          "TRUTH",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          ["search.aggregation.final_raw_score"],
        downstream_consumers:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-cohort-normalization-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchRawScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.cohort_distribution.maximum_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.cohort_distribution.maximum_score",
        variable_family:
          "score",
        ownership_layer:
          "COHORT_NORMALIZATION",
        source_truth:
          "search.cohort_distribution.maximum_score",
        contract_source:
          "SearchCohortDistribution",
        contract_field:
          "SearchCohortDistribution.maximum_score",
        category:
          "TRUTH",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          ["search.aggregation.final_raw_score"],
        downstream_consumers:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-cohort-normalization-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchRawScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.cohort_distribution.mean_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.cohort_distribution.mean_score",
        variable_family:
          "score",
        ownership_layer:
          "COHORT_NORMALIZATION",
        source_truth:
          "search.cohort_distribution.mean_score",
        contract_source:
          "SearchCohortDistribution",
        contract_field:
          "SearchCohortDistribution.mean_score",
        category:
          "TRUTH",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          ["search.aggregation.final_raw_score"],
        downstream_consumers:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-cohort-normalization-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchRawScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.cohort_distribution.median_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.cohort_distribution.median_score",
        variable_family:
          "score",
        ownership_layer:
          "COHORT_NORMALIZATION",
        source_truth:
          "search.cohort_distribution.median_score",
        contract_source:
          "SearchCohortDistribution",
        contract_field:
          "SearchCohortDistribution.median_score",
        category:
          "TRUTH",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          ["search.aggregation.final_raw_score"],
        downstream_consumers:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-cohort-normalization-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchRawScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.cohort_distribution.standard_deviation":
      defineSearchPipelineVariable({
        variable_name:
          "search.cohort_distribution.standard_deviation",
        variable_family:
          "score",
        ownership_layer:
          "COHORT_NORMALIZATION",
        source_truth:
          "search.cohort_distribution.standard_deviation",
        contract_source:
          "SearchCohortDistribution",
        contract_field:
          "SearchCohortDistribution.standard_deviation",
        category:
          "TRUTH",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          ["search.aggregation.final_raw_score"],
        downstream_consumers:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-cohort-normalization-core.ts",
        validation_state:
          "VALID",
        data_type:
          "number",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        minimum_value:
          0,
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.cohort_distribution.normalization_method":
      defineSearchPipelineVariable({
        variable_name:
          "search.cohort_distribution.normalization_method",
        variable_family:
          "label",
        ownership_layer:
          "COHORT_NORMALIZATION",
        source_truth:
          "search.cohort_distribution.normalization_method",
        contract_source:
          "SearchCohortDistribution",
        contract_field:
          "SearchCohortDistribution.normalization_method",
        category:
          "METADATA",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          [],
        downstream_consumers:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-cohort-normalization-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchCohortDistribution[\"normalization_method\"]",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * RELATIVE COHORT EVALUATION
     * ====================================================================== */

    "search.relative.normalized_score":
      defineSearchPipelineVariable({
        variable_name:
          "search.relative.normalized_score",
        variable_family:
          "score",
        ownership_layer:
          "RELATIVE_COHORT_EVALUATION",
        source_truth:
          "search.relative.normalized_score",
        contract_source:
          "SearchRelativeEvaluationContext",
        contract_field:
          "SearchRelativeEvaluationContext.normalized_score",
        category:
          "TRUTH",
        criticality_level:
          "CORE_TRUTH",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          [
            "search.aggregation.final_raw_score",
          ],
        downstream_consumers:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchNormalizedScore",
        nullable:
          false,
        availability_semantics:
          "CONDITIONAL",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.relative.relative_position":
      defineSearchPipelineVariable({
        variable_name:
          "search.relative.relative_position",
        variable_family:
          "count",
        ownership_layer:
          "RELATIVE_COHORT_EVALUATION",
        source_truth:
          "search.relative.relative_position",
        contract_source:
          "SearchRelativeEvaluationContext",
        contract_field:
          "SearchRelativeEvaluationContext.relative_position",
        category:
          "TRUTH",
        criticality_level:
          "CORE_TRUTH",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          [
            "search.relative.normalized_score",
          ],
        downstream_consumers:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchRank",
        nullable:
          false,
        availability_semantics:
          "CONDITIONAL",
        introduced_in_version:
          "1.0.0",
        minimum_value:
          1,
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.relative.percentile":
      defineSearchPipelineVariable({
        variable_name:
          "search.relative.percentile",
        variable_family:
          "score",
        ownership_layer:
          "RELATIVE_COHORT_EVALUATION",
        source_truth:
          "search.relative.percentile",
        contract_source:
          "SearchRelativeEvaluationContext",
        contract_field:
          "SearchRelativeEvaluationContext.percentile",
        category:
          "TRUTH",
        criticality_level:
          "CORE_TRUTH",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          [
            "search.relative.normalized_score",
          ],
        downstream_consumers:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchPercentile",
        nullable:
          false,
        availability_semantics:
          "CONDITIONAL",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.relative.distance_from_median":
      defineSearchPipelineVariable({
        variable_name:
          "search.relative.distance_from_median",
        variable_family:
          "delta",
        ownership_layer:
          "RELATIVE_COHORT_EVALUATION",
        source_truth:
          "search.relative.distance_from_median",
        contract_source:
          "SearchRelativeEvaluationContext",
        contract_field:
          "SearchRelativeEvaluationContext.distance_from_median",
        category:
          "TRUTH",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          [
            "search.relative.normalized_score",
            "search.cohort_distribution.median_score",
          ],
        downstream_consumers:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts",
        validation_state:
          "VALID",
        data_type:
          "number",
        nullable:
          false,
        availability_semantics:
          "CONDITIONAL",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.relative.distance_from_previous":
      defineSearchPipelineVariable({
        variable_name:
          "search.relative.distance_from_previous",
        variable_family:
          "delta",
        ownership_layer:
          "RELATIVE_COHORT_EVALUATION",
        source_truth:
          "search.relative.distance_from_previous",
        contract_source:
          "SearchRelativeEvaluationContext",
        contract_field:
          "SearchRelativeEvaluationContext.distance_from_previous",
        category:
          "TRUTH",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          [
            "search.relative.normalized_score",
          ],
        downstream_consumers:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchOptionalEvidence<number>",
        nullable:
          false,
        availability_semantics:
          "OPTIONAL_EVIDENCE",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.relative.distance_from_next":
      defineSearchPipelineVariable({
        variable_name:
          "search.relative.distance_from_next",
        variable_family:
          "delta",
        ownership_layer:
          "RELATIVE_COHORT_EVALUATION",
        source_truth:
          "search.relative.distance_from_next",
        contract_source:
          "SearchRelativeEvaluationContext",
        contract_field:
          "SearchRelativeEvaluationContext.distance_from_next",
        category:
          "TRUTH",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          [
            "search.relative.normalized_score",
          ],
        downstream_consumers:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchOptionalEvidence<number>",
        nullable:
          false,
        availability_semantics:
          "OPTIONAL_EVIDENCE",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.relative.relative_evaluation_id":
      defineSearchPipelineVariable({
        variable_name:
          "search.relative.relative_evaluation_id",
        variable_family:
          "identifier",
        ownership_layer:
          "RELATIVE_COHORT_EVALUATION",
        source_truth:
          "search.relative.relative_evaluation_id",
        contract_source:
          "SearchRelativeEvaluationContext",
        contract_field:
          "SearchRelativeEvaluationContext.relative_evaluation_id",
        category:
          "METADATA",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "RELATIVE_COHORT_EVALUATION",
          ],
        upstream_dependencies:
          [],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "PLANNED",
        producer_module:
          "lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts",
        validation_state:
          "UNVALIDATED",
        data_type:
          "SearchRelativeEvaluationId",
        nullable:
          false,
        availability_semantics:
          "PLANNED_UNAVAILABLE",
        introduced_in_version:
          "2.1.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),

    /* =========================================================================
     * PRIVATE DECISION
     * ====================================================================== */

    "search.private_decision.category":
      defineSearchPipelineVariable({
        variable_name:
          "search.private_decision.category",

        variable_family:
          "state",

        ownership_layer:
          "PRIVATE_DECISION",

        source_truth:
          "search.private_decision.category",

        contract_source:
          "SearchPrivateDecision",

        contract_field:
          "SearchPrivateDecision.category",

        category:
          "TRUTH",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.aggregation.final_raw_score",
            "search.eligibility.ranking_eligible",
            "search.eligibility.allow_eligible",
            "search.relative.relative_position",
          ],

        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        producer_module:
          "lib/xyvala/search/decision/search-private-decision-core.ts",

        validation_state:
          "VALID",

        data_type:
          "SearchPrivateDecisionCategory",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        allowed_values:
          [
            "BLOCK",
            "WATCH",
            "ALLOW",
          ],

        public_exposure_rule:
          "PRIVATE_ONLY",

        snapshot_transport_required:
          true,
      }),

    "search.private_decision.triggered_rule_ids":
      defineSearchPipelineVariable({
        variable_name:
          "search.private_decision.triggered_rule_ids",
        variable_family:
          "collection",
        ownership_layer:
          "PRIVATE_DECISION",
        source_truth:
          "search.private_decision.triggered_rule_ids",
        contract_source:
          "SearchPrivateDecision",
        contract_field:
          "SearchPrivateDecision.triggered_rule_ids",
        category:
          "TRUTH",
        criticality_level:
          "STRUCTURAL_SUPPORT",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          [
            "search.private_decision.category",
          ],
        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/decision/search-private-decision-core.ts",
        validation_state:
          "VALID",
        data_type:
          "readonly string[]",
        nullable:
          false,
        availability_semantics:
          "COLLECTION",
        introduced_in_version:
          "1.0.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    "search.private_decision.decision_confidence":
      defineSearchPipelineVariable({
        variable_name:
          "search.private_decision.decision_confidence",
        variable_family:
          "score",
        ownership_layer:
          "PRIVATE_DECISION",
        source_truth:
          "search.private_decision.decision_confidence",
        contract_source:
          "SearchPrivateDecision",
        contract_field:
          "SearchPrivateDecision.decision_confidence",
        category:
          "TRUTH",
        criticality_level:
          "CORE_TRUTH",
        exposure_level:
          "PRIVATE",
        propagation_path:
          [
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],
        upstream_dependencies:
          [
            "search.aggregation.aggregate_confidence",
          ],
        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
          ],
        public_exposure_allowed:
          false,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/decision/search-private-decision-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchConfidenceScore",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        minimum_value:
          0,
        maximum_value:
          1,
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          true,
      }),

    /* =========================================================================
     * PUBLIC TRANSFORMATION
     * ====================================================================== */

    "search.public.source.source_uri":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.source.source_uri",
        variable_family:
          "identifier",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.acquisition.source_uri",
        contract_source:
          "SearchPublicResultSource",
        contract_field:
          "SearchPublicResultSource.source_uri",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.acquisition.source_uri",
          ],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchUri",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "2.1.0",
        projection_source:
          "search.acquisition.source_uri",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.source.source_type":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.source.source_type",
        variable_family:
          "label",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.acquisition.source_type",
        contract_source:
          "SearchPublicResultSource",
        contract_field:
          "SearchPublicResultSource.source_type",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.acquisition.source_type",
          ],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchSourceType",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "2.1.0",
        projection_source:
          "search.acquisition.source_type",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.source.fetched_at":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.source.fetched_at",
        variable_family:
          "timestamp",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.acquisition.fetched_at",
        contract_source:
          "SearchPublicResultSource",
        contract_field:
          "SearchPublicResultSource.fetched_at",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.acquisition.fetched_at",
          ],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchIsoTimestamp",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "2.1.0",
        projection_source:
          "search.acquisition.fetched_at",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.source.published_at":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.source.published_at",
        variable_family:
          "timestamp",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.temporal.published_at",
        contract_source:
          "SearchPublicResultSource",
        contract_field:
          "SearchPublicResultSource.published_at",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.temporal.published_at",
          ],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "UNVALIDATED",
        data_type:
          "SearchOptionalEvidence<SearchIsoTimestamp>",
        nullable:
          false,
        availability_semantics:
          "OPTIONAL_EVIDENCE",
        introduced_in_version:
          "2.1.0",
        projection_source:
          "search.temporal.published_at",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.title":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.title",
        variable_family:
          "text",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.segmentation.sentence.text",
        contract_source:
          "SearchPublicResultCandidate",
        contract_field:
          "SearchPublicResultCandidate.title",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.segmentation.sentence.text",
          ],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "VALID",
        data_type:
          "string",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        projection_source:
          "search.segmentation.sentence.text",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.excerpts":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.excerpts",
        variable_family:
          "collection",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.query_document.query_anchor_signals",
        contract_source:
          "SearchPublicResultCandidate",
        contract_field:
          "SearchPublicResultCandidate.excerpts",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.query_document.query_anchor_signals",
            "search.segmentation.sentence.text",
          ],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "VALID",
        data_type:
          "readonly SearchPublicResultExcerpt[]",
        nullable:
          false,
        availability_semantics:
          "COLLECTION",
        introduced_in_version:
          "1.0.0",
        projection_source:
          "search.query_document.query_anchor_signals",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.relevance_label":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.relevance_label",
        variable_family:
          "label",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.score.query_relevance_score",
        contract_source:
          "SearchPublicResultCandidate",
        contract_field:
          "SearchPublicResultCandidate.relevance_label",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.score.query_relevance_score",
          ],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchPublicRelevanceLabel",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        projection_source:
          "search.score.query_relevance_score",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.evidence_labels":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.evidence_labels",
        variable_family:
          "collection",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.query_document.query_anchor_signals",
        contract_source:
          "SearchPublicResultCandidate",
        contract_field:
          "SearchPublicResultCandidate.evidence_labels",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.query_document.query_anchor_signals",
          ],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "VALID",
        data_type:
          "readonly SearchPublicEvidenceLabel[]",
        nullable:
          false,
        availability_semantics:
          "COLLECTION",
        introduced_in_version:
          "1.0.0",
        projection_source:
          "search.query_document.query_anchor_signals",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.language":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.language",
        variable_family:
          "label",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.extraction.detected_language",
        contract_source:
          "SearchPublicResultCandidate",
        contract_field:
          "SearchPublicResultCandidate.language",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.extraction.detected_language",
          ],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchOptionalEvidence<SearchLanguageCode>",
        nullable:
          false,
        availability_semantics:
          "OPTIONAL_EVIDENCE",
        introduced_in_version:
          "1.0.0",
        projection_source:
          "search.extraction.detected_language",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.availability_state":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.availability_state",
        variable_family:
          "state",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.public.availability_state",
        contract_source:
          "SearchPublicResultCandidate",
        contract_field:
          "SearchPublicResultCandidate.availability_state",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [],
        downstream_consumers:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/transformers/search-public-result-transformer.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchAvailabilityState",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        projection_source:
          "PRIVATE_SNAPSHOT_AUTHORIZED_AVAILABILITY",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    /* =========================================================================
     * PUBLIC RANKING
     * ====================================================================== */

    "search.public_ranking.public_position":
      defineSearchPipelineVariable({
        variable_name:
          "search.public_ranking.public_position",
        variable_family:
          "count",
        ownership_layer:
          "PUBLIC_RANKING",
        source_truth:
          "search.public_ranking.public_position",
        contract_source:
          "SearchPublicSearchResult",
        contract_field:
          "SearchPublicSearchResult.public_position",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [
            "search.public.relevance_label",
          ],
        downstream_consumers:
          [
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/ranking/search-public-ranking-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchRank",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "2.1.0",
        minimum_value:
          1,
        projection_source:
          "SearchPublicResultCandidate",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public_ranking.result_count":
      defineSearchPipelineVariable({
        variable_name:
          "search.public_ranking.result_count",
        variable_family:
          "count",
        ownership_layer:
          "PUBLIC_RANKING",
        source_truth:
          "search.public_ranking.result_count",
        contract_source:
          "SearchPublicRankingProjection",
        contract_field:
          "SearchPublicRankingProjection.result_count",
        category:
          "PROJECTION",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],
        upstream_dependencies:
          [],
        downstream_consumers:
          [
            "API",
            "INTERFACE",
          ],
        public_exposure_allowed:
          true,
        lineage_status:
          "ACTIVE",
        producer_module:
          "lib/xyvala/search/ranking/search-public-ranking-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchCount",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "2.1.0",
        minimum_value:
          0,
        projection_source:
          "SearchPublicSearchResult[]",
        public_exposure_rule:
          "PUBLIC_DIRECT",
        snapshot_transport_required:
          false,
      }),

    "search.public.public_position":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.public_position",
        variable_family:
          "count",
        ownership_layer:
          "PUBLIC_RANKING",
        source_truth:
          "search.public_ranking.public_position",
        contract_source:
          "SearchPublicSearchResult",
        contract_field:
          "SearchPublicSearchResult.public_position",
        category:
          "REFERENCE",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "PUBLIC_RANKING",
          ],
        upstream_dependencies:
          [
            "search.public_ranking.public_position",
          ],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/ranking/search-public-ranking-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchRank",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.public_ranking.public_position",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.public_ranking.public_position",
        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.public.result_count":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.result_count",
        variable_family:
          "count",
        ownership_layer:
          "PUBLIC_RANKING",
        source_truth:
          "search.public_ranking.result_count",
        contract_source:
          "SearchPublicRankingProjection",
        contract_field:
          "SearchPublicRankingProjection.result_count",
        category:
          "REFERENCE",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "PUBLIC",
        propagation_path:
          [
            "PUBLIC_RANKING",
          ],
        upstream_dependencies:
          [
            "search.public_ranking.result_count",
          ],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "DEPRECATED",
        producer_module:
          "lib/xyvala/search/ranking/search-public-ranking-core.ts",
        validation_state:
          "VALID",
        data_type:
          "SearchCount",
        nullable:
          false,
        availability_semantics:
          "REQUIRED",
        introduced_in_version:
          "1.0.0",
        reference_target:
          "search.public_ranking.result_count",
        deprecated_in_version:
          "2.1.0",
        replacement_variable:
          "search.public_ranking.result_count",
        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",
        snapshot_transport_required:
          false,
      }),

    "search.public.public_projection_id":
      defineSearchPipelineVariable({
        variable_name:
          "search.public.public_projection_id",
        variable_family:
          "identifier",
        ownership_layer:
          "TRANSFORMATION",
        source_truth:
          "search.public.public_projection_id",
        contract_source:
          "PLANNED_PUBLIC_PROJECTION_ID_CONTRACT",
        contract_field:
          "public_projection_id",
        category:
          "METADATA",
        criticality_level:
          "PROJECTION_VARIABLES",
        exposure_level:
          "INTERNAL",
        propagation_path:
          [
            "TRANSFORMATION",
          ],
        upstream_dependencies:
          [],
        downstream_consumers:
          [],
        public_exposure_allowed:
          false,
        lineage_status:
          "PLANNED",
        producer_module:
          "PLANNED_PUBLIC_PROJECTION_IDENTITY_OWNER",
        validation_state:
          "UNVALIDATED",
        data_type:
          "SearchPublicProjectionId",
        nullable:
          false,
        availability_semantics:
          "PLANNED_UNAVAILABLE",
        introduced_in_version:
          "2.1.0",
        public_exposure_rule:
          "PRIVATE_ONLY",
        snapshot_transport_required:
          false,
      }),
  } as const);

/* ============================================================================
 * 6. REGISTERED PIPELINE VARIABLE DOMAINS
 * ========================================================================== */

export type SearchRegisteredVariableName =
  keyof typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY;

/*
 * Exact producer identity domain.
 *
 * Because defineSearchPipelineVariable preserves literal types, this is now a
 * real union of canonical producer_module identities instead of plain string.
 */
export type SearchRegisteredProducerModuleName =
  (
    typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
  )[SearchRegisteredVariableName]["producer_module"];

/* ---------------------------------------------------------------------------
 * ACTIVE variable domain
 * ------------------------------------------------------------------------ */

export type SearchRegisteredActiveVariableName =
  {
    [TVariableName in SearchRegisteredVariableName]:
      (
        typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
      )[TVariableName]["lineage_status"] extends "ACTIVE"
        ? TVariableName
        : never;
  }[SearchRegisteredVariableName];

export type SearchRegisteredActiveProducerModuleName =
  (
    typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
  )[SearchRegisteredActiveVariableName]["producer_module"];

/* ---------------------------------------------------------------------------
 * ACTIVE + Private Snapshot transport domain
 * ------------------------------------------------------------------------ */

export type SearchRegisteredActiveSnapshotVariableName =
  {
    [TVariableName in SearchRegisteredVariableName]:
      (
        typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
      )[TVariableName]["lineage_status"] extends "ACTIVE"
        ? (
            typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
          )[TVariableName]["snapshot_transport_required"] extends true
          ? TVariableName
          : never
        : never;
  }[SearchRegisteredVariableName];

export type SearchRegisteredActiveSnapshotProducerModuleName =
  (
    typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
  )[SearchRegisteredActiveSnapshotVariableName]["producer_module"];

/* ============================================================================
 * 7. CROSS-CUTTING LINEAGE REGISTRY
 * ========================================================================== */

export const XYVALA_SEARCH_CROSS_CUTTING_VARIABLE_LINEAGE_REGISTRY =
  Object.freeze({
    "search.temporal.document_series_id":
      defineSearchCrossCuttingVariable({
        variable_name: "search.temporal.document_series_id",
        variable_family: "identifier",
        owner: "TEMPORAL_DOCUMENT_SERIES_IDENTITY",
        owner_module: "lib/xyvala/search/temporal/search-temporal-document-series-identity.ts",
        source_truth: "search.temporal.document_series_id",
        contract_source: "SearchTemporalDocumentSeriesId",
        contract_field: "SearchTemporalSearchObservation.document_series_id",
        category: "TRUTH",
        criticality_level: "STRUCTURAL_SUPPORT",
        exposure_level: "INTERNAL",
        propagation_path: [
          "TEMPORAL_DOCUMENT_SERIES_IDENTITY",
          "TEMPORAL_SIGNAL_DETECTION",
        ],
        upstream_dependencies: [
          "search.acquisition.source_uri",
          "search.acquisition.source_type",
        ],
        downstream_consumers: [
          "SearchTemporalSearchObservation",
          "SearchTemporalSignalsSearchInput",
          "SearchTemporalSignalsSearchExecutionInput",
          "SEARCH_RUNTIME_PRODUCER_ADAPTERS",
        ],
        public_exposure_allowed: false,
        lineage_status: "ACTIVE",
        validation_state: "VALID",
        data_type: "SearchTemporalDocumentSeriesId",
        nullable: false,
        availability_semantics: "REQUIRED",
        introduced_in_version: "3.0.0",
        public_exposure_rule: "PRIVATE_ONLY",
        pipeline_lineage_exclusion_reason:
          "Temporal series identity has a distinct non-pipeline owner. Observation and execution fields transport its value; the current document_id remains Acquisition-owned version identity. No public or snapshot field is synthesized for this input-only identity.",
      }),

    "search.query.query_id":
      defineSearchCrossCuttingVariable({
        variable_name:
          "search.query.query_id",

        variable_family:
          "identifier",

        owner:
          "QUERY_IDENTITY",

        owner_module:
          "lib/xyvala/search/query/search-query-input-core.ts",

        source_truth:
          "search.query.query_id",

        contract_source:
          "SearchQuery",

        contract_field:
          "SearchQuery.query_id",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "INTERNAL",

        propagation_path:
          [
            "QUERY_IDENTITY",
            "QUERY_NORMALIZATION",
            "QUERY_PROFILING",
            "QUERY_DOCUMENT_SIGNAL_DETECTION",
            "QUERY_RELEVANCE_SCORING",
            "BEHAVIORAL_SIGNAL_DETECTION",
            "BEHAVIORAL_CALIBRATION_SCORING",
            "POSITIVE_SCORE_ASSEMBLY",
            "PENALTY_EVALUATION",
            "ANALYTICAL_AGGREGATION",
            "ELIGIBILITY_EVALUATION",
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
            "PUBLIC_RANKING",
            "API",
            "INTERFACE",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "SEARCH_QUERY_PIPELINE",
            "PRIVATE_SNAPSHOT",
            "PUBLIC_PIPELINE",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        validation_state:
          "VALID",

        data_type:
          "SearchQueryId",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PUBLIC_DERIVATION_ONLY",

        pipeline_lineage_exclusion_reason:
          "query_id belongs to canonical Query Identity ownership; QUERY_IDENTITY is not a SearchPipelineLayer and must not be forged as one.",
      }),

    "search.cohort.cohort_id":
      defineSearchCrossCuttingVariable({
        variable_name:
          "search.cohort.cohort_id",

        variable_family:
          "identifier",

        owner:
          "COHORT_IDENTITY",

        owner_module:
          "lib/xyvala/search/cohort/search-cohort-definition-input-core.ts",

        source_truth:
          "search.cohort.cohort_id",

        contract_source:
          "SearchCohortDefinition",

        contract_field:
          "SearchCohortDefinition.cohort_id",

        category:
          "TRUTH",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "COHORT_IDENTITY",
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.query.query_id",
          ],

        downstream_consumers:
          [
            "COHORT_BATCH_ASSEMBLY",
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_DECISION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        validation_state:
          "VALID",

        data_type:
          "SearchCohortId",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        pipeline_lineage_exclusion_reason:
          "cohort_id belongs to canonical Cohort Definition identity ownership and must not be attributed to Cohort Normalization.",
      }),

    "search.cohort.distribution_id":
      defineSearchCrossCuttingVariable({
        variable_name:
          "search.cohort.distribution_id",

        variable_family:
          "identifier",

        owner:
          "DISTRIBUTION_IDENTITY",

        owner_module:
          "lib/xyvala/search/cohort/search-distribution-identity-core.ts",

        source_truth:
          "search.cohort.distribution_id",

        contract_source:
          "SearchCohortBatch",

        contract_field:
          "SearchCohortBatch.distribution_id",

        category:
          "TRUTH",

        criticality_level:
          "CORE_TRUTH",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "DISTRIBUTION_IDENTITY",
            "COHORT_BATCH_ASSEMBLY",
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [
            "search.cohort.cohort_id",
          ],

        downstream_consumers:
          [
            "COHORT_BATCH_ASSEMBLY",
            "COHORT_NORMALIZATION",
            "RELATIVE_COHORT_EVALUATION",
            "PRIVATE_SNAPSHOT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        validation_state:
          "VALID",

        data_type:
          "SearchDistributionId",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        pipeline_lineage_exclusion_reason:
          "distribution_id belongs to canonical Distribution Identity ownership and must never be invented or reconstructed by SearchCohortBatch, Cohort Normalization, the orchestrator or downstream consumers.",
      }),

    "search.cohort_batch.candidate_count":
      defineSearchCrossCuttingVariable({
        variable_name:
          "search.cohort_batch.candidate_count",

        variable_family:
          "count",

        owner:
          "COHORT_BATCH_ASSEMBLY",

        owner_module:
          "lib/xyvala/search/cohort/search-cohort-batch-core.ts",

        source_truth:
          "search.cohort_batch.candidate_count",

        contract_source:
          "SearchCohortBatch",

        contract_field:
          "SearchCohortBatch.candidate_count",

        /*
         * candidate_count is metadata owned by the batch assembly boundary.
         *
         * It is not declared TRANSPORT because no distinct canonical
         * reference_target is being transported.
         */
        category:
          "METADATA",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "COHORT_BATCH_ASSEMBLY",
            "COHORT_NORMALIZATION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "COHORT_NORMALIZATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        validation_state:
          "VALID",

        data_type:
          "SearchCount",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        pipeline_lineage_exclusion_reason:
          "SearchCohortBatch candidate_count is governed batch metadata owned by the cross-cutting Cohort Batch Assembly boundary, not an analytical SearchPipelineLayer.",
      }),

    "search.snapshot.snapshot_id":
      defineSearchCrossCuttingVariable({
        variable_name:
          "search.snapshot.snapshot_id",

        variable_family:
          "identifier",

        owner:
          "SNAPSHOT_IDENTITY",

        owner_module:
          "lib/xyvala/search/snapshot/search-snapshot-identity-core.ts",

        source_truth:
          "search.snapshot.snapshot_id",

        contract_source:
          "SearchPrivateDocumentSnapshot",

        contract_field:
          "SearchPrivateDocumentSnapshot.snapshot_id",

        category:
          "METADATA",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "SNAPSHOT_IDENTITY",
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
            "TRANSFORMATION",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        validation_state:
          "VALID",

        data_type:
          "string",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        pipeline_lineage_exclusion_reason:
          "snapshot_id belongs to canonical Snapshot Identity ownership and must never be generated or reconstructed by the Private Snapshot Builder.",
      }),

    "search.trace.trace_id":
      defineSearchCrossCuttingVariable({
        variable_name:
          "search.trace.trace_id",

        variable_family:
          "identifier",

        owner:
          "EXECUTION_TRACEABILITY",

        owner_module:
          "lib/xyvala/search/governance/search-execution-traceability-core.ts",

        source_truth:
          "search.trace.trace_id",

        contract_source:
          "SearchTraceRecord",

        contract_field:
          "SearchTraceRecord.trace_id",

        category:
          "METADATA",

        criticality_level:
          "STRUCTURAL_SUPPORT",

        exposure_level:
          "PRIVATE",

        propagation_path:
          [
            "EXECUTION_TRACEABILITY",
            "PRIVATE_SNAPSHOT",
          ],

        upstream_dependencies:
          [],

        downstream_consumers:
          [
            "PRIVATE_SNAPSHOT",
            "AUDIT",
          ],

        public_exposure_allowed:
          false,

        lineage_status:
          "ACTIVE",

        validation_state:
          "VALID",

        data_type:
          "SearchTraceId",

        nullable:
          false,

        availability_semantics:
          "REQUIRED",

        introduced_in_version:
          "1.0.0",

        public_exposure_rule:
          "PRIVATE_ONLY",

        pipeline_lineage_exclusion_reason:
          "trace_id belongs to canonical Execution Traceability ownership and not to an analytical SearchPipelineLayer.",
      }),
  } as const);

/* ============================================================================
 * 8. CROSS-CUTTING VARIABLE NAME DOMAIN
 * ========================================================================== */

export type SearchRegisteredCrossCuttingVariableName =
  keyof typeof XYVALA_SEARCH_CROSS_CUTTING_VARIABLE_LINEAGE_REGISTRY;

/* ============================================================================
 * 9. STATIC REGISTERED NAME COLLECTIONS
 * ========================================================================== */

export const XYVALA_SEARCH_REGISTERED_VARIABLE_NAMES =
  Object.freeze(
    Object.keys(
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY,
    ) as SearchRegisteredVariableName[],
  );

export const XYVALA_SEARCH_REGISTERED_ACTIVE_VARIABLE_NAMES =
  Object.freeze(
    XYVALA_SEARCH_REGISTERED_VARIABLE_NAMES.filter(
      (
        variableName,
      ): variableName is SearchRegisteredActiveVariableName =>
        XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY[
          variableName
        ].lineage_status === "ACTIVE",
    ),
  );

export const XYVALA_SEARCH_REGISTERED_ACTIVE_SNAPSHOT_VARIABLE_NAMES =
  Object.freeze(
    XYVALA_SEARCH_REGISTERED_VARIABLE_NAMES.filter(
      (
        variableName,
      ): variableName is SearchRegisteredActiveSnapshotVariableName => {
        const registryEntry =
          XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY[
            variableName
          ];

        return (
          registryEntry.lineage_status ===
            "ACTIVE" &&
          registryEntry.snapshot_transport_required ===
            true
        );
      },
    ),
  );

export const XYVALA_SEARCH_REGISTERED_CROSS_CUTTING_VARIABLE_NAMES =
  Object.freeze(
    Object.keys(
      XYVALA_SEARCH_CROSS_CUTTING_VARIABLE_LINEAGE_REGISTRY,
    ) as SearchRegisteredCrossCuttingVariableName[],
  );

/* ============================================================================
 * 10. SAFE GOVERNANCE ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    string,

  fieldName:
    string,
): void {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `Governance violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

function assertUniqueStringCollection(
  values:
    readonly string[],

  fieldName:
    string,
): void {
  const observed =
    new Set<string>();

  for (
    const value of
    values
  ) {
    if (
      observed.has(
        value,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
          `Governance violation: ${fieldName} contains duplicate identity ${value}.`,
      );
    }

    observed.add(
      value,
    );
  }
}

function isPublicProjectionEntry(
  entry:
    SearchVariableLineageRegistryEntry,
): boolean {
  return (
    entry.category ===
      "PROJECTION" &&
    entry.exposure_level ===
      "PUBLIC"
  );
}

/* ============================================================================
 * 11. PIPELINE REGISTRY VALIDATION
 * ========================================================================== */

function validatePipelineRegistryEntry(
  registryKey:
    string,

  entry:
    SearchVariableLineageRegistryEntry,
): void {
  assertNonEmptyString(
    registryKey,
    "registry_key",
  );

  assertNonEmptyString(
    entry.variable_name,
    `${registryKey}.variable_name`,
  );

  if (
    registryKey !==
    entry.variable_name
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: key ${registryKey} differs from variable_name ${entry.variable_name}.`,
    );
  }

  assertNonEmptyString(
    entry.source_truth,
    `${registryKey}.source_truth`,
  );

  assertNonEmptyString(
    entry.contract_source,
    `${registryKey}.contract_source`,
  );

  assertNonEmptyString(
    entry.contract_field,
    `${registryKey}.contract_field`,
  );

  assertNonEmptyString(
    entry.producer_module,
    `${registryKey}.producer_module`,
  );

  assertNonEmptyString(
    entry.data_type,
    `${registryKey}.data_type`,
  );

  assertNonEmptyString(
    entry.availability_semantics,
    `${registryKey}.availability_semantics`,
  );

  if (
    entry.propagation_path.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: ${registryKey} has an empty propagation_path.`,
    );
  }

  assertUniqueStringCollection(
    entry.propagation_path,
    `${registryKey}.propagation_path`,
  );

  assertUniqueStringCollection(
    entry.upstream_dependencies,
    `${registryKey}.upstream_dependencies`,
  );

  assertUniqueStringCollection(
    entry.downstream_consumers,
    `${registryKey}.downstream_consumers`,
  );

  if (
    entry.propagation_path[0] !==
    entry.ownership_layer
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: ${registryKey} propagation_path must start with ownership_layer ${entry.ownership_layer}.`,
    );
  }

  /*
   * Compatibility aliases must remain exact mirrors.
   */
  if (
    entry.producer_layer !==
    entry.ownership_layer
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-006 SEMANTIC_MUTATION: ${registryKey}.producer_layer diverges from ownership_layer.`,
    );
  }

  if (
    entry.source_contract !==
    entry.contract_source
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-006 SEMANTIC_MUTATION: ${registryKey}.source_contract diverges from contract_source.`,
    );
  }

  if (
    entry.visibility !==
    entry.exposure_level
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-006 SEMANTIC_MUTATION: ${registryKey}.visibility diverges from exposure_level.`,
    );
  }

  if (
    (
      entry.category ===
        "REFERENCE" ||
      entry.category ===
        "TRANSPORT"
    ) &&
    !entry.reference_target
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-009 REFERENCE_WITHOUT_CANONICAL_TARGET: ${registryKey}.`,
    );
  }

  if (
    entry.category ===
      "PROJECTION" &&
    !entry.projection_source
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-004 LOST_SOURCE_TRUTH: projection ${registryKey} has no projection_source.`,
    );
  }

  if (
    entry.public_exposure_allowed &&
    !isPublicProjectionEntry(
      entry,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-005 ILLEGAL_PUBLIC_EXPOSURE: ${registryKey} is public-exposable without being a PUBLIC Projection.`,
    );
  }

  if (
    entry.exposure_level ===
      "PUBLIC" &&
    entry.lineage_status ===
      "ACTIVE" &&
    entry.category !==
      "PROJECTION"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-005 ILLEGAL_PUBLIC_EXPOSURE: active PUBLIC variable ${registryKey} must be a Projection.`,
    );
  }

  if (
    entry.public_exposure_rule ===
      "PUBLIC_DIRECT" &&
    !isPublicProjectionEntry(
      entry,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-005 ILLEGAL_PUBLIC_EXPOSURE: ${registryKey} declares PUBLIC_DIRECT without being a PUBLIC Projection.`,
    );
  }

  if (
    entry.public_exposure_rule ===
      "PRIVATE_ONLY" &&
    entry.public_exposure_allowed
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-005 ILLEGAL_PUBLIC_EXPOSURE: PRIVATE_ONLY variable ${registryKey} cannot allow public exposure.`,
    );
  }

  if (
    entry.snapshot_transport_required &&
    !entry.propagation_path.includes(
      "PRIVATE_SNAPSHOT",
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: ${registryKey} requires snapshot transport but does not cross PRIVATE_SNAPSHOT.`,
    );
  }

  if (
    entry.snapshot_transport_required &&
    entry.lineage_status !==
      "ACTIVE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-007 SILENT_DISAPPEARANCE: only ACTIVE variables may require Private Snapshot transport; ${registryKey} is ${entry.lineage_status}.`,
    );
  }

  if (
    entry.lineage_status ===
      "ACTIVE" &&
    entry.availability_semantics ===
      "PLANNED_UNAVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-006 SEMANTIC_MUTATION: ACTIVE variable ${registryKey} cannot use PLANNED_UNAVAILABLE semantics.`,
    );
  }

  if (
    entry.lineage_status ===
      "PLANNED" &&
    entry.availability_semantics !==
      "PLANNED_UNAVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: PLANNED variable ${registryKey} must use PLANNED_UNAVAILABLE semantics.`,
    );
  }

  if (
    entry.lineage_status ===
      "PLANNED" &&
    entry.validation_state !==
      "UNVALIDATED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: PLANNED variable ${registryKey} must remain UNVALIDATED.`,
    );
  }

  if (
    entry.lineage_status ===
      "DEPRECATED" &&
    !entry.replacement_variable
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: deprecated variable ${registryKey} has no replacement_variable.`,
    );
  }

  if (
    entry.lineage_status ===
      "DEPRECATED" &&
    entry.snapshot_transport_required
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-006 SEMANTIC_MUTATION: deprecated compatibility identity ${registryKey} must not create duplicate snapshot lineage.`,
    );
  }
}

/* ============================================================================
 * 12. CROSS-CUTTING REGISTRY VALIDATION
 * ========================================================================== */

function validateCrossCuttingRegistryEntry(
  registryKey:
    string,

  entry:
    SearchCrossCuttingVariableLineageRegistryEntry,
): void {
  assertNonEmptyString(
    registryKey,
    "cross_cutting_registry_key",
  );

  assertNonEmptyString(
    entry.variable_name,
    `${registryKey}.variable_name`,
  );

  if (
    registryKey !==
    entry.variable_name
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: cross-cutting key ${registryKey} differs from variable_name ${entry.variable_name}.`,
    );
  }

  assertNonEmptyString(
    entry.owner_module,
    `${registryKey}.owner_module`,
  );

  assertNonEmptyString(
    entry.source_truth,
    `${registryKey}.source_truth`,
  );

  assertNonEmptyString(
    entry.contract_source,
    `${registryKey}.contract_source`,
  );

  assertNonEmptyString(
    entry.contract_field,
    `${registryKey}.contract_field`,
  );

  assertNonEmptyString(
    entry.data_type,
    `${registryKey}.data_type`,
  );

  assertNonEmptyString(
    entry.pipeline_lineage_exclusion_reason,
    `${registryKey}.pipeline_lineage_exclusion_reason`,
  );

  if (
    entry.propagation_path.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: ${registryKey} has an empty cross-cutting propagation_path.`,
    );
  }

  assertUniqueStringCollection(
    entry.propagation_path,
    `${registryKey}.propagation_path`,
  );

  assertUniqueStringCollection(
    entry.upstream_dependencies,
    `${registryKey}.upstream_dependencies`,
  );

  assertUniqueStringCollection(
    entry.downstream_consumers,
    `${registryKey}.downstream_consumers`,
  );

  if (
    entry.propagation_path[0] !==
    entry.owner
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: ${registryKey} propagation_path must begin with owner ${entry.owner}.`,
    );
  }

  if (
    entry.source_contract !==
    entry.contract_source
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-006 SEMANTIC_MUTATION: cross-cutting ${registryKey}.source_contract diverges from contract_source.`,
    );
  }

  if (
    entry.visibility !==
    entry.exposure_level
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-006 SEMANTIC_MUTATION: cross-cutting ${registryKey}.visibility diverges from exposure_level.`,
    );
  }

  if (
    entry.public_exposure_allowed &&
    entry.exposure_level !==
      "PUBLIC"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-005 ILLEGAL_PUBLIC_EXPOSURE: ${registryKey}.`,
    );
  }

  if (
    entry.public_exposure_rule ===
      "PRIVATE_ONLY" &&
    entry.public_exposure_allowed
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-005 ILLEGAL_PUBLIC_EXPOSURE: PRIVATE_ONLY cross-cutting variable ${registryKey} cannot allow public exposure.`,
    );
  }

  if (
    entry.lineage_status ===
      "ACTIVE" &&
    entry.availability_semantics ===
      "PLANNED_UNAVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-006 SEMANTIC_MUTATION: ACTIVE cross-cutting variable ${registryKey} cannot use PLANNED_UNAVAILABLE semantics.`,
    );
  }

  if (
    entry.lineage_status ===
      "PLANNED" &&
    entry.availability_semantics !==
      "PLANNED_UNAVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
        `VLR-003 BROKEN_LINEAGE: PLANNED cross-cutting variable ${registryKey} must use PLANNED_UNAVAILABLE semantics.`,
    );
  }
}

/* ============================================================================
 * 13. REFERENCE TARGET VALIDATION
 * ========================================================================== */

function isRegisteredSearchVariable(
  variableName:
    string,
): boolean {
  return (
    Object.prototype.hasOwnProperty.call(
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY,
      variableName,
    ) ||
    Object.prototype.hasOwnProperty.call(
      XYVALA_SEARCH_CROSS_CUTTING_VARIABLE_LINEAGE_REGISTRY,
      variableName,
    )
  );
}

function validateReferenceTargets():
  void {
  for (
    const variableName of
    XYVALA_SEARCH_REGISTERED_VARIABLE_NAMES
  ) {
    const entry =
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY[
        variableName
      ];

    if (
      entry.reference_target ===
      undefined
    ) {
      continue;
    }

    if (
      entry.reference_target ===
      variableName
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
          `VLR-009 REFERENCE_WITHOUT_CANONICAL_TARGET: ${variableName} cannot reference itself.`,
      );
    }

    if (
      !isRegisteredSearchVariable(
        entry.reference_target,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
          `VLR-009 REFERENCE_WITHOUT_CANONICAL_TARGET: ${variableName} -> ${entry.reference_target}.`,
      );
    }

    if (
      entry.category !==
        "REFERENCE" &&
      entry.category !==
        "TRANSPORT"
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
          `VLR-006 SEMANTIC_MUTATION: ${variableName} declares reference_target while category is ${entry.category}.`,
      );
    }

    if (
      entry.lineage_status ===
        "DEPRECATED" &&
      entry.replacement_variable !==
        entry.reference_target
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
          `VLR-003 BROKEN_LINEAGE: deprecated variable ${variableName} must reference its declared replacement_variable.`,
      );
    }
  }
}

/* ============================================================================
 * 14. COMPLETE REGISTRY VALIDATION
 * ========================================================================== */

export function validateSearchVariableLineageRegistry():
  void {
  for (
    const variableName of
    XYVALA_SEARCH_REGISTERED_VARIABLE_NAMES
  ) {
    validatePipelineRegistryEntry(
      variableName,
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY[
        variableName
      ],
    );
  }

  for (
    const variableName of
    XYVALA_SEARCH_REGISTERED_CROSS_CUTTING_VARIABLE_NAMES
  ) {
    validateCrossCuttingRegistryEntry(
      variableName,
      XYVALA_SEARCH_CROSS_CUTTING_VARIABLE_LINEAGE_REGISTRY[
        variableName
      ],
    );
  }

  validateReferenceTargets();
}

/* ============================================================================
 * 15. PIPELINE VARIABLE LOOKUP
 * ----------------------------------------------------------------------------
 * Generic lookup intentionally preserves exact literal entry identity.
 * ========================================================================== */

export function getSearchVariableLineageRegistryEntry<
  const TVariableName extends SearchRegisteredVariableName,
>(
  variableName:
    TVariableName,
): (
  typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
)[TVariableName] {
  return XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY[
    variableName
  ];
}

/* ============================================================================
 * 16. CROSS-CUTTING VARIABLE LOOKUP
 * ========================================================================== */

export function getSearchCrossCuttingVariableLineageRegistryEntry<
  const TVariableName extends SearchRegisteredCrossCuttingVariableName,
>(
  variableName:
    TVariableName,
): (
  typeof XYVALA_SEARCH_CROSS_CUTTING_VARIABLE_LINEAGE_REGISTRY
)[TVariableName] {
  return XYVALA_SEARCH_CROSS_CUTTING_VARIABLE_LINEAGE_REGISTRY[
    variableName
  ];
}

/* ============================================================================
 * 17. RUNTIME LINEAGE MATERIALIZATION INPUT
 * ========================================================================== */

export interface SearchVariableLineageMaterializationInput {
  readonly variable_name:
    SearchRegisteredVariableName;

  readonly producer_module_version:
    SearchModuleVersion;
}

/* ============================================================================
 * 18. CANONICAL SEARCH VARIABLE LINEAGE MATERIALIZATION
 * ========================================================================== */

export function materializeSearchVariableLineage(
  input:
    SearchVariableLineageMaterializationInput,
): SearchVariableLineage {
  assertNonEmptyString(
    input.producer_module_version,
    "producer_module_version",
  );

  const registryEntry =
    getSearchVariableLineageRegistryEntry(
      input.variable_name,
    );

  /*
 * Explicit lifecycle allow-list.
 *
 * ACTIVE:
 * - canonical runtime lineage.
 *
 * DEPRECATED:
 * - permitted only for explicit compatibility inspection;
 * - Section 21 still excludes DEPRECATED entries from automatic private
 *   snapshot lineage materialization.
 *
 * Any other current or future lifecycle state is rejected by default.
 */
if (
  registryEntry.lineage_status !== "ACTIVE" &&
  registryEntry.lineage_status !== "DEPRECATED"
) {
  throw new Error(
    `[${XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME}] ` +
      `Runtime lineage materialization forbidden for ` +
      `${registryEntry.variable_name} with status ` +
      `${registryEntry.lineage_status}.`,
  );
}

  const materialized:
    SearchVariableLineage = {
    contract_version:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_CONTRACT_VERSION,

    variable_name:
      registryEntry.variable_name,

    ownership_layer:
      registryEntry.ownership_layer,

    source_truth:
      registryEntry.source_truth,

    contract_source:
      registryEntry.contract_source,

    category:
      registryEntry.category,

    criticality_level:
      registryEntry.criticality_level,

    exposure_level:
      registryEntry.exposure_level,

    propagation_path:
      Object.freeze([
        ...registryEntry.propagation_path,
      ]),

    upstream_dependencies:
      Object.freeze([
        ...registryEntry.upstream_dependencies,
      ]),

    downstream_consumers:
      Object.freeze([
        ...registryEntry.downstream_consumers,
      ]),

    reconstruction_allowed:
      false,

    public_exposure_allowed:
      registryEntry.public_exposure_allowed,

    validation_required:
      true,

    lineage_status:
      registryEntry.lineage_status,

    protocol_reference:
      registryEntry.protocol_reference,

    producer_module:
      registryEntry.producer_module,

    producer_module_version:
      input.producer_module_version,

    validation_state:
      registryEntry.validation_state,

    data_type:
      registryEntry.data_type,

    nullable:
      registryEntry.nullable,

    availability_semantics:
      registryEntry.availability_semantics,

    schema_version:
      registryEntry.schema_version,

    introduced_in_version:
      registryEntry.introduced_in_version,

    ...(registryEntry.allowed_values
      ? {
          allowed_values:
            Object.freeze([
              ...registryEntry.allowed_values,
            ]),
        }
      : {}),

    ...(registryEntry.unit
      ? {
          unit:
            registryEntry.unit,
        }
      : {}),

    ...(registryEntry.minimum_value !==
      undefined
      ? {
          minimum_value:
            registryEntry.minimum_value,
        }
      : {}),

    ...(registryEntry.maximum_value !==
      undefined
      ? {
          maximum_value:
            registryEntry.maximum_value,
        }
      : {}),

    ...(registryEntry.reference_target
      ? {
          reference_target:
            registryEntry.reference_target,
        }
      : {}),

    ...(registryEntry.projection_source
      ? {
          projection_source:
            registryEntry.projection_source,
        }
      : {}),

    ...(registryEntry.deprecated_in_version
      ? {
          deprecated_in_version:
            registryEntry.deprecated_in_version,
        }
      : {}),

    ...(registryEntry.replacement_variable
      ? {
          replacement_variable:
            registryEntry.replacement_variable,
        }
      : {}),
  };

  return Object.freeze(
    materialized,
  );
}

/* ============================================================================
 * 19. SNAPSHOT LINEAGE VERSION RESOLUTION
 * ----------------------------------------------------------------------------
 * producer_layer remains a compatibility property name.
 *
 * Canonical VLR field remains ownership_layer.
 *
 * The version resolver must verify concordance and must never repair an
 * incorrect producer identity.
 * ========================================================================== */

export interface SearchVariableLineageProducerVersionResolutionInput {
  readonly variable_name:
    SearchRegisteredVariableName;

  readonly producer_layer:
    SearchPipelineLayer;

  readonly producer_module:
    string;
}

export type SearchVariableLineageProducerVersionResolver =
  (
    input:
      SearchVariableLineageProducerVersionResolutionInput,
  ) =>
    SearchModuleVersion;

/* ============================================================================
 * 20. PRIVATE SNAPSHOT LINEAGE MATERIALIZATION INPUT
 * ========================================================================== */

export interface SearchPrivateSnapshotVariableLineageMaterializationInput {
  readonly resolve_producer_module_version:
    SearchVariableLineageProducerVersionResolver;
}

/* ============================================================================
 * 21. PRIVATE SNAPSHOT LINEAGE MATERIALIZATION
 * ----------------------------------------------------------------------------
 * Snapshot membership is derived once from the canonical VLR:
 *
 * ACTIVE
 * +
 * snapshot_transport_required === true
 *
 * No PLANNED or DEPRECATED variable can silently enter the snapshot.
 * ========================================================================== */

export function materializeSearchPrivateSnapshotVariableLineage(
  input:
    SearchPrivateSnapshotVariableLineageMaterializationInput,
): readonly SearchVariableLineage[] {
  const lineage:
    SearchVariableLineage[] =
      [];

  for (
    const variableName of
    XYVALA_SEARCH_REGISTERED_ACTIVE_SNAPSHOT_VARIABLE_NAMES
  ) {
    const registryEntry =
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY[
        variableName
      ];

    const producerModuleVersion =
      input.resolve_producer_module_version({
        variable_name:
          variableName,

        /*
         * Compatibility transport name.
         *
         * Canonical VLR ownership remains ownership_layer.
         */
        producer_layer:
          registryEntry.ownership_layer,

        producer_module:
          registryEntry.producer_module,
      });

    assertNonEmptyString(
      producerModuleVersion,
      `producer_module_version:${variableName}`,
    );

    lineage.push(
      materializeSearchVariableLineage({
        variable_name:
          variableName,

        producer_module_version:
          producerModuleVersion,
      }),
    );
  }

  return Object.freeze([
    ...lineage,
  ]);
}

/* ============================================================================
 * 22. STATIC REGISTRY OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_OWNERSHIP =
  Object.freeze({
    registry_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    registry_module:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME,

    registry_contract_version:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_CONTRACT_VERSION,

    registry_schema_version:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_SCHEMA_VERSION,

    protocol_reference:
      XYVALA_SEARCH_VARIABLE_LINEAGE_PROTOCOL_REFERENCE,

    pipeline_variable_registry_owner:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME,

    cross_cutting_variable_registry_owner:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME,

    producer_module_identity_domain_owner:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME,

    producer_module_identity_domain_derived_from_registry:
      true,

    active_variable_domain_owner:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME,

    active_variable_domain_derived_from_registry:
      true,

    active_snapshot_variable_domain_owner:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME,

    active_snapshot_variable_domain_derived_from_registry:
      true,

    active_producer_module_version_owner:
      "CONFIGURED_CANONICAL_PRODUCER",

    snapshot_lineage_materialization_owner:
      XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY_MODULE_NAME,

    cross_cutting_runtime_lineage_materialization:
      "FORBIDDEN_WHEN_OWNER_CANNOT_BE_REPRESENTED_WITHOUT_SEMANTIC_MUTATION",

    reference_transport_transfers_ownership:
      false,

    temporal_published_at_truth_owner:
      "ACQUISITION",

    temporal_published_at_reference_boundary:
      "TEMPORAL_SIGNAL_DETECTION",

    penalty_value_truth_owner:
      "PENALTY_EVALUATION",

    aggregation_penalty_value_reference_boundary:
      "ANALYTICAL_AGGREGATION",

    query_identity_owner_module:
      "lib/xyvala/search/query/search-query-input-core.ts",

    cohort_identity_owner_module:
      "lib/xyvala/search/cohort/search-cohort-definition-input-core.ts",

    distribution_identity_owner_module:
      "lib/xyvala/search/cohort/search-distribution-identity-core.ts",

    snapshot_identity_owner_module:
      "lib/xyvala/search/snapshot/search-snapshot-identity-core.ts",

    execution_trace_identity_owner_module:
      "lib/xyvala/search/governance/search-execution-traceability-core.ts",

    planned_variable_runtime_materialization:
      false,

    deprecated_alias_snapshot_materialization:
      false,

    compatibility_aliases_are_independent_truth:
      false,

    analytical_truth_created:
      false,

    score_truth_created:
      false,

    eligibility_truth_created:
      false,

    cohort_truth_created:
      false,

    ranking_truth_created:
      false,

    identity_generated:
      false,

    runtime_clock_read:
      false,

    random_identity_generated:
      false,

    persistence_performed:
      false,

    calibration_current_cycle_feedback:
      false,
  } as const);
