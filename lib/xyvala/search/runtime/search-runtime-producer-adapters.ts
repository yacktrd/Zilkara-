/* ============================================================================
 * FILE: lib/xyvala/search/runtime/search-runtime-producer-adapters.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical runtime producer adapters
 *
 * ROLE
 * - adapt canonical Search runtime-port inputs to canonical producer inputs
 * - inject explicitly resolved analytical policies
 * - inject explicitly resolved external analytical observation evidence
 * - preserve canonical document, query, cohort and distribution identities
 * - preserve deterministic timestamps
 * - preserve canonical Optional Evidence semantics
 * - coordinate authorized Execution Plane observation boundaries when
 *   explicitly contracted
 * - translate transport shape without reconstructing analytical truth
 * - expose SearchRuntimePorts-compatible producer functions
 *
 * CLASSIFICATION
 * - SEARCH RUNTIME ADAPTERS
 * - SEARCH DOMAIN
 * - APPLICATION BOUNDARY
 * - ADAPTATION
 * - EXECUTION-OBSERVATION COORDINATION WHEN AUTHORIZED
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-TRACE-OWNING
 * - NON-LINEAGE-OWNING
 * - NON-MUTATING
 * - DETERMINISTIC GIVEN DETERMINISTIC DEPENDENCIES
 *
 * EXECUTION OBSERVATION GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * Execution-observation capabilities are cross-cutting Execution Plane
 * dependencies.
 *
 * They are NOT part of SearchRuntimeProducerAdapterDependencies.
 *
 * Current golden pattern:
 *
 * Anchor policy resolution
 *        ↓
 * exact SearchAnchorSignalsInput
 *        ↓
 * observe_execution_boundary
 *        ↓
 * explicit missing_data
 *        ↓
 * buildSearchAnchorSignals
 *        ↓
 * exact SearchAnchorSignals
 *        ↓
 * buildSearchAnchorProducerExecutionObservedFacts
 *        ↓
 * buildSearchRuntimeExecutionTraceObservation
 *        ↓
 * observe_execution
 *        ↓
 * exact SearchAnchorSignals returned unchanged
 *
 * The adapter coordinates these boundaries but owns none of the produced
 * truths.
 *
 * STRICT EXECUTION OBSERVATION RULES
 * ----------------------------------------------------------------------------
 * - no local missing_data inference
 * - no missing_data: [] fallback
 * - no degradation_reasons -> missing_data conversion
 * - no analytical confidence -> execution confidence conversion
 * - no local execution trace reconstruction
 * - no SearchTraceRecord construction
 * - no trace storage
 * - no fire-and-forget observation transport
 *
 * All pre-existing analytical governance remains unchanged.
 * ========================================================================== */

import {
  buildSearchTemporalDocumentSeriesId,
} from "../temporal/search-temporal-document-series-identity";

import type {
  SearchDocumentId,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchQueryId,
  SearchRelativeEvaluationContext,
} from "../contracts/search-pipeline-contract";

import type {
  SearchRuntimePorts,
} from "./search-runtime-orchestrator";

/* ============================================================================
 * EXECUTION OBSERVATION
 * ========================================================================== */

import {
  buildSearchAnchorProducerExecutionObservedFacts,
} from "../governance/search-producer-execution-observation-core";

import {
  buildSearchRuntimeExecutionTraceObservation,
} from "../governance/search-runtime-execution-observation-core";

import {
  validateSearchRuntimeExecutionBoundaryObservationRequest,
  validateSearchRuntimeExecutionBoundaryObservationResolution,
} from "./search-runtime-execution-boundary-observation-port";

import type {
  SearchRuntimeExecutionBoundaryObservationRequest,
} from "./search-runtime-execution-boundary-observation-port";

import type {
  SearchRuntimeExecutionObservationPorts,
} from "./search-runtime-execution-observation-ports";

/* ============================================================================
 * CANONICAL SIGNAL PRODUCERS
 * ========================================================================== */

import {
  buildSearchAnchorSignals,
} from "../signals/search-anchor-signals-core";

import type {
  SearchAnchorDetectionPolicy,
  SearchAnchorSignalsInput,
} from "../signals/search-anchor-signals-core";

import {
  buildSearchContextAggregation,
} from "../aggregation/search-context-aggregation-core";

import type {
  SearchContextAggregationInput,
} from "../aggregation/search-context-aggregation-core";

import {
  buildSearchLinkSignals,
} from "../signals/search-link-signals-search-core";

import type {
  SearchInboundLinkObservation,
  SearchLinkSignalsSearchInput,
  SearchLinkSignalsSearchPolicy,
} from "../signals/search-link-signals-search-core";

import {
  runSearchTemporalSignalsSearch,
} from "../temporal/search-temporal-signals-search";

import type {
  SearchTemporalSignalsSearchExecutionInput,
} from "../temporal/search-temporal-signals-search";

import type {
  SearchTemporalSearchObservation,
  SearchTemporalSignalsSearchPolicy,
} from "../temporal/search-temporal-signals-search-core";

import {
  buildSearchBehavioralSignals,
} from "../signals/search-behavioral-signals-search-core";

import type {
  SearchBehavioralObservationEvidence,
  SearchBehavioralSignalsSearchInput,
  SearchBehavioralSignalsSearchPolicy,
} from "../signals/search-behavioral-signals-search-core";

/* ============================================================================
 * CANONICAL QUERY PRODUCERS
 * ========================================================================== */

import {
  buildSearchQueryProfile,
} from "../query/search-query-analysis-core";

import type {
  SearchQueryAnalysisInput,
  SearchQueryAnalysisPolicy,
} from "../query/search-query-analysis-core";

import {
  buildSearchQueryDocumentSignals,
} from "../query/search-query-document-signals-core";

import type {
  SearchQueryDocumentSignalsInput,
  SearchQueryDocumentSignalsPolicy,
} from "../query/search-query-document-signals-core";

/* ============================================================================
 * CANONICAL SCORING PRODUCERS
 * ========================================================================== */

import {
  computeSearchIntrinsicDocumentScoreVector,
} from "../scoring/search-document-scoring-core";

import type {
  SearchIntrinsicDocumentScoringInput,
  SearchIntrinsicDocumentScoringPolicy,
} from "../scoring/search-document-scoring-core";

import {
  computeSearchTemporalDocumentScoreVector,
} from "../scoring/search-temporal-document-scoring-core";

import type {
  SearchTemporalDocumentScoringInput,
  SearchTemporalDocumentScoringPolicy,
} from "../scoring/search-temporal-document-scoring-core";

import {
  computeSearchQueryRelativeScoreVector,
} from "../scoring/search-query-relevance-scoring-core";

import type {
  SearchQueryRelevanceScoringInput,
  SearchQueryRelevanceScoringPolicy,
} from "../scoring/search-query-relevance-scoring-core";

import {
  computeSearchLinkAuthorityScoreVector,
} from "../scoring/search-link-authority-scoring-core";

import type {
  SearchLinkAuthorityScoringInput,
  SearchLinkAuthorityScoringPolicy,
} from "../scoring/search-link-authority-scoring-core";

import {
  computeSearchBehavioralCalibrationScoreVector,
} from "../scoring/search-behavioral-calibration-scoring-core";

import type {
  SearchBehavioralCalibrationScoringInput,
  SearchBehavioralCalibrationScoringPolicy,
} from "../scoring/search-behavioral-calibration-scoring-core";

/* ============================================================================
 * POSITIVE SCORE ASSEMBLY
 * ========================================================================== */

import {
  assembleSearchPositiveScoreVector,
} from "../scoring/search-positive-score-assembler";

import type {
  SearchPositiveScoreAssemblerInput,
} from "../scoring/search-positive-score-assembler";

/* ============================================================================
 * PENALTY / AGGREGATION / ELIGIBILITY
 * ========================================================================== */

import {
  evaluateSearchPenalties,
} from "../scoring/search-penalty-evaluation-core";

import type {
  SearchPenaltyEvaluationInput,
  SearchPenaltyEvaluationPolicy,
} from "../scoring/search-penalty-evaluation-core";

import {
  aggregateSearchAnalyticalScores,
} from "../aggregation/search-analytical-aggregation-core";

import type {
  SearchAnalyticalAggregationInput,
  SearchAnalyticalAggregationPolicy,
} from "../aggregation/search-analytical-aggregation-core";

