/* ============================================================================
 * FILE:
 * lib/xyvala/search/governance/search-runtime-execution-descriptor-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical runtime execution descriptor registry
 *
 * ROLE
 * - govern the complete Search runtime execution-port domain
 * - associate every SearchRuntimePorts member with one explicit execution
 *   descriptor
 * - preserve canonical producer ownership
 * - distinguish canonical producer execution from runtime adaptation
 * - distinguish SearchPipelineLayer execution from transverse runtime
 *   boundaries
 * - define current Private Snapshot trace inclusion causality
 * - expose static execution facts without fabricating dynamic execution truth
 * - establish the contract-before-runtime source used by future execution
 *   observation
 *
 * CLASSIFICATION
 * - SEARCH GOVERNANCE
 * - EXECUTION GOVERNANCE
 * - RUNTIME EXECUTION DESCRIPTOR REGISTRY
 * - CROSS-CUTTING
 * - STATIC
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-COMPUTE
 * - NON-OBSERVE
 * - NON-MUTATE
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - PRIVATE
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * SearchRuntimePorts
 *        ↓
 * execution descriptor registry
 *        ↓
 * static contractual execution facts
 *        +
 * dynamic facts observed at legitimate execution boundaries
 *        ↓
 * SearchExecutionTraceObservationInput
 *        ↓
 * EXECUTION_TRACEABILITY
 *        ↓
 * SearchTraceRecord
 *
 * IN PARALLEL
 * ----------------------------------------------------------------------------
 *
 * VARIABLE_LINEAGE_GOVERNANCE
 *        ↓
 * SearchVariableLineage[]
 *
 * THEN
 * ----------------------------------------------------------------------------
 *
 * SearchTraceRecord[]
 *        +
 * SearchVariableLineage[]
 *        ↓
 * resolve_snapshot_traceability
 *        ↓
 * PRIVATE_SNAPSHOT
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * SearchRuntimePorts remains the canonical runtime dependency contract.
 *
 * This registry is exhaustively typed against:
 *
 * keyof SearchRuntimePorts
 *
 * Therefore:
 *
 * new runtime port
 * + missing execution descriptor
 * => compile-time divergence
 *
 * removed runtime port
 * + stale execution descriptor
 * => compile-time divergence
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This registry is NOT a second runtime-port contract.
 *
 * It does not declare callable signatures.
 *
 * It only governs the execution identity and causal role of ports already
 * declared by SearchRuntimePorts.
 *
 * STATIC FACTS VS DYNAMIC FACTS
 * ----------------------------------------------------------------------------
 * This registry may contain static facts already established by architecture:
 *
 * - runtime port identity;
 * - canonical ownership domain;
 * - binding kind;
 * - canonical producer file/function when already known;
 * - runtime input/output contract names;
 * - SearchPipelineLayer membership where contractually valid;
 * - current Private Snapshot trace causality;
 * - whether policy provenance must be observed dynamically;
 * - whether external observation/provider provenance must be observed
 *   dynamically.
 *
 * This registry MUST NOT fabricate dynamic execution facts such as:
 *
 * - actual module_version used at runtime;
 * - actual method identity when not contractually supplied;
 * - actual producer input contracts after adaptation;
 * - actual producer output contract after adaptation;
 * - actual policy_version;
 * - actual provider identity;
 * - actual missing_data;
 * - actual confidence;
 * - actual validation_state;
 * - actual duration_ms.
 *
 * Those facts must be explicitly observed at their legitimate execution
 * boundaries.
 *
 * IMPORTANT METHOD RULE
 * ----------------------------------------------------------------------------
 * canonical_producer.function_name is producer-reference governance metadata.
 *
 * It MUST NOT automatically become:
 *
 * SearchTraceRecord.method
 *
 * The execution observer must receive the actual canonical method descriptor
 * explicitly.
 *
 * IMPORTANT CONTRACT RULE
 * ----------------------------------------------------------------------------
 * runtime_input_contract / runtime_output_contract describe the Search runtime
 * port boundary.
 *
 * They MUST NOT automatically become:
 *
 * SearchTraceRecord.input_contracts
 * SearchTraceRecord.output_contract
 *
 * An adapted runtime port may invoke a canonical producer through another
 * producer-specific input shape.
 *
 * The actual producer contracts must therefore remain explicit execution
 * observation facts.
 *
 * PIPELINE-LAYER GOVERNANCE
 * ----------------------------------------------------------------------------
 * Not every Search runtime port is a SearchPipelineLayer.
 *
 * In particular:
 *
 * resolve_distribution_id
 * -> SEARCH_DISTRIBUTION_IDENTITY
 * -> transverse identity producer
 *
 * build_cohort_batch
 * -> SEARCH_COHORT_BATCH
 * -> canonical transport boundary
 *
 * resolve_snapshot_id
 * -> SEARCH_SNAPSHOT_IDENTITY
 * -> transverse identity producer
 *
 * resolve_snapshot_traceability
 * -> transport boundary for existing governance truth
 *
 * These ports MUST NOT receive a fabricated SearchPipelineLayer merely to make
 * them fit SearchTraceRecord.
 *
 * PRIVATE SNAPSHOT TRACE CAUSALITY
 * ----------------------------------------------------------------------------
 * SearchTraceRecord[] embedded in one Private Snapshot may only contain
 * execution truth that already exists before that snapshot is constructed.
 *
 * Therefore:
 *
 * build_private_snapshot
 * - belongs to PRIVATE_SNAPSHOT;
 * - cannot be embedded as a trace inside the same snapshot that its execution
 *   creates without creating a causal cycle.
 *
 * resolve_snapshot_traceability
 * - cannot include its own execution trace in the trace collection it is
 *   resolving without self-reference.
 *
 * transform_public_result
 * rank_public_results
 * - occur after Private Snapshot construction;
 * - cannot belong to that snapshot's upstream execution-trace collection.
 *
 * This does NOT mean those executions can never be observed elsewhere.
 *
 * It means they cannot be retroactively inserted into the already constructed
 * current Private Snapshot.
 *
 * QUERY GOVERNANCE
 * ----------------------------------------------------------------------------
 * The current runtime exposes one:
 *
 * analyze_query
 *
 * port producing canonical SearchQueryProfile truth.
 *
 * Its runtime owner is QUERY_PROFILING.
 *
 * This registry does NOT invent a second QUERY_NORMALIZATION runtime
 * invocation.
 *
 * Any internal Query Normalization performed by the canonical query producer
 * remains producer-owned unless/until the runtime contract exposes it as a
 * distinct execution.
 *
 * DIRECTIVES
 * - complete runtime-port descriptor coverage
 * - one descriptor per runtime port
 * - no runtime-port signature duplication
 * - no producer execution
 * - no producer wrapping
 * - no producer substitution
 * - no trace production
 * - no trace reconstruction
 * - no lineage production
 * - no lineage reconstruction
 * - no policy resolution
 * - no observation resolution
 * - no runtime clock
 * - no Date.now()
 * - no new Date()
 * - no random identity
 * - no persistence
 * - no logging
 * - no network access
 * - no inferred SearchPipelineLayer
 * - no inferred method
 * - no inferred module_version
 * - no inferred producer contracts
 * - no inferred policy_version
 * - no inferred confidence
 * - no inferred missing_data
 * - no inferred duration
 *
 * INVARIANTS
 * - every SearchRuntimePorts member has exactly one descriptor
 * - no unknown runtime port has a descriptor
 * - descriptor.port_name equals its registry key
 * - canonical producer reference is preserved as metadata only
 * - adapted producers remain adapter-mediated
 * - direct producers remain exact direct bindings
 * - external providers remain externally described
 * - non-pipeline boundaries never receive fabricated pipeline layers
 * - current-snapshot trace scope respects execution causality
 * - registry alone is insufficient to produce SearchTraceRecord
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * runtime port exists without descriptor
 * => execution-governance coverage boundary
 *
 * descriptor exists without runtime port
 * => stale execution-governance boundary
 *
 * descriptor port_name differs from registry key
 * => descriptor identity violation
 *
 * canonical producer reference differs from configured architecture
 * => producer-reference governance boundary
 *
 * non-pipeline runtime boundary receives SearchPipelineLayer
 * => pipeline-layer fabrication violation
 *
 * registry function_name used automatically as SearchTraceRecord.method
 * => execution-observation reconstruction violation
 *
 * runtime contract name used automatically as producer trace contract
 * => producer-contract reconstruction violation
 *
 * static registry invents policy_version/provider/confidence/missing_data
 * => dynamic execution-truth fabrication
 *
 * current snapshot includes build_private_snapshot execution trace
 * => causal cycle
 *
 * resolve_snapshot_traceability traces itself into its own result
 * => self-reference cycle
 *
 * Transformation/Public Ranking trace inserted into upstream snapshot
 * => downstream-to-upstream reconstruction
 * ========================================================================== */

