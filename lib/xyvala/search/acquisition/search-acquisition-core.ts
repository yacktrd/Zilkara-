/* ============================================================================
 * FILE: lib/xyvala/search/acquisition/search-acquisition-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical acquisition core
 *
 * ROLE
 * - consume a raw payload already obtained by an authorized acquisition adapter
 * - validate the minimum acquisition contract requirements
 * - preserve explicit source publication evidence without interpreting it
 * - normalize acquisition metadata without altering document content
 * - compute the canonical content hash
 * - compute the deterministic document identity
 * - produce the canonical SearchRawDocument contract
 *
 * CLASSIFICATION
 * - PRIVATE SEARCH ENGINE
 * - ACQUISITION
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 * - DETERMINISTIC
 *
 * PARENTS
 * - Xyvala Search official protocol
 * - Search pipeline canonical contract
 * - Contract Before Runtime Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Search extraction engine
 * - Search acquisition orchestrator
 * - Search acquisition boundary validator
 * - Search private snapshot lineage
 * - Search audit and observability adapters
 *
 * DIRECTIVES
 * - no network access
 * - no file-system access
 * - no database access
 * - no queue access
 * - no event publication
 * - no extraction
 * - no segmentation
 * - no lexical analysis
 * - no temporal interpretation
 * - no publication-age calculation
 * - no scoring
 * - no ranking
 * - no private decision
 * - no public projection
 * - no implicit timestamp generation
 * - no random identifier generation
 * - no silent correction of invalid inputs
 * - no source_published_at reconstruction from fetched_at
 * - raw document identity must remain deterministic
 *
 * INPUTS
 * - raw content supplied by an authorized acquisition adapter
 * - explicit source metadata
 * - explicit fetched_at timestamp
 * - explicit source_published_at evidence
 * - explicit created_at timestamp
 * - explicit acquisition method and module version
 *
 * OUTPUTS
 * - SearchRawDocument
 *
 * INVARIANTS
 * - identical inputs produce identical content hashes
 * - identical source identity and content produce identical document identifiers
 * - source_published_at never participates in document identity
 * - source_published_at never participates in content hashing
 * - source_published_at is never inferred from fetched_at
 * - Acquisition does not calculate publication_age_ms
 * - the raw content is never transformed semantically
 * - Uint8Array inputs are defensively copied
 * - invalid acquisition data remains explicitly qualified
 * - rejected input is never silently converted into valid input
 * - unavailable publication evidence remains unavailable
 * - AVAILABLE publication evidence remains explicit evidence
 * - this module performs no runtime mutation
 *
 * CRITICAL DEPENDENCIES
 * - node:crypto
 * - search-pipeline-contract.ts
 *
 * SENSITIVE AREAS
 * - canonical hashing
 * - document identity
 * - source URI validation
 * - timestamp propagation
 * - source publication evidence
 * - raw content preservation
 * - acquisition rejection semantics
 * ========================================================================== */

import { createHash } from "node:crypto";

