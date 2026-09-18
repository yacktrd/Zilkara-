/* ============================================================================
 * FILE: scripts/xyvala/search/validate-financial-news-dataforseo-runtime-integration.ts
 * Private offline integration validation. All external sources are simulated.
 *
 * Uses the real Query/Cohort producers, acquisition preparation, Financial News
 * composition, prepared-run execution, runtime adapters and public API boundary.
 * No real fetch, credentials, environment files or production configuration.
 * No score, snapshot, trace or lineage is reconstructed by this test.
 * Runtime-created traces, if reached, describe this simulated execution only.
 *
 * Link adapter assertions inspect canonical signals directly. Application runs
 * expose only their canonical public projection, never private Link internals.
 * Every scenario has independent counters. Provider failures must reject.
 * Unexpected application failures remain failures, are reported together and
 * produce exit code 1. They never become successful empty projections.
 * ========================================================================== */

import { isDeepStrictEqual } from "node:util";
import { buildSearchTemporalDocumentSeriesId } from "../../../lib/xyvala/search/temporal/search-temporal-document-series-identity";
import { buildSearchQuery } from "../../../lib/xyvala/search/query/search-query-input-core";
import { buildSearchCohortDefinition } from "../../../lib/xyvala/search/cohort/search-cohort-definition-input-core";
import { buildSearchRawDocument } from "../../../lib/xyvala/search/acquisition/search-acquisition-core";
import { buildSearchExtractedDocument } from "../../../lib/xyvala/search/extraction/search-extraction-core";
import { exposeSearchPublicRankingProjection } from "../../../lib/xyvala/search/api/search-public-api-core";
import { createSearchLinkSignalsRuntimeProducerAdapter } from "../../../lib/xyvala/search/runtime/search-runtime-producer-adapters";
import { createSearchFinancialNewsApplicationComposition } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-application-composition";
import { prepareSearchFinancialNewsRun } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-run-preparation";
import { executeSearchFinancialNewsPreparedRun } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-run-execution";
import { SearchFinancialNewsAcquisitionPreparationError } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-acquisition-preparation";
import { createSearchFinancialNewsRuntimePolicyComposition } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-composition";
import { createSearchFinancialNewsRuntimeProducerAdapterDependencies } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-runtime-configuration";
import { XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_BOOTSTRAP_POLICY_V1 } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-behavioral-calibration-bootstrap-policy";
import {
  createSearchFinancialNewsDataForSeoLinkObservationSource,
  SearchFinancialNewsDataForSeoLinkObservationError,
  XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_DATA_PROVIDER,
  type SearchFinancialNewsDataForSeoLinkObservationErrorCode,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-dataforseo-link-observation-source";
import type { SearchFinancialNewsAcquisitionInput } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-acquisition-adapter";
import type { SearchFinancialNewsRunPreparationInput } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-run-preparation";

const TIMES = Object.freeze({
  query: "2026-09-12T10:00:00.000Z",
  preparation: "2026-09-12T10:00:01.000Z",
  fetched: "2026-09-12T10:00:02.000Z",
  acquired: "2026-09-12T10:00:03.000Z",
  analytical: "2026-09-12T10:00:04.000Z",
  publication_reference: "2026-09-12T10:00:03.500Z",
  published: "2026-09-12T09:30:00.000Z",
});
const QUERY_INPUT = Object.freeze({
  query_id: "private-dataforseo-runtime-query",
  created_at: TIMES.query,
  raw_query: "Apple revenue",
  requested_language: "en",
  requested_source_types: Object.freeze(["ARTICLE"] as const),
  requested_domain: "financial-news",
  query_origin: "PRIVATE_TEST" as const,
});
const CALIBRATION = XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_BOOTSTRAP_POLICY_V1;
const UNAVAILABLE = Object.freeze({
  availability_state: "UNAVAILABLE" as const,
  reason: "PRIVATE_TEST_NO_EXTERNAL_EVIDENCE",
});
const ITEMS = Object.freeze([
  Object.freeze({ type: "backlink", url_from: "https://alpha.example/a#section",
    anchor: "  Apple   revenue  ", last_seen: "2026-09-11 10:00:00 +00:00", links_count: 7 }),
  Object.freeze({ type: "backlink", url_from: "https://beta.example/b",
    anchor: "Quarterly results", last_seen: "2026-09-10 09:00:00 +00:00", links_count: 1 }),
  Object.freeze({ type: "backlink", url_from: "https://alpha.example/c",
    anchor: null, last_seen: "2026-09-09 08:00:00 +00:00", links_count: 4 }),
]);
const ARTICLE = [
  "Apple revenue quarterly financial results",
  "Apple revenue increased during the quarter as customers purchased devices and subscribed to services. " +
  "The company presented detailed financial results covering regional sales, operating expenses and cash generation. " +
  "Management discussed demand across different markets and explained how product availability affected shipments.",
  "Apple revenue from services supported the business while hardware sales varied between regions. " +
  "The report described research spending, distribution agreements and investments in customer support. " +
  "Analysts compared the published figures with earlier periods and examined changes in operating margins.",
  "Apple revenue remains a central measure in the quarterly financial discussion. " +
  "Investors also reviewed inventory, currency effects, capital expenditure and supplier commitments. " +
  "These fictional statements provide an explicit offline document fixture and describe no real financial event.",
].join("\n\n");
const DOCUMENTS: readonly SearchFinancialNewsAcquisitionInput[] = Object.freeze([
  Object.freeze({
    source_uri: "https://finance.example.test/apple-revenue?id=42",
    source_type: "ARTICLE", mime_type: "text/plain", raw_content: ARTICLE,
    fetched_at: TIMES.fetched, created_at: TIMES.acquired,
    source_published_at: Object.freeze({ availability_state: "AVAILABLE" as const, value: TIMES.published }),
    acquisition_method: "PRIVATE_OFFLINE_RUNTIME_FIXTURE_V1", acquisition_module_version: "1.0.0",
    source_metadata: Object.freeze({ title: "Apple revenue: quarterly financial results" }),
  }),
  Object.freeze({
    source_uri: "https://finance.example.test/apple-services?id=43",
    source_type: "ARTICLE", mime_type: "text/plain",
    raw_content: ARTICLE + "\n\nApple revenue analysis also covers subscriptions and international distribution.",
    fetched_at: TIMES.fetched, created_at: TIMES.acquired,
    source_published_at: Object.freeze({ availability_state: "AVAILABLE" as const, value: TIMES.published }),
    acquisition_method: "PRIVATE_OFFLINE_RUNTIME_FIXTURE_V1", acquisition_module_version: "1.0.0",
    source_metadata: Object.freeze({ title: "Apple revenue and services review" }),
  }),
]);

type Mode = "SUCCESS" | "EMPTY_LINKS" | "EMPTY_ACQUISITION" |
  SearchFinancialNewsDataForSeoLinkObservationErrorCode;
type Counters = { acquisition: number; transport: number; temporal: number; behavioral: number };
class CheckFailure extends Error {}

async function main(): Promise<void> {
  const checks: string[] = [];
  const scenarios: { name: string; calls: Counters; public_result_count: number | null }[] = [];
  const runtimeErrors: { stage: string; message: string }[] = [];
  let stage = "CANONICAL_INPUTS";
  const check = (condition: boolean, name: string): void => {
    if (!condition) throw new CheckFailure(name);
    checks.push(name);
  };
  const expectReject = async (run: () => unknown, accepts: (error: unknown) => boolean, name: string) => {
    let rejected = false;
    try { await run(); } catch (error: unknown) {
      rejected = true;
      // Unexpected upstream divergence stays visible; it cannot validate this case.
      if (!accepts(error)) throw error;
    }
    check(rejected, name);
  };

  try {
    const query = buildSearchQuery(QUERY_INPUT);
    const policies = createSearchFinancialNewsRuntimePolicyComposition({
      behavioral_calibration_scoring_policy: CALIBRATION,
    });
    const cohort = buildSearchCohortDefinition({
      cohort_id: "private-dataforseo-runtime-cohort", query_id: QUERY_INPUT.query_id,
      created_at: TIMES.query, language: "en", domain: "financial-news",
      allowed_source_types: Object.freeze(["ARTICLE"]),
      corpus_version: "PRIVATE_OFFLINE_CORPUS_V1", minimum_cohort_size: 2,
      comparability_policy_version: policies.cohort_normalization_policy.policy_version,
      ranking_policy_version: policies.public_ranking_policy.policy_version,
    });
    check(query.validation_state === "VALID", "canonical_query_valid");
    check(cohort.validation_state === "VALID", "canonical_cohort_valid");
    const fixtureBefore = structuredClone({ query, cohort, policies, documents: DOCUMENTS, items: ITEMS });

    function scenario(name: string, mode: Mode = "SUCCESS") {
      const calls: Counters = { acquisition: 0, transport: 0, temporal: 0, behavioral: 0 };
      const record = { name, calls, public_result_count: null as number | null };
      scenarios.push(record);
      let expectedTargets: readonly string[] = [];
      const fetch: typeof globalThis.fetch = async (request, init) => {
        const index = calls.transport++;
        check(String(request) === "https://api.dataforseo.com/v3/backlinks/backlinks/live", `${name}:endpoint`);
        check(init?.method === "POST" && init.redirect === "error", `${name}:request_options`);
        check(typeof init?.body === "string", `${name}:json_request`);
        if (typeof init?.body !== "string") throw new CheckFailure("missing_request_body");
        const tasks: unknown = JSON.parse(init.body);
        check(isDeepStrictEqual(tasks, [{
          target: expectedTargets[index], mode: "as_is", limit: 3, offset: 0,
          backlinks_status_type: "live", exclude_internal_backlinks: true,
        }]), `${name}:exact_task_and_target`);
        if (mode === "TRANSPORT_FAILURE") throw new Error("PRIVATE_TRANSPORT_DETAIL");
        const items = mode === "EMPTY_LINKS" ? [] : mode === "INVALID_PROVIDER_ITEM"
          ? [{ type: "backlink", url_from: "https://alpha.example/a", anchor: null, last_seen: "invalid" }]
          : ITEMS;
        const body = mode === "INVALID_JSON" ? "not-json" : JSON.stringify({
          status_code: mode === "DATAFORSEO_ROOT_FAILURE" ? 40101 : 20000,
          tasks_count: 1, tasks_error: 0,
          tasks: [{ status_code: mode === "DATAFORSEO_TASK_FAILURE" ? 40501 : 20000,
            result: [{ target: expectedTargets[index], total_count: items.length,
              items_count: mode === "INVALID_PROVIDER_PAYLOAD" ? items.length + 1 : items.length, items }] }],
        });
        return new Response(body, { status: mode === "HTTP_FAILURE" ? 503 : 200,
          headers: { "content-type": mode === "UNEXPECTED_CONTENT_TYPE" ? "text/plain" : "application/json" } });
      };
      const link = createSearchFinancialNewsDataForSeoLinkObservationSource({
        configuration: { api_login: "private-test-login", api_password: "private-test-password",
          limit: 3, offset: 0, request_timeout_ms: 5000, maximum_response_bytes: 1000000 },
        fetch,
      });
      const temporal: SearchFinancialNewsRunPreparationInput["authorized_temporal_observation_source"] = (input) => {
        calls.temporal++;
        check(input.created_at === TIMES.analytical, `${name}:temporal_timestamp`);
        check(input.publication_reference_at === TIMES.publication_reference, `${name}:publication_reference`);
        // Only identity is transported. No signal is derived from the document.
        return Object.freeze({ current_observation: Object.freeze({
          document_series_id: buildSearchTemporalDocumentSeriesId({
            source_uri: input.raw_document.source_uri,
            source_type: input.raw_document.source_type,
          }),
          observation_id: `private-current:${input.raw_document.document_id}`,
          document_id: input.raw_document.document_id, observed_at: TIMES.acquired,
          content_hash: UNAVAILABLE, frequency_structure_value: UNAVAILABLE,
          anchor_structure_value: UNAVAILABLE, convergence_value: UNAVAILABLE, link_profile_value: UNAVAILABLE,
          validation_state: "DEGRADED", degradation_reasons: Object.freeze(["PRIVATE_TEST_NO_EXTERNAL_EVIDENCE"]),
        }), historical_observations: Object.freeze([]) });
      };
      const behavioral: SearchFinancialNewsRunPreparationInput["authorized_behavioral_observation_source"] = (input) => {
        calls.behavioral++;
        check(input.query === query, `${name}:behavioral_query_reference`);
        check(input.created_at === TIMES.analytical, `${name}:behavioral_timestamp`);
        return Object.freeze({ impressions: UNAVAILABLE, clicks: UNAVAILABLE, observed_ctr: UNAVAILABLE,
          expected_ctr_at_position: UNAVAILABLE, position_adjusted_ctr: UNAVAILABLE, dwell_time_ms: UNAVAILABLE,
          return_to_results_rate: UNAVAILABLE, sample_confidence: UNAVAILABLE });
      };
      const sources = Object.freeze({ authorized_link_observation_source: link,
        authorized_temporal_observation_source: temporal, authorized_behavioral_observation_source: behavioral });
      const acquisitionInput = Object.freeze({ query, created_at: TIMES.preparation });
      const batch = mode === "EMPTY_ACQUISITION" ? Object.freeze([]) : DOCUMENTS;
      const preparationInput: SearchFinancialNewsRunPreparationInput = Object.freeze({
        ...sources, behavioral_calibration_scoring_policy: CALIBRATION, acquisition_input: acquisitionInput,
        authorized_acquisition_source: async (input: SearchFinancialNewsRunPreparationInput["acquisition_input"]) => {
          calls.acquisition++;
          check(input === acquisitionInput && input.query === query, `${name}:acquisition_input_reference`);
          return batch;
        },
      });
      const dependencies = createSearchFinancialNewsRuntimeProducerAdapterDependencies({
        runtime_policy_configuration: policies, ...sources,
      });
      check(dependencies.resolve_link_observations === link, `${name}:link_reference_preserved`);
      check(dependencies.resolve_temporal_observations === temporal, `${name}:temporal_reference_preserved`);
      check(dependencies.resolve_behavioral_observation_evidence === behavioral, `${name}:behavioral_reference_preserved`);
      check(isDeepStrictEqual(calls, { acquisition: 0, transport: 0, temporal: 0, behavioral: 0 }), `${name}:factory_no_io`);
      return {
        calls, record, link, dependencies, preparationInput,
        expectTargets(targets: readonly string[]) { expectedTargets = targets; },
        async prepare() {
          const prepared = await prepareSearchFinancialNewsRun(preparationInput);
          check(calls.acquisition === 1 && calls.transport === 0 && calls.temporal === 0 && calls.behavioral === 0,
            `${name}:preparation_only_acquires`);
          check(prepared.query === query && prepared.acquisition_preparation.acquisition_inputs === batch,
            `${name}:prepared_references`);
          const input = prepared.application_composition_input;
          check(input.authorized_link_observation_source === link &&
            input.authorized_temporal_observation_source === temporal &&
            input.authorized_behavioral_observation_source === behavioral &&
            input.behavioral_calibration_scoring_policy === CALIBRATION, `${name}:composition_input_references`);
          createSearchFinancialNewsApplicationComposition(input);
          check(calls.acquisition === 1 && calls.transport === 0 && calls.temporal === 0 && calls.behavioral === 0,
            `${name}:composition_no_io`);
          return prepared;
        },
      };
    }
    const executionInput = (prepared: Awaited<ReturnType<typeof prepareSearchFinancialNewsRun>>) => Object.freeze({
      prepared_run: prepared, cohort_definition: cohort, created_at: TIMES.analytical,
      publication_reference_at: TIMES.publication_reference, snapshot_version: "PRIVATE_OFFLINE_SNAPSHOT_V1",
    });

    stage = "CONFIGURED_LINK_ADAPTER";
    const first = DOCUMENTS[0];
    if (!first) throw new CheckFailure("missing_document_fixture");
    const raw = buildSearchRawDocument(first);
    const extracted = buildSearchExtractedDocument({ raw_document: raw, created_at: TIMES.analytical });
    const linkInput = Object.freeze({ raw_document: raw, extracted_document: extracted, created_at: TIMES.analytical });
    for (const mode of ["SUCCESS", "EMPTY_LINKS"] as const) {
      const test = scenario(`adapter:${mode}`, mode);
      test.expectTargets([first.source_uri]);
      check(await test.dependencies.resolve_link_signals_policy(linkInput) === policies.link_signals_policy,
        `${mode}:link_policy_reference`);
      const signals = await createSearchLinkSignalsRuntimeProducerAdapter(test.dependencies)(linkInput);
      check(signals.document_id === raw.document_id && signals.created_at === TIMES.analytical, `${mode}:signal_identity`);
      check(signals.reciprocal_link_ratio.availability_state === "UNAVAILABLE" &&
        signals.suspected_link_cluster_ratio.availability_state === "UNAVAILABLE", `${mode}:unknown_booleans_unavailable`);
      check(signals.validation_state === "DEGRADED", `${mode}:degraded_evidence`);
      check(test.calls.transport === 1, `${mode}:adapter_one_transport`);
      if (mode === "SUCCESS") {
        check(signals.inbound_link_count.availability_state === "AVAILABLE" && signals.inbound_link_count.value === 3,
          "canonical_item_count_without_links_count_expansion");
        check(signals.unique_source_page_count.availability_state === "AVAILABLE" && signals.unique_source_page_count.value === 3,
          "canonical_page_count");
        check(signals.unique_source_domain_count.availability_state === "AVAILABLE" && signals.unique_source_domain_count.value === 2,
          "canonical_domain_count");
        check(signals.link_data_provider.availability_state === "AVAILABLE" &&
          signals.link_data_provider.value === XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_DATA_PROVIDER, "canonical_provider");
        check(signals.link_data_observed_at.availability_state === "AVAILABLE" &&
          signals.link_data_observed_at.value === "2026-09-11T10:00:00.000Z", "canonical_provider_timestamp");
      } else {
        check(signals.inbound_link_count.availability_state !== "AVAILABLE" &&
          signals.link_signal_confidence.availability_state !== "AVAILABLE", "empty_links_are_not_available_zero");
      }
    }

    stage = "PREPARATION_GATES";
    const gate = scenario("preparation_gates");
    const prepared = await gate.prepare();
    await expectReject(() => executeSearchFinancialNewsPreparedRun({ ...executionInput(prepared), created_at: TIMES.preparation }),
      error => error instanceof SearchFinancialNewsAcquisitionPreparationError &&
        error.code === "ANALYTICAL_TIMESTAMP_BEFORE_ACQUISITION", "early_analytical_timestamp_rejected");
    await expectReject(() => prepared.acquisition_preparation.authorized_acquisition_source({
      query: buildSearchQuery(QUERY_INPUT), created_at: TIMES.analytical,
    }), error => error instanceof SearchFinancialNewsAcquisitionPreparationError && error.code === "QUERY_REFERENCE_MISMATCH",
    "different_query_reference_rejected");
    check(gate.calls.transport === 0 && gate.calls.acquisition === 1, "preparation_rejection_has_no_link_call_or_reacquisition");
    const acquisitionError = new Error("PRIVATE_ACQUISITION_FAILURE");
    let acquisitionFailures = 0;
    await expectReject(() => prepareSearchFinancialNewsRun({ ...gate.preparationInput,
      authorized_acquisition_source: async () => { acquisitionFailures++; throw acquisitionError; },
    }), error => error === acquisitionError, "acquisition_failure_identity_preserved");
    check(acquisitionFailures === 1, "acquisition_failure_no_retry");

    const failures = ["HTTP_FAILURE", "INVALID_JSON", "DATAFORSEO_ROOT_FAILURE", "DATAFORSEO_TASK_FAILURE",
      "INVALID_PROVIDER_ITEM", "INVALID_PROVIDER_PAYLOAD", "UNEXPECTED_CONTENT_TYPE", "TRANSPORT_FAILURE"] as const;
    for (const code of failures) {
      stage = `APPLICATION_FAILURE:${code}`;
      const test = scenario(code, code);
      const run = await test.prepare();
      test.expectTargets([first.source_uri]);
      await expectReject(() => executeSearchFinancialNewsPreparedRun(executionInput(run)),
        error => error instanceof SearchFinancialNewsDataForSeoLinkObservationError && error.code === code,
        `${code}:application_rejects_with_source_error`);
      check(test.calls.acquisition === 1 && test.calls.transport === 1, `${code}:no_retry_or_reacquisition`);
      check(test.calls.temporal === 0 && test.calls.behavioral === 0, `${code}:stops_after_link_failure`);
    }

    for (const mode of ["EMPTY_ACQUISITION", "EMPTY_LINKS", "SUCCESS"] as const) {
      stage = `APPLICATION_RUN:${mode}`;
      const test = scenario(`runtime:${mode}`, mode);
      const run = await test.prepare();
      test.expectTargets(mode === "EMPTY_ACQUISITION" ? [] : DOCUMENTS.map(doc => doc.source_uri));
      let projection: Awaited<ReturnType<typeof executeSearchFinancialNewsPreparedRun>>;
      try {
        projection = await executeSearchFinancialNewsPreparedRun(executionInput(run));
      } catch (error: unknown) {
        runtimeErrors.push({ stage, message: error instanceof Error ? error.message : "UNKNOWN_ERROR_DETAILS_WITHHELD" });
        continue;
      }
      check(exposeSearchPublicRankingProjection({ projection }) === projection, `${mode}:canonical_public_api_accepts_exact_projection`);
      check(projection.query_id === query.query_id && projection.created_at === TIMES.analytical, `${mode}:public_scope`);
      test.record.public_result_count = projection.result_count;
      const documents = mode === "EMPTY_ACQUISITION" ? 0 : DOCUMENTS.length;
      check(test.calls.acquisition === 1 && test.calls.transport === documents &&
        test.calls.temporal === documents && test.calls.behavioral === documents, `${mode}:exact_source_call_counts`);
      if (mode === "EMPTY_ACQUISITION") {
        check(projection.result_count === 0, "empty_acquisition_public_projection");
      }
      if (mode === "SUCCESS") {
        // A vacuous empty ranking cannot validate the snapshot/transformation path.
        check(projection.result_count > 0, "nonempty_public_path_reached");
        test.expectTargets([...DOCUMENTS.map(doc => doc.source_uri), ...DOCUMENTS.map(doc => doc.source_uri)]);
        const replay = await executeSearchFinancialNewsPreparedRun(executionInput(run));
        check(isDeepStrictEqual(projection, replay), "same_prepared_query_deterministic_replay");
        check(test.calls.acquisition === 1 && test.calls.transport === 2 * DOCUMENTS.length &&
          test.calls.temporal === 2 * DOCUMENTS.length && test.calls.behavioral === 2 * DOCUMENTS.length,
        "replay_does_not_reacquire_or_reuse_observation_calls");
      }
    }
    check(isDeepStrictEqual(fixtureBefore, { query, cohort, policies, documents: DOCUMENTS, items: ITEMS }),
      "inputs_and_policies_unchanged");
    if (runtimeErrors.length > 0) {
      process.exitCode = 1;
      console.log(JSON.stringify({ mode: "OFFLINE_SIMULATED_RUNTIME", status: "FAILURE",
        stage: "APPLICATION_RUNS_INCOMPLETE", checks, scenarios, runtime_errors: runtimeErrors }, null, 2));
      return;
    }
    stage = "COMPLETE";
    console.log(JSON.stringify({ mode: "OFFLINE_SIMULATED_RUNTIME", status: "SUCCESS", stage, checks, scenarios }, null, 2));
  } catch (error: unknown) {
    process.exitCode = 1;
    console.log(JSON.stringify({ mode: "OFFLINE_SIMULATED_RUNTIME", status: "FAILURE", stage, checks, scenarios,
      runtime_errors: runtimeErrors,
      error: { code: error instanceof SearchFinancialNewsDataForSeoLinkObservationError ? error.code :
        error instanceof CheckFailure ? "CHECK_FAILED" : "RUNTIME_DIVERGENCE",
      message: error instanceof Error ? error.message : "UNKNOWN_ERROR_DETAILS_WITHHELD" } }, null, 2));
  }
}

void main();