import type {
  SearchModuleVersion,
  SearchTraceRecord,
} from "../contracts/search-pipeline-contract";

import type {
  SearchRuntimePorts,
} from "../runtime/search-runtime-orchestrator";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_MODULE_NAME =
  "xyvala-search-runtime-execution-descriptor-registry" as const;

export const XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. RUNTIME PORT IDENTITY
 * ========================================================================== */

export type SearchRuntimeExecutionPortName =
  keyof SearchRuntimePorts;

/* ============================================================================
 * 3. BINDING KIND
 * ----------------------------------------------------------------------------
 * DIRECT_CANONICAL
 * - bootstrap binds an existing canonical producer by exact reference.
 *
 * ADAPTED_CANONICAL
 * - runtime invokes an adapter which legitimately transports policy /
 *   observation / shape requirements into one canonical producer.
 *
 * EXTERNAL_AUTHORIZED
 * - implementation identity remains explicit application/infrastructure
 *   configuration.
 * ========================================================================== */

export type SearchRuntimeExecutionBindingKind =
  | "DIRECT_CANONICAL"
  | "ADAPTED_CANONICAL"
  | "EXTERNAL_AUTHORIZED";

/* ============================================================================
 * 4. CURRENT PRIVATE SNAPSHOT TRACE SCOPE
 * ----------------------------------------------------------------------------
 * CURRENT_PRIVATE_SNAPSHOT
 * - execution occurs before trace resolution and is a legitimate candidate for
 *   the current snapshot's SearchTraceRecord collection.
 *
 * NON_PIPELINE_RUNTIME_BOUNDARY
 * - runtime execution exists, but it is not a SearchPipelineLayer and must not
 *   receive a fabricated layer merely to create SearchTraceRecord.
 *
 * TRACEABILITY_TRANSPORT_BOUNDARY
 * - trace transport itself; including its own trace would self-reference.
 *
 * CURRENT_SNAPSHOT_CAUSAL_BOUNDARY
 * - producer creates the snapshot that would contain the trace, therefore the
 *   execution cannot be inserted into that same snapshot without a cycle.
 *
 * POST_SNAPSHOT
 * - execution occurs after Private Snapshot and cannot be reconstructed back
 *   into that snapshot.
 * ========================================================================== */

