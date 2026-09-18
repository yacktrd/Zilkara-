/* ============================================================================
 * FILE: lib/xyvala/search/segmentation/search-segmentation-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical segmentation core
 *
 * ROLE
 * - consume the canonical SearchExtractedDocument
 * - validate the Extraction to Segmentation boundary
 * - segment canonical extracted text into stable addressable sentences
 * - preserve exact source offsets and document ordering
 * - qualify basic structural roles without lexical interpretation
 * - produce the canonical SearchSegmentedDocument contract
 *
 * CLASSIFICATION
 * - PRIVATE SEARCH ENGINE
 * - SEGMENTATION
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 * - DETERMINISTIC
 *
 * PARENTS
 * - Xyvala Search official protocol
 * - Search pipeline canonical contract
 * - Search extraction core
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Search lexical analysis engine
 * - Search segmentation boundary validator
 * - Search private snapshot lineage
 * - Search audit and observability adapters
 *
 * DIRECTIVES
 * - consume SearchExtractedDocument only
 * - preserve extracted text meaning
 * - preserve exact source offsets
 * - preserve original sentence order
 * - produce stable deterministic sentence identifiers
 * - no network access
 * - no file-system access
 * - no database access
 * - no queue access
 * - no cache mutation
 * - no event publication
 * - no tokenization
 * - no stopword removal
 * - no lemmatization
 * - no term counting
 * - no frequency detection
 * - no rare-term detection
 * - no anchor detection
 * - no query analysis
 * - no scoring
 * - no aggregation
 * - no ranking
 * - no private decision
 * - no public projection
 * - no implicit timestamp generation
 * - no silent correction of rejected extraction data
 *
 * INPUTS
 * - canonical SearchExtractedDocument
 * - explicit segmentation timestamp
 * - optional explicit segmentation method and module version
 *
 * OUTPUTS
 * - canonical SearchSegmentedDocument
 *
 * INVARIANTS
 * - identical inputs produce identical sentence boundaries
 * - identical inputs produce identical sentence identifiers
 * - every sentence identifier is unique within the document
 * - sentence offsets refer to the canonical extracted text
 * - sentence order follows source order
 * - no sentence overlaps another sentence
 * - the input contract is never mutated
 * - rejected extraction input never becomes valid segmentation
 * - empty units are never emitted
 * - this module performs no downstream analytical interpretation
 *
 * CRITICAL DEPENDENCIES
 * - node:crypto
 * - search-pipeline-contract.ts
 *
 * SENSITIVE AREAS
 * - sentence boundary resolution
 * - abbreviations
 * - decimal numbers
 * - ellipses
 * - quotations and closing punctuation
 * - list-item recognition
 * - heading recognition
 * - source offset integrity
 * - stable sentence identity
 * ========================================================================== */

import { createHash } from "node:crypto";

import type {
  SearchContractVersion,
  SearchExtractedDocument,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchSegmentedDocument,
  SearchSentence,
  SearchSentenceId,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE CONSTANTS
 * ========================================================================== */

export const XYVALA_SEARCH_SEGMENTATION_CONTRACT_VERSION =
  "1.0.0" satisfies SearchContractVersion;

export const XYVALA_SEARCH_SEGMENTATION_MODULE_VERSION =
  "1.0.0" satisfies SearchModuleVersion;

export const XYVALA_SEARCH_SEGMENTATION_METHOD =
  "CANONICAL_STRUCTURAL_SENTENCE_SEGMENTATION_V1";

const SEARCH_SENTENCE_ID_PREFIX = "xys_sentence";
const SHA_256_HEX_LENGTH = 64;

const MAX_HEADING_CHARACTER_COUNT = 160;
const MAX_HEADING_WORD_ESTIMATE = 18;

const SENTENCE_TERMINATORS = new Set([".", "!", "?", "…"]);

const CLOSING_SENTENCE_CHARACTERS = new Set([
  '"',
  "'",
  "»",
  "”",
  "’",
  ")",
  "]",
  "}",
]);

const COMMON_ABBREVIATIONS = new Set([
  "av.",
  "apr.",
  "art.",
  "cf.",
  "chap.",
  "dr.",
  "dre.",
  "etc.",
  "ex.",
  "fig.",
  "janv.",
  "févr.",
  "fevr.",
  "mars.",
  "avr.",
  "juin.",
  "juil.",
  "août.",
  "aout.",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
  "dec.",
  "m.",
  "mme.",
  "mlle.",
  "mes.",
  "n°.",
  "no.",
  "p.",
  "pp.",
  "prof.",
  "réf.",
  "ref.",
  "st.",
  "ste.",
  "vol.",
  "env.",
  "max.",
  "min.",
  "dept.",
  "éd.",
  "ed.",
  "i.e.",
  "e.g.",
  "vs.",
]);

const LIST_ITEM_PREFIX_PATTERN =
  /^(?:[-*•▪◦‣⁃]\s+|\d{1,4}[.)]\s+|[A-Za-zÀ-ÖØ-öø-ÿ][.)]\s+)/u;

