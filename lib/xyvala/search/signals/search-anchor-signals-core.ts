/* ============================================================================
 * FILE: lib/xyvala/search/signals/search-anchor-signals-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical intrinsic anchor extraction core
 *
 * ROLE
 * - consume canonical segmented, lexical and frequency signal contracts
 * - validate the Rare Terms Analysis to Anchor Extraction boundary
 * - map selected frequent and rare terms to canonical sentences
 * - extract intrinsic documentary anchors without retokenization
 * - classify anchors according to the official SearchAnchorKind contract
 * - calculate local anchor convergence from observable upstream evidence
 * - calculate deterministic document-position weight
 * - preserve document, sentence, term and source-feature lineage
 * - produce the canonical SearchAnchorSignals contract
 *
 * CLASSIFICATION
 * - PRIVATE SEARCH ENGINE
 * - ANCHOR EXTRACTION
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 * - DETERMINISTIC
 *
 * PARENTS
 * - Xyvala Search official protocol
 * - Search pipeline canonical contract
 * - Search segmentation core
 * - Search lexical analysis core
 * - Search frequency signals core
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Search context aggregation engine
 * - Search intrinsic anchor scorer
 * - Search convergence scorer
 * - Search query-document signal detector
 * - Search scoring input assembler
 * - Search private snapshot builder
 * - Search audit and observability adapters
 *
 * DIRECTIVES
 * - consume canonical upstream contracts only
 * - use SearchSegmentedDocument as sentence source of truth
 * - use SearchLexicalDocument as lexical-index source of truth
 * - use SearchFrequencySignals as selected-term source of truth
 * - never read raw document content
 * - never read extracted document content directly
 * - never retokenize
 * - never renormalize terms
 * - never recount document-level occurrences
 * - never rebuild frequent-term or rare-term selections
 * - never reconstruct a missing sentence relation
 * - never produce query-relative relevance
 * - never aggregate document-level context
 * - never calculate the global document score
 * - never calibrate weights
 * - never rank documents
 * - never produce BLOCK, WATCH or ALLOW
 * - never expose a public projection
 * - no network access
 * - no file-system access
 * - no database access
 * - no queue access
 * - no cache mutation
 * - no event publication
 * - no implicit timestamp generation
 * - no random identifiers
 * - no random ordering
 * - no silent correction of invalid upstream evidence
 *
 * INPUTS
 * - canonical SearchSegmentedDocument
 * - canonical SearchLexicalDocument
 * - canonical SearchFrequencySignals
 * - explicit anchor extraction timestamp
 * - optional explicit anchor extraction policy
 * - optional explicit detector module version
 *
 * OUTPUTS
 * - canonical SearchAnchorSignals
 *
 * INVARIANTS
 * - identical inputs, timestamp, policy and versions produce identical outputs
 * - every anchor references one existing canonical sentence
 * - every anchor identifier is deterministic
 * - every matched term comes from SearchFrequencySignals
 * - every term-to-sentence relation comes from the lexical inverted index
 * - no sentence is emitted more than once
 * - frequent and rare term identities remain distinct
 * - local_convergence_score remains within zero and one
 * - position_weight remains within zero and one
 * - anchor ordering follows canonical sentence ordering
 * - input contracts are never mutated
 * - rejected upstream truth never becomes valid anchor truth
 * - missing upstream evidence is never reconstructed
 *
 * CRITICAL DEPENDENCIES
 * - search-pipeline-contract.ts
 *
 * SENSITIVE AREAS
 * - cross-contract document identity
 * - sentence lineage
 * - selected-term lineage
 * - inverted-index integrity
 * - deterministic anchor identifiers
 * - anchor-kind classification
 * - local convergence calculation
 * - document-position weighting
 * - deterministic ordering
 * ========================================================================== */