import type {
  SearchContractVersion,
  SearchIsoTimestamp,
  SearchMimeType,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchRawDocument,
  SearchSourceType,
  SearchUri,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE CONSTANTS
 * ========================================================================== */

export const XYVALA_SEARCH_ACQUISITION_CONTRACT_VERSION =
  "1.1.0" satisfies SearchContractVersion;

export const XYVALA_SEARCH_ACQUISITION_MODULE_VERSION =
  "1.1.0" satisfies SearchModuleVersion;

export const XYVALA_SEARCH_ACQUISITION_METHOD =
  "CANONICAL_RAW_PAYLOAD_ACQUISITION_V1";

const SEARCH_DOCUMENT_ID_PREFIX = "xys_doc";
const SHA_256_HEX_LENGTH = 64;

const ALLOWED_SOURCE_TYPES = new Set<SearchSourceType>([
  "WEB_PAGE",
  "DOCUMENT",
  "ARTICLE",
  "CV",
  "TECHNICAL_DOCUMENT",
  "LEGAL_DOCUMENT",
  "API_RESOURCE",
  "MANUAL_TEXT",
  "OTHER",
]);

/* ============================================================================
 * 2. INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * Timestamps and publication evidence are supplied explicitly.
 *
 * source_published_at is intentionally mandatory as SearchOptionalEvidence.
 *
 * This means the caller must explicitly state either:
 *
 * AVAILABLE
 * -> a canonical source timestamp observation exists.
 *
 * or a non-AVAILABLE state
 * -> no canonical source timestamp observation exists.
 *
 * Acquisition must never fabricate this evidence.
 *
 * This module must never call:
 * - Date.now()
 * - new Date()
 * - Math.random()
 * - crypto.randomUUID()
 *
 * Explicit timestamps preserve deterministic execution and reproducibility.
 * ========================================================================== */

export interface SearchAcquisitionInput {
  readonly source_uri:
    SearchUri;

  readonly source_type:
    SearchSourceType;

  readonly mime_type:
    SearchMimeType;

  readonly raw_content:
    string | Uint8Array;

  readonly fetched_at:
    SearchIsoTimestamp;

  /**
   * Publication timestamp evidence observed from the external source.
   *
   * This evidence is transported only.
   *
   * It must never be inferred from fetched_at.
   */
  readonly source_published_at:
    SearchOptionalEvidence<SearchIsoTimestamp>;

  readonly created_at:
    SearchIsoTimestamp;

  readonly acquisition_method?:
    string;

  readonly acquisition_module_version?:
    SearchModuleVersion;

  readonly source_metadata?:
    Readonly<
      Record<string, string | number | boolean>
    >;
}

/* ============================================================================
 * 3. VALIDATION CONTRACT
 * ========================================================================== */

export type SearchAcquisitionRejectionReason =
  | "SOURCE_URI_EMPTY"
  | "SOURCE_URI_INVALID"
  | "SOURCE_TYPE_INVALID"
  | "MIME_TYPE_EMPTY"
  | "RAW_CONTENT_EMPTY"
  | "FETCHED_AT_INVALID"
  | "SOURCE_PUBLISHED_AT_INVALID"
  | "CREATED_AT_INVALID"
  | "CREATED_AT_BEFORE_FETCHED_AT"
  | "ACQUISITION_METHOD_EMPTY"
  | "ACQUISITION_MODULE_VERSION_EMPTY";

export interface SearchAcquisitionValidationResult {
  readonly validation_state:
    SearchValidationState;

  readonly rejection_reasons:
    readonly SearchAcquisitionRejectionReason[];
}

/* ============================================================================
 * 4. LOW-LEVEL DETERMINISTIC HELPERS
 * ========================================================================== */

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidAbsoluteUri(
  value: string,
): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);

    return parsed.protocol.length > 1;
  } catch {
    return false;
  }
}

function isValidIsoTimestamp(
  value: string,
): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const parsedTimestamp = Date.parse(value);

  return Number.isFinite(parsedTimestamp);
}

function getRawContentByteLength(
  rawContent: string | Uint8Array,
): number {
  if (typeof rawContent === "string") {
    return Buffer.byteLength(
      rawContent,
      "utf8",
    );
  }

  return rawContent.byteLength;
}

function cloneRawContent(
  rawContent: string | Uint8Array,
): string | Uint8Array {
  if (typeof rawContent === "string") {
    return rawContent;
  }

  return new Uint8Array(rawContent);
}

function canonicalizeSourceMetadata(
  sourceMetadata:
    | Readonly<
        Record<string, string | number | boolean>
      >
    | undefined,
): Readonly<
  Record<string, string | number | boolean>
> {
  if (!sourceMetadata) {
    return Object.freeze({});
  }

  const sortedEntries =
    Object.entries(sourceMetadata).sort(
      ([leftKey], [rightKey]) =>
        leftKey.localeCompare(rightKey),
    );

  return Object.freeze(
    Object.fromEntries(sortedEntries),
  );
}

/**
 * Defensive immutable transport of source publication evidence.
 *
 * No availability state is created here.
 * No timestamp is inferred here.
 * No timestamp is normalized here.
 * No relationship with fetched_at is interpreted here.
 */
function cloneSourcePublishedAtEvidence(
  evidence:
    SearchOptionalEvidence<SearchIsoTimestamp>,
): SearchOptionalEvidence<SearchIsoTimestamp> {
  if (
    evidence.availability_state === "AVAILABLE"
  ) {
    return Object.freeze({
      availability_state:
        "AVAILABLE",
      value:
        evidence.value,
    });
  }

  return Object.freeze({
    availability_state:
      evidence.availability_state,
    reason:
      evidence.reason,
  });
}

function computeSha256Hex(
  chunks: readonly (string | Uint8Array)[],
): string {
  const hash = createHash("sha256");

  for (const chunk of chunks) {
    hash.update(chunk);
  }

  const digest = hash.digest("hex");

  if (
    digest.length !== SHA_256_HEX_LENGTH
  ) {
    throw new Error(
      "XYVALA_SEARCH_ACQUISITION_HASH_LENGTH_INVARIANT_VIOLATION",
    );
  }

  return digest;
}