const MARKDOWN_HEADING_PREFIX_PATTERN = /^#{1,6}\s+/u;

const WORD_ESTIMATE_PATTERN =
  /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

/* ============================================================================
 * 2. INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * created_at must be supplied by the caller.
 *
 * The core must never call:
 * - Date.now()
 * - new Date()
 * - Math.random()
 * - crypto.randomUUID()
 * ========================================================================== */

export interface SearchSegmentationInput {
  readonly extracted_document: SearchExtractedDocument;
  readonly created_at: SearchIsoTimestamp;

  readonly segmentation_method?: string;
  readonly segmentation_module_version?: SearchModuleVersion;
}

/* ============================================================================
 * 3. VALIDATION AND DEGRADATION CONTRACTS
 * ========================================================================== */

export type SearchSegmentationRejectionReason =
  | "EXTRACTED_DOCUMENT_REJECTED"
  | "EXTRACTED_TEXT_EMPTY"
  | "DOCUMENT_ID_EMPTY"
  | "SOURCE_DOCUMENT_HASH_EMPTY"
  | "CREATED_AT_INVALID"
  | "CREATED_AT_BEFORE_EXTRACTION"
  | "SEGMENTATION_METHOD_EMPTY"
  | "SEGMENTATION_MODULE_VERSION_EMPTY"
  | "NO_SEGMENTS_PRODUCED"
  | "SEGMENT_OFFSETS_INVALID"
  | "SEGMENT_OFFSETS_OVERLAP"
  | "DUPLICATE_SENTENCE_ID";

export type SearchSegmentationDegradationReason =
  | "UPSTREAM_EXTRACTION_DEGRADED"
  | "AMBIGUOUS_ABBREVIATION_BOUNDARY_PRESERVED"
  | "STRUCTURAL_ROLE_INFERRED"
  | "LONG_UNTERMINATED_TEXT_UNIT"
  | "EMPTY_LINES_IGNORED";

export interface SearchSegmentationValidationResult {
  readonly validation_state: SearchValidationState;
  readonly rejection_reasons: readonly SearchSegmentationRejectionReason[];
}

interface SearchMutableSentenceCandidate {
  readonly text: string;
  readonly start_offset: number;
  readonly end_offset: number;
  readonly structural_role: SearchSentence["structural_role"];
}

interface SearchLineBlock {
  readonly text: string;
  readonly start_offset: number;
  readonly end_offset: number;
  readonly structural_role: SearchSentence["structural_role"];
}

