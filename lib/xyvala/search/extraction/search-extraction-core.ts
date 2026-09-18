/* ============================================================================
 * FILE: lib/xyvala/search/extraction/search-extraction-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical extraction core
 *
 * ROLE
 * - consume the canonical SearchRawDocument produced by acquisition
 * - validate the Acquisition to Extraction boundary
 * - decode supported textual raw payloads deterministically
 * - extract visible textual content according to the declared MIME type
 * - preserve document meaning while removing format-only markup
 * - produce the canonical SearchExtractedDocument contract
 *
 * CLASSIFICATION
 * - PRIVATE SEARCH ENGINE
 * - EXTRACTION
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 * - DETERMINISTIC
 *
 * PARENTS
 * - Xyvala Search official protocol
 * - Search pipeline canonical contract
 * - Search acquisition core
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Search segmentation engine
 * - Search extraction boundary validator
 * - Search private snapshot lineage
 * - Search audit and observability adapters
 *
 * DIRECTIVES
 * - consume SearchRawDocument only
 * - no network access
 * - no file-system access
 * - no database access
 * - no queue access
 * - no cache mutation
 * - no event publication
 * - no language inference
 * - no sentence segmentation
 * - no lexical tokenization
 * - no term frequency computation
 * - no anchor detection
 * - no scoring
 * - no ranking
 * - no private decision
 * - no public projection
 * - no implicit timestamp generation
 * - no silent MIME substitution
 * - no silent character encoding substitution
 * - no reconstruction of rejected acquisition data
 *
 * INPUTS
 * - canonical SearchRawDocument
 * - explicit extraction timestamp
 * - optional explicit extraction method and module version
 *
 * OUTPUTS
 * - canonical SearchExtractedDocument
 *
 * INVARIANTS
 * - identical inputs produce identical extracted text
 * - the input SearchRawDocument is never mutated
 * - extraction never changes the semantic meaning intentionally
 * - rejected acquisition input cannot become a valid extracted document
 * - unsupported binary content is explicitly rejected
 * - unavailable language detection is represented explicitly
 * - empty extracted content is never silently accepted
 * - extraction does not perform downstream analytical work
 *
 * CRITICAL DEPENDENCIES
 * - node:util
 * - search-pipeline-contract.ts
 *
 * SENSITIVE AREAS
 * - UTF-8 decoding
 * - MIME-specific extraction
 * - HTML visible-text extraction
 * - JSON deterministic traversal
 * - XML markup removal
 * - whitespace normalization
 * - acquisition boundary validation
 * ========================================================================== */

import { TextDecoder } from "node:util";