export type SearchRuntimeCurrentSnapshotTraceScope =
  | "CURRENT_PRIVATE_SNAPSHOT"
  | "NON_PIPELINE_RUNTIME_BOUNDARY"
  | "TRACEABILITY_TRANSPORT_BOUNDARY"
  | "CURRENT_SNAPSHOT_CAUSAL_BOUNDARY"
  | "POST_SNAPSHOT";

/* ============================================================================
 * 5. STATIC MODULE-IDENTITY SOURCE
 * ========================================================================== */

export type SearchRuntimeExecutionModuleIdentitySource =
  | "CANONICAL_PRODUCER"
  | "EXTERNAL_PROVIDER"
  | "TRACEABILITY_TRANSPORT_PROVIDER";

/* ============================================================================
 * 6. CANONICAL PRODUCER REFERENCE
 * ----------------------------------------------------------------------------
 * Metadata only.
 *
 * function_name does NOT automatically become SearchTraceRecord.method.
 * ========================================================================== */

export interface SearchRuntimeCanonicalProducerReference {
  readonly module_path:
    string;

  readonly function_name:
    string;
}

/* ============================================================================
 * 7. EXECUTION DESCRIPTOR
 * ========================================================================== */

export interface SearchRuntimeExecutionDescriptor<
  TPortName extends SearchRuntimeExecutionPortName =
    SearchRuntimeExecutionPortName,

  TTraceScope extends SearchRuntimeCurrentSnapshotTraceScope =
    SearchRuntimeCurrentSnapshotTraceScope,
> {
  readonly port_name:
    TPortName;

  readonly canonical_owner:
    string | null;

  readonly transported_truth_owners:
    readonly string[];

  readonly binding_kind:
    SearchRuntimeExecutionBindingKind;

  readonly canonical_producer:
    SearchRuntimeCanonicalProducerReference | null;

  readonly module_identity_source:
    SearchRuntimeExecutionModuleIdentitySource;

  readonly runtime_input_contract:
    string;

  readonly runtime_output_contract:
    string;

  readonly pipeline_layer:
    SearchTraceRecord["layer"] | null;

  /**
   * IMPORTANT
   *
   * Trace scope remains a generic discriminant so its exact literal identity
   * survives descriptor construction.
   *
   * This is required for downstream contract-governance derivation.
   */
  readonly current_snapshot_trace_scope:
    TTraceScope;

  readonly requires_dynamic_policy_provenance:
    boolean;

  readonly requires_dynamic_observation_provenance:
    boolean;

  readonly requires_external_provider_identity:
    boolean;
}

/* ============================================================================
 * 8. REGISTRY CONTRACT
 * ----------------------------------------------------------------------------
 * Exact mapped coverage.
 *
 * Every SearchRuntimePorts key must exist exactly once.
 * ========================================================================== */

export type SearchRuntimeExecutionDescriptorRegistry =
  Readonly<{
    [TPortName in SearchRuntimeExecutionPortName]:
      SearchRuntimeExecutionDescriptor<TPortName>;
  }>;

/* ============================================================================
 * 9. DESCRIPTOR FACTORY
 * ----------------------------------------------------------------------------
 * Runtime immutability only.
 *
 * Creates no execution truth.
 * ========================================================================== */

function defineSearchRuntimeExecutionDescriptor<
  TPortName extends SearchRuntimeExecutionPortName,

  TTraceScope extends SearchRuntimeCurrentSnapshotTraceScope,
>(
  descriptor:
    SearchRuntimeExecutionDescriptor<
      TPortName,
      TTraceScope
    >,
): SearchRuntimeExecutionDescriptor<
  TPortName,
  TTraceScope
> {
  return Object.freeze({
    ...descriptor,

    transported_truth_owners:
      Object.freeze([
        ...descriptor
          .transported_truth_owners,
      ]),

    canonical_producer:
      descriptor.canonical_producer ===
      null
        ? null
        : Object.freeze({
            ...descriptor
              .canonical_producer,
          }),
  });
}

