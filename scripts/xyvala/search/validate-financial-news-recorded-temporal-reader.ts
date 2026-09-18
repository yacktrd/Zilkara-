/* ============================================================================
 * Private offline reader-binding validation, version 1.0.0.
 * Canonical producers build the runtime input; reference/store ports are fixtures.
 * Also exercises the existing recorded source and canonical Temporal adapter.
 * No credentials, network, database mutation or production-source activation.
 * Deliberate malformed port results are confined to the boundary rejection test.
 * ========================================================================== */

import { deepStrictEqual, equal, notEqual, ok, rejects } from "node:assert/strict";
import { buildSearchRawDocument } from "../../../lib/xyvala/search/acquisition/search-acquisition-core";
import { buildSearchExtractedDocument } from "../../../lib/xyvala/search/extraction/search-extraction-core";
import { buildSearchSegmentedDocument } from "../../../lib/xyvala/search/segmentation/search-segmentation-core";
import { buildSearchLexicalDocument } from "../../../lib/xyvala/search/lexical/search-lexical-analysis-core";
import { buildSearchFrequencySignals, XYVALA_SEARCH_DEFAULT_FREQUENCY_SELECTION_POLICY } from "../../../lib/xyvala/search/signals/search-frequency-signals-core";
import { buildSearchAnchorSignals, XYVALA_SEARCH_DEFAULT_ANCHOR_DETECTION_POLICY } from "../../../lib/xyvala/search/signals/search-anchor-signals-core";
import { buildSearchContextAggregation } from "../../../lib/xyvala/search/aggregation/search-context-aggregation-core";
import { buildSearchTemporalDocumentSeriesId } from "../../../lib/xyvala/search/temporal/search-temporal-document-series-identity";
import { validateAndCopySearchTemporalObservationRecord } from "../../../lib/xyvala/search/temporal/search-temporal-observation-record-boundary";
import { DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY } from "../../../lib/xyvala/search/temporal/search-temporal-signals-search-core";
import { createSearchTemporalSignalsRuntimeProducerAdapter } from "../../../lib/xyvala/search/runtime/search-runtime-producer-adapters";
import { createSearchFinancialNewsRecordedTemporalReader } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-reader";
import { createSearchFinancialNewsRecordedTemporalSource, SearchFinancialNewsRecordedTemporalSourceError } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-source";
import type { SearchTemporalObservationReadResult } from "../../../lib/xyvala/search/contracts/search-temporal-observation-store-contract";
import type { SearchFinancialNewsTemporalReferenceInput, SearchFinancialNewsTemporalReferenceResult } from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-temporal-reference-contract";