/* ============================================================================
 * 4. LOW-LEVEL DETERMINISTIC HELPERS
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

function computeSha256Hex(chunks: readonly string[]): string {
  const hash = createHash("sha256");

  for (const chunk of chunks) {
    hash.update(chunk, "utf8");
  }

  const digest = hash.digest("hex");

  if (digest.length !== SHA_256_HEX_LENGTH) {
    throw new Error(
      "XYVALA_SEARCH_SEGMENTATION_HASH_LENGTH_INVARIANT_VIOLATION",
    );
  }

  return digest;
}

function estimateWordCount(value: string): number {
  return value.match(WORD_ESTIMATE_PATTERN)?.length ?? 0;
}

function isWhitespace(character: string | undefined): boolean {
  return character !== undefined && /\s/u.test(character);
}

function isLetter(character: string | undefined): boolean {
  return character !== undefined && /\p{L}/u.test(character);
}

function isLowercaseLetter(character: string | undefined): boolean {
  if (typeof character !== "string") {
    return false;
  }

  if (!/\p{L}/u.test(character)) {
    return false;
  }

  return character === character.toLocaleLowerCase();
}

function isDigit(character: string | undefined): boolean {
  return character !== undefined && /\p{N}/u.test(character);
}

function findPreviousNonWhitespaceIndex(
  value: string,
  fromIndex: number,
): number | null {
  for (let index = fromIndex; index >= 0; index -= 1) {
    if (!isWhitespace(value[index])) {
      return index;
    }
  }

  return null;
}

function findNextNonWhitespaceIndex(
  value: string,
  fromIndex: number,
): number | null {
  for (let index = fromIndex; index < value.length; index += 1) {
    if (!isWhitespace(value[index])) {
      return index;
    }
  }

  return null;
}

function trimCandidateOffsets(input: {
  readonly source_text: string;
  readonly start_offset: number;
  readonly end_offset: number;
}): {
  readonly text: string;
  readonly start_offset: number;
  readonly end_offset: number;
} | null {
  let adjustedStart = input.start_offset;
  let adjustedEnd = input.end_offset;

  while (
    adjustedStart < adjustedEnd &&
    isWhitespace(input.source_text[adjustedStart])
  ) {
    adjustedStart += 1;
  }

  while (
    adjustedEnd > adjustedStart &&
    isWhitespace(input.source_text[adjustedEnd - 1])
  ) {
    adjustedEnd -= 1;
  }

  if (adjustedStart >= adjustedEnd) {
    return null;
  }

  return {
    text: input.source_text.slice(adjustedStart, adjustedEnd),
    start_offset: adjustedStart,
    end_offset: adjustedEnd,
  };
}

/* ============================================================================
 * 5. STRUCTURAL ROLE CLASSIFICATION
 * ----------------------------------------------------------------------------
 * Structural classification is intentionally shallow.
 *
 * It does not infer:
 * - semantic importance;
 * - document quality;
 * - query relevance;
 * - anchor strength.
 * ========================================================================== */

function classifyLineStructuralRole(
  trimmedLine: string,
): SearchSentence["structural_role"] {
  if (LIST_ITEM_PREFIX_PATTERN.test(trimmedLine)) {
    return "LIST_ITEM";
  }

  if (MARKDOWN_HEADING_PREFIX_PATTERN.test(trimmedLine)) {
    return "HEADING";
  }

  const wordCount = estimateWordCount(trimmedLine);
  const finalCharacter = trimmedLine.at(-1);

  const containsTerminalPunctuation =
    finalCharacter !== undefined &&
    SENTENCE_TERMINATORS.has(finalCharacter);

  const looksLikeUppercaseHeading =
    trimmedLine.length <= MAX_HEADING_CHARACTER_COUNT &&
    wordCount > 0 &&
    wordCount <= MAX_HEADING_WORD_ESTIMATE &&
    trimmedLine === trimmedLine.toLocaleUpperCase() &&
    /[\p{L}]/u.test(trimmedLine);

  const looksLikeShortHeading =
    trimmedLine.length <= MAX_HEADING_CHARACTER_COUNT &&
    wordCount > 0 &&
    wordCount <= MAX_HEADING_WORD_ESTIMATE &&
    !containsTerminalPunctuation &&
    !trimmedLine.includes(";") &&
    !trimmedLine.includes(",");

  if (looksLikeUppercaseHeading || looksLikeShortHeading) {
    return "HEADING";
  }

  return "PARAGRAPH";
}

/* ============================================================================
 * 6. LINE BLOCK EXTRACTION
 * ----------------------------------------------------------------------------
 * Line boundaries are structural hints only.
 *
 * Exact offsets remain tied to SearchExtractedDocument.extracted_text.
 * ========================================================================== */