import type {
  SearchAnchorId,
  SearchAnchorKind,
  SearchAnchorSignal,
  SearchAnchorSignals,
  SearchContractVersion,
  SearchDocumentId,
  SearchFrequencySignals,
  SearchIsoTimestamp,
  SearchLexicalDocument,
  SearchModuleVersion,
  SearchSegmentedDocument,
  SearchSentence,
  SearchSentenceId,
  SearchValidationState,
  SearchWeight,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE CONSTANTS
 * ========================================================================== */

export const XYVALA_SEARCH_ANCHOR_SIGNALS_CONTRACT_VERSION =
  "1.0.0" satisfies SearchContractVersion;

export const XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_NAME =
  "xyvala-search-anchor-signals-core" as const;

export const XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_VERSION =
  "1.0.0" satisfies SearchModuleVersion;

export const XYVALA_SEARCH_ANCHOR_DETECTION_METHOD =
  "CANONICAL_SELECTED_TERM_SENTENCE_MAPPING_V1";

export const XYVALA_SEARCH_ANCHOR_POLICY_VERSION =
  "INTRINSIC_ANCHOR_EXTRACTION_POLICY_V1";

export const XYVALA_SEARCH_DEFAULT_MINIMUM_MATCHED_TERM_COUNT =
  1;

export const XYVALA_SEARCH_DEFAULT_MINIMUM_CONVERGENT_TERM_COUNT =
  2;

/* ============================================================================
 * 2. SOURCE FEATURE IDENTITIES
 * ----------------------------------------------------------------------------
 * These names describe the canonical upstream evidence used to produce each
 * anchor. They are lineage references, not executable paths.
 * ========================================================================== */

const SEARCH_ANCHOR_SOURCE_FEATURES = Object.freeze([
  "SearchSegmentedDocument.sentences",
  "SearchLexicalDocument.sentence_term_index",
  "SearchLexicalDocument.inverted_term_index",
  "SearchFrequencySignals.frequent_terms",
  "SearchFrequencySignals.rare_terms",
] as const);

/* ============================================================================
 * 3. POLICY AND INPUT CONTRACTS
 * ----------------------------------------------------------------------------
 * Policy remains private execution input.
 *
 * It is not added to SearchAnchorSignals because the current canonical
 * SearchAnchorSignals contract does not expose an anchor policy version.
 * The method and module version remain the official output trace fields.
 * ========================================================================== */

export interface SearchAnchorDetectionPolicy {
  readonly policy_version: string;

  /**
   * Minimum number of unique selected terms required for a sentence to become
   * an intrinsic anchor.
   */
  readonly minimum_matched_term_count: number;

  /**
   * Minimum total number of unique selected terms required for a sentence
   * containing both frequent and rare terms to become a convergence anchor.
   */
  readonly minimum_convergent_term_count: number;

  /**
   * Preserves canonical sentence order in the output.
   */
  readonly preserve_source_order: boolean;
}

export interface SearchAnchorSignalsInput {
  readonly segmented_document: SearchSegmentedDocument;
  readonly lexical_document: SearchLexicalDocument;
  readonly frequency_signals: SearchFrequencySignals;

  /**
   * Must be supplied explicitly. This module never generates a timestamp.
   */
  readonly created_at: SearchIsoTimestamp;

  readonly detection_policy?: SearchAnchorDetectionPolicy;
  readonly detector_module_version?: SearchModuleVersion;
}

/* ============================================================================
 * 4. VALIDATION AND DEGRADATION IDENTITIES
 * ========================================================================== */

export type SearchAnchorSignalsRejectionReason =
  | "SEGMENTED_DOCUMENT_REJECTED"
  | "LEXICAL_DOCUMENT_REJECTED"
  | "FREQUENCY_SIGNALS_REJECTED"
  | "DOCUMENT_ID_EMPTY"
  | "DOCUMENT_ID_MISMATCH"
  | "SENTENCE_COLLECTION_EMPTY"
  | "SENTENCE_COUNT_MISMATCH"
  | "DUPLICATE_SENTENCE_ID"
  | "SENTENCE_TERM_INDEX_EMPTY"
  | "SENTENCE_TERM_INDEX_MISMATCH"
  | "INVERTED_TERM_INDEX_EMPTY"
  | "FREQUENT_TERM_COLLECTION_EMPTY"
  | "RARE_TERM_COLLECTION_EMPTY"
  | "DUPLICATE_FREQUENT_TERM"
  | "DUPLICATE_RARE_TERM"
  | "FREQUENT_RARE_TERM_OVERLAP"
  | "SELECTED_TERM_MISSING_FROM_INVERTED_INDEX"
  | "INVERTED_INDEX_SENTENCE_MISSING"
  | "CREATED_AT_INVALID"
  | "CREATED_AT_BEFORE_SEGMENTATION"
  | "CREATED_AT_BEFORE_LEXICAL_ANALYSIS"
  | "CREATED_AT_BEFORE_FREQUENCY_SIGNALS"
  | "POLICY_VERSION_EMPTY"
  | "MINIMUM_MATCHED_TERM_COUNT_INVALID"
  | "MINIMUM_CONVERGENT_TERM_COUNT_INVALID"
  | "DETECTOR_MODULE_VERSION_EMPTY"
  | "NO_ANCHORS_PRODUCED"
  | "ANCHOR_COUNT_MISMATCH"
  | "DUPLICATE_ANCHOR_ID"
  | "DUPLICATE_ANCHOR_SENTENCE"
  | "ANCHOR_ID_INVALID"
  | "ANCHOR_SENTENCE_MISSING"
  | "ANCHOR_SENTENCE_TEXT_MISMATCH"
  | "ANCHOR_TERM_LINEAGE_INVALID"
  | "ANCHOR_KIND_INVALID"
  | "ANCHOR_SCORE_INVALID"
  | "ANCHOR_POSITION_WEIGHT_INVALID"
  | "ANCHOR_SOURCE_FEATURES_EMPTY"
  | "ANCHOR_ORDER_INVALID";

export type SearchAnchorSignalsDegradationReason =
  | "UPSTREAM_SEGMENTATION_DEGRADED"
  | "UPSTREAM_LEXICAL_ANALYSIS_DEGRADED"
  | "UPSTREAM_FREQUENCY_SIGNALS_DEGRADED"
  | "LOCAL_RARITY_EVIDENCE_ONLY"
  | "SOME_SELECTED_TERMS_HAVE_NO_SENTENCE_MATCH"
  | "NO_FREQUENT_RARE_CONVERGENCE_ANCHOR"
  | "ONLY_FREQUENT_TERM_ANCHORS"
  | "ONLY_RARE_TERM_ANCHORS"
  | "LOW_ANCHOR_SENTENCE_COVERAGE";

export interface SearchAnchorSignalsValidationResult {
  readonly validation_state: SearchValidationState;
  readonly rejection_reasons:
    readonly SearchAnchorSignalsRejectionReason[];
}

/* ============================================================================
 * 5. INTERNAL COMPUTE TYPES
 * ========================================================================== */

interface SearchAnchorSentenceAccumulator {
  readonly sentence_id: SearchSentenceId;
  readonly matched_frequent_terms: Set<string>;
  readonly matched_rare_terms: Set<string>;
}

interface SearchAnchorBuildContext {
  readonly sentence_by_id: ReadonlyMap<SearchSentenceId, SearchSentence>;

  readonly sentence_ordinal_by_id: ReadonlyMap<
    SearchSentenceId,
    number
  >;

  readonly sentence_terms_by_id: ReadonlyMap<
    SearchSentenceId,
    readonly string[]
  >;

  readonly inverted_sentence_ids_by_term: ReadonlyMap<
    string,
    readonly SearchSentenceId[]
  >;
}

interface SearchAnchorMappingResult {
  readonly accumulators: ReadonlyMap<
    SearchSentenceId,
    SearchAnchorSentenceAccumulator
  >;

  readonly unmatched_selected_terms: readonly string[];
}

interface SearchAnchorConvergenceComponents {
  readonly frequent_coverage_ratio: number;
  readonly rare_coverage_ratio: number;
  readonly group_balance_ratio: number;
  readonly selected_term_density_ratio: number;
  readonly local_convergence_score: number;
}

/* ============================================================================
 * 6. DEFAULT POLICY
 * ========================================================================== */

export const XYVALA_SEARCH_DEFAULT_ANCHOR_DETECTION_POLICY:
  SearchAnchorDetectionPolicy = Object.freeze({
    policy_version: XYVALA_SEARCH_ANCHOR_POLICY_VERSION,

    minimum_matched_term_count:
      XYVALA_SEARCH_DEFAULT_MINIMUM_MATCHED_TERM_COUNT,

    minimum_convergent_term_count:
      XYVALA_SEARCH_DEFAULT_MINIMUM_CONVERGENT_TERM_COUNT,

    preserve_source_order: true,
  });

/* ============================================================================
 * 7. LOW-LEVEL DETERMINISTIC HELPERS
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

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isUnitIntervalNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function clampUnitInterval(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function divideOrZero(
  numerator: number,
  denominator: number,
): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0;
  }

  return clampUnitInterval(numerator / denominator);
}

function compareCanonicalStrings(
  left: string,
  right: string,
): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function resolveSearchAnchorDetectionPolicy(
  policy: SearchAnchorDetectionPolicy | undefined,
): SearchAnchorDetectionPolicy {
  if (!policy) {
    return XYVALA_SEARCH_DEFAULT_ANCHOR_DETECTION_POLICY;
  }

  return Object.freeze({
    policy_version: policy.policy_version,

    minimum_matched_term_count:
      policy.minimum_matched_term_count,

    minimum_convergent_term_count:
      policy.minimum_convergent_term_count,

    preserve_source_order: policy.preserve_source_order,
  });
}

/* ============================================================================
 * 8. DETERMINISTIC ANCHOR ID
 * ----------------------------------------------------------------------------
 * Anchor identifiers derive only from canonical document and sentence
 * identities.
 *
 * No UUID, random value, clock value or mutable counter is authorized.
 * ========================================================================== */

export function buildSearchAnchorId(input: {
  readonly document_id: SearchDocumentId;
  readonly sentence_id: SearchSentenceId;
}): SearchAnchorId {
  return `search-anchor:${input.document_id}:${input.sentence_id}`;
}

/* ============================================================================
 * 9. CANONICAL LOOKUP CONTEXT
 * ----------------------------------------------------------------------------
 * This function creates read-only lookup structures from canonical arrays.
 *
 * It performs no:
 * - tokenization;
 * - normalization;
 * - occurrence recount;
 * - selected-term reconstruction.
 * ========================================================================== */

function buildSearchAnchorContext(input: {
  readonly segmented_document: SearchSegmentedDocument;
  readonly lexical_document: SearchLexicalDocument;
}): SearchAnchorBuildContext {
  const sentenceById = new Map<
    SearchSentenceId,
    SearchSentence
  >();

  const sentenceOrdinalById = new Map<
    SearchSentenceId,
    number
  >();

  for (const sentence of input.segmented_document.sentences) {
    sentenceById.set(sentence.sentence_id, sentence);

    sentenceOrdinalById.set(
      sentence.sentence_id,
      sentence.ordinal_position,
    );
  }

  const sentenceTermsById = new Map<
    SearchSentenceId,
    readonly string[]
  >();

  for (
    const sentenceTermEntry of
      input.lexical_document.sentence_term_index
  ) {
    sentenceTermsById.set(
      sentenceTermEntry.sentence_id,
      sentenceTermEntry.normalized_terms,
    );
  }

  const invertedSentenceIdsByTerm = new Map<
    string,
    readonly SearchSentenceId[]
  >();

  for (
    const invertedTermEntry of
      input.lexical_document.inverted_term_index
  ) {
    invertedSentenceIdsByTerm.set(
      invertedTermEntry.normalized_term,
      invertedTermEntry.sentence_ids,
    );
  }

  return Object.freeze({
    sentence_by_id: sentenceById,
    sentence_ordinal_by_id: sentenceOrdinalById,
    sentence_terms_by_id: sentenceTermsById,
    inverted_sentence_ids_by_term:
      invertedSentenceIdsByTerm,
  });
}

/* ============================================================================
 * 10. SELECTED TERM READERS
 * ----------------------------------------------------------------------------
 * These readers preserve the selections produced by Frequency Signal
 * Detection. They do not change term identity or order.
 * ========================================================================== */

function getSelectedFrequentTerms(
  frequencySignals: SearchFrequencySignals,
): readonly string[] {
  return Object.freeze(
    frequencySignals.frequent_terms.map(
      (signal) => signal.normalized_term,
    ),
  );
}

function getSelectedRareTerms(
  frequencySignals: SearchFrequencySignals,
): readonly string[] {
  return Object.freeze(
    frequencySignals.rare_terms.map(
      (signal) => signal.normalized_term,
    ),
  );
}

/* ============================================================================
 * 11. INPUT BOUNDARY VALIDATION
 * ----------------------------------------------------------------------------
 * Boundary:
 *
 * SearchSegmentedDocument
 * + SearchLexicalDocument
 * + SearchFrequencySignals
 * → SearchAnchorSignals
 *
 * Validation qualifies the boundary. It never repairs upstream truth.
 * ========================================================================== */

export function validateSearchAnchorSignalsInput(
  input: SearchAnchorSignalsInput,
): SearchAnchorSignalsValidationResult {
  const rejectionReasons =
    new Set<SearchAnchorSignalsRejectionReason>();

  const segmentedDocument = input.segmented_document;
  const lexicalDocument = input.lexical_document;
  const frequencySignals = input.frequency_signals;

  const policy = resolveSearchAnchorDetectionPolicy(
    input.detection_policy,
  );

  if (
    segmentedDocument.validation_state !== "VALID" &&
    segmentedDocument.validation_state !== "DEGRADED"
  ) {
    rejectionReasons.add("SEGMENTED_DOCUMENT_REJECTED");
  }

  if (
    lexicalDocument.validation_state !== "VALID" &&
    lexicalDocument.validation_state !== "DEGRADED"
  ) {
    rejectionReasons.add("LEXICAL_DOCUMENT_REJECTED");
  }

  if (
    frequencySignals.validation_state !== "VALID" &&
    frequencySignals.validation_state !== "DEGRADED"
  ) {
    rejectionReasons.add("FREQUENCY_SIGNALS_REJECTED");
  }

  if (
    !isNonEmptyString(segmentedDocument.document_id) ||
    !isNonEmptyString(lexicalDocument.document_id) ||
    !isNonEmptyString(frequencySignals.document_id)
  ) {
    rejectionReasons.add("DOCUMENT_ID_EMPTY");
  }

  if (
    segmentedDocument.document_id !== lexicalDocument.document_id ||
    segmentedDocument.document_id !== frequencySignals.document_id
  ) {
    rejectionReasons.add("DOCUMENT_ID_MISMATCH");
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

  const canonicalSentenceIds =
    new Set<SearchSentenceId>();

  for (const sentence of segmentedDocument.sentences) {
    if (canonicalSentenceIds.has(sentence.sentence_id)) {
      rejectionReasons.add("DUPLICATE_SENTENCE_ID");
    }

    canonicalSentenceIds.add(sentence.sentence_id);
  }

  if (lexicalDocument.sentence_term_index.length === 0) {
    rejectionReasons.add("SENTENCE_TERM_INDEX_EMPTY");
  }

  if (
    lexicalDocument.sentence_term_index.length !==
    segmentedDocument.sentences.length
  ) {
    rejectionReasons.add("SENTENCE_TERM_INDEX_MISMATCH");
  }

  for (
    const sentenceTermEntry of
      lexicalDocument.sentence_term_index
  ) {
    if (
      !canonicalSentenceIds.has(
        sentenceTermEntry.sentence_id,
      )
    ) {
      rejectionReasons.add("SENTENCE_TERM_INDEX_MISMATCH");
    }
  }

  if (lexicalDocument.inverted_term_index.length === 0) {
    rejectionReasons.add("INVERTED_TERM_INDEX_EMPTY");
  }

  if (frequencySignals.frequent_terms.length === 0) {
    rejectionReasons.add(
      "FREQUENT_TERM_COLLECTION_EMPTY",
    );
  }

  if (frequencySignals.rare_terms.length === 0) {
    rejectionReasons.add("RARE_TERM_COLLECTION_EMPTY");
  }

  const frequentTerms = new Set<string>();
  const rareTerms = new Set<string>();

  for (const signal of frequencySignals.frequent_terms) {
    if (frequentTerms.has(signal.normalized_term)) {
      rejectionReasons.add("DUPLICATE_FREQUENT_TERM");
    }

    frequentTerms.add(signal.normalized_term);
  }

  for (const signal of frequencySignals.rare_terms) {
    if (rareTerms.has(signal.normalized_term)) {
      rejectionReasons.add("DUPLICATE_RARE_TERM");
    }

    rareTerms.add(signal.normalized_term);
  }

  for (const frequentTerm of frequentTerms) {
    if (rareTerms.has(frequentTerm)) {
      rejectionReasons.add("FREQUENT_RARE_TERM_OVERLAP");
    }
  }

  const invertedIndex = new Map<
    string,
    readonly SearchSentenceId[]
  >(
    lexicalDocument.inverted_term_index.map(
      (entry) =>
        [
          entry.normalized_term,
          entry.sentence_ids,
        ] as const,
    ),
  );

  for (const selectedTerm of [
    ...frequentTerms,
    ...rareTerms,
  ]) {
    const indexedSentenceIds =
      invertedIndex.get(selectedTerm);

    if (!indexedSentenceIds) {
      rejectionReasons.add(
        "SELECTED_TERM_MISSING_FROM_INVERTED_INDEX",
      );

      continue;
    }

    for (const sentenceId of indexedSentenceIds) {
      if (!canonicalSentenceIds.has(sentenceId)) {
        rejectionReasons.add(
          "INVERTED_INDEX_SENTENCE_MISSING",
        );
      }
    }
  }

  const createdAtValid = isValidIsoTimestamp(
    input.created_at,
  );

  if (!createdAtValid) {
    rejectionReasons.add("CREATED_AT_INVALID");
  }

  if (
    createdAtValid &&
    isValidIsoTimestamp(segmentedDocument.created_at) &&
    Date.parse(input.created_at) <
      Date.parse(segmentedDocument.created_at)
  ) {
    rejectionReasons.add(
      "CREATED_AT_BEFORE_SEGMENTATION",
    );
  }

  if (
    createdAtValid &&
    isValidIsoTimestamp(lexicalDocument.created_at) &&
    Date.parse(input.created_at) <
      Date.parse(lexicalDocument.created_at)
  ) {
    rejectionReasons.add(
      "CREATED_AT_BEFORE_LEXICAL_ANALYSIS",
    );
  }

  if (
    createdAtValid &&
    isValidIsoTimestamp(frequencySignals.created_at) &&
    Date.parse(input.created_at) <
      Date.parse(frequencySignals.created_at)
  ) {
    rejectionReasons.add(
      "CREATED_AT_BEFORE_FREQUENCY_SIGNALS",
    );
  }

  if (!isNonEmptyString(policy.policy_version)) {
    rejectionReasons.add("POLICY_VERSION_EMPTY");
  }

  if (
    !isPositiveInteger(
      policy.minimum_matched_term_count,
    )
  ) {
    rejectionReasons.add(
      "MINIMUM_MATCHED_TERM_COUNT_INVALID",
    );
  }

  if (
    !isPositiveInteger(
      policy.minimum_convergent_term_count,
    )
  ) {
    rejectionReasons.add(
      "MINIMUM_CONVERGENT_TERM_COUNT_INVALID",
    );
  }

  const detectorModuleVersion =
    input.detector_module_version ??
    XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_VERSION;

  if (!isNonEmptyString(detectorModuleVersion)) {
    rejectionReasons.add("DETECTOR_MODULE_VERSION_EMPTY");
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.size === 0 ? "VALID" : "REJECTED",

    rejection_reasons: Object.freeze([
      ...rejectionReasons,
    ]),
  });
}

/* ============================================================================
 * 12. SELECTED TERM → SENTENCE MAPPING
 * ----------------------------------------------------------------------------
 * Mapping consumes the existing inverted index only.
 *
 * It never scans sentence text for term presence.
 * ========================================================================== */

function collectSearchAnchorSentenceAccumulators(input: {
  readonly context: SearchAnchorBuildContext;
  readonly frequent_terms: readonly string[];
  readonly rare_terms: readonly string[];
}): SearchAnchorMappingResult {
  const accumulators = new Map<
    SearchSentenceId,
    SearchAnchorSentenceAccumulator
  >();

  const unmatchedSelectedTerms = new Set<string>();

  const registerSelectedTerm = (
    normalizedTerm: string,
    signalKind: "FREQUENT" | "RARE",
  ): void => {
    const sentenceIds =
      input.context.inverted_sentence_ids_by_term.get(
        normalizedTerm,
      );

    if (!sentenceIds || sentenceIds.length === 0) {
      unmatchedSelectedTerms.add(normalizedTerm);
      return;
    }

    for (const sentenceId of sentenceIds) {
      const existingAccumulator =
        accumulators.get(sentenceId);

      if (existingAccumulator) {
        if (signalKind === "FREQUENT") {
          existingAccumulator.matched_frequent_terms.add(
            normalizedTerm,
          );
        } else {
          existingAccumulator.matched_rare_terms.add(
            normalizedTerm,
          );
        }

        continue;
      }

      accumulators.set(sentenceId, {
        sentence_id: sentenceId,

        matched_frequent_terms:
          signalKind === "FREQUENT"
            ? new Set([normalizedTerm])
            : new Set<string>(),

        matched_rare_terms:
          signalKind === "RARE"
            ? new Set([normalizedTerm])
            : new Set<string>(),
      });
    }
  };

  for (const frequentTerm of input.frequent_terms) {
    registerSelectedTerm(frequentTerm, "FREQUENT");
  }

  for (const rareTerm of input.rare_terms) {
    registerSelectedTerm(rareTerm, "RARE");
  }

  return Object.freeze({
    accumulators,

    unmatched_selected_terms: Object.freeze(
      [...unmatchedSelectedTerms].sort(
        compareCanonicalStrings,
      ),
    ),
  });
}

/* ============================================================================
 * 13. ANCHOR KIND RESOLUTION
 * ----------------------------------------------------------------------------
 * Official contract identities:
 *
 * - FREQUENT_TERM
 * - RARE_TERM
 * - FREQUENT_RARE_CONVERGENCE
 * ========================================================================== */

function resolveSearchAnchorKind(input: {
  readonly frequent_match_count: number;
  readonly rare_match_count: number;
  readonly total_match_count: number;
  readonly minimum_convergent_term_count: number;
}): SearchAnchorKind {
  const hasFrequentTerms =
    input.frequent_match_count > 0;

  const hasRareTerms = input.rare_match_count > 0;

  if (
    hasFrequentTerms &&
    hasRareTerms &&
    input.total_match_count >=
      input.minimum_convergent_term_count
  ) {
    return "FREQUENT_RARE_CONVERGENCE";
  }

  if (hasFrequentTerms) {
    return "FREQUENT_TERM";
  }

  return "RARE_TERM";
}

/* ============================================================================
 * 14. LOCAL CONVERGENCE CALCULATION
 * ----------------------------------------------------------------------------
 * local_convergence_score is an intrinsic sentence-level measure.
 *
 * It is not:
 * - SearchSubScore.convergence_score;
 * - SearchGlobalScore;
 * - a query relevance score;
 * - a ranking value;
 * - a private decision.
 *
 * Components:
 * - frequent selected-term coverage: 35%
 * - rare selected-term coverage: 35%
 * - balance between both groups: 20%
 * - selected-term density in the sentence: 10%
 *
 * The component weights are private implementation parameters of this module.
 * They do not become public projection data.
 * ========================================================================== */

function computeSearchAnchorLocalConvergence(input: {
  readonly frequent_match_count: number;
  readonly rare_match_count: number;

  readonly available_frequent_term_count: number;
  readonly available_rare_term_count: number;

  readonly unique_sentence_term_count: number;
}): SearchAnchorConvergenceComponents {
  const frequentCoverageRatio = divideOrZero(
    input.frequent_match_count,
    input.available_frequent_term_count,
  );

  const rareCoverageRatio = divideOrZero(
    input.rare_match_count,
    input.available_rare_term_count,
  );

  const selectedTermCount =
    input.frequent_match_count +
    input.rare_match_count;

  const selectedTermDensityRatio = divideOrZero(
    selectedTermCount,
    input.unique_sentence_term_count,
  );

  const groupBalanceRatio =
    input.frequent_match_count > 0 &&
    input.rare_match_count > 0
      ? clampUnitInterval(
          1 -
            Math.abs(
              frequentCoverageRatio -
                rareCoverageRatio,
            ),
        )
      : 0;

  const localConvergenceScore = clampUnitInterval(
    frequentCoverageRatio * 0.35 +
      rareCoverageRatio * 0.35 +
      groupBalanceRatio * 0.2 +
      selectedTermDensityRatio * 0.1,
  );

  return Object.freeze({
    frequent_coverage_ratio: frequentCoverageRatio,
    rare_coverage_ratio: rareCoverageRatio,
    group_balance_ratio: groupBalanceRatio,
    selected_term_density_ratio:
      selectedTermDensityRatio,
    local_convergence_score: localConvergenceScore,
  });
}

/* ============================================================================
 * 15. POSITION WEIGHT
 * ----------------------------------------------------------------------------
 * V0 position weight is deterministic and monotonic.
 *
 * Earlier sentences receive a stronger intrinsic position weight.
 * No title, heading or semantic interpretation is reconstructed here.
 * ========================================================================== */

function computeSearchAnchorPositionWeight(input: {
  readonly ordinal_position: number;
  readonly sentence_count: number;
}): SearchWeight {
  if (
    !isNonNegativeInteger(input.ordinal_position) ||
    !isPositiveInteger(input.sentence_count)
  ) {
    return 0;
  }

  if (input.sentence_count === 1) {
    return 1;
  }

  return clampUnitInterval(
    1 -
      input.ordinal_position /
        input.sentence_count,
  );
}

/* ============================================================================
 * 16. CANONICAL ANCHOR ASSEMBLY
 * ========================================================================== */

function buildCanonicalSearchAnchors(input: {
  readonly document_id: SearchDocumentId;
  readonly sentence_count: number;

  readonly context: SearchAnchorBuildContext;

  readonly accumulators: ReadonlyMap<
    SearchSentenceId,
    SearchAnchorSentenceAccumulator
  >;

  readonly frequent_term_count: number;
  readonly rare_term_count: number;

  readonly policy: SearchAnchorDetectionPolicy;
}): readonly SearchAnchorSignal[] {
  const anchors: SearchAnchorSignal[] = [];

  for (const accumulator of input.accumulators.values()) {
    const sentence = input.context.sentence_by_id.get(
      accumulator.sentence_id,
    );

    if (!sentence) {
      /**
       * The boundary validator already rejects this inconsistency.
       * No sentence is reconstructed here.
       */
      continue;
    }

    const matchedFrequentTerms = [
      ...accumulator.matched_frequent_terms,
    ].sort(compareCanonicalStrings);

    const matchedRareTerms = [
      ...accumulator.matched_rare_terms,
    ].sort(compareCanonicalStrings);

    const totalMatchedTermCount =
      matchedFrequentTerms.length +
      matchedRareTerms.length;

    if (
      totalMatchedTermCount <
      input.policy.minimum_matched_term_count
    ) {
      continue;
    }

    const canonicalSentenceTerms =
      input.context.sentence_terms_by_id.get(
        sentence.sentence_id,
      ) ?? Object.freeze([]);

    const uniqueSentenceTerms = new Set(
      canonicalSentenceTerms,
    );

    const convergence =
      computeSearchAnchorLocalConvergence({
        frequent_match_count:
          matchedFrequentTerms.length,

        rare_match_count:
          matchedRareTerms.length,

        available_frequent_term_count:
          input.frequent_term_count,

        available_rare_term_count:
          input.rare_term_count,

        unique_sentence_term_count:
          uniqueSentenceTerms.size,
      });

    const anchorKind = resolveSearchAnchorKind({
      frequent_match_count:
        matchedFrequentTerms.length,

      rare_match_count:
        matchedRareTerms.length,

      total_match_count:
        totalMatchedTermCount,

      minimum_convergent_term_count:
        input.policy.minimum_convergent_term_count,
    });

    const anchor: SearchAnchorSignal = Object.freeze({
      anchor_id: buildSearchAnchorId({
        document_id: input.document_id,
        sentence_id: sentence.sentence_id,
      }),

      sentence_id: sentence.sentence_id,
      sentence_text: sentence.text,

      anchor_kind: anchorKind,

      matched_frequent_terms: Object.freeze(
        matchedFrequentTerms,
      ),

      matched_rare_terms: Object.freeze(
        matchedRareTerms,
      ),

      local_convergence_score:
        convergence.local_convergence_score,

      position_weight:
        computeSearchAnchorPositionWeight({
          ordinal_position:
            sentence.ordinal_position,

          sentence_count:
            input.sentence_count,
        }),

      source_features: SEARCH_ANCHOR_SOURCE_FEATURES,
    });

    anchors.push(anchor);
  }

  if (!input.policy.preserve_source_order) {
    return Object.freeze(
      [...anchors].sort((left, right) =>
        compareCanonicalStrings(
          left.anchor_id,
          right.anchor_id,
        ),
      ),
    );
  }

  return Object.freeze(
    [...anchors].sort((left, right) => {
      const leftOrdinal =
        input.context.sentence_ordinal_by_id.get(
          left.sentence_id,
        );

      const rightOrdinal =
        input.context.sentence_ordinal_by_id.get(
          right.sentence_id,
        );

      if (
        leftOrdinal === undefined ||
        rightOrdinal === undefined
      ) {
        return compareCanonicalStrings(
          left.anchor_id,
          right.anchor_id,
        );
      }

      if (leftOrdinal !== rightOrdinal) {
        return leftOrdinal - rightOrdinal;
      }

      return compareCanonicalStrings(
        left.anchor_id,
        right.anchor_id,
      );
    }),
  );
}

/* ============================================================================
 * 17. OUTPUT INVARIANT VALIDATION
 * ========================================================================== */

export function validateSearchAnchorSignalsOutput(input: {
  readonly segmented_document: SearchSegmentedDocument;
  readonly frequency_signals: SearchFrequencySignals;
  readonly anchor_signals: SearchAnchorSignals;
}): SearchAnchorSignalsValidationResult {
  const rejectionReasons =
    new Set<SearchAnchorSignalsRejectionReason>();

  const sentenceById = new Map<
    SearchSentenceId,
    SearchSentence
  >(
    input.segmented_document.sentences.map(
      (sentence) =>
        [sentence.sentence_id, sentence] as const,
    ),
  );

  const frequentTerms = new Set(
    getSelectedFrequentTerms(
      input.frequency_signals,
    ),
  );

  const rareTerms = new Set(
    getSelectedRareTerms(
      input.frequency_signals,
    ),
  );

  const emittedAnchorIds = new Set<SearchAnchorId>();

  const emittedSentenceIds =
    new Set<SearchSentenceId>();

  let previousOrdinalPosition = -1;

  if (input.anchor_signals.anchors.length === 0) {
    rejectionReasons.add("NO_ANCHORS_PRODUCED");
  }

  if (
    input.anchor_signals.anchor_count !==
    input.anchor_signals.anchors.length
  ) {
    rejectionReasons.add("ANCHOR_COUNT_MISMATCH");
  }

  for (const anchor of input.anchor_signals.anchors) {
    const sentence = sentenceById.get(
      anchor.sentence_id,
    );

    if (!sentence) {
      rejectionReasons.add("ANCHOR_SENTENCE_MISSING");
      continue;
    }

    const expectedAnchorId = buildSearchAnchorId({
      document_id: input.anchor_signals.document_id,
      sentence_id: anchor.sentence_id,
    });

    if (
      !isNonEmptyString(anchor.anchor_id) ||
      anchor.anchor_id !== expectedAnchorId
    ) {
      rejectionReasons.add("ANCHOR_ID_INVALID");
    }

    if (emittedAnchorIds.has(anchor.anchor_id)) {
      rejectionReasons.add("DUPLICATE_ANCHOR_ID");
    }

    emittedAnchorIds.add(anchor.anchor_id);

    if (emittedSentenceIds.has(anchor.sentence_id)) {
      rejectionReasons.add(
        "DUPLICATE_ANCHOR_SENTENCE",
      );
    }

    emittedSentenceIds.add(anchor.sentence_id);

    if (sentence.text !== anchor.sentence_text) {
      rejectionReasons.add(
        "ANCHOR_SENTENCE_TEXT_MISMATCH",
      );
    }

    if (
      sentence.ordinal_position <
      previousOrdinalPosition
    ) {
      rejectionReasons.add("ANCHOR_ORDER_INVALID");
    }

    previousOrdinalPosition =
      sentence.ordinal_position;

    const matchedFrequentTerms = new Set(
      anchor.matched_frequent_terms,
    );

    const matchedRareTerms = new Set(
      anchor.matched_rare_terms,
    );

    if (
      matchedFrequentTerms.size !==
      anchor.matched_frequent_terms.length
    ) {
      rejectionReasons.add(
        "ANCHOR_TERM_LINEAGE_INVALID",
      );
    }

    if (
      matchedRareTerms.size !==
      anchor.matched_rare_terms.length
    ) {
      rejectionReasons.add(
        "ANCHOR_TERM_LINEAGE_INVALID",
      );
    }

    for (
      const matchedFrequentTerm of
        anchor.matched_frequent_terms
    ) {
      if (!frequentTerms.has(matchedFrequentTerm)) {
        rejectionReasons.add(
          "ANCHOR_TERM_LINEAGE_INVALID",
        );
      }

      if (matchedRareTerms.has(matchedFrequentTerm)) {
        rejectionReasons.add(
          "ANCHOR_TERM_LINEAGE_INVALID",
        );
      }
    }

    for (
      const matchedRareTerm of
        anchor.matched_rare_terms
    ) {
      if (!rareTerms.has(matchedRareTerm)) {
        rejectionReasons.add(
          "ANCHOR_TERM_LINEAGE_INVALID",
        );
      }
    }

    if (
      anchor.anchor_kind === "FREQUENT_TERM" &&
      (anchor.matched_frequent_terms.length === 0 ||
        anchor.matched_rare_terms.length > 0)
    ) {
      rejectionReasons.add("ANCHOR_KIND_INVALID");
    }

    if (
      anchor.anchor_kind === "RARE_TERM" &&
      (anchor.matched_rare_terms.length === 0 ||
        anchor.matched_frequent_terms.length > 0)
    ) {
      rejectionReasons.add("ANCHOR_KIND_INVALID");
    }

    if (
      anchor.anchor_kind ===
        "FREQUENT_RARE_CONVERGENCE" &&
      (anchor.matched_frequent_terms.length === 0 ||
        anchor.matched_rare_terms.length === 0)
    ) {
      rejectionReasons.add("ANCHOR_KIND_INVALID");
    }

    if (
      !isUnitIntervalNumber(
        anchor.local_convergence_score,
      )
    ) {
      rejectionReasons.add("ANCHOR_SCORE_INVALID");
    }

    if (!isUnitIntervalNumber(anchor.position_weight)) {
      rejectionReasons.add(
        "ANCHOR_POSITION_WEIGHT_INVALID",
      );
    }

    if (anchor.source_features.length === 0) {
      rejectionReasons.add(
        "ANCHOR_SOURCE_FEATURES_EMPTY",
      );
    }
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.size === 0 ? "VALID" : "REJECTED",

    rejection_reasons: Object.freeze([
      ...rejectionReasons,
    ]),
  });
}

