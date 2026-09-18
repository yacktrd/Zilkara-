/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-temporal-reference-contract.ts
 * Private recorded-observation reference boundary, version 1.0.0.
 *
 * CONTRACT ONLY. No observation producer, reader implementation or runtime
 * binding is activated by this file.
 *
 * OWNERSHIP
 * - The authorized upstream temporal-observation source owns observation_id.
 * - current_observation_id is a REFERENCE to that exact observation_id.
 * - document_series_id retains its existing canonical identity contract.
 * - These aliases introduce no new observation truth or identity algorithm.
 *
 * REFERENCE RESOLUTION
 * - Receive the exact existing runtime temporal input.
 * - Resolve a reference explicitly supplied by the authorized upstream source
 *   for this run and document. Preserve its exact identity values.
 * - Never derive observation_id from document_id, a hash, a clock or a counter.
 * - Never select the latest record or substitute another observation.
 * - Resolution performs no observation production or persistence.
 * - Missing or invalid references retain explicit unavailable evidence.
 * - AVAILABLE(reference) does not prove that the record exists in storage.
 *
 * READER BINDING REQUIREMENTS
 * - Unavailable reference: propagate evidence without invoking the reader.
 * - Available reference: read that exact series/current-observation pair.
 * - Before exposing a successful resolution, verify that the stored current
 *   observation matches the requested reference and runtime document identity.
 * - Require ALL_RECORDED_BEFORE_CURRENT coverage from the existing store.
 * - Transport observation values unchanged, in the reader's history order.
 * - NOT_FOUND maps explicitly to UNAVAILABLE/CURRENT_OBSERVATION_NOT_FOUND.
 * - UNAVAILABLE, INVALID and INSUFFICIENT_HISTORY retain their state and reason.
 * - No failure may become AVAILABLE with an empty history.
 * - Reader/source exceptions propagate unchanged; no retries or fallback.
 * - Provenance and diagnostic reasons remain private.
 *
 * The concrete upstream source and reader binding still require implementation.
 * Type checking this contract does not validate a live runtime connection.
 * ========================================================================== */

import type { SearchOptionalEvidence } from "../../contracts/search-pipeline-contract";
import type {
  SearchTemporalObservationReadInput,
  SearchTemporalObservationReader,
} from "../../contracts/search-temporal-observation-store-contract";
import type {
  SearchFinancialNewsRecordedTemporalSourceDependencies,
} from "./search-financial-news-recorded-temporal-source";
import type {
  SearchFinancialNewsAuthorizedTemporalObservationSource,
} from "./search-financial-news-temporal-observation-provider";

export const XYVALA_SEARCH_FINANCIAL_NEWS_TEMPORAL_REFERENCE_CONTRACT_VERSION =
  "1.0.0" as const;

export type SearchFinancialNewsTemporalReferenceInput = Parameters<
  SearchFinancialNewsAuthorizedTemporalObservationSource
>[0];

export type SearchFinancialNewsCurrentTemporalObservationReference =
  Readonly<SearchTemporalObservationReadInput>;

export type SearchFinancialNewsTemporalReferenceResult = SearchOptionalEvidence<
  SearchFinancialNewsCurrentTemporalObservationReference
>;

export type SearchFinancialNewsTemporalReferenceSource = (
  input: SearchFinancialNewsTemporalReferenceInput,
) => SearchFinancialNewsTemporalReferenceResult |
  Promise<SearchFinancialNewsTemporalReferenceResult>;

export interface SearchFinancialNewsRecordedTemporalReaderDependencies {
  readonly resolve_current_observation_reference:
    SearchFinancialNewsTemporalReferenceSource;
  readonly read_observations: SearchTemporalObservationReader["read"];
}

export type SearchFinancialNewsRecordedTemporalReader =
  SearchFinancialNewsRecordedTemporalSourceDependencies["read_recorded_observations"];