function buildLineBlocks(
  extractedText: string,
): {
  readonly blocks: readonly SearchLineBlock[];
  readonly empty_lines_ignored: boolean;
} {
  const blocks: SearchLineBlock[] = [];

  let lineStart = 0;
  let emptyLinesIgnored = false;

  for (
    let currentIndex = 0;
    currentIndex <= extractedText.length;
    currentIndex += 1
  ) {
    const isEndOfText = currentIndex === extractedText.length;
    const isLineBreak = extractedText[currentIndex] === "\n";

    if (!isEndOfText && !isLineBreak) {
      continue;
    }

    const trimmed = trimCandidateOffsets({
      source_text: extractedText,
      start_offset: lineStart,
      end_offset: currentIndex,
    });

    if (trimmed) {
      blocks.push({
        text: trimmed.text,
        start_offset: trimmed.start_offset,
        end_offset: trimmed.end_offset,
        structural_role: classifyLineStructuralRole(trimmed.text),
      });
    } else if (currentIndex > lineStart) {
      emptyLinesIgnored = true;
    }

    lineStart = currentIndex + 1;
  }

  return {
    blocks: Object.freeze(blocks),
    empty_lines_ignored: emptyLinesIgnored,
  };
}

/* ============================================================================
 * 7. PERIOD AND ABBREVIATION ANALYSIS
 * ========================================================================== */

function getTokenEndingAtPeriod(
  value: string,
  periodIndex: number,
): string {
  let tokenStart = periodIndex;

  while (tokenStart > 0) {
    const previousCharacter = value[tokenStart - 1];

    if (
      previousCharacter === undefined ||
      isWhitespace(previousCharacter) ||
      ["(", "[", "{", '"', "'", "«", "“"].includes(previousCharacter)
    ) {
      break;
    }

    tokenStart -= 1;
  }

  return value.slice(tokenStart, periodIndex + 1).toLocaleLowerCase();
}

function isDecimalPeriod(value: string, periodIndex: number): boolean {
  return (
    isDigit(value[periodIndex - 1]) &&
    isDigit(value[periodIndex + 1])
  );
}

function isEllipsisPeriod(value: string, periodIndex: number): boolean {
  return (
    value[periodIndex - 1] === "." ||
    value[periodIndex + 1] === "."
  );
}

function isInitialPeriod(value: string, periodIndex: number): boolean {
  const previousIndex = findPreviousNonWhitespaceIndex(
    value,
    periodIndex - 1,
  );

  if (previousIndex === null || !isLetter(value[previousIndex])) {
    return false;
  }

  const token = getTokenEndingAtPeriod(value, periodIndex);

  return /^\p{L}\.$/u.test(token);
}

function isKnownAbbreviation(value: string, periodIndex: number): boolean {
  const token = getTokenEndingAtPeriod(value, periodIndex);

  return COMMON_ABBREVIATIONS.has(token);
}

function shouldPeriodCloseSentence(
  value: string,
  periodIndex: number,
): {
  readonly closes_sentence: boolean;
  readonly abbreviation_preserved: boolean;
} {
  if (isDecimalPeriod(value, periodIndex)) {
    return {
      closes_sentence: false,
      abbreviation_preserved: false,
    };
  }

  if (isEllipsisPeriod(value, periodIndex)) {
    const finalEllipsisPeriod =
      value[periodIndex - 1] === "." &&
      value[periodIndex - 2] === "." &&
      value[periodIndex + 1] !== ".";

    return {
      closes_sentence: finalEllipsisPeriod,
      abbreviation_preserved: false,
    };
  }

  const knownAbbreviation = isKnownAbbreviation(value, periodIndex);
  const initialPeriod = isInitialPeriod(value, periodIndex);

  if (knownAbbreviation || initialPeriod) {
    const nextNonWhitespaceIndex = findNextNonWhitespaceIndex(
      value,
      periodIndex + 1,
    );

    if (nextNonWhitespaceIndex === null) {
      return {
        closes_sentence: true,
        abbreviation_preserved: false,
      };
    }

    const nextCharacter = value[nextNonWhitespaceIndex];

    if (
      isLowercaseLetter(nextCharacter) ||
      isDigit(nextCharacter) ||
      nextCharacter === "," ||
      nextCharacter === ";" ||
      nextCharacter === ":"
    ) {
      return {
        closes_sentence: false,
        abbreviation_preserved: true,
      };
    }

    return {
      closes_sentence: false,
      abbreviation_preserved: true,
    };
  }

  const nextNonWhitespaceIndex = findNextNonWhitespaceIndex(
    value,
    periodIndex + 1,
  );

  if (nextNonWhitespaceIndex === null) {
    return {
      closes_sentence: true,
      abbreviation_preserved: false,
    };
  }

  const nextCharacter = value[nextNonWhitespaceIndex];

  if (isLowercaseLetter(nextCharacter)) {
    return {
      closes_sentence: false,
      abbreviation_preserved: true,
    };
  }

  return {
    closes_sentence: true,
    abbreviation_preserved: false,
  };
}