/* ============================================================================
 * 18. REJECTED CONTRACT BUILDER
 * ----------------------------------------------------------------------------
 * Rejected upstream truth produces an explicit rejected contract.
 *
 * No anchor is fabricated.
 * ========================================================================== */

function buildRejectedSearchAnchorSignals(input: {
  readonly source_input: SearchAnchorSignalsInput;

  readonly rejection_reasons:
    readonly SearchAnchorSignalsRejectionReason[];
}): SearchAnchorSignals {
  const detectorModuleVersion =
    input.source_input.detector_module_version ??
    XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_VERSION;

  const rejectedSignals: SearchAnchorSignals = {
    contract_version:
      XYVALA_SEARCH_ANCHOR_SIGNALS_CONTRACT_VERSION,

    created_at: input.source_input.created_at,

    document_id:
      input.source_input.segmented_document.document_id,

    anchors: Object.freeze([]),
    anchor_count: 0,

    anchor_detection_method:
      XYVALA_SEARCH_ANCHOR_DETECTION_METHOD,

    detector_module_version:
      detectorModuleVersion,

    validation_state: "REJECTED",

    degradation_reasons: Object.freeze([
      ...input.rejection_reasons,
    ]),
  };

  return Object.freeze(rejectedSignals);
}

/* ============================================================================
 * 19. CANONICAL ANCHOR SIGNAL BUILDER
 * ----------------------------------------------------------------------------
 * This is the single canonical producer of SearchAnchorSignals.
 *
 * Downstream modules must not locally redefine:
 * - which sentences are anchors;
 * - anchor identifiers;
 * - anchor kinds;
 * - matched frequent terms;
 * - matched rare terms;
 * - local convergence;
 * - position weight.
 * ========================================================================== */