import type {
  SearchContractVersion,
  SearchExtractedDocument,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchRawDocument,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE CONSTANTS
 * ========================================================================== */

export const XYVALA_SEARCH_EXTRACTION_CONTRACT_VERSION =
  "1.0.0" satisfies SearchContractVersion;

export const XYVALA_SEARCH_EXTRACTION_MODULE_VERSION =
  "1.0.0" satisfies SearchModuleVersion;

export const XYVALA_SEARCH_EXTRACTION_METHOD =
  "CANONICAL_MIME_AWARE_TEXT_EXTRACTION_V1";

const UTF_8_ENCODING = "utf-8";

const SUPPORTED_TEXT_MIME_TYPES = new Set<string>([
  "text/plain",
  "text/html",
  "application/json",
  "application/xml",
  "text/xml",
  "text/markdown",
  "text/csv",
]);

const BLOCK_LEVEL_HTML_TAG_PATTERN =
  /<\/?(?:address|article|aside|blockquote|br|caption|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi;

const NON_VISIBLE_HTML_BLOCK_PATTERN =
  /<(script|style|noscript|template|svg|canvas)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

const GENERIC_MARKUP_TAG_PATTERN = /<[^>]+>/g;

const XML_PROCESSING_INSTRUCTION_PATTERN = /<\?[\s\S]*?\?>/g;

const XML_CDATA_PATTERN = /<!\[CDATA\[([\s\S]*?)\]\]>/g;

const WORD_ESTIMATE_PATTERN = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

/* ============================================================================
 * 2. INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * created_at must be supplied explicitly.
 *
 * The extraction core must never generate runtime time internally.
 * ========================================================================== */

export interface SearchExtractionInput {
  readonly raw_document: SearchRawDocument;
  readonly created_at: SearchIsoTimestamp;

  readonly extraction_method?: string;
  readonly extraction_module_version?: SearchModuleVersion;
}

/* ============================================================================
 * 3. EXTRACTION RESULT CONTRACT
 * ========================================================================== */

export type SearchExtractionRejectionReason =
  | "RAW_DOCUMENT_REJECTED"
  | "RAW_DOCUMENT_REJECTION_REASONS_PRESENT"
  | "SOURCE_DOCUMENT_HASH_EMPTY"
  | "SOURCE_URI_EMPTY"
  | "MIME_TYPE_EMPTY"
  | "CREATED_AT_INVALID"
  | "CREATED_AT_BEFORE_ACQUISITION"
  | "RAW_CONTENT_EMPTY"
  | "UNSUPPORTED_MIME_TYPE"
  | "UNSUPPORTED_BINARY_CONTENT"
  | "INVALID_UTF8_CONTENT"
  | "INVALID_JSON_CONTENT"
  | "EXTRACTED_TEXT_EMPTY"
  | "EXTRACTION_METHOD_EMPTY"
  | "EXTRACTION_MODULE_VERSION_EMPTY";

export type SearchExtractionDegradationReason =
  | "LANGUAGE_DETECTION_NOT_IMPLEMENTED"
  | "HTML_MARKUP_REMOVED"
  | "XML_MARKUP_REMOVED"
  | "JSON_STRUCTURE_FLATTENED"
  | "WHITESPACE_NORMALIZED";

export interface SearchExtractionValidationResult {
  readonly validation_state: SearchValidationState;
  readonly rejection_reasons: readonly SearchExtractionRejectionReason[];
}

export interface SearchTextExtractionResult {
  readonly extracted_text: string;
  readonly rejection_reasons: readonly SearchExtractionRejectionReason[];
  readonly degradation_reasons: readonly SearchExtractionDegradationReason[];
}

/* ============================================================================
 * 4. LOW-LEVEL VALIDATION HELPERS
 * ========================================================================== */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidIsoTimestamp(value: string): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

function hasRawContent(rawContent: string | Uint8Array): boolean {
  if (typeof rawContent === "string") {
    return rawContent.length > 0;
  }

  return rawContent.byteLength > 0;
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function isTextualMimeType(mimeType: string): boolean {
  const normalizedMimeType = normalizeMimeType(mimeType);

  return (
    normalizedMimeType.startsWith("text/") ||
    SUPPORTED_TEXT_MIME_TYPES.has(normalizedMimeType)
  );
}

/* ============================================================================
 * 5. UTF-8 DECODING
 * ----------------------------------------------------------------------------
 * Binary textual inputs are accepted only when they contain valid UTF-8.
 *
 * The core does not guess another encoding because implicit fallback would
 * break determinism and could alter document meaning.
 * ========================================================================== */

function decodeRawContentAsUtf8(
  rawContent: string | Uint8Array,
): {
  readonly decoded_text: string;
  readonly rejection_reason?: SearchExtractionRejectionReason;
} {
  if (typeof rawContent === "string") {
    return {
      decoded_text: rawContent,
    };
  }

  try {
    const decoder = new TextDecoder(UTF_8_ENCODING, {
      fatal: true,
      ignoreBOM: false,
    });

    return {
      decoded_text: decoder.decode(rawContent),
    };
  } catch {
    return {
      decoded_text: "",
      rejection_reason: "INVALID_UTF8_CONTENT",
    };
  }
}

/* ============================================================================
 * 6. CHARACTER ENTITY DECODING
 * ----------------------------------------------------------------------------
 * Only deterministic HTML/XML character references are decoded.
 *
 * Unknown named entities remain unchanged rather than being guessed.
 * ========================================================================== */

const NAMED_CHARACTER_ENTITIES: Readonly<Record<string, string>> =
  Object.freeze({
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    laquo: "«",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    nbsp: " ",
    quot: '"',
    raquo: "»",
    rdquo: "”",
    rsquo: "’",
  });

function decodeNumericCharacterReference(
  rawValue: string,
  radix: 10 | 16,
): string | null {
  const parsedValue = Number.parseInt(rawValue, radix);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0 ||
    parsedValue > 0x10ffff ||
    (parsedValue >= 0xd800 && parsedValue <= 0xdfff)
  ) {
    return null;
  }

  try {
    return String.fromCodePoint(parsedValue);
  } catch {
    return null;
  }
}

function decodeCharacterEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]+);/gi,
    (fullMatch: string, entityBody: string): string => {
      if (entityBody.startsWith("#x") || entityBody.startsWith("#X")) {
        return (
          decodeNumericCharacterReference(entityBody.slice(2), 16) ??
          fullMatch
        );
      }

      if (entityBody.startsWith("#")) {
        return (
          decodeNumericCharacterReference(entityBody.slice(1), 10) ??
          fullMatch
        );
      }

      return (
        NAMED_CHARACTER_ENTITIES[entityBody.toLowerCase()] ?? fullMatch
      );
    },
  );
}