/* ============================================================================
 * 8. SENTENCE BOUNDARY RESOLUTION
 * ========================================================================== */

function resolveBoundaryEndOffset(
  blockText: string,
  terminatorIndex: number,
): number {
  let endOffset = terminatorIndex + 1;

  while (endOffset < blockText.length) {
    const nextCharacter = blockText[endOffset];

    if (
      nextCharacter === undefined ||
      !CLOSING_SENTENCE_CHARACTERS.has(nextCharacter)
    ) {
      break;
    }

    endOffset += 1;
  }

  return endOffset;
}

function splitParagraphBlock(input: {
  readonly block: SearchLineBlock;
  readonly extracted_text: string;
}): {
  readonly candidates: readonly SearchMutableSentenceCandidate[];
  readonly abbreviation_boundary_preserved: boolean;
  readonly long_unterminated_unit: boolean;
} {
  const candidates: SearchMutableSentenceCandidate[] = [];

  const blockText = input.block.text;
  let localSentenceStart = 0;
  let abbreviationBoundaryPreserved = false;

  for (
    let currentIndex = 0;
    currentIndex < blockText.length;
    currentIndex += 1
  ) {
    const character = blockText[currentIndex];

    if (
      character === undefined ||
      !SENTENCE_TERMINATORS.has(character)
    ) {
      continue;
    }

    let closesSentence = true;

    if (character === ".") {
      const periodResolution = shouldPeriodCloseSentence(
        blockText,
        currentIndex,
      );

      closesSentence = periodResolution.closes_sentence;

      if (periodResolution.abbreviation_preserved) {
        abbreviationBoundaryPreserved = true;
      }
    }

    if (!closesSentence) {
      continue;
    }

    const boundaryEnd = resolveBoundaryEndOffset(
      blockText,
      currentIndex,
    );

    const absoluteStart =
      input.block.start_offset + localSentenceStart;

    const absoluteEnd =
      input.block.start_offset + boundaryEnd;

    const trimmed = trimCandidateOffsets({
      source_text: input.extracted_text,
      start_offset: absoluteStart,
      end_offset: absoluteEnd,
    });

    if (trimmed) {
      candidates.push({
        text: trimmed.text,
        start_offset: trimmed.start_offset,
        end_offset: trimmed.end_offset,
        structural_role: input.block.structural_role,
      });
    }

    localSentenceStart = boundaryEnd;
    currentIndex = boundaryEnd - 1;
  }

  const remainingAbsoluteStart =
    input.block.start_offset + localSentenceStart;

  const remaining = trimCandidateOffsets({
    source_text: input.extracted_text,
    start_offset: remainingAbsoluteStart,
    end_offset: input.block.end_offset,
  });

  if (remaining) {
    candidates.push({
      text: remaining.text,
      start_offset: remaining.start_offset,
      end_offset: remaining.end_offset,
      structural_role: input.block.structural_role,
    });
  }

  const longUnterminatedUnit =
    candidates.length === 1 &&
    !SENTENCE_TERMINATORS.has(blockText.at(-1) ?? "") &&
    blockText.length > 500;

  return {
    candidates: Object.freeze(candidates),
    abbreviation_boundary_preserved: abbreviationBoundaryPreserved,
    long_unterminated_unit: longUnterminatedUnit,
  };
}

