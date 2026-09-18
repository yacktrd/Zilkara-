/* ============================================================================
 * FILE: lib/xyvala/search/cohort/search-distribution-identity-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical distribution identity core
 *
 * ROLE
 * - produce one canonical deterministic SearchDistributionId
 * - identify one exact Search cohort distribution execution
 * - consume canonical cohort definition truth unchanged
 * - consume canonical cohort candidate identities unchanged
 * - preserve query and cohort identity
 * - preserve producer/version lineage used to identify the candidate set
 * - reject identity inconsistencies at their first observable boundary
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - DISTRIBUTION IDENTITY
 * - METADATA PRODUCER
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-MUTATING
 * - PRIVATE
 *
 * POSITION
 *
 * SearchCohortDefinition
 * + SearchCohortCandidate[]
 * + explicit created_at
 *        ↓
 * DISTRIBUTION_IDENTITY
 *        ↓
 * SearchDistributionId
 *        ↓
 * SearchCohortBatch
 *        ↓
 * COHORT_NORMALIZATION
 *
 * OWNERSHIP
 *
 * SearchDistributionId
 * <- this producer
 *
 * cohort_definition
 * <- upstream canonical producer
 *
 * candidates
 * <- runtime transport of canonical:
 *    - SearchGlobalScore
 *    - SearchEligibilityResult
 *
 * distribution statistics
 * <- COHORT_NORMALIZATION
 *
 * DIRECTIVES
 * - one canonical SearchDistributionId producer
 * - explicit deterministic input only
 * - no local clock
 * - no random identifier
 * - no UUID generation
 * - no candidate mutation
 * - no candidate deduplication
 * - no analytical sorting
 * - no ranking
 * - no score computation
 * - no score normalization
 * - no percentile computation
 * - no cohort distribution computation
 * - no candidate_count production
 * - no ranking_eligible reconstruction
 * - no allow_eligible reconstruction
 * - no eligibility inference
 * - no filtering
 * - no fallback
 * - no persistence
 * - no logging
 * - no event publication
 *
 * IMPORTANT
 *
 * Candidate ordering is NOT distribution truth.
 *
 * For identity materialization only, candidate identity records are placed in
 * canonical document-id order before hashing.
 *
 * This:
 * - does not reorder the upstream candidate collection;
 * - does not rank documents;
 * - does not change cohort semantics;
 * - does not deduplicate documents;
 * - does not calculate a SearchCohortDistribution.
 *
 * Duplicate document identities are rejected rather than repaired.
 *
 * FIRST DIVERGENCE
 *
 * malformed cohort identity
 * => cohort-definition boundary
 *
 * candidate/query mismatch
 * => candidate assembly / distribution-identity boundary
 *
 * candidate/global-score identity mismatch
 * => analytical aggregation propagation
 *
 * candidate/eligibility identity mismatch
 * => eligibility propagation
 *
 * duplicate document candidate
 * => upstream candidate assembly
 *
 * non-deterministic identity generation
 * => this producer
 *
 * distribution statistics required here
 * => architecture violation
 *
 * INVARIANTS
 * - same canonical input -> same SearchDistributionId
 * - candidate input order cannot change SearchDistributionId
 * - candidate objects are never mutated
 * - cohort definition is never mutated
 * - analytical values are never recalculated
 * - availability is never reconstructed
 * - result eligibility is never interpreted
 * - created_at is supplied explicitly
 * - no runtime clock is read
 * - no random value is generated
 * ========================================================================== */

import {
  createHash,
} from "node:crypto";