/* ============================================================================
 * 7. CANONICAL WHITESPACE NORMALIZATION
 * ----------------------------------------------------------------------------
 * This normalization removes formatting noise only.
 *
 * It does not:
 * - lowercase content;
 * - remove punctuation;
 * - remove accents;
 * - tokenize;
 * - interpret sentence boundaries.
 * ========================================================================== */

function normalizeExtractedWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ============================================================================
 * 8. PLAIN-TEXT EXTRACTION
 * ========================================================================== */

function extractPlainText(decodedText: string): SearchTextExtractionResult {
  const extractedText = normalizeExtractedWhitespace(decodedText);

  return {
    extracted_text: extractedText,
    rejection_reasons:
      extractedText.length === 0
        ? Object.freeze(["EXTRACTED_TEXT_EMPTY"])
        : Object.freeze([]),
    degradation_reasons: Object.freeze(["WHITESPACE_NORMALIZED"]),
  };
}

/* ============================================================================
 * 9. HTML VISIBLE-TEXT EXTRACTION
 * ----------------------------------------------------------------------------
 * The extractor removes format-only and non-visible blocks.
 *
 * It does not execute scripts, resolve remote resources or infer structure.
 * ========================================================================== */

function extractHtmlText(decodedText: string): SearchTextExtractionResult {
  const withoutComments = decodedText.replace(HTML_COMMENT_PATTERN, " ");

  const withoutNonVisibleBlocks = withoutComments.replace(
    NON_VISIBLE_HTML_BLOCK_PATTERN,
    " ",
  );

  const withStructuralBreaks = withoutNonVisibleBlocks.replace(
    BLOCK_LEVEL_HTML_TAG_PATTERN,
    "\n",
  );

  const withoutRemainingTags = withStructuralBreaks.replace(
    GENERIC_MARKUP_TAG_PATTERN,
    " ",
  );

  const decodedEntities = decodeCharacterEntities(withoutRemainingTags);

  const extractedText = normalizeExtractedWhitespace(decodedEntities);

  return {
    extracted_text: extractedText,
    rejection_reasons:
      extractedText.length === 0
        ? Object.freeze(["EXTRACTED_TEXT_EMPTY"])
        : Object.freeze([]),
    degradation_reasons: Object.freeze([
      "HTML_MARKUP_REMOVED",
      "WHITESPACE_NORMALIZED",
    ]),
  };
}

/* ============================================================================
 * 10. XML TEXT EXTRACTION
 * ========================================================================== */