/* ============================================================================
 * 5. CANONICAL HASHING
 * ----------------------------------------------------------------------------
 * content_hash represents the exact raw payload.
 *
 * It must not include:
 * - source URI
 * - fetched_at
 * - source_published_at
 * - created_at
 * - acquisition method
 * - mutable metadata
 *
 * This allows identical raw content to be detected across different sources.
 * ========================================================================== */

export function computeSearchRawContentHash(
  rawContent: string | Uint8Array,
): string {
  if (typeof rawContent === "string") {
    return computeSha256Hex([
      "XYVALA_SEARCH_RAW_CONTENT_STRING_V1\0",
      rawContent,
    ]);
  }

  return computeSha256Hex([
    "XYVALA_SEARCH_RAW_CONTENT_BINARY_V1\0",
    rawContent,
  ]);
}

/* ============================================================================
 * 6. CANONICAL DOCUMENT IDENTITY
 * ----------------------------------------------------------------------------
 * document_id represents a source-specific document observation identity.
 *
 * It includes:
 * - source URI
 * - source type
 * - MIME type
 * - content hash
 *
 * It excludes:
 * - fetched_at
 * - source_published_at
 * - created_at
 *
 * Therefore the same source and same content retain a stable identity across
 * deterministic reprocessing.
 * ========================================================================== */

export function computeSearchDocumentId(
  input: {
    readonly source_uri:
      SearchUri;

    readonly source_type:
      SearchSourceType;

    readonly mime_type:
      SearchMimeType;

    readonly content_hash:
      string;
  },
): string {
  const identityHash = computeSha256Hex([
    "XYVALA_SEARCH_DOCUMENT_IDENTITY_V1\n",
    `source_uri:${input.source_uri}\n`,
    `source_type:${input.source_type}\n`,
    `mime_type:${input.mime_type}\n`,
    `content_hash:${input.content_hash}\n`,
  ]);

  return `${SEARCH_DOCUMENT_ID_PREFIX}_${identityHash}`;
}

/* ============================================================================
 * 7. ACQUISITION INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Validation qualifies input.
 *
 * It never repairs or rewrites input silently.
 *
 * source_published_at:
 * - AVAILABLE + valid timestamp -> accepted as source evidence;
 * - AVAILABLE + invalid timestamp -> acquisition input rejected;
 * - non-AVAILABLE -> preserved as explicit absence.
 *
 * Acquisition does NOT determine whether a valid source publication timestamp
 * is temporally plausible relative to an analytical reference clock.
 *
 * Future-date semantics belong to Temporal.
 * ========================================================================== */

export function validateSearchAcquisitionInput(
  input:
    SearchAcquisitionInput,
): SearchAcquisitionValidationResult {
  const rejectionReasons:
    SearchAcquisitionRejectionReason[] = [];

  if (
    !isNonEmptyString(input.source_uri)
  ) {
    rejectionReasons.push(
      "SOURCE_URI_EMPTY",
    );
  } else if (
    !isValidAbsoluteUri(input.source_uri)
  ) {
    rejectionReasons.push(
      "SOURCE_URI_INVALID",
    );
  }

  if (
    !ALLOWED_SOURCE_TYPES.has(
      input.source_type,
    )
  ) {
    rejectionReasons.push(
      "SOURCE_TYPE_INVALID",
    );
  }

  if (
    !isNonEmptyString(input.mime_type)
  ) {
    rejectionReasons.push(
      "MIME_TYPE_EMPTY",
    );
  }

  if (
    getRawContentByteLength(
      input.raw_content,
    ) === 0
  ) {
    rejectionReasons.push(
      "RAW_CONTENT_EMPTY",
    );
  }

  const fetchedAtValid =
    isValidIsoTimestamp(
      input.fetched_at,
    );

  const createdAtValid =
    isValidIsoTimestamp(
      input.created_at,
    );

  if (!fetchedAtValid) {
    rejectionReasons.push(
      "FETCHED_AT_INVALID",
    );
  }

  if (
    input.source_published_at
      .availability_state ===
      "AVAILABLE" &&
    !isValidIsoTimestamp(
      input.source_published_at.value,
    )
  ) {
    rejectionReasons.push(
      "SOURCE_PUBLISHED_AT_INVALID",
    );
  }

  if (!createdAtValid) {
    rejectionReasons.push(
      "CREATED_AT_INVALID",
    );
  }

  if (
    fetchedAtValid &&
    createdAtValid &&
    Date.parse(input.created_at) <
      Date.parse(input.fetched_at)
  ) {
    rejectionReasons.push(
      "CREATED_AT_BEFORE_FETCHED_AT",
    );
  }

  const acquisitionMethod =
    input.acquisition_method ??
    XYVALA_SEARCH_ACQUISITION_METHOD;

  if (
    !isNonEmptyString(
      acquisitionMethod,
    )
  ) {
    rejectionReasons.push(
      "ACQUISITION_METHOD_EMPTY",
    );
  }

  const acquisitionModuleVersion =
    input.acquisition_module_version ??
    XYVALA_SEARCH_ACQUISITION_MODULE_VERSION;

  if (
    !isNonEmptyString(
      acquisitionModuleVersion,
    )
  ) {
    rejectionReasons.push(
      "ACQUISITION_MODULE_VERSION_EMPTY",
    );
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.length === 0
        ? "VALID"
        : "REJECTED",

    rejection_reasons:
      Object.freeze([
        ...rejectionReasons,
      ]),
  });
}