function segmentLineBlock(input: {
  readonly block: SearchLineBlock;
  readonly extracted_text: string;
}): {
  readonly candidates: readonly SearchMutableSentenceCandidate[];
  readonly abbreviation_boundary_preserved: boolean;
  readonly long_unterminated_unit: boolean;
} {
  if (
    input.block.structural_role === "HEADING" ||
    input.block.structural_role === "LIST_ITEM"
  ) {
    return {
      candidates: Object.freeze([
        {
          text: input.block.text,
          start_offset: input.block.start_offset,
          end_offset: input.block.end_offset,
          structural_role: input.block.structural_role,
        },
      ]),
      abbreviation_boundary_preserved: false,
      long_unterminated_unit: false,
    };
  }

  return splitParagraphBlock(input);
}

/* ============================================================================
 * 9. STABLE SENTENCE IDENTITY
 * ----------------------------------------------------------------------------
 * Sentence identity depends on:
 * - canonical document identity;
 * - exact source offsets;
 * - exact sentence text.
 *
 * It excludes ordinal position because ordinal position may change if a
 * previous sentence is corrected while the current sentence remains intact.
 * ========================================================================== */

export function computeSearchSentenceId(input: {
  readonly document_id: string;
  readonly start_offset: number;
  readonly end_offset: number;
  readonly sentence_text: string;
}): SearchSentenceId {
  const identityHash = computeSha256Hex([
    "XYVALA_SEARCH_SENTENCE_IDENTITY_V1\n",
    `document_id:${input.document_id}\n`,
    `start_offset:${input.start_offset}\n`,
    `end_offset:${input.end_offset}\n`,
    `sentence_text:${input.sentence_text}\n`,
  ]);

  return `${SEARCH_SENTENCE_ID_PREFIX}_${identityHash}`;
}

/* ============================================================================
 * 10. CANONICAL SENTENCE ASSEMBLY
 * ========================================================================== */

function buildCanonicalSentences(input: {
  readonly document_id: string;
  readonly candidates: readonly SearchMutableSentenceCandidate[];
}): readonly SearchSentence[] {
  const sentences = input.candidates.map(
    (candidate, ordinalPosition): SearchSentence =>
      Object.freeze({
        sentence_id: computeSearchSentenceId({
          document_id: input.document_id,
          start_offset: candidate.start_offset,
          end_offset: candidate.end_offset,
          sentence_text: candidate.text,
        }),
        text: candidate.text,
        start_offset: candidate.start_offset,
        end_offset: candidate.end_offset,
        ordinal_position: ordinalPosition,
        structural_role: candidate.structural_role,
      }),
  );

  return Object.freeze(sentences);
}

/* ============================================================================
 * 11. SEGMENT COLLECTION
 * ========================================================================== */

function segmentExtractedText(input: {
  readonly document_id: string;
  readonly extracted_text: string;
}): {
  readonly sentences: readonly SearchSentence[];
  readonly degradation_reasons: readonly SearchSegmentationDegradationReason[];
} {
  const degradationReasons =
    new Set<SearchSegmentationDegradationReason>();

  const lineBlockResult = buildLineBlocks(input.extracted_text);

  if (lineBlockResult.empty_lines_ignored) {
    degradationReasons.add("EMPTY_LINES_IGNORED");
  }

  const candidates: SearchMutableSentenceCandidate[] = [];

  for (const block of lineBlockResult.blocks) {
    if (
      block.structural_role === "HEADING" ||
      block.structural_role === "LIST_ITEM"
    ) {
      degradationReasons.add("STRUCTURAL_ROLE_INFERRED");
    }

    const blockSegmentation = segmentLineBlock({
      block,
      extracted_text: input.extracted_text,
    });

    candidates.push(...blockSegmentation.candidates);

    if (blockSegmentation.abbreviation_boundary_preserved) {
      degradationReasons.add(
        "AMBIGUOUS_ABBREVIATION_BOUNDARY_PRESERVED",
      );
    }

    if (blockSegmentation.long_unterminated_unit) {
      degradationReasons.add("LONG_UNTERMINATED_TEXT_UNIT");
    }
  }

  const orderedCandidates = [...candidates].sort(
    (left, right) =>
      left.start_offset - right.start_offset ||
      left.end_offset - right.end_offset,
  );

  return {
    sentences: buildCanonicalSentences({
      document_id: input.document_id,
      candidates: orderedCandidates,
    }),
    degradation_reasons: Object.freeze([...degradationReasons]),
  };
}

