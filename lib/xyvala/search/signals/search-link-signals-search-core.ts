/* ============================================================================
 * FILE: lib/xyvala/search/signals/search-link-signals-search-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical link-signal producer
 *
 * ROLE
 * - produce the canonical SearchLinkSignals truth for one document
 * - transform explicit inbound-link observations into deterministic,
 *   document-scoped link evidence
 * - preserve unavailable evidence explicitly
 * - expose supporting link evidence only
 *
 * CLASSIFICATION
 * - PRIVATE COMPUTE
 * - SEARCH DOMAIN
 * - CANONICAL PRODUCER
 * - DETERMINISTIC
 * - NON-ORCHESTRATING
 * - NON-PERSISTENT
 * - NON-MUTATING
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * PRODUCES
 * - SearchLinkSignals
 *
 * AUTHORIZED DOWNSTREAM CONSUMERS
 * - Link Authority Scoring
 * - Penalty Evaluation
 * - Private Snapshot
 * - authorized public transformer fields consuming validated snapshot truth
 *
 * DIRECTIVES
 * - one canonical producer for SearchLinkSignals
 * - no runtime orchestration
 * - no network access
 * - no persistence
 * - no event publication
 * - no ranking
 * - no query-relative relevance calculation
 * - no private decision
 * - no calibration
 * - no public projection
 * - no implicit runtime timestamp
 * - missing evidence remains explicitly unavailable
 * - invalid evidence remains explicitly invalid
 * - unavailable confidence never becomes zero confidence
 *
 * INPUTS
 * - deterministic document identity
 * - deterministic creation timestamp supplied by the authorized orchestrator
 * - explicit inbound-link observations supplied by an authorized adapter
 * - explicit producer policy
 *
 * OUTPUTS
 * - SearchLinkSignals
 *
 * INVARIANTS
 * - document identity is never reconstructed from downstream state
 * - created_at is never generated inside this module
 * - every observation belongs to the requested document target
 * - every produced normalized ratio is finite and within [0, 1]
 * - zero observations never become neutral numerical link evidence
 * - unavailable evidence never becomes zero evidence
 * - unavailable confidence never becomes zero confidence
 * - rejected evidence remains INVALID
 * - query identity is not introduced by this layer
 * - no score vector is produced by this layer
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - external-link evidence availability
 * - source-domain identity
 * - repeated anchor text
 * - reciprocal-link evidence
 * - suspected source clusters
 * - confidence governance
 * ========================================================================== */

import type {
  SearchAvailabilityState,
  SearchConfidenceScore,
  SearchContractVersion,
  SearchCount,
  SearchDocumentId,
  SearchIsoTimestamp,
  SearchLinkSignals,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchRatio,
  SearchUri,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME =
  "xyvala-search-link-signals-search-core" as const;

export const XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

export const XYVALA_SEARCH_LINK_SIGNALS_CONTRACT_VERSION:
  SearchContractVersion =
    "2.0.0";

/* ============================================================================
 * 2. PRODUCER POLICY
 * ----------------------------------------------------------------------------
 * Producer policy governs only deterministic interpretation of explicit
 * link observations.
 *
 * It does not govern:
 * - link-authority scoring
 * - penalties
 * - eligibility
 * - cohort normalization
 * - private decision
 * - public ranking
 * ========================================================================== */

export interface SearchLinkSignalsSearchPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  readonly full_confidence_observation_count:
    SearchCount;

  readonly observation_volume_confidence_weight:
    SearchRatio;

  readonly source_domain_confidence_weight:
    SearchRatio;

  readonly anchor_text_confidence_weight:
    SearchRatio;

  readonly reciprocal_evidence_confidence_weight:
    SearchRatio;

  readonly cluster_evidence_confidence_weight:
    SearchRatio;
}

export const DEFAULT_XYVALA_SEARCH_LINK_SIGNALS_SEARCH_POLICY:
  SearchLinkSignalsSearchPolicy =
    Object.freeze({
      policy_version:
        "1.0.0",

      full_confidence_observation_count:
        20,

      observation_volume_confidence_weight:
        0.3,

      source_domain_confidence_weight:
        0.2,

      anchor_text_confidence_weight:
        0.2,

      reciprocal_evidence_confidence_weight:
        0.15,

      cluster_evidence_confidence_weight:
        0.15,
    });

/* ============================================================================
 * 3. PRODUCER INPUT CONTRACT
 * ========================================================================== */

export interface SearchInboundLinkObservation {
  readonly source_uri:
    SearchUri;

  readonly anchor_text?:
    string;

  readonly reciprocal_link_observed?:
    boolean;

  readonly suspected_link_cluster?:
    boolean;

  readonly observed_at:
    SearchIsoTimestamp;
}

export interface SearchLinkSignalsSearchInput {
  readonly document_id:
    SearchDocumentId;

  /**
   * Explicit deterministic timestamp supplied by the authorized execution
   * boundary.
   *
   * This producer must never generate its own runtime timestamp.
   */
  readonly created_at:
    SearchIsoTimestamp;

  readonly observations:
    readonly SearchInboundLinkObservation[];

  readonly link_data_provider?:
    string;