function extractXmlText(decodedText: string): SearchTextExtractionResult {
  const withoutProcessingInstructions = decodedText.replace(
    XML_PROCESSING_INSTRUCTION_PATTERN,
    " ",
  );

  const withCdataContent = withoutProcessingInstructions.replace(
    XML_CDATA_PATTERN,
    (_fullMatch: string, cdataContent: string): string => cdataContent,
  );

  const withoutComments = withCdataContent.replace(
    HTML_COMMENT_PATTERN,
    " ",
  );

  const withoutMarkup = withoutComments.replace(
    GENERIC_MARKUP_TAG_PATTERN,
    "\n",
  );

  const decodedEntities = decodeCharacterEntities(withoutMarkup);

  const extractedText = normalizeExtractedWhitespace(decodedEntities);

  return {
    extracted_text: extractedText,
    rejection_reasons:
      extractedText.length === 0
        ? Object.freeze(["EXTRACTED_TEXT_EMPTY"])
        : Object.freeze([]),
    degradation_reasons: Object.freeze([
      "XML_MARKUP_REMOVED",
      "WHITESPACE_NORMALIZED",
    ]),
  };
}

/* ============================================================================
 * 11. JSON TEXT EXTRACTION
 * ----------------------------------------------------------------------------
 * JSON extraction walks the parsed structure deterministically.
 *
 * Object keys and primitive values are retained because both can carry
 * document meaning in API resources.
 *
 * The original JSON structure is not treated as lexical truth downstream.
 * ========================================================================== */

function collectJsonTextFragments(
  value: unknown,
  output: string[],
): void {
  if (typeof value === "string") {
    if (value.trim().length > 0) {
      output.push(value);
    }

    return;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    output.push(String(value));
    return;
  }

  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonTextFragments(item, output);
    }

    return;
  }

  if (typeof value === "object") {
    for (const [key, childValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (key.trim().length > 0) {
        output.push(key);
      }

      collectJsonTextFragments(childValue, output);
    }
  }
}

function extractJsonText(decodedText: string): SearchTextExtractionResult {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(decodedText) as unknown;
  } catch {
    return {
      extracted_text: "",
      rejection_reasons: Object.freeze(["INVALID_JSON_CONTENT"]),
      degradation_reasons: Object.freeze([]),
    };
  }

  const fragments: string[] = [];

  collectJsonTextFragments(parsedValue, fragments);

  const extractedText = normalizeExtractedWhitespace(
    fragments.join("\n"),
  );

  return {
    extracted_text: extractedText,
    rejection_reasons:
      extractedText.length === 0
        ? Object.freeze(["EXTRACTED_TEXT_EMPTY"])
        : Object.freeze([]),
    degradation_reasons: Object.freeze([
      "JSON_STRUCTURE_FLATTENED",
      "WHITESPACE_NORMALIZED",
    ]),
  };
}

/* ============================================================================
 * 12. MIME-AWARE EXTRACTION ROUTER
 * ----------------------------------------------------------------------------
 * MIME type is authoritative.
 *
 * The router must not guess another document type from content.
 * ========================================================================== */

export function extractSearchTextFromRawDocument(
  rawDocument: SearchRawDocument,
): SearchTextExtractionResult {
  if (!hasRawContent(rawDocument.raw_content)) {
    return {
      extracted_text: "",
      rejection_reasons: Object.freeze(["RAW_CONTENT_EMPTY"]),
      degradation_reasons: Object.freeze([]),
    };
  }

  const normalizedMimeType = normalizeMimeType(rawDocument.mime_type);

  if (!isTextualMimeType(normalizedMimeType)) {
    return {
      extracted_text: "",
      rejection_reasons: Object.freeze([
        normalizedMimeType === "application/octet-stream" ||
        normalizedMimeType === "application/pdf"
          ? "UNSUPPORTED_BINARY_CONTENT"
          : "UNSUPPORTED_MIME_TYPE",
      ]),
      degradation_reasons: Object.freeze([]),
    };
  }

  const decodingResult = decodeRawContentAsUtf8(rawDocument.raw_content);

  if (decodingResult.rejection_reason) {
    return {
      extracted_text: "",
      rejection_reasons: Object.freeze([
        decodingResult.rejection_reason,
      ]),
      degradation_reasons: Object.freeze([]),
    };
  }

  switch (normalizedMimeType) {
    case "text/html":
      return extractHtmlText(decodingResult.decoded_text);

    case "application/json":
      return extractJsonText(decodingResult.decoded_text);

    case "application/xml":
    case "text/xml":
      return extractXmlText(decodingResult.decoded_text);

    default:
      return extractPlainText(decodingResult.decoded_text);
  }
}