import {
  evaluateSearchEligibility,
} from "../eligibility/search-eligibility-evaluation-core";

import type {
  SearchEligibilityEvaluationInput,
  SearchEligibilityEvaluationPolicy,
} from "../eligibility/search-eligibility-evaluation-core";

/* ============================================================================
 * COHORT PRODUCERS
 * ========================================================================== */

import {
  normalizeSearchCohort,
} from "../cohort/search-cohort-normalization-core";

import type {
  SearchCohortNormalizationInput,
  SearchCohortNormalizationPolicy,
} from "../cohort/search-cohort-normalization-core";

import {
  evaluateSearchRelativeCohort,
} from "../cohort/search-relative-cohort-evaluation-core";

import type {
  SearchRelativeCohortEvaluationInput,
  SearchRelativeCohortEvaluationPolicy,
} from "../cohort/search-relative-cohort-evaluation-core";

/* ============================================================================
 * PRIVATE DECISION
 * ========================================================================== */

import {
  runSearchPrivateDecision,
} from "../decision/search-private-decision-core";

import type {
  SearchPrivateDecisionInput,
  SearchPrivateDecisionPolicy,
} from "../decision/search-private-decision-core";

/* ============================================================================
 * PUBLIC TRANSFORMATION / RANKING
 * ========================================================================== */

import {
  transformSearchPrivateSnapshotToPublicResult,
} from "../transformers/search-public-result-transformer";

import type {
  SearchPublicResultTransformerInput,
  SearchPublicTransformationPolicy,
} from "../transformers/search-public-result-transformer";

import {
  rankSearchPublicResults,
} from "../ranking/search-public-ranking-core";

import type {
  SearchPublicRankingInput,
  SearchPublicRankingPolicy,
} from "../ranking/search-public-ranking-core";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME =
  "xyvala-search-runtime-producer-adapters" as const;

export const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_VERSION:
  SearchModuleVersion =
    "2.0.0";

/* ============================================================================
 * 2. RUNTIME PORT INPUT ALIASES
 * ========================================================================== */

type SearchRuntimeAnchorSignalsInput =
  Parameters<
    SearchRuntimePorts["detect_anchor_signals"]
  >[0];

type SearchRuntimeContextAggregationInput =
  Parameters<
    SearchRuntimePorts["aggregate_context"]
  >[0];

type SearchRuntimeLinkSignalsInput =
  Parameters<
    SearchRuntimePorts["detect_link_signals"]
  >[0];

type SearchRuntimeTemporalSignalsInput =
  Parameters<
    SearchRuntimePorts["detect_temporal_signals"]
  >[0];

type SearchRuntimeBehavioralSignalsInput =
  Parameters<
    SearchRuntimePorts["detect_behavioral_signals"]
  >[0];

type SearchRuntimeQueryAnalysisInput =
  Parameters<
    SearchRuntimePorts["analyze_query"]
  >[0];

type SearchRuntimeQueryDocumentSignalsInput =
  Parameters<
    SearchRuntimePorts["detect_query_document_signals"]
  >[0];

type SearchRuntimeIntrinsicScoringInput =
  Parameters<
    SearchRuntimePorts["score_intrinsic_document"]
  >[0];

type SearchRuntimeTemporalScoringInput =
  Parameters<
    SearchRuntimePorts["score_temporal_document"]
  >[0];

type SearchRuntimeQueryRelevanceScoringInput =
  Parameters<
    SearchRuntimePorts["score_query_relevance"]
  >[0];

type SearchRuntimeLinkAuthorityScoringInput =
  Parameters<
    SearchRuntimePorts["score_link_authority"]
  >[0];

type SearchRuntimeBehavioralCalibrationScoringInput =
  Parameters<
    SearchRuntimePorts["score_behavioral_calibration"]
  >[0];

type SearchRuntimePositiveScoreAssemblyInput =
  Parameters<
    SearchRuntimePorts["assemble_positive_score_vector"]
  >[0];

type SearchRuntimePenaltyEvaluationInput =
  Parameters<
    SearchRuntimePorts["evaluate_penalties"]
  >[0];

type SearchRuntimeAnalyticalAggregationInput =
  Parameters<
    SearchRuntimePorts["aggregate_analytical_score"]
  >[0];

type SearchRuntimeEligibilityInput =
  Parameters<
    SearchRuntimePorts["evaluate_eligibility"]
  >[0];

type SearchRuntimeCohortNormalizationInput =
  Parameters<
    SearchRuntimePorts["normalize_cohort"]
  >[0];

type SearchRuntimeRelativeEvaluationInput =
  Parameters<
    SearchRuntimePorts["evaluate_relative_cohort"]
  >[0];

type SearchRuntimePrivateDecisionInput =
  Parameters<
    SearchRuntimePorts["resolve_private_decision"]
  >[0];

type SearchRuntimePublicTransformationInput =
  Parameters<
    SearchRuntimePorts["transform_public_result"]
  >[0];

type SearchRuntimePublicRankingInput =
  Parameters<
    SearchRuntimePorts["rank_public_results"]
  >[0];

/* ============================================================================
 * 3. ASYNC DEPENDENCY SUPPORT
 * ========================================================================== */

export type SearchRuntimeProducerAdapterResult<T> =
  T | Promise<T>;

/* ============================================================================
 * 4. POLICY RESOLVER
 * ========================================================================== */

export type SearchRuntimeProducerPolicyResolver<
  TInput,
  TPolicy,
> = (
  input:
    TInput,
) =>
  SearchRuntimeProducerAdapterResult<TPolicy>;

/* ============================================================================
 * 5. LINK OBSERVATION PROVIDER
 * ========================================================================== */

export interface SearchRuntimeLinkObservationResolution {
  readonly observations:
    readonly SearchInboundLinkObservation[];

  readonly link_data_provider?:
    string;
}

export type SearchRuntimeLinkObservationProvider =
  (
    input:
      SearchRuntimeLinkSignalsInput,
  ) =>
    SearchRuntimeProducerAdapterResult<
      SearchRuntimeLinkObservationResolution
    >;

/* ============================================================================
 * 6. TEMPORAL OBSERVATION PROVIDER
 * ========================================================================== */

export interface SearchRuntimeTemporalObservationResolution {
  readonly current_observation:
    SearchTemporalSearchObservation;

  readonly historical_observations:
    readonly SearchTemporalSearchObservation[];
}

export type SearchRuntimeTemporalObservationProvider =
  (
    input:
      SearchRuntimeTemporalSignalsInput,
  ) =>
    SearchRuntimeProducerAdapterResult<
      SearchRuntimeTemporalObservationResolution
    >;

/* ============================================================================
 * 7. BEHAVIORAL OBSERVATION PROVIDER
 * ========================================================================== */

export type SearchRuntimeBehavioralObservationProvider =
  (
    input:
      SearchRuntimeBehavioralSignalsInput,
  ) =>
    SearchRuntimeProducerAdapterResult<
      SearchBehavioralObservationEvidence
    >;

/* ============================================================================
 * 8. ANALYTICAL ADAPTER DEPENDENCIES
 * ----------------------------------------------------------------------------
 * This contract deliberately remains analytical-only.
 *
 * Execution Plane capabilities MUST NOT be added here.
 * ========================================================================== */

export interface SearchRuntimeProducerAdapterDependencies {
  readonly resolve_anchor_detection_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeAnchorSignalsInput,
      SearchAnchorDetectionPolicy
    >;

  readonly resolve_link_observations:
    SearchRuntimeLinkObservationProvider;

  readonly resolve_link_signals_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeLinkSignalsInput,
      SearchLinkSignalsSearchPolicy
    >;

  readonly resolve_temporal_observations:
    SearchRuntimeTemporalObservationProvider;

  readonly resolve_temporal_signals_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeTemporalSignalsInput,
      SearchTemporalSignalsSearchPolicy
    >;

  readonly resolve_behavioral_observation_evidence:
    SearchRuntimeBehavioralObservationProvider;

  readonly resolve_behavioral_signals_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeBehavioralSignalsInput,
      SearchBehavioralSignalsSearchPolicy
    >;

  readonly resolve_query_analysis_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeQueryAnalysisInput,
      SearchQueryAnalysisPolicy
    >;

