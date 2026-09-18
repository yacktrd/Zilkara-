/* ============================================================================
 * FILE: scripts/xyvala/search/validate-search-temporal-document-series.ts
 * Offline regression: real Acquisition identities and canonical Temporal core.
 * Observation timestamps and evidence are explicit test fixtures only.
 * No network, storage, live clock or production source is invoked.
 * ========================================================================== */

import { deepStrictEqual, equal, notEqual, ok, throws } from "node:assert/strict";
import { buildSearchRawDocument } from "../../../lib/xyvala/search/acquisition/search-acquisition-core";
import {
  buildSearchTemporalDocumentSeriesId,
} from "../../../lib/xyvala/search/temporal/search-temporal-document-series-identity";
import {
  buildSearchTemporalSignals,
  DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY,
  type SearchTemporalSearchObservation,
  type SearchTemporalSignalsSearchInput,
} from "../../../lib/xyvala/search/temporal/search-temporal-signals-search-core";
import {
  runSearchTemporalSignalsSearch,
} from "../../../lib/xyvala/search/temporal/search-temporal-signals-search";
import {
  validateSearchVariableLineageRegistry,
  getSearchCrossCuttingVariableLineageRegistryEntry,
} from "../../../lib/xyvala/search/governance/search-variable-lineage-registry";