/* ============================================================================
 * 10. COMPLETE CANONICAL EXECUTION DESCRIPTOR REGISTRY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY =
  Object.freeze({
    /* ------------------------------------------------------------------------
     * ACQUISITION
     * --------------------------------------------------------------------- */

    acquire_documents:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "acquire_documents",

        canonical_owner:
          "ACQUISITION",

        transported_truth_owners:
          [],

        binding_kind:
          "EXTERNAL_AUTHORIZED",

        canonical_producer:
          null,

        module_identity_source:
          "EXTERNAL_PROVIDER",

        runtime_input_contract:
          "SearchRuntimeAcquisitionInput",

        runtime_output_contract:
          "readonly SearchRawDocument[]",

        pipeline_layer:
          "ACQUISITION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          true,

        requires_external_provider_identity:
          true,
      }),

    /* ------------------------------------------------------------------------
     * EXTRACTION
     * --------------------------------------------------------------------- */

    extract_document:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "extract_document",

        canonical_owner:
          "EXTRACTION",

        transported_truth_owners:
          [],

        binding_kind:
          "DIRECT_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/extraction/search-extraction-core.ts",

            function_name:
              "buildSearchExtractedDocument",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeExtractionInput",

        runtime_output_contract:
          "SearchExtractedDocument",

        pipeline_layer:
          "EXTRACTION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * SEGMENTATION
     * --------------------------------------------------------------------- */

    segment_document:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "segment_document",

        canonical_owner:
          "SEGMENTATION",

        transported_truth_owners:
          [],

        binding_kind:
          "DIRECT_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/segmentation/search-segmentation-core.ts",

            function_name:
              "buildSearchSegmentedDocument",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeSegmentationInput",

        runtime_output_contract:
          "SearchSegmentedDocument",

        pipeline_layer:
          "SEGMENTATION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * LEXICAL ANALYSIS
     * --------------------------------------------------------------------- */

    analyze_lexical_document:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "analyze_lexical_document",

        canonical_owner:
          "LEXICAL_ANALYSIS",

        transported_truth_owners:
          [],

        binding_kind:
          "DIRECT_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/lexical/search-lexical-analysis-core.ts",

            function_name:
              "buildSearchLexicalDocument",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeLexicalAnalysisInput",

        runtime_output_contract:
          "SearchLexicalDocument",

        pipeline_layer:
          "LEXICAL_ANALYSIS",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * FREQUENCY SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_frequency_signals:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "detect_frequency_signals",

        canonical_owner:
          "FREQUENCY_SIGNAL_DETECTION",

        transported_truth_owners:
          [],

        binding_kind:
          "DIRECT_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/signals/search-frequency-signals-core.ts",

            function_name:
              "buildSearchFrequencySignals",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeFrequencySignalsInput",

        runtime_output_contract:
          "SearchFrequencySignals",

        pipeline_layer:
          "FREQUENCY_SIGNAL_DETECTION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * ANCHOR SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_anchor_signals:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "detect_anchor_signals",

        canonical_owner:
          "ANCHOR_SIGNAL_DETECTION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/signals/search-anchor-signals-core.ts",

            function_name:
              "buildSearchAnchorSignals",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeAnchorSignalsInput",

        runtime_output_contract:
          "SearchAnchorSignals",

        pipeline_layer:
          "ANCHOR_SIGNAL_DETECTION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * CONTEXT AGGREGATION
     * --------------------------------------------------------------------- */

    aggregate_context:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "aggregate_context",

        canonical_owner:
          "CONTEXT_AGGREGATION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/aggregation/search-context-aggregation-core.ts",

            function_name:
              "buildSearchContextAggregation",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeContextAggregationInput",

        runtime_output_contract:
          "SearchContextAggregation",

        pipeline_layer:
          "CONTEXT_AGGREGATION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * LINK SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_link_signals:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "detect_link_signals",

        canonical_owner:
          "LINK_SIGNAL_DETECTION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/signals/search-link-signals-search-core.ts",

            function_name:
              "buildSearchLinkSignals",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeLinkSignalsInput",

        runtime_output_contract:
          "SearchLinkSignals",

        pipeline_layer:
          "LINK_SIGNAL_DETECTION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          true,

        requires_external_provider_identity:
          true,
      }),

    /* ------------------------------------------------------------------------
     * TEMPORAL SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_temporal_signals:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "detect_temporal_signals",

        canonical_owner:
          "TEMPORAL_SIGNAL_DETECTION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/temporal/search-temporal-signals-search.ts",

            function_name:
              "runSearchTemporalSignalsSearch",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeTemporalSignalsInput",

        runtime_output_contract:
          "SearchTemporalSignals",

        pipeline_layer:
          "TEMPORAL_SIGNAL_DETECTION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          true,

        requires_external_provider_identity:
          true,
      }),

    /* ------------------------------------------------------------------------
     * BEHAVIORAL SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_behavioral_signals:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "detect_behavioral_signals",

        canonical_owner:
          "BEHAVIORAL_SIGNAL_DETECTION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts",

            function_name:
              "buildSearchBehavioralSignals",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeBehavioralSignalsInput",

        runtime_output_contract:
          "SearchBehavioralSignals",

        pipeline_layer:
          "BEHAVIORAL_SIGNAL_DETECTION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          true,

        requires_external_provider_identity:
          true,
      }),

    /* ------------------------------------------------------------------------
     * QUERY PROFILING
     *
     * No synthetic second runtime invocation is created for QUERY_NORMALIZATION.
     * --------------------------------------------------------------------- */

    analyze_query:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "analyze_query",

        canonical_owner:
          "QUERY_PROFILING",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/query/search-query-analysis-core.ts",

            function_name:
              "buildSearchQueryProfile",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeQueryAnalysisInput",

        runtime_output_contract:
          "SearchQueryProfile",

        pipeline_layer:
          "QUERY_PROFILING",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * QUERY-DOCUMENT SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_query_document_signals:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "detect_query_document_signals",

        canonical_owner:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/query/search-query-document-signals-core.ts",

            function_name:
              "buildSearchQueryDocumentSignals",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeQueryDocumentSignalsInput",

        runtime_output_contract:
          "SearchQueryDocumentSignals",

        pipeline_layer:
          "QUERY_DOCUMENT_SIGNAL_DETECTION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * INTRINSIC DOCUMENT SCORING
     * --------------------------------------------------------------------- */

    score_intrinsic_document:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "score_intrinsic_document",

        canonical_owner:
          "INTRINSIC_DOCUMENT_SCORING",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/scoring/search-document-scoring-core.ts",

            function_name:
              "computeSearchIntrinsicDocumentScoreVector",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeIntrinsicScoringInput",

        runtime_output_contract:
          "SearchIntrinsicDocumentScoreVector",

        pipeline_layer:
          "INTRINSIC_DOCUMENT_SCORING",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * TEMPORAL DOCUMENT SCORING
     * --------------------------------------------------------------------- */

    score_temporal_document:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "score_temporal_document",

        canonical_owner:
          "TEMPORAL_DOCUMENT_SCORING",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/scoring/search-temporal-document-scoring-core.ts",

            function_name:
              "computeSearchTemporalDocumentScoreVector",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeTemporalScoringInput",

        runtime_output_contract:
          "SearchTemporalDocumentScoreVector",

        pipeline_layer:
          "TEMPORAL_DOCUMENT_SCORING",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * QUERY RELEVANCE SCORING
     * --------------------------------------------------------------------- */

    score_query_relevance:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "score_query_relevance",

        canonical_owner:
          "QUERY_RELEVANCE_SCORING",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/scoring/search-query-relevance-scoring-core.ts",

            function_name:
              "computeSearchQueryRelativeScoreVector",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeQueryRelevanceScoringInput",

        runtime_output_contract:
          "SearchQueryRelativeScoreVector",

        pipeline_layer:
          "QUERY_RELEVANCE_SCORING",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * LINK AUTHORITY SCORING
     * --------------------------------------------------------------------- */

    score_link_authority:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "score_link_authority",

        canonical_owner:
          "LINK_AUTHORITY_SCORING",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/scoring/search-link-authority-scoring-core.ts",

            function_name:
              "computeSearchLinkAuthorityScoreVector",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeLinkAuthorityScoringInput",

        runtime_output_contract:
          "SearchOptionalEvidence<SearchLinkAuthorityScoreVector>",

        pipeline_layer:
          "LINK_AUTHORITY_SCORING",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * BEHAVIORAL CALIBRATION SCORING
     * --------------------------------------------------------------------- */

    score_behavioral_calibration:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "score_behavioral_calibration",

        canonical_owner:
          "BEHAVIORAL_CALIBRATION_SCORING",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/scoring/search-behavioral-calibration-scoring-core.ts",

            function_name:
              "computeSearchBehavioralCalibrationScoreVector",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeBehavioralCalibrationScoringInput",

        runtime_output_contract:
          "SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector>",

        pipeline_layer:
          "BEHAVIORAL_CALIBRATION_SCORING",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * POSITIVE SCORE ASSEMBLY
     * --------------------------------------------------------------------- */

    assemble_positive_score_vector:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "assemble_positive_score_vector",

        canonical_owner:
          "POSITIVE_SCORE_ASSEMBLY",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/scoring/search-positive-score-assembler.ts",

            function_name:
              "assembleSearchPositiveScoreVector",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimePositiveScoreAssemblyInput",

        runtime_output_contract:
          "SearchPositiveScoreVector",

        pipeline_layer:
          "POSITIVE_SCORE_ASSEMBLY",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * PENALTY EVALUATION
     * --------------------------------------------------------------------- */

    evaluate_penalties:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "evaluate_penalties",

        canonical_owner:
          "PENALTY_EVALUATION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/scoring/search-penalty-evaluation-core.ts",

            function_name:
              "evaluateSearchPenalties",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimePenaltyEvaluationInput",

        runtime_output_contract:
          "SearchPenaltyVector",

        pipeline_layer:
          "PENALTY_EVALUATION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * ANALYTICAL AGGREGATION
     * --------------------------------------------------------------------- */

    aggregate_analytical_score:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "aggregate_analytical_score",

        canonical_owner:
          "ANALYTICAL_AGGREGATION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts",

            function_name:
              "aggregateSearchAnalyticalScores",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeAnalyticalAggregationInput",

        runtime_output_contract:
          "SearchGlobalScore",

        pipeline_layer:
          "ANALYTICAL_AGGREGATION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * ELIGIBILITY
     * --------------------------------------------------------------------- */

    evaluate_eligibility:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "evaluate_eligibility",

        canonical_owner:
          "ELIGIBILITY_EVALUATION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/eligibility/search-eligibility-evaluation-core.ts",

            function_name:
              "evaluateSearchEligibility",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeEligibilityInput",

        runtime_output_contract:
          "SearchEligibilityResult",

        pipeline_layer:
          "ELIGIBILITY_EVALUATION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * DISTRIBUTION IDENTITY
     *
     * Transverse identity producer.
     * NOT a SearchPipelineLayer.
     * --------------------------------------------------------------------- */

    resolve_distribution_id:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "resolve_distribution_id",

        canonical_owner:
          "SEARCH_DISTRIBUTION_IDENTITY",

        transported_truth_owners:
          [],

        binding_kind:
          "DIRECT_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/cohort/search-distribution-identity-core.ts",

            function_name:
              "buildSearchDistributionId",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeDistributionIdentityInput",

        runtime_output_contract:
          "SearchDistributionId",

        pipeline_layer:
          null,

        current_snapshot_trace_scope:
          "NON_PIPELINE_RUNTIME_BOUNDARY",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * SEARCH_COHORT_BATCH
     *
     * Canonical transport boundary.
     * Explicitly NOT a SearchPipelineLayer.
     * --------------------------------------------------------------------- */

    build_cohort_batch:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "build_cohort_batch",

        canonical_owner:
          "SEARCH_COHORT_BATCH",

        transported_truth_owners:
          [],

        binding_kind:
          "DIRECT_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/cohort/search-cohort-batch-core.ts",

            function_name:
              "buildSearchCohortBatch",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeCohortBatchInput",

        runtime_output_contract:
          "SearchCohortBatch",

        pipeline_layer:
          null,

        current_snapshot_trace_scope:
          "NON_PIPELINE_RUNTIME_BOUNDARY",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * COHORT NORMALIZATION
     * --------------------------------------------------------------------- */

    normalize_cohort:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "normalize_cohort",

        canonical_owner:
          "COHORT_NORMALIZATION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/cohort/search-cohort-normalization-core.ts",

            function_name:
              "normalizeSearchCohort",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeCohortNormalizationInput",

        runtime_output_contract:
          "SearchOptionalEvidence<SearchCohortDistribution>",

        pipeline_layer:
          "COHORT_NORMALIZATION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * RELATIVE COHORT EVALUATION
     * --------------------------------------------------------------------- */

    evaluate_relative_cohort:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "evaluate_relative_cohort",

        canonical_owner:
          "RELATIVE_COHORT_EVALUATION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts",

            function_name:
              "evaluateSearchRelativeCohort",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeRelativeEvaluationInput",

        runtime_output_contract:
          "SearchOptionalEvidence<SearchRelativeEvaluationContext>",

        pipeline_layer:
          "RELATIVE_COHORT_EVALUATION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * PRIVATE DECISION
     * --------------------------------------------------------------------- */

    resolve_private_decision:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "resolve_private_decision",

        canonical_owner:
          "PRIVATE_DECISION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/decision/search-private-decision-core.ts",

            function_name:
              "runSearchPrivateDecision",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimePrivateDecisionInput",

        runtime_output_contract:
          "SearchPrivateDecision",

        pipeline_layer:
          "PRIVATE_DECISION",

        current_snapshot_trace_scope:
          "CURRENT_PRIVATE_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * SNAPSHOT IDENTITY
     *
     * Transverse identity producer.
     * NOT a SearchPipelineLayer.
     * --------------------------------------------------------------------- */

    resolve_snapshot_id:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "resolve_snapshot_id",

        canonical_owner:
          "SEARCH_SNAPSHOT_IDENTITY",

        transported_truth_owners:
          [],

        binding_kind:
          "DIRECT_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/snapshot/search-snapshot-identity-core.ts",

            function_name:
              "buildSearchSnapshotId",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimeSnapshotIdentityInput",

        runtime_output_contract:
          "SearchPrivateDocumentSnapshot.snapshot_id",

        pipeline_layer:
          null,

        current_snapshot_trace_scope:
          "NON_PIPELINE_RUNTIME_BOUNDARY",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * SNAPSHOT TRACEABILITY TRANSPORT
     *
     * Not a SearchPipelineLayer.
     *
     * It transports existing truths owned by:
     * - EXECUTION_TRACEABILITY
     * - VARIABLE_LINEAGE_GOVERNANCE
     *
     * It cannot trace itself into its own result.
     * --------------------------------------------------------------------- */

    resolve_snapshot_traceability:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "resolve_snapshot_traceability",

        canonical_owner:
          null,

        transported_truth_owners:
          [
            "EXECUTION_TRACEABILITY",
            "VARIABLE_LINEAGE_GOVERNANCE",
          ],

        binding_kind:
          "EXTERNAL_AUTHORIZED",

        canonical_producer:
          null,

        module_identity_source:
          "TRACEABILITY_TRANSPORT_PROVIDER",

        runtime_input_contract:
          "SearchRuntimeTraceabilityInput",

        runtime_output_contract:
          "SearchRuntimeSnapshotTraceability",

        pipeline_layer:
          null,

        current_snapshot_trace_scope:
          "TRACEABILITY_TRANSPORT_BOUNDARY",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          true,
      }),

    /* ------------------------------------------------------------------------
     * PRIVATE SNAPSHOT
     *
     * It is a real SearchPipelineLayer.
     *
     * However its execution cannot be placed inside the same snapshot that the
     * execution itself is creating.
     * --------------------------------------------------------------------- */

    build_private_snapshot:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "build_private_snapshot",

        canonical_owner:
          "PRIVATE_SNAPSHOT",

        transported_truth_owners:
          [],

        binding_kind:
          "DIRECT_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/snapshot/search-private-snapshot-builder.ts",

            function_name:
              "buildSearchPrivateDocumentSnapshot",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimePrivateSnapshotInput",

        runtime_output_contract:
          "SearchPrivateDocumentSnapshot",

        pipeline_layer:
          "PRIVATE_SNAPSHOT",

        current_snapshot_trace_scope:
          "CURRENT_SNAPSHOT_CAUSAL_BOUNDARY",

        requires_dynamic_policy_provenance:
          false,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * PUBLIC TRANSFORMATION
     *
     * Occurs after Private Snapshot creation.
     * --------------------------------------------------------------------- */

    transform_public_result:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "transform_public_result",

        canonical_owner:
          "TRANSFORMATION",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/transformers/search-public-result-transformer.ts",

            function_name:
              "transformSearchPrivateSnapshotToPublicResult",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimePublicTransformationInput",

        runtime_output_contract:
          "SearchPublicResultCandidate",

        pipeline_layer:
          "TRANSFORMATION",

        current_snapshot_trace_scope:
          "POST_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),

    /* ------------------------------------------------------------------------
     * PUBLIC RANKING
     *
     * Occurs after Transformation and after Private Snapshot creation.
     * --------------------------------------------------------------------- */

    rank_public_results:
      defineSearchRuntimeExecutionDescriptor({
        port_name:
          "rank_public_results",

        canonical_owner:
          "PUBLIC_RANKING",

        transported_truth_owners:
          [],

        binding_kind:
          "ADAPTED_CANONICAL",

        canonical_producer:
          {
            module_path:
              "lib/xyvala/search/ranking/search-public-ranking-core.ts",

            function_name:
              "rankSearchPublicResults",
          },

        module_identity_source:
          "CANONICAL_PRODUCER",

        runtime_input_contract:
          "SearchRuntimePublicRankingInput",

        runtime_output_contract:
          "SearchPublicRankingProjection",

        pipeline_layer:
          "PUBLIC_RANKING",

        current_snapshot_trace_scope:
          "POST_SNAPSHOT",

        requires_dynamic_policy_provenance:
          true,

        requires_dynamic_observation_provenance:
          false,

        requires_external_provider_identity:
          false,
      }),
  } satisfies SearchRuntimeExecutionDescriptorRegistry);

