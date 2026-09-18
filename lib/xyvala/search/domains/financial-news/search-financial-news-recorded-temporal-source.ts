/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-source.ts
 * Read already-recorded temporal observations through one authorized reader.
 *
 * The reader owns lookup, recording coverage and observation provenance.
 * AVAILABLE means it can supply a real current observation and a history whose
 * coverage it knows. An empty history is valid only when the reader establishes
 * that state. Missing storage or a failed lookup must never become empty history.
 *
 * This source transports the exact runtime input and resolution references.
 * The existing temporal producer validates observation contents and chronology.
 * No observations, timestamps, identities or analytical values are constructed.
 * No sorting, copying, retry, fallback, persistence or error replacement.
 *
 * The runtime contract requires current_observation. Explicitly unavailable
 * readings therefore reject; they cannot be represented as a successful run.
 * This module supplies no database implementation and performs no collection.
 * ========================================================================== */

import type {
  SearchOptionalEvidence,
  SearchUnavailableValue,
} from "../../contracts/search-pipeline-contract";
import type {
  SearchFinancialNewsAuthorizedTemporalObservationSource,
} from "./search-financial-news-temporal-observation-provider";

type TemporalInput = Parameters<
  SearchFinancialNewsAuthorizedTemporalObservationSource
>[0];

type TemporalResolution = Awaited<
  ReturnType<SearchFinancialNewsAuthorizedTemporalObservationSource>
>;

export type SearchFinancialNewsRecordedTemporalReadResult =
  SearchOptionalEvidence<TemporalResolution>;

export interface SearchFinancialNewsRecordedTemporalSourceDependencies {
  readonly read_recorded_observations: (
    input: TemporalInput,
  ) => SearchFinancialNewsRecordedTemporalReadResult |
    Promise<SearchFinancialNewsRecordedTemporalReadResult>;
}

export const XYVALA_SEARCH_FINANCIAL_NEWS_RECORDED_TEMPORAL_SOURCE_MODULE_VERSION =
  "1.0.0" as const;

export class SearchFinancialNewsRecordedTemporalSourceError extends Error {
  readonly code: "TEMPORAL_OBSERVATIONS_UNAVAILABLE" | "INVALID_TEMPORAL_READ_RESULT";
  readonly evidence: SearchUnavailableValue | null;

  constructor(
    code: "TEMPORAL_OBSERVATIONS_UNAVAILABLE" | "INVALID_TEMPORAL_READ_RESULT",
    evidence: SearchUnavailableValue | null = null,
  ) {
    super(`[financial-news-recorded-temporal-source] ${code}`);
    this.name = "SearchFinancialNewsRecordedTemporalSourceError";
    this.code = code;
    // Private diagnostic reference. Never serialize this error to HTTP clients.
    this.evidence = evidence;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function createSearchFinancialNewsRecordedTemporalSource(
  dependencies: SearchFinancialNewsRecordedTemporalSourceDependencies,
): SearchFinancialNewsAuthorizedTemporalObservationSource {
  if (
    !isRecord(dependencies) ||
    Reflect.ownKeys(dependencies).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(dependencies, "read_recorded_observations") ||
    typeof dependencies.read_recorded_observations !== "function"
  ) {
    throw new Error(
      "[financial-news-recorded-temporal-source] An explicit observation reader is required.",
    );
  }

  const read = dependencies.read_recorded_observations;

  return async (input) => {
    // A reader rejection propagates unchanged. It is not missing evidence.
    const result = await read(input);
    if (!isRecord(result)) {
      throw new SearchFinancialNewsRecordedTemporalSourceError("INVALID_TEMPORAL_READ_RESULT");
    }

    if (
      result.availability_state === "UNAVAILABLE" ||
      result.availability_state === "INSUFFICIENT_DATA" ||
      result.availability_state === "INSUFFICIENT_HISTORY" ||
      result.availability_state === "UNSUPPORTED" ||
      result.availability_state === "INVALID"
    ) {
      if (
        typeof result.reason !== "string" ||
        result.reason.trim().length === 0 ||
        Reflect.ownKeys(result).length !== 2 ||
        !Object.prototype.hasOwnProperty.call(result, "availability_state") ||
        !Object.prototype.hasOwnProperty.call(result, "reason")
      ) {
        throw new SearchFinancialNewsRecordedTemporalSourceError("INVALID_TEMPORAL_READ_RESULT");
      }
      throw new SearchFinancialNewsRecordedTemporalSourceError("TEMPORAL_OBSERVATIONS_UNAVAILABLE", result);
    }

    if (
      result.availability_state !== "AVAILABLE" ||
      Reflect.ownKeys(result).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(result, "availability_state") ||
      !Object.prototype.hasOwnProperty.call(result, "value") ||
      !isRecord(result.value) ||
      !isRecord(result.value.current_observation) ||
      !Array.isArray(result.value.historical_observations)
    ) {
      throw new SearchFinancialNewsRecordedTemporalSourceError("INVALID_TEMPORAL_READ_RESULT");
    }

    return result.value;
  };
}