function main(): void {
  const checks: string[] = [];
  const check = (name: string, action: () => void): void => {
    action();
    checks.push(name);
  };
  const unavailable = Object.freeze({
    availability_state: "UNAVAILABLE" as const,
    reason: "OFFLINE_TEST_NOT_MEASURED",
  });
  const base = Object.freeze({
    source_uri: "https://example.test/article",
    source_type: "ARTICLE" as const,
    mime_type: "text/plain",
    fetched_at: "2026-09-13T08:00:00.000Z",
    created_at: "2026-09-13T08:00:00.000Z",
    source_published_at: unavailable,
  });
  const first = buildSearchRawDocument({ ...base, raw_content: "Original content." });
  const revised = buildSearchRawDocument({ ...base, raw_content: "Revised content." });
  const series = buildSearchTemporalDocumentSeriesId({
    source_uri: first.source_uri, source_type: first.source_type,
  });
  const otherSeries = buildSearchTemporalDocumentSeriesId({
    source_uri: "https://other.test/article", source_type: "ARTICLE",
  });
  const observation = (
    document: typeof first, observationId: string, at: string,
  ): SearchTemporalSearchObservation => Object.freeze({
    document_series_id: series,
    document_id: document.document_id,
    observation_id: observationId,
    observed_at: at,
    content_hash: Object.freeze({ availability_state: "AVAILABLE", value: document.content_hash }),
    frequency_structure_value: unavailable,
    anchor_structure_value: unavailable,
    convergence_value: unavailable,
    link_profile_value: unavailable,
    validation_state: "DEGRADED",
    degradation_reasons: Object.freeze(["OFFLINE_TEST_NOT_MEASURED"]),
  });
  const previous = observation(first, "first", "2026-09-13T08:00:00.000Z");
  const current = observation(revised, "second", "2026-09-13T08:01:00.000Z");
  const input: SearchTemporalSignalsSearchInput = Object.freeze({
    document_series_id: series,
    document_id: revised.document_id,
    created_at: "2026-09-13T08:03:00.000Z",
    publication_reference_at: "2026-09-13T08:02:00.000Z",
    published_at: unavailable,
    current_observation: current,
    historical_observations: Object.freeze([previous]),
    // Explicit test-root selection of the existing producer-owned policy.
    policy: DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY,
  });
  const before = structuredClone(input);
  const output = runSearchTemporalSignalsSearch(input);
  check("distinct_acquisition_version_ids", () => notEqual(first.document_id, revised.document_id));
  check("stable_series_across_revisions", () => equal(series, buildSearchTemporalDocumentSeriesId({
    source_uri: revised.source_uri, source_type: revised.source_type,
  })));
  check("independent_sha256_golden_vector", () => equal(series,
    "search_temporal_series_v1_987201744664c96840ad92020645e847be85b25b64543cbedef9222bac430d0f"));
  check("cross_version_history_accepted", () => notEqual(output.validation_state, "REJECTED"));
  check("current_version_output_preserved", () => equal(output.document_id, revised.document_id));
  check("content_replacement_detected", () => ok(output.rupture_events.some(
    event => event.rupture_kind === "CONTENT_REPLACEMENT",
  )));
  check("core_and_execution_agree", () => deepStrictEqual(output, buildSearchTemporalSignals(input)));
  check("deterministic_replay", () => deepStrictEqual(output, runSearchTemporalSignalsSearch(input)));
  check("inputs_unchanged", () => deepStrictEqual(input, before));

  const reject = (name: string, candidate: SearchTemporalSignalsSearchInput, reason: RegExp): void => {
    check(`${name}:core_rejected`, () => {
      const result = buildSearchTemporalSignals(candidate);
      equal(result.validation_state, "REJECTED");
      ok(result.degradation_reasons.some(value => reason.test(value)));
    });
    check(`${name}:execution_rejected`, () => {
      let result: ReturnType<typeof runSearchTemporalSignalsSearch>;
      try { result = runSearchTemporalSignalsSearch(candidate); }
      catch (error) { ok(error instanceof Error && reason.test(error.message)); return; }
      equal(result.validation_state, "REJECTED");
      ok(result.degradation_reasons.some(value => reason.test(value)));
    });
  };
  reject("foreign_historical_series", { ...input, historical_observations: [{ ...previous, document_series_id: otherSeries }] }, /document_series_id/);
  reject("foreign_current_series", { ...input, current_observation: { ...current, document_series_id: otherSeries } }, /document_series_id/);
  reject("wrong_current_version", { ...input, current_observation: { ...current, document_id: first.document_id } }, /current_observation.document_id/);
  reject("duplicate_observation_id", { ...input, historical_observations: [{ ...previous, observation_id: current.observation_id }] }, /DUPLICATE_OBSERVATION_ID|current observation must not also appear/);
  reject("history_not_before_current", { ...input, historical_observations: [{ ...previous, observed_at: current.observed_at }] }, /HISTORICAL_OBSERVATION_NOT_BEFORE_CURRENT|must precede current_observation/);
  reject("future_current_observation", { ...input, current_observation: { ...current, observed_at: "2026-09-13T08:04:00.000Z" } }, /CURRENT_OBSERVATION_AFTER_PUBLICATION_REFERENCE/);
  reject("one_version_two_hashes", { ...input, historical_observations: [{ ...previous, document_id: current.document_id }] }, /DOCUMENT_VERSION_CONTENT_HASH_CONFLICT/);
  // Deliberately malformed JS-boundary candidates, never production coercions.
  reject("missing_series_id", { ...input, document_series_id: undefined } as unknown as SearchTemporalSignalsSearchInput, /Invalid V1 temporal document series identifier/);
  reject("missing_historical_series_id", { ...input, historical_observations: [{ ...previous, document_series_id: undefined }] } as unknown as SearchTemporalSignalsSearchInput, /document_series_id/);

  const sameVersion = runSearchTemporalSignalsSearch({ ...input,
    current_observation: observation(first, "second", current.observed_at), document_id: first.document_id,
  });
  check("unchanged_version_has_no_content_replacement", () => ok(!sameVersion.rupture_events.some(
    event => event.rupture_kind === "CONTENT_REPLACEMENT",
  )));
  const noHashes = runSearchTemporalSignalsSearch({ ...input,
    current_observation: { ...current, content_hash: unavailable },
    historical_observations: [{ ...previous, content_hash: unavailable }],
  });
  check("absent_hashes_do_not_invent_content_replacement", () => ok(!noHashes.rupture_events.some(
    event => event.rupture_kind === "CONTENT_REPLACEMENT",
  )));
  const firstVisit = runSearchTemporalSignalsSearch({ ...input, historical_observations: [] });
  check("explicit_first_observation_without_history_accepted", () => notEqual(firstVisit.validation_state, "REJECTED"));
  check("first_observation_creates_no_rupture", () => equal(firstVisit.rupture_events.length, 0));
  check("malformed_series_scope_rejected", () => throws(() => buildSearchTemporalDocumentSeriesId({
    source_uri: "relative/path", source_type: "ARTICLE",
  })));
  validateSearchVariableLineageRegistry();
  const entry = getSearchCrossCuttingVariableLineageRegistryEntry("search.temporal.document_series_id");
  check("series_registered_with_canonical_owner", () => equal(entry.owner, "TEMPORAL_DOCUMENT_SERIES_IDENTITY"));
  check("series_is_private", () => equal(entry.public_exposure_allowed, false));
  console.log(JSON.stringify({ status: "SUCCESS", mode: "OFFLINE_TEMPORAL_SERIES", checks }, null, 2));
}

try { main(); }
catch (error) {
  process.exitCode = 1;
  console.error(JSON.stringify({ status: "FAILURE", error: error instanceof Error ? error.message : "UNKNOWN" }, null, 2));
}
