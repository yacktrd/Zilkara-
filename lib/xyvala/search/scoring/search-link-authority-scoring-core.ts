/* ============================================================================
 * FILE: lib/xyvala/search/scoring/search-link-authority-scoring-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical link authority scoring core
 *
 * ROLE
 * - consume canonical SearchLinkSignals
 * - produce canonical SearchLinkAuthorityScoreVector evidence
 * - calculate link_authority_score from explicitly authorized normalized
 *   link evidence only
 * - preserve canonical document identity
 * - preserve upstream link-signal confidence without reconstruction
 * - preserve explicit missing-data semantics
 * - preserve explicit confidence availability semantics
 * - preserve scoring-policy lineage
 *
 * CLASSIFICATION
 * - PRIVATE CORE
 * - SEARCH DOMAIN
 * - LINK_AUTHORITY_SCORING
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-PUBLIC
 * - CANONICAL PRODUCER
 *
 * POSITION IN OFFICIAL PIPELINE
 * ----------------------------------------------------------------------------
 *
 * LINK_SIGNAL_DETECTION
 *        ↓
 * SearchLinkSignals
 *        ↓
 * LINK_AUTHORITY_SCORING
 *        ↓
 * SearchOptionalEvidence<SearchLinkAuthorityScoreVector>
 *        ↓
 * POSITIVE_SCORE_ASSEMBLY
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchLinkSignals
 * - SearchLinkAuthorityScoreVector
 * - SearchSubScore
 * - SearchOptionalEvidence
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage Registry
 * - Missing Data Explicitness Rule
 * - Compute / Observe / Mutate Separation
 *
 * CONSUMERS
 * - Search Positive Score Assembler
 * - Search Runtime Orchestrator
 * - Search Private Snapshot Builder
 * - Search traceability
 * - Search integration tests
 *
 * DIRECTIVES
 * - consume SearchLinkSignals only
 * - one canonical link-authority scorer
 * - explicit scoring policy
 * - explicit evidence availability
 * - explicit confidence availability
 * - explicit policy lineage
 * - no query access
 * - no lexical access
 * - no anchor access
 * - no behavioral access
 * - no temporal access
 * - no acquisition access
 * - no runtime clock access
 * - no random identifier generation
 * - no persistence
 * - no logging
 * - no network access
 * - no hidden fallback
 * - no default weights
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no unavailable-confidence-to-zero conversion
 * - no confidence reconstruction
 * - no raw-count normalization invented locally
 * - no penalty-vector production
 * - no analytical aggregation
 * - no eligibility evaluation
 * - no ranking
 *
 * IMPORTANT — RAW LINK COUNTS
 * ----------------------------------------------------------------------------
 * SearchLinkSignals contains:
 *
 * - inbound_link_count;
 * - unique_source_page_count;
 * - unique_source_domain_count.
 *
 * These are canonical observed counts.
 *
 * The Search pipeline contract currently defines no governed normalization
 * method that converts those counts into SearchNormalizedScore.
 *
 * Therefore this scorer MUST NOT invent transformations such as:
 *
 * - logarithmic link normalization;
 * - count saturation curves;
 * - arbitrary domain-count thresholds;
 * - relative corpus normalization;
 * - local min/max normalization.
 *
 * Raw counts remain canonical supporting evidence but do not directly enter
 * link_authority_score until a dedicated normalization contract exists.
 *
 * AUTHORIZED SCORING FEATURES
 * ----------------------------------------------------------------------------
 * Only already-normalized / ratio-based SearchLinkSignals evidence may
 * participate:
 *
 * - source_diversity_score;
 * - anchor_text_convergence_score;
 * - reciprocal_link_ratio;
 * - suspected_link_cluster_ratio;
 * - repeated_anchor_text_ratio.
 *
 * Feature meaning and weight are policy-controlled.
 *
 * POSITIVE feature:
 *
 * contribution = canonical value
 *
 * NEGATIVE feature:
 *
 * contribution = 1 - canonical value
 *
 * No unavailable value participates in the denominator.
 *
 * MISSING-EVIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * EXCLUDE_AND_RENORMALIZE
 * - available authorized evidence may be used;
 * - available weights are renormalized;
 * - required-feature and minimum-coverage policy still applies.
 *
 * RETURN_UNAVAILABLE
 * - missing authorized scoring evidence prevents score production.
 *
 * In either case:
 *
 * unavailable != 0
 *
 * There is no synthetic neutral contribution.
 *
 * CONFIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchLinkSignals.link_signal_confidence is canonical upstream truth.
 *
 * Its contract is:
 *
 * SearchOptionalEvidence<SearchConfidenceScore>
 *
 * Therefore:
 *
 * AVAILABLE(0)
 * - a canonical confidence exists;
 * - its value is exactly zero;
 * - zero must be propagated unchanged.
 *
 * AVAILABLE(x)
 * - x is propagated unchanged.
 *
 * UNAVAILABLE / INSUFFICIENT_DATA / INSUFFICIENT_HISTORY / UNSUPPORTED / INVALID
 * - no canonical numeric confidence exists;
 * - this scorer must not manufacture SearchSubScore.confidence;
 * - the complete Link Authority score vector therefore remains unavailable.
 *
 * SearchSubScore.confidence is never:
 * - recalculated;
 * - averaged;
 * - defaulted;
 * - inferred from feature coverage;
 * - replaced by zero.
 *
 * Partial feature availability is represented through:
 *
 * - validation_state = DEGRADED;
 * - degradation_reasons;
 * - SearchSubScore.missing_data.
 *
 * It does not alter canonical upstream confidence.
 *
 * INVARIANTS
 * - one result belongs to exactly one canonical document
 * - same canonical input + same policy => same result
 * - no input object is mutated
 * - unavailable evidence never becomes zero
 * - unavailable evidence never enters score arithmetic
 * - unavailable confidence never becomes numeric confidence
 * - AVAILABLE(0) confidence remains exactly zero
 * - raw link counts are never locally normalized
 * - link_signal_confidence is transported, not reconstructed
 * - score value remains within [0, 1]
 * - every active feature has explicit weight and direction
 * - scoring policy covers the complete canonical scoring feature domain
 * - no hidden default exists
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * malformed SearchLinkSignals
 * => Link Signal Detection / scoring input boundary
 *
 * rejected or unvalidated SearchLinkSignals
 * => Link Signal Detection boundary
 *
 * unavailable link_signal_confidence converted to zero
 * => Link Signal Detection / Link Authority Scoring boundary
 *
 * missing required feature
 * => Link Authority Scoring policy boundary
 *
 * insufficient evidence coverage
 * => Link Authority Scoring policy boundary
 *
 * raw link counts converted into local score
 * => Link Authority Scoring ownership violation
 *
 * unavailable evidence converted to zero
 * => Missing Data Explicitness violation
 *
 * query/document relevance read here
 * => scorer ownership violation
 * ========================================================================== */