/* ============================================================================
 * 8. CANONICAL RAW DOCUMENT BUILDER
 * ----------------------------------------------------------------------------
 * This is the canonical producer of SearchRawDocument.
 *
 * Authorized acquisition adapters must:
 *
 * 1. obtain the external payload;
 * 2. obtain or explicitly qualify source publication evidence;
 * 3. construct SearchAcquisitionInput;
 * 4. call buildSearchRawDocument().
 *
 * They must not rebuild SearchRawDocument locally.
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * Acquisition owns:
 * - document_id
 * - content_hash
 * - validation_state
 * - rejection_reasons
 *
 * Acquisition receives and transports:
 * - source_published_at
 *
 * Acquisition must never:
 * - infer source_published_at from fetched_at;
 * - calculate published_at;
 * - calculate publication_age_ms;
 * - apply Financial News 24H / 7D policy.
 * ========================================================================== */

export function buildSearchRawDocument(
  input:
    SearchAcquisitionInput,
): SearchRawDocument {
  const validation =
    validateSearchAcquisitionInput(input);

  const contentHash =
    computeSearchRawContentHash(
      input.raw_content,
    );

  const documentId =
    computeSearchDocumentId({
      source_uri:
        input.source_uri,

      source_type:
        input.source_type,

      mime_type:
        input.mime_type,

      content_hash:
        contentHash,
    });

  const acquisitionMethod =
    input.acquisition_method ??
    XYVALA_SEARCH_ACQUISITION_METHOD;

  const acquisitionModuleVersion =
    input.acquisition_module_version ??
    XYVALA_SEARCH_ACQUISITION_MODULE_VERSION;

  const rawContent =
    cloneRawContent(
      input.raw_content,
    );

  const sourcePublishedAt =
    cloneSourcePublishedAtEvidence(
      input.source_published_at,
    );

  const sourceMetadata =
    canonicalizeSourceMetadata(
      input.source_metadata,
    );

  const rawDocument:
    SearchRawDocument = {
    contract_version:
      XYVALA_SEARCH_ACQUISITION_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      documentId,

    source_uri:
      input.source_uri,

    source_type:
      input.source_type,

    mime_type:
      input.mime_type,

    raw_content:
      rawContent,

    fetched_at:
      input.fetched_at,

    source_published_at:
      sourcePublishedAt,

    acquisition_method:
      acquisitionMethod,

    acquisition_module_version:
      acquisitionModuleVersion,

    source_metadata:
      sourceMetadata,

    content_hash:
      contentHash,

    validation_state:
      validation.validation_state,

    rejection_reasons:
      validation.rejection_reasons,
  };

  return Object.freeze(
    rawDocument,
  );
}

/* ============================================================================
 * 9. ACQUISITION ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * Boundary guards may use this reader to determine whether the raw document
 * can propagate to extraction.
 *
 * This reader:
 * - does not mutate;
 * - does not repair;
 * - does not reconstruct;
 * - does not throw;
 * - does not change the validation state.
 * ========================================================================== */

export function isSearchRawDocumentAccepted(
  rawDocument:
    SearchRawDocument,
): boolean {
  return (
    rawDocument.validation_state ===
      "VALID" &&
    rawDocument.rejection_reasons
      .length === 0
  );
}
