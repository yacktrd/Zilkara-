/* ============================================================================
 * FILE: lib/xyvala/search/contracts/search-public-request-contract.ts
 *
 * XYVALA SEARCH — PUBLIC REQUEST CONTRACT
 *
 * ROLE
 * ----
 * Describes only caller-provided public Search request truth.
 *
 * This contract does NOT produce:
 * - query_id
 * - cohort_id
 * - created_at
 * - normalized_query
 * - query profile
 * - cohort definition
 * - ranking
 * - analytical truth
 *
 * Those realities remain owned by their canonical producers.
 * ========================================================================== */

import type { SearchQueryBuildInput } from "../query/search-query-input-core";

export const XYVALA_SEARCH_PUBLIC_REQUEST_CONTRACT_VERSION =
  "1.0.0" as const;

/**
 * Public caller truth only.
 *
 * Pick<> intentionally preserves the exact field semantics defined by the
 * canonical SearchQuery Input Core without redefining them here.
 */
export type SearchPublicRequest = Readonly<
  Pick<
    SearchQueryBuildInput,
    | "raw_query"
    | "requested_language"
    | "requested_source_types"
    | "requested_domain"
    | "requested_time_window"
  >
>;