import type {
  SearchAvailabilityState,
  SearchConfidenceScore,
  SearchContractVersion,
  SearchCount,
  SearchIsoTimestamp,
  SearchLinkAuthorityScoreVector,
  SearchLinkSignals,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchRatio,
  SearchScoreName,
  SearchSignalFamily,
  SearchSubScore,
  SearchValidationState,
  SearchWeight,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ----------------------------------------------------------------------------
 * Producer implementation changes are versioned independently from the
 * SearchLinkAuthorityScoreVector schema.
 *
 * 1.1.0:
 * - adopts explicit SearchOptionalEvidence semantics for
 *   SearchLinkSignals.link_signal_confidence;
 * - removes unavailable-confidence-to-zero behavior;
 * - preserves AVAILABLE(0) as canonical zero confidence.
 *
 * The scoring output contract remains 1.0.0 because its structural shape has
 * not changed.
 * ========================================================================== */

export const XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_NAME =
  "xyvala-search-link-authority-scoring-core" as const;

export const XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

export const XYVALA_SEARCH_LINK_AUTHORITY_SCORING_CONTRACT_VERSION:
  SearchContractVersion =
    "1.0.0";

export const XYVALA_SEARCH_LINK_AUTHORITY_SCORE_NAME:
  SearchScoreName =
    "link_authority_score";

export const XYVALA_SEARCH_LINK_AUTHORITY_SIGNAL_FAMILY:
  SearchSignalFamily =
    "LINK_AUTHORITY";

/* ============================================================================
 * 2. CANONICAL FEATURE DOMAIN
 * ----------------------------------------------------------------------------
 * Raw counts are deliberately absent.
 *
 * They have no governed normalization contract at this layer.
 * ========================================================================== */

export type SearchLinkAuthorityFeatureName =
  | "source_diversity_score"
  | "anchor_text_convergence_score"
  | "reciprocal_link_ratio"
  | "suspected_link_cluster_ratio"
  | "repeated_anchor_text_ratio";

export const XYVALA_SEARCH_LINK_AUTHORITY_FEATURE_NAMES =
  Object.freeze([
    "source_diversity_score",
    "anchor_text_convergence_score",
    "reciprocal_link_ratio",
    "suspected_link_cluster_ratio",
    "repeated_anchor_text_ratio",
  ] as const satisfies readonly SearchLinkAuthorityFeatureName[]);

/* ============================================================================
 * 3. FEATURE DIRECTION
 * ========================================================================== */

export type SearchLinkAuthorityFeatureDirection =
  | "POSITIVE"
  | "NEGATIVE";

/* ============================================================================
 * 4. FEATURE POLICY
 * ========================================================================== */

export interface SearchLinkAuthorityFeaturePolicy {
  readonly feature_name:
    SearchLinkAuthorityFeatureName;

  readonly direction:
    SearchLinkAuthorityFeatureDirection;

  readonly weight:
    SearchWeight;

  readonly required:
    boolean;
}

/* ============================================================================
 * 5. MISSING-EVIDENCE METHOD
 * ========================================================================== */

export type SearchLinkAuthorityMissingEvidenceMethod =
  | "EXCLUDE_AND_RENORMALIZE"
  | "RETURN_UNAVAILABLE";

/* ============================================================================
 * 6. SCORING POLICY
 * ----------------------------------------------------------------------------
 * No default policy exists in this core.
 * ========================================================================== */

export interface SearchLinkAuthorityScoringPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  readonly scoring_method:
    string;

  readonly overlap_group:
    string;

  readonly features:
    readonly SearchLinkAuthorityFeaturePolicy[];

  readonly minimum_available_feature_count:
    SearchCount;

  readonly minimum_available_weight_ratio:
    SearchRatio;

  readonly missing_evidence_method:
    SearchLinkAuthorityMissingEvidenceMethod;
}

