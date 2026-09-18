/* ============================================================================
 * FILE: lib/xyvala/search/signals/search-frequency-signals-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical frequency signal detection core
 *
 * ROLE
 * - consume the canonical SearchLexicalDocument
 * - validate the Lexical Analysis to Frequency Signal Detection boundary
 * - derive frequent-term candidates from canonical lexical statistics
 * - derive rare-term candidates from canonical lexical statistics
 * - apply explicit deterministic candidate eligibility rules
 * - prevent overlap between frequent-term and rare-term selections
 * - produce the canonical SearchFrequencySignals contract
 *
 * CLASSIFICATION
 * - PRIVATE SEARCH ENGINE
 * - FREQUENCY SIGNAL DETECTION
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 * - DETERMINISTIC
 *
 * PARENTS
 * - Xyvala Search official protocol
 * - Search pipeline canonical contract
 * - Search lexical analysis core
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Search intrinsic anchor signal detector
 * - Search query-document signal detector
 * - Search frequency scorer
 * - Search convergence scorer
 * - Search private snapshot lineage
 * - Search audit and observability adapters
 *
 * DIRECTIVES
 * - consume SearchLexicalDocument only
 * - derive signals exclusively from canonical lexical statistics
 * - never read raw document content
 * - never read extracted document content
 * - never read segmented sentence text
 * - never retokenize
 * - never recount occurrences locally
 * - never rebuild the inverted term index
 * - never detect anchor sentences
 * - never analyze a search query
 * - never compute TF-IDF without a versioned corpus
 * - never silently replace missing corpus evidence
 * - never assign one term to both frequent and rare groups
 * - no network access
 * - no file-system access
 * - no database access
 * - no queue access
 * - no cache mutation
 * - no event publication
 * - no scoring aggregation
 * - no ranking
 * - no private decision
 * - no public projection
 * - no implicit timestamp generation
 * - no random tie-breaking
 *
 * INPUTS
 * - canonical SearchLexicalDocument
 * - explicit signal-detection timestamp
 * - optional explicit selection policy
 * - optional explicit detector module version
 *
 * OUTPUTS
 * - canonical SearchFrequencySignals
 *
 * INVARIANTS
 * - identical inputs and policies produce identical outputs
 * - frequent terms are ordered deterministically
 * - rare terms are ordered deterministically
 * - frequent and rare selections never overlap
 * - candidate filtering is explicit and versioned
 * - term occurrence counts come only from SearchLexicalDocument
 * - local frequency ratios are derived from canonical token count
 * - local rarity does not claim corpus-level rarity
 * - unavailable corpus evidence remains explicit
 * - the input SearchLexicalDocument is never mutated
 * - rejected lexical truth never becomes valid frequency truth
 *
 * CRITICAL DEPENDENCIES
 * - search-pipeline-contract.ts
 *
 * SENSITIVE AREAS
 * - candidate eligibility
 * - local rarity interpretation
 * - frequent-term ordering
 * - rare-term ordering
 * - deterministic tie-breaking
 * - overlap prevention
 * - short-token and numeric-noise exclusion
 * - insufficient-candidate degradation
 * ========================================================================== */

