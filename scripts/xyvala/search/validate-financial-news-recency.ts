/* ============================================================================
 * FILE: scripts/xyvala/search/validate-financial-news-recency.ts
 * SCOPE: Offline fixtures only. No provider, database, application or policy binding.
 * Synthetic publication evidence and observations exercise the existing Temporal
 * producer and the candidate Financial News classifier. Fixture identities and
 * policy versions are test inputs, never canonical production artifacts.
 * Date arithmetic below constructs fixtures; the classifier consumes age only.
 * Passing this suite does not register VLR entries or authenticate real provenance.
 * ========================================================================== */

import { strict as assert } from "node:assert";
import type {
  SearchUnavailableValue,
} from "../../../lib/xyvala/search/contracts/search-pipeline-contract";
import {
  buildSearchTemporalSignals,
  DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY,
  validateSearchTemporalSignalsOutput,
} from "../../../lib/xyvala/search/temporal/search-temporal-signals-search-core";
import type {
  SearchTemporalSignalsSearchInput,
} from "../../../lib/xyvala/search/temporal/search-temporal-signals-search-core";
import {
  buildSearchTemporalDocumentSeriesId,
} from "../../../lib/xyvala/search/temporal/search-temporal-document-series-identity";
import {
  buildSearchFinancialNewsRecency,
  XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_CORE_MODULE_VERSION,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-recency-core";
import type {
  SearchFinancialNewsRecencyInput,
  SearchFinancialNewsRecencyPolicy,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-recency-contract";

const REFERENCE = "2026-09-15T12:00:00.000Z";
const FIXTURE_SERIES = buildSearchTemporalDocumentSeriesId({
  source_uri: "https://example.test/financial-news-recency", source_type: "ARTICLE",
});
const FIXTURE_POLICY: SearchFinancialNewsRecencyPolicy = {
  policy_version: "OFFLINE_FIXTURE_RECENCY_1",
  within_24h_max_age_ms: 86_400_000,
  within_7d_max_age_ms: 604_800_000,
  boundaries_inclusive: true,
};
let passed = 0;
function check(name: string, run: () => void): void {
  run();
  passed += 1;
  console.log(JSON.stringify({ check: name, ok: true }));
}
function fixture(
  published_at: SearchTemporalSignalsSearchInput["published_at"],
  comparable = false,
): SearchFinancialNewsRecencyInput {
  const missing: SearchUnavailableValue = {
    availability_state: "UNAVAILABLE", reason: "OFFLINE_NOT_MEASURED",
  };
  const upstream: SearchTemporalSignalsSearchInput = {
    document_series_id: FIXTURE_SERIES, document_id: "fixture-document",
    created_at: "2026-09-15T12:05:00.000Z", publication_reference_at: REFERENCE,
    published_at,
    current_observation: {
      document_series_id: FIXTURE_SERIES, document_id: "fixture-document",
      observation_id: "fixture-observation", observed_at: REFERENCE,
      content_hash: missing,
      // Explicit synthetic evidence for the insufficient-history scenario only.
      frequency_structure_value: comparable ? { availability_state: "AVAILABLE", value: 0.5 } : missing,
      anchor_structure_value: missing, convergence_value: missing,
      link_profile_value: missing, validation_state: "DEGRADED",
      degradation_reasons: ["OFFLINE_NOT_MEASURED"],
    },
    historical_observations: [],
    policy: DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY,
  };
  const signals = buildSearchTemporalSignals(upstream);
  validateSearchTemporalSignalsOutput(signals);
  assert.notEqual(signals.validation_state, "REJECTED");
  return {
    temporal_signals: signals,
    temporal_origin: {
      document_id: upstream.document_id,
      publication_reference_at: upstream.publication_reference_at,
    },
    policy: { ...FIXTURE_POLICY },
  };
}
function ageFixture(age: number, comparable = false): SearchFinancialNewsRecencyInput {
  return fixture({ availability_state: "AVAILABLE",
    value: new Date(Date.parse(REFERENCE) - age).toISOString() }, comparable);
}
function resolved(input: SearchFinancialNewsRecencyInput) {
  const result = buildSearchFinancialNewsRecency(input);
  assert.equal(result.status, "RESOLVED");
  if (result.status !== "RESOLVED") throw new Error("EXPECTED_RESOLVED");
  return result.data;
}
function reject(input: unknown, reason: string): void {
  // Reflect deliberately exercises malformed JavaScript input without a type cast.
  assert.deepEqual(Reflect.apply(buildSearchFinancialNewsRecency, undefined, [input]), {
    status: "REJECTED", reasons: [reason],
  });
}

const windows = [
  [0, true, true, "WITHIN_24H"],
  [86_399_999, true, true, "WITHIN_24H"],
  [86_400_000, true, true, "WITHIN_24H"],
  [86_400_001, false, true, "WITHIN_7D_ONLY"],
  [604_799_999, false, true, "WITHIN_7D_ONLY"],
  [604_800_000, false, true, "WITHIN_7D_ONLY"],
  [604_800_001, false, false, "OLDER_THAN_7D"],
] as const;
for (const [age, within24, within7, state] of windows) {
  check(`inclusive_window_${age}`, () => {
    const input = ageFixture(age);
    assert.deepEqual(input.temporal_signals.publication_age_ms,
      { availability_state: "AVAILABLE", value: age });
    const data = resolved(input);
    assert.deepEqual(data.within_24h, { availability_state: "AVAILABLE", value: within24 });
    assert.deepEqual(data.within_7d, { availability_state: "AVAILABLE", value: within7 });
    assert.deepEqual(data.recency_state, { availability_state: "AVAILABLE", value: state });
  });
}
for (const state of [
  "UNAVAILABLE", "INSUFFICIENT_DATA", "INSUFFICIENT_HISTORY", "UNSUPPORTED", "INVALID",
] as const) {
  check(`preserve_${state}`, () => {
    const evidence = { availability_state: state, reason: "  fixture: exact é / reason  " };
    const input = fixture(evidence);
    assert.deepEqual(input.temporal_signals.publication_age_ms, evidence);
    const data = resolved(input);
    for (const output of [data.within_24h, data.within_7d, data.recency_state]) {
      assert.deepEqual(output, evidence);
    }
  });
}
check("future_publication_preserves_upstream_invalid", () => {
  const input = ageFixture(-1);
  assert.equal(input.temporal_signals.publication_age_ms.availability_state, "INVALID");
  assert.deepEqual(resolved(input).recency_state, input.temporal_signals.publication_age_ms);
});
const valid = ageFixture(86_400_000, true);
check("available_age_with_insufficient_history_and_zero_confidence", () => {
  assert.equal(valid.temporal_signals.temporal_state, "INSUFFICIENT_HISTORY");
  assert.equal(valid.temporal_signals.validation_state, "DEGRADED");
  const input = { ...valid, temporal_signals: { ...valid.temporal_signals,
    temporal_confidence: { availability_state: "AVAILABLE" as const, value: 0 } } };
  validateSearchTemporalSignalsOutput(input.temporal_signals);
  assert.deepEqual(resolved(input).within_24h, { availability_state: "AVAILABLE", value: true });
});
for (const age of [-1, Number.NaN, Number.POSITIVE_INFINITY, "0"]) {
  check(`reject_corrupted_available_age_${String(age)}`, () => reject({ ...valid,
    temporal_signals: { ...valid.temporal_signals,
      publication_age_ms: { availability_state: "AVAILABLE", value: age } },
  }, "INVALID_AVAILABLE_AGE"));
}
for (const state of ["REJECTED", "UNVALIDATED", "UNKNOWN"]) {
  check(`reject_upstream_${state}`, () => reject({ ...valid,
    temporal_signals: { ...valid.temporal_signals, validation_state: state },
  }, "TEMPORAL_RESULT_NOT_ACCEPTED"));
}
const invalidInputs: readonly (readonly [string, unknown, string])[] = [
  ["null_input", null, "INVALID_RECENCY_INPUT"],
  ["missing_policy", { temporal_signals: valid.temporal_signals,
    temporal_origin: valid.temporal_origin }, "INVALID_RECENCY_INPUT"],
  ["missing_signals", { ...valid, temporal_signals: null }, "INVALID_TEMPORAL_ENVELOPE"],
  ["contract_version", { ...valid, temporal_signals: { ...valid.temporal_signals,
    contract_version: "unsupported" } }, "INCOMPATIBLE_TEMPORAL_CONTRACT"],
  ["document_mismatch", { ...valid, temporal_origin: { ...valid.temporal_origin,
    document_id: "other-fixture-document" } }, "TEMPORAL_DOCUMENT_MISMATCH"],
  ["missing_origin", { ...valid, temporal_origin: {} }, "INVALID_TEMPORAL_ORIGIN"],
  ["invalid_reference", { ...valid, temporal_origin: { ...valid.temporal_origin,
    publication_reference_at: "invalid" } }, "INVALID_TEMPORAL_REFERENCE"],
  ["future_reference", { ...valid, temporal_origin: { ...valid.temporal_origin,
    publication_reference_at: "2026-09-16T12:00:00.000Z" } }, "INVALID_TEMPORAL_REFERENCE"],
  ["empty_policy_version", { ...valid, policy: { ...valid.policy,
    policy_version: " " } }, "INVALID_RECENCY_POLICY"],
  ["wrong_24h_bound", { ...valid, policy: { ...valid.policy,
    within_24h_max_age_ms: 86_400_001 } }, "INVALID_RECENCY_POLICY"],
  ["wrong_7d_bound", { ...valid, policy: { ...valid.policy,
    within_7d_max_age_ms: 604_800_001 } }, "INVALID_RECENCY_POLICY"],
  ["exclusive_bounds", { ...valid, policy: { ...valid.policy,
    boundaries_inclusive: false } }, "INVALID_RECENCY_POLICY"],
  ["unknown_availability", { ...valid, temporal_signals: { ...valid.temporal_signals,
    publication_age_ms: { availability_state: "UNKNOWN", reason: "fixture" } } },
  "UNKNOWN_AGE_AVAILABILITY"],
  ["empty_unavailability_reason", { ...valid, temporal_signals: { ...valid.temporal_signals,
    publication_age_ms: { availability_state: "UNAVAILABLE", reason: "" } } },
  "INVALID_UNAVAILABLE_AGE"],
  ["contradictory_evidence", { ...valid, temporal_signals: { ...valid.temporal_signals,
    publication_age_ms: { availability_state: "UNAVAILABLE", reason: "fixture", value: 0 } } },
  "INVALID_UNAVAILABLE_AGE"],
];
for (const [name, input, reason] of invalidInputs) {
  check(`reject_${name}`, () => reject(input, reason));
}
check("preserve_references_without_freezing_caller_objects", () => {
  const input = { ...valid, temporal_signals: { ...valid.temporal_signals,
    publication_age_ms: { ...valid.temporal_signals.publication_age_ms } },
  temporal_origin: { ...valid.temporal_origin }, policy: { ...valid.policy } };
  const before = JSON.stringify(input);
  const data = resolved(input);
  assert.equal(data.temporal_signals, input.temporal_signals);
  assert.equal(data.temporal_origin, input.temporal_origin);
  assert.equal(data.policy, input.policy);
  assert.equal(data.recency_policy_version, input.policy.policy_version);
  for (const object of [input, input.temporal_signals, input.temporal_origin,
    input.policy, input.temporal_signals.publication_age_ms]) assert.equal(Object.isFrozen(object), false);
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.isFrozen(data) && Object.isFrozen(data.within_24h));
});
check("replay_without_current_clock_or_created_at_substitution", () => {
  const first = resolved(valid);
  const savedNow = Date.now;
  Date.now = () => { throw new Error("CLOCK_ACCESS_FORBIDDEN"); };
  try {
    assert.deepEqual(resolved(valid), first);
    const later = resolved({ ...valid, temporal_signals: { ...valid.temporal_signals,
      created_at: "2027-09-15T12:05:00.000Z" } });
    assert.deepEqual(later.within_24h, first.within_24h);
    assert.deepEqual(later.recency_state, first.recency_state);
  } finally {
    Date.now = savedNow;
  }
});
check("unexpected_boundary_exception_propagates", () => {
  const failure = new Error("FIXTURE_UNEXPECTED_FAILURE");
  const input = new Proxy(valid, { getOwnPropertyDescriptor() { throw failure; } });
  assert.throws(() => buildSearchFinancialNewsRecency(input), error => error === failure);
});
console.log(JSON.stringify({
  ok: true, mode: "OFFLINE_FIXTURES", state: "FUNCTIONAL_SUITE_PASSED", passed_checks: passed,
  producer_version: XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_CORE_MODULE_VERSION,
  production_policy_bound: false, canonical_vlr_registered: false,
  runtime_binding_validated: false, production_source_activated: false,
}, null, 2));
