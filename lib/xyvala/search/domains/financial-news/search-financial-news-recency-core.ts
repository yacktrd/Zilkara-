/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-recency-core.ts
 * STATUS: Candidate implementation, 0.1.0-draft.1; offline validation only.
 * AUTHORITIES: Search Protocol XXV-XXVII; Search VLR II, XL-XLI.
 * OWNER: TEMPORAL_SIGNAL_DETECTION; specialized Financial News classification.
 * CONTRACT: search-financial-news-recency-contract.ts, 0.1.0-draft.1.
 *
 * Consume canonical publication_age_ms; never calculate or repair that age.
 * Require an explicit policy. No default, provider, clock, history read or write.
 * Validate consumed fields and reference-envelope coherence here. Canonical
 * Temporal validation remains upstream; this is not a replacement validator.
 * Timestamp parsing checks the transported reference only, never publication age.
 * The authorized binding must establish policy authority and same-execution
 * provenance. Matching document IDs and valid timestamps cannot prove either.
 *
 * Preserve caller references; freeze only newly created objects. Unavailable age
 * retains its exact state and reason. Rejections carry no analytical data.
 * Unexpected exceptions propagate. No scoring, exclusion, ranking or exposure.
 * Canonical VLR registration and application activation remain outstanding.
 * ========================================================================== */

import type { SearchUnavailableValue } from "../../contracts/search-pipeline-contract";
import {
  XYVALA_SEARCH_TEMPORAL_SIGNALS_CONTRACT_VERSION,
} from "../../temporal/search-temporal-signals-search-core";
import {
  XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_CONTRACT_VERSION,
} from "./search-financial-news-recency-contract";
import type {
  SearchFinancialNewsRecency,
  SearchFinancialNewsRecencyInput,
  SearchFinancialNewsRecencyResult,
} from "./search-financial-news-recency-contract";

export const XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_CORE_MODULE_VERSION =
  "0.1.0-draft.1" as const;

function hasDataFields(value: unknown, fields: readonly string[]): boolean {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    fields.every(field => {
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      return descriptor !== undefined && Object.hasOwn(descriptor, "value");
    });
}

function exactEvidence(value: unknown, fields: readonly string[]): boolean {
  return hasDataFields(value, fields) && typeof value === "object" &&
    value !== null && Reflect.ownKeys(value).length === fields.length;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function timestamp(value: unknown): value is string {
  return nonEmpty(value) && Number.isFinite(Date.parse(value));
}

function rejected(reason: string): SearchFinancialNewsRecencyResult {
  return Object.freeze({ status: "REJECTED", reasons: Object.freeze([reason] as const) });
}

function available<const T extends boolean | string>(value: T) {
  return Object.freeze({ availability_state: "AVAILABLE" as const, value });
}

function unavailable<const S extends SearchUnavailableValue["availability_state"]>(
  availability_state: S,
  reason: string,
) {
  const evidence = Object.freeze({ availability_state, reason });
  return { within_24h: evidence, within_7d: evidence, recency_state: evidence };
}

export function buildSearchFinancialNewsRecency(
  input: SearchFinancialNewsRecencyInput,
): SearchFinancialNewsRecencyResult {
  if (!hasDataFields(input, ["temporal_signals", "temporal_origin", "policy"])) {
    return rejected("INVALID_RECENCY_INPUT");
  }
  const { temporal_signals: signals, temporal_origin: origin, policy } = input;
  if (!hasDataFields(signals, [
    "contract_version", "document_id", "created_at", "validation_state", "publication_age_ms",
  ])) return rejected("INVALID_TEMPORAL_ENVELOPE");
  if (signals.contract_version !== XYVALA_SEARCH_TEMPORAL_SIGNALS_CONTRACT_VERSION) {
    return rejected("INCOMPATIBLE_TEMPORAL_CONTRACT");
  }
  if (signals.validation_state !== "VALID" && signals.validation_state !== "DEGRADED") {
    return rejected("TEMPORAL_RESULT_NOT_ACCEPTED");
  }
  if (!hasDataFields(origin, ["document_id", "publication_reference_at"]) ||
      !nonEmpty(signals.document_id) || !nonEmpty(origin.document_id)) {
    return rejected("INVALID_TEMPORAL_ORIGIN");
  }
  if (origin.document_id !== signals.document_id) {
    return rejected("TEMPORAL_DOCUMENT_MISMATCH");
  }
  if (!timestamp(origin.publication_reference_at) || !timestamp(signals.created_at) ||
      Date.parse(origin.publication_reference_at) > Date.parse(signals.created_at)) {
    return rejected("INVALID_TEMPORAL_REFERENCE");
  }
  if (!hasDataFields(policy, [
    "policy_version", "within_24h_max_age_ms", "within_7d_max_age_ms", "boundaries_inclusive",
  ]) || !nonEmpty(policy.policy_version) || policy.within_24h_max_age_ms !== 86_400_000 ||
      policy.within_7d_max_age_ms !== 604_800_000 || policy.boundaries_inclusive !== true) {
    return rejected("INVALID_RECENCY_POLICY");
  }

  const age = signals.publication_age_ms;
  if (!hasDataFields(age, ["availability_state"])) return rejected("INVALID_AGE_EVIDENCE");
  const context = {
    contract_version: XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_CONTRACT_VERSION,
    temporal_signals: signals,
    temporal_origin: origin,
    policy,
    recency_policy_version: policy.policy_version,
  };
  let data: SearchFinancialNewsRecency;
  if (age.availability_state === "AVAILABLE") {
    if (!exactEvidence(age, ["availability_state", "value"]) ||
        typeof age.value !== "number" || !Number.isFinite(age.value) || age.value < 0) {
      return rejected("INVALID_AVAILABLE_AGE");
    }
    if (age.value <= policy.within_24h_max_age_ms) {
      data = { ...context, within_24h: available(true), within_7d: available(true),
        recency_state: available("WITHIN_24H") };
    } else if (age.value <= policy.within_7d_max_age_ms) {
      data = { ...context, within_24h: available(false), within_7d: available(true),
        recency_state: available("WITHIN_7D_ONLY") };
    } else {
      data = { ...context, within_24h: available(false), within_7d: available(false),
        recency_state: available("OLDER_THAN_7D") };
    }
  } else {
    if (!exactEvidence(age, ["availability_state", "reason"]) || !nonEmpty(age.reason)) {
      return rejected("INVALID_UNAVAILABLE_AGE");
    }
    switch (age.availability_state) {
      case "UNAVAILABLE":
        data = { ...context, ...unavailable("UNAVAILABLE", age.reason) }; break;
      case "INSUFFICIENT_DATA":
        data = { ...context, ...unavailable("INSUFFICIENT_DATA", age.reason) }; break;
      case "INSUFFICIENT_HISTORY":
        data = { ...context, ...unavailable("INSUFFICIENT_HISTORY", age.reason) }; break;
      case "UNSUPPORTED":
        data = { ...context, ...unavailable("UNSUPPORTED", age.reason) }; break;
      case "INVALID":
        data = { ...context, ...unavailable("INVALID", age.reason) }; break;
      default:
        return rejected("UNKNOWN_AGE_AVAILABILITY");
    }
  }
  return Object.freeze({ status: "RESOLVED", data: Object.freeze(data) });
}
