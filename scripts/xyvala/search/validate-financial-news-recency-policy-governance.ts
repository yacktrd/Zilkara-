/* ============================================================================
 * FILE: scripts/xyvala/search/validate-financial-news-recency-policy-governance.ts
 * SCOPE: Offline policy-governance validation only.
 *
 * This validator proves that Financial News Recency is admitted into the
 * canonical non-calibration Financial News policy-governance set without
 * activating the Recency analytical runtime binding.
 *
 * It does NOT:
 * - call buildSearchFinancialNewsRecency(...);
 * - bind Temporal -> Recency;
 * - mutate PostgreSQL or Redis;
 * - activate a provider;
 * - register ACTIVE VLR lineage;
 * - activate Search -> MCI.
 * ========================================================================== */

import { strict as assert } from "node:assert";

import {
  XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_BOOTSTRAP_POLICY_V1,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-behavioral-calibration-bootstrap-policy";

import {
  XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MANIFEST,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-runtime-configuration";

import {
  XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MANIFEST,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-profile";

import {
  XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MANIFEST,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-artifacts";

import {
  XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_POLICY_V1,
  XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MANIFEST,
  XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_SET_SCHEMA_VERSION,
  XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_VALUES_VERSION,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-artifact-values";

import {
  XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MANIFEST,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-assembly";

import {
  createSearchFinancialNewsRuntimePolicyComposition,
  XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MANIFEST,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-composition";

let passed = 0;

function check(name: string, run: () => void): void {
  run();
  passed += 1;
  console.log(JSON.stringify({ check: name, ok: true }));
}

const policies = createSearchFinancialNewsRuntimePolicyComposition({
  behavioral_calibration_scoring_policy:
    XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_BOOTSTRAP_POLICY_V1,
});

check("policy_set_schema_version_2_0_0", () => {
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_SET_SCHEMA_VERSION,
    "2.0.0",
  );
});

check("policy_set_values_version_2_0_0", () => {
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_VALUES_VERSION,
    "2.0.0",
  );
});

check("non_calibration_artifact_count_11", () => {
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MANIFEST
      .policy_artifact_count,
    11,
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MANIFEST
      .policy_count,
    11,
  );
});

check("externally_governed_policy_count_12", () => {
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MANIFEST
      .externally_governed_policy_count,
    12,
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MANIFEST
      .externally_governed_policy_count,
    12,
  );
});

check("financial_news_policy_configuration_count_20", () => {
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MANIFEST
      .total_runtime_policy_count,
    20,
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MANIFEST
      .final_runtime_policy_count,
    20,
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MANIFEST
      .final_runtime_policy_count,
    20,
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MANIFEST
      .runtime_policy_configuration_field_count,
    20,
  );
});

check("generic_runtime_policy_binding_remains_19", () => {
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MANIFEST
      .generic_runtime_policy_field_count,
    19,
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MANIFEST
      .deferred_runtime_policy_binding_count,
    1,
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MANIFEST
      .deferred_runtime_policy_field,
    "recency_policy",
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MANIFEST
      .recency_policy_bound_to_generic_runtime,
    false,
  );
});

check("composition_keeps_recency_binding_deferred", () => {
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MANIFEST
      .governed_unbound_domain_policy_count,
    1,
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MANIFEST
      .governed_unbound_domain_policy,
    "recency_policy",
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MANIFEST
      .recency_runtime_binding,
    false,
  );
});

check("recency_policy_reference_preserved", () => {
  assert.equal(
    policies.recency_policy,
    XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_POLICY_V1,
  );
  assert.equal(Object.isFrozen(policies), true);
});

check("recency_policy_value_is_exact", () => {
  assert.deepEqual(policies.recency_policy, {
    policy_version: "1.0.0",
    within_24h_max_age_ms: 86_400_000,
    within_7d_max_age_ms: 604_800_000,
    boundaries_inclusive: true,
  });
});

check("behavioral_calibration_external_input_count_unchanged", () => {
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MANIFEST
      .external_policy_input_count,
    1,
  );
  assert.equal(
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MANIFEST
      .external_policy_input,
    "behavioral_calibration_scoring_policy",
  );
});

console.log(JSON.stringify({
  ok: true,
  mode: "OFFLINE_POLICY_GOVERNANCE",
  state: "FUNCTIONAL_SUITE_PASSED",
  passed_checks: passed,
  policy_set_schema_version:
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_SET_SCHEMA_VERSION,
  policy_set_values_version:
    XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_VALUES_VERSION,
  non_calibration_policy_count: 11,
  final_financial_news_policy_count: 20,
  generic_bound_policy_count: 19,
  recency_policy_governed: true,
  recency_runtime_binding_validated: false,
  canonical_vlr_registered: false,
  production_source_activated: false,
  search_to_mci_activated: false,
}, null, 2));
