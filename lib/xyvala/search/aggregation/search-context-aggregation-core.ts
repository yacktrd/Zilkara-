/* ============================================================================
 * FILE: lib/xyvala/search/aggregation/search-context-aggregation-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical document context aggregation core
 *
 * ROLE
 * - consume canonical segmented, frequency and anchor signal contracts
 * - validate the Anchor Extraction to Context Aggregation boundary
 * - synthesize intrinsic documentary anchor relationships
 * - measure anchor coverage, dispersion, concentration and adjacency
 * - measure frequent-term and rare-term pair cooccurrences
 * - measure deterministic sentence-level proximity between selected terms
 * - preserve document, sentence, term and source-contract lineage
 * - produce the canonical SearchContextAggregation contract
 *
 * CLASSIFICATION
 * - PRIVATE SEARCH ENGINE
 * - CONTEXT AGGREGATION
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 * - DETERMINISTIC
 *
 * PARENTS
 * - Xyvala Search official protocol
 * - Search pipeline canonical contract
 * - Search segmentation core
 * - Search frequency signals core
 * - Search anchor signals core
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Search intrinsic scoring engines
 * - Search convergence scorer
 * - Search occurrence scorer
 * - Search document scoring input assembler
 * - Search private snapshot builder
 * - Search audit and observability adapters
 *
 * DIRECTIVES
 * - consume canonical upstream contracts only
 * - use SearchSegmentedDocument as sentence-order source of truth
 * - use SearchFrequencySignals as selected-term source of truth
 * - use SearchAnchorSignals as intrinsic-anchor source of truth
 * - aggregate without reconstructing upstream truth
 * - never read raw document content
 * - never read extracted text
 * - never retokenize
 * - never normalize terms
 * - never recount lexical occurrences
 * - never redefine frequent or rare terms
 * - never re-extract anchors
 * - never modify local anchor convergence
 * - never calculate query-relative relevance
 * - never calculate a final document score
 * - never apply calibration
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
 * - no random ordering
 * - no reconstruction of missing evidence
 *
 * INPUTS
 * - canonical SearchSegmentedDocument
 * - canonical SearchFrequencySignals
 * - canonical SearchAnchorSignals
 * - explicit context aggregation timestamp
 * - optional explicit aggregator module version
 *
 * OUTPUTS
 * - canonical SearchContextAggregation
 *
 * INVARIANTS
 * - identical inputs, timestamp and versions produce identical outputs
 * - every aggregated anchor comes from SearchAnchorSignals
 * - every selected term comes from SearchFrequencySignals
 * - every sentence position comes from SearchSegmentedDocument
 * - every cooccurrence sentence references an existing canonical sentence
 * - all normalized measures remain between zero and one
 * - term-pair ordering is deterministic
 * - no upstream score is modified
 * - no global document score is produced
 * - input contracts are never mutated
 * - rejected upstream truth never becomes valid aggregated truth
 *
 * CRITICAL DEPENDENCIES
 * - search-pipeline-contract.ts
 *
 * SENSITIVE AREAS
 * - cross-contract document identity
 * - sentence-order lineage
 * - pair cooccurrence integrity
 * - proximity normalization
 * - anchor dispersion
 * - anchor concentration
 * - deterministic ordering
 * - missing-evidence degradation
 * ========================================================================== */