export function buildSearchAnchorSignals(
  input: SearchAnchorSignalsInput,
): SearchAnchorSignals {
  const policy = resolveSearchAnchorDetectionPolicy(
    input.detection_policy,
  );

  const boundaryValidation =
    validateSearchAnchorSignalsInput(input);

  if (
    boundaryValidation.validation_state === "REJECTED"
  ) {
    return buildRejectedSearchAnchorSignals({
      source_input: input,

      rejection_reasons:
        boundaryValidation.rejection_reasons,
    });
  }

  const context = buildSearchAnchorContext({
    segmented_document: input.segmented_document,
    lexical_document: input.lexical_document,
  });

  const frequentTerms = getSelectedFrequentTerms(
    input.frequency_signals,
  );

  const rareTerms = getSelectedRareTerms(
    input.frequency_signals,
  );

  const mappingResult =
    collectSearchAnchorSentenceAccumulators({
      context,
      frequent_terms: frequentTerms,
      rare_terms: rareTerms,
    });

  const anchors = buildCanonicalSearchAnchors({
    document_id:
      input.segmented_document.document_id,

    sentence_count:
      input.segmented_document.sentence_count,

    context,

    accumulators:
      mappingResult.accumulators,

    frequent_term_count: frequentTerms.length,
    rare_term_count: rareTerms.length,

    policy,
  });

  if (anchors.length === 0) {
    return buildRejectedSearchAnchorSignals({
      source_input: input,

      rejection_reasons: Object.freeze([
        "NO_ANCHORS_PRODUCED",
      ]),
    });
  }

  const degradationReasons =
    new Set<SearchAnchorSignalsDegradationReason>();

  if (
    input.segmented_document.validation_state ===
    "DEGRADED"
  ) {
    degradationReasons.add(
      "UPSTREAM_SEGMENTATION_DEGRADED",
    );
  }

  if (
    input.lexical_document.validation_state ===
    "DEGRADED"
  ) {
    degradationReasons.add(
      "UPSTREAM_LEXICAL_ANALYSIS_DEGRADED",
    );
  }

  if (
    input.frequency_signals.validation_state ===
    "DEGRADED"
  ) {
    degradationReasons.add(
      "UPSTREAM_FREQUENCY_SIGNALS_DEGRADED",
    );
  }

  if (
    input.frequency_signals.rarity_method ===
      "LOCAL_OCCURRENCE" ||
    input.frequency_signals.rarity_method ===
      "LOCAL_FREQUENCY"
  ) {
    degradationReasons.add(
      "LOCAL_RARITY_EVIDENCE_ONLY",
    );
  }

  if (
    mappingResult.unmatched_selected_terms.length > 0
  ) {
    degradationReasons.add(
      "SOME_SELECTED_TERMS_HAVE_NO_SENTENCE_MATCH",
    );
  }

  const hasFrequentTermAnchor = anchors.some(
    (anchor) =>
      anchor.anchor_kind === "FREQUENT_TERM" ||
      anchor.anchor_kind ===
        "FREQUENT_RARE_CONVERGENCE",
  );

  const hasRareTermAnchor = anchors.some(
    (anchor) =>
      anchor.anchor_kind === "RARE_TERM" ||
      anchor.anchor_kind ===
        "FREQUENT_RARE_CONVERGENCE",
  );

  const hasConvergenceAnchor = anchors.some(
    (anchor) =>
      anchor.anchor_kind ===
      "FREQUENT_RARE_CONVERGENCE",
  );

  if (!hasConvergenceAnchor) {
    degradationReasons.add(
      "NO_FREQUENT_RARE_CONVERGENCE_ANCHOR",
    );
  }

  if (
    hasFrequentTermAnchor &&
    !hasRareTermAnchor
  ) {
    degradationReasons.add(
      "ONLY_FREQUENT_TERM_ANCHORS",
    );
  }

  if (
    hasRareTermAnchor &&
    !hasFrequentTermAnchor
  ) {
    degradationReasons.add(
      "ONLY_RARE_TERM_ANCHORS",
    );
  }

  const anchorSentenceCoverageRatio = divideOrZero(
    anchors.length,
    input.segmented_document.sentence_count,
  );

  if (anchorSentenceCoverageRatio < 0.1) {
    degradationReasons.add(
      "LOW_ANCHOR_SENTENCE_COVERAGE",
    );
  }

  const detectorModuleVersion =
    input.detector_module_version ??
    XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_VERSION;

  const anchorSignals: SearchAnchorSignals = {
    contract_version:
      XYVALA_SEARCH_ANCHOR_SIGNALS_CONTRACT_VERSION,

    created_at: input.created_at,

    document_id:
      input.segmented_document.document_id,

    anchors,
    anchor_count: anchors.length,

    anchor_detection_method:
      XYVALA_SEARCH_ANCHOR_DETECTION_METHOD,

    detector_module_version:
      detectorModuleVersion,

    validation_state:
      degradationReasons.size > 0
        ? "DEGRADED"
        : "VALID",

    degradation_reasons: Object.freeze([
      ...degradationReasons,
    ]),
  };

  const outputValidation =
    validateSearchAnchorSignalsOutput({
      segmented_document:
        input.segmented_document,

      frequency_signals:
        input.frequency_signals,

      anchor_signals: anchorSignals,
    });

  if (
    outputValidation.validation_state === "REJECTED"
  ) {
    const rejectedSignals: SearchAnchorSignals = {
      ...anchorSignals,

      validation_state: "REJECTED",

      degradation_reasons: Object.freeze([
        ...degradationReasons,
        ...outputValidation.rejection_reasons,
      ]),
    };

    return Object.freeze(rejectedSignals);
  }

  return Object.freeze(anchorSignals);
}

/* ============================================================================
 * 20. ANCHOR SIGNAL ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * This pure reader determines whether SearchAnchorSignals may cross the:
 *
 * Anchor Extraction → Context Aggregation boundary.
 *
 * DEGRADED remains propagable when canonical anchors exist and the contract
 * remains internally coherent.
 * ========================================================================== */

export function isSearchAnchorSignalsAccepted(
  anchorSignals: SearchAnchorSignals,
): boolean {
  return (
    (anchorSignals.validation_state === "VALID" ||
      anchorSignals.validation_state === "DEGRADED") &&
    anchorSignals.anchors.length > 0 &&
    anchorSignals.anchor_count ===
      anchorSignals.anchors.length
  );
}