import type {
  SearchContractVersion,
  SearchFrequencySignals,
  SearchFrequencyTermSignal,
  SearchIsoTimestamp,
  SearchLexicalDocument,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchRarityMethod,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE CONSTANTS
 * ========================================================================== */

export const XYVALA_SEARCH_FREQUENCY_SIGNALS_CONTRACT_VERSION =
  "1.0.0" satisfies SearchContractVersion;

export const XYVALA_SEARCH_FREQUENCY_SIGNALS_MODULE_VERSION =
  "1.0.0" satisfies SearchModuleVersion;

export const XYVALA_SEARCH_FREQUENCY_SIGNALS_METHOD =
  "CANONICAL_LOCAL_FREQUENCY_AND_RARITY_SELECTION_V1";

export const XYVALA_SEARCH_FREQUENCY_SELECTION_POLICY_VERSION =
  "LOCAL_TERM_SELECTION_POLICY_V1";

export const XYVALA_SEARCH_DEFAULT_FREQUENT_TERM_LIMIT = 5;

export const XYVALA_SEARCH_DEFAULT_RARE_TERM_LIMIT = 5;

export const XYVALA_SEARCH_DEFAULT_MINIMUM_TERM_LENGTH = 2;

export const XYVALA_SEARCH_DEFAULT_RARITY_METHOD =
  "LOCAL_OCCURRENCE" satisfies SearchRarityMethod;

/* ============================================================================
 * 2. INPUT AND POLICY CONTRACTS
 * ----------------------------------------------------------------------------
 * The V0 policy is explicit rather than hidden in implementation details.
 *
 * Future corpus-aware rarity must use another method and provide a corpus
 * version. It must not silently change this local policy.
 * ========================================================================== */

export interface SearchFrequencySelectionPolicy {
  readonly policy_version: string;

  readonly frequent_term_limit: number;
  readonly rare_term_limit: number;

  readonly minimum_term_length: number;

  /**
   * Pure numeric terms are excluded by default because isolated years,
   * identifiers and counters frequently create false rarity signals.
   */
  readonly exclude_pure_numeric_terms: boolean;

  /**
   * Terms must contain at least one Unicode letter by default.
   * Alphanumeric terms such as x86 remain eligible.
   */
  readonly require_letter: boolean;

  /**
   * A term selected as frequent cannot also become rare.
   */
  readonly prevent_group_overlap: boolean;

  /**
   * V0 is local only. Corpus-aware methods require an explicit corpus version.
   */
  readonly rarity_method: SearchRarityMethod;
}

export interface SearchFrequencySignalsInput {
  readonly lexical_document: SearchLexicalDocument;
  readonly created_at: SearchIsoTimestamp;

  readonly selection_policy?: SearchFrequencySelectionPolicy;
  readonly detector_module_version?: SearchModuleVersion;

  /**
   * Required only for corpus-aware rarity methods.
   */
  readonly corpus_version?: string;
}

/* ============================================================================
 * 3. VALIDATION AND DEGRADATION CONTRACTS
 * ========================================================================== */

export type SearchFrequencySignalsRejectionReason =
  | "LEXICAL_DOCUMENT_REJECTED"
  | "DOCUMENT_ID_EMPTY"
  | "TOKEN_COUNT_INVALID"
  | "VOCABULARY_SIZE_INVALID"
  | "TERM_STATISTICS_EMPTY"
  | "TERM_STATISTICS_COUNT_MISMATCH"
  | "TERM_OCCURRENCE_COUNT_INVALID"
  | "TERM_SENTENCE_FREQUENCY_INVALID"
  | "TERM_DOCUMENT_FREQUENCY_RATIO_INVALID"
  | "DUPLICATE_NORMALIZED_TERM"
  | "CREATED_AT_INVALID"
  | "CREATED_AT_BEFORE_LEXICAL_ANALYSIS"
  | "DETECTOR_MODULE_VERSION_EMPTY"
  | "POLICY_VERSION_EMPTY"
  | "FREQUENT_TERM_LIMIT_INVALID"
  | "RARE_TERM_LIMIT_INVALID"
  | "MINIMUM_TERM_LENGTH_INVALID"
  | "RARITY_METHOD_UNSUPPORTED"
  | "CORPUS_VERSION_REQUIRED"
  | "NO_ELIGIBLE_TERM_CANDIDATES"
  | "FREQUENT_RARE_OVERLAP_DETECTED"
  | "SIGNAL_RANK_INVALID"
  | "SIGNAL_FREQUENCY_RATIO_INVALID"
  | "SIGNAL_OCCURRENCE_COUNT_INVALID";

export type SearchFrequencySignalsDegradationReason =
  | "UPSTREAM_LEXICAL_ANALYSIS_DEGRADED"
  | "LOCAL_RARITY_ONLY"
  | "CORPUS_RARITY_UNAVAILABLE"
  | "SHORT_TERMS_EXCLUDED"
  | "PURE_NUMERIC_TERMS_EXCLUDED"
  | "LETTERLESS_TERMS_EXCLUDED"
  | "INSUFFICIENT_FREQUENT_TERM_CANDIDATES"
  | "INSUFFICIENT_RARE_TERM_CANDIDATES"
  | "FREQUENT_TERMS_EXCLUDED_FROM_RARE_SELECTION";

export interface SearchFrequencySignalsValidationResult {
  readonly validation_state: SearchValidationState;
  readonly rejection_reasons:
    readonly SearchFrequencySignalsRejectionReason[];
}

interface SearchFrequencyCandidate {
  readonly normalized_term: string;
  readonly raw_forms: readonly string[];
  readonly occurrence_count: number;
  readonly sentence_frequency_count: number;
  readonly document_frequency_ratio: number;
  readonly local_frequency_ratio: number;
  readonly local_rarity_value: number;
}

interface SearchCandidateFilteringResult {
  readonly candidates: readonly SearchFrequencyCandidate[];
  readonly degradation_reasons:
    readonly SearchFrequencySignalsDegradationReason[];
}

/* ============================================================================
 * 4. DEFAULT POLICY
 * ========================================================================== */

export const XYVALA_SEARCH_DEFAULT_FREQUENCY_SELECTION_POLICY:
  SearchFrequencySelectionPolicy = Object.freeze({
    policy_version:
      XYVALA_SEARCH_FREQUENCY_SELECTION_POLICY_VERSION,

    frequent_term_limit:
      XYVALA_SEARCH_DEFAULT_FREQUENT_TERM_LIMIT,

    rare_term_limit:
      XYVALA_SEARCH_DEFAULT_RARE_TERM_LIMIT,

    minimum_term_length:
      XYVALA_SEARCH_DEFAULT_MINIMUM_TERM_LENGTH,

    exclude_pure_numeric_terms: true,
    require_letter: true,
    prevent_group_overlap: true,

    rarity_method: XYVALA_SEARCH_DEFAULT_RARITY_METHOD,
  });

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

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isUnitIntervalNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
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

function containsUnicodeLetter(value: string): boolean {
  return /\p{L}/u.test(value);
}

function isPureNumericTerm(value: string): boolean {
  return /^\p{N}+$/u.test(value);
}

function computeLocalFrequencyRatio(
  occurrenceCount: number,
  tokenCount: number,
): number {
  if (
    !isNonNegativeInteger(occurrenceCount) ||
    !isPositiveInteger(tokenCount)
  ) {
    return 0;
  }

  const ratio = occurrenceCount / tokenCount;

  if (ratio < 0) {
    return 0;
  }

  if (ratio > 1) {
    return 1;
  }

  return ratio;
}

/**
 * V0 rarity represents inverse local occurrence only.
 *
 * This value does not represent corpus rarity and must not be interpreted as
 * TF-IDF, IDF or semantic uniqueness.
 */
function computeLocalRarityValue(
  occurrenceCount: number,
): number {
  if (!isPositiveInteger(occurrenceCount)) {
    return 0;
  }

  return 1 / occurrenceCount;
}

function buildUnavailableCorpusEvidence():
  SearchOptionalEvidence<string> {
  return Object.freeze({
    availability_state: "UNAVAILABLE",
    reason:
      "Corpus-level rarity is unavailable under the local V0 rarity policy.",
  });
}

function buildAvailableCorpusEvidence(
  corpusVersion: string,
): SearchOptionalEvidence<string> {
  return Object.freeze({
    availability_state: "AVAILABLE",
    value: corpusVersion,
  });
}

/* ============================================================================
 * 6. POLICY RESOLUTION
 * ----------------------------------------------------------------------------
 * Resolution creates a stable immutable copy.
 *
 * It does not silently repair an invalid custom policy. Invalid values are
 * retained and rejected by boundary validation.
 * ========================================================================== */

function resolveSearchFrequencySelectionPolicy(
  policy: SearchFrequencySelectionPolicy | undefined,
): SearchFrequencySelectionPolicy {
  if (!policy) {
    return XYVALA_SEARCH_DEFAULT_FREQUENCY_SELECTION_POLICY;
  }

  return Object.freeze({
    policy_version: policy.policy_version,

    frequent_term_limit: policy.frequent_term_limit,
    rare_term_limit: policy.rare_term_limit,

    minimum_term_length: policy.minimum_term_length,

    exclude_pure_numeric_terms:
      policy.exclude_pure_numeric_terms,

    require_letter: policy.require_letter,
    prevent_group_overlap: policy.prevent_group_overlap,

    rarity_method: policy.rarity_method,
  });
}

/* ============================================================================
 * 7. LEXICAL → FREQUENCY SIGNAL BOUNDARY VALIDATION
 * ----------------------------------------------------------------------------
 * This validation never:
 * - repairs lexical statistics;
 * - recounts term occurrences;
 * - changes lexical terms;
 * - substitutes a missing corpus version.
 * ========================================================================== */

export function validateSearchFrequencySignalsInput(
  input: SearchFrequencySignalsInput,
): SearchFrequencySignalsValidationResult {
  const rejectionReasons =
    new Set<SearchFrequencySignalsRejectionReason>();

  const lexicalDocument = input.lexical_document;
  const policy = resolveSearchFrequencySelectionPolicy(
    input.selection_policy,
  );

  if (
    lexicalDocument.validation_state !== "VALID" &&
    lexicalDocument.validation_state !== "DEGRADED"
  ) {
    rejectionReasons.add("LEXICAL_DOCUMENT_REJECTED");
  }

  if (!isNonEmptyString(lexicalDocument.document_id)) {
    rejectionReasons.add("DOCUMENT_ID_EMPTY");
  }

  if (!isPositiveInteger(lexicalDocument.token_count)) {
    rejectionReasons.add("TOKEN_COUNT_INVALID");
  }

  if (!isPositiveInteger(lexicalDocument.vocabulary_size)) {
    rejectionReasons.add("VOCABULARY_SIZE_INVALID");
  }

  if (lexicalDocument.term_statistics.length === 0) {
    rejectionReasons.add("TERM_STATISTICS_EMPTY");
  }

  if (
    lexicalDocument.vocabulary_size !==
    lexicalDocument.term_statistics.length
  ) {
    rejectionReasons.add("TERM_STATISTICS_COUNT_MISMATCH");
  }

  const normalizedTerms = new Set<string>();

  for (const termStatistics of lexicalDocument.term_statistics) {
    if (normalizedTerms.has(termStatistics.normalized_term)) {
      rejectionReasons.add("DUPLICATE_NORMALIZED_TERM");
    }

    normalizedTerms.add(termStatistics.normalized_term);

    if (!isPositiveInteger(termStatistics.occurrence_count)) {
      rejectionReasons.add("TERM_OCCURRENCE_COUNT_INVALID");
    }

    if (
      !isPositiveInteger(
        termStatistics.sentence_frequency_count,
      )
    ) {
      rejectionReasons.add(
        "TERM_SENTENCE_FREQUENCY_INVALID",
      );
    }

    if (
      termStatistics.sentence_frequency_count >
      lexicalDocument.sentence_term_index.length
    ) {
      rejectionReasons.add(
        "TERM_SENTENCE_FREQUENCY_INVALID",
      );
    }

    if (
      !isUnitIntervalNumber(
        termStatistics.document_frequency_ratio,
      )
    ) {
      rejectionReasons.add(
        "TERM_DOCUMENT_FREQUENCY_RATIO_INVALID",
      );
    }
  }

  const createdAtValid = isValidIsoTimestamp(input.created_at);
  const lexicalCreatedAtValid = isValidIsoTimestamp(
    lexicalDocument.created_at,
  );

  if (!createdAtValid) {
    rejectionReasons.add("CREATED_AT_INVALID");
  }

  if (
    createdAtValid &&
    lexicalCreatedAtValid &&
    Date.parse(input.created_at) <
      Date.parse(lexicalDocument.created_at)
  ) {
    rejectionReasons.add(
      "CREATED_AT_BEFORE_LEXICAL_ANALYSIS",
    );
  }

  const detectorModuleVersion =
    input.detector_module_version ??
    XYVALA_SEARCH_FREQUENCY_SIGNALS_MODULE_VERSION;

  if (!isNonEmptyString(detectorModuleVersion)) {
    rejectionReasons.add("DETECTOR_MODULE_VERSION_EMPTY");
  }

  if (!isNonEmptyString(policy.policy_version)) {
    rejectionReasons.add("POLICY_VERSION_EMPTY");
  }

  if (!isPositiveInteger(policy.frequent_term_limit)) {
    rejectionReasons.add("FREQUENT_TERM_LIMIT_INVALID");
  }

  if (!isPositiveInteger(policy.rare_term_limit)) {
    rejectionReasons.add("RARE_TERM_LIMIT_INVALID");
  }

  if (!isPositiveInteger(policy.minimum_term_length)) {
    rejectionReasons.add("MINIMUM_TERM_LENGTH_INVALID");
  }

  if (
    policy.rarity_method !== "LOCAL_OCCURRENCE" &&
    policy.rarity_method !== "LOCAL_FREQUENCY" &&
    policy.rarity_method !== "TF_IDF" &&
    policy.rarity_method !== "CORPUS_IDF" &&
    policy.rarity_method !== "CUSTOM"
  ) {
    rejectionReasons.add("RARITY_METHOD_UNSUPPORTED");
  }

  if (
    (policy.rarity_method === "TF_IDF" ||
      policy.rarity_method === "CORPUS_IDF") &&
    !isNonEmptyString(input.corpus_version)
  ) {
    rejectionReasons.add("CORPUS_VERSION_REQUIRED");
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
 * 8. CANDIDATE FILTERING
 * ----------------------------------------------------------------------------
 * Candidate rules protect V0 from obvious local-noise terms.
 *
 * These rules remain explicit and versioned. They must not be changed
 * silently because they directly affect frequency and rarity truth.
 * ========================================================================== */

function buildSearchFrequencyCandidates(input: {
  readonly lexical_document: SearchLexicalDocument;
  readonly policy: SearchFrequencySelectionPolicy;
}): SearchCandidateFilteringResult {
  const candidates: SearchFrequencyCandidate[] = [];

  const degradationReasons =
    new Set<SearchFrequencySignalsDegradationReason>();

  for (
    const termStatistics of
      input.lexical_document.term_statistics
  ) {
    const normalizedTerm = termStatistics.normalized_term;

    if (
      normalizedTerm.length <
      input.policy.minimum_term_length
    ) {
      degradationReasons.add("SHORT_TERMS_EXCLUDED");
      continue;
    }

    if (
      input.policy.exclude_pure_numeric_terms &&
      isPureNumericTerm(normalizedTerm)
    ) {
      degradationReasons.add(
        "PURE_NUMERIC_TERMS_EXCLUDED",
      );
      continue;
    }

    if (
      input.policy.require_letter &&
      !containsUnicodeLetter(normalizedTerm)
    ) {
      degradationReasons.add(
        "LETTERLESS_TERMS_EXCLUDED",
      );
      continue;
    }

    candidates.push(
      Object.freeze({
        normalized_term: normalizedTerm,
        raw_forms: Object.freeze([
          ...termStatistics.raw_forms,
        ]),
        occurrence_count:
          termStatistics.occurrence_count,
        sentence_frequency_count:
          termStatistics.sentence_frequency_count,
        document_frequency_ratio:
          termStatistics.document_frequency_ratio,
        local_frequency_ratio:
          computeLocalFrequencyRatio(
            termStatistics.occurrence_count,
            input.lexical_document.token_count,
          ),
        local_rarity_value:
          computeLocalRarityValue(
            termStatistics.occurrence_count,
          ),
      }),
    );
  }

  return Object.freeze({
    candidates: Object.freeze(candidates),
    degradation_reasons: Object.freeze([
      ...degradationReasons,
    ]),
  });
}

/* ============================================================================
 * 9. DETERMINISTIC FREQUENT-TERM ORDER
 * ----------------------------------------------------------------------------
 * Dominant ordering:
 * 1. highest occurrence count;
 * 2. highest sentence frequency count;
 * 3. highest document frequency ratio;
 * 4. canonical lexical order.
 *
 * No unstable or random tie-breaking is authorized.
 * ========================================================================== */

function compareFrequentCandidates(
  left: SearchFrequencyCandidate,
  right: SearchFrequencyCandidate,
): number {
  if (left.occurrence_count !== right.occurrence_count) {
    return right.occurrence_count - left.occurrence_count;
  }

  if (
    left.sentence_frequency_count !==
    right.sentence_frequency_count
  ) {
    return (
      right.sentence_frequency_count -
      left.sentence_frequency_count
    );
  }

  if (
    left.document_frequency_ratio !==
    right.document_frequency_ratio
  ) {
    return (
      right.document_frequency_ratio -
      left.document_frequency_ratio
    );
  }

  return compareCanonicalStrings(
    left.normalized_term,
    right.normalized_term,
  );
}

/* ============================================================================
 * 10. DETERMINISTIC RARE-TERM ORDER
 * ----------------------------------------------------------------------------
 * Dominant ordering:
 * 1. lowest occurrence count;
 * 2. lowest sentence frequency count;
 * 3. lowest document frequency ratio;
 * 4. canonical lexical order.
 *
 * This is local rarity only.
 * ========================================================================== */

function compareRareCandidates(
  left: SearchFrequencyCandidate,
  right: SearchFrequencyCandidate,
): number {
  if (left.occurrence_count !== right.occurrence_count) {
    return left.occurrence_count - right.occurrence_count;
  }

  if (
    left.sentence_frequency_count !==
    right.sentence_frequency_count
  ) {
    return (
      left.sentence_frequency_count -
      right.sentence_frequency_count
    );
  }

  if (
    left.document_frequency_ratio !==
    right.document_frequency_ratio
  ) {
    return (
      left.document_frequency_ratio -
      right.document_frequency_ratio
    );
  }

  return compareCanonicalStrings(
    left.normalized_term,
    right.normalized_term,
  );
}

/* ============================================================================
 * 11. SIGNAL ASSEMBLY
 * ========================================================================== */

function buildFrequentTermSignals(input: {
  readonly candidates: readonly SearchFrequencyCandidate[];
  readonly limit: number;
}): readonly SearchFrequencyTermSignal[] {
  const orderedCandidates = [...input.candidates].sort(
    compareFrequentCandidates,
  );

  const selectedCandidates = orderedCandidates.slice(
    0,
    input.limit,
  );

  return Object.freeze(
    selectedCandidates.map(
      (
        candidate,
        candidateIndex,
      ): SearchFrequencyTermSignal =>
        Object.freeze({
          normalized_term: candidate.normalized_term,
          raw_forms: candidate.raw_forms,

          signal_kind: "FREQUENT",

          occurrence_count:
            candidate.occurrence_count,

          local_frequency_ratio:
            candidate.local_frequency_ratio,

          rarity_value: Object.freeze({
            availability_state: "AVAILABLE",
            value: candidate.local_rarity_value,
          }),

          rank_within_signal_group:
            candidateIndex + 1,
        }),
    ),
  );
}

function buildRareTermSignals(input: {
  readonly candidates: readonly SearchFrequencyCandidate[];
  readonly frequent_terms:
    readonly SearchFrequencyTermSignal[];
  readonly limit: number;
  readonly prevent_group_overlap: boolean;
}): {
  readonly rare_terms:
    readonly SearchFrequencyTermSignal[];
  readonly overlap_exclusion_applied: boolean;
} {
  const frequentTermNames = new Set(
    input.frequent_terms.map(
      (term) => term.normalized_term,
    ),
  );

  const eligibleRareCandidates =
    input.prevent_group_overlap
      ? input.candidates.filter(
          (candidate) =>
            !frequentTermNames.has(
              candidate.normalized_term,
            ),
        )
      : [...input.candidates];

  const overlapExclusionApplied =
    input.prevent_group_overlap &&
    eligibleRareCandidates.length <
      input.candidates.length;

  const orderedCandidates = [
    ...eligibleRareCandidates,
  ].sort(compareRareCandidates);

  const selectedCandidates = orderedCandidates.slice(
    0,
    input.limit,
  );

  return Object.freeze({
    rare_terms: Object.freeze(
      selectedCandidates.map(
        (
          candidate,
          candidateIndex,
        ): SearchFrequencyTermSignal =>
          Object.freeze({
            normalized_term:
              candidate.normalized_term,
            raw_forms: candidate.raw_forms,

            signal_kind: "RARE",

            occurrence_count:
              candidate.occurrence_count,

            local_frequency_ratio:
              candidate.local_frequency_ratio,

            rarity_value: Object.freeze({
              availability_state: "AVAILABLE",
              value:
                candidate.local_rarity_value,
            }),

            rank_within_signal_group:
              candidateIndex + 1,
          }),
      ),
    ),

    overlap_exclusion_applied:
      overlapExclusionApplied,
  });
}

/* ============================================================================
 * 12. OUTPUT INVARIANT VALIDATION
 * ========================================================================== */

export function validateSearchFrequencySignalsOutput(
  frequencySignals: SearchFrequencySignals,
): SearchFrequencySignalsValidationResult {
  const rejectionReasons =
    new Set<SearchFrequencySignalsRejectionReason>();

  const selectedTerms = new Set<string>();

  const validateSignalGroup = (
    signals: readonly SearchFrequencyTermSignal[],
    expectedKind: SearchFrequencyTermSignal["signal_kind"],
  ): void => {
    signals.forEach((signal, index) => {
      if (signal.signal_kind !== expectedKind) {
        rejectionReasons.add("SIGNAL_RANK_INVALID");
      }

      if (
        signal.rank_within_signal_group !==
        index + 1
      ) {
        rejectionReasons.add("SIGNAL_RANK_INVALID");
      }

      if (!isPositiveInteger(signal.occurrence_count)) {
        rejectionReasons.add(
          "SIGNAL_OCCURRENCE_COUNT_INVALID",
        );
      }

      if (
        !isUnitIntervalNumber(
          signal.local_frequency_ratio,
        )
      ) {
        rejectionReasons.add(
          "SIGNAL_FREQUENCY_RATIO_INVALID",
        );
      }

      if (selectedTerms.has(signal.normalized_term)) {
        rejectionReasons.add(
          "FREQUENT_RARE_OVERLAP_DETECTED",
        );
      }

      selectedTerms.add(signal.normalized_term);
    });
  };

  validateSignalGroup(
    frequencySignals.frequent_terms,
    "FREQUENT",
  );

  validateSignalGroup(
    frequencySignals.rare_terms,
    "RARE",
  );

  if (
    frequencySignals.frequent_terms.length >
    frequencySignals.requested_frequent_term_limit
  ) {
    rejectionReasons.add("SIGNAL_RANK_INVALID");
  }

  if (
    frequencySignals.rare_terms.length >
    frequencySignals.requested_rare_term_limit
  ) {
    rejectionReasons.add("SIGNAL_RANK_INVALID");
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
 * 13. REJECTED SIGNAL CONTRACT BUILDER
 * ----------------------------------------------------------------------------
 * Rejected lexical truth produces no fabricated signal.
 * ========================================================================== */

function buildRejectedSearchFrequencySignals(input: {
  readonly source_input: SearchFrequencySignalsInput;
  readonly policy: SearchFrequencySelectionPolicy;
  readonly rejection_reasons:
    readonly SearchFrequencySignalsRejectionReason[];
}): SearchFrequencySignals {
  const detectorModuleVersion =
    input.source_input.detector_module_version ??
    XYVALA_SEARCH_FREQUENCY_SIGNALS_MODULE_VERSION;

  const rejectedSignals: SearchFrequencySignals = {
    contract_version:
      XYVALA_SEARCH_FREQUENCY_SIGNALS_CONTRACT_VERSION,

    created_at: input.source_input.created_at,

    document_id:
      input.source_input.lexical_document.document_id,

    frequent_terms: Object.freeze([]),
    rare_terms: Object.freeze([]),

    requested_frequent_term_limit:
      input.policy.frequent_term_limit,

    requested_rare_term_limit:
      input.policy.rare_term_limit,

    rarity_method: input.policy.rarity_method,

    corpus_version:
      isNonEmptyString(
        input.source_input.corpus_version,
      )
        ? buildAvailableCorpusEvidence(
            input.source_input.corpus_version,
          )
        : buildUnavailableCorpusEvidence(),

    detector_module_version: detectorModuleVersion,

    validation_state: "REJECTED",

    degradation_reasons: Object.freeze([
      ...input.rejection_reasons,
    ]),
  };

  return Object.freeze(rejectedSignals);
}

/* ============================================================================
 * 14. CANONICAL FREQUENCY SIGNAL BUILDER
 * ----------------------------------------------------------------------------
 * This is the canonical producer of SearchFrequencySignals.
 *
 * Downstream modules must not locally redefine:
 * - the five frequent terms;
 * - the five rare terms;
 * - their order;
 * - their occurrence counts;
 * - their local frequency ratios.
 * ========================================================================== */

export function buildSearchFrequencySignals(
  input: SearchFrequencySignalsInput,
): SearchFrequencySignals {
  const policy = resolveSearchFrequencySelectionPolicy(
    input.selection_policy,
  );

  const boundaryValidation =
    validateSearchFrequencySignalsInput(input);

  if (boundaryValidation.validation_state === "REJECTED") {
    return buildRejectedSearchFrequencySignals({
      source_input: input,
      policy,
      rejection_reasons:
        boundaryValidation.rejection_reasons,
    });
  }

  const filteringResult =
    buildSearchFrequencyCandidates({
      lexical_document: input.lexical_document,
      policy,
    });

  if (filteringResult.candidates.length === 0) {
    return buildRejectedSearchFrequencySignals({
      source_input: input,
      policy,
      rejection_reasons: Object.freeze([
        "NO_ELIGIBLE_TERM_CANDIDATES",
      ]),
    });
  }

  const frequentTerms = buildFrequentTermSignals({
    candidates: filteringResult.candidates,
    limit: policy.frequent_term_limit,
  });

  const rareTermResult = buildRareTermSignals({
    candidates: filteringResult.candidates,
    frequent_terms: frequentTerms,
    limit: policy.rare_term_limit,
    prevent_group_overlap:
      policy.prevent_group_overlap,
  });

  const degradationReasons =
    new Set<SearchFrequencySignalsDegradationReason>(
      filteringResult.degradation_reasons,
    );

  if (
    input.lexical_document.validation_state ===
    "DEGRADED"
  ) {
    degradationReasons.add(
      "UPSTREAM_LEXICAL_ANALYSIS_DEGRADED",
    );
  }

  if (
    policy.rarity_method === "LOCAL_OCCURRENCE" ||
    policy.rarity_method === "LOCAL_FREQUENCY"
  ) {
    degradationReasons.add("LOCAL_RARITY_ONLY");
    degradationReasons.add(
      "CORPUS_RARITY_UNAVAILABLE",
    );
  }

  if (
    frequentTerms.length <
    policy.frequent_term_limit
  ) {
    degradationReasons.add(
      "INSUFFICIENT_FREQUENT_TERM_CANDIDATES",
    );
  }

  if (
    rareTermResult.rare_terms.length <
    policy.rare_term_limit
  ) {
    degradationReasons.add(
      "INSUFFICIENT_RARE_TERM_CANDIDATES",
    );
  }

  if (rareTermResult.overlap_exclusion_applied) {
    degradationReasons.add(
      "FREQUENT_TERMS_EXCLUDED_FROM_RARE_SELECTION",
    );
  }

  const detectorModuleVersion =
    input.detector_module_version ??
    XYVALA_SEARCH_FREQUENCY_SIGNALS_MODULE_VERSION;

  const frequencySignals: SearchFrequencySignals = {
    contract_version:
      XYVALA_SEARCH_FREQUENCY_SIGNALS_CONTRACT_VERSION,

    created_at: input.created_at,

    document_id:
      input.lexical_document.document_id,

    frequent_terms: frequentTerms,
    rare_terms: rareTermResult.rare_terms,

    requested_frequent_term_limit:
      policy.frequent_term_limit,

    requested_rare_term_limit:
      policy.rare_term_limit,

    rarity_method: policy.rarity_method,

    corpus_version:
      isNonEmptyString(input.corpus_version)
        ? buildAvailableCorpusEvidence(
            input.corpus_version,
          )
        : buildUnavailableCorpusEvidence(),

    detector_module_version: detectorModuleVersion,

    validation_state:
      degradationReasons.size > 0
        ? "DEGRADED"
        : "VALID",

    degradation_reasons: Object.freeze([
      ...degradationReasons,
    ]),
  };

  const outputValidation =
    validateSearchFrequencySignalsOutput(
      frequencySignals,
    );

  if (
    outputValidation.validation_state === "REJECTED"
  ) {
    const rejectedSignals: SearchFrequencySignals = {
      ...frequencySignals,

      validation_state: "REJECTED",

      degradation_reasons: Object.freeze([
        ...degradationReasons,
        ...outputValidation.rejection_reasons,
      ]),
    };

    return Object.freeze(rejectedSignals);
  }

  return Object.freeze(frequencySignals);
}

/* ============================================================================
 * 15. FREQUENCY SIGNAL ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * This pure reader determines whether the result may cross the:
 *
 * Frequency Signal Detection → Anchor Signal Detection boundary.
 *
 * DEGRADED remains propagable when at least one canonical signal exists.
 * A small document can legitimately provide fewer than five terms.
 * ========================================================================== */

export function isSearchFrequencySignalsAccepted(
  frequencySignals: SearchFrequencySignals,
): boolean {
  return (
    (frequencySignals.validation_state === "VALID" ||
      frequencySignals.validation_state === "DEGRADED") &&
    frequencySignals.frequent_terms.length > 0 &&
    frequencySignals.rare_terms.length > 0
  );
}
