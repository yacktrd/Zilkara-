/* ============================================================================
 * FILE:
 * lib/xyvala/search/governance/search-producer-execution-contract-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical producer execution contract registry
 *
 * ROLE
 * - define the canonical execution contract of every Search runtime producer
 *   invocation eligible for the current Private Snapshot trace collection
 * - define SearchTraceRecord execution_nature contractually
 * - define SearchTraceRecord method contractually
 * - define the producer-side input contract references used by traceability
 * - define the producer-side output contract reference used by traceability
 * - distinguish runtime execution identity from internal analytical methods
 * - prevent trace-contract reconstruction from producer output
 * - prevent runtime-port contract inference inside EXECUTION_TRACEABILITY
 *
 * CLASSIFICATION
 * - SEARCH GOVERNANCE
 * - EXECUTION GOVERNANCE
 * - PRODUCER EXECUTION CONTRACT REGISTRY
 * - CONTRACT BEFORE RUNTIME
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
 *        +
 * Search Runtime Execution Descriptor Registry
 *        ↓
 * Producer Execution Contract Registry
 *        ↓
 * static execution contract truth:
 * - execution_nature
 * - method
 * - input_contracts
 * - output_contract
 *        +
 * canonical producer module identity
 *        +
 * dynamic facts observed during actual execution
 *        ↓
 * SearchExecutionTraceObservationInput
 *        ↓
 * EXECUTION_TRACEABILITY
 *        ↓
 * SearchTraceRecord
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * This registry exists because SearchTraceRecord requires:
 *
 * - execution_nature;
 * - method;
 * - input_contracts;
 * - output_contract.
 *
 * Those fields MUST NOT be reconstructed later from:
 *
 * - Private Snapshot contents;
 * - analytical output shape;
 * - runtime-port naming heuristics;
 * - VLR metadata;
 * - current policy state;
 * - current source code inspection.
 *
 * They are declared here before execution.
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * This registry owns:
 *
 * producer execution-contract metadata
 * <- SEARCH_PRODUCER_EXECUTION_CONTRACT_GOVERNANCE
 *
 * It does NOT own:
 *
 * SearchTraceRecord
 * <- EXECUTION_TRACEABILITY
 *
 * SearchVariableLineage
 * <- VARIABLE_LINEAGE_GOVERNANCE
 *
 * analytical producer output
 * <- canonical producer-specific owner
 *
 * runtime execution order
 * <- search-runtime-orchestrator.ts
 *
 * runtime binding
 * <- search-runtime-bindings.ts
 *
 * runtime adaptation
 * <- search-runtime-producer-adapters.ts
 *
 * METHOD SEMANTICS
 * ----------------------------------------------------------------------------
 * SearchTraceRecord.method represents the canonical Search runtime operation
 * being executed.
 *
 * Therefore:
 *
 * extract_document
 * -> method = "extract_document"
 *
 * score_intrinsic_document
 * -> method = "score_intrinsic_document"
 *
 * normalize_cohort
 * -> method = "normalize_cohort"
 *
 * etc.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This method identity is deliberately distinct from producer-internal
 * analytical methods such as:
 *
 * - scoring_method;
 * - profiling_method;
 * - normalization_method;
 * - aggregation_method;
 * - rarity_method;
 * - anchor_detection_method;
 * - missing_score_handling_method;
 * - missing_evidence_method;
 * - sub-score calculation method.
 *
 * Those remain producer-owned analytical/configuration facts.
 *
 * They may legitimately appear in SearchTraceRecord.parameters when explicitly
 * observed, but they MUST NOT replace the execution-operation identity.
 *
 * This prevents ambiguity when one canonical producer executes several
 * internal analytical methods during one runtime invocation.
 *
 * EXECUTION NATURE SEMANTICS
 * ----------------------------------------------------------------------------
 * ACQUISITION is OBSERVE.
 *
 * It acquires external documentary reality and does not analytically derive
 * that source truth.
 *
 * Current analytical Search producers are COMPUTE.
 *
 * No current producer eligible for the current Private Snapshot trace
 * collection is classified MUTATE.
 *
 * execution_nature is declared explicitly here.
 *
 * It MUST NOT be inferred later from SearchPipelineLayer.
 *
 * INPUT CONTRACT SEMANTICS
 * ----------------------------------------------------------------------------
 * input_contracts identifies the canonical execution-boundary contracts
 * intentionally authorized for the traced producer invocation.
 *
 * For adapted producers, the producer-specific canonical input contract is
 * used whenever it is already explicit in the architecture.
 *
 * Examples:
 *
 * detect_anchor_signals
 * -> SearchAnchorSignalsInput
 *
 * detect_temporal_signals
 * -> SearchTemporalSignalsSearchExecutionInput
 *
 * score_query_relevance
 * -> SearchQueryRelevanceScoringInput
 *
 * For directly bound producers whose runtime boundary is already the exact
 * producer-compatible boundary, the existing runtime input contract is
 * intentionally declared as the execution-boundary contract.
 *
 * This is NOT automatic aliasing.
 *
 * The equivalence is explicitly governed here.
 *
 * OUTPUT CONTRACT SEMANTICS
 * ----------------------------------------------------------------------------
 * output_contract identifies the canonical result emitted by the producer
 * invocation before downstream transport adaptation.
 *
 * Therefore:
 *
 * assemble_positive_score_vector
 * -> SearchPositiveScoreAssemblyResult
 *
 * NOT merely SearchPositiveScoreVector,
 * because the canonical producer returns the assembly result and the adapter
 * later transports its positive_score_vector member.
 *
 * evaluate_relative_cohort
 * -> SearchRelativeEvaluationContext
 *
 * NOT SearchOptionalEvidence<SearchRelativeEvaluationContext>,
 * because Optional Evidence wrapping belongs to runtime adaptation when the
 * cohort distribution is AVAILABLE.
 *
 * This distinction preserves canonical producer ownership.
 *
 * TRACE CAUSALITY
 * ----------------------------------------------------------------------------
 * Registry coverage is derived from:
 *
 * search-runtime-execution-descriptor-registry.ts
 *
 * Only descriptors with:
 *
 * current_snapshot_trace_scope === "CURRENT_PRIVATE_SNAPSHOT"
 *
 * belong here.
 *
 * Consequently this registry deliberately excludes:
 *
 * - resolve_distribution_id
 * - build_cohort_batch
 * - resolve_snapshot_id
 * - resolve_snapshot_traceability
 * - build_private_snapshot
 * - transform_public_result
 * - rank_public_results
 *
 * Reasons:
 *
 * distribution identity / snapshot identity / SEARCH_COHORT_BATCH
 * -> transverse non-SearchPipelineLayer boundaries
 *
 * resolve_snapshot_traceability
 * -> self-reference risk
 *
 * build_private_snapshot
 * -> current-snapshot causal cycle
 *
 * Transformation / Public Ranking
 * -> post-snapshot execution
 *
 * This registry does NOT claim those executions never exist.
 *
 * It only defines the execution contract domain that can legitimately produce
 * SearchTraceRecord truth embedded in the current Private Snapshot.
 *
 * DYNAMIC EXECUTION FACTS
 * ----------------------------------------------------------------------------
 * This registry intentionally does NOT provide:
 *
 * - actual module_name;
 * - actual module_version;
 * - actual policy_version;
 * - actual provider identity;
 * - actual parameters;
 * - actual validation_state;
 * - actual missing_data;
 * - actual confidence;
 * - actual duration_ms.
 *
 * Those facts must originate from canonical producers / providers / execution
 * observation at runtime.
 *
 * In particular:
 *
 * degradation_reasons != missing_data
 *
 * analytical confidence != execution confidence
 *
 * current policy != policy actually used
 *
 * producer internal method != SearchTraceRecord.method
 *
 * DIRECTIVES
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - one execution contract per traceable runtime operation
 * - exact traceable-port coverage
 * - no second runtime-port signature contract
 * - explicit execution nature
 * - explicit execution operation identity
 * - explicit input contract references
 * - explicit output contract reference
 * - no method inference
 * - no analytical-method substitution
 * - no runtime contract inference inside traceability
 * - no output-shape contract inference
 * - no policy resolution
 * - no provider resolution
 * - no trace generation
 * - no lineage generation
 * - no analytical calculation
 * - no runtime clock
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no persistence
 * - no logging
 * - no network access
 *
 * INVARIANTS
 * - every current-snapshot-traceable runtime port has exactly one contract
 * - no non-traceable runtime port enters this registry
 * - contract.port_name equals registry key
 * - contract.method equals the explicitly governed runtime operation identity
 * - internal analytical methods never replace execution method
 * - every input contract identity is explicit and non-empty
 * - output contract identity is explicit and non-empty
 * - duplicate input contract identities are rejected
 * - no execution occurs during registry access
 * - no SearchTraceRecord is created here
 * - no SearchVariableLineage is created here
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * traceable runtime port missing execution contract
 * => producer execution-contract governance boundary
 *
 * non-traceable port receives execution contract
 * => current Private Snapshot trace-scope violation
 *
 * registry key differs from descriptor.port_name
 * => execution identity violation
 *
 * internal scoring_method used as SearchTraceRecord.method
 * => method semantic violation
 *
 * output wrapper confused with canonical producer output
 * => producer-output ownership violation
 *
 * degradation_reasons converted to missing_data
 * => semantic reconstruction violation
 *
 * analytical confidence converted to execution confidence
 * => confidence semantic reconstruction violation
 *
 * policy_version read after execution
 * => execution provenance violation
 *
 * trace generated from registry alone
 * => EXECUTION_TRACEABILITY ownership violation
 * ========================================================================== */