import type {
  SearchCohortCandidate,
  SearchCohortDefinition,
  SearchDistributionId,
  SearchIsoTimestamp,
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_NAME =
  "xyvala-search-distribution-identity-core" as const;

export const XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/**
 * Version of the deterministic identity materialization algorithm.
 *
 * This identity is deliberately distinct from:
 * - Search contract versions;
 * - cohort policies;
 * - ranking policies;
 * - normalization policies.
 */
export const XYVALA_SEARCH_DISTRIBUTION_IDENTITY_ALGORITHM_VERSION =
  "1" as const;

const XYVALA_SEARCH_DISTRIBUTION_IDENTITY_NAMESPACE =
  "xyvala-search-distribution" as const;

/* ============================================================================
 * 2. CANONICAL INPUT
 * ----------------------------------------------------------------------------
 * Structurally matches the canonical runtime distribution-identity port.
 *
 * This domain core deliberately does NOT import the runtime orchestrator.
 *
 * Dependency direction therefore remains:
 *
 * domain contracts
 *      ↓
 * identity producer
 *      ↓
 * runtime binding
 *
 * and never:
 *
 * domain producer
 *      ↓
 * runtime implementation
 * ========================================================================== */

export interface SearchDistributionIdentityInput {
  readonly cohort_definition:
    SearchCohortDefinition;

  readonly candidates:
    readonly SearchCohortCandidate[];

  /**
   * Explicit execution timestamp supplied by orchestration.
   *
   * No local runtime clock is authorized.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 3. SAFE PRIMITIVE ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    string,

  fieldName:
    string,
): void {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-empty string.`,
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

  if (
    !Number.isFinite(
      Date.parse(
        value,
      ),
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertOptionalNonEmptyString(
  value:
    string | undefined,

  fieldName:
    string,
): void {
  if (
    value ===
    undefined
  ) {
    return;
  }

  assertNonEmptyString(
    value,
    fieldName,
  );
}

/* ============================================================================
 * 4. COHORT IDENTITY VALIDATION
 * ----------------------------------------------------------------------------
 * This is NOT a second SearchCohortDefinition validator.
 *
 * Only fields consumed by distribution identity materialization are checked.
 * No cohort-policy semantics are re-evaluated here.
 * ========================================================================== */

function validateCohortIdentity(
  cohortDefinition:
    SearchCohortDefinition,
): void {
  assertNonEmptyString(
    cohortDefinition.contract_version,
    "cohort_definition.contract_version",
  );

  assertValidIsoTimestamp(
    cohortDefinition.created_at,
    "cohort_definition.created_at",
  );

  assertNonEmptyString(
    cohortDefinition.cohort_id,
    "cohort_definition.cohort_id",
  );

  assertNonEmptyString(
    cohortDefinition.query_id,
    "cohort_definition.query_id",
  );

  assertNonEmptyString(
    cohortDefinition.language,
    "cohort_definition.language",
  );

  assertOptionalNonEmptyString(
    cohortDefinition.domain,
    "cohort_definition.domain",
  );

  assertNonEmptyString(
    cohortDefinition.corpus_version,
    "cohort_definition.corpus_version",
  );

  assertNonEmptyString(
    cohortDefinition
      .comparability_policy_version,
    "cohort_definition.comparability_policy_version",
  );

  assertNonEmptyString(
    cohortDefinition
      .ranking_policy_version,
    "cohort_definition.ranking_policy_version",
  );
}

/* ============================================================================
 * 5. CANDIDATE IDENTITY VALIDATION
 * ----------------------------------------------------------------------------
 * Only propagation identity is inspected.
 *
 * The following analytical values are deliberately NOT interpreted:
 * - final_raw_score
 * - aggregate_confidence
 * - ranking_eligible
 * - allow_eligible
 * - penalties
 * - contributions
 * - weights
 *
 * Their canonical producers remain authoritative.
 * ========================================================================== */

function validateCandidateIdentity(
  candidate:
    SearchCohortCandidate,

  cohortDefinition:
    SearchCohortDefinition,

  candidateIndex:
    number,
): void {
  const fieldName =
    `candidates[${String(candidateIndex)}]`;

  assertNonEmptyString(
    candidate.document_id,
    `${fieldName}.document_id`,
  );

  assertNonEmptyString(
    candidate.query_id,
    `${fieldName}.query_id`,
  );

  if (
    candidate.query_id !==
    cohortDefinition.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_NAME}] ` +
        `Query boundary violation: ${fieldName}.query_id differs from cohort_definition.query_id.`,
    );
  }

  /* --------------------------------------------------------------------------
   * Global score propagation identity
   * ----------------------------------------------------------------------- */

  if (
    candidate.global_score.document_id !==
    candidate.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_NAME}] ` +
        `Propagation violation: ${fieldName}.global_score.document_id differs from candidate.document_id.`,
    );
  }

  if (
    candidate.global_score.query_id !==
    candidate.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_NAME}] ` +
        `Propagation violation: ${fieldName}.global_score.query_id differs from candidate.query_id.`,
    );
  }

  assertNonEmptyString(
    candidate.global_score.contract_version,
    `${fieldName}.global_score.contract_version`,
  );

  assertValidIsoTimestamp(
    candidate.global_score.created_at,
    `${fieldName}.global_score.created_at`,
  );

  assertOptionalNonEmptyString(
    candidate.global_score
      .aggregation_result_id,
    `${fieldName}.global_score.aggregation_result_id`,
  );

  assertNonEmptyString(
    candidate.global_score
      .aggregator_module_version,
    `${fieldName}.global_score.aggregator_module_version`,
  );

  assertNonEmptyString(
    candidate.global_score
      .aggregation_policy_version,
    `${fieldName}.global_score.aggregation_policy_version`,
  );

  /* --------------------------------------------------------------------------
   * Eligibility propagation identity
   * ----------------------------------------------------------------------- */

  if (
    candidate.eligibility.document_id !==
    candidate.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_NAME}] ` +
        `Propagation violation: ${fieldName}.eligibility.document_id differs from candidate.document_id.`,
    );
  }

  if (
    candidate.eligibility.query_id !==
    candidate.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_NAME}] ` +
        `Propagation violation: ${fieldName}.eligibility.query_id differs from candidate.query_id.`,
    );
  }

  assertNonEmptyString(
    candidate.eligibility.contract_version,
    `${fieldName}.eligibility.contract_version`,
  );

  assertValidIsoTimestamp(
    candidate.eligibility.created_at,
    `${fieldName}.eligibility.created_at`,
  );

  assertOptionalNonEmptyString(
    candidate.eligibility
      .eligibility_result_id,
    `${fieldName}.eligibility.eligibility_result_id`,
  );

  assertNonEmptyString(
    candidate.eligibility
      .evaluator_module_version,
    `${fieldName}.eligibility.evaluator_module_version`,
  );

  assertNonEmptyString(
    candidate.eligibility
      .eligibility_policy_version,
    `${fieldName}.eligibility.eligibility_policy_version`,
  );
}

/* ============================================================================
 * 6. COMPLETE INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Duplicate documents are rejected.
 *
 * They are never:
 * - deduplicated;
 * - merged;
 * - overwritten;
 * - silently ignored.
 * ========================================================================== */

function validateInput(
  input:
    SearchDistributionIdentityInput,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validateCohortIdentity(
    input.cohort_definition,
  );

  const documentIds =
    new Set<string>();

  for (
    const [
      candidateIndex,
      candidate,
    ] of input.candidates.entries()
  ) {
    validateCandidateIdentity(
      candidate,
      input.cohort_definition,
      candidateIndex,
    );

    if (
      documentIds.has(
        candidate.document_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_NAME}] ` +
          `Boundary violation: duplicate cohort candidate document identity ${candidate.document_id}.`,
      );
    }

    documentIds.add(
      candidate.document_id,
    );
  }
}