/* ============================================================================
 * 13. EXTRACTION INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Boundary validation qualifies the input.
 *
 * It never repairs a rejected SearchRawDocument.
 * ========================================================================== */

export function validateSearchExtractionInput(
  input: SearchExtractionInput,
): SearchExtractionValidationResult {
  const rejectionReasons: SearchExtractionRejectionReason[] = [];
  const rawDocument = input.raw_document;

  if (rawDocument.validation_state !== "VALID") {
    rejectionReasons.push("RAW_DOCUMENT_REJECTED");
  }

  if (rawDocument.rejection_reasons.length > 0) {
    rejectionReasons.push("RAW_DOCUMENT_REJECTION_REASONS_PRESENT");
  }

  if (!isNonEmptyString(rawDocument.content_hash)) {
    rejectionReasons.push("SOURCE_DOCUMENT_HASH_EMPTY");
  }

  if (!isNonEmptyString(rawDocument.source_uri)) {
    rejectionReasons.push("SOURCE_URI_EMPTY");
  }

  if (!isNonEmptyString(rawDocument.mime_type)) {
    rejectionReasons.push("MIME_TYPE_EMPTY");
  }

  if (!hasRawContent(rawDocument.raw_content)) {
    rejectionReasons.push("RAW_CONTENT_EMPTY");
  }

  const createdAtValid = isValidIsoTimestamp(input.created_at);
  const fetchedAtValid = isValidIsoTimestamp(rawDocument.fetched_at);

  if (!createdAtValid) {
    rejectionReasons.push("CREATED_AT_INVALID");
  }

  if (
    createdAtValid &&
    fetchedAtValid &&
    Date.parse(input.created_at) < Date.parse(rawDocument.fetched_at)
  ) {
    rejectionReasons.push("CREATED_AT_BEFORE_ACQUISITION");
  }

  const extractionMethod =
    input.extraction_method ?? XYVALA_SEARCH_EXTRACTION_METHOD;

  if (!isNonEmptyString(extractionMethod)) {
    rejectionReasons.push("EXTRACTION_METHOD_EMPTY");
  }

  const extractionModuleVersion =
    input.extraction_module_version ??
    XYVALA_SEARCH_EXTRACTION_MODULE_VERSION;

  if (!isNonEmptyString(extractionModuleVersion)) {
    rejectionReasons.push("EXTRACTION_MODULE_VERSION_EMPTY");
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.length === 0 ? "VALID" : "REJECTED",
    rejection_reasons: Object.freeze([...rejectionReasons]),
  });
}

/* ============================================================================
 * 14. DOCUMENT STATISTICS
 * ----------------------------------------------------------------------------
 * Word estimate is descriptive acquisition metadata only.
 *
 * It is not the canonical token count.
 * Canonical tokenization belongs exclusively to Lexical Analysis.
 * ========================================================================== */

function estimateExtractedWordCount(extractedText: string): number {
  return extractedText.match(WORD_ESTIMATE_PATTERN)?.length ?? 0;
}

/* ============================================================================
 * 15. LANGUAGE AVAILABILITY
 * ----------------------------------------------------------------------------
 * Language detection is intentionally not implemented in extraction V1.
 *
 * A future dedicated detector may become the unique producer of language
 * truth. Until then, the state remains explicit.
 * ========================================================================== */

