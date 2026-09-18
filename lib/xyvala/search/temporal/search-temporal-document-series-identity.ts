/* ============================================================================
 * FILE: lib/xyvala/search/temporal/search-temporal-document-series-identity.ts
 * Canonical identity producer for a source-specific temporal document series.
 *
 * Identity scope V1:
 * - exact source_uri supplied by Acquisition;
 * - exact canonical source_type supplied by Acquisition.
 *
 * Content, MIME type, timestamps, query and document-version identity are not
 * series identity inputs. Revisions at the same URI and source type belong to
 * the same series, including revisions with a different representation format.
 *
 * Different URI strings remain different series. No URL normalization,
 * fragment removal, tracking-parameter removal, redirects or alias inference.
 * A series identifies a source location, not proven editorial continuity.
 * Moving an article to another URI requires a separately authorized relation.
 *
 * This identifier never replaces SearchRawDocument.document_id. Every temporal
 * observation must retain its actual Acquisition-owned document-version ID.
 * Series membership does not, by itself, establish analytical comparability.
 *
 * Pure deterministic identity computation only. No clock, randomness, network,
 * persistence, analytical calculation or historical observation reconstruction.
 *
 * Integrated into the temporal observation contract, execution boundary,
 * runtime adapter and canonical cross-cutting VLR. Historical collection and
 * storage remain separate responsibilities of the authorized observation source.
 * ========================================================================== */

import { createHash } from "node:crypto";

import type {
  SearchModuleVersion,
  SearchRawDocument,
  SearchSourceType,
} from "../contracts/search-pipeline-contract";

export const XYVALA_SEARCH_TEMPORAL_DOCUMENT_SERIES_IDENTITY_MODULE_NAME =
  "xyvala-search-temporal-document-series-identity" as const;

export const XYVALA_SEARCH_TEMPORAL_DOCUMENT_SERIES_IDENTITY_MODULE_VERSION:
  SearchModuleVersion = "1.1.0";

export type SearchTemporalDocumentSeriesId =
  `search_temporal_series_v1_${string}`;

export type SearchTemporalDocumentSeriesIdentityInput = Readonly<
  Pick<SearchRawDocument, "source_uri" | "source_type">
>;

const SOURCE_TYPES = Object.freeze([
  "WEB_PAGE",
  "DOCUMENT",
  "ARTICLE",
  "CV",
  "TECHNICAL_DOCUMENT",
  "LEGAL_DOCUMENT",
  "API_RESOURCE",
  "MANUAL_TEXT",
  "OTHER",
] as const satisfies readonly SearchSourceType[]);

type DeclaredSourceType = (typeof SOURCE_TYPES)[number];

const SOURCE_TYPES_ARE_EXACT: [
  Exclude<SearchSourceType, DeclaredSourceType>,
  Exclude<DeclaredSourceType, SearchSourceType>,
] extends [never, never] ? true : false = true;
void SOURCE_TYPES_ARE_EXACT;

function rejectInput(): never {
  throw new Error(
    `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SERIES_IDENTITY_MODULE_NAME}] ` +
      "Series identity requires exactly an absolute source_uri and a canonical source_type.",
  );
}

export function assertSearchTemporalDocumentSeriesId(
  value: unknown,
): asserts value is SearchTemporalDocumentSeriesId {
  if (
    typeof value !== "string" ||
    !/^search_temporal_series_v1_[a-f0-9]{64}$/.test(value)
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SERIES_IDENTITY_MODULE_NAME}] ` +
        "Invalid V1 temporal document series identifier.",
    );
  }
}

function assertIdentityInput(
  input: SearchTemporalDocumentSeriesIdentityInput,
): void {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Reflect.ownKeys(input).length !== 2 ||
    !Object.prototype.hasOwnProperty.call(input, "source_uri") ||
    !Object.prototype.hasOwnProperty.call(input, "source_type") ||
    typeof input.source_uri !== "string" ||
    input.source_uri.trim().length === 0 ||
    typeof input.source_type !== "string" ||
    !SOURCE_TYPES.some((sourceType) => sourceType === input.source_type)
  ) {
    rejectInput();
  }

  try {
    // Validation only: never hash the parsed/normalized URL representation.
    new URL(input.source_uri);
  } catch {
    rejectInput();
  }
}

export function buildSearchTemporalDocumentSeriesId(
  input: SearchTemporalDocumentSeriesIdentityInput,
): SearchTemporalDocumentSeriesId {
  assertIdentityInput(input);

  // An ordered JSON tuple prevents ambiguous delimiter concatenations and
  // preserves the supplied JavaScript strings, including Unicode escaping.
  // The prefix and encoding are part of the immutable V1 identity definition.
  const encodedScope = JSON.stringify([
    input.source_uri,
    input.source_type,
  ]);

  const digest = createHash("sha256")
    .update("XYVALA_SEARCH_TEMPORAL_DOCUMENT_SERIES_V1\0", "utf8")
    .update(encodedScope, "utf8")
    .digest("hex");

  return `search_temporal_series_v1_${digest}`;
}