/* ============================================================================
 * 7. CANONICAL COHORT IDENTITY MATERIALIZATION
 * ----------------------------------------------------------------------------
 * Exact structural identity only.
 *
 * allowed_source_types is treated as a set-like cohort constraint for identity
 * materialization. A copied collection is sorted without mutating the canonical
 * SearchCohortDefinition.
 * ========================================================================== */

function materializeCohortIdentity(
  cohortDefinition:
    SearchCohortDefinition,
): Readonly<Record<string, unknown>> {
  const allowedSourceTypes =
    [
      ...cohortDefinition
        .allowed_source_types,
    ].sort();

  return Object.freeze({
    contract_version:
      cohortDefinition.contract_version,

    created_at:
      cohortDefinition.created_at,

    cohort_id:
      cohortDefinition.cohort_id,

    query_id:
      cohortDefinition.query_id,

    language:
      cohortDefinition.language,

    domain:
      cohortDefinition.domain ??
      null,

    allowed_source_types:
      allowedSourceTypes,

    time_window:
      cohortDefinition.time_window ===
      undefined
        ? null
        : Object.freeze({
            start_at:
              cohortDefinition
                .time_window
                .start_at ??
              null,

            end_at:
              cohortDefinition
                .time_window
                .end_at ??
              null,
          }),

    corpus_version:
      cohortDefinition.corpus_version,

    minimum_cohort_size:
      cohortDefinition.minimum_cohort_size,

    comparability_policy_version:
      cohortDefinition
        .comparability_policy_version,

    ranking_policy_version:
      cohortDefinition
        .ranking_policy_version,

    validation_state:
      cohortDefinition.validation_state,
  });
}

/* ============================================================================
 * 8. CANONICAL CANDIDATE IDENTITY MATERIALIZATION
 * ----------------------------------------------------------------------------
 * No analytical score value is serialized.
 *
 * Distribution identity is based on:
 * - canonical document/query identities;
 * - stable analytical-result identity when available;
 * - explicit producer/contract/policy lineage.
 *
 * Missing optional result IDs remain explicitly absent through null.
 *
 * They are never fabricated.
 * ========================================================================== */