/* ============================================================================
 * 7. CANONICAL SCORER INPUT
 * ========================================================================== */

export interface SearchLinkAuthorityScoringInput {
  readonly link_signals:
    SearchLinkSignals;

  readonly created_at:
    SearchIsoTimestamp;

  readonly policy:
    SearchLinkAuthorityScoringPolicy;
}

/* ============================================================================
 * 8. VALIDATION RESULT
 * ========================================================================== */

export interface SearchLinkAuthorityScoringValidationResult {
  readonly valid:
    boolean;

  readonly errors:
    readonly string[];
}

/* ============================================================================
 * 9. INTERNAL FEATURE EVIDENCE
 * ========================================================================== */

interface SearchLinkAuthorityAvailableFeature {
  readonly feature_name:
    SearchLinkAuthorityFeatureName;

  readonly source_value:
    SearchNormalizedScore;

  readonly contribution_value:
    SearchNormalizedScore;

  readonly weight:
    SearchWeight;
}

/* ============================================================================
 * 10. PRIMITIVE HELPERS
 * ========================================================================== */

function isNonEmptyString(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}

function isFiniteNumber(
  value:
    unknown,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  );
}

function isUnitIntervalNumber(
  value:
    unknown,
): value is number {
  return (
    isFiniteNumber(
      value,
    ) &&
    value >= 0 &&
    value <= 1
  );
}

function isNonNegativeInteger(
  value:
    unknown,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isInteger(
      value,
    ) &&
    value >= 0
  );
}

function isValidIsoTimestamp(
  value:
    unknown,
): value is SearchIsoTimestamp {
  if (
    !isNonEmptyString(
      value,
    )
  ) {
    return false;
  }

  return Number.isFinite(
    Date.parse(
      value,
    ),
  );
}

/* ============================================================================
 * 11. OPTIONAL EVIDENCE STRUCTURAL VALIDATION
 * ========================================================================== */

