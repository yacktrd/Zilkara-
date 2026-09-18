/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-recency-contract.ts
 * STATUS: Contract proposal, 0.1.0-draft.1. No runtime activation.
 *
 * AUTHORITIES
 * - Search Protocol XXV-XXVII: Temporal ownership and inclusive 24H/7D windows.
 * - Search VLR II and XL-XLI: domain production and explicit lineage.
 *
 * PROPOSED PRODUCER
 * - buildSearchFinancialNewsRecency in search-financial-news-recency-core.ts.
 * - Canonical temporal ownership remains TEMPORAL_SIGNAL_DETECTION.
 * - This file does not implement or register that producer.
 *
 * INPUT PROVENANCE
 * - temporal_signals and temporal_origin must originate from the SAME accepted
 *   canonical Temporal execution, with identical document_id values.
 * - temporal_origin transports the actual upstream publication_reference_at.
 * - Matching types or timestamps alone do not authenticate that relationship.
 * - The authorized binding must establish it; never select another result,
 *   manufacture an observation/trace identity or substitute created_at.
 * - REJECTED or UNVALIDATED Temporal envelopes must be rejected.
 * - DEGRADED alone does not invalidate an otherwise usable age.
 *
 * CLASSIFICATION
 * - Consume publication_age_ms only; never recompute age or publication date.
 * - 0 <= age <= 86400000: WITHIN_24H, true/true.
 * - 86400000 < age <= 604800000: WITHIN_7D_ONLY, false/true.
 * - age > 604800000: OLDER_THAN_7D, false/false.
 * - No clock access, calendar rounding, historical-count or confidence gate.
 * - Every non-AVAILABLE age retains its exact state and reason in all three
 *   output evidence fields. AVAILABLE(false) must never encode missing data.
 * - temporal_state is not recency_state and is not an age-availability proxy.
 *
 * POLICY
 * - An authorized policy is mandatory; no default instance is provided here.
 * - Literal bounds encode the official convention, not configurable scoring.
 * - policy_version must be non-empty and match the supplied authorized artifact.
 * - Its ownership/source must be registered before runtime use.
 * - No missing policy repair, current-cycle calibration or version inference.
 *
 * OUTPUT / FAILURE
 * - RESOLVED means a valid result envelope, including unavailable evidence.
 * - REJECTED returns non-empty private reasons and no analytical result.
 * - Reject malformed input, identity/provenance mismatch, incompatible contract,
 *   invalid policy, or AVAILABLE age that is negative or non-finite.
 * - An upstream INVALID age is propagated as evidence, not repaired.
 * - Unexpected execution exceptions propagate; no blanket fallback.
 * - References in a resolved result are the exact input references.
 * - recency_policy_version equals policy.policy_version unchanged.
 * - The producer may freeze its new envelope, never mutate/freeze caller inputs.
 *
 * BOUNDARIES
 * - Proposed producer effect: pure COMPUTE; this file declares contracts only.
 * - No provider request, persistence, scoring, eligibility, exclusion or ranking.
 * - No public exposure or Search-to-MCI binding is authorized here.
 * - Draft enums and types below require canonical contract/VLR registration.
 * - Type checking does not validate provenance, authorization or runtime.
 * ========================================================================== */

import type {
  SearchAvailableValue,
  SearchPolicyVersion,
  SearchTemporalSignals,
  SearchUnavailableValue,
} from "../../contracts/search-pipeline-contract";
import type {
  SearchTemporalSignalsSearchInput,
} from "../../temporal/search-temporal-signals-search-core";

export const XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_CONTRACT_VERSION =
  "0.1.0-draft.1" as const;

/** Policy shape only. No active policy artifact or version is selected here. */
export interface SearchFinancialNewsRecencyPolicy {
  readonly policy_version: SearchPolicyVersion;
  readonly within_24h_max_age_ms: 86_400_000;
  readonly within_7d_max_age_ms: 604_800_000;
  readonly boundaries_inclusive: true;
}

/** Transport from the actual input of the referenced Temporal execution. */
export type SearchFinancialNewsRecencyTemporalOrigin = Readonly<
  Pick<
    SearchTemporalSignalsSearchInput,
    "document_id" | "publication_reference_at"
  >
>;

export interface SearchFinancialNewsRecencyInput {
  readonly temporal_signals: SearchTemporalSignals;
  readonly temporal_origin: SearchFinancialNewsRecencyTemporalOrigin;
  readonly policy: SearchFinancialNewsRecencyPolicy;
}

/** Proposed domain labels; distinct from evidence availability. */
export type SearchFinancialNewsRecencyState =
  | "WITHIN_24H"
  | "WITHIN_7D_ONLY"
  | "OLDER_THAN_7D";

export type SearchFinancialNewsAvailableRecency =
  | {
      readonly within_24h: Readonly<SearchAvailableValue<true>>;
      readonly within_7d: Readonly<SearchAvailableValue<true>>;
      readonly recency_state: Readonly<SearchAvailableValue<"WITHIN_24H">>;
    }
  | {
      readonly within_24h: Readonly<SearchAvailableValue<false>>;
      readonly within_7d: Readonly<SearchAvailableValue<true>>;
      readonly recency_state: Readonly<SearchAvailableValue<"WITHIN_7D_ONLY">>;
    }
  | {
      readonly within_24h: Readonly<SearchAvailableValue<false>>;
      readonly within_7d: Readonly<SearchAvailableValue<false>>;
      readonly recency_state: Readonly<SearchAvailableValue<"OLDER_THAN_7D">>;
    };

type SearchFinancialNewsUnavailableAgeState =
  SearchUnavailableValue["availability_state"];

type SearchFinancialNewsUnavailableEvidence<
  State extends SearchFinancialNewsUnavailableAgeState,
> = Readonly<SearchUnavailableValue & { readonly availability_state: State }>;

/** State agreement is typed; exact reason preservation also needs validation. */
export type SearchFinancialNewsUnavailableRecency = {
  readonly [State in SearchFinancialNewsUnavailableAgeState]: {
    readonly within_24h: SearchFinancialNewsUnavailableEvidence<State>;
    readonly within_7d: SearchFinancialNewsUnavailableEvidence<State>;
    readonly recency_state: SearchFinancialNewsUnavailableEvidence<State>;
  };
}[SearchFinancialNewsUnavailableAgeState];

/** Private references retain their upstream ownership; no new result identity. */
export interface SearchFinancialNewsRecencyContext {
  readonly contract_version:
    typeof XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_CONTRACT_VERSION;
  readonly temporal_signals: SearchTemporalSignals;
  readonly temporal_origin: SearchFinancialNewsRecencyTemporalOrigin;
  readonly policy: SearchFinancialNewsRecencyPolicy;
  readonly recency_policy_version:
    SearchFinancialNewsRecencyPolicy["policy_version"];
}

export type SearchFinancialNewsRecency = SearchFinancialNewsRecencyContext &
  (SearchFinancialNewsAvailableRecency | SearchFinancialNewsUnavailableRecency);

export type SearchFinancialNewsRecencyResult =
  | {
      readonly status: "RESOLVED";
      readonly data: SearchFinancialNewsRecency;
    }
  | {
      readonly status: "REJECTED";
      readonly reasons: readonly [string, ...string[]];
    };

/** Synchronous capability declaration only; no implementation or binding. */
export type SearchFinancialNewsRecencyProducer = (
  input: SearchFinancialNewsRecencyInput,
) => SearchFinancialNewsRecencyResult;
