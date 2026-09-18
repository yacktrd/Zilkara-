/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-uncollected-behavioral-source.ts
 * Explicit source for a deployment where behavioral collection is not enabled.
 *
 * The composition root must explicitly attest COLLECTION_NOT_ENABLED.
 * This is configuration truth, not evidence that no user interactions occurred.
 * Never select this source automatically after a collector failure.
 * Once collection is enabled, bind its authorized source instead.
 *
 * All eight canonical measurements remain UNAVAILABLE, never AVAILABLE zero.
 * No clock, identity, observation, score, confidence or calibration is generated.
 * No runtime input is inspected. No canonical contract is redefined.
 * ========================================================================== */

import type {
  SearchFinancialNewsAuthorizedBehavioralObservationSource,
} from "./search-financial-news-behavioral-observation-provider";

type BehavioralEvidence = Awaited<
  ReturnType<SearchFinancialNewsAuthorizedBehavioralObservationSource>
>;

export interface SearchFinancialNewsUncollectedBehavioralSourceConfiguration {
  readonly collection_state: "COLLECTION_NOT_ENABLED";
}

export const XYVALA_SEARCH_FINANCIAL_NEWS_UNCOLLECTED_BEHAVIORAL_SOURCE_MODULE_VERSION =
  "1.0.0" as const;

export function createSearchFinancialNewsUncollectedBehavioralSource(
  configuration: SearchFinancialNewsUncollectedBehavioralSourceConfiguration,
): SearchFinancialNewsAuthorizedBehavioralObservationSource {
  if (
    configuration === null ||
    typeof configuration !== "object" ||
    Array.isArray(configuration) ||
    Reflect.ownKeys(configuration).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(configuration, "collection_state") ||
    configuration.collection_state !== "COLLECTION_NOT_ENABLED"
  ) {
    throw new Error(
      "[financial-news-uncollected-behavioral-source] " +
        "Explicit COLLECTION_NOT_ENABLED configuration is required.",
    );
  }

  const unavailable = Object.freeze({
    availability_state: "UNAVAILABLE" as const,
    reason: "FINANCIAL_NEWS_BEHAVIORAL_COLLECTION_NOT_ENABLED",
  });

  const evidence = Object.freeze({
    impressions: unavailable,
    clicks: unavailable,
    observed_ctr: unavailable,
    expected_ctr_at_position: unavailable,
    position_adjusted_ctr: unavailable,
    dwell_time_ms: unavailable,
    return_to_results_rate: unavailable,
    sample_confidence: unavailable,
  } satisfies BehavioralEvidence);

  // Force explicit review even if a future canonical field is optional.
  const coverageIsExact: [
    Exclude<keyof BehavioralEvidence, keyof typeof evidence>,
    Exclude<keyof typeof evidence, keyof BehavioralEvidence>,
  ] extends [never, never] ? true : false = true;
  void coverageIsExact;

  return () => evidence;
}