function buildUnavailableLanguageEvidence(): SearchOptionalEvidence<string> {
  return Object.freeze({
    availability_state: "UNAVAILABLE",
    reason:
      "Language detection is not implemented by the canonical extraction core.",
  });
}

/* ============================================================================
 * 16. CANONICAL EXTRACTED DOCUMENT BUILDER
 * ----------------------------------------------------------------------------
 * This is the canonical producer of SearchExtractedDocument.
 *
 * The builder always returns an auditable contract.
 * Rejected input produces an explicitly rejected contract rather than a
 * fabricated successful extraction.
 * ========================================================================== */

export function buildSearchExtractedDocument(
  input: SearchExtractionInput,
): SearchExtractedDocument {
  const boundaryValidation = validateSearchExtractionInput(input);

  const extractionMethod =
    input.extraction_method ?? XYVALA_SEARCH_EXTRACTION_METHOD;

  const extractionModuleVersion =
    input.extraction_module_version ??
    XYVALA_SEARCH_EXTRACTION_MODULE_VERSION;

  if (boundaryValidation.validation_state === "REJECTED") {
    const rejectedDocument: SearchExtractedDocument = {
      contract_version: XYVALA_SEARCH_EXTRACTION_CONTRACT_VERSION,
      created_at: input.created_at,

      document_id: input.raw_document.document_id,

      source_document_hash: input.raw_document.content_hash,
      source_uri: input.raw_document.source_uri,
      source_type: input.raw_document.source_type,

      extracted_text: "",
      detected_language: buildUnavailableLanguageEvidence(),

      extraction_method: extractionMethod,
      extraction_module_version: extractionModuleVersion,

      extracted_character_count: 0,
      extracted_word_estimate: 0,

      validation_state: "REJECTED",
      degradation_reasons: Object.freeze([
        ...boundaryValidation.rejection_reasons,
        "LANGUAGE_DETECTION_NOT_IMPLEMENTED",
      ]),
    };

    return Object.freeze(rejectedDocument);
  }

  const extractionResult = extractSearchTextFromRawDocument(
    input.raw_document,
  );

  const validationState: SearchValidationState =
    extractionResult.rejection_reasons.length > 0
      ? "REJECTED"
      : extractionResult.degradation_reasons.length > 0
        ? "DEGRADED"
        : "VALID";

  const extractedDocument: SearchExtractedDocument = {
    contract_version: XYVALA_SEARCH_EXTRACTION_CONTRACT_VERSION,
    created_at: input.created_at,

    document_id: input.raw_document.document_id,

    source_document_hash: input.raw_document.content_hash,
    source_uri: input.raw_document.source_uri,
    source_type: input.raw_document.source_type,

    extracted_text: extractionResult.extracted_text,
    detected_language: buildUnavailableLanguageEvidence(),

    extraction_method: extractionMethod,
    extraction_module_version: extractionModuleVersion,

    extracted_character_count: extractionResult.extracted_text.length,
    extracted_word_estimate: estimateExtractedWordCount(
      extractionResult.extracted_text,
    ),

    validation_state: validationState,
    degradation_reasons: Object.freeze([
      ...extractionResult.rejection_reasons,
      ...extractionResult.degradation_reasons,
      "LANGUAGE_DETECTION_NOT_IMPLEMENTED",
    ]),
  };

  return Object.freeze(extractedDocument);
}

/* ============================================================================
 * 17. EXTRACTION ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * This pure reader determines whether the document may cross the
 * Extraction to Segmentation boundary.
 *
 * DEGRADED is accepted because degradation is explicit and does not imply
 * invalid extracted text.
 * ========================================================================== */

export function isSearchExtractedDocumentAccepted(
  extractedDocument: SearchExtractedDocument,
): boolean {
  return (
    (extractedDocument.validation_state === "VALID" ||
      extractedDocument.validation_state === "DEGRADED") &&
    extractedDocument.extracted_text.length > 0 &&
    extractedDocument.extracted_character_count > 0
  );
}