async function main(): Promise<void> {
  const checks: string[] = [];
  const check = async (name: string, action: () => unknown): Promise<void> => {
    await action();
    checks.push(name);
  };
  const unavailable = Object.freeze({ availability_state: "UNAVAILABLE" as const, reason: "OFFLINE_NOT_MEASURED" });
  const created_at = "2026-09-14T10:00:04.000Z";
  const raw_document = buildSearchRawDocument({
    source_uri: "https://example.test/financial-reader", source_type: "ARTICLE", mime_type: "text/plain",
    raw_content: "Revenue growth supports investment in regional services. Revenue growth reflects increased demand for regional services. " +
      "Quarterly revenue analysis covers operating costs, distribution agreements and research spending. " +
      "Regional services support customer demand while investment improves distribution capacity. " +
      "Financial results describe revenue growth, operating costs and quarterly investment in research. " +
      "This fictional offline article reports no real financial event.",
    fetched_at: "2026-09-14T10:00:00.000Z", created_at: "2026-09-14T10:00:01.000Z",
    source_published_at: unavailable,
  });
  const extracted_document = buildSearchExtractedDocument({ raw_document, created_at });
  const segmented_document = buildSearchSegmentedDocument({ extracted_document, created_at });
  const lexical_document = buildSearchLexicalDocument({ segmented_document, created_at });
  const frequency_signals = buildSearchFrequencySignals({ lexical_document, created_at,
    selection_policy: XYVALA_SEARCH_DEFAULT_FREQUENCY_SELECTION_POLICY });
  const intrinsic_anchor_signals = buildSearchAnchorSignals({ segmented_document, lexical_document,
    frequency_signals, created_at, detection_policy: XYVALA_SEARCH_DEFAULT_ANCHOR_DETECTION_POLICY });
  const context_aggregation = buildSearchContextAggregation({ segmented_document, frequency_signals,
    anchor_signals: intrinsic_anchor_signals, created_at });
  const input: SearchFinancialNewsTemporalReferenceInput = Object.freeze({ raw_document, frequency_signals,
    intrinsic_anchor_signals, context_aggregation, created_at, publication_reference_at: created_at });
  await check("canonical_runtime_input", () => {
    for (const value of [raw_document, extracted_document, segmented_document, lexical_document,
      frequency_signals, intrinsic_anchor_signals, context_aggregation]) notEqual(value.validation_state, "REJECTED");
  });
  const series = buildSearchTemporalDocumentSeriesId({
    source_uri: raw_document.source_uri, source_type: raw_document.source_type,
  });
  const record = (observation_id: string, observed_at: string) => validateAndCopySearchTemporalObservationRecord({
    observation: { document_series_id: series, document_id: raw_document.document_id, observation_id, observed_at,
      content_hash: { availability_state: "AVAILABLE", value: raw_document.content_hash },
      frequency_structure_value: unavailable, anchor_structure_value: unavailable,
      convergence_value: unavailable, link_profile_value: unavailable,
      validation_state: "DEGRADED", degradation_reasons: ["OFFLINE_NOT_MEASURED"] },
    provenance: { producer_module: "PRIVATE_READER_TEST_FIXTURE", producer_version: "1.0.0", source_reference: "fixture" },
  });
  // Explicit fixture IDs, never an algorithm for production observation IDs.
  const earlier = record("z-earlier", "2026-09-14T10:00:01.000Z");
  const later = record("a-later", "2026-09-14T10:00:02.000Z");
  const current = record("current", "2026-09-14T10:00:03.000Z");
  const reference = Object.freeze({ availability_state: "AVAILABLE" as const,
    value: Object.freeze({ document_series_id: series, current_observation_id: "current" }) });
  const available = Object.freeze({ status: "AVAILABLE" as const, coverage: "ALL_RECORDED_BEFORE_CURRENT" as const,
    current_record: current, historical_records: Object.freeze([earlier, later]) });
  const before = structuredClone({ input, reference, available });

  function binding(ref: SearchFinancialNewsTemporalReferenceResult = reference,
    stored: SearchTemporalObservationReadResult = available) {
    const calls = { resolve: 0, read: 0 };
    const reader = createSearchFinancialNewsRecordedTemporalReader({
      resolve_current_observation_reference: received => { calls.resolve++; equal(received, input); return ref; },
      read_observations: async received => {
        calls.read++;
        ok(ref.availability_state === "AVAILABLE");
        equal(received, ref.value);
        return stored;
      },
    });
    return { reader, calls };
  }
  const success = binding();
  await check("factory_has_no_io", () => deepStrictEqual(success.calls, { resolve: 0, read: 0 }));
  const resolution = await success.reader(input);
  await check("exact_identity_values_and_history_order", () => {
    ok(resolution.availability_state === "AVAILABLE");
    equal(resolution.value.current_observation, current.observation);
    deepStrictEqual(Reflect.ownKeys(resolution.value), ["current_observation", "historical_observations"]);
    equal(resolution.value.historical_observations[0], earlier.observation);
    equal(resolution.value.historical_observations[1], later.observation);
    equal(resolution.value.historical_observations.length, 2);
    ok(Object.isFrozen(resolution.value.historical_observations));
    deepStrictEqual(success.calls, { resolve: 1, read: 1 });
  });
  await check("deterministic_replay_and_no_input_mutation", async () => {
    deepStrictEqual(await success.reader(input), resolution);
    deepStrictEqual({ input, reference, available }, before);
  });
  await check("explicit_empty_recorded_history_is_available", async () => {
    const result = await binding(reference, { ...available, historical_records: [] }).reader(input);
    ok(result.availability_state === "AVAILABLE");
    equal(result.value.historical_observations.length, 0);
  });
  for (const availability_state of ["UNAVAILABLE", "INSUFFICIENT_DATA", "INSUFFICIENT_HISTORY", "UNSUPPORTED", "INVALID"] as const) {
    await check(`reference_${availability_state}_preserved_without_read`, async () => {
      const evidence = Object.freeze({ availability_state, reason: " exact private reason " });
      const candidate = binding(evidence);
      equal(await candidate.reader(input), evidence);
      deepStrictEqual(candidate.calls, { resolve: 1, read: 0 });
    });
  }
  for (const status of ["UNAVAILABLE", "INVALID", "INSUFFICIENT_HISTORY", "NOT_FOUND"] as const) {
    await check(`store_${status}_preserved_without_empty_success`, async () => {
      const reason = "CURRENT_OBSERVATION_NOT_FOUND" as const;
      const candidate = binding(reference, { status, reason });
      deepStrictEqual(await candidate.reader(input), {
        availability_state: status === "NOT_FOUND" ? "UNAVAILABLE" : status, reason,
      });
      deepStrictEqual(candidate.calls, { resolve: 1, read: 1 });
    });
  }
  const foreign = buildSearchTemporalDocumentSeriesId({ source_uri: "https://example.test/other", source_type: "ARTICLE" });
  await check("foreign_reference_rejected_before_read", async () => {
    const candidate = binding({ ...reference, value: { ...reference.value, document_series_id: foreign } });
    equal((await candidate.reader(input)).availability_state, "INVALID");
    equal(candidate.calls.read, 0);
  });
  for (const change of [{ observation_id: "another" }, { document_id: "another-version" }, { document_series_id: foreign }]) {
    await check(`current_identity_mismatch_${Object.keys(change)[0]}`, async () => {
      const result = await binding(reference, { ...available,
        current_record: { ...current, observation: { ...current.observation, ...change } } }).reader(input);
      equal(result.availability_state, "INVALID");
    });
  }
  await check("malformed_port_results_rejected", async () => {
    // These casts intentionally inject invalid JS results at the port boundary.
    for (const ref of [null, {}, { availability_state: "UNAVAILABLE", reason: "" },
      { ...reference, value: { ...reference.value, current_observation_id: "" } }]) {
      const candidate = binding(ref as unknown as SearchFinancialNewsTemporalReferenceResult);
      equal((await candidate.reader(input)).availability_state, "INVALID");
      equal(candidate.calls.read, 0);
    }
    for (const stored of [null, {}, { status: "NOT_FOUND", reason: "wrong" },
      { ...available, coverage: "PARTIAL" }, { ...available, historical_records: null },
      { ...available, historical_records: new Array(1) }, { ...available, current_record: null },
      { ...available, historical_records: [{ ...earlier, observation: { ...earlier.observation, document_series_id: foreign } }] }]) {
      const candidate = binding(reference, stored as unknown as SearchTemporalObservationReadResult);
      equal((await candidate.reader(input)).availability_state, "INVALID");
    }
  });
  await check("source_and_reader_exceptions_propagate_without_retry", async () => {
    for (const stage of ["resolve", "read"] as const) {
      const marker = new Error("PRIVATE_FIXTURE_EXCEPTION");
      const calls = { resolve: 0, read: 0 };
      const reader = createSearchFinancialNewsRecordedTemporalReader({
        resolve_current_observation_reference: () => { calls.resolve++; if (stage === "resolve") throw marker; return reference; },
        read_observations: async () => { calls.read++; throw marker; },
      });
      await rejects(() => Promise.resolve(reader(input)), error => error === marker);
      deepStrictEqual(calls, { resolve: 1, read: stage === "read" ? 1 : 0 });
    }
  });
  await check("recorded_source_and_canonical_temporal_adapter", async () => {
    const source = createSearchFinancialNewsRecordedTemporalSource({ read_recorded_observations: binding().reader });
    const temporal = createSearchTemporalSignalsRuntimeProducerAdapter({ resolve_temporal_observations: source,
      resolve_temporal_signals_policy: () => DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY });
    const result = await temporal(input);
    notEqual(result.validation_state, "REJECTED");
    equal(result.document_id, raw_document.document_id);
    const missing = createSearchFinancialNewsRecordedTemporalSource({ read_recorded_observations: binding(unavailable).reader });
    await rejects(() => Promise.resolve(missing(input)), error => error instanceof SearchFinancialNewsRecordedTemporalSourceError &&
      error.code === "TEMPORAL_OBSERVATIONS_UNAVAILABLE" && error.evidence === unavailable);
  });
  console.log(JSON.stringify({ ok: true, mode: "OFFLINE_READER_BINDING", passed_checks: checks.length,
    checks, live_postgres_binding_validated: false, production_source_activated: false }, null, 2));
}

void main().catch(error => {
  process.exitCode = 1;
  console.error(error);
});