import type {
  SearchModuleVersion,
  SearchTraceRecord,
} from "../contracts/search-pipeline-contract";

import {
  XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY,
} from "./search-runtime-execution-descriptor-registry";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME =
  "xyvala-search-producer-execution-contract-registry" as const;

export const XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. DESCRIPTOR REGISTRY TYPE
 * ========================================================================== */

type SearchRuntimeExecutionDescriptorRegistry =
  typeof XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY;

/* ============================================================================
 * 3. CURRENT PRIVATE SNAPSHOT TRACEABLE PORT DOMAIN
 * ----------------------------------------------------------------------------
 * Derived from execution descriptor governance.
 *
 * No second manually maintained port-domain union is introduced.
 * ========================================================================== */

export type SearchProducerExecutionTraceablePortName =
  {
    [TPortName in keyof SearchRuntimeExecutionDescriptorRegistry]:
      SearchRuntimeExecutionDescriptorRegistry[TPortName][
        "current_snapshot_trace_scope"
      ] extends "CURRENT_PRIVATE_SNAPSHOT"
        ? TPortName
        : never;
  }[
    keyof SearchRuntimeExecutionDescriptorRegistry
  ];

/* ============================================================================
 * 4. EXECUTION CONTRACT PRIMITIVES
 * ========================================================================== */