/* ============================================================================
 * 12. EXTRACTION → SEGMENTATION BOUNDARY VALIDATION
 * ----------------------------------------------------------------------------
 * Validation qualifies the boundary.
 * It never repairs rejected extraction output.
 * ========================================================================== */

export function validateSearchSegmentationInput(
  input: SearchSegmentationInput,
): SearchSegmentationValidationResult {
  const rejectionReasons: SearchSegmentationRejectionReason[] = [];
  const extractedDocument = input.extracted_document;

  if (
    extractedDocument.validation_state !== "VALID" &&
    extractedDocument.validation_state !== "DEGRADED"
  ) {
    rejectionReasons.push("EXTRACTED_DOCUMENT_REJECTED");
  }

  if (!isNonEmptyString(extractedDocument.extracted_text)) {
    rejectionReasons.push("EXTRACTED_TEXT_EMPTY");
  }

  if (!isNonEmptyString(extractedDocument.document_id)) {
    rejectionReasons.push("DOCUMENT_ID_EMPTY");
  }

  if (!isNonEmptyString(extractedDocument.source_document_hash)) {
    rejectionReasons.push("SOURCE_DOCUMENT_HASH_EMPTY");
  }

  const createdAtValid = isValidIsoTimestamp(input.created_at);
  const extractionCreatedAtValid = isValidIsoTimestamp(
    extractedDocument.created_at,
  );

  if (!createdAtValid) {
    rejectionReasons.push("CREATED_AT_INVALID");
  }

  if (
    createdAtValid &&
    extractionCreatedAtValid &&
    Date.parse(input.created_at) <
      Date.parse(extractedDocument.created_at)
  ) {
    rejectionReasons.push("CREATED_AT_BEFORE_EXTRACTION");
  }

  const segmentationMethod =
    input.segmentation_method ?? XYVALA_SEARCH_SEGMENTATION_METHOD;

  if (!isNonEmptyString(segmentationMethod)) {
    rejectionReasons.push("SEGMENTATION_METHOD_EMPTY");
  }

  const segmentationModuleVersion =
    input.segmentation_module_version ??
    XYVALA_SEARCH_SEGMENTATION_MODULE_VERSION;

  if (!isNonEmptyString(segmentationModuleVersion)) {
    rejectionReasons.push("SEGMENTATION_MODULE_VERSION_EMPTY");
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.length === 0 ? "VALID" : "REJECTED",
    rejection_reasons: Object.freeze([...rejectionReasons]),
  });
}

/* ============================================================================
 * 13. OUTPUT INVARIANT VALIDATION
 * ========================================================================== */

export function validateSearchSentenceCollection(input: {
  readonly extracted_text: string;
  readonly sentences: readonly SearchSentence[];
}): SearchSegmentationValidationResult {
  const rejectionReasons =
    new Set<SearchSegmentationRejectionReason>();

  if (input.sentences.length === 0) {
    rejectionReasons.add("NO_SEGMENTS_PRODUCED");
  }

  const sentenceIds = new Set<SearchSentenceId>();
  let previousEndOffset = -1;

  for (const sentence of input.sentences) {
    if (
      sentence.start_offset < 0 ||
      sentence.end_offset <= sentence.start_offset ||
      sentence.end_offset > input.extracted_text.length ||
      input.extracted_text.slice(
        sentence.start_offset,
        sentence.end_offset,
      ) !== sentence.text
    ) {
      rejectionReasons.add("SEGMENT_OFFSETS_INVALID");
    }

    if (sentence.start_offset < previousEndOffset) {
      rejectionReasons.add("SEGMENT_OFFSETS_OVERLAP");
    }

    if (sentenceIds.has(sentence.sentence_id)) {
      rejectionReasons.add("DUPLICATE_SENTENCE_ID");
    }

    sentenceIds.add(sentence.sentence_id);
    previousEndOffset = Math.max(
      previousEndOffset,
      sentence.end_offset,
    );
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.size === 0 ? "VALID" : "REJECTED",
    rejection_reasons: Object.freeze([...rejectionReasons]),
  });
}