  readonly resolve_query_document_signals_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeQueryDocumentSignalsInput,
      SearchQueryDocumentSignalsPolicy
    >;

  readonly resolve_intrinsic_document_scoring_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeIntrinsicScoringInput,
      SearchIntrinsicDocumentScoringPolicy
    >;

  readonly resolve_temporal_document_scoring_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeTemporalScoringInput,
      SearchTemporalDocumentScoringPolicy
    >;

  readonly resolve_query_relevance_scoring_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeQueryRelevanceScoringInput,
      SearchQueryRelevanceScoringPolicy
    >;

  readonly resolve_link_authority_scoring_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeLinkAuthorityScoringInput,
      SearchLinkAuthorityScoringPolicy
    >;

  readonly resolve_behavioral_calibration_scoring_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeBehavioralCalibrationScoringInput,
      SearchBehavioralCalibrationScoringPolicy
    >;

  readonly resolve_penalty_evaluation_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimePenaltyEvaluationInput,
      SearchPenaltyEvaluationPolicy
    >;

  readonly resolve_analytical_aggregation_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeAnalyticalAggregationInput,
      SearchAnalyticalAggregationPolicy
    >;

  readonly resolve_eligibility_evaluation_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeEligibilityInput,
      SearchEligibilityEvaluationPolicy
    >;

  readonly resolve_cohort_normalization_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeCohortNormalizationInput,
      SearchCohortNormalizationPolicy
    >;

  readonly resolve_relative_cohort_evaluation_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimeRelativeEvaluationInput,
      SearchRelativeCohortEvaluationPolicy
    >;

  readonly resolve_private_decision_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimePrivateDecisionInput,
      SearchPrivateDecisionPolicy
    >;

  readonly resolve_public_transformation_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimePublicTransformationInput,
      SearchPublicTransformationPolicy
    >;

  readonly resolve_public_ranking_policy:
    SearchRuntimeProducerPolicyResolver<
      SearchRuntimePublicRankingInput,
      SearchPublicRankingPolicy
    >;
}

/* ============================================================================
 * 9. ADAPTED PORT DOMAIN
 * ========================================================================== */

export type SearchRuntimeProducerAdapterPorts =
  Pick<
    SearchRuntimePorts,
    | "detect_anchor_signals"
    | "aggregate_context"
    | "detect_link_signals"
    | "detect_temporal_signals"
    | "detect_behavioral_signals"
    | "analyze_query"
    | "detect_query_document_signals"
    | "score_intrinsic_document"
    | "score_temporal_document"
    | "score_query_relevance"
    | "score_link_authority"
    | "score_behavioral_calibration"
    | "assemble_positive_score_vector"
    | "evaluate_penalties"
    | "aggregate_analytical_score"
    | "evaluate_eligibility"
    | "normalize_cohort"
    | "evaluate_relative_cohort"
    | "resolve_private_decision"
    | "transform_public_result"
    | "rank_public_results"
  >;

/* ============================================================================
 * 10. BASIC ASSERTIONS
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
      `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

function assertArray(
  value:
    unknown,

  fieldName:
    string,
): asserts value is readonly unknown[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be an array.`,
    );
  }
}

function assertObject(
  value:
    unknown,

  fieldName:
    string,
): asserts value is object {
  if (
    value === null ||
    typeof value !==
      "object"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be an object.`,
    );
  }
}

/* ============================================================================
 * 11. DOCUMENT / QUERY SCOPE ASSERTIONS
 * ========================================================================== */

function assertSameDocument(
  leftDocumentId:
    SearchDocumentId,

  rightDocumentId:
    SearchDocumentId,

  boundaryName:
    string,
): void {
  assertNonEmptyString(
    leftDocumentId,
    `${boundaryName}.left_document_id`,
  );

  assertNonEmptyString(
    rightDocumentId,
    `${boundaryName}.right_document_id`,
  );

  if (
    leftDocumentId !==
    rightDocumentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
        `First divergence: ${boundaryName} contains different canonical document identities.`,
    );
  }
}

function assertSameQuery(
  leftQueryId:
    SearchQueryId,

  rightQueryId:
    SearchQueryId,

  boundaryName:
    string,
): void {
  assertNonEmptyString(
    leftQueryId,
    `${boundaryName}.left_query_id`,
  );

  assertNonEmptyString(
    rightQueryId,
    `${boundaryName}.right_query_id`,
  );

  if (
    leftQueryId !==
    rightQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
        `First divergence: ${boundaryName} contains different canonical query identities.`,
    );
  }
}

/* ============================================================================
 * 12. POLICY RESOLUTION ASSERTION
 * ========================================================================== */

function assertResolvedPolicy(
  policy:
    unknown,

  fieldName:
    string,
): asserts policy is object {
  assertObject(
    policy,
    fieldName,
  );
}

/* ============================================================================
 * 13. OPTIONAL-EVIDENCE ENVELOPE ADAPTATION
 * ========================================================================== */

function propagateUnavailableEvidence<TTarget>(
  evidence:
    SearchOptionalEvidence<unknown>,
): SearchOptionalEvidence<TTarget> {
  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
        "Internal invariant violation: AVAILABLE evidence cannot cross the unavailable-evidence propagation helper.",
    );
  }

  return Object.freeze({
    availability_state:
      evidence.availability_state,

    reason:
      evidence.reason,
  });
}

function wrapAvailableEvidence<T>(
  value:
    T,
): SearchOptionalEvidence<T> {
  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value,
  });
}

/* ============================================================================
 * 14. ANCHOR SIGNAL DETECTION ADAPTER
 * ----------------------------------------------------------------------------
 * GOLDEN EXECUTION-OBSERVATION PATTERN
 * ========================================================================== */

export function createSearchAnchorSignalsRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_anchor_detection_policy"
    >,

  executionObservationPorts:
    SearchRuntimeExecutionObservationPorts,
): SearchRuntimePorts["detect_anchor_signals"] {
  return async (
    input:
      SearchRuntimeAnchorSignalsInput,
  ) => {
    const documentId =
      input.segmented_document
        .document_id;

    assertSameDocument(
      documentId,
      input.lexical_document
        .document_id,
      "anchor_signals.segmented_document_vs_lexical_document",
    );

    assertSameDocument(
      documentId,
      input.frequency_signals
        .document_id,
      "anchor_signals.segmented_document_vs_frequency_signals",
    );

    const policy =
      await dependencies
        .resolve_anchor_detection_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "anchor_detection_policy",
    );

    const producerInput:
      SearchAnchorSignalsInput = {
      segmented_document:
        input.segmented_document,

      lexical_document:
        input.lexical_document,

      frequency_signals:
        input.frequency_signals,

      created_at:
        input.created_at,

      detection_policy:
        policy,
    };

    /*
     * Execution-boundary SOURCE.
     *
     * missing_data must be explicitly sourced here.
     */
    const boundaryObservationRequest:
      SearchRuntimeExecutionBoundaryObservationRequest<
        "detect_anchor_signals"
      > = {
        port_name:
          "detect_anchor_signals",

        producer_input:
          producerInput,
      };

    validateSearchRuntimeExecutionBoundaryObservationRequest(
      boundaryObservationRequest,
    );

    const boundaryObservationResolution =
      await executionObservationPorts
        .observe_execution_boundary(
          boundaryObservationRequest,
        );

    validateSearchRuntimeExecutionBoundaryObservationResolution(
  boundaryObservationRequest,
  boundaryObservationResolution,
);

    /*
     * Canonical analytical producer.
     */
    const producerOutput =
      buildSearchAnchorSignals(
        producerInput,
      );

    /*
     * Canonical producer-specific dynamic execution facts.
     */
    const observedFacts =
      buildSearchAnchorProducerExecutionObservedFacts({
        producer_input:
          producerInput,

        resolved_policy:
          policy,

        producer_output:
          producerOutput,

        missing_data:
          boundaryObservationResolution
            .missing_data,
      });

    /*
     * Canonical runtime execution observation assembly.
     */
    const runtimeExecutionObservation =
      buildSearchRuntimeExecutionTraceObservation({
        port_name:
          "detect_anchor_signals",

        observed_facts:
          observedFacts,
      });

    /*
     * Transport only.
     *
     * Await completion so observation cannot silently detach from the
     * execution path.
     */
    await executionObservationPorts
      .observe_execution(
        runtimeExecutionObservation,
      );

    /*
     * Exact canonical analytical output.
     */
    return producerOutput;
  };
}