export type SearchProducerExecutionNature =
  SearchTraceRecord["execution_nature"];

export type SearchProducerExecutionMethod =
  SearchTraceRecord["method"];

export type SearchProducerExecutionInputContract =
  SearchTraceRecord["input_contracts"][number];

export type SearchProducerExecutionOutputContract =
  SearchTraceRecord["output_contract"];

/* ============================================================================
 * 5. METHOD SEMANTICS
 * ----------------------------------------------------------------------------
 * This registry deliberately chooses the canonical runtime-operation identity
 * as SearchTraceRecord.method.
 *
 * This is a contract declaration.
 *
 * It is NOT inferred later from:
 * - producer function name;
 * - analytical method;
 * - output metadata;
 * - runtime reflection.
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS =
  "CANONICAL_RUNTIME_OPERATION_IDENTITY" as const;

/* ============================================================================
 * 6. PRODUCER EXECUTION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionContract<
  TPortName extends SearchProducerExecutionTraceablePortName =
    SearchProducerExecutionTraceablePortName,
> {
  readonly port_name:
    TPortName;

  readonly execution_nature:
    SearchProducerExecutionNature;

  /**
   * Canonical runtime-operation identity used as SearchTraceRecord.method.
   *
   * Internal analytical method fields remain producer-owned and distinct.
   */
  readonly method:
    TPortName & SearchProducerExecutionMethod;

  /**
   * Canonical producer/execution-boundary contracts explicitly authorized for
   * this invocation.
   */
  readonly input_contracts:
    readonly SearchProducerExecutionInputContract[];

  /**
   * Canonical producer result contract before downstream adaptation.
   */
  readonly output_contract:
    SearchProducerExecutionOutputContract;

  readonly method_semantics:
    typeof XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS;
}

/* ============================================================================
 * 7. EXACT EXECUTION CONTRACT REGISTRY TYPE
 * ========================================================================== */

export type SearchProducerExecutionContractRegistry =
  Readonly<{
    [TPortName in SearchProducerExecutionTraceablePortName]:
      SearchProducerExecutionContract<TPortName>;
  }>;

/* ============================================================================
 * 8. EXECUTION CONTRACT FACTORY
 * ----------------------------------------------------------------------------
 * Static immutability only.
 *
 * No runtime execution.
 * No trace generation.
 * ========================================================================== */

function defineSearchProducerExecutionContract<
  TPortName extends SearchProducerExecutionTraceablePortName,
>(
  contract:
    SearchProducerExecutionContract<TPortName>,
): SearchProducerExecutionContract<TPortName> {
  return Object.freeze({
    ...contract,

    input_contracts:
      Object.freeze([
        ...contract
          .input_contracts,
      ]),
  });
}

