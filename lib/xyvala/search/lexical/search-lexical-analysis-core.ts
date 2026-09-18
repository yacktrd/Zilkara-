/* ============================================================================
 * FILE: lib/xyvala/search/lexical/search-lexical-analysis-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical lexical analysis core
 *
 * ROLE
 * - consume the canonical SearchSegmentedDocument
 * - validate the Segmentation to Lexical Analysis boundary
 * - tokenize every canonical sentence deterministically
 * - normalize lexical terms without removing their semantic identity
 * - preserve raw forms, positions, offsets and sentence lineage
 * - count canonical term occurrences
 * - build the sentence-to-terms index
 * - build the inverted term-to-sentences index
 * - produce the canonical SearchLexicalDocument contract
 *
 * CLASSIFICATION
 * - PRIVATE SEARCH ENGINE
 * - LEXICAL ANALYSIS
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 * - DETERMINISTIC
 *
 * PARENTS
 * - Xyvala Search official protocol
 * - Search pipeline canonical contract
 * - Search segmentation core
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Search frequency signal detector
 * - Search anchor signal detector
 * - Search lexical scorer
 * - Search occurrence scorer
 * - Search correlation scorer
 * - Search query-document signal detector
 * - Search private snapshot lineage
 * - Search audit and observability adapters
 *
 * DIRECTIVES
 * - consume SearchSegmentedDocument only
 * - preserve sentence identities
 * - preserve exact token source offsets
 * - preserve raw token forms
 * - produce one canonical normalized form per lexical term
 * - no network access
 * - no file-system access
 * - no database access
 * - no queue access
 * - no cache mutation
 * - no event publication
 * - no stopword removal
 * - no stemming
 * - no lemmatization
 * - no synonym expansion
 * - no semantic enrichment
 * - no language inference
 * - no frequent-term selection
 * - no rare-term selection
 * - no TF-IDF computation
 * - no anchor detection
 * - no query analysis
 * - no scoring
 * - no aggregation
 * - no ranking
 * - no private decision
 * - no public projection
 * - no implicit timestamp generation
 * - no silent correction of rejected segmentation data
 *
 * INPUTS
 * - canonical SearchSegmentedDocument
 * - explicit lexical analysis timestamp
 * - optional explicit tokenizer and normalization versions
 *
 * OUTPUTS
 * - canonical SearchLexicalDocument
 *
 * INVARIANTS
 * - identical inputs and versions produce identical lexical outputs
 * - every token remains linked to its source sentence
 * - every token offset refers to the canonical extracted-text coordinate space
 * - token positions are stable and strictly increasing
 * - occurrence counts equal the number of emitted occurrences
 * - sentence frequency counts use unique sentence identities
 * - the inverted index is constructed once from canonical occurrences
 * - no downstream module must retokenize the document
 * - the input contract is never mutated
 * - rejected segmentation never becomes valid lexical truth
 * - missing lexical evidence is explicitly qualified
 *
 * CRITICAL DEPENDENCIES
 * - search-pipeline-contract.ts
 *
 * SENSITIVE AREAS
 * - Unicode tokenization
 * - lexical normalization
 * - apostrophe and hyphen handling
 * - absolute character offsets
 * - deterministic ordering
 * - occurrence counting
 * - sentence frequency calculation
 * - inverted-index integrity
 * ========================================================================== */