/* ============================================================================
 * 15. CONTEXT AGGREGATION ADAPTER
 * ========================================================================== */

export function createSearchContextAggregationRuntimeProducerAdapter():
  SearchRuntimePorts["aggregate_context"] {
  return (
    input:
      SearchRuntimeContextAggregationInput,
  ) => {
    assertSameDocument(
      input.segmented_document.document_id,
      input.frequency_signals.document_id,
      "context_aggregation.segmented_document_vs_frequency_signals",
    );

    assertSameDocument(
      input.segmented_document.document_id,
      input.intrinsic_anchor_signals.document_id,
      "context_aggregation.segmented_document_vs_anchor_signals",
    );

    const producerInput:
      SearchContextAggregationInput = {
      segmented_document:
        input.segmented_document,

      frequency_signals:
        input.frequency_signals,

      anchor_signals:
        input.intrinsic_anchor_signals,

      created_at:
        input.created_at,
    };

    return buildSearchContextAggregation(
      producerInput,
    );
  };
}

/* ============================================================================
 * 16. LINK SIGNAL DETECTION ADAPTER
 * ========================================================================== */

export function createSearchLinkSignalsRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      | "resolve_link_observations"
      | "resolve_link_signals_policy"
    >,
): SearchRuntimePorts["detect_link_signals"] {
  return async (
    input:
      SearchRuntimeLinkSignalsInput,
  ) => {
    assertSameDocument(
      input.raw_document.document_id,
      input.extracted_document.document_id,
      "link_signals.raw_document_vs_extracted_document",
    );

    const [
      observationResolution,
      policy,
    ] =
      await Promise.all([
        dependencies
          .resolve_link_observations(
            input,
          ),

        dependencies
          .resolve_link_signals_policy(
            input,
          ),
      ]);

    assertObject(
      observationResolution,
      "link_observation_resolution",
    );

    assertArray(
      observationResolution.observations,
      "link_observation_resolution.observations",
    );

    assertResolvedPolicy(
      policy,
      "link_signals_policy",
    );

    const observations =
      Object.freeze([
        ...observationResolution
          .observations,
      ]);

    if (
      observationResolution
        .link_data_provider ===
      undefined
    ) {
      const producerInput:
        SearchLinkSignalsSearchInput = {
        document_id:
          input.raw_document
            .document_id,

        created_at:
          input.created_at,

        observations,

        policy,
      };

      return buildSearchLinkSignals(
        producerInput,
      );
    }

    assertNonEmptyString(
      observationResolution
        .link_data_provider,
      "link_observation_resolution.link_data_provider",
    );

    const producerInput:
      SearchLinkSignalsSearchInput = {
      document_id:
        input.raw_document
          .document_id,

      created_at:
        input.created_at,

      observations,

      link_data_provider:
        observationResolution
          .link_data_provider,

      policy,
    };

    return buildSearchLinkSignals(
      producerInput,
    );
  };
}

/* ============================================================================
 * 17. TEMPORAL SIGNAL DETECTION ADAPTER
 * ========================================================================== */

export function createSearchTemporalSignalsRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      | "resolve_temporal_observations"
      | "resolve_temporal_signals_policy"
    >,
): SearchRuntimePorts["detect_temporal_signals"] {
  return async (
    input:
      SearchRuntimeTemporalSignalsInput,
  ) => {
    const documentId =
      input.raw_document
        .document_id;

    assertSameDocument(
      documentId,
      input.frequency_signals
        .document_id,
      "temporal_signals.raw_document_vs_frequency_signals",
    );

    assertSameDocument(
      documentId,
      input.intrinsic_anchor_signals
        .document_id,
      "temporal_signals.raw_document_vs_anchor_signals",
    );

    assertSameDocument(
      documentId,
      input.context_aggregation
        .document_id,
      "temporal_signals.raw_document_vs_context_aggregation",
    );

    const [
      observationResolution,
      policy,
    ] =
      await Promise.all([
        dependencies
          .resolve_temporal_observations(
            input,
          ),

        dependencies
          .resolve_temporal_signals_policy(
            input,
          ),
      ]);

    assertObject(
      observationResolution,
      "temporal_observation_resolution",
    );

    assertObject(
      observationResolution
        .current_observation,
      "temporal_observation_resolution.current_observation",
    );

    assertArray(
      observationResolution
        .historical_observations,
      "temporal_observation_resolution.historical_observations",
    );

    assertResolvedPolicy(
      policy,
      "temporal_signals_policy",
    );

    const publishedAt =
      input.raw_document
        .source_published_at;

    // Resolve expected series through its canonical identity owner. Never
    // replace or derive historical document-version IDs from the current one.
    const documentSeriesId = buildSearchTemporalDocumentSeriesId({
      source_uri: input.raw_document.source_uri,
      source_type: input.raw_document.source_type,
    });

    const currentHash = observationResolution.current_observation.content_hash;
    if (
      currentHash.availability_state === "AVAILABLE" &&
      currentHash.value !== input.raw_document.content_hash
    ) {
      throw new Error("Temporal observation current content hash differs from Acquisition truth.");
    }

    const historicalObservations =
      Object.freeze([
        ...observationResolution
          .historical_observations,
      ]);

    const producerInput:
      SearchTemporalSignalsSearchExecutionInput = {
      document_series_id:
        documentSeriesId,

      document_id:
        documentId,

      created_at:
        input.created_at,

      published_at:
        publishedAt,

      publication_reference_at:
        input.publication_reference_at,

      current_observation:
        observationResolution
          .current_observation,

      historical_observations:
        historicalObservations,

      policy,
    };

    return runSearchTemporalSignalsSearch(
      producerInput,
    );
  };
}

/* ============================================================================
 * 18. BEHAVIORAL SIGNAL DETECTION ADAPTER
 * ========================================================================== */

export function createSearchBehavioralSignalsRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      | "resolve_behavioral_observation_evidence"
      | "resolve_behavioral_signals_policy"
    >,
): SearchRuntimePorts["detect_behavioral_signals"] {
  return async (
    input:
      SearchRuntimeBehavioralSignalsInput,
  ) => {
    const documentId =
      input.raw_document
        .document_id;

    const queryId =
      input.query
        .query_id;

    assertNonEmptyString(
      documentId,
      "behavioral_signals.document_id",
    );

    assertNonEmptyString(
      queryId,
      "behavioral_signals.query_id",
    );

    const [
      evidence,
      policy,
    ] =
      await Promise.all([
        dependencies
          .resolve_behavioral_observation_evidence(
            input,
          ),

        dependencies
          .resolve_behavioral_signals_policy(
            input,
          ),
      ]);

    assertObject(
      evidence,
      "behavioral_observation_evidence",
    );

    assertResolvedPolicy(
      policy,
      "behavioral_signals_policy",
    );

    const producerInput:
      SearchBehavioralSignalsSearchInput = {
      document_id:
        documentId,

      query_id:
        queryId,

      created_at:
        input.created_at,

      evidence,

      policy,
    };

    return buildSearchBehavioralSignals(
      producerInput,
    );
  };
}

/* ============================================================================
 * 19. QUERY ANALYSIS ADAPTER
 * ========================================================================== */

export function createSearchQueryAnalysisRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_query_analysis_policy"
    >,
): SearchRuntimePorts["analyze_query"] {
  return async (
    input:
      SearchRuntimeQueryAnalysisInput,
  ) => {
    assertNonEmptyString(
      input.query.query_id,
      "query_analysis.query.query_id",
    );

    assertNonEmptyString(
      input.query.created_at,
      "query_analysis.query.created_at",
    );

    assertNonEmptyString(
      input.created_at,
      "query_analysis.runtime_created_at",
    );

    const policy =
      await dependencies
        .resolve_query_analysis_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "query_analysis_policy",
    );

    const producerInput:
      SearchQueryAnalysisInput = {
      query:
        input.query,

      policy,
    };

    return buildSearchQueryProfile(
      producerInput,
    );
  };
}

/* ============================================================================
 * 20. QUERY-DOCUMENT SIGNAL DETECTION ADAPTER
 * ========================================================================== */

export function createSearchQueryDocumentSignalsRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_query_document_signals_policy"
    >,
): SearchRuntimePorts["detect_query_document_signals"] {
  return async (
    input:
      SearchRuntimeQueryDocumentSignalsInput,
  ) => {
    const documentId =
      input.segmented_document
        .document_id;

    assertSameDocument(
      documentId,
      input.lexical_document
        .document_id,
      "query_document_signals.segmented_vs_lexical",
    );

    assertSameDocument(
      documentId,
      input.frequency_signals
        .document_id,
      "query_document_signals.segmented_vs_frequency",
    );

    assertSameDocument(
      documentId,
      input.intrinsic_anchor_signals
        .document_id,
      "query_document_signals.segmented_vs_anchor",
    );

    assertSameDocument(
      documentId,
      input.context_aggregation
        .document_id,
      "query_document_signals.segmented_vs_context",
    );

    const policy =
      await dependencies
        .resolve_query_document_signals_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "query_document_signals_policy",
    );

    const producerInput:
      SearchQueryDocumentSignalsInput = {
      query_profile:
        input.query_profile,

      segmented_document:
        input.segmented_document,

      lexical_document:
        input.lexical_document,

      frequency_signals:
        input.frequency_signals,

      intrinsic_anchor_signals:
        input.intrinsic_anchor_signals,

      context_aggregation:
        input.context_aggregation,

      created_at:
        input.created_at,

      policy,
    };

    return buildSearchQueryDocumentSignals(
      producerInput,
    );
  };
}

/* ============================================================================
 * 21. INTRINSIC DOCUMENT SCORING ADAPTER
 * ========================================================================== */

export function createSearchIntrinsicDocumentScoringRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_intrinsic_document_scoring_policy"
    >,
): SearchRuntimePorts["score_intrinsic_document"] {
  return async (
    input:
      SearchRuntimeIntrinsicScoringInput,
  ) => {
    const documentId =
      input.lexical_document
        .document_id;

    assertSameDocument(
      documentId,
      input.frequency_signals
        .document_id,
      "intrinsic_scoring.lexical_vs_frequency",
    );

    assertSameDocument(
      documentId,
      input.intrinsic_anchor_signals
        .document_id,
      "intrinsic_scoring.lexical_vs_anchor",
    );

    assertSameDocument(
      documentId,
      input.context_aggregation
        .document_id,
      "intrinsic_scoring.lexical_vs_context",
    );

    const policy =
      await dependencies
        .resolve_intrinsic_document_scoring_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "intrinsic_document_scoring_policy",
    );

    const producerInput:
      SearchIntrinsicDocumentScoringInput = {
      lexical_document:
        input.lexical_document,

      frequency_signals:
        input.frequency_signals,

      intrinsic_anchor_signals:
        input.intrinsic_anchor_signals,

      context_aggregation:
        input.context_aggregation,

      created_at:
        input.created_at,

      policy,
    };

    return computeSearchIntrinsicDocumentScoreVector(
      producerInput,
    );
  };
}

/* ============================================================================
 * 22. TEMPORAL DOCUMENT SCORING ADAPTER
 * ========================================================================== */

export function createSearchTemporalDocumentScoringRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_temporal_document_scoring_policy"
    >,
): SearchRuntimePorts["score_temporal_document"] {
  return async (
    input:
      SearchRuntimeTemporalScoringInput,
  ) => {
    const policy =
      await dependencies
        .resolve_temporal_document_scoring_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "temporal_document_scoring_policy",
    );

    const producerInput:
      SearchTemporalDocumentScoringInput = {
      temporal_signals:
        input.temporal_signals,

      created_at:
        input.created_at,

      policy,
    };

    return computeSearchTemporalDocumentScoreVector(
      producerInput,
    );
  };
}

/* ============================================================================
 * 23. QUERY RELEVANCE SCORING ADAPTER
 * ========================================================================== */

export function createSearchQueryRelevanceScoringRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_query_relevance_scoring_policy"
    >,
): SearchRuntimePorts["score_query_relevance"] {
  return async (
    input:
      SearchRuntimeQueryRelevanceScoringInput,
  ) => {
    assertSameQuery(
      input.query_profile
        .query_id,
      input.query_document_signals
        .query_id,
      "query_relevance.query_profile_vs_query_document_signals",
    );

    const policy =
      await dependencies
        .resolve_query_relevance_scoring_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "query_relevance_scoring_policy",
    );

    const producerInput:
      SearchQueryRelevanceScoringInput = {
      query_profile:
        input.query_profile,

      query_document_signals:
        input.query_document_signals,

      created_at:
        input.created_at,

      policy,
    };

    return computeSearchQueryRelativeScoreVector(
      producerInput,
    );
  };
}

/* ============================================================================
 * 24. LINK AUTHORITY SCORING ADAPTER
 * ========================================================================== */

export function createSearchLinkAuthorityScoringRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_link_authority_scoring_policy"
    >,
): SearchRuntimePorts["score_link_authority"] {
  return async (
    input:
      SearchRuntimeLinkAuthorityScoringInput,
  ) => {
    const policy =
      await dependencies
        .resolve_link_authority_scoring_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "link_authority_scoring_policy",
    );

    const producerInput:
      SearchLinkAuthorityScoringInput = {
      link_signals:
        input.link_signals,

      created_at:
        input.created_at,

      policy,
    };

    return computeSearchLinkAuthorityScoreVector(
      producerInput,
    );
  };
}

/* ============================================================================
 * 25. BEHAVIORAL CALIBRATION SCORING ADAPTER
 * ========================================================================== */

export function createSearchBehavioralCalibrationScoringRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_behavioral_calibration_scoring_policy"
    >,
): SearchRuntimePorts["score_behavioral_calibration"] {
  return async (
    input:
      SearchRuntimeBehavioralCalibrationScoringInput,
  ) => {
    const policy =
      await dependencies
        .resolve_behavioral_calibration_scoring_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "behavioral_calibration_scoring_policy",
    );

    const producerInput:
      SearchBehavioralCalibrationScoringInput = {
      behavioral_signals:
        input.behavioral_signals,

      created_at:
        input.created_at,

      policy,
    };

    return computeSearchBehavioralCalibrationScoreVector(
      producerInput,
    );
  };
}

/* ============================================================================
 * 26. POSITIVE SCORE ASSEMBLY ADAPTER
 * ========================================================================== */

export function createSearchPositiveScoreAssemblyRuntimeProducerAdapter():
  SearchRuntimePorts["assemble_positive_score_vector"] {
  return (
    input:
      SearchRuntimePositiveScoreAssemblyInput,
  ) => {
    assertSameDocument(
      input.document_id,
      input.intrinsic_document_score_vector
        .document_id,
      "positive_score_assembly.document_vs_intrinsic",
    );

    assertSameDocument(
      input.document_id,
      input.temporal_document_score_vector
        .document_id,
      "positive_score_assembly.document_vs_temporal",
    );

    assertSameDocument(
      input.document_id,
      input.query_relative_score_vector
        .document_id,
      "positive_score_assembly.document_vs_query_relative",
    );

    assertSameQuery(
      input.query_id,
      input.query_relative_score_vector
        .query_id,
      "positive_score_assembly.query_vs_query_relative",
    );

    const producerInput:
      SearchPositiveScoreAssemblerInput = {
      intrinsic_document_scores:
        input.intrinsic_document_score_vector,

      query_relative_scores:
        input.query_relative_score_vector,

      temporal_document_scores:
        input.temporal_document_score_vector,

      link_authority_scores:
        input.link_authority_score_vector,

      behavioral_calibration_scores:
        input.behavioral_calibration_score_vector,

      created_at:
        input.created_at,
    };

    const result =
      assembleSearchPositiveScoreVector(
        producerInput,
      );

    return result
      .positive_score_vector;
  };
}

/* ============================================================================
 * 27. PENALTY EVALUATION ADAPTER
 * ========================================================================== */

export function createSearchPenaltyEvaluationRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_penalty_evaluation_policy"
    >,
): SearchRuntimePorts["evaluate_penalties"] {
  return async (
    input:
      SearchRuntimePenaltyEvaluationInput,
  ) => {
    const documentId =
      input.lexical_document
        .document_id;

    assertSameDocument(
      documentId,
      input.context_aggregation
        .document_id,
      "penalty_evaluation.lexical_vs_context",
    );

    assertSameDocument(
      documentId,
      input.query_document_signals
        .document_id,
      "penalty_evaluation.lexical_vs_query_document_signals",
    );

    assertSameDocument(
      documentId,
      input.link_signals
        .document_id,
      "penalty_evaluation.lexical_vs_link_signals",
    );

    assertSameDocument(
      documentId,
      input.temporal_signals
        .document_id,
      "penalty_evaluation.lexical_vs_temporal_signals",
    );

    assertNonEmptyString(
      input.query_document_signals
        .query_id,
      "penalty_evaluation.query_document_signals.query_id",
    );

    const policy =
      await dependencies
        .resolve_penalty_evaluation_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "penalty_evaluation_policy",
    );

    const producerInput:
      SearchPenaltyEvaluationInput = {
      lexical_document:
        input.lexical_document,

      context_aggregation:
        input.context_aggregation,

      query_document_signals:
        input.query_document_signals,

      link_signals:
        input.link_signals,

      temporal_signals:
        input.temporal_signals,

      policy,

      created_at:
        input.created_at,
    };

    return evaluateSearchPenalties(
      producerInput,
    );
  };
}

/* ============================================================================
 * 28. ANALYTICAL AGGREGATION ADAPTER
 * ========================================================================== */

export function createSearchAnalyticalAggregationRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_analytical_aggregation_policy"
    >,
): SearchRuntimePorts["aggregate_analytical_score"] {
  return async (
    input:
      SearchRuntimeAnalyticalAggregationInput,
  ) => {
    assertSameDocument(
      input.positive_score_vector
        .document_id,
      input.penalty_vector
        .document_id,
      "analytical_aggregation.positive_vs_penalty_document",
    );

    assertSameQuery(
      input.positive_score_vector
        .query_id,
      input.penalty_vector
        .query_id,
      "analytical_aggregation.positive_vs_penalty_query",
    );

    const policy =
      await dependencies
        .resolve_analytical_aggregation_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "analytical_aggregation_policy",
    );

    const producerInput:
      SearchAnalyticalAggregationInput = {
      positive_score_vector:
        input.positive_score_vector,

      penalty_vector:
        input.penalty_vector,

      policy,

      created_at:
        input.created_at,
    };

    return aggregateSearchAnalyticalScores(
      producerInput,
    );
  };
}

/* ============================================================================
 * 29. ELIGIBILITY EVALUATION ADAPTER
 * ========================================================================== */

export function createSearchEligibilityEvaluationRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_eligibility_evaluation_policy"
    >,
): SearchRuntimePorts["evaluate_eligibility"] {
  return async (
    input:
      SearchRuntimeEligibilityInput,
  ) => {
    const policy =
      await dependencies
        .resolve_eligibility_evaluation_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "eligibility_evaluation_policy",
    );

    const producerInput:
      SearchEligibilityEvaluationInput = {
      global_score:
        input.global_score,

      policy,

      created_at:
        input.created_at,
    };

    return evaluateSearchEligibility(
      producerInput,
    );
  };
}

/* ============================================================================
 * 30. COHORT NORMALIZATION ADAPTER
 * ========================================================================== */

export function createSearchCohortNormalizationRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_cohort_normalization_policy"
    >,
): SearchRuntimePorts["normalize_cohort"] {
  return async (
    input:
      SearchRuntimeCohortNormalizationInput,
  ) => {
    const policy =
      await dependencies
        .resolve_cohort_normalization_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "cohort_normalization_policy",
    );

    const producerInput:
      SearchCohortNormalizationInput = {
      cohort_batch:
        input.cohort_batch,

      policy,

      created_at:
        input.created_at,
    };

    return normalizeSearchCohort(
      producerInput,
    );
  };
}

/* ============================================================================
 * 31. RELATIVE COHORT EVALUATION ADAPTER
 * ========================================================================== */

export function createSearchRelativeCohortEvaluationRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_relative_cohort_evaluation_policy"
    >,
): SearchRuntimePorts["evaluate_relative_cohort"] {
  return async (
    input:
      SearchRuntimeRelativeEvaluationInput,
  ) => {
    assertSameDocument(
      input.candidate.document_id,
      input.candidate
        .global_score
        .document_id,
      "relative_cohort.candidate_vs_global_score_document",
    );

    assertSameDocument(
      input.candidate.document_id,
      input.candidate
        .eligibility
        .document_id,
      "relative_cohort.candidate_vs_eligibility_document",
    );

    assertSameQuery(
      input.candidate.query_id,
      input.candidate
        .global_score
        .query_id,
      "relative_cohort.candidate_vs_global_score_query",
    );

    assertSameQuery(
      input.candidate.query_id,
      input.candidate
        .eligibility
        .query_id,
      "relative_cohort.candidate_vs_eligibility_query",
    );

    assertSameQuery(
      input.candidate.query_id,
      input.cohort_batch
        .query_id,
      "relative_cohort.candidate_vs_cohort_batch_query",
    );

    if (
      input.cohort_distribution
        .availability_state !==
      "AVAILABLE"
    ) {
      return propagateUnavailableEvidence<
        SearchRelativeEvaluationContext
      >(
        input.cohort_distribution,
      );
    }

    const cohortDistribution =
      input.cohort_distribution
        .value;

    if (
      cohortDistribution
        .distribution_id !==
      input.cohort_batch
        .distribution_id
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
          "First divergence: relative cohort evaluation received another canonical distribution identity.",
      );
    }

    if (
      cohortDistribution
        .cohort_id !==
      input.cohort_batch
        .cohort_id
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
          "First divergence: relative cohort evaluation received a distribution from another cohort.",
      );
    }

    assertSameQuery(
      cohortDistribution
        .query_id,
      input.cohort_batch
        .query_id,
      "relative_cohort.distribution_vs_cohort_batch_query",
    );

    const policy =
      await dependencies
        .resolve_relative_cohort_evaluation_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "relative_cohort_evaluation_policy",
    );

    const producerInput:
      SearchRelativeCohortEvaluationInput = {
      cohort_batch:
        input.cohort_batch,

      cohort_distribution:
        cohortDistribution,

      document_id:
        input.candidate
          .document_id,

      policy,

      created_at:
        input.created_at,
    };

    const relativeEvaluation =
      evaluateSearchRelativeCohort(
        producerInput,
      );

    return wrapAvailableEvidence(
      relativeEvaluation,
    );
  };
}

/* ============================================================================
 * 32. PRIVATE DECISION ADAPTER
 * ========================================================================== */

export function createSearchPrivateDecisionRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_private_decision_policy"
    >,
): SearchRuntimePorts["resolve_private_decision"] {
  return async (
    input:
      SearchRuntimePrivateDecisionInput,
  ) => {
    assertSameDocument(
      input.global_score
        .document_id,
      input.eligibility
        .document_id,
      "private_decision.global_score_vs_eligibility_document",
    );

    assertSameQuery(
      input.global_score
        .query_id,
      input.eligibility
        .query_id,
      "private_decision.global_score_vs_eligibility_query",
    );

    if (
      input.relative_evaluation
        .availability_state ===
      "AVAILABLE"
    ) {
      assertSameDocument(
        input.global_score
          .document_id,
        input.relative_evaluation
          .value
          .document_id,
        "private_decision.global_score_vs_relative_document",
      );

      assertSameQuery(
        input.global_score
          .query_id,
        input.relative_evaluation
          .value
          .query_id,
        "private_decision.global_score_vs_relative_query",
      );

      if (
        input.relative_evaluation
          .value
          .cohort_id !==
        input.cohort_id
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
            "First divergence: private decision relative evaluation belongs to another cohort.",
        );
      }
    }

    const policy =
      await dependencies
        .resolve_private_decision_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "private_decision_policy",
    );

    const producerInput:
      SearchPrivateDecisionInput = {
      global_score:
        input.global_score,

      eligibility:
        input.eligibility,

      relative_evaluation:
        input.relative_evaluation,

      cohort_id:
        input.cohort_id,

      policy,

      created_at:
        input.created_at,
    };

    return runSearchPrivateDecision(
      producerInput,
    );
  };
}

/* ============================================================================
 * 33. PUBLIC TRANSFORMATION ADAPTER
 * ========================================================================== */

