/* ============================================================================
 * FILE:
 * lib/xyvala/search/domains/financial-news/search-financial-news-recorded-temporal-reader.ts
 *
 * MODULE VERSION: 1.0.0
 *
 * ROLE
 * Private transport boundary between an explicitly supplied current-observation
 * reference and the existing temporal-observation reader.
 *
 * GOVERNING CONTRACTS
 * - search-financial-news-temporal-reference-contract.ts
 * - search-temporal-observation-store-contract.ts
 * - search-financial-news-recorded-temporal-source.ts
 *
 * OWNERSHIP
 * - The authorized upstream observation producer owns observation identity,
 *   observation timestamps, evidence and provenance.
 * - current_observation_id references an existing observation_id.
 * - The canonical document-series identity producer retains series ownership.
 * - The store owns persistence outcomes and recorded-history coverage.
 * - The canonical Temporal producer owns temporal analytical computation.
 *
 * This boundary transports existing truth. It introduces no observation
 * producer, identity algorithm, analytical policy or ownership transfer.
 *
 * REFERENCE RESOLUTION
 * - Forward the exact runtime input to the injected reference source.
 * - Preserve explicitly unavailable reference evidence without invoking storage.
 * - Verify the reference series against the canonical document-series identity.
 * - Request the exact supplied series/current-observation pair.
 * - Never select the latest observation or substitute another reference.
 *
 * READ RESULT VALIDATION
 * - Require the contracted read-result envelope.
 * - Require ALL_RECORDED_BEFORE_CURRENT coverage for an available result.
 * - Verify current observation identity against the requested reference and
 *   the runtime document identity.
 * - Verify that transported historical observations belong to the same series.
 * - Leave canonical observation-content and chronology validation with their
 *   existing owners.
 *
 * TRANSPORT
 * - Preserve observation objects and their evidence without reconstruction.
 * - Preserve the history order supplied by the reader.
 * - Create only the resolution and history transport containers.
 * - Keep persistence provenance outside the temporal resolution.
 *
 * AVAILABILITY AND FAILURES
 * - AVAILABLE with empty history means the reader reported no earlier recorded
 *   observations within its contracted snapshot coverage.
 * - It does not establish continuous observation or absence of earlier events.
 * - NOT_FOUND maps to UNAVAILABLE/CURRENT_OBSERVATION_NOT_FOUND.
 * - UNAVAILABLE, INVALID and INSUFFICIENT_HISTORY preserve their state and reason.
 * - Malformed boundary results remain explicitly INVALID.
 * - Reference-source and reader exceptions propagate unchanged.
 * - No failure becomes an available result with fabricated empty history.
 *
 * EXECUTION BOUNDARIES
 * - Read access occurs exclusively through the injected reader capability.
 * - No observation creation, write, migration, update, deletion or cleanup.
 * - No clock generation, retry, fallback, sorting or analytical recomputation.
 * - Dependency injection does not itself establish source authorization.
 *
 * EXPOSURE AND VALIDATION SCOPE
 * - References, observations and diagnostic reasons remain private.
 * - This factory does not activate an upstream source or an application caller.
 * - Static checks and offline tests do not prove a live PostgreSQL binding or
 *   production readiness.
 * ========================================================================== */

import type { SearchUnavailableValue } from "../../contracts/search-pipeline-contract";
import { buildSearchTemporalDocumentSeriesId } from "../../temporal/search-temporal-document-series-identity";
import type {
  SearchFinancialNewsRecordedTemporalReader,
  SearchFinancialNewsRecordedTemporalReaderDependencies,
} from "./search-financial-news-temporal-reference-contract";

export const XYVALA_SEARCH_FINANCIAL_NEWS_RECORDED_TEMPORAL_READER_MODULE_VERSION =
  "1.0.0" as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: unknown, keys: readonly string[]): boolean {
  return isObject(value) && Reflect.ownKeys(value).length === keys.length &&
    keys.every(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor !== undefined && Object.hasOwn(descriptor, "value");
    });
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUnavailable(value: unknown): value is SearchUnavailableValue {
  if (!isObject(value) || !exactKeys(value, ["availability_state", "reason"])) return false;
  return nonEmpty(value.reason) && (
    value.availability_state === "UNAVAILABLE" ||
    value.availability_state === "INSUFFICIENT_DATA" ||
    value.availability_state === "INSUFFICIENT_HISTORY" ||
    value.availability_state === "UNSUPPORTED" ||
    value.availability_state === "INVALID"
  );
}