  readonly policy?:
    SearchLinkSignalsSearchPolicy;
}

/* ============================================================================
 * 4. INTERNAL VALIDATION RESULT
 * ========================================================================== */

interface SearchLinkSignalsBoundaryValidation {
  readonly validation_state:
    SearchValidationState;

  readonly rejection_reasons:
    readonly string[];
}

/* ============================================================================
 * 5. BASIC ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    string,

  fieldName:
    string,
): void {
  if (
    value.trim().length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

function assertFiniteNonNegativeNumber(
  value:
    number,

  fieldName:
    string,
): void {
  if (
    !Number.isFinite(
      value,
    ) ||
    value <
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be finite and non-negative.`,
    );
  }
}

function assertNormalizedNumber(
  value:
    number,

  fieldName:
    string,
): void {
  if (
    !Number.isFinite(
      value,
    ) ||
    value <
      0 ||
    value >
      1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be finite and within [0, 1].`,
    );
  }
}

function assertValidIsoTimestamp(
  value:
    SearchIsoTimestamp,

  fieldName:
    string,
): void {
  assertNonEmptyString(
    value,
    fieldName,
  );

  const parsed =
    Date.parse(
      value,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

/* ============================================================================
 * 6. URI HELPERS
 * ========================================================================== */

function normalizeUri(
  uri:
    SearchUri,

  fieldName:
    string,
): string {
  assertNonEmptyString(
    uri,
    fieldName,
  );

  try {
    const parsed =
      new URL(
        uri,
      );

    if (
      parsed.protocol !==
        "http:" &&
      parsed.protocol !==
        "https:"
    ) {
      throw new Error(
        "unsupported protocol",
      );
    }

    parsed.hash =
      "";

    return parsed.toString();
  } catch {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be a valid HTTP(S) URI.`,
    );
  }
}

function resolveSourceDomain(
  sourceUri:
    SearchUri,
): string {
  const parsed =
    new URL(
      sourceUri,
    );

  return parsed.hostname
    .toLowerCase();
}

/* ============================================================================
 * 7. POLICY VALIDATION
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchLinkSignalsSearchPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertFiniteNonNegativeNumber(
    policy.full_confidence_observation_count,
    "policy.full_confidence_observation_count",
  );

  if (
    !Number.isInteger(
      policy.full_confidence_observation_count,
    ) ||
    policy.full_confidence_observation_count <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Policy violation: full_confidence_observation_count must be a positive integer.",
    );
  }

  const confidenceWeights:
    readonly SearchRatio[] =
    Object.freeze([
      policy.observation_volume_confidence_weight,
      policy.source_domain_confidence_weight,
      policy.anchor_text_confidence_weight,
      policy.reciprocal_evidence_confidence_weight,
      policy.cluster_evidence_confidence_weight,
    ]);

  confidenceWeights.forEach(
    (
      weight,
      index,
    ) => {
      assertNormalizedNumber(
        weight,
        `policy.confidence_weight[${String(index)}]`,
      );
    },
  );

  const totalWeight =
    confidenceWeights.reduce(
      (
        sum,
        weight,
      ) =>
        sum +
        weight,
      0,
    );

  if (
    Math.abs(
      totalWeight -
        1,
    ) >
    1e-9
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Policy violation: confidence weights must sum to 1.",
    );
  }
}

/* ============================================================================
 * 8. INPUT VALIDATION
 * ========================================================================== */

function validateSearchLinkSignalsSearchInput(
  input:
    SearchLinkSignalsSearchInput,

  policy:
    SearchLinkSignalsSearchPolicy,
): SearchLinkSignalsBoundaryValidation {
  const rejectionReasons =
    new Set<string>();

  try {
    assertNonEmptyString(
      input.document_id,
      "document_id",
    );

    assertValidIsoTimestamp(
      input.created_at,
      "created_at",
    );

    validatePolicy(
      policy,
    );

    if (
      input.link_data_provider !==
        undefined &&
      input.link_data_provider
        .trim()
        .length ===
        0
    ) {
      rejectionReasons.add(
        "LINK_DATA_PROVIDER_EMPTY",
      );
    }

    input.observations.forEach(
      (
        observation,
        index,
      ) => {
        try {
          normalizeUri(
            observation.source_uri,
            `observations[${String(index)}].source_uri`,
          );

          assertValidIsoTimestamp(
            observation.observed_at,
            `observations[${String(index)}].observed_at`,
          );
        } catch {
          rejectionReasons.add(
            `INVALID_LINK_OBSERVATION:${String(index)}`,
          );
        }
      },
    );
  } catch (
    error
  ) {
    rejectionReasons.add(
      error instanceof
        Error
        ? error.message
        : "UNKNOWN_BOUNDARY_VIOLATION",
    );
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.size >
      0
        ? "REJECTED"
        : "VALID",

    rejection_reasons:
      Object.freeze(
        Array.from(
          rejectionReasons,
        ).sort(),
      ),
  });
}

/* ============================================================================
 * 9. AVAILABILITY HELPERS
 * ----------------------------------------------------------------------------
 * AVAILABLE(0) is legitimate only when zero is canonical truth.
 *
 * Non-AVAILABLE evidence never contains a numerical substitute.
 * ========================================================================== */

function available<T>(
  value:
    T,
): SearchOptionalEvidence<T> {
  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value,
  });
}

function unavailable<T>(
  reason:
    string,

  availabilityState:
    Exclude<
      SearchAvailabilityState,
      "AVAILABLE"
    > =
      "UNAVAILABLE",
): SearchOptionalEvidence<T> {
  assertNonEmptyString(
    reason,
    "availability.reason",
  );

  return Object.freeze({
    availability_state:
      availabilityState,

    reason,
  });
}

/* ============================================================================
 * 10. NORMALIZATION HELPERS
 * ========================================================================== */

function clamp01(
  value:
    number,
): SearchNormalizedScore {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: normalized value must be finite.",
    );
  }

  if (
    value <=
      0
  ) {
    return 0;
  }

  if (
    value >=
      1
  ) {
    return 1;
  }

  return value;
}

function safeRatio(
  numerator:
    number,

  denominator:
    number,
): SearchRatio {
  if (
    !Number.isFinite(
      numerator,
    ) ||
    numerator <
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: ratio numerator must be finite and non-negative.",
    );
  }

  if (
    !Number.isFinite(
      denominator,
    ) ||
    denominator <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: ratio denominator must be finite and positive.",
    );
  }

  return clamp01(
    numerator /
      denominator,
  );
}

function normalizeAnchorText(
  anchorText:
    string,
): string {
  return anchorText
    .normalize(
      "NFKC",
    )
    .trim()
    .toLocaleLowerCase()
    .replace(
      /\s+/g,
      " ",
    );
}

/* ============================================================================
 * 11. CANONICAL OBSERVATION PROJECTION
 * ========================================================================== */

interface CanonicalLinkObservation {
  readonly source_uri:
    string;

  readonly source_domain:
    string;

  readonly normalized_anchor_text?:
    string;

  readonly reciprocal_link_observed?:
    boolean;

  readonly suspected_link_cluster?:
    boolean;

  readonly observed_at:
    SearchIsoTimestamp;
}

function buildCanonicalObservation(
  observation:
    SearchInboundLinkObservation,

  index:
    number,
): CanonicalLinkObservation {
  const sourceUri =
    normalizeUri(
      observation.source_uri,
      `observations[${String(index)}].source_uri`,
    );

  const sourceDomain =
    resolveSourceDomain(
      sourceUri,
    );

  const normalizedAnchorText =
    observation.anchor_text ===
    undefined
      ? undefined
      : normalizeAnchorText(
          observation.anchor_text,
        );

  const base = {
    source_uri:
      sourceUri,

    source_domain:
      sourceDomain,

    observed_at:
      observation.observed_at,
  };

  const withAnchor =
    normalizedAnchorText !==
      undefined &&
    normalizedAnchorText.length >
      0
      ? {
          ...base,

          normalized_anchor_text:
            normalizedAnchorText,
        }
      : base;

  const withReciprocal =
    observation
      .reciprocal_link_observed !==
    undefined
      ? {
          ...withAnchor,

          reciprocal_link_observed:
            observation
              .reciprocal_link_observed,
        }
      : withAnchor;

  const canonical:
    CanonicalLinkObservation =
    observation
      .suspected_link_cluster !==
    undefined
      ? {
          ...withReciprocal,

          suspected_link_cluster:
            observation
              .suspected_link_cluster,
        }
      : withReciprocal;

  return Object.freeze(
    canonical,
  );
}

function buildCanonicalObservations(
  observations:
    readonly SearchInboundLinkObservation[],
): readonly CanonicalLinkObservation[] {
  return Object.freeze(
    observations.map(
      (
        observation,
        index,
      ) =>
        buildCanonicalObservation(
          observation,
          index,
        ),
    ),
  );
}

/* ============================================================================
 * 12. CORE COUNT EVIDENCE
 * ========================================================================== */

interface CoreLinkCounts {
  readonly inbound_link_count:
    SearchCount;

  readonly unique_source_page_count:
    SearchCount;

  readonly unique_source_domain_count:
    SearchCount;
}

function computeCoreLinkCounts(
  observations:
    readonly CanonicalLinkObservation[],
): CoreLinkCounts {
  const sourcePages =
    new Set<string>();

  const sourceDomains =
    new Set<string>();

  for (
    const observation of
      observations
  ) {
    sourcePages.add(
      observation.source_uri,
    );

    sourceDomains.add(
      observation.source_domain,
    );
  }

  return Object.freeze({
    inbound_link_count:
      observations.length,

    unique_source_page_count:
      sourcePages.size,

    unique_source_domain_count:
      sourceDomains.size,
  });
}

/* ============================================================================
 * 13. SOURCE DIVERSITY
 * ========================================================================== */

function computeSourceDiversityScore(
  counts:
    CoreLinkCounts,
): SearchOptionalEvidence<SearchNormalizedScore> {
  if (
    counts.unique_source_page_count ===
    0
  ) {
    return unavailable<SearchNormalizedScore>(
      "SOURCE_DIVERSITY_UNAVAILABLE:NO_LINK_OBSERVATIONS",
    );
  }

  return available<SearchNormalizedScore>(
    safeRatio(
      counts.unique_source_domain_count,
      counts.unique_source_page_count,
    ),
  );
}

/* ============================================================================
 * 14. ANCHOR-TEXT EVIDENCE
 * ========================================================================== */

interface AnchorTextEvidence {
  readonly convergence_score:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly repeated_anchor_text_ratio:
    SearchOptionalEvidence<SearchRatio>;
}

function computeAnchorTextEvidence(
  observations:
    readonly CanonicalLinkObservation[],
): AnchorTextEvidence {
  const anchorTexts:
    string[] =
    [];

  for (
    const observation of
      observations
  ) {
    const anchorText =
      observation
        .normalized_anchor_text;

    if (
      anchorText !==
      undefined
    ) {
      anchorTexts.push(
        anchorText,
      );
    }
  }

  if (
    anchorTexts.length ===
    0
  ) {
    return Object.freeze({
      convergence_score:
        unavailable<SearchNormalizedScore>(
          "ANCHOR_TEXT_CONVERGENCE_UNAVAILABLE:NO_ANCHOR_TEXT_EVIDENCE",
        ),

      repeated_anchor_text_ratio:
        unavailable<SearchRatio>(
          "REPEATED_ANCHOR_TEXT_RATIO_UNAVAILABLE:NO_ANCHOR_TEXT_EVIDENCE",
        ),
    });
  }

  const frequencies =
    new Map<
      string,
      number
    >();

  for (
    const anchorText of
      anchorTexts
  ) {
    frequencies.set(
      anchorText,
      (
        frequencies.get(
          anchorText,
        ) ??
        0
      ) +
        1,
    );
  }

  let maximumFrequency =
    0;

  for (
    const frequency of
      frequencies.values()
  ) {
    if (
      frequency >
      maximumFrequency
    ) {
      maximumFrequency =
        frequency;
    }
  }

  let repeatedObservationCount =
    0;

  for (
    const anchorText of
      anchorTexts
  ) {
    const frequency =
      frequencies.get(
        anchorText,
      );

    if (
      frequency !==
        undefined &&
      frequency >
        1
    ) {
      repeatedObservationCount +=
        1;
    }
  }

  return Object.freeze({
    convergence_score:
      available<SearchNormalizedScore>(
        safeRatio(
          maximumFrequency,
          anchorTexts.length,
        ),
      ),

    repeated_anchor_text_ratio:
      available<SearchRatio>(
        safeRatio(
          repeatedObservationCount,
          anchorTexts.length,
        ),
      ),
  });
}

/* ============================================================================
 * 15. BOOLEAN OBSERVATION RATIOS
 * ----------------------------------------------------------------------------
 * Only explicitly observed boolean evidence participates.
 *
 * undefined means unavailable evidence and is excluded from the denominator.
 * ========================================================================== */

function computeObservedBooleanRatio(
  observations:
    readonly CanonicalLinkObservation[],

  selector:
    (
      observation:
        CanonicalLinkObservation,
    ) =>
      | boolean
      | undefined,

  unavailableReason:
    string,
): SearchOptionalEvidence<SearchRatio> {
  let observedCount =
    0;

  let positiveCount =
    0;

  for (
    const observation of
      observations
  ) {
    const value =
      selector(
        observation,
      );

    if (
      value ===
      undefined
    ) {
      continue;
    }

    observedCount +=
      1;

    if (
      value
    ) {
      positiveCount +=
        1;
    }
  }

  if (
    observedCount ===
    0
  ) {
    return unavailable<SearchRatio>(
      unavailableReason,
    );
  }

  return available<SearchRatio>(
    safeRatio(
      positiveCount,
      observedCount,
    ),
  );
}

/* ============================================================================
 * 16. OBSERVATION TIMESTAMP
 * ========================================================================== */

function resolveLatestObservedAt(
  observations:
    readonly CanonicalLinkObservation[],
): SearchOptionalEvidence<SearchIsoTimestamp> {
  const firstObservation =
    observations.at(
      0,
    );

  if (
    firstObservation ===
    undefined
  ) {
    return unavailable<SearchIsoTimestamp>(
      "LINK_DATA_OBSERVED_AT_UNAVAILABLE:NO_LINK_OBSERVATIONS",
    );
  }

  let latest =
    firstObservation
      .observed_at;

  let latestEpoch =
    Date.parse(
      latest,
    );

  for (
    const observation of
      observations.slice(
        1,
      )
  ) {
    const candidate =
      observation
        .observed_at;

    const candidateEpoch =
      Date.parse(
        candidate,
      );

    if (
      candidateEpoch >
      latestEpoch
    ) {
      latest =
        candidate;

      latestEpoch =
        candidateEpoch;
    }
  }

  return available<SearchIsoTimestamp>(
    latest,
  );
}

/* ============================================================================
 * 17. PROVIDER EVIDENCE
 * ========================================================================== */

function resolveLinkDataProvider(
  provider:
    string | undefined,
): SearchOptionalEvidence<string> {
  if (
    provider ===
    undefined
  ) {
    return unavailable<string>(
      "LINK_DATA_PROVIDER_UNAVAILABLE",
    );
  }

  const normalizedProvider =
    provider.trim();

  if (
    normalizedProvider.length ===
    0
  ) {
    return unavailable<string>(
      "LINK_DATA_PROVIDER_UNAVAILABLE:EMPTY_PROVIDER",
    );
  }

  return available<string>(
    normalizedProvider,
  );
}

/* ============================================================================
 * 18. CONFIDENCE
 * ----------------------------------------------------------------------------
 * link_signal_confidence is canonical optional evidence.
 *
 * AVAILABLE(0)
 * - a canonical confidence of zero was actually calculated.
 *
 * Non-AVAILABLE
 * - no canonical confidence value exists.
 *
 * Missing observations therefore never become AVAILABLE(0).
 * ========================================================================== */

function evidenceAvailabilityFactor<T>(
  evidence:
    SearchOptionalEvidence<T>,
): SearchRatio {
  return evidence
    .availability_state ===
    "AVAILABLE"
    ? 1
    : 0;
}

function computeLinkSignalConfidence(
  args: {
    readonly observation_count:
      SearchCount;

    readonly source_diversity_score:
      SearchOptionalEvidence<SearchNormalizedScore>;

    readonly anchor_text_convergence_score:
      SearchOptionalEvidence<SearchNormalizedScore>;

    readonly reciprocal_link_ratio:
      SearchOptionalEvidence<SearchRatio>;

    readonly suspected_link_cluster_ratio:
      SearchOptionalEvidence<SearchRatio>;

    readonly policy:
      SearchLinkSignalsSearchPolicy;
  },
): SearchOptionalEvidence<SearchConfidenceScore> {
  if (
    args.observation_count ===
    0
  ) {
    return unavailable<SearchConfidenceScore>(
      "LINK_SIGNAL_CONFIDENCE_UNAVAILABLE:NO_LINK_OBSERVATIONS",
    );
  }

  const volumeConfidence =
    clamp01(
      args.observation_count /
        args.policy
          .full_confidence_observation_count,
    );

  const sourceDomainAvailability =
    evidenceAvailabilityFactor(
      args.source_diversity_score,
    );

  const anchorTextAvailability =
    evidenceAvailabilityFactor(
      args.anchor_text_convergence_score,
    );

  const reciprocalAvailability =
    evidenceAvailabilityFactor(
      args.reciprocal_link_ratio,
    );

  const clusterAvailability =
    evidenceAvailabilityFactor(
      args.suspected_link_cluster_ratio,
    );

  const confidence =
    volumeConfidence *
      args.policy
        .observation_volume_confidence_weight +
    sourceDomainAvailability *
      args.policy
        .source_domain_confidence_weight +
    anchorTextAvailability *
      args.policy
        .anchor_text_confidence_weight +
    reciprocalAvailability *
      args.policy
        .reciprocal_evidence_confidence_weight +
    clusterAvailability *
      args.policy
        .cluster_evidence_confidence_weight;

  return available<SearchConfidenceScore>(
    clamp01(
      confidence,
    ),
  );
}

/* ============================================================================
 * 19. OUTPUT VALIDATION STATE
 * ========================================================================== */

interface SearchLinkSignalsOutputValidation {
  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

function addUnavailableEvidenceReason<T>(
  degradationReasons:
    Set<string>,

  reason:
    string,

  evidence:
    SearchOptionalEvidence<T>,
): void {
  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    degradationReasons.add(
      reason,
    );
  }
}

function resolveOutputValidationState(
  args: {
    readonly observation_count:
      SearchCount;

    readonly source_diversity_score:
      SearchOptionalEvidence<SearchNormalizedScore>;

    readonly anchor_text_convergence_score:
      SearchOptionalEvidence<SearchNormalizedScore>;

    readonly reciprocal_link_ratio:
      SearchOptionalEvidence<SearchRatio>;

    readonly suspected_link_cluster_ratio:
      SearchOptionalEvidence<SearchRatio>;

    readonly repeated_anchor_text_ratio:
      SearchOptionalEvidence<SearchRatio>;

    readonly link_signal_confidence:
      SearchOptionalEvidence<SearchConfidenceScore>;

    readonly link_data_provider:
      SearchOptionalEvidence<string>;

    readonly link_data_observed_at:
      SearchOptionalEvidence<SearchIsoTimestamp>;
  },
): SearchLinkSignalsOutputValidation {
  const degradationReasons =
    new Set<string>();

  if (
    args.observation_count ===
    0
  ) {
    degradationReasons.add(
      "NO_LINK_OBSERVATIONS",
    );
  }

  addUnavailableEvidenceReason(
    degradationReasons,
    "SOURCE_DIVERSITY_UNAVAILABLE",
    args.source_diversity_score,
  );

  addUnavailableEvidenceReason(
    degradationReasons,
    "ANCHOR_TEXT_CONVERGENCE_UNAVAILABLE",
    args.anchor_text_convergence_score,
  );

  addUnavailableEvidenceReason(
    degradationReasons,
    "RECIPROCAL_LINK_RATIO_UNAVAILABLE",
    args.reciprocal_link_ratio,
  );

  addUnavailableEvidenceReason(
    degradationReasons,
    "LINK_CLUSTER_RATIO_UNAVAILABLE",
    args.suspected_link_cluster_ratio,
  );

  addUnavailableEvidenceReason(
    degradationReasons,
    "REPEATED_ANCHOR_TEXT_RATIO_UNAVAILABLE",
    args.repeated_anchor_text_ratio,
  );

  addUnavailableEvidenceReason(
    degradationReasons,
    "LINK_SIGNAL_CONFIDENCE_UNAVAILABLE",
    args.link_signal_confidence,
  );

  addUnavailableEvidenceReason(
    degradationReasons,
    "LINK_DATA_PROVIDER_UNAVAILABLE",
    args.link_data_provider,
  );

  addUnavailableEvidenceReason(
    degradationReasons,
    "LINK_DATA_OBSERVED_AT_UNAVAILABLE",
    args.link_data_observed_at,
  );

  return Object.freeze({
    validation_state:
      degradationReasons.size ===
      0
        ? "VALID"
        : "DEGRADED",

    degradation_reasons:
      Object.freeze(
        Array.from(
          degradationReasons,
        ).sort(),
      ),
  });
}

/* ============================================================================
 * 20. REJECTED OUTPUT
 * ----------------------------------------------------------------------------
 * Rejected producer input creates INVALID evidence, never synthetic neutral
 * evidence.
 * ========================================================================== */

function buildRejectedSearchLinkSignals(
  input:
    SearchLinkSignalsSearchInput,

  rejectionReasons:
    readonly string[],
): SearchLinkSignals {
  const reason =
    rejectionReasons.length >
    0
      ? rejectionReasons.join(
          "; ",
        )
      : "LINK_SIGNALS_INPUT_REJECTED";

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_LINK_SIGNALS_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      input.document_id,

    inbound_link_count:
      unavailable<SearchCount>(
        reason,
        "INVALID",
      ),

    unique_source_page_count:
      unavailable<SearchCount>(
        reason,
        "INVALID",
      ),

    unique_source_domain_count:
      unavailable<SearchCount>(
        reason,
        "INVALID",
      ),

    source_diversity_score:
      unavailable<SearchNormalizedScore>(
        reason,
        "INVALID",
      ),

    anchor_text_convergence_score:
      unavailable<SearchNormalizedScore>(
        reason,
        "INVALID",
      ),

    reciprocal_link_ratio:
      unavailable<SearchRatio>(
        reason,
        "INVALID",
      ),

    suspected_link_cluster_ratio:
      unavailable<SearchRatio>(
        reason,
        "INVALID",
      ),

    repeated_anchor_text_ratio:
      unavailable<SearchRatio>(
        reason,
        "INVALID",
      ),

    link_signal_confidence:
      unavailable<SearchConfidenceScore>(
        reason,
        "INVALID",
      ),

    link_data_provider:
      unavailable<string>(
        reason,
        "INVALID",
      ),

    link_data_observed_at:
      unavailable<SearchIsoTimestamp>(
        reason,
        "INVALID",
      ),

    validation_state:
      "REJECTED",

    degradation_reasons:
      Object.freeze(
        rejectionReasons.length >
        0
          ? [
              ...rejectionReasons,
            ].sort()
          : [
              "LINK_SIGNALS_INPUT_REJECTED",
            ],
      ),
  });
}

/* ============================================================================
 * 21. OUTPUT ASSERTIONS
 * ========================================================================== */

function validateNormalizedEvidence(
  fieldName:
    string,

  evidence:
    SearchOptionalEvidence<number>,
): void {
  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    assertNormalizedNumber(
      evidence.value,
      `${fieldName}.value`,
    );

    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

function validateCountEvidence(
  fieldName:
    string,

  evidence:
    SearchOptionalEvidence<SearchCount>,
): void {
  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    assertFiniteNonNegativeNumber(
      evidence.value,
      `${fieldName}.value`,
    );

    if (
      !Number.isInteger(
        evidence.value,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
          `Output invariant violation: ${fieldName}.value must be an integer.`,
      );
    }

    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

function validateConfidenceEvidence(
  fieldName:
    string,

  evidence:
    SearchOptionalEvidence<SearchConfidenceScore>,
): void {
  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    assertNormalizedNumber(
      evidence.value,
      `${fieldName}.value`,
    );

    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

export function validateSearchLinkSignalsOutput(
  signals:
    SearchLinkSignals,
): void {
  assertNonEmptyString(
    signals.document_id,
    "signals.document_id",
  );

  assertValidIsoTimestamp(
    signals.created_at,
    "signals.created_at",
  );

  validateCountEvidence(
    "signals.inbound_link_count",
    signals.inbound_link_count,
  );

  validateCountEvidence(
    "signals.unique_source_page_count",
    signals.unique_source_page_count,
  );

  validateCountEvidence(
    "signals.unique_source_domain_count",
    signals.unique_source_domain_count,
  );

  validateNormalizedEvidence(
    "signals.source_diversity_score",
    signals.source_diversity_score,
  );

  validateNormalizedEvidence(
    "signals.anchor_text_convergence_score",
    signals.anchor_text_convergence_score,
  );

  validateNormalizedEvidence(
    "signals.reciprocal_link_ratio",
    signals.reciprocal_link_ratio,
  );

  validateNormalizedEvidence(
    "signals.suspected_link_cluster_ratio",
    signals.suspected_link_cluster_ratio,
  );

  validateNormalizedEvidence(
    "signals.repeated_anchor_text_ratio",
    signals.repeated_anchor_text_ratio,
  );

  validateConfidenceEvidence(
    "signals.link_signal_confidence",
    signals.link_signal_confidence,
  );

  if (
    signals
      .link_data_provider
      .availability_state ===
    "AVAILABLE"
  ) {
    assertNonEmptyString(
      signals
        .link_data_provider
        .value,
      "signals.link_data_provider.value",
    );
  } else {
    assertNonEmptyString(
      signals
        .link_data_provider
        .reason,
      "signals.link_data_provider.reason",
    );
  }

  if (
    signals
      .link_data_observed_at
      .availability_state ===
    "AVAILABLE"
  ) {
    assertValidIsoTimestamp(
      signals
        .link_data_observed_at
        .value,
      "signals.link_data_observed_at.value",
    );
  } else {
    assertNonEmptyString(
      signals
        .link_data_observed_at
        .reason,
      "signals.link_data_observed_at.reason",
    );
  }

  if (
    signals.validation_state ===
      "VALID" &&
    signals.degradation_reasons.length >
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: VALID output cannot contain degradation reasons.",
    );
  }

  if (
    signals.validation_state ===
      "DEGRADED" &&
    signals.degradation_reasons.length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: DEGRADED output must contain at least one degradation reason.",
    );
  }

  if (
    signals.validation_state ===
      "REJECTED" &&
    signals.degradation_reasons.length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: REJECTED output must contain at least one reason.",
    );
  }
}

/* ============================================================================
 * 22. NO-OBSERVATION OUTPUT
 * ----------------------------------------------------------------------------
 * Zero supplied observations means absence of validated external-link
 * observation evidence.
 *
 * It does NOT mean:
 * - zero inbound links exist;
 * - zero source pages exist;
 * - zero source domains exist;
 * - source diversity equals zero;
 * - reciprocal ratio equals zero;
 * - link confidence equals zero.
 *
 * Missing evidence remains explicitly unavailable.
 * ========================================================================== */

function buildUnavailableSearchLinkSignals(
  input:
    SearchLinkSignalsSearchInput,
): SearchLinkSignals {
  const unavailableReason =
    "NO_LINK_OBSERVATIONS";

  const linkDataProvider =
    resolveLinkDataProvider(
      input.link_data_provider,
    );

  const degradationReasons =
    new Set<string>([
      "NO_LINK_OBSERVATIONS",
      "SOURCE_DIVERSITY_UNAVAILABLE",
      "ANCHOR_TEXT_CONVERGENCE_UNAVAILABLE",
      "RECIPROCAL_LINK_RATIO_UNAVAILABLE",
      "LINK_CLUSTER_RATIO_UNAVAILABLE",
      "REPEATED_ANCHOR_TEXT_RATIO_UNAVAILABLE",
      "LINK_SIGNAL_CONFIDENCE_UNAVAILABLE",
      "LINK_DATA_OBSERVED_AT_UNAVAILABLE",
    ]);

  if (
    linkDataProvider
      .availability_state !==
    "AVAILABLE"
  ) {
    degradationReasons.add(
      "LINK_DATA_PROVIDER_UNAVAILABLE",
    );
  }

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_LINK_SIGNALS_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      input.document_id,

    inbound_link_count:
      unavailable<SearchCount>(
        unavailableReason,
      ),

    unique_source_page_count:
      unavailable<SearchCount>(
        unavailableReason,
      ),

    unique_source_domain_count:
      unavailable<SearchCount>(
        unavailableReason,
      ),

    source_diversity_score:
      unavailable<SearchNormalizedScore>(
        unavailableReason,
      ),

    anchor_text_convergence_score:
      unavailable<SearchNormalizedScore>(
        unavailableReason,
      ),

    reciprocal_link_ratio:
      unavailable<SearchRatio>(
        unavailableReason,
      ),

    suspected_link_cluster_ratio:
      unavailable<SearchRatio>(
        unavailableReason,
      ),

    repeated_anchor_text_ratio:
      unavailable<SearchRatio>(
        unavailableReason,
      ),

    link_signal_confidence:
      unavailable<SearchConfidenceScore>(
        "LINK_SIGNAL_CONFIDENCE_UNAVAILABLE:NO_LINK_OBSERVATIONS",
      ),

    link_data_provider:
      linkDataProvider,

    link_data_observed_at:
      unavailable<SearchIsoTimestamp>(
        unavailableReason,
      ),

    validation_state:
      "DEGRADED",

    degradation_reasons:
      Object.freeze(
        Array.from(
          degradationReasons,
        ).sort(),
      ),
  });
}

/* ============================================================================
 * 23. CANONICAL PRODUCER
 * ========================================================================== */

export function buildSearchLinkSignals(
  input:
    SearchLinkSignalsSearchInput,
): SearchLinkSignals {
  const policy =
    input.policy ??
    DEFAULT_XYVALA_SEARCH_LINK_SIGNALS_SEARCH_POLICY;

  const boundaryValidation =
    validateSearchLinkSignalsSearchInput(
      input,
      policy,
    );

  if (
    boundaryValidation.validation_state ===
    "REJECTED"
  ) {
    const rejected =
      buildRejectedSearchLinkSignals(
        input,
        boundaryValidation
          .rejection_reasons,
      );

    validateSearchLinkSignalsOutput(
      rejected,
    );

    return rejected;
  }

  const observations =
    buildCanonicalObservations(
      input.observations,
    );

  if (
    observations.length ===
    0
  ) {
    const unavailableSignals =
      buildUnavailableSearchLinkSignals(
        input,
      );

    validateSearchLinkSignalsOutput(
      unavailableSignals,
    );

    return unavailableSignals;
  }

  const counts =
    computeCoreLinkCounts(
      observations,
    );

  const sourceDiversityScore =
    computeSourceDiversityScore(
      counts,
    );

  const anchorTextEvidence =
    computeAnchorTextEvidence(
      observations,
    );

  const reciprocalLinkRatio =
    computeObservedBooleanRatio(
      observations,
      (
        observation,
      ) =>
        observation
          .reciprocal_link_observed,
      "RECIPROCAL_LINK_RATIO_UNAVAILABLE:NO_RECIPROCAL_EVIDENCE",
    );

  const suspectedLinkClusterRatio =
    computeObservedBooleanRatio(
      observations,
      (
        observation,
      ) =>
        observation
          .suspected_link_cluster,
      "LINK_CLUSTER_RATIO_UNAVAILABLE:NO_CLUSTER_EVIDENCE",
    );

  const linkDataProvider =
    resolveLinkDataProvider(
      input.link_data_provider,
    );

  const linkDataObservedAt =
    resolveLatestObservedAt(
      observations,
    );

  const linkSignalConfidence =
    computeLinkSignalConfidence({
      observation_count:
        counts.inbound_link_count,

      source_diversity_score:
        sourceDiversityScore,

      anchor_text_convergence_score:
        anchorTextEvidence
          .convergence_score,

      reciprocal_link_ratio:
        reciprocalLinkRatio,

      suspected_link_cluster_ratio:
        suspectedLinkClusterRatio,

      policy,
    });

  const outputValidation =
    resolveOutputValidationState({
      observation_count:
        counts.inbound_link_count,

      source_diversity_score:
        sourceDiversityScore,

      anchor_text_convergence_score:
        anchorTextEvidence
          .convergence_score,

      reciprocal_link_ratio:
        reciprocalLinkRatio,

      suspected_link_cluster_ratio:
        suspectedLinkClusterRatio,

      repeated_anchor_text_ratio:
        anchorTextEvidence
          .repeated_anchor_text_ratio,

      link_signal_confidence:
        linkSignalConfidence,

      link_data_provider:
        linkDataProvider,

      link_data_observed_at:
        linkDataObservedAt,
    });

  /*
   * These counts are AVAILABLE because observations exist and the producer has
   * canonically counted the exact supplied observation population.
   *
   * AVAILABLE(0) would therefore also be legitimate if a canonical count were
   * actually zero. In this execution branch the observation count is > 0.
   */
  const inboundLinkCount =
    available<SearchCount>(
      counts.inbound_link_count,
    );

  const uniqueSourcePageCount =
    available<SearchCount>(
      counts.unique_source_page_count,
    );

  const uniqueSourceDomainCount =
    available<SearchCount>(
      counts.unique_source_domain_count,
    );

  const signals:
    SearchLinkSignals =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_LINK_SIGNALS_CONTRACT_VERSION,

      created_at:
        input.created_at,

      document_id:
        input.document_id,

      inbound_link_count:
        inboundLinkCount,

      unique_source_page_count:
        uniqueSourcePageCount,

      unique_source_domain_count:
        uniqueSourceDomainCount,

      source_diversity_score:
        sourceDiversityScore,

      anchor_text_convergence_score:
        anchorTextEvidence
          .convergence_score,

      reciprocal_link_ratio:
        reciprocalLinkRatio,

      suspected_link_cluster_ratio:
        suspectedLinkClusterRatio,

      repeated_anchor_text_ratio:
        anchorTextEvidence
          .repeated_anchor_text_ratio,

      link_signal_confidence:
        linkSignalConfidence,

      link_data_provider:
        linkDataProvider,

      link_data_observed_at:
        linkDataObservedAt,

      validation_state:
        outputValidation
          .validation_state,

      degradation_reasons:
        outputValidation
          .degradation_reasons,
    });

  validateSearchLinkSignalsOutput(
    signals,
  );

  return signals;
}

/* ============================================================================
 * 24. ACCEPTANCE HELPER
 * ----------------------------------------------------------------------------
 * Read-only convenience helper.
 *
 * It creates no analytical truth.
 * ========================================================================== */

export function isSearchLinkSignalsAccepted(
  signals:
    SearchLinkSignals,
): boolean {
  return (
    signals.validation_state ===
      "VALID" ||
    signals.validation_state ===
      "DEGRADED"
  );
}