function materializeCandidateIdentity(
  candidate:
    SearchCohortCandidate,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    document_id:
      candidate.document_id,

    query_id:
      candidate.query_id,

    global_score:
      Object.freeze({
        contract_version:
          candidate.global_score
            .contract_version,

        created_at:
          candidate.global_score
            .created_at,

        aggregation_result_id:
          candidate.global_score
            .aggregation_result_id ??
          null,

        aggregator_module_version:
          candidate.global_score
            .aggregator_module_version,

        aggregation_policy_version:
          candidate.global_score
            .aggregation_policy_version,

        validation_state:
          candidate.global_score
            .validation_state,
      }),

    eligibility:
      Object.freeze({
        contract_version:
          candidate.eligibility
            .contract_version,

        created_at:
          candidate.eligibility
            .created_at,

        eligibility_result_id:
          candidate.eligibility
            .eligibility_result_id ??
          null,

        evaluator_module_version:
          candidate.eligibility
            .evaluator_module_version,

        eligibility_policy_version:
          candidate.eligibility
            .eligibility_policy_version,
      }),
  });
}

/* ============================================================================
 * 9. CANONICAL CANDIDATE SET MATERIALIZATION
 * ----------------------------------------------------------------------------
 * Candidate collection order is not distribution identity.
 *
 * A new local array of identity projections is sorted by document_id.
 *
 * IMPORTANT
 *
 * This is NOT:
 * - Public Ranking;
 * - Relative Cohort Evaluation;
 * - cohort normalization;
 * - mutation of SearchCohortCandidate[].
 * ========================================================================== */

function materializeCandidateSetIdentity(
  candidates:
    readonly SearchCohortCandidate[],
): readonly Readonly<
  Record<string, unknown>
>[] {
  const orderedCandidates =
    [
      ...candidates,
    ].sort(
      (
        left,
        right,
      ) => {
        if (
          left.document_id <
          right.document_id
        ) {
          return -1;
        }

        if (
          left.document_id >
          right.document_id
        ) {
          return 1;
        }

        return 0;
      },
    );

  return Object.freeze(
    orderedCandidates.map(
      materializeCandidateIdentity,
    ),
  );
}

/* ============================================================================
 * 10. CANONICAL IDENTITY PAYLOAD
 * ----------------------------------------------------------------------------
 * Key order is intentionally explicit.
 *
 * JSON.stringify therefore receives one deterministic shape produced entirely
 * by this module.
 *
 * No arbitrary upstream Record is serialized directly.
 * ========================================================================== */

function buildIdentityPayload(
  input:
    SearchDistributionIdentityInput,
): string {
  const identityEnvelope =
    Object.freeze({
      namespace:
        XYVALA_SEARCH_DISTRIBUTION_IDENTITY_NAMESPACE,

      algorithm_version:
        XYVALA_SEARCH_DISTRIBUTION_IDENTITY_ALGORITHM_VERSION,

      identity_module_version:
        XYVALA_SEARCH_DISTRIBUTION_IDENTITY_MODULE_VERSION,

      created_at:
        input.created_at,

      cohort:
        materializeCohortIdentity(
          input.cohort_definition,
        ),

      candidates:
        materializeCandidateSetIdentity(
          input.candidates,
        ),
    });

  return JSON.stringify(
    identityEnvelope,
  );
}

/* ============================================================================
 * 11. DETERMINISTIC DIGEST
 * ----------------------------------------------------------------------------
 * SHA-256 is used exclusively for deterministic identity compaction.
 *
 * This is NOT:
 * - randomness;
 * - security authorization;
 * - analytical scoring;
 * - document hashing ownership;
 * - acquisition content_hash reconstruction.
 *
 * The digest only compacts this module's canonical metadata payload.
 * ========================================================================== */

function computeIdentityDigest(
  canonicalPayload:
    string,
): string {
  return createHash(
    "sha256",
  )
    .update(
      canonicalPayload,
      "utf8",
    )
    .digest(
      "hex",
    );
}

/* ============================================================================
 * 12. CANONICAL DISTRIBUTION ID PRODUCER
 * ----------------------------------------------------------------------------
 * OFFICIAL EXECUTION
 *
 * SearchCohortDefinition
 * + SearchCohortCandidate[]
 * + explicit created_at
 * -> validate identity propagation only
 * -> materialize deterministic metadata identity
 * -> deterministic SHA-256 digest
 * -> SearchDistributionId
 *
 * This producer deliberately does NOT inspect:
 * - final_raw_score;
 * - normalized_score;
 * - percentile;
 * - relative_position;
 * - ranking_eligible;
 * - allow_eligible;
 * - penalty values;
 * - confidence values.
 *
 * It produces no SearchCohortDistribution.
 * ========================================================================== */

export function buildSearchDistributionId(
  input:
    SearchDistributionIdentityInput,
): SearchDistributionId {
  validateInput(
    input,
  );

  const canonicalPayload =
    buildIdentityPayload(
      input,
    );

  const digest =
    computeIdentityDigest(
      canonicalPayload,
    );

  return (
    `${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_NAMESPACE}` +
    `:v${XYVALA_SEARCH_DISTRIBUTION_IDENTITY_ALGORITHM_VERSION}` +
    `:${digest}`
  );
}