function hasObservation(value: unknown): boolean {
  return isObject(value) && exactKeys(value, ["observation", "provenance"]) &&
    isObject(value.observation) && isObject(value.provenance);
}

function invalid(reason: string): SearchUnavailableValue {
  return Object.freeze({ availability_state: "INVALID", reason });
}

export function createSearchFinancialNewsRecordedTemporalReader(
  dependencies: SearchFinancialNewsRecordedTemporalReaderDependencies,
): SearchFinancialNewsRecordedTemporalReader {
  if (
    !exactKeys(dependencies, ["resolve_current_observation_reference", "read_observations"]) ||
    typeof dependencies.resolve_current_observation_reference !== "function" ||
    typeof dependencies.read_observations !== "function"
  ) {
    throw new Error("[financial-news-recorded-temporal-reader] Explicit reference source and reader required.");
  }
  const resolve = dependencies.resolve_current_observation_reference;
  const read = dependencies.read_observations;

  return async (input) => {
    // Exceptions from either capability propagate unchanged.
    const reference = await resolve(input);
    if (isUnavailable(reference)) return reference;
    if (
      !exactKeys(reference, ["availability_state", "value"]) ||
      reference.availability_state !== "AVAILABLE" ||
      !exactKeys(reference.value, ["document_series_id", "current_observation_id"]) ||
      !nonEmpty(reference.value.current_observation_id)
    ) return invalid("INVALID_CURRENT_OBSERVATION_REFERENCE");

    const { document_series_id: series, current_observation_id: currentId } = reference.value;
    const documentId = input.raw_document.document_id;
    if (series !== buildSearchTemporalDocumentSeriesId({
      source_uri: input.raw_document.source_uri,
      source_type: input.raw_document.source_type,
    })) return invalid("TEMPORAL_REFERENCE_SERIES_MISMATCH");

    const result = await read(reference.value);
    if (!isObject(result)) return invalid("INVALID_TEMPORAL_STORE_RESULT");
    if (result.status !== "AVAILABLE") {
      if (!exactKeys(result, ["status", "reason"]) || !nonEmpty(result.reason)) {
        return invalid("INVALID_TEMPORAL_STORE_RESULT");
      }
      if (result.status === "NOT_FOUND" && result.reason === "CURRENT_OBSERVATION_NOT_FOUND") {
        return Object.freeze({ availability_state: "UNAVAILABLE", reason: result.reason });
      }
      if (result.status === "UNAVAILABLE" || result.status === "INVALID" ||
          result.status === "INSUFFICIENT_HISTORY") {
        return Object.freeze({ availability_state: result.status, reason: result.reason });
      }
      return invalid("INVALID_TEMPORAL_STORE_RESULT");
    }

    if (
      !exactKeys(result, ["status", "coverage", "current_record", "historical_records"]) ||
      result.coverage !== "ALL_RECORDED_BEFORE_CURRENT" ||
      !hasObservation(result.current_record) || !Array.isArray(result.historical_records)
    ) return invalid("INVALID_TEMPORAL_STORE_RESULT");

    const current = result.current_record.observation;
    if (current.document_series_id !== series || current.observation_id !== currentId ||
        current.document_id !== documentId) {
      return invalid("CURRENT_OBSERVATION_IDENTITY_MISMATCH");
    }
    for (const record of result.historical_records) {
      if (!hasObservation(record) || record.observation.document_series_id !== series) {
        return invalid("INVALID_TEMPORAL_HISTORY_RESULT");
      }
    }

    return Object.freeze({
      availability_state: "AVAILABLE",
      value: Object.freeze({
        current_observation: current,
        historical_observations: Object.freeze(
          result.historical_records.map(record => record.observation),
        ),
      }),
    });
  };
}