function validateOptionalEvidenceStructure<T>(
  evidence:
    SearchOptionalEvidence<T>,

  fieldName:
    string,
): readonly string[] {
  const errors:
    string[] =
    [];

  if (
    evidence === null ||
    typeof evidence !==
      "object"
  ) {
    errors.push(
      `${fieldName} must be explicit SearchOptionalEvidence.`,
    );

    return errors;
  }

  if (
    evidence.availability_state ===
      "AVAILABLE"
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        evidence,
        "value",
      )
    ) {
      errors.push(
        `${fieldName} AVAILABLE evidence must contain value.`,
      );
    }

    return errors;
  }

  if (
    evidence.availability_state !==
      "UNAVAILABLE" &&
    evidence.availability_state !==
      "INSUFFICIENT_DATA" &&
    evidence.availability_state !==
      "INSUFFICIENT_HISTORY" &&
    evidence.availability_state !==
      "UNSUPPORTED" &&
    evidence.availability_state !==
      "INVALID"
  ) {
    errors.push(
      `${fieldName} has unsupported availability_state.`,
    );

    return errors;
  }

  if (
    !isNonEmptyString(
      evidence.reason,
    )
  ) {
    errors.push(
      `${fieldName} non-AVAILABLE evidence requires a non-empty reason.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 12. UNIT-INTERVAL EVIDENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Used for:
 * - normalized scores;
 * - ratios;
 * - canonical confidence evidence.
 *
 * AVAILABLE(0) is valid.
 * ========================================================================== */

function validateUnitEvidence(
  evidence:
    SearchOptionalEvidence<number>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isUnitIntervalNumber(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a finite number between 0 and 1.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 13. COUNT EVIDENCE VALIDATION
 * ========================================================================== */

function validateCountEvidence(
  evidence:
    SearchOptionalEvidence<SearchCount>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isNonNegativeInteger(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a non-negative integer.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 14. STRING EVIDENCE VALIDATION
 * ========================================================================== */

function validateStringEvidence(
  evidence:
    SearchOptionalEvidence<string>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isNonEmptyString(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a non-empty string.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 15. TIMESTAMP EVIDENCE VALIDATION
 * ========================================================================== */

function validateTimestampEvidence(
  evidence:
    SearchOptionalEvidence<SearchIsoTimestamp>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isValidIsoTimestamp(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a valid ISO timestamp.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 16. POLICY VALIDATION
 * ========================================================================== */

function validateSearchLinkAuthorityScoringPolicy(
  policy:
    SearchLinkAuthorityScoringPolicy,
): readonly string[] {
  const errors:
    string[] =
    [];

  if (
    !isNonEmptyString(
      policy.policy_version,
    )
  ) {
    errors.push(
      "policy.policy_version must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      policy.scoring_method,
    )
  ) {
    errors.push(
      "policy.scoring_method must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      policy.overlap_group,
    )
  ) {
    errors.push(
      "policy.overlap_group must be a non-empty string.",
    );
  }

  if (
    !isNonNegativeInteger(
      policy.minimum_available_feature_count,
    ) ||
    policy.minimum_available_feature_count >
      XYVALA_SEARCH_LINK_AUTHORITY_FEATURE_NAMES.length
  ) {
    errors.push(
      "policy.minimum_available_feature_count must be an integer within the canonical feature-domain cardinality.",
    );
  }

  if (
    policy.minimum_available_feature_count ===
      0
  ) {
    errors.push(
      "policy.minimum_available_feature_count must be at least 1.",
    );
  }

  if (
    !isUnitIntervalNumber(
      policy.minimum_available_weight_ratio,
    )
  ) {
    errors.push(
      "policy.minimum_available_weight_ratio must be between 0 and 1.",
    );
  }

  const seenFeatures =
    new Set<SearchLinkAuthorityFeatureName>();

  let totalWeight =
    0;

  for (
    const [
      index,
      feature,
    ] of policy.features.entries()
  ) {
    if (
      !XYVALA_SEARCH_LINK_AUTHORITY_FEATURE_NAMES.includes(
        feature.feature_name,
      )
    ) {
      errors.push(
        `policy.features[${String(index)}].feature_name is not canonical.`,
      );

      continue;
    }

    if (
      seenFeatures.has(
        feature.feature_name,
      )
    ) {
      errors.push(
        `policy.features contains duplicate feature ${feature.feature_name}.`,
      );
    }

    seenFeatures.add(
      feature.feature_name,
    );

    if (
      feature.direction !==
        "POSITIVE" &&
      feature.direction !==
        "NEGATIVE"
    ) {
      errors.push(
        `policy.features[${String(index)}].direction is invalid.`,
      );
    }

    if (
      !isFiniteNumber(
        feature.weight,
      ) ||
      feature.weight <
        0
    ) {
      errors.push(
        `policy.features[${String(index)}].weight must be finite and non-negative.`,
      );
    } else {
      totalWeight +=
        feature.weight;
    }

    if (
      typeof feature.required !==
        "boolean"
    ) {
      errors.push(
        `policy.features[${String(index)}].required must be boolean.`,
      );
    }
  }

  for (
    const featureName of
    XYVALA_SEARCH_LINK_AUTHORITY_FEATURE_NAMES
  ) {
    if (
      !seenFeatures.has(
        featureName,
      )
    ) {
      errors.push(
        `policy.features is missing canonical feature ${featureName}.`,
      );
    }
  }

  if (
    policy.features.length !==
      XYVALA_SEARCH_LINK_AUTHORITY_FEATURE_NAMES.length
  ) {
    errors.push(
      "policy.features must contain exactly one policy for each canonical link-authority scoring feature.",
    );
  }

  if (
    totalWeight <=
      0
  ) {
    errors.push(
      "policy.features must define at least one strictly positive feature weight.",
    );
  }

  return errors;
}

/* ============================================================================
 * 17. SEARCH LINK SIGNAL VALIDATION
 * ----------------------------------------------------------------------------
 * IMPORTANT
 *
 * link_signal_confidence is validated as SearchOptionalEvidence.
 *
 * It is NOT validated as a raw number.
 * ========================================================================== */

function validateSearchLinkSignalsForScoring(
  linkSignals:
    SearchLinkSignals,
): readonly string[] {
  const errors:
    string[] =
    [];

  if (
    !isNonEmptyString(
      linkSignals.contract_version,
    )
  ) {
    errors.push(
      "link_signals.contract_version must be a non-empty string.",
    );
  }

  if (
    !isValidIsoTimestamp(
      linkSignals.created_at,
    )
  ) {
    errors.push(
      "link_signals.created_at must be a valid ISO timestamp.",
    );
  }

  if (
    !isNonEmptyString(
      linkSignals.document_id,
    )
  ) {
    errors.push(
      "link_signals.document_id must be a non-empty string.",
    );
  }

  errors.push(
    ...validateCountEvidence(
      linkSignals.inbound_link_count,
      "link_signals.inbound_link_count",
    ),

    ...validateCountEvidence(
      linkSignals.unique_source_page_count,
      "link_signals.unique_source_page_count",
    ),

    ...validateCountEvidence(
      linkSignals.unique_source_domain_count,
      "link_signals.unique_source_domain_count",
    ),

    ...validateUnitEvidence(
      linkSignals.source_diversity_score,
      "link_signals.source_diversity_score",
    ),

    ...validateUnitEvidence(
      linkSignals.anchor_text_convergence_score,
      "link_signals.anchor_text_convergence_score",
    ),

    ...validateUnitEvidence(
      linkSignals.reciprocal_link_ratio,
      "link_signals.reciprocal_link_ratio",
    ),

    ...validateUnitEvidence(
      linkSignals.suspected_link_cluster_ratio,
      "link_signals.suspected_link_cluster_ratio",
    ),

    ...validateUnitEvidence(
      linkSignals.repeated_anchor_text_ratio,
      "link_signals.repeated_anchor_text_ratio",
    ),

    ...validateUnitEvidence(
      linkSignals.link_signal_confidence,
      "link_signals.link_signal_confidence",
    ),

    ...validateStringEvidence(
      linkSignals.link_data_provider,
      "link_signals.link_data_provider",
    ),

    ...validateTimestampEvidence(
      linkSignals.link_data_observed_at,
      "link_signals.link_data_observed_at",
    ),
  );

  return errors;
}

/* ============================================================================
 * 18. CANONICAL INPUT VALIDATION
 * ========================================================================== */

export function validateSearchLinkAuthorityScoringInput(
  input:
    SearchLinkAuthorityScoringInput,
): SearchLinkAuthorityScoringValidationResult {
  const errors:
    string[] =
    [];

  if (
    !isValidIsoTimestamp(
      input.created_at,
    )
  ) {
    errors.push(
      "created_at must be a valid ISO timestamp.",
    );
  }

  errors.push(
    ...validateSearchLinkSignalsForScoring(
      input.link_signals,
    ),

    ...validateSearchLinkAuthorityScoringPolicy(
      input.policy,
    ),
  );

  if (
    isValidIsoTimestamp(
      input.created_at,
    ) &&
    isValidIsoTimestamp(
      input.link_signals.created_at,
    ) &&
    Date.parse(
      input.created_at,
    ) <
      Date.parse(
        input.link_signals.created_at,
      )
  ) {
    errors.push(
      "created_at cannot predate canonical link_signals.created_at.",
    );
  }

  return Object.freeze({
    valid:
      errors.length ===
      0,

    errors:
      Object.freeze([
        ...errors,
      ]),
  });
}

/* ============================================================================
 * 19. FEATURE EVIDENCE RESOLUTION
 * ========================================================================== */

function getSearchLinkAuthorityFeatureEvidence(
  linkSignals:
    SearchLinkSignals,

  featureName:
    SearchLinkAuthorityFeatureName,
): SearchOptionalEvidence<number> {
  switch (
    featureName
  ) {
    case "source_diversity_score":
      return linkSignals
        .source_diversity_score;

    case "anchor_text_convergence_score":
      return linkSignals
        .anchor_text_convergence_score;

    case "reciprocal_link_ratio":
      return linkSignals
        .reciprocal_link_ratio;

    case "suspected_link_cluster_ratio":
      return linkSignals
        .suspected_link_cluster_ratio;

    case "repeated_anchor_text_ratio":
      return linkSignals
        .repeated_anchor_text_ratio;
  }
}

/* ============================================================================
 * 20. AVAILABILITY PRECEDENCE
 * ----------------------------------------------------------------------------
 * Used only when feature evidence cannot legitimately produce a score.
 *
 * Confidence availability is not passed through this resolver because
 * link_signal_confidence already owns its exact canonical availability state.
 * ========================================================================== */

function resolveUnavailableScoringState(
  evidences:
    readonly SearchOptionalEvidence<number>[],
): Exclude<
  SearchAvailabilityState,
  "AVAILABLE"
> {
  if (
    evidences.some(
      (evidence) =>
        evidence.availability_state ===
        "INVALID",
    )
  ) {
    return "INVALID";
  }

  if (
    evidences.some(
      (evidence) =>
        evidence.availability_state ===
        "INSUFFICIENT_DATA",
    )
  ) {
    return "INSUFFICIENT_DATA";
  }

  if (
    evidences.some(
      (evidence) =>
        evidence.availability_state ===
        "INSUFFICIENT_HISTORY",
    )
  ) {
    return "INSUFFICIENT_HISTORY";
  }

  if (
    evidences.some(
      (evidence) =>
        evidence.availability_state ===
        "UNSUPPORTED",
    )
  ) {
    return "UNSUPPORTED";
  }

  return "UNAVAILABLE";
}

/* ============================================================================
 * 21. UNAVAILABLE RESULT FACTORY
 * ========================================================================== */

function unavailableLinkAuthorityScoreVector(
  availabilityState:
    Exclude<
      SearchAvailabilityState,
      "AVAILABLE"
    >,

  reason:
    string,
): SearchOptionalEvidence<SearchLinkAuthorityScoreVector> {
  return Object.freeze({
    availability_state:
      availabilityState,

    reason,
  });
}

/* ============================================================================
 * 22. AVAILABLE FEATURE COLLECTION
 * ========================================================================== */

function collectAvailableFeatures(
  linkSignals:
    SearchLinkSignals,

  policy:
    SearchLinkAuthorityScoringPolicy,
): {
  readonly available_features:
    readonly SearchLinkAuthorityAvailableFeature[];

  readonly missing_features:
    readonly SearchLinkAuthorityFeatureName[];

  readonly required_missing_features:
    readonly SearchLinkAuthorityFeatureName[];

  readonly source_evidences:
    readonly SearchOptionalEvidence<number>[];

  readonly total_weight:
    SearchWeight;

  readonly available_weight:
    SearchWeight;
} {
  const availableFeatures:
    SearchLinkAuthorityAvailableFeature[] =
    [];

  const missingFeatures:
    SearchLinkAuthorityFeatureName[] =
    [];

  const requiredMissingFeatures:
    SearchLinkAuthorityFeatureName[] =
    [];

  const sourceEvidences:
    SearchOptionalEvidence<number>[] =
    [];

  let totalWeight =
    0;

  let availableWeight =
    0;

  for (
    const featurePolicy of
    policy.features
  ) {
    totalWeight +=
      featurePolicy.weight;

    const evidence =
      getSearchLinkAuthorityFeatureEvidence(
        linkSignals,
        featurePolicy.feature_name,
      );

    sourceEvidences.push(
      evidence,
    );

    if (
      evidence.availability_state !==
        "AVAILABLE"
    ) {
      missingFeatures.push(
        featurePolicy.feature_name,
      );

      if (
        featurePolicy.required
      ) {
        requiredMissingFeatures.push(
          featurePolicy.feature_name,
        );
      }

      continue;
    }

    const contributionValue:
      SearchNormalizedScore =
      featurePolicy.direction ===
        "POSITIVE"
        ? evidence.value
        : 1 -
          evidence.value;

    availableWeight +=
      featurePolicy.weight;

    availableFeatures.push(
      Object.freeze({
        feature_name:
          featurePolicy.feature_name,

        source_value:
          evidence.value,

        contribution_value:
          contributionValue,

        weight:
          featurePolicy.weight,
      }),
    );
  }

  return Object.freeze({
    available_features:
      Object.freeze([
        ...availableFeatures,
      ]),

    missing_features:
      Object.freeze([
        ...missingFeatures,
      ]),

    required_missing_features:
      Object.freeze([
        ...requiredMissingFeatures,
      ]),

    source_evidences:
      Object.freeze([
        ...sourceEvidences,
      ]),

    total_weight:
      totalWeight,

    available_weight:
      availableWeight,
  });
}

/* ============================================================================
 * 23. SCORE COMPUTATION
 * ========================================================================== */

function computeLinkAuthorityScore(
  features:
    readonly SearchLinkAuthorityAvailableFeature[],

  availableWeight:
    SearchWeight,
): SearchNormalizedScore {
  if (
    availableWeight <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: available scoring weight must be positive.",
    );
  }

  let weightedContribution =
    0;

  for (
    const feature of
    features
  ) {
    weightedContribution +=
      feature.contribution_value *
      feature.weight;
  }

  const score =
    weightedContribution /
    availableWeight;

  /*
   * Every participating value has already been validated within [0, 1].
   *
   * This clamp protects floating-point representation only.
   * It does not create analytical fallback truth.
   */
  return Math.min(
    1,
    Math.max(
      0,
      score,
    ),
  );
}

/* ============================================================================
 * 24. VECTOR VALIDATION
 * ========================================================================== */

export function validateSearchLinkAuthorityScoreVectorOutput(
  vector:
    SearchLinkAuthorityScoreVector,
): SearchLinkAuthorityScoringValidationResult {
  const errors:
    string[] =
    [];

  if (
    !isNonEmptyString(
      vector.contract_version,
    )
  ) {
    errors.push(
      "vector.contract_version must be a non-empty string.",
    );
  }

  if (
    !isValidIsoTimestamp(
      vector.created_at,
    )
  ) {
    errors.push(
      "vector.created_at must be a valid ISO timestamp.",
    );
  }

  if (
    !isNonEmptyString(
      vector.document_id,
    )
  ) {
    errors.push(
      "vector.document_id must be a non-empty string.",
    );
  }

  if (
    vector.link_authority_score.score_name !==
      XYVALA_SEARCH_LINK_AUTHORITY_SCORE_NAME
  ) {
    errors.push(
      "vector.link_authority_score.score_name must be link_authority_score.",
    );
  }

  if (
    vector.link_authority_score.signal_family !==
      XYVALA_SEARCH_LINK_AUTHORITY_SIGNAL_FAMILY
  ) {
    errors.push(
      "vector.link_authority_score.signal_family must be LINK_AUTHORITY.",
    );
  }

  if (
    vector.link_authority_score.document_id !==
      vector.document_id
  ) {
    errors.push(
      "vector.link_authority_score.document_id must preserve vector document identity.",
    );
  }

  if (
    !isUnitIntervalNumber(
      vector.link_authority_score.value,
    )
  ) {
    errors.push(
      "vector.link_authority_score.value must be between 0 and 1.",
    );
  }

  /*
   * SearchSubScore.confidence is concrete only because an AVAILABLE
   * link_signal_confidence was required before vector construction.
   *
   * Zero remains valid here.
   */
  if (
    !isUnitIntervalNumber(
      vector.link_authority_score.confidence,
    )
  ) {
    errors.push(
      "vector.link_authority_score.confidence must be between 0 and 1.",
    );
  }

  if (
    !isNonEmptyString(
      vector.link_authority_score.overlap_group,
    )
  ) {
    errors.push(
      "vector.link_authority_score.overlap_group must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      vector.link_authority_score.method,
    )
  ) {
    errors.push(
      "vector.link_authority_score.method must be a non-empty string.",
    );
  }

  if (
    vector.link_authority_score.module_name !==
      XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_NAME
  ) {
    errors.push(
      "vector.link_authority_score.module_name diverges from canonical producer identity.",
    );
  }

  if (
    vector.link_authority_score.module_version !==
      XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_VERSION
  ) {
    errors.push(
      "vector.link_authority_score.module_version diverges from canonical producer version.",
    );
  }

  if (
    vector.scorer_module_version !==
      XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_VERSION
  ) {
    errors.push(
      "vector.scorer_module_version diverges from canonical producer version.",
    );
  }

  if (
    !isNonEmptyString(
      vector.scoring_policy_version,
    )
  ) {
    errors.push(
      "vector.scoring_policy_version must be a non-empty string.",
    );
  }

  if (
    vector.validation_state !==
      "VALID" &&
    vector.validation_state !==
      "DEGRADED"
  ) {
    errors.push(
      "canonical SearchLinkAuthorityScoreVector validation_state must be VALID or DEGRADED.",
    );
  }

  if (
    vector.validation_state ===
      "VALID" &&
    vector.degradation_reasons.length >
      0
  ) {
    errors.push(
      "VALID SearchLinkAuthorityScoreVector must not contain degradation reasons.",
    );
  }

  if (
    vector.validation_state ===
      "DEGRADED" &&
    vector.degradation_reasons.length ===
      0
  ) {
    errors.push(
      "DEGRADED SearchLinkAuthorityScoreVector requires degradation reasons.",
    );
  }

  return Object.freeze({
    valid:
      errors.length ===
      0,

    errors:
      Object.freeze([
        ...errors,
      ]),
  });
}

/* ============================================================================
 * 25. CANONICAL PRODUCER
 * ----------------------------------------------------------------------------
 * LINK SIGNAL CONFIDENCE RULE
 *
 * The output SearchSubScore contract requires one concrete confidence value.
 *
 * Therefore a concrete Link Authority score vector may exist only when:
 *
 * link_signal_confidence.availability_state === "AVAILABLE"
 *
 * This is not a fallback rule.
 *
 * It is a consequence of preserving the upstream confidence contract without
 * reconstruction.
 * ========================================================================== */

export function computeSearchLinkAuthorityScoreVector(
  input:
    SearchLinkAuthorityScoringInput,
): SearchOptionalEvidence<SearchLinkAuthorityScoreVector> {
  const inputValidation =
    validateSearchLinkAuthorityScoringInput(
      input,
    );

  if (
    !inputValidation.valid
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_NAME}] ` +
        "Link authority scoring input rejected: " +
        inputValidation.errors.join(
          " | ",
        ),
    );
  }

  const linkSignals =
    input.link_signals;

  /* --------------------------------------------------------------------------
   * 25.1. UPSTREAM CONTRACT AUTHORIZATION
   * ----------------------------------------------------------------------- */

  if (
    linkSignals.validation_state ===
      "REJECTED" ||
    linkSignals.validation_state ===
      "UNVALIDATED"
  ) {
    return unavailableLinkAuthorityScoreVector(
      "INVALID",
      "canonical_link_signals_not_authorized_for_scoring",
    );
  }

  /* --------------------------------------------------------------------------
   * 25.2. CANONICAL CONFIDENCE AVAILABILITY
   * --------------------------------------------------------------------------
   *
   * SearchSubScore.confidence is a concrete SearchConfidenceScore.
   *
   * Consequently:
   *
   * AVAILABLE(0)
   * -> legitimate zero confidence
   *
   * non-AVAILABLE
   * -> no SearchSubScore may be fabricated
   *
   * The canonical availability state and reason are propagated unchanged.
   * ----------------------------------------------------------------------- */

  const linkSignalConfidenceEvidence:
    SearchOptionalEvidence<SearchConfidenceScore> =
    linkSignals.link_signal_confidence;

  if (
    linkSignalConfidenceEvidence
      .availability_state !==
    "AVAILABLE"
  ) {
    return unavailableLinkAuthorityScoreVector(
      linkSignalConfidenceEvidence
        .availability_state,

      linkSignalConfidenceEvidence
        .reason,
    );
  }

  const linkSignalConfidence:
    SearchConfidenceScore =
    linkSignalConfidenceEvidence.value;

  /* --------------------------------------------------------------------------
   * 25.3. AUTHORIZED FEATURE COLLECTION
   * ----------------------------------------------------------------------- */

  const featureCollection =
    collectAvailableFeatures(
      linkSignals,
      input.policy,
    );

  if (
    featureCollection.available_features.length ===
      0
  ) {
    return unavailableLinkAuthorityScoreVector(
      resolveUnavailableScoringState(
        featureCollection.source_evidences,
      ),
      "no_canonical_link_authority_scoring_feature_available",
    );
  }

  if (
    featureCollection.required_missing_features.length >
      0
  ) {
    return unavailableLinkAuthorityScoreVector(
      "INSUFFICIENT_DATA",
      "required_link_authority_features_unavailable:" +
        featureCollection.required_missing_features.join(
          ",",
        ),
    );
  }

  if (
    input.policy.missing_evidence_method ===
      "RETURN_UNAVAILABLE" &&
    featureCollection.missing_features.length >
      0
  ) {
    return unavailableLinkAuthorityScoreVector(
      resolveUnavailableScoringState(
        featureCollection.source_evidences,
      ),
      "link_authority_policy_requires_complete_feature_availability",
    );
  }

  if (
    featureCollection.available_features.length <
      input.policy.minimum_available_feature_count
  ) {
    return unavailableLinkAuthorityScoreVector(
      "INSUFFICIENT_DATA",
      "insufficient_available_link_authority_feature_count",
    );
  }

  const availableWeightRatio =
    featureCollection.total_weight >
      0
      ? featureCollection.available_weight /
        featureCollection.total_weight
      : 0;

  if (
    availableWeightRatio <
      input.policy.minimum_available_weight_ratio
  ) {
    return unavailableLinkAuthorityScoreVector(
      "INSUFFICIENT_DATA",
      "insufficient_available_link_authority_weight_coverage",
    );
  }

  if (
    featureCollection.available_weight <=
      0
  ) {
    return unavailableLinkAuthorityScoreVector(
      "INSUFFICIENT_DATA",
      "available_link_authority_features_have_zero_effective_weight",
    );
  }

  /* --------------------------------------------------------------------------
   * 25.4. SCORE COMPUTATION
   * ----------------------------------------------------------------------- */

  const linkAuthorityScoreValue =
    computeLinkAuthorityScore(
      featureCollection.available_features,
      featureCollection.available_weight,
    );

  const sourceFeatures =
    Object.freeze(
      featureCollection.available_features.map(
        (feature) =>
          feature.feature_name,
      ),
    );

  const missingData =
    Object.freeze([
      ...featureCollection.missing_features,
    ]);

  const degradationReasons:
    string[] =
    [];

  if (
    linkSignals.validation_state ===
      "DEGRADED"
  ) {
    degradationReasons.push(
      "upstream_link_signals_degraded",
    );
  }

  if (
    featureCollection.missing_features.length >
      0
  ) {
    degradationReasons.push(
      "partial_link_authority_feature_availability",
    );
  }

  const validationState:
    SearchValidationState =
    degradationReasons.length >
      0
      ? "DEGRADED"
      : "VALID";

  const parameters:
    Readonly<Record<string, unknown>> =
    Object.freeze({
      scoring_policy_version:
        input.policy.policy_version,

      missing_evidence_method:
        input.policy.missing_evidence_method,

      minimum_available_feature_count:
        input.policy.minimum_available_feature_count,

      minimum_available_weight_ratio:
        input.policy.minimum_available_weight_ratio,

      available_feature_count:
        featureCollection.available_features.length,

      available_weight_ratio:
        availableWeightRatio,

      feature_policies:
        Object.freeze(
          input.policy.features.map(
            (feature) =>
              Object.freeze({
                feature_name:
                  feature.feature_name,

                direction:
                  feature.direction,

                weight:
                  feature.weight,

                required:
                  feature.required,
              }),
          ),
        ),
    });

  /* --------------------------------------------------------------------------
   * 25.5. CANONICAL SUB-SCORE
   * --------------------------------------------------------------------------
   *
   * confidence is transported from the AVAILABLE upstream confidence.
   *
   * No confidence calculation occurs here.
   * ----------------------------------------------------------------------- */

  const linkAuthoritySubScore:
    SearchSubScore =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_LINK_AUTHORITY_SCORING_CONTRACT_VERSION,

      created_at:
        input.created_at,

      document_id:
        linkSignals.document_id,

      score_name:
        XYVALA_SEARCH_LINK_AUTHORITY_SCORE_NAME,

      signal_family:
        XYVALA_SEARCH_LINK_AUTHORITY_SIGNAL_FAMILY,

      value:
        linkAuthorityScoreValue,

      confidence:
        linkSignalConfidence,

      source_features:
        sourceFeatures,

      overlap_group:
        input.policy.overlap_group,

      method:
        input.policy.scoring_method,

      module_name:
        XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_NAME,

      module_version:
        XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_VERSION,

      parameters,

      missing_data:
        missingData,

      explanation:
        "Canonical link-authority score produced exclusively from available normalized SearchLinkSignals evidence under the active explicit scoring policy.",
    });

  /* --------------------------------------------------------------------------
   * 25.6. CANONICAL VECTOR
   * ----------------------------------------------------------------------- */

  const vector:
    SearchLinkAuthorityScoreVector =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_LINK_AUTHORITY_SCORING_CONTRACT_VERSION,

      created_at:
        input.created_at,

      document_id:
        linkSignals.document_id,

      link_authority_score:
        linkAuthoritySubScore,

      scorer_module_version:
        XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_VERSION,

      scoring_policy_version:
        input.policy.policy_version,

      validation_state:
        validationState,

      degradation_reasons:
        Object.freeze([
          ...degradationReasons,
        ]),
    });

  const outputValidation =
    validateSearchLinkAuthorityScoreVectorOutput(
      vector,
    );

  if (
    !outputValidation.valid
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: canonical SearchLinkAuthorityScoreVector is invalid: " +
        outputValidation.errors.join(
          " | ",
        ),
    );
  }

  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value:
      vector,
  });
}

/* ============================================================================
 * 26. ACCEPTANCE GUARD
 * ========================================================================== */

export function isSearchLinkAuthorityScoreVectorAccepted(
  evidence:
    SearchOptionalEvidence<SearchLinkAuthorityScoreVector>,
): boolean {
  if (
    evidence.availability_state !==
      "AVAILABLE"
  ) {
    return false;
  }

  const validation =
    validateSearchLinkAuthorityScoreVectorOutput(
      evidence.value,
    );

  return validation.valid;
}