/* ============================================================================
 * 11. COMPILE-TIME EXACT COVERAGE
 * ========================================================================== */

type SearchRuntimeExecutionDescriptorDeclaredPortName =
  keyof typeof XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY;

type SearchRuntimeExecutionDescriptorMissingPort =
  Exclude<
    SearchRuntimeExecutionPortName,
    SearchRuntimeExecutionDescriptorDeclaredPortName
  >;

type SearchRuntimeExecutionDescriptorUnknownPort =
  Exclude<
    SearchRuntimeExecutionDescriptorDeclaredPortName,
    SearchRuntimeExecutionPortName
  >;

type SearchRuntimeExecutionDescriptorCoverageIsExact =
  [
    SearchRuntimeExecutionDescriptorMissingPort,
    SearchRuntimeExecutionDescriptorUnknownPort,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_COVERAGE_IS_EXACT:
  SearchRuntimeExecutionDescriptorCoverageIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_COVERAGE_IS_EXACT;

/* ============================================================================
 * 12. BASIC VALIDATION HELPERS
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
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_MODULE_NAME}] ` +
        `Execution descriptor violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 13. DESCRIPTOR VALIDATION
 * ========================================================================== */

function validateSearchRuntimeExecutionDescriptor(
  portName:
    SearchRuntimeExecutionPortName,

  descriptor:
    SearchRuntimeExecutionDescriptor,
): void {
  if (
    descriptor.port_name !==
    portName
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_MODULE_NAME}] ` +
        `Execution descriptor violation: registry key ${portName} contains descriptor for ${descriptor.port_name}.`,
    );
  }

  assertNonEmptyString(
    descriptor.runtime_input_contract,
    `${portName}.runtime_input_contract`,
  );

  assertNonEmptyString(
    descriptor.runtime_output_contract,
    `${portName}.runtime_output_contract`,
  );

  if (
    descriptor.canonical_owner !==
    null
  ) {
    assertNonEmptyString(
      descriptor.canonical_owner,
      `${portName}.canonical_owner`,
    );
  }

  for (
    const [
      index,
      truthOwner,
    ] of descriptor
      .transported_truth_owners
      .entries()
  ) {
    assertNonEmptyString(
      truthOwner,
      `${portName}.transported_truth_owners[${String(index)}]`,
    );
  }

  if (
    descriptor.binding_kind ===
      "DIRECT_CANONICAL" ||
    descriptor.binding_kind ===
      "ADAPTED_CANONICAL"
  ) {
    if (
      descriptor.canonical_producer ===
      null
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_MODULE_NAME}] ` +
          `Execution descriptor violation: ${portName} requires an explicit canonical producer reference.`,
      );
    }

    assertNonEmptyString(
      descriptor.canonical_producer
        .module_path,
      `${portName}.canonical_producer.module_path`,
    );

    assertNonEmptyString(
      descriptor.canonical_producer
        .function_name,
      `${portName}.canonical_producer.function_name`,
    );
  }

  if (
    descriptor.current_snapshot_trace_scope ===
      "CURRENT_PRIVATE_SNAPSHOT" &&
    descriptor.pipeline_layer ===
      null
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_MODULE_NAME}] ` +
        `Execution descriptor violation: ${portName} cannot enter current Private Snapshot trace scope without a canonical Search pipeline layer.`,
    );
  }

  if (
    (
      descriptor.current_snapshot_trace_scope ===
        "NON_PIPELINE_RUNTIME_BOUNDARY" ||
      descriptor.current_snapshot_trace_scope ===
        "TRACEABILITY_TRANSPORT_BOUNDARY"
    ) &&
    descriptor.pipeline_layer !==
      null
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_MODULE_NAME}] ` +
        `Execution descriptor violation: ${portName} cannot fabricate SearchPipelineLayer membership for a transverse runtime boundary.`,
    );
  }
}

