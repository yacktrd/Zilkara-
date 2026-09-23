/* ============================================================================
 * FILE:
 * lib/xyvala/search/runtime/search-public-application-orchestration.ts
 *
 * XYVALA SEARCH — PUBLIC APPLICATION ORCHESTRATION
 *
 * SEQUENCE
 * --------
 * caller truth
 * → query identity + preparation timestamp
 * → SearchQuery Input Core
 * → canonical preparation
 * → cohort identity + analytical timestamp
 * → Cohort Input Core
 * → canonical prepared execution
 *
 * This module is orchestration only.
 * ========================================================================== */

import {
  buildSearchQuery,
  type SearchQueryBuildInput,
} from "../query/search-query-input-core";

import {
  buildSearchCohortDefinition,
  type SearchCohortDefinitionBuildInput,
} from "../cohort/search-cohort-definition-input-core";

import type {
  SearchPublicApplicationOrchestration,
  SearchPublicApplicationOrchestrationDependencies,
  SearchPublicApplicationOrchestrationInput,
} from "../contracts/search-public-application-orchestration-contract";

export const XYVALA_SEARCH_PUBLIC_APPLICATION_ORCHESTRATION_MODULE_VERSION =
  "1.0.0" as const;

export function createSearchPublicApplicationOrchestration<TPrepared>(
  dependencies:
    SearchPublicApplicationOrchestrationDependencies<TPrepared>,
): SearchPublicApplicationOrchestration {
  return Object.freeze({
    run: async (
      input: SearchPublicApplicationOrchestrationInput,
    ) => {
      /**
       * Preparation-scoped truths.
       */
      const queryId =
        await dependencies.capabilities.provide_query_id();

      const preparationCreatedAt =
        await dependencies.capabilities.provide_preparation_created_at();

      const queryInput: SearchQueryBuildInput = {
        ...input.request,
        query_id: queryId,
        created_at: preparationCreatedAt,
        query_origin: input.query_origin,
      };

      const query = buildSearchQuery(queryInput);

      /**
       * Canonical preparation MUST resolve before analytical-time truths.
       */
      const prepared =
        await dependencies.prepare({
          query,
          created_at: preparationCreatedAt,
        });

      /**
       * Execution-scoped truths are observed only after preparation.
       */
      const cohortId =
        await dependencies.capabilities.provide_cohort_id();

      const analyticalCreatedAt =
        await dependencies.capabilities.provide_analytical_created_at();

      const cohortInput: SearchCohortDefinitionBuildInput = {
        ...input.cohort_configuration,
        cohort_id: cohortId,
        query_id: query.query_id,
        created_at: analyticalCreatedAt,
      };

      const cohortDefinition =
        buildSearchCohortDefinition(cohortInput);

      return dependencies.execute_prepared({
        prepared,
        cohort_definition: cohortDefinition,
        created_at: analyticalCreatedAt,
        publication_reference_at:
          input.runtime_truth.publication_reference_at,
        snapshot_version:
          input.runtime_truth.snapshot_version,
      });
    },
  });
}
