/* ============================================================================
 * FILE:
 * lib/xyvala/search/domains/financial-news/
 * search-financial-news-public-application-composition.ts
 *
 * XYVALA SEARCH — FINANCIAL NEWS PUBLIC APPLICATION COMPOSITION
 *
 * ROLE
 * ----
 * Binds canonical Financial News preparation/execution boundaries into the
 * generic public application orchestration.
 *
 * It does not reproduce acquisition, composition or runtime logic.
 * ========================================================================== */

import type {
  SearchFinancialNewsApplicationCompositionInput,
} from "./search-financial-news-application-composition";

import {
  prepareSearchFinancialNewsRun,
  type SearchFinancialNewsPreparedRun,
  type SearchFinancialNewsRunPreparationInput,
} from "./search-financial-news-run-preparation";

import {
  executeSearchFinancialNewsPreparedRun,
  type SearchFinancialNewsRunExecutionInput,
} from "./search-financial-news-run-execution";

import {
  createSearchPublicApplicationOrchestration,
} from "../../runtime/search-public-application-orchestration";

import type {
  SearchPublicApplicationOrchestration,
  SearchPublicApplicationOrchestrationCapabilities,
} from "../../contracts/search-public-application-orchestration-contract";

export const XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_APPLICATION_COMPOSITION_MODULE_VERSION =
  "1.0.0" as const;

export interface SearchFinancialNewsPublicApplicationCompositionInput {
  readonly financial_news_application:
    SearchFinancialNewsApplicationCompositionInput;

  readonly capabilities:
    SearchPublicApplicationOrchestrationCapabilities;
}

export function createSearchFinancialNewsPublicApplicationComposition(
  input: SearchFinancialNewsPublicApplicationCompositionInput,
): SearchPublicApplicationOrchestration {
  return createSearchPublicApplicationOrchestration<
    SearchFinancialNewsPreparedRun
  >({
    capabilities: input.capabilities,

    prepare: async ({
      query,
      created_at,
    }) => {
      const preparationInput:
        SearchFinancialNewsRunPreparationInput = {
          authorized_acquisition_source:
            input.financial_news_application
              .authorized_acquisition_source,

          acquisition_input: Object.freeze({
            query,
            created_at,
          }),

          behavioral_calibration_scoring_policy:
            input.financial_news_application
              .behavioral_calibration_scoring_policy,

          authorized_link_observation_source:
            input.financial_news_application
              .authorized_link_observation_source,

          authorized_temporal_observation_source:
            input.financial_news_application
              .authorized_temporal_observation_source,

          authorized_behavioral_observation_source:
            input.financial_news_application
              .authorized_behavioral_observation_source,
        };

      return prepareSearchFinancialNewsRun(
        preparationInput,
      );
    },

    execute_prepared: async ({
      prepared,
      cohort_definition,
      created_at,
      publication_reference_at,
      snapshot_version,
    }) => {
      const executionInput:
        SearchFinancialNewsRunExecutionInput = {
          prepared_run: prepared,
          cohort_definition,
          created_at,
          publication_reference_at,
          snapshot_version,
        };

      return executeSearchFinancialNewsPreparedRun(
        executionInput,
      );
    },
  });
}