/* ============================================================================
 * 9. CANONICAL PRODUCER EXECUTION CONTRACT REGISTRY
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY =
  Object.freeze({
    /* ------------------------------------------------------------------------
     * ACQUISITION
     *
     * Search Acquisition observes external documentary reality.
     *
     * Provider-specific identity remains dynamic and externally supplied.
     * The Search runtime acquisition boundary itself is canonical.
     * --------------------------------------------------------------------- */

    acquire_documents:
      defineSearchProducerExecutionContract({
        port_name:
          "acquire_documents",

        execution_nature:
          "OBSERVE",

        method:
          "acquire_documents",

        input_contracts:
          [
            "SearchRuntimeAcquisitionInput",
          ],

        output_contract:
          "SearchRawDocument[]",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * EXTRACTION
     * --------------------------------------------------------------------- */

    extract_document:
      defineSearchProducerExecutionContract({
        port_name:
          "extract_document",

        execution_nature:
          "COMPUTE",

        method:
          "extract_document",

        input_contracts:
          [
            "SearchRuntimeExtractionInput",
          ],

        output_contract:
          "SearchExtractedDocument",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * SEGMENTATION
     * --------------------------------------------------------------------- */

    segment_document:
      defineSearchProducerExecutionContract({
        port_name:
          "segment_document",

        execution_nature:
          "COMPUTE",

        method:
          "segment_document",

        input_contracts:
          [
            "SearchRuntimeSegmentationInput",
          ],

        output_contract:
          "SearchSegmentedDocument",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * LEXICAL ANALYSIS
     * --------------------------------------------------------------------- */

    analyze_lexical_document:
      defineSearchProducerExecutionContract({
        port_name:
          "analyze_lexical_document",

        execution_nature:
          "COMPUTE",

        method:
          "analyze_lexical_document",

        input_contracts:
          [
            "SearchRuntimeLexicalAnalysisInput",
          ],

        output_contract:
          "SearchLexicalDocument",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * FREQUENCY SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_frequency_signals:
      defineSearchProducerExecutionContract({
        port_name:
          "detect_frequency_signals",

        execution_nature:
          "COMPUTE",

        method:
          "detect_frequency_signals",

        input_contracts:
          [
            "SearchRuntimeFrequencySignalsInput",
          ],

        output_contract:
          "SearchFrequencySignals",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * ANCHOR SIGNAL DETECTION
     *
     * SearchAnchorSignalsInput is the canonical producer input.
     *
     * anchor_detection_method remains analytical producer metadata and does
     * not replace method = detect_anchor_signals.
     * --------------------------------------------------------------------- */

    detect_anchor_signals:
      defineSearchProducerExecutionContract({
        port_name:
          "detect_anchor_signals",

        execution_nature:
          "COMPUTE",

        method:
          "detect_anchor_signals",

        input_contracts:
          [
            "SearchAnchorSignalsInput",
          ],

        output_contract:
          "SearchAnchorSignals",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * CONTEXT AGGREGATION
     * --------------------------------------------------------------------- */

    aggregate_context:
      defineSearchProducerExecutionContract({
        port_name:
          "aggregate_context",

        execution_nature:
          "COMPUTE",

        method:
          "aggregate_context",

        input_contracts:
          [
            "SearchContextAggregationInput",
          ],

        output_contract:
          "SearchContextAggregation",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * LINK SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_link_signals:
      defineSearchProducerExecutionContract({
        port_name:
          "detect_link_signals",

        execution_nature:
          "COMPUTE",

        method:
          "detect_link_signals",

        input_contracts:
          [
            "SearchLinkSignalsSearchInput",
          ],

        output_contract:
          "SearchLinkSignals",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * TEMPORAL SIGNAL DETECTION
     *
     * The actual canonical entry point consumes
     * SearchTemporalSignalsSearchExecutionInput.
     * --------------------------------------------------------------------- */

    detect_temporal_signals:
      defineSearchProducerExecutionContract({
        port_name:
          "detect_temporal_signals",

        execution_nature:
          "COMPUTE",

        method:
          "detect_temporal_signals",

        input_contracts:
          [
            "SearchTemporalSignalsSearchExecutionInput",
          ],

        output_contract:
          "SearchTemporalSignals",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * BEHAVIORAL SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_behavioral_signals:
      defineSearchProducerExecutionContract({
        port_name:
          "detect_behavioral_signals",

        execution_nature:
          "COMPUTE",

        method:
          "detect_behavioral_signals",

        input_contracts:
          [
            "SearchBehavioralSignalsSearchInput",
          ],

        output_contract:
          "SearchBehavioralSignals",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * QUERY PROFILING
     *
     * Query normalization may occur internally inside canonical Query Analysis,
     * but the runtime exposes one canonical invocation:
     *
     * analyze_query
     *
     * No synthetic second execution trace is created.
     * --------------------------------------------------------------------- */

    analyze_query:
      defineSearchProducerExecutionContract({
        port_name:
          "analyze_query",

        execution_nature:
          "COMPUTE",

        method:
          "analyze_query",

        input_contracts:
          [
            "SearchQueryAnalysisInput",
          ],

        output_contract:
          "SearchQueryProfile",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * QUERY-DOCUMENT SIGNAL DETECTION
     * --------------------------------------------------------------------- */

    detect_query_document_signals:
      defineSearchProducerExecutionContract({
        port_name:
          "detect_query_document_signals",

        execution_nature:
          "COMPUTE",

        method:
          "detect_query_document_signals",

        input_contracts:
          [
            "SearchQueryDocumentSignalsInput",
          ],

        output_contract:
          "SearchQueryDocumentSignals",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * INTRINSIC DOCUMENT SCORING
     *
     * Individual sub-score methods remain internal analytical truths.
     * --------------------------------------------------------------------- */

    score_intrinsic_document:
      defineSearchProducerExecutionContract({
        port_name:
          "score_intrinsic_document",

        execution_nature:
          "COMPUTE",

        method:
          "score_intrinsic_document",

        input_contracts:
          [
            "SearchIntrinsicDocumentScoringInput",
          ],

        output_contract:
          "SearchIntrinsicDocumentScoreVector",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * TEMPORAL DOCUMENT SCORING
     * --------------------------------------------------------------------- */

    score_temporal_document:
      defineSearchProducerExecutionContract({
        port_name:
          "score_temporal_document",

        execution_nature:
          "COMPUTE",

        method:
          "score_temporal_document",

        input_contracts:
          [
            "SearchTemporalDocumentScoringInput",
          ],

        output_contract:
          "SearchTemporalDocumentScoreVector",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * QUERY RELEVANCE SCORING
     * --------------------------------------------------------------------- */

    score_query_relevance:
      defineSearchProducerExecutionContract({
        port_name:
          "score_query_relevance",

        execution_nature:
          "COMPUTE",

        method:
          "score_query_relevance",

        input_contracts:
          [
            "SearchQueryRelevanceScoringInput",
          ],

        output_contract:
          "SearchQueryRelativeScoreVector",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * LINK AUTHORITY SCORING
     *
     * input.policy.scoring_method remains producer analytical configuration.
     * --------------------------------------------------------------------- */

    score_link_authority:
      defineSearchProducerExecutionContract({
        port_name:
          "score_link_authority",

        execution_nature:
          "COMPUTE",

        method:
          "score_link_authority",

        input_contracts:
          [
            "SearchLinkAuthorityScoringInput",
          ],

        output_contract:
          "SearchOptionalEvidence<SearchLinkAuthorityScoreVector>",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * BEHAVIORAL CALIBRATION SCORING
     * --------------------------------------------------------------------- */

    score_behavioral_calibration:
      defineSearchProducerExecutionContract({
        port_name:
          "score_behavioral_calibration",

        execution_nature:
          "COMPUTE",

        method:
          "score_behavioral_calibration",

        input_contracts:
          [
            "SearchBehavioralCalibrationScoringInput",
          ],

        output_contract:
          "SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector>",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * POSITIVE SCORE ASSEMBLY
     *
     * IMPORTANT
     *
     * canonical producer:
     * assembleSearchPositiveScoreVector(...)
     *
     * canonical producer output:
     * SearchPositiveScoreAssemblyResult
     *
     * adapter/runtime transport output:
     * SearchPositiveScoreVector
     *
     * Traceability records the producer output contract, not the adapter's
     * downstream projection.
     * --------------------------------------------------------------------- */

    assemble_positive_score_vector:
      defineSearchProducerExecutionContract({
        port_name:
          "assemble_positive_score_vector",

        execution_nature:
          "COMPUTE",

        method:
          "assemble_positive_score_vector",

        input_contracts:
          [
            "SearchPositiveScoreAssemblerInput",
          ],

        output_contract:
          "SearchPositiveScoreAssemblyResult",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * PENALTY EVALUATION
     * --------------------------------------------------------------------- */

    evaluate_penalties:
      defineSearchProducerExecutionContract({
        port_name:
          "evaluate_penalties",

        execution_nature:
          "COMPUTE",

        method:
          "evaluate_penalties",

        input_contracts:
          [
            "SearchPenaltyEvaluationInput",
          ],

        output_contract:
          "SearchPenaltyVector",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * ANALYTICAL AGGREGATION
     *
     * aggregation_method / aggregate_confidence_method /
     * missing_score_handling_method remain producer-owned parameters.
     * --------------------------------------------------------------------- */

    aggregate_analytical_score:
      defineSearchProducerExecutionContract({
        port_name:
          "aggregate_analytical_score",

        execution_nature:
          "COMPUTE",

        method:
          "aggregate_analytical_score",

        input_contracts:
          [
            "SearchAnalyticalAggregationInput",
          ],

        output_contract:
          "SearchGlobalScore",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * ELIGIBILITY
     * --------------------------------------------------------------------- */

    evaluate_eligibility:
      defineSearchProducerExecutionContract({
        port_name:
          "evaluate_eligibility",

        execution_nature:
          "COMPUTE",

        method:
          "evaluate_eligibility",

        input_contracts:
          [
            "SearchEligibilityEvaluationInput",
          ],

        output_contract:
          "SearchEligibilityResult",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * COHORT NORMALIZATION
     * --------------------------------------------------------------------- */

    normalize_cohort:
      defineSearchProducerExecutionContract({
        port_name:
          "normalize_cohort",

        execution_nature:
          "COMPUTE",

        method:
          "normalize_cohort",

        input_contracts:
          [
            "SearchCohortNormalizationInput",
          ],

        output_contract:
          "SearchOptionalEvidence<SearchCohortDistribution>",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * RELATIVE COHORT EVALUATION
     *
     * Canonical producer receives AVAILABLE distribution truth and returns a
     * concrete SearchRelativeEvaluationContext.
     *
     * Optional Evidence wrapping belongs to runtime adaptation.
     * --------------------------------------------------------------------- */

    evaluate_relative_cohort:
      defineSearchProducerExecutionContract({
        port_name:
          "evaluate_relative_cohort",

        execution_nature:
          "COMPUTE",

        method:
          "evaluate_relative_cohort",

        input_contracts:
          [
            "SearchRelativeCohortEvaluationInput",
          ],

        output_contract:
          "SearchRelativeEvaluationContext",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),

    /* ------------------------------------------------------------------------
     * PRIVATE DECISION
     * --------------------------------------------------------------------- */

    resolve_private_decision:
      defineSearchProducerExecutionContract({
        port_name:
          "resolve_private_decision",

        execution_nature:
          "COMPUTE",

        method:
          "resolve_private_decision",

        input_contracts:
          [
            "SearchPrivateDecisionInput",
          ],

        output_contract:
          "SearchPrivateDecision",

        method_semantics:
          XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,
      }),
  } satisfies SearchProducerExecutionContractRegistry);

/* ============================================================================
 * 10. COMPILE-TIME EXACT COVERAGE
 * ========================================================================== */

type SearchProducerExecutionDeclaredPortName =
  keyof typeof XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY;

type SearchProducerExecutionMissingContract =
  Exclude<
    SearchProducerExecutionTraceablePortName,
    SearchProducerExecutionDeclaredPortName
  >;

type SearchProducerExecutionUnknownContract =
  Exclude<
    SearchProducerExecutionDeclaredPortName,
    SearchProducerExecutionTraceablePortName
  >;

type SearchProducerExecutionContractCoverageIsExact =
  [
    SearchProducerExecutionMissingContract,
    SearchProducerExecutionUnknownContract,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_COVERAGE_IS_EXACT:
  SearchProducerExecutionContractCoverageIsExact =
    true;

void XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 11. BASIC ASSERTIONS
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
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Producer execution-contract violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 12. INPUT CONTRACT COLLECTION VALIDATION
 * ========================================================================== */

function validateInputContracts(
  inputContracts:
    readonly SearchProducerExecutionInputContract[],

  fieldName:
    string,
): void {
  if (
    inputContracts.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Producer execution-contract violation: ${fieldName} must contain at least one explicit contract identity.`,
    );
  }

  const seen =
    new Set<string>();

  for (
    let index =
      0;
    index <
    inputContracts.length;
    index +=
      1
  ) {
    const contractIdentity =
      inputContracts[
        index
      ];

    if (
      contractIdentity ===
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
          `Producer execution-contract violation: ${fieldName}[${String(index)}] is missing.`,
      );
    }

    assertNonEmptyString(
      contractIdentity,
      `${fieldName}[${String(index)}]`,
    );

    if (
      seen.has(
        contractIdentity,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
          `Producer execution-contract violation: ${fieldName} contains duplicate contract identity ${contractIdentity}.`,
      );
    }

    seen.add(
      contractIdentity,
    );
  }
}

/* ============================================================================
 * 13. INDIVIDUAL EXECUTION CONTRACT VALIDATION
 * ========================================================================== */

function validateSearchProducerExecutionContract<
  TPortName extends SearchProducerExecutionTraceablePortName,
>(
  portName:
    TPortName,

  contract:
    SearchProducerExecutionContract<TPortName>,
): void {
  if (
    contract.port_name !==
    portName
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Producer execution-contract violation: registry key ${String(portName)} contains contract for ${String(contract.port_name)}.`,
    );
  }

  if (
    contract.method !==
    portName
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Producer execution-contract violation: ${String(portName)} method must preserve its canonical runtime-operation identity.`,
    );
  }

  if (
    contract.method_semantics !==
    XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Producer execution-contract violation: ${String(portName)} changed canonical method semantics.`,
    );
  }

  if (
    contract.execution_nature !==
      "COMPUTE" &&
    contract.execution_nature !==
      "OBSERVE" &&
    contract.execution_nature !==
      "MUTATE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Producer execution-contract violation: ${String(portName)} has unsupported execution_nature.`,
    );
  }

  validateInputContracts(
    contract.input_contracts,
    `${String(portName)}.input_contracts`,
  );

  assertNonEmptyString(
    contract.output_contract,
    `${String(portName)}.output_contract`,
  );
}

/* ============================================================================
 * 14. DESCRIPTOR / EXECUTION CONTRACT CONCORDANCE
 * ----------------------------------------------------------------------------
 * Runtime safety guard in addition to compile-time coverage.
 *
 * Requirements:
 *
 * CURRENT_PRIVATE_SNAPSHOT descriptor
 * <=> execution contract exists
 *
 * No other descriptor scope may enter this registry.
 * ========================================================================== */

export function validateSearchProducerExecutionContractRegistry(): void {
  const descriptorPortNames =
    Object.keys(
      XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY,
    ) as (
      keyof SearchRuntimeExecutionDescriptorRegistry
    )[];

  for (
    const portName of
    descriptorPortNames
  ) {
    const descriptor =
      XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY[
        portName
      ];

    const shouldHaveExecutionContract =
      descriptor
        .current_snapshot_trace_scope ===
      "CURRENT_PRIVATE_SNAPSHOT";

    const hasExecutionContract =
      Object.prototype.hasOwnProperty.call(
        XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY,
        portName,
      );

    if (
      shouldHaveExecutionContract !==
      hasExecutionContract
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
          `Producer execution-contract coverage violation: runtime port ${String(portName)} has inconsistent current Private Snapshot trace-contract membership.`,
      );
    }
  }

  const contractPortNames =
    Object.keys(
      XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY,
    ) as SearchProducerExecutionTraceablePortName[];

  for (
    const portName of
    contractPortNames
  ) {
    const descriptor =
      XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY[
        portName
      ];

    if (
      descriptor
        .current_snapshot_trace_scope !==
      "CURRENT_PRIVATE_SNAPSHOT"
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
          `Producer execution-contract scope violation: ${String(portName)} is not authorized for the current Private Snapshot trace collection.`,
      );
    }

    if (
      descriptor.pipeline_layer ===
      null
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
          `Producer execution-contract scope violation: ${String(portName)} has no canonical Search traceable pipeline layer.`,
      );
    }

    validateSearchProducerExecutionContract(
      portName,
      XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY[
        portName
      ],
    );
  }
}

/* ============================================================================
 * 15. CANONICAL EXECUTION CONTRACT LOOKUP
 * ----------------------------------------------------------------------------
 * Static contract lookup only.
 *
 * Return type is derived directly from the canonical registry entry.
 *
 * This preserves the exact:
 *
 * port_name
 * -> execution contract
 *
 * type correlation without cast, widening or duplicated type assertion.
 *
 * No execution occurs.
 * No observation is produced.
 * No SearchTraceRecord is produced.
 * ========================================================================== */

export function getSearchProducerExecutionContract<
  TPortName extends keyof
    typeof XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY,
>(
  portName:
    TPortName,
): (
  typeof XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY
)[TPortName] {
  validateSearchProducerExecutionContractRegistry();

  return XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY[
    portName
  ];
}

/* ============================================================================
 * 16. TRACEABLE PORT GUARD
 * ----------------------------------------------------------------------------
 * Structural membership check only.
 *
 * This does NOT authorize trace construction from static registry metadata
 * alone.
 * ========================================================================== */

export function isSearchProducerExecutionTraceablePort(
  portName:
    keyof SearchRuntimeExecutionDescriptorRegistry,
): portName is SearchProducerExecutionTraceablePortName {
  return (
    XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY[
      portName
    ]
      .current_snapshot_trace_scope ===
    "CURRENT_PRIVATE_SNAPSHOT"
  );
}

/* ============================================================================
 * 17. OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_OWNERSHIP =
  Object.freeze({
    registry_owner:
      "SEARCH_PRODUCER_EXECUTION_CONTRACT_GOVERNANCE",

    runtime_execution_descriptor_owner:
      "SEARCH_RUNTIME_EXECUTION_GOVERNANCE",

    runtime_port_contract_owner:
      "search-runtime-orchestrator.ts",

    runtime_binding_owner:
      "search-runtime-bindings.ts",

    runtime_adapter_owner:
      "search-runtime-producer-adapters.ts",

    runtime_execution_order_owner:
      "search-runtime-orchestrator.ts",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    execution_trace_producer:
      "search-execution-traceability-core.ts",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    private_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    registry_owns_execution_nature_contract:
      true,

    registry_owns_execution_method_contract:
      true,

    registry_owns_execution_input_contract_references:
      true,

    registry_owns_execution_output_contract_reference:
      true,

    registry_owns_module_identity:
      false,

    registry_owns_policy_version:
      false,

    registry_owns_parameters:
      false,

    registry_owns_validation_state:
      false,

    registry_owns_missing_data:
      false,

    registry_owns_confidence:
      false,

    registry_owns_duration:
      false,

    registry_generates_trace:
      false,

    registry_generates_lineage:
      false,

    registry_executes_producer:
      false,
  } as const);

/* ============================================================================
 * 18. GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_CONTRACT_REGISTRY_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    static_execution_contract_only:
      true,

    exact_traceable_port_coverage_required:
      true,

    one_execution_contract_per_traceable_port:
      true,

    analytical_owner:
      false,

    canonical_analytical_producer:
      false,

    trace_producer:
      false,

    lineage_producer:
      false,

    execution_nature_is_explicit:
      true,

    execution_method_is_explicit:
      true,

    execution_method_semantics:
      XYVALA_SEARCH_PRODUCER_EXECUTION_METHOD_SEMANTICS,

    analytical_method_as_execution_method_allowed:
      false,

    scoring_method_as_execution_method_allowed:
      false,

    normalization_method_as_execution_method_allowed:
      false,

    profiling_method_as_execution_method_allowed:
      false,

    aggregation_method_as_execution_method_allowed:
      false,

    subscore_method_as_execution_method_allowed:
      false,

    execution_nature_inference_allowed:
      false,

    method_inference_allowed:
      false,

    producer_function_name_inference_allowed:
      false,

    output_shape_contract_inference_allowed:
      false,

    private_snapshot_contract_reconstruction_allowed:
      false,

    policy_resolution_allowed:
      false,

    provider_resolution_allowed:
      false,

    module_identity_generation_allowed:
      false,

    module_version_generation_allowed:
      false,

    policy_version_generation_allowed:
      false,

    parameters_generation_allowed:
      false,

    validation_state_generation_allowed:
      false,

    missing_data_generation_allowed:
      false,

    degradation_reason_to_missing_data_conversion_allowed:
      false,

    confidence_generation_allowed:
      false,

    analytical_confidence_to_execution_confidence_allowed:
      false,

    duration_generation_allowed:
      false,

    trace_generation_allowed:
      false,

    lineage_generation_allowed:
      false,

    producer_execution_allowed:
      false,

    producer_wrapping_allowed:
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

    current_snapshot_causal_cycle_allowed:
      false,

    downstream_trace_backfill_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "missing_execution_contract_fallback",
        "non_traceable_port_execution_contract",

        "execution_nature_from_pipeline_layer",

        "execution_method_from_internal_scoring_method",
        "execution_method_from_normalization_method",
        "execution_method_from_profiling_method",
        "execution_method_from_aggregation_method",
        "execution_method_from_subscore_method",

        "execution_method_from_producer_function_name_inference",

        "trace_contract_from_snapshot_shape",
        "trace_contract_from_downstream_output_shape",

        "degradation_reasons_as_missing_data",
        "analytical_confidence_as_execution_confidence",

        "current_policy_as_executed_policy",
        "current_provider_as_executed_provider",

        "registry_generated_module_identity",
        "registry_generated_module_version",

        "registry_generated_parameters",
        "registry_generated_validation_state",
        "registry_generated_missing_data",
        "registry_generated_confidence",
        "registry_generated_duration",

        "registry_generated_search_trace_record",
        "registry_generated_variable_lineage",

        "registry_executed_producer",
        "registry_wrapped_producer",

        "registry_runtime_clock_access",
        "registry_random_identity_generation",

        "registry_persistence",
        "registry_logging",
        "registry_network_access",

        "private_snapshot_current_execution_trace_cycle",
        "post_snapshot_trace_backfill",
      ] as const),
  } as const);