/* ============================================================================
 * 14. CANONICAL SEGMENTED DOCUMENT BUILDER
 * ----------------------------------------------------------------------------
 * This is the only canonical producer of SearchSegmentedDocument in this
 * module.
 *
 * Rejected input produces an explicit rejected contract.
 * No missing segment is reconstructed artificially.
 * ========================================================================== */

export function buildSearchSegmentedDocument(
  input: SearchSegmentationInput,
): SearchSegmentedDocument {
  const boundaryValidation = validateSearchSegmentationInput(input);

  const segmentationMethod =
    input.segmentation_method ?? XYVALA_SEARCH_SEGMENTATION_METHOD;

  const segmentationModuleVersion =
    input.segmentation_module_version ??
    XYVALA_SEARCH_SEGMENTATION_MODULE_VERSION;

  if (boundaryValidation.validation_state === "REJECTED") {
    const rejectedDocument: SearchSegmentedDocument = {
      contract_version: XYVALA_SEARCH_SEGMENTATION_CONTRACT_VERSION,
      created_at: input.created_at,

      document_id: input.extracted_document.document_id,

      sentences: Object.freeze([]),
      sentence_count: 0,

      segmentation_method: segmentationMethod,
      segmentation_module_version: segmentationModuleVersion,

      validation_state: "REJECTED",
      degradation_reasons: Object.freeze([
        ...boundaryValidation.rejection_reasons,
      ]),
    };

    return Object.freeze(rejectedDocument);
  }

  const segmentationResult = segmentExtractedText({
    document_id: input.extracted_document.document_id,
    extracted_text: input.extracted_document.extracted_text,
  });

  const collectionValidation = validateSearchSentenceCollection({
    extracted_text: input.extracted_document.extracted_text,
    sentences: segmentationResult.sentences,
  });

  if (collectionValidation.validation_state === "REJECTED") {
    const rejectedDocument: SearchSegmentedDocument = {
      contract_version: XYVALA_SEARCH_SEGMENTATION_CONTRACT_VERSION,
      created_at: input.created_at,

      document_id: input.extracted_document.document_id,

      sentences: segmentationResult.sentences,
      sentence_count: segmentationResult.sentences.length,

      segmentation_method: segmentationMethod,
      segmentation_module_version: segmentationModuleVersion,

      validation_state: "REJECTED",
      degradation_reasons: Object.freeze([
        ...segmentationResult.degradation_reasons,
        ...collectionValidation.rejection_reasons,
      ]),
    };

    return Object.freeze(rejectedDocument);
  }

  const degradationReasons =
    new Set<SearchSegmentationDegradationReason>(
      segmentationResult.degradation_reasons,
    );

  if (input.extracted_document.validation_state === "DEGRADED") {
    degradationReasons.add("UPSTREAM_EXTRACTION_DEGRADED");
  }

  const validationState: SearchValidationState =
    degradationReasons.size > 0 ? "DEGRADED" : "VALID";

  const segmentedDocument: SearchSegmentedDocument = {
    contract_version: XYVALA_SEARCH_SEGMENTATION_CONTRACT_VERSION,
    created_at: input.created_at,

    document_id: input.extracted_document.document_id,

    sentences: segmentationResult.sentences,
    sentence_count: segmentationResult.sentences.length,

    segmentation_method: segmentationMethod,
    segmentation_module_version: segmentationModuleVersion,

    validation_state: validationState,
    degradation_reasons: Object.freeze([...degradationReasons]),
  };

  return Object.freeze(segmentedDocument);
}

/* ============================================================================
 * 15. SEGMENTATION ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * This pure reader determines whether the document may cross the
 * Segmentation → Lexical Analysis boundary.
 *
 * A DEGRADED segmentation remains propagable when:
 * - sentences exist;
 * - offsets remain valid;
 * - no rejection invariant is present.
 * ========================================================================== */

export function isSearchSegmentedDocumentAccepted(
  segmentedDocument: SearchSegmentedDocument,
): boolean {
  return (
    (segmentedDocument.validation_state === "VALID" ||
      segmentedDocument.validation_state === "DEGRADED") &&
    segmentedDocument.sentences.length > 0 &&
    segmentedDocument.sentence_count ===
      segmentedDocument.sentences.length
  );
}