import type {
  SearchContractVersion,
  SearchInvertedTermIndexEntry,
  SearchIsoTimestamp,
  SearchLexicalDocument,
  SearchModuleVersion,
  SearchSegmentedDocument,
  SearchSentenceId,
  SearchSentenceTermIndexEntry,
  SearchTermOccurrence,
  SearchTermStatistics,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE CONSTANTS
 * ========================================================================== */

export const XYVALA_SEARCH_LEXICAL_CONTRACT_VERSION =
  "1.0.0" satisfies SearchContractVersion;

export const XYVALA_SEARCH_LEXICAL_MODULE_VERSION =
  "1.0.0" satisfies SearchModuleVersion;

export const XYVALA_SEARCH_TOKENIZER_VERSION =
  "CANONICAL_UNICODE_TOKENIZER_V1";

export const XYVALA_SEARCH_LEXICAL_NORMALIZATION_METHOD =
  "UNICODE_NFKC_CASE_NORMALIZATION_V1";

export const XYVALA_SEARCH_STOPWORD_PROFILE_VERSION =
  "NONE_V1";

export const XYVALA_SEARCH_LEMMATIZATION_PROFILE_VERSION =
  "NONE_V1";

/**
 * Canonical lexical token:
 *
 * - starts with one or more Unicode letters or numbers;
 * - may contain internal apostrophes or hyphens;
 * - never starts or ends with punctuation;
 * - preserves words such as:
 *   - aujourd'hui
 *   - moteur-Wankel
 *   - x86
 *   - 2026
 */
const CANONICAL_TOKEN_PATTERN =
  /[\p{L}\p{N}]+(?:['’\-‐-‒–—][\p{L}\p{N}]+)*/gu;

/**
 * Unicode forms normalized into one canonical apostrophe.
 */
const APOSTROPHE_VARIANT_PATTERN = /[’‘ʼ`´]/gu;

/**
 * Unicode dash and hyphen forms normalized into ASCII hyphen-minus.
 */
const HYPHEN_VARIANT_PATTERN = /[‐-‒–—]/gu;

/* ============================================================================
 * 2. INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * created_at must be provided explicitly.
 *
 * This core must never call:
 * - Date.now()
 * - new Date()
 * - Math.random()
 * - crypto.randomUUID()
 * ========================================================================== */

export interface SearchLexicalAnalysisInput {
  readonly segmented_document: SearchSegmentedDocument;
  readonly created_at: SearchIsoTimestamp;

  readonly tokenizer_version?: SearchModuleVersion;
  readonly normalization_method?: string;

  readonly stopword_profile_version?: string;
  readonly lemmatization_profile_version?: string;
}

/* ============================================================================
 * 3. VALIDATION AND DEGRADATION CONTRACTS
 * ========================================================================== */

export type SearchLexicalRejectionReason =
  | "SEGMENTED_DOCUMENT_REJECTED"
  | "DOCUMENT_ID_EMPTY"
  | "SENTENCE_COLLECTION_EMPTY"
  | "SENTENCE_COUNT_MISMATCH"
  | "SENTENCE_ID_EMPTY"
  | "DUPLICATE_SENTENCE_ID"
  | "SENTENCE_TEXT_EMPTY"
  | "SENTENCE_OFFSETS_INVALID"
  | "SENTENCE_ORDINAL_POSITION_INVALID"
  | "CREATED_AT_INVALID"
  | "CREATED_AT_BEFORE_SEGMENTATION"
  | "TOKENIZER_VERSION_EMPTY"
  | "NORMALIZATION_METHOD_EMPTY"
  | "NO_TOKENS_PRODUCED"
  | "TOKEN_POSITION_INVALID"
  | "TOKEN_CHARACTER_OFFSET_INVALID"
  | "TERM_OCCURRENCE_COUNT_MISMATCH"
  | "SENTENCE_FREQUENCY_COUNT_INVALID"
  | "SENTENCE_TERM_INDEX_INVALID"
  | "INVERTED_TERM_INDEX_INVALID";

export type SearchLexicalDegradationReason =
  | "UPSTREAM_SEGMENTATION_DEGRADED"
  | "NO_STOPWORD_REMOVAL"
  | "NO_LEMMATIZATION"
  | "UNICODE_COMPATIBILITY_NORMALIZATION_APPLIED"
  | "APOSTROPHE_VARIANTS_NORMALIZED"
  | "HYPHEN_VARIANTS_NORMALIZED";

export interface SearchLexicalValidationResult {
  readonly validation_state: SearchValidationState;
  readonly rejection_reasons: readonly SearchLexicalRejectionReason[];
}

interface SearchTokenizationResult {
  readonly term_occurrences: readonly SearchTermOccurrence[];
  readonly degradation_reasons: readonly SearchLexicalDegradationReason[];
}

interface MutableTermAccumulator {
  readonly normalized_term: string;
  readonly raw_forms: Set<string>;
  readonly sentence_ids: Set<SearchSentenceId>;
  occurrence_count: number;
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

function compareCanonicalStrings(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

/* ============================================================================
 * 5. CANONICAL TERM NORMALIZATION
 * ----------------------------------------------------------------------------
 * Normalization is lexical identity normalization only.
 *
 * It does not:
 * - remove accents;
 * - remove stopwords;
 * - stem;
 * - lemmatize;
 * - infer synonyms;
 * - translate;
 * - alter the raw source text.
 * ========================================================================== */

export function normalizeSearchLexicalTerm(rawTerm: string): string {
  return rawTerm
    .normalize("NFKC")
    .replace(APOSTROPHE_VARIANT_PATTERN, "'")
    .replace(HYPHEN_VARIANT_PATTERN, "-")
    .toLowerCase();
}

function detectNormalizationDegradations(
  rawTerm: string,
  normalizedTerm: string,
  degradationReasons: Set<SearchLexicalDegradationReason>,
): void {
  const nfkcTerm = rawTerm.normalize("NFKC");

  if (nfkcTerm !== rawTerm) {
    degradationReasons.add(
      "UNICODE_COMPATIBILITY_NORMALIZATION_APPLIED",
    );
  }

  if (APOSTROPHE_VARIANT_PATTERN.test(rawTerm)) {
    degradationReasons.add("APOSTROPHE_VARIANTS_NORMALIZED");
  }

  /**
   * Global regular expressions retain lastIndex after test().
   * Resetting it guarantees deterministic repeated evaluation.
   */
  APOSTROPHE_VARIANT_PATTERN.lastIndex = 0;

  if (HYPHEN_VARIANT_PATTERN.test(rawTerm)) {
    degradationReasons.add("HYPHEN_VARIANTS_NORMALIZED");
  }

  HYPHEN_VARIANT_PATTERN.lastIndex = 0;

  if (normalizedTerm.length === 0) {
    throw new Error(
      "XYVALA_SEARCH_EMPTY_NORMALIZED_TERM_INVARIANT_VIOLATION",
    );
  }
}

/* ============================================================================
 * 6. CANONICAL TOKENIZATION
 * ----------------------------------------------------------------------------
 * Tokens are emitted in source order.
 *
 * character_offset uses the coordinate space of the canonical extracted text:
 *
 * sentence.start_offset + local token offset
 *
 * token_position is global for the complete document and starts at zero.
 * ========================================================================== */

function tokenizeSearchSegmentedDocument(
  segmentedDocument: SearchSegmentedDocument,
): SearchTokenizationResult {
  const termOccurrences: SearchTermOccurrence[] = [];

  const degradationReasons =
    new Set<SearchLexicalDegradationReason>([
      "NO_STOPWORD_REMOVAL",
      "NO_LEMMATIZATION",
    ]);

  let globalTokenPosition = 0;

  for (const sentence of segmentedDocument.sentences) {
    /**
     * A dedicated RegExp instance is required for each sentence because
     * global RegExp instances maintain mutable lastIndex state.
     */
    const tokenPattern = new RegExp(
      CANONICAL_TOKEN_PATTERN.source,
      CANONICAL_TOKEN_PATTERN.flags,
    );

    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(sentence.text)) !== null) {
      const rawTerm = match[0];
      const normalizedTerm = normalizeSearchLexicalTerm(rawTerm);

      detectNormalizationDegradations(
        rawTerm,
        normalizedTerm,
        degradationReasons,
      );

      const occurrence: SearchTermOccurrence = Object.freeze({
        term: rawTerm,
        normalized_term: normalizedTerm,
        sentence_id: sentence.sentence_id,
        token_position: globalTokenPosition,
        character_offset: sentence.start_offset + match.index,
      });

      termOccurrences.push(occurrence);
      globalTokenPosition += 1;

      /**
       * Defensive protection against an unexpected zero-width expression.
       * The current canonical expression cannot produce one, but this
       * invariant prevents an infinite loop after future contract evolution.
       */
      if (match[0].length === 0) {
        tokenPattern.lastIndex += 1;
      }
    }
  }

  return Object.freeze({
    term_occurrences: Object.freeze(termOccurrences),
    degradation_reasons: Object.freeze([...degradationReasons]),
  });
}

/* ============================================================================
 * 7. TERM STATISTICS
 * ----------------------------------------------------------------------------
 * document_frequency_ratio represents the proportion of canonical sentences
 * in which the normalized term occurs at least once.
 *
 * It is not TF-IDF.
 * It is not the V0 frequent-term or rare-term selection.
 * ========================================================================== */

function buildSearchTermStatistics(input: {
  readonly term_occurrences: readonly SearchTermOccurrence[];
  readonly sentence_count: number;
}): readonly SearchTermStatistics[] {
  const accumulators = new Map<string, MutableTermAccumulator>();

  for (const occurrence of input.term_occurrences) {
    const existingAccumulator = accumulators.get(
      occurrence.normalized_term,
    );

    if (existingAccumulator) {
      existingAccumulator.occurrence_count += 1;
      existingAccumulator.raw_forms.add(occurrence.term);
      existingAccumulator.sentence_ids.add(occurrence.sentence_id);
      continue;
    }

    accumulators.set(occurrence.normalized_term, {
      normalized_term: occurrence.normalized_term,
      raw_forms: new Set([occurrence.term]),
      sentence_ids: new Set([occurrence.sentence_id]),
      occurrence_count: 1,
    });
  }

  const statistics = [...accumulators.values()]
    .sort((left, right) =>
      compareCanonicalStrings(
        left.normalized_term,
        right.normalized_term,
      ),
    )
    .map((accumulator): SearchTermStatistics => {
      const sentenceFrequencyCount = accumulator.sentence_ids.size;

      const documentFrequencyRatio =
        input.sentence_count > 0
          ? clampRatio(
              sentenceFrequencyCount / input.sentence_count,
            )
          : 0;

      return Object.freeze({
        normalized_term: accumulator.normalized_term,
        raw_forms: Object.freeze(
          [...accumulator.raw_forms].sort(compareCanonicalStrings),
        ),
        occurrence_count: accumulator.occurrence_count,
        document_frequency_ratio: documentFrequencyRatio,
        sentence_frequency_count: sentenceFrequencyCount,
      });
    });

  return Object.freeze(statistics);
}

/* ============================================================================
 * 8. SENTENCE → TERMS INDEX
 * ----------------------------------------------------------------------------
 * This index preserves lexical sequence and repeated terms inside a sentence.
 *
 * It is the canonical source for modules that need sentence-level token order.
 * ========================================================================== */

function buildSearchSentenceTermIndex(input: {
  readonly segmented_document: SearchSegmentedDocument;
  readonly term_occurrences: readonly SearchTermOccurrence[];
}): readonly SearchSentenceTermIndexEntry[] {
  const termsBySentence = new Map<SearchSentenceId, string[]>();

  for (const sentence of input.segmented_document.sentences) {
    termsBySentence.set(sentence.sentence_id, []);
  }

  for (const occurrence of input.term_occurrences) {
    const sentenceTerms = termsBySentence.get(occurrence.sentence_id);

    if (!sentenceTerms) {
      throw new Error(
        "XYVALA_SEARCH_TERM_OCCURRENCE_SENTENCE_LINEAGE_VIOLATION",
      );
    }

    sentenceTerms.push(occurrence.normalized_term);
  }

  const entries = input.segmented_document.sentences.map(
    (sentence): SearchSentenceTermIndexEntry =>
      Object.freeze({
        sentence_id: sentence.sentence_id,
        normalized_terms: Object.freeze([
          ...(termsBySentence.get(sentence.sentence_id) ?? []),
        ]),
      }),
  );

  return Object.freeze(entries);
}

/* ============================================================================
 * 9. TERM → SENTENCES INVERTED INDEX
 * ----------------------------------------------------------------------------
 * A sentence identity appears once per normalized term, even when the term
 * occurs several times inside the same sentence.
 *
 * Sentence identities remain ordered by source sentence order.
 * ========================================================================== */

function buildSearchInvertedTermIndex(input: {
  readonly segmented_document: SearchSegmentedDocument;
  readonly term_occurrences: readonly SearchTermOccurrence[];
}): readonly SearchInvertedTermIndexEntry[] {
  const sentenceOrdinalById = new Map<SearchSentenceId, number>();

  for (const sentence of input.segmented_document.sentences) {
    sentenceOrdinalById.set(
      sentence.sentence_id,
      sentence.ordinal_position,
    );
  }

  const sentenceIdsByTerm = new Map<string, Set<SearchSentenceId>>();

  for (const occurrence of input.term_occurrences) {
    const existingSentenceIds = sentenceIdsByTerm.get(
      occurrence.normalized_term,
    );

    if (existingSentenceIds) {
      existingSentenceIds.add(occurrence.sentence_id);
      continue;
    }

    sentenceIdsByTerm.set(
      occurrence.normalized_term,
      new Set([occurrence.sentence_id]),
    );
  }

  const entries = [...sentenceIdsByTerm.entries()]
    .sort(([leftTerm], [rightTerm]) =>
      compareCanonicalStrings(leftTerm, rightTerm),
    )
    .map(
      ([normalizedTerm, sentenceIds]): SearchInvertedTermIndexEntry => {
        const orderedSentenceIds = [...sentenceIds].sort(
          (leftSentenceId, rightSentenceId) => {
            const leftOrdinal =
              sentenceOrdinalById.get(leftSentenceId);

            const rightOrdinal =
              sentenceOrdinalById.get(rightSentenceId);

            if (
              leftOrdinal === undefined ||
              rightOrdinal === undefined
            ) {
              throw new Error(
                "XYVALA_SEARCH_INVERTED_INDEX_SENTENCE_LINEAGE_VIOLATION",
              );
            }

            return leftOrdinal - rightOrdinal;
          },
        );

        return Object.freeze({
          normalized_term: normalizedTerm,
          sentence_ids: Object.freeze(orderedSentenceIds),
        });
      },
    );

  return Object.freeze(entries);
}

/* ============================================================================
 * 10. SEGMENTATION → LEXICAL ANALYSIS BOUNDARY VALIDATION
 * ----------------------------------------------------------------------------
 * Validation qualifies the boundary.
 *
 * It never:
 * - repairs a sentence;
 * - reconstructs an identifier;
 * - changes an offset;
 * - accepts rejected upstream truth silently.
 * ========================================================================== */

export function validateSearchLexicalAnalysisInput(
  input: SearchLexicalAnalysisInput,
): SearchLexicalValidationResult {
  const rejectionReasons = new Set<SearchLexicalRejectionReason>();
  const segmentedDocument = input.segmented_document;

  if (
    segmentedDocument.validation_state !== "VALID" &&
    segmentedDocument.validation_state !== "DEGRADED"
  ) {
    rejectionReasons.add("SEGMENTED_DOCUMENT_REJECTED");
  }

  if (!isNonEmptyString(segmentedDocument.document_id)) {
    rejectionReasons.add("DOCUMENT_ID_EMPTY");
  }

  if (segmentedDocument.sentences.length === 0) {
    rejectionReasons.add("SENTENCE_COLLECTION_EMPTY");
  }

  if (
    segmentedDocument.sentence_count !==
    segmentedDocument.sentences.length
  ) {
    rejectionReasons.add("SENTENCE_COUNT_MISMATCH");
  }

  const sentenceIds = new Set<SearchSentenceId>();
  let previousEndOffset = -1;

  segmentedDocument.sentences.forEach((sentence, index) => {
    if (!isNonEmptyString(sentence.sentence_id)) {
      rejectionReasons.add("SENTENCE_ID_EMPTY");
    }

    if (sentenceIds.has(sentence.sentence_id)) {
      rejectionReasons.add("DUPLICATE_SENTENCE_ID");
    }

    sentenceIds.add(sentence.sentence_id);

    if (!isNonEmptyString(sentence.text)) {
      rejectionReasons.add("SENTENCE_TEXT_EMPTY");
    }

    if (
      sentence.start_offset < 0 ||
      sentence.end_offset <= sentence.start_offset ||
      sentence.start_offset < previousEndOffset
    ) {
      rejectionReasons.add("SENTENCE_OFFSETS_INVALID");
    }

    if (sentence.ordinal_position !== index) {
      rejectionReasons.add(
        "SENTENCE_ORDINAL_POSITION_INVALID",
      );
    }

    previousEndOffset = Math.max(
      previousEndOffset,
      sentence.end_offset,
    );
  });

  const createdAtValid = isValidIsoTimestamp(input.created_at);
  const segmentationCreatedAtValid = isValidIsoTimestamp(
    segmentedDocument.created_at,
  );

  if (!createdAtValid) {
    rejectionReasons.add("CREATED_AT_INVALID");
  }

  if (
    createdAtValid &&
    segmentationCreatedAtValid &&
    Date.parse(input.created_at) <
      Date.parse(segmentedDocument.created_at)
  ) {
    rejectionReasons.add("CREATED_AT_BEFORE_SEGMENTATION");
  }

  const tokenizerVersion =
    input.tokenizer_version ?? XYVALA_SEARCH_TOKENIZER_VERSION;

  if (!isNonEmptyString(tokenizerVersion)) {
    rejectionReasons.add("TOKENIZER_VERSION_EMPTY");
  }

  const normalizationMethod =
    input.normalization_method ??
    XYVALA_SEARCH_LEXICAL_NORMALIZATION_METHOD;

  if (!isNonEmptyString(normalizationMethod)) {
    rejectionReasons.add("NORMALIZATION_METHOD_EMPTY");
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.size === 0 ? "VALID" : "REJECTED",
    rejection_reasons: Object.freeze([...rejectionReasons]),
  });
}

/* ============================================================================
 * 11. OUTPUT INVARIANT VALIDATION
 * ========================================================================== */

export function validateSearchLexicalDocumentOutput(input: {
  readonly segmented_document: SearchSegmentedDocument;
  readonly lexical_document: SearchLexicalDocument;
}): SearchLexicalValidationResult {
  const rejectionReasons = new Set<SearchLexicalRejectionReason>();

  const lexicalDocument = input.lexical_document;
  const segmentedDocument = input.segmented_document;

  if (
    lexicalDocument.token_count !==
    lexicalDocument.term_occurrences.length
  ) {
    rejectionReasons.add("TERM_OCCURRENCE_COUNT_MISMATCH");
  }

  if (
    lexicalDocument.vocabulary_size !==
    lexicalDocument.term_statistics.length
  ) {
    rejectionReasons.add("TERM_OCCURRENCE_COUNT_MISMATCH");
  }

  const sentenceById = new Map(
    segmentedDocument.sentences.map((sentence) => [
      sentence.sentence_id,
      sentence,
    ]),
  );

  let expectedTokenPosition = 0;

  for (const occurrence of lexicalDocument.term_occurrences) {
    const sentence = sentenceById.get(occurrence.sentence_id);

    if (occurrence.token_position !== expectedTokenPosition) {
      rejectionReasons.add("TOKEN_POSITION_INVALID");
    }

    expectedTokenPosition += 1;

    if (!sentence) {
      rejectionReasons.add(
        "TOKEN_CHARACTER_OFFSET_INVALID",
      );
      continue;
    }

    const localOffset =
      occurrence.character_offset - sentence.start_offset;

    if (
      localOffset < 0 ||
      localOffset + occurrence.term.length > sentence.text.length ||
      sentence.text.slice(
        localOffset,
        localOffset + occurrence.term.length,
      ) !== occurrence.term
    ) {
      rejectionReasons.add(
        "TOKEN_CHARACTER_OFFSET_INVALID",
      );
    }
  }

  const occurrencesByTerm = new Map<string, number>();
  const sentenceIdsByTerm = new Map<
    string,
    Set<SearchSentenceId>
  >();

  for (const occurrence of lexicalDocument.term_occurrences) {
    occurrencesByTerm.set(
      occurrence.normalized_term,
      (occurrencesByTerm.get(occurrence.normalized_term) ?? 0) + 1,
    );

    const sentenceIds =
      sentenceIdsByTerm.get(occurrence.normalized_term) ??
      new Set<SearchSentenceId>();

    sentenceIds.add(occurrence.sentence_id);

    sentenceIdsByTerm.set(
      occurrence.normalized_term,
      sentenceIds,
    );
  }

  for (const statistics of lexicalDocument.term_statistics) {
    const expectedOccurrenceCount =
      occurrencesByTerm.get(statistics.normalized_term) ?? 0;

    const expectedSentenceFrequencyCount =
      sentenceIdsByTerm.get(statistics.normalized_term)?.size ?? 0;

    if (
      statistics.occurrence_count !== expectedOccurrenceCount
    ) {
      rejectionReasons.add(
        "TERM_OCCURRENCE_COUNT_MISMATCH",
      );
    }

    if (
      statistics.sentence_frequency_count !==
        expectedSentenceFrequencyCount ||
      statistics.sentence_frequency_count >
        segmentedDocument.sentence_count
    ) {
      rejectionReasons.add(
        "SENTENCE_FREQUENCY_COUNT_INVALID",
      );
    }
  }

  if (
    lexicalDocument.sentence_term_index.length !==
    segmentedDocument.sentences.length
  ) {
    rejectionReasons.add("SENTENCE_TERM_INDEX_INVALID");
  }

  for (
    let index = 0;
    index < segmentedDocument.sentences.length;
    index += 1
  ) {
    const sentence = segmentedDocument.sentences[index];
    const sentenceTermEntry =
      lexicalDocument.sentence_term_index[index];

    if (
      !sentence ||
      !sentenceTermEntry ||
      sentence.sentence_id !== sentenceTermEntry.sentence_id
    ) {
      rejectionReasons.add("SENTENCE_TERM_INDEX_INVALID");
    }
  }

  const invertedTerms = new Set<string>();

  for (const entry of lexicalDocument.inverted_term_index) {
    if (
      invertedTerms.has(entry.normalized_term) ||
      !occurrencesByTerm.has(entry.normalized_term)
    ) {
      rejectionReasons.add("INVERTED_TERM_INDEX_INVALID");
    }

    invertedTerms.add(entry.normalized_term);

    const uniqueSentenceIds = new Set(entry.sentence_ids);

    if (
      uniqueSentenceIds.size !== entry.sentence_ids.length
    ) {
      rejectionReasons.add("INVERTED_TERM_INDEX_INVALID");
    }

    for (const sentenceId of entry.sentence_ids) {
      if (!sentenceById.has(sentenceId)) {
        rejectionReasons.add("INVERTED_TERM_INDEX_INVALID");
      }
    }
  }

  if (invertedTerms.size !== occurrencesByTerm.size) {
    rejectionReasons.add("INVERTED_TERM_INDEX_INVALID");
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.size === 0 ? "VALID" : "REJECTED",
    rejection_reasons: Object.freeze([...rejectionReasons]),
  });
}

/* ============================================================================
 * 12. EMPTY REJECTED DOCUMENT BUILDER
 * ----------------------------------------------------------------------------
 * Rejected input remains explicit.
 *
 * No token, statistic or index is fabricated.
 * ========================================================================== */

function buildRejectedSearchLexicalDocument(input: {
  readonly source_input: SearchLexicalAnalysisInput;
  readonly rejection_reasons: readonly SearchLexicalRejectionReason[];
}): SearchLexicalDocument {
  const tokenizerVersion =
    input.source_input.tokenizer_version ??
    XYVALA_SEARCH_TOKENIZER_VERSION;

  const normalizationMethod =
    input.source_input.normalization_method ??
    XYVALA_SEARCH_LEXICAL_NORMALIZATION_METHOD;

  const rejectedDocument: SearchLexicalDocument = {
    contract_version: XYVALA_SEARCH_LEXICAL_CONTRACT_VERSION,
    created_at: input.source_input.created_at,

    document_id:
      input.source_input.segmented_document.document_id,

    token_count: 0,
    vocabulary_size: 0,

    term_statistics: Object.freeze([]),
    term_occurrences: Object.freeze([]),

    sentence_term_index: Object.freeze([]),
    inverted_term_index: Object.freeze([]),

    tokenizer_method: XYVALA_SEARCH_TOKENIZER_VERSION,
    tokenizer_version: tokenizerVersion,
    normalization_method: normalizationMethod,

    stopword_profile_version:
      input.source_input.stopword_profile_version ??
      XYVALA_SEARCH_STOPWORD_PROFILE_VERSION,

    lemmatization_profile_version:
      input.source_input.lemmatization_profile_version ??
      XYVALA_SEARCH_LEMMATIZATION_PROFILE_VERSION,

    validation_state: "REJECTED",
    degradation_reasons: Object.freeze([
      ...input.rejection_reasons,
    ]),
  };

  return Object.freeze(rejectedDocument);
}

/* ============================================================================
 * 13. CANONICAL LEXICAL DOCUMENT BUILDER
 * ----------------------------------------------------------------------------
 * This is the canonical producer of SearchLexicalDocument.
 *
 * No downstream module may rebuild:
 * - tokens;
 * - occurrence counts;
 * - sentence-term mappings;
 * - the inverted term index.
 * ========================================================================== */

export function buildSearchLexicalDocument(
  input: SearchLexicalAnalysisInput,
): SearchLexicalDocument {
  const boundaryValidation =
    validateSearchLexicalAnalysisInput(input);

  if (boundaryValidation.validation_state === "REJECTED") {
    return buildRejectedSearchLexicalDocument({
      source_input: input,
      rejection_reasons:
        boundaryValidation.rejection_reasons,
    });
  }

  const tokenizationResult =
    tokenizeSearchSegmentedDocument(
      input.segmented_document,
    );

  if (tokenizationResult.term_occurrences.length === 0) {
    return buildRejectedSearchLexicalDocument({
      source_input: input,
      rejection_reasons: Object.freeze([
        "NO_TOKENS_PRODUCED",
      ]),
    });
  }

  const termStatistics = buildSearchTermStatistics({
    term_occurrences: tokenizationResult.term_occurrences,
    sentence_count:
      input.segmented_document.sentence_count,
  });

  const sentenceTermIndex = buildSearchSentenceTermIndex({
    segmented_document: input.segmented_document,
    term_occurrences: tokenizationResult.term_occurrences,
  });

  const invertedTermIndex = buildSearchInvertedTermIndex({
    segmented_document: input.segmented_document,
    term_occurrences: tokenizationResult.term_occurrences,
  });

  const degradationReasons =
    new Set<SearchLexicalDegradationReason>(
      tokenizationResult.degradation_reasons,
    );

  if (
    input.segmented_document.validation_state === "DEGRADED"
  ) {
    degradationReasons.add(
      "UPSTREAM_SEGMENTATION_DEGRADED",
    );
  }

  const lexicalDocument: SearchLexicalDocument = {
    contract_version: XYVALA_SEARCH_LEXICAL_CONTRACT_VERSION,
    created_at: input.created_at,

    document_id: input.segmented_document.document_id,

    token_count: tokenizationResult.term_occurrences.length,
    vocabulary_size: termStatistics.length,

    term_statistics: termStatistics,
    term_occurrences:
      tokenizationResult.term_occurrences,

    sentence_term_index: sentenceTermIndex,
    inverted_term_index: invertedTermIndex,

    tokenizer_method: XYVALA_SEARCH_TOKENIZER_VERSION,
    tokenizer_version:
      input.tokenizer_version ??
      XYVALA_SEARCH_TOKENIZER_VERSION,

    normalization_method:
      input.normalization_method ??
      XYVALA_SEARCH_LEXICAL_NORMALIZATION_METHOD,

    stopword_profile_version:
      input.stopword_profile_version ??
      XYVALA_SEARCH_STOPWORD_PROFILE_VERSION,

    lemmatization_profile_version:
      input.lemmatization_profile_version ??
      XYVALA_SEARCH_LEMMATIZATION_PROFILE_VERSION,

    validation_state:
      degradationReasons.size > 0 ? "DEGRADED" : "VALID",

    degradation_reasons: Object.freeze([
      ...degradationReasons,
    ]),
  };

  const outputValidation =
    validateSearchLexicalDocumentOutput({
      segmented_document: input.segmented_document,
      lexical_document: lexicalDocument,
    });

  if (outputValidation.validation_state === "REJECTED") {
    const rejectedDocument: SearchLexicalDocument = {
      ...lexicalDocument,
      validation_state: "REJECTED",
      degradation_reasons: Object.freeze([
        ...degradationReasons,
        ...outputValidation.rejection_reasons,
      ]),
    };

    return Object.freeze(rejectedDocument);
  }

  return Object.freeze(lexicalDocument);
}

/* ============================================================================
 * 14. LEXICAL ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * This pure reader determines whether the document may cross the:
 *
 * Lexical Analysis → Frequency Signal Detection boundary.
 *
 * DEGRADED remains propagable when:
 * - canonical tokens exist;
 * - statistics are coherent;
 * - both canonical indexes exist;
 * - no rejection state is active.
 * ========================================================================== */

export function isSearchLexicalDocumentAccepted(
  lexicalDocument: SearchLexicalDocument,
): boolean {
  return (
    (lexicalDocument.validation_state === "VALID" ||
      lexicalDocument.validation_state === "DEGRADED") &&
    lexicalDocument.token_count > 0 &&
    lexicalDocument.vocabulary_size > 0 &&
    lexicalDocument.term_occurrences.length ===
      lexicalDocument.token_count &&
    lexicalDocument.term_statistics.length ===
      lexicalDocument.vocabulary_size &&
    lexicalDocument.sentence_term_index.length > 0 &&
    lexicalDocument.inverted_term_index.length > 0
  );
}