import type {
  SearchAnchorKind,
  SearchAnchorSignal,
  SearchAnchorSignals,
  SearchContextAggregation,
  SearchContractVersion,
  SearchCount,
  SearchFrequencySignals,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchRatio,
  SearchSegmentedDocument,
  SearchSentenceId,
  SearchTermPairContext,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE CONSTANTS
 * ========================================================================== */

export const XYVALA_SEARCH_CONTEXT_AGGREGATION_CONTRACT_VERSION =
  "1.0.0" satisfies SearchContractVersion;

export const XYVALA_SEARCH_CONTEXT_AGGREGATION_MODULE_VERSION =
  "1.0.0" satisfies SearchModuleVersion;

export const XYVALA_SEARCH_CONTEXT_AGGREGATION_METHOD =
  "CANONICAL_INTRINSIC_ANCHOR_CONTEXT_AGGREGATION_V1";

/* ============================================================================
 * 2. INPUT CONTRACT
 * ========================================================================== */

export interface SearchContextAggregationInput {
  readonly segmented_document: SearchSegmentedDocument;
  readonly frequency_signals: SearchFrequencySignals;
  readonly anchor_signals: SearchAnchorSignals;

  /**
   * Must be supplied explicitly.
   *
   * This COMPUTE module never generates a timestamp.
   */
  readonly created_at: SearchIsoTimestamp;

  readonly aggregator_module_version?: SearchModuleVersion;
}

/* ============================================================================
 * 3. VALIDATION AND DEGRADATION IDENTITIES
 * ========================================================================== */

export type SearchContextAggregationRejectionReason =
  | "SEGMENTED_DOCUMENT_REJECTED"
  | "FREQUENCY_SIGNALS_REJECTED"
  | "ANCHOR_SIGNALS_REJECTED"
  | "DOCUMENT_ID_EMPTY"
  | "DOCUMENT_ID_MISMATCH"
  | "SENTENCE_COLLECTION_EMPTY"
  | "SENTENCE_COUNT_MISMATCH"
  | "DUPLICATE_SENTENCE_ID"
  | "ANCHOR_COLLECTION_EMPTY"
  | "ANCHOR_COUNT_MISMATCH"
  | "DUPLICATE_ANCHOR_ID"
  | "DUPLICATE_ANCHOR_SENTENCE"
  | "ANCHOR_SENTENCE_MISSING"
  | "ANCHOR_TERM_LINEAGE_INVALID"
  | "ANCHOR_SCORE_INVALID"
  | "FREQUENT_TERM_COLLECTION_EMPTY"
  | "RARE_TERM_COLLECTION_EMPTY"
  | "FREQUENT_RARE_TERM_OVERLAP"
  | "CREATED_AT_INVALID"
  | "CREATED_AT_BEFORE_SEGMENTATION"
  | "CREATED_AT_BEFORE_FREQUENCY_SIGNALS"
  | "CREATED_AT_BEFORE_ANCHOR_SIGNALS"
  | "AGGREGATOR_MODULE_VERSION_EMPTY"
  | "OUTPUT_COUNT_INVALID"
  | "OUTPUT_RATIO_INVALID"
  | "OUTPUT_PAIR_CONTEXT_INVALID";

export type SearchContextAggregationDegradationReason =
  | "UPSTREAM_SEGMENTATION_DEGRADED"
  | "UPSTREAM_FREQUENCY_SIGNALS_DEGRADED"
  | "UPSTREAM_ANCHOR_SIGNALS_DEGRADED"
  | "LOCAL_RARITY_CONTEXT_ONLY"
  | "NO_FREQUENT_RARE_COOCCURRENCE"
  | "NO_FREQUENT_RARE_CONVERGENCE_ANCHOR"
  | "SINGLE_ANCHOR_CONTEXT"
  | "LOW_ANCHOR_COVERAGE"
  | "HIGH_ANCHOR_CONCENTRATION"
  | "SELECTED_TERM_WITHOUT_ANCHOR_EVIDENCE";

export interface SearchContextAggregationValidationResult {
  readonly validation_state: SearchValidationState;
  readonly rejection_reasons:
    readonly SearchContextAggregationRejectionReason[];
}

/* ============================================================================
 * 4. INTERNAL COMPUTE TYPES
 * ========================================================================== */

interface SearchSentencePositionContext {
  readonly sentence_ordinal_by_id: ReadonlyMap<
    SearchSentenceId,
    number
  >;

  readonly sentence_ids: ReadonlySet<SearchSentenceId>;
}

interface SearchSelectedTerms {
  readonly frequent_terms: readonly string[];
  readonly rare_terms: readonly string[];
}

interface SearchTermAnchorPositions {
  readonly frequent_term_positions: ReadonlyMap<
    string,
    readonly number[]
  >;

  readonly rare_term_positions: ReadonlyMap<
    string,
    readonly number[]
  >;
}

interface MutableTermPairAccumulator {
  readonly frequent_term: string;
  readonly rare_term: string;
  readonly cooccurrence_sentence_ids: Set<SearchSentenceId>;
  local_convergence_total: number;
}

/* ============================================================================
 * 5. LOW-LEVEL DETERMINISTIC HELPERS
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

function computeArithmeticMean(
  values: readonly number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce(
    (accumulator, value) => accumulator + value,
    0,
  );

  return clampUnitInterval(total / values.length);
}

function computeMaximum(
  values: readonly number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return clampUnitInterval(Math.max(...values));
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

function buildTermPairIdentity(input: {
  readonly frequent_term: string;
  readonly rare_term: string;
}): string {
  return `${input.frequent_term}\u0000${input.rare_term}`;
}

/* ============================================================================
 * 6. CANONICAL SENTENCE POSITION CONTEXT
 * ========================================================================== */

function buildSearchSentencePositionContext(
  segmentedDocument: SearchSegmentedDocument,
): SearchSentencePositionContext {
  const sentenceOrdinalById = new Map<
    SearchSentenceId,
    number
  >();

  const sentenceIds = new Set<SearchSentenceId>();

  for (const sentence of segmentedDocument.sentences) {
    sentenceOrdinalById.set(
      sentence.sentence_id,
      sentence.ordinal_position,
    );

    sentenceIds.add(sentence.sentence_id);
  }

  return Object.freeze({
    sentence_ordinal_by_id: sentenceOrdinalById,
    sentence_ids: sentenceIds,
  });
}

/* ============================================================================
 * 7. SELECTED TERM READERS
 * ----------------------------------------------------------------------------
 * Selections remain exactly those produced by Frequency Signal Detection.
 * ========================================================================== */

function getSearchSelectedTerms(
  frequencySignals: SearchFrequencySignals,
): SearchSelectedTerms {
  return Object.freeze({
    frequent_terms: Object.freeze(
      frequencySignals.frequent_terms.map(
        (signal) => signal.normalized_term,
      ),
    ),

    rare_terms: Object.freeze(
      frequencySignals.rare_terms.map(
        (signal) => signal.normalized_term,
      ),
    ),
  });
}

/* ============================================================================
 * 8. INPUT BOUNDARY VALIDATION
 * ----------------------------------------------------------------------------
 * Boundary:
 *
 * SearchSegmentedDocument
 * + SearchFrequencySignals
 * + SearchAnchorSignals
 * → SearchContextAggregation
 *
 * Validation never repairs an invalid upstream contract.
 * ========================================================================== */

export function validateSearchContextAggregationInput(
  input: SearchContextAggregationInput,
): SearchContextAggregationValidationResult {
  const rejectionReasons =
    new Set<SearchContextAggregationRejectionReason>();

  const segmentedDocument = input.segmented_document;
  const frequencySignals = input.frequency_signals;
  const anchorSignals = input.anchor_signals;

  if (
    segmentedDocument.validation_state !== "VALID" &&
    segmentedDocument.validation_state !== "DEGRADED"
  ) {
    rejectionReasons.add("SEGMENTED_DOCUMENT_REJECTED");
  }

  if (
    frequencySignals.validation_state !== "VALID" &&
    frequencySignals.validation_state !== "DEGRADED"
  ) {
    rejectionReasons.add("FREQUENCY_SIGNALS_REJECTED");
  }

  if (
    anchorSignals.validation_state !== "VALID" &&
    anchorSignals.validation_state !== "DEGRADED"
  ) {
    rejectionReasons.add("ANCHOR_SIGNALS_REJECTED");
  }

  if (
    !isNonEmptyString(segmentedDocument.document_id) ||
    !isNonEmptyString(frequencySignals.document_id) ||
    !isNonEmptyString(anchorSignals.document_id)
  ) {
    rejectionReasons.add("DOCUMENT_ID_EMPTY");
  }

  if (
    segmentedDocument.document_id !== frequencySignals.document_id ||
    segmentedDocument.document_id !== anchorSignals.document_id
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

  if (anchorSignals.anchors.length === 0) {
    rejectionReasons.add("ANCHOR_COLLECTION_EMPTY");
  }

  if (
    anchorSignals.anchor_count !==
    anchorSignals.anchors.length
  ) {
    rejectionReasons.add("ANCHOR_COUNT_MISMATCH");
  }

  const emittedAnchorIds = new Set<string>();
  const emittedAnchorSentenceIds =
    new Set<SearchSentenceId>();

  const selectedTerms = getSearchSelectedTerms(
    frequencySignals,
  );

  const selectedFrequentTerms = new Set(
    selectedTerms.frequent_terms,
  );

  const selectedRareTerms = new Set(
    selectedTerms.rare_terms,
  );

  if (selectedFrequentTerms.size === 0) {
    rejectionReasons.add(
      "FREQUENT_TERM_COLLECTION_EMPTY",
    );
  }

  if (selectedRareTerms.size === 0) {
    rejectionReasons.add("RARE_TERM_COLLECTION_EMPTY");
  }

  for (const frequentTerm of selectedFrequentTerms) {
    if (selectedRareTerms.has(frequentTerm)) {
      rejectionReasons.add(
        "FREQUENT_RARE_TERM_OVERLAP",
      );
    }
  }

  for (const anchor of anchorSignals.anchors) {
    if (emittedAnchorIds.has(anchor.anchor_id)) {
      rejectionReasons.add("DUPLICATE_ANCHOR_ID");
    }

    emittedAnchorIds.add(anchor.anchor_id);

    if (
      emittedAnchorSentenceIds.has(anchor.sentence_id)
    ) {
      rejectionReasons.add(
        "DUPLICATE_ANCHOR_SENTENCE",
      );
    }

    emittedAnchorSentenceIds.add(anchor.sentence_id);

    if (!canonicalSentenceIds.has(anchor.sentence_id)) {
      rejectionReasons.add("ANCHOR_SENTENCE_MISSING");
    }

    if (
      !isUnitIntervalNumber(
        anchor.local_convergence_score,
      ) ||
      !isUnitIntervalNumber(anchor.position_weight)
    ) {
      rejectionReasons.add("ANCHOR_SCORE_INVALID");
    }

    for (
      const matchedFrequentTerm of
        anchor.matched_frequent_terms
    ) {
      if (
        !selectedFrequentTerms.has(
          matchedFrequentTerm,
        )
      ) {
        rejectionReasons.add(
          "ANCHOR_TERM_LINEAGE_INVALID",
        );
      }
    }

    for (
      const matchedRareTerm of
        anchor.matched_rare_terms
    ) {
      if (!selectedRareTerms.has(matchedRareTerm)) {
        rejectionReasons.add(
          "ANCHOR_TERM_LINEAGE_INVALID",
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
    isValidIsoTimestamp(frequencySignals.created_at) &&
    Date.parse(input.created_at) <
      Date.parse(frequencySignals.created_at)
  ) {
    rejectionReasons.add(
      "CREATED_AT_BEFORE_FREQUENCY_SIGNALS",
    );
  }

  if (
    createdAtValid &&
    isValidIsoTimestamp(anchorSignals.created_at) &&
    Date.parse(input.created_at) <
      Date.parse(anchorSignals.created_at)
  ) {
    rejectionReasons.add(
      "CREATED_AT_BEFORE_ANCHOR_SIGNALS",
    );
  }

  const aggregatorModuleVersion =
    input.aggregator_module_version ??
    XYVALA_SEARCH_CONTEXT_AGGREGATION_MODULE_VERSION;

  if (!isNonEmptyString(aggregatorModuleVersion)) {
    rejectionReasons.add(
      "AGGREGATOR_MODULE_VERSION_EMPTY",
    );
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
 * 9. ANCHOR COUNTS
 * ========================================================================== */

function countSearchAnchorsByKind(
  anchors: readonly SearchAnchorSignal[],
  anchorKind: SearchAnchorKind,
): SearchCount {
  return anchors.filter(
    (anchor) => anchor.anchor_kind === anchorKind,
  ).length;
}

/* ============================================================================
 * 10. UNIQUE MATCHED TERM COUNTS
 * ========================================================================== */

function countUniqueMatchedTerms(input: {
  readonly anchors: readonly SearchAnchorSignal[];
  readonly signal_kind: "FREQUENT" | "RARE";
}): SearchCount {
  const terms = new Set<string>();

  for (const anchor of input.anchors) {
    const matchedTerms =
      input.signal_kind === "FREQUENT"
        ? anchor.matched_frequent_terms
        : anchor.matched_rare_terms;

    for (const term of matchedTerms) {
      terms.add(term);
    }
  }

  return terms.size;
}

/* ============================================================================
 * 11. ANCHOR ORDINAL POSITIONS
 * ========================================================================== */

function getOrderedAnchorOrdinalPositions(input: {
  readonly anchors: readonly SearchAnchorSignal[];
  readonly sentence_ordinal_by_id: ReadonlyMap<
    SearchSentenceId,
    number
  >;
}): readonly number[] {
  const positions: number[] = [];

  for (const anchor of input.anchors) {
    const ordinalPosition =
      input.sentence_ordinal_by_id.get(
        anchor.sentence_id,
      );

    if (ordinalPosition !== undefined) {
      positions.push(ordinalPosition);
    }
  }

  return Object.freeze(
    [...positions].sort((left, right) => left - right),
  );
}

/* ============================================================================
 * 12. DISPERSION, CONCENTRATION AND ADJACENCY
 * ----------------------------------------------------------------------------
 * Dispersion measures the normalized span occupied by anchors.
 *
 * Concentration is the inverse descriptive context:
 *
 * concentration = 1 - dispersion
 *
 * Neither value is a final document score.
 * ========================================================================== */

function computeAnchorDispersionScore(input: {
  readonly ordered_anchor_positions: readonly number[];
  readonly sentence_count: number;
}): SearchNormalizedScore {
  if (
    input.ordered_anchor_positions.length <= 1 ||
    input.sentence_count <= 1
  ) {
    return 0;
  }

  const firstPosition =
    input.ordered_anchor_positions[0];

  const lastPosition =
    input.ordered_anchor_positions[
      input.ordered_anchor_positions.length - 1
    ];

  if (
    firstPosition === undefined ||
    lastPosition === undefined
  ) {
    return 0;
  }

  return divideOrZero(
    lastPosition - firstPosition,
    input.sentence_count - 1,
  );
}

function computeAdjacentAnchorRatio(
  orderedAnchorPositions: readonly number[],
): SearchRatio {
  if (orderedAnchorPositions.length <= 1) {
    return 0;
  }

  let adjacentPairCount = 0;

  for (
    let index = 1;
    index < orderedAnchorPositions.length;
    index += 1
  ) {
    const previousPosition =
      orderedAnchorPositions[index - 1];

    const currentPosition =
      orderedAnchorPositions[index];

    if (
      previousPosition !== undefined &&
      currentPosition !== undefined &&
      currentPosition - previousPosition <= 1
    ) {
      adjacentPairCount += 1;
    }
  }

  return divideOrZero(
    adjacentPairCount,
    orderedAnchorPositions.length - 1,
  );
}

/* ============================================================================
 * 13. TERM ANCHOR POSITIONS
 * ----------------------------------------------------------------------------
 * Positions derive only from already validated anchor membership.
 * ========================================================================== */

function buildSearchTermAnchorPositions(input: {
  readonly anchors: readonly SearchAnchorSignal[];
  readonly sentence_ordinal_by_id: ReadonlyMap<
    SearchSentenceId,
    number
  >;
}): SearchTermAnchorPositions {
  const frequentPositions = new Map<string, Set<number>>();
  const rarePositions = new Map<string, Set<number>>();

  for (const anchor of input.anchors) {
    const ordinalPosition =
      input.sentence_ordinal_by_id.get(
        anchor.sentence_id,
      );

    if (ordinalPosition === undefined) {
      continue;
    }

    for (const frequentTerm of anchor.matched_frequent_terms) {
      const positions =
        frequentPositions.get(frequentTerm) ??
        new Set<number>();

      positions.add(ordinalPosition);
      frequentPositions.set(frequentTerm, positions);
    }

    for (const rareTerm of anchor.matched_rare_terms) {
      const positions =
        rarePositions.get(rareTerm) ??
        new Set<number>();

      positions.add(ordinalPosition);
      rarePositions.set(rareTerm, positions);
    }
  }

  const immutableFrequentPositions = new Map<
    string,
    readonly number[]
  >();

  for (const [term, positions] of frequentPositions) {
    immutableFrequentPositions.set(
      term,
      Object.freeze(
        [...positions].sort((left, right) => left - right),
      ),
    );
  }

  const immutableRarePositions = new Map<
    string,
    readonly number[]
  >();

  for (const [term, positions] of rarePositions) {
    immutableRarePositions.set(
      term,
      Object.freeze(
        [...positions].sort((left, right) => left - right),
      ),
    );
  }

  return Object.freeze({
    frequent_term_positions:
      immutableFrequentPositions,

    rare_term_positions:
      immutableRarePositions,
  });
}

/* ============================================================================
 * 14. TERM-PAIR PROXIMITY
 * ----------------------------------------------------------------------------
 * Same-sentence proximity produces 1.
 *
 * Greater sentence distance progressively reduces the normalized value.
 * Missing evidence produces 0 and is never reconstructed.
 * ========================================================================== */

function computeTermPairProximityScore(input: {
  readonly frequent_positions: readonly number[];
  readonly rare_positions: readonly number[];
  readonly sentence_count: number;
}): SearchNormalizedScore {
  if (
    input.frequent_positions.length === 0 ||
    input.rare_positions.length === 0
  ) {
    return 0;
  }

  let minimumSentenceDistance =
    Number.POSITIVE_INFINITY;

  for (
    const frequentPosition of
      input.frequent_positions
  ) {
    for (const rarePosition of input.rare_positions) {
      const sentenceDistance = Math.abs(
        frequentPosition - rarePosition,
      );

      if (sentenceDistance < minimumSentenceDistance) {
        minimumSentenceDistance = sentenceDistance;
      }
    }
  }

  if (!Number.isFinite(minimumSentenceDistance)) {
    return 0;
  }

  if (minimumSentenceDistance === 0) {
    return 1;
  }

  if (input.sentence_count <= 1) {
    return 0;
  }

  return clampUnitInterval(
    1 -
      minimumSentenceDistance /
        (input.sentence_count - 1),
  );
}

/* ============================================================================
 * 15. FREQUENT/RARE PAIR COOCCURRENCE ACCUMULATION
 * ========================================================================== */

function buildSearchTermPairAccumulators(
  anchors: readonly SearchAnchorSignal[],
): ReadonlyMap<string, MutableTermPairAccumulator> {
  const accumulators = new Map<
    string,
    MutableTermPairAccumulator
  >();

  for (const anchor of anchors) {
    for (
      const frequentTerm of
        anchor.matched_frequent_terms
    ) {
      for (const rareTerm of anchor.matched_rare_terms) {
        const pairIdentity = buildTermPairIdentity({
          frequent_term: frequentTerm,
          rare_term: rareTerm,
        });

        const existingAccumulator =
          accumulators.get(pairIdentity);

        if (existingAccumulator) {
          existingAccumulator.cooccurrence_sentence_ids.add(
            anchor.sentence_id,
          );

          existingAccumulator.local_convergence_total +=
            anchor.local_convergence_score;

          continue;
        }

        accumulators.set(pairIdentity, {
          frequent_term: frequentTerm,
          rare_term: rareTerm,

          cooccurrence_sentence_ids: new Set([
            anchor.sentence_id,
          ]),

          local_convergence_total:
            anchor.local_convergence_score,
        });
      }
    }
  }

  return accumulators;
}

/* ============================================================================
 * 16. TERM-PAIR CONTEXT ASSEMBLY
 * ----------------------------------------------------------------------------
 * V0 emits every selected frequent/rare combination.
 *
 * With five frequent and five rare terms, the maximum is twenty-five pairs.
 * This makes absent and present relationships equally explicit.
 * ========================================================================== */

function buildSearchTermPairContexts(input: {
  readonly selected_terms: SearchSelectedTerms;
  readonly anchors: readonly SearchAnchorSignal[];
  readonly term_anchor_positions: SearchTermAnchorPositions;
  readonly sentence_count: number;
  readonly sentence_ordinal_by_id: ReadonlyMap<
    SearchSentenceId,
    number
  >;
}): readonly SearchTermPairContext[] {
  const pairAccumulators =
    buildSearchTermPairAccumulators(input.anchors);

  const pairContexts: SearchTermPairContext[] = [];

  const orderedFrequentTerms = [
    ...input.selected_terms.frequent_terms,
  ].sort(compareCanonicalStrings);

  const orderedRareTerms = [
    ...input.selected_terms.rare_terms,
  ].sort(compareCanonicalStrings);

  for (const frequentTerm of orderedFrequentTerms) {
    for (const rareTerm of orderedRareTerms) {
      const pairIdentity = buildTermPairIdentity({
        frequent_term: frequentTerm,
        rare_term: rareTerm,
      });

      const accumulator =
        pairAccumulators.get(pairIdentity);

      const cooccurrenceSentenceIds = accumulator
        ? [...accumulator.cooccurrence_sentence_ids]
        : [];

      cooccurrenceSentenceIds.sort(
        (leftSentenceId, rightSentenceId) => {
          const leftOrdinal =
            input.sentence_ordinal_by_id.get(
              leftSentenceId,
            );

          const rightOrdinal =
            input.sentence_ordinal_by_id.get(
              rightSentenceId,
            );

          if (
            leftOrdinal === undefined ||
            rightOrdinal === undefined
          ) {
            return compareCanonicalStrings(
              leftSentenceId,
              rightSentenceId,
            );
          }

          return (
            leftOrdinal - rightOrdinal ||
            compareCanonicalStrings(
              leftSentenceId,
              rightSentenceId,
            )
          );
        },
      );

      const frequentPositions =
        input.term_anchor_positions
          .frequent_term_positions.get(
            frequentTerm,
          ) ?? Object.freeze([]);

      const rarePositions =
        input.term_anchor_positions
          .rare_term_positions.get(rareTerm) ??
        Object.freeze([]);

      const proximityScore =
        computeTermPairProximityScore({
          frequent_positions: frequentPositions,
          rare_positions: rarePositions,
          sentence_count: input.sentence_count,
        });

      const cooccurrenceCount =
        cooccurrenceSentenceIds.length;

      const meanCooccurrenceConvergence =
        accumulator && cooccurrenceCount > 0
          ? clampUnitInterval(
              accumulator.local_convergence_total /
                cooccurrenceCount,
            )
          : 0;

      /**
       * The evidence score synthesizes already-observed pair evidence.
       *
       * It remains a context metric, not a final document score.
       */
      const convergenceEvidenceScore =
        clampUnitInterval(
          meanCooccurrenceConvergence * 0.7 +
            proximityScore * 0.3,
        );

      pairContexts.push(
        Object.freeze({
          frequent_term: frequentTerm,
          rare_term: rareTerm,

          cooccurrence_sentence_count:
            cooccurrenceCount,

          cooccurrence_sentence_ids:
            Object.freeze(cooccurrenceSentenceIds),

          proximity_score: proximityScore,

          convergence_evidence_score:
            convergenceEvidenceScore,
        }),
      );
    }
  }

  return Object.freeze(pairContexts);
}

/* ============================================================================
 * 17. OUTPUT VALIDATION
 * ========================================================================== */

export function validateSearchContextAggregationOutput(
  contextAggregation: SearchContextAggregation,
): SearchContextAggregationValidationResult {
  const rejectionReasons =
    new Set<SearchContextAggregationRejectionReason>();

  const countValues: readonly number[] = [
    contextAggregation.anchor_sentence_count,
    contextAggregation.frequent_term_anchor_count,
    contextAggregation.rare_term_anchor_count,
    contextAggregation
      .frequent_rare_convergence_anchor_count,
    contextAggregation
      .unique_matched_frequent_term_count,
    contextAggregation
      .unique_matched_rare_term_count,
  ];

  for (const countValue of countValues) {
    if (!isNonNegativeInteger(countValue)) {
      rejectionReasons.add("OUTPUT_COUNT_INVALID");
    }
  }

  const ratioValues: readonly number[] = [
    contextAggregation.anchor_sentence_coverage_ratio,
    contextAggregation.mean_local_convergence_score,
    contextAggregation.maximum_local_convergence_score,
    contextAggregation.mean_anchor_position_weight,
    contextAggregation.anchor_dispersion_score,
    contextAggregation.anchor_concentration_score,
    contextAggregation.adjacent_anchor_ratio,
  ];

  for (const ratioValue of ratioValues) {
    if (!isUnitIntervalNumber(ratioValue)) {
      rejectionReasons.add("OUTPUT_RATIO_INVALID");
    }
  }

  const pairIdentities = new Set<string>();

  for (
    const pairContext of
      contextAggregation.frequent_rare_pair_contexts
  ) {
    const pairIdentity = buildTermPairIdentity({
      frequent_term: pairContext.frequent_term,
      rare_term: pairContext.rare_term,
    });

    if (
      !isNonEmptyString(pairContext.frequent_term) ||
      !isNonEmptyString(pairContext.rare_term) ||
      pairIdentities.has(pairIdentity) ||
      !isNonNegativeInteger(
        pairContext.cooccurrence_sentence_count,
      ) ||
      pairContext.cooccurrence_sentence_count !==
        pairContext.cooccurrence_sentence_ids.length ||
      !isUnitIntervalNumber(
        pairContext.proximity_score,
      ) ||
      !isUnitIntervalNumber(
        pairContext.convergence_evidence_score,
      )
    ) {
      rejectionReasons.add(
        "OUTPUT_PAIR_CONTEXT_INVALID",
      );
    }

    pairIdentities.add(pairIdentity);

    const uniqueSentenceIds = new Set(
      pairContext.cooccurrence_sentence_ids,
    );

    if (
      uniqueSentenceIds.size !==
      pairContext.cooccurrence_sentence_ids.length
    ) {
      rejectionReasons.add(
        "OUTPUT_PAIR_CONTEXT_INVALID",
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
 * No context is fabricated when the input boundary is rejected.
 * ========================================================================== */

function buildRejectedSearchContextAggregation(input: {
  readonly source_input: SearchContextAggregationInput;
  readonly rejection_reasons:
    readonly SearchContextAggregationRejectionReason[];
}): SearchContextAggregation {
  const aggregatorModuleVersion =
    input.source_input.aggregator_module_version ??
    XYVALA_SEARCH_CONTEXT_AGGREGATION_MODULE_VERSION;

  const rejectedAggregation: SearchContextAggregation = {
    contract_version:
      XYVALA_SEARCH_CONTEXT_AGGREGATION_CONTRACT_VERSION,

    created_at: input.source_input.created_at,

    document_id:
      input.source_input.segmented_document.document_id,

    anchor_sentence_count: 0,
    anchor_sentence_coverage_ratio: 0,

    frequent_term_anchor_count: 0,
    rare_term_anchor_count: 0,
    frequent_rare_convergence_anchor_count: 0,

    unique_matched_frequent_term_count: 0,
    unique_matched_rare_term_count: 0,

    mean_local_convergence_score: 0,
    maximum_local_convergence_score: 0,
    mean_anchor_position_weight: 0,

    anchor_dispersion_score: 0,
    anchor_concentration_score: 0,
    adjacent_anchor_ratio: 0,

    frequent_rare_pair_contexts: Object.freeze([]),

    context_aggregation_method:
      XYVALA_SEARCH_CONTEXT_AGGREGATION_METHOD,

    aggregator_module_version:
      aggregatorModuleVersion,

    validation_state: "REJECTED",

    degradation_reasons: Object.freeze([
      ...input.rejection_reasons,
    ]),
  };

  return Object.freeze(rejectedAggregation);
}

/* ============================================================================
 * 19. CANONICAL CONTEXT AGGREGATION BUILDER
 * ----------------------------------------------------------------------------
 * This is the single canonical producer of SearchContextAggregation.
 *
 * Downstream modules must not locally reconstruct:
 * - anchor coverage;
 * - anchor-kind counts;
 * - aggregate local convergence;
 * - anchor dispersion;
 * - anchor concentration;
 * - frequent/rare term-pair contexts.
 * ========================================================================== */

export function buildSearchContextAggregation(
  input: SearchContextAggregationInput,
): SearchContextAggregation {
  const boundaryValidation =
    validateSearchContextAggregationInput(input);

  if (
    boundaryValidation.validation_state === "REJECTED"
  ) {
    return buildRejectedSearchContextAggregation({
      source_input: input,

      rejection_reasons:
        boundaryValidation.rejection_reasons,
    });
  }

  const sentenceContext =
    buildSearchSentencePositionContext(
      input.segmented_document,
    );

  const selectedTerms = getSearchSelectedTerms(
    input.frequency_signals,
  );

  const anchors = input.anchor_signals.anchors;

  const anchorOrdinalPositions =
    getOrderedAnchorOrdinalPositions({
      anchors,

      sentence_ordinal_by_id:
        sentenceContext.sentence_ordinal_by_id,
    });

  const localConvergenceValues = anchors.map(
    (anchor) => anchor.local_convergence_score,
  );

  const positionWeightValues = anchors.map(
    (anchor) => anchor.position_weight,
  );

  const anchorDispersionScore =
    computeAnchorDispersionScore({
      ordered_anchor_positions:
        anchorOrdinalPositions,

      sentence_count:
        input.segmented_document.sentence_count,
    });

  const anchorConcentrationScore =
    clampUnitInterval(1 - anchorDispersionScore);

  const termAnchorPositions =
    buildSearchTermAnchorPositions({
      anchors,

      sentence_ordinal_by_id:
        sentenceContext.sentence_ordinal_by_id,
    });

  const pairContexts = buildSearchTermPairContexts({
    selected_terms: selectedTerms,
    anchors,
    term_anchor_positions: termAnchorPositions,

    sentence_count:
      input.segmented_document.sentence_count,

    sentence_ordinal_by_id:
      sentenceContext.sentence_ordinal_by_id,
  });

  const degradationReasons =
    new Set<SearchContextAggregationDegradationReason>();

  if (
    input.segmented_document.validation_state ===
    "DEGRADED"
  ) {
    degradationReasons.add(
      "UPSTREAM_SEGMENTATION_DEGRADED",
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
    input.anchor_signals.validation_state ===
    "DEGRADED"
  ) {
    degradationReasons.add(
      "UPSTREAM_ANCHOR_SIGNALS_DEGRADED",
    );
  }

  if (
    input.frequency_signals.rarity_method ===
      "LOCAL_OCCURRENCE" ||
    input.frequency_signals.rarity_method ===
      "LOCAL_FREQUENCY"
  ) {
    degradationReasons.add(
      "LOCAL_RARITY_CONTEXT_ONLY",
    );
  }

  const convergenceAnchorCount =
    countSearchAnchorsByKind(
      anchors,
      "FREQUENT_RARE_CONVERGENCE",
    );

  if (convergenceAnchorCount === 0) {
    degradationReasons.add(
      "NO_FREQUENT_RARE_CONVERGENCE_ANCHOR",
    );
  }

  const hasCooccurrence = pairContexts.some(
    (pairContext) =>
      pairContext.cooccurrence_sentence_count > 0,
  );

  if (!hasCooccurrence) {
    degradationReasons.add(
      "NO_FREQUENT_RARE_COOCCURRENCE",
    );
  }

  if (anchors.length === 1) {
    degradationReasons.add("SINGLE_ANCHOR_CONTEXT");
  }

  const anchorCoverageRatio = divideOrZero(
    anchors.length,
    input.segmented_document.sentence_count,
  );

  if (anchorCoverageRatio < 0.1) {
    degradationReasons.add("LOW_ANCHOR_COVERAGE");
  }

  if (
    anchors.length > 1 &&
    anchorConcentrationScore >= 0.85
  ) {
    degradationReasons.add(
      "HIGH_ANCHOR_CONCENTRATION",
    );
  }

  const matchedFrequentTerms = new Set<string>();
  const matchedRareTerms = new Set<string>();

  for (const anchor of anchors) {
    for (
      const frequentTerm of
        anchor.matched_frequent_terms
    ) {
      matchedFrequentTerms.add(frequentTerm);
    }

    for (const rareTerm of anchor.matched_rare_terms) {
      matchedRareTerms.add(rareTerm);
    }
  }

  const selectedTermWithoutAnchorEvidence =
    selectedTerms.frequent_terms.some(
      (term) => !matchedFrequentTerms.has(term),
    ) ||
    selectedTerms.rare_terms.some(
      (term) => !matchedRareTerms.has(term),
    );

  if (selectedTermWithoutAnchorEvidence) {
    degradationReasons.add(
      "SELECTED_TERM_WITHOUT_ANCHOR_EVIDENCE",
    );
  }

  const aggregatorModuleVersion =
    input.aggregator_module_version ??
    XYVALA_SEARCH_CONTEXT_AGGREGATION_MODULE_VERSION;

  const contextAggregation: SearchContextAggregation = {
    contract_version:
      XYVALA_SEARCH_CONTEXT_AGGREGATION_CONTRACT_VERSION,

    created_at: input.created_at,

    document_id:
      input.segmented_document.document_id,

    anchor_sentence_count: anchors.length,

    anchor_sentence_coverage_ratio:
      anchorCoverageRatio,

    frequent_term_anchor_count:
      countSearchAnchorsByKind(
        anchors,
        "FREQUENT_TERM",
      ),

    rare_term_anchor_count:
      countSearchAnchorsByKind(
        anchors,
        "RARE_TERM",
      ),

    frequent_rare_convergence_anchor_count:
      convergenceAnchorCount,

    unique_matched_frequent_term_count:
      countUniqueMatchedTerms({
        anchors,
        signal_kind: "FREQUENT",
      }),

    unique_matched_rare_term_count:
      countUniqueMatchedTerms({
        anchors,
        signal_kind: "RARE",
      }),

    mean_local_convergence_score:
      computeArithmeticMean(
        localConvergenceValues,
      ),

    maximum_local_convergence_score:
      computeMaximum(localConvergenceValues),

    mean_anchor_position_weight:
      computeArithmeticMean(positionWeightValues),

    anchor_dispersion_score:
      anchorDispersionScore,

    anchor_concentration_score:
      anchorConcentrationScore,

    adjacent_anchor_ratio:
      computeAdjacentAnchorRatio(
        anchorOrdinalPositions,
      ),

    frequent_rare_pair_contexts: pairContexts,

    context_aggregation_method:
      XYVALA_SEARCH_CONTEXT_AGGREGATION_METHOD,

    aggregator_module_version:
      aggregatorModuleVersion,

    validation_state:
      degradationReasons.size > 0
        ? "DEGRADED"
        : "VALID",

    degradation_reasons: Object.freeze([
      ...degradationReasons,
    ]),
  };

  const outputValidation =
    validateSearchContextAggregationOutput(
      contextAggregation,
    );

  if (
    outputValidation.validation_state === "REJECTED"
  ) {
    const rejectedAggregation: SearchContextAggregation = {
      ...contextAggregation,

      validation_state: "REJECTED",

      degradation_reasons: Object.freeze([
        ...degradationReasons,
        ...outputValidation.rejection_reasons,
      ]),
    };

    return Object.freeze(rejectedAggregation);
  }

  return Object.freeze(contextAggregation);
}

/* ============================================================================
 * 20. CONTEXT AGGREGATION ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * This pure reader determines whether the result may cross the:
 *
 * Context Aggregation → Document Scoring boundary.
 *
 * DEGRADED remains propagable when the canonical context remains internally
 * coherent and at least one anchor is represented.
 * ========================================================================== */

export function isSearchContextAggregationAccepted(
  contextAggregation: SearchContextAggregation,
): boolean {
  return (
    (contextAggregation.validation_state === "VALID" ||
      contextAggregation.validation_state === "DEGRADED") &&
    contextAggregation.anchor_sentence_count > 0 &&
    contextAggregation
      .frequent_rare_pair_contexts.length > 0
  );
}
