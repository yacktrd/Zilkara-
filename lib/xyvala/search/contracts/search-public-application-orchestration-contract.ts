/* ============================================================================
 * FILE:
 * lib/xyvala/search/contracts/search-public-application-orchestration-contract.ts
 *
 * XYVALA SEARCH — PUBLIC APPLICATION ORCHESTRATION CONTRACT
 *
 * ROLE
 * ----
 * Non-analytical application boundary between public caller truth and
 * canonical Search preparation/execution.
 *
 * OWNERSHIP
 * ---------
 * Caller Request Truth remains caller-owned.
 * SearchQuery remains owned by SearchQuery Input Core.
 * SearchCohortDefinition remains owned by Cohort Input Core.
 * Preparation/execution remain owned by their canonical domain boundaries.
 *
 * No local identity generation, clock read, scoring, ranking, normalization,
 * HTTP or runtime reconstruction is authorized here.
 * ========================================================================== */

import type {
  SearchQueryBuildInput,
} from "../query/search-query-input-core";

import type {
  SearchCohortDefinitionBuildInput,
} from "../cohort/search-cohort-definition-input-core";

import type {
  SearchRuntimeApplicationExecutionInput,
} from "../runtime/search-runtime-application";

import type {
  SearchPublicRankingProjection,
} from "./search-pipeline-contract";

import type {
  SearchPublicRequest,
} from "./search-public-request-contract";

export const XYVALA_SEARCH_PUBLIC_APPLICATION_ORCHESTRATION_CONTRACT_VERSION =
  "1.0.0" as const;

export type SearchPublicCanonicalQuery =
  ReturnType<
    typeof import("../query/search-query-input-core").buildSearchQuery
  >;

export type SearchPublicCanonicalCohortDefinition =
  ReturnType<
    typeof import("../cohort/search-cohort-definition-input-core")
      .buildSearchCohortDefinition
  >;

export type SearchPublicApplicationValueProvider<T> =
  () => T | Promise<T>;

export interface SearchPublicApplicationOrchestrationCapabilities {
  readonly provide_query_id:
    SearchPublicApplicationValueProvider<
      SearchQueryBuildInput["query_id"]
    >;

  readonly provide_cohort_id:
    SearchPublicApplicationValueProvider<
      SearchCohortDefinitionBuildInput["cohort_id"]
    >;

  /**
   * Timestamp attached to the caller/query preparation truth.
   * Must exist before Financial News acquisition preparation.
   */
  readonly provide_preparation_created_at:
    SearchPublicApplicationValueProvider<
      SearchQueryBuildInput["created_at"]
    >;

  /**
   * Analytical timestamp.
   * It is requested only AFTER canonical preparation resolves.
   */
  readonly provide_analytical_created_at:
    SearchPublicApplicationValueProvider<
      SearchRuntimeApplicationExecutionInput["created_at"]
    >;
}

export type SearchPublicApplicationCohortConfiguration = Readonly<
  Pick<
    SearchCohortDefinitionBuildInput,
    | "language"
    | "domain"
    | "allowed_source_types"
    | "time_window"
    | "corpus_version"
    | "minimum_cohort_size"
    | "comparability_policy_version"
    | "ranking_policy_version"
  >
>;

export type SearchPublicApplicationRuntimeTruth = Readonly<
  Pick<
    SearchRuntimeApplicationExecutionInput,
    | "publication_reference_at"
    | "snapshot_version"
  >
>;

export interface SearchPublicApplicationOrchestrationInput {
  readonly request: SearchPublicRequest;

  readonly query_origin:
    SearchQueryBuildInput["query_origin"];

  readonly cohort_configuration:
    SearchPublicApplicationCohortConfiguration;

  readonly runtime_truth:
    SearchPublicApplicationRuntimeTruth;
}

export interface SearchPublicApplicationPreparationInput {
  readonly query: SearchPublicCanonicalQuery;

  readonly created_at:
    SearchQueryBuildInput["created_at"];
}

export interface SearchPublicApplicationPreparedExecutionInput<TPrepared> {
  readonly prepared: TPrepared;

  readonly cohort_definition:
    SearchPublicCanonicalCohortDefinition;

  readonly created_at:
    SearchRuntimeApplicationExecutionInput["created_at"];

  readonly publication_reference_at:
    SearchRuntimeApplicationExecutionInput["publication_reference_at"];

  readonly snapshot_version:
    SearchRuntimeApplicationExecutionInput["snapshot_version"];
}

export interface SearchPublicApplicationOrchestrationDependencies<TPrepared> {
  readonly capabilities:
    SearchPublicApplicationOrchestrationCapabilities;

  /**
   * Query-scoped preparation boundary.
   * Must resolve before analytical created_at is requested.
   */
  readonly prepare:
    (
      input: SearchPublicApplicationPreparationInput,
    ) => Promise<TPrepared>;

  /**
   * Canonical prepared-run execution boundary.
   */
  readonly execute_prepared:
    (
      input: SearchPublicApplicationPreparedExecutionInput<TPrepared>,
    ) => Promise<SearchPublicRankingProjection>;
}

export interface SearchPublicApplicationOrchestration {
  readonly run:
    (
      input: SearchPublicApplicationOrchestrationInput,
    ) => Promise<SearchPublicRankingProjection>;
}