/* ============================================================================
 * 14. COMPLETE REGISTRY VALIDATION
 * ----------------------------------------------------------------------------
 * Static descriptors only.
 *
 * No runtime producer is invoked.
 * ========================================================================== */

export function validateSearchRuntimeExecutionDescriptorRegistry(): void {
  const registryKeys =
    Object.keys(
      XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY,
    ) as SearchRuntimeExecutionPortName[];

  for (
    const portName of
    registryKeys
  ) {
    validateSearchRuntimeExecutionDescriptor(
      portName,
      XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY[
        portName
      ],
    );
  }

  const traceabilityDescriptor =
    XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY
      .resolve_snapshot_traceability;

  if (
    !traceabilityDescriptor
      .transported_truth_owners
      .includes(
        "EXECUTION_TRACEABILITY",
      ) ||
    !traceabilityDescriptor
      .transported_truth_owners
      .includes(
        "VARIABLE_LINEAGE_GOVERNANCE",
      )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_MODULE_NAME}] ` +
        "Execution descriptor violation: resolve_snapshot_traceability must preserve both canonical governance truth owners.",
    );
  }
}

/* ============================================================================
 * 15. CANONICAL DESCRIPTOR LOOKUP
 * ----------------------------------------------------------------------------
 * Static lookup only.
 *
 * Produces no execution observation and no SearchTraceRecord.
 * ========================================================================== */

export function getSearchRuntimeExecutionDescriptor<
  TPortName extends SearchRuntimeExecutionPortName,
>(
  portName:
    TPortName,
): SearchRuntimeExecutionDescriptor<TPortName> {
  validateSearchRuntimeExecutionDescriptorRegistry();

  return XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY[
    portName
  ] as SearchRuntimeExecutionDescriptor<TPortName>;
}

/* ============================================================================
 * 16. CURRENT PRIVATE SNAPSHOT TRACE-SCOPE GUARD
 * ----------------------------------------------------------------------------
 * Membership only.
 *
 * It does NOT mean a SearchTraceRecord may be produced from the registry alone.
 *
 * Dynamic execution observation remains mandatory.
 * ========================================================================== */

export function isSearchRuntimeExecutionInCurrentPrivateSnapshotTraceScope(
  portName:
    SearchRuntimeExecutionPortName,
): boolean {
  return (
    XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY[
      portName
    ]
      .current_snapshot_trace_scope ===
    "CURRENT_PRIVATE_SNAPSHOT"
  );
}

/* ============================================================================
 * 17. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_OWNERSHIP =
  Object.freeze({
    registry_owner:
      "SEARCH_RUNTIME_EXECUTION_GOVERNANCE",

    runtime_port_contract_owner:
      "search-runtime-orchestrator.ts",

    binding_owner:
      "search-runtime-bindings.ts",

    adapted_execution_boundary:
      "search-runtime-producer-adapters.ts",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    execution_trace_producer:
      "search-execution-traceability-core.ts",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    traceability_transport_boundary:
      "resolve_snapshot_traceability",

    private_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    registry_executes_producers:
      false,

    registry_generates_trace:
      false,

    registry_generates_lineage:
      false,

    registry_generates_identity:
      false,

    registry_resolves_policy:
      false,

    registry_resolves_observations:
      false,

    registry_reads_runtime_clock:
      false,
  } as const);

/* ============================================================================
 * 18. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    complete_runtime_port_coverage_required:
      true,

    one_descriptor_per_runtime_port:
      true,

    analytical_owner:
      false,

    canonical_producer:
      false,

    trace_producer:
      false,

    lineage_producer:
      false,

    runtime_execution_allowed:
      false,

    producer_wrapping_allowed:
      false,

    producer_substitution_allowed:
      false,

    dynamic_producer_discovery_allowed:
      false,

    static_producer_reference_metadata_allowed:
      true,

    static_runtime_contract_metadata_allowed:
      true,

    runtime_contract_as_trace_contract_allowed:
      false,

    producer_function_name_as_trace_method_allowed:
      false,

    pipeline_layer_inference_allowed:
      false,

    module_version_inference_allowed:
      false,

    policy_version_inference_allowed:
      false,

    provider_identity_inference_allowed:
      false,

    confidence_inference_allowed:
      false,

    missing_data_inference_allowed:
      false,

    validation_state_inference_allowed:
      false,

    duration_inference_allowed:
      false,

    execution_trace_reconstruction_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    current_snapshot_causal_cycle_allowed:
      false,

    traceability_self_reference_allowed:
      false,

    downstream_trace_backfill_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    persistence_allowed:
      false,

    logging_allowed:
      false,

    network_access_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "runtime_port_without_execution_descriptor",
        "execution_descriptor_without_runtime_port",

        "descriptor_port_identity_mismatch",

        "registry_executed_producer",
        "registry_wrapped_producer",
        "registry_substituted_producer",

        "registry_generated_search_trace_record",
        "registry_generated_variable_lineage",

        "runtime_contract_as_trace_input_contract",
        "runtime_contract_as_trace_output_contract",

        "producer_function_name_as_trace_method",

        "registry_inferred_module_version",
        "registry_inferred_policy_version",
        "registry_inferred_provider_identity",

        "registry_inferred_confidence",
        "registry_inferred_missing_data",
        "registry_inferred_validation_state",
        "registry_inferred_duration",

        "fabricated_pipeline_layer_for_distribution_identity",
        "fabricated_pipeline_layer_for_search_cohort_batch",
        "fabricated_pipeline_layer_for_snapshot_identity",
        "fabricated_pipeline_layer_for_traceability_transport",

        "private_snapshot_trace_inside_same_private_snapshot",
        "traceability_resolver_self_trace",

        "transformation_trace_backfilled_into_private_snapshot",
        "public_ranking_trace_backfilled_into_private_snapshot",

        "registry_runtime_clock_access",
        "registry_random_identity_generation",

        "registry_persistence",
        "registry_logging",
        "registry_network_access",
      ] as const),
  } as const);