export function createSearchPublicTransformationRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_public_transformation_policy"
    >,
): SearchRuntimePorts["transform_public_result"] {
  return async (
    input:
      SearchRuntimePublicTransformationInput,
  ) => {
    const policy =
      await dependencies
        .resolve_public_transformation_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "public_transformation_policy",
    );

    const producerInput:
      SearchPublicResultTransformerInput = {
      snapshot:
        input.snapshot,

      policy,

      created_at:
        input.created_at,
    };

    return transformSearchPrivateSnapshotToPublicResult(
      producerInput,
    );
  };
}

/* ============================================================================
 * 34. PUBLIC RANKING ADAPTER
 * ========================================================================== */

export function createSearchPublicRankingRuntimeProducerAdapter(
  dependencies:
    Pick<
      SearchRuntimeProducerAdapterDependencies,
      "resolve_public_ranking_policy"
    >,
): SearchRuntimePorts["rank_public_results"] {
  return async (
    input:
      SearchRuntimePublicRankingInput,
  ) => {
    for (
      const [
        index,
        candidate,
      ] of input.candidates.entries()
    ) {
      assertSameQuery(
        input.query_id,
        candidate.query_id,
        `public_ranking.candidates[${String(index)}]`,
      );

      if (
        candidate.visibility !==
        "PUBLIC"
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTERS_MODULE_NAME}] ` +
            `Boundary violation: public_ranking.candidates[${String(index)}] is not PUBLIC.`,
        );
      }
    }

    const policy =
      await dependencies
        .resolve_public_ranking_policy(
          input,
        );

    assertResolvedPolicy(
      policy,
      "public_ranking_policy",
    );

    const producerInput:
      SearchPublicRankingInput = {
      query_id:
        input.query_id,

      candidates:
        input.candidates,

      policy,

      created_at:
        input.created_at,
    };

    return rankSearchPublicResults(
      producerInput,
    );
  };
}

/* ============================================================================
 * 35. ADAPTER SET FACTORY
 * ----------------------------------------------------------------------------
 * Analytical dependencies and Execution Plane capabilities remain separate
 * arguments.
 *
 * Current execution-observation instrumentation:
 * - detect_anchor_signals only.
 *
 * No implicit generalization to other producers is authorized.
 * ========================================================================== */

export function createSearchRuntimeProducerAdapters(
  dependencies:
    SearchRuntimeProducerAdapterDependencies,

  executionObservationPorts:
    SearchRuntimeExecutionObservationPorts,
): SearchRuntimeProducerAdapterPorts {
  return Object.freeze({
    detect_anchor_signals:
      createSearchAnchorSignalsRuntimeProducerAdapter(
        {
          resolve_anchor_detection_policy:
            dependencies
              .resolve_anchor_detection_policy,
        },

        executionObservationPorts,
      ),

    aggregate_context:
      createSearchContextAggregationRuntimeProducerAdapter(),

    // suite inchangée

    detect_link_signals:
      createSearchLinkSignalsRuntimeProducerAdapter({
        resolve_link_observations:
          dependencies
            .resolve_link_observations,

        resolve_link_signals_policy:
          dependencies
            .resolve_link_signals_policy,
      }),

    detect_temporal_signals:
      createSearchTemporalSignalsRuntimeProducerAdapter({
        resolve_temporal_observations:
          dependencies
            .resolve_temporal_observations,

        resolve_temporal_signals_policy:
          dependencies
            .resolve_temporal_signals_policy,
      }),

    detect_behavioral_signals:
      createSearchBehavioralSignalsRuntimeProducerAdapter({
        resolve_behavioral_observation_evidence:
          dependencies
            .resolve_behavioral_observation_evidence,

        resolve_behavioral_signals_policy:
          dependencies
            .resolve_behavioral_signals_policy,
      }),

    analyze_query:
      createSearchQueryAnalysisRuntimeProducerAdapter({
        resolve_query_analysis_policy:
          dependencies
            .resolve_query_analysis_policy,
      }),

    detect_query_document_signals:
      createSearchQueryDocumentSignalsRuntimeProducerAdapter({
        resolve_query_document_signals_policy:
          dependencies
            .resolve_query_document_signals_policy,
      }),

    score_intrinsic_document:
      createSearchIntrinsicDocumentScoringRuntimeProducerAdapter({
        resolve_intrinsic_document_scoring_policy:
          dependencies
            .resolve_intrinsic_document_scoring_policy,
      }),

    score_temporal_document:
      createSearchTemporalDocumentScoringRuntimeProducerAdapter({
        resolve_temporal_document_scoring_policy:
          dependencies
            .resolve_temporal_document_scoring_policy,
      }),

    score_query_relevance:
      createSearchQueryRelevanceScoringRuntimeProducerAdapter({
        resolve_query_relevance_scoring_policy:
          dependencies
            .resolve_query_relevance_scoring_policy,
      }),

    score_link_authority:
      createSearchLinkAuthorityScoringRuntimeProducerAdapter({
        resolve_link_authority_scoring_policy:
          dependencies
            .resolve_link_authority_scoring_policy,
      }),

    score_behavioral_calibration:
      createSearchBehavioralCalibrationScoringRuntimeProducerAdapter({
        resolve_behavioral_calibration_scoring_policy:
          dependencies
            .resolve_behavioral_calibration_scoring_policy,
      }),

    assemble_positive_score_vector:
      createSearchPositiveScoreAssemblyRuntimeProducerAdapter(),

    evaluate_penalties:
      createSearchPenaltyEvaluationRuntimeProducerAdapter({
        resolve_penalty_evaluation_policy:
          dependencies
            .resolve_penalty_evaluation_policy,
      }),

    aggregate_analytical_score:
      createSearchAnalyticalAggregationRuntimeProducerAdapter({
        resolve_analytical_aggregation_policy:
          dependencies
            .resolve_analytical_aggregation_policy,
      }),

    evaluate_eligibility:
      createSearchEligibilityEvaluationRuntimeProducerAdapter({
        resolve_eligibility_evaluation_policy:
          dependencies
            .resolve_eligibility_evaluation_policy,
      }),

    normalize_cohort:
      createSearchCohortNormalizationRuntimeProducerAdapter({
        resolve_cohort_normalization_policy:
          dependencies
            .resolve_cohort_normalization_policy,
      }),

    evaluate_relative_cohort:
      createSearchRelativeCohortEvaluationRuntimeProducerAdapter({
        resolve_relative_cohort_evaluation_policy:
          dependencies
            .resolve_relative_cohort_evaluation_policy,
      }),

    resolve_private_decision:
      createSearchPrivateDecisionRuntimeProducerAdapter({
        resolve_private_decision_policy:
          dependencies
            .resolve_private_decision_policy,
      }),

    transform_public_result:
      createSearchPublicTransformationRuntimeProducerAdapter({
        resolve_public_transformation_policy:
          dependencies
            .resolve_public_transformation_policy,
      }),

    rank_public_results:
      createSearchPublicRankingRuntimeProducerAdapter({
        resolve_public_ranking_policy:
          dependencies
            .resolve_public_ranking_policy,
      }),
  });
}

/* ============================================================================
 * 36. STATIC ADAPTER OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_OWNERSHIP =
  Object.freeze({
    detect_anchor_signals:
      "ANCHOR_SIGNAL_DETECTION",

    aggregate_context:
      "CONTEXT_AGGREGATION",

    detect_link_signals:
      "LINK_SIGNAL_DETECTION",

    detect_temporal_signals:
      "TEMPORAL_SIGNAL_DETECTION",

    detect_behavioral_signals:
      "BEHAVIORAL_SIGNAL_DETECTION",

    analyze_query:
      "QUERY_PROFILING",

    detect_query_document_signals:
      "QUERY_DOCUMENT_SIGNAL_DETECTION",

    score_intrinsic_document:
      "INTRINSIC_DOCUMENT_SCORING",

    score_temporal_document:
      "TEMPORAL_DOCUMENT_SCORING",

    score_query_relevance:
      "QUERY_RELEVANCE_SCORING",

    score_link_authority:
      "LINK_AUTHORITY_SCORING",

    score_behavioral_calibration:
      "BEHAVIORAL_CALIBRATION_SCORING",

    assemble_positive_score_vector:
      "POSITIVE_SCORE_ASSEMBLY",

    evaluate_penalties:
      "PENALTY_EVALUATION",

    aggregate_analytical_score:
      "ANALYTICAL_AGGREGATION",

    evaluate_eligibility:
      "ELIGIBILITY_EVALUATION",

    normalize_cohort:
      "COHORT_NORMALIZATION",

    evaluate_relative_cohort:
      "RELATIVE_COHORT_EVALUATION",

    resolve_private_decision:
      "PRIVATE_DECISION",

    transform_public_result:
      "TRANSFORMATION",

    rank_public_results:
      "PUBLIC_RANKING",
  } as const);

/* ============================================================================
 * 37. STATIC ADAPTER GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_GOVERNANCE =
  Object.freeze({
    analytical_owner:
      false,

    canonical_producer:
      false,

    adaptation_only:
      true,

    canonical_producer_invocation_allowed:
      true,

    producer_output_mutation_allowed:
      false,

    producer_output_reconstruction_allowed:
      false,

    canonical_identity_propagation_required:
      true,

    document_identity_generation_allowed:
      false,

    query_identity_generation_allowed:
      false,

    cohort_identity_generation_allowed:
      false,

    distribution_identity_generation_allowed:
      false,

    canonical_identity_mutation_allowed:
      false,

    policy_selection_owner:
      false,

    policy_resolution_dependency_consumption_allowed:
      true,

    resolved_policy_transport_allowed:
      true,

    resolved_policy_mutation_allowed:
      false,

    policy_merge_allowed:
      false,

    policy_inference_allowed:
      false,

    policy_reconstruction_allowed:
      false,

    policy_fallback_allowed:
      false,

    default_policy_runtime_fallback_allowed:
      false,

    calibration_execution_allowed:
      false,

    observation_provider_consumption_allowed:
      true,

    observation_transport_allowed:
      true,

    observation_creation_allowed:
      false,

    observation_reconstruction_allowed:
      false,

    execution_observation_boundary_invocation_allowed:
      true,

    execution_observation_transport_invocation_allowed:
      true,

    execution_observation_materializer_invocation_allowed:
      true,

    execution_observation_owner:
      false,

    execution_observation_fact_creation_allowed:
      false,

    execution_observation_reconstruction_allowed:
      false,

    execution_missing_data_inference_allowed:
      false,

    degradation_reason_to_missing_data_conversion_allowed:
      false,

    analytical_confidence_as_execution_confidence_allowed:
      false,

    execution_trace_creation_allowed:
      false,

    execution_trace_storage_allowed:
      false,

    execution_observation_fire_and_forget_allowed:
      false,

    explicit_timestamp_transport_allowed:
      true,

    runtime_timestamp_generation_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    implicit_timestamp_substitution_allowed:
      false,

    source_publication_evidence_transport_allowed:
      true,

    source_publication_reconstruction_allowed:
      false,

    fetched_at_as_published_at_allowed:
      false,

    created_at_as_published_at_allowed:
      false,

    unavailable_published_at_substitution_allowed:
      false,

    explicit_publication_reference_transport_allowed:
      true,

    publication_reference_generation_allowed:
      false,

    publication_reference_reconstruction_allowed:
      false,

    publication_age_calculation_allowed:
      false,

    publication_age_reconstruction_allowed:
      false,

    optional_evidence_transport_allowed:
      true,

    optional_evidence_envelope_adaptation_allowed:
      true,

    availability_state_preservation_required:
      true,

    availability_reason_preservation_required:
      true,

    available_payload_preservation_required:
      true,

    availability_reinterpretation_allowed:
      false,

    unavailable_to_available_allowed:
      false,

    unavailable_to_zero_allowed:
      false,

    unavailable_to_neutral_allowed:
      false,

    unavailable_to_watch_allowed:
      false,

    query_normalization_allowed:
      false,

    query_profiling_reconstruction_allowed:
      false,

    signal_calculation_allowed:
      false,

    signal_reconstruction_allowed:
      false,

    score_calculation_allowed:
      false,

    score_vector_reconstruction_allowed:
      false,

    synthetic_score_vector_allowed:
      false,

    neutral_score_fabrication_allowed:
      false,

    positive_penalty_branch_merge_allowed:
      false,

    analytical_aggregation_calculation_allowed:
      false,

    eligibility_calculation_allowed:
      false,

    cohort_distribution_calculation_allowed:
      false,

    cohort_statistics_calculation_allowed:
      false,

    relative_evaluation_calculation_allowed:
      false,

    relative_position_calculation_allowed:
      false,

    percentile_calculation_allowed:
      false,

    private_decision_calculation_allowed:
      false,

    private_decision_inference_allowed:
      false,

    block_creation_allowed:
      false,

    watch_creation_allowed:
      false,

    allow_creation_allowed:
      false,

    public_projection_calculation_allowed:
      false,

    public_label_calculation_allowed:
      false,

    public_ranking_calculation_allowed:
      false,

    public_position_creation_allowed:
      false,

    upstream_truth_reconstruction_allowed:
      false,

    downstream_truth_reconstruction_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    execution_trace_reconstruction_allowed:
      false,

    lineage_semantic_mutation_allowed:
      false,

    persistence_allowed:
      false,

    runtime_mutation_allowed:
      false,

    event_publication_allowed:
      false,

    logging_allowed:
      false,

    direct_http_dependency_allowed:
      false,

    network_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    deterministic_dependency_requirement:
      true,

    deterministic_input_propagation_required:
      true,

    canonical_reference_preservation_required:
      true,

    first_divergence_validation_required:
      true,

    prohibited_shortcuts:
      Object.freeze([
        "adapter_generated_analytical_truth",
        "adapter_reconstructed_upstream_truth",
        "adapter_reconstructed_score_vector",

        "adapter_selected_default_policy",
        "adapter_repaired_missing_policy",
        "adapter_mutated_resolved_policy",

        "adapter_generated_observation",
        "adapter_reconstructed_historical_observation",
        "adapter_generated_observation_identity",

        "adapter_fabricated_execution_missing_data",
        "adapter_converted_degradation_reason_to_missing_data",
        "adapter_reused_analytical_confidence_as_execution_confidence",
        "adapter_reconstructed_runtime_execution_observation",
        "adapter_created_search_trace_record",
        "adapter_stored_execution_trace",
        "adapter_silently_detached_execution_observation",

        "adapter_generated_runtime_timestamp",
        "adapter_read_runtime_clock",

        "fetched_at_as_published_at",
        "created_at_as_published_at",
        "observed_at_as_published_at",
        "first_observed_at_as_published_at",
        "last_observed_at_as_published_at",
        "adapter_reconstructed_published_at",
        "adapter_repaired_unavailable_published_at",

        "adapter_generated_publication_reference_at",
        "adapter_reconstructed_publication_reference_at",
        "runtime_clock_as_publication_reference_at",
        "published_at_as_publication_reference_at",
        "observed_at_as_publication_reference_at",
        "fetched_at_as_publication_reference_at",

        "adapter_calculated_publication_age_ms",
        "adapter_reconstructed_publication_age_ms",
        "adapter_publication_age_zero_fallback",

        "unavailable_to_zero",
        "unavailable_to_neutral",
        "unavailable_to_watch",
        "unavailable_to_available",
        "insufficient_data_to_value",
        "insufficient_history_to_value",
        "unsupported_to_value",
        "invalid_to_value",

        "adapter_query_normalization",
        "adapter_query_profile_reconstruction",
        "adapter_signal_recalculation",
        "adapter_score_recalculation",
        "adapter_penalty_calculation",
        "adapter_analytical_aggregation_calculation",
        "adapter_eligibility_calculation",

        "adapter_fabricated_cohort_distribution",
        "adapter_calculated_cohort_statistics",
        "adapter_fabricated_relative_evaluation",
        "adapter_calculated_percentile",
        "adapter_calculated_relative_position",

        "adapter_inferred_private_decision",
        "adapter_generated_block",
        "adapter_generated_watch",
        "adapter_generated_allow",

        "adapter_generated_public_label",
        "adapter_generated_public_position",
        "private_relative_position_as_public_position",

        "adapter_reconstructed_variable_lineage",
        "adapter_reconstructed_execution_trace",

        "adapter_persistence",
        "adapter_runtime_mutation",
        "adapter_event_publication",
        "adapter_network_access",
        "adapter_random_identity_generation",
      ] as const),
  } as const);
