/* ============================================================================
 * FILE: lib/xyvala/search/snapshot/search-snapshot-identity-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical snapshot identity core
 *
 * ROLE
 * - produce one canonical deterministic Search snapshot identity
 * - identify one exact private Search snapshot instance
 * - preserve canonical document/query/cohort identities
 * - preserve explicit snapshot version identity
 * - preserve explicit snapshot creation timestamp
 * - reject malformed identity inputs at their first observable boundary
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - SNAPSHOT IDENTITY
 * - METADATA TRUTH PRODUCER
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-MUTATING
 * - PRIVATE
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * SearchDocumentId
 * + SearchQueryId
 * + SearchCohortId
 * + SearchSnapshotVersion
 * + explicit created_at
 *        ↓
 * SEARCH_SNAPSHOT_IDENTITY
 *        ↓
 * snapshot_id
 *        ↓
 * PRIVATE_SNAPSHOT
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 *
 * snapshot_id
 * <- this producer
 *
 * document_id
 * <- upstream canonical document identity
 *
 * query_id
 * <- upstream canonical query identity
 *
 * cohort_id
 * <- upstream canonical cohort identity
 *
 * snapshot_version
 * <- explicit snapshot execution/configuration identity
 *
 * created_at
 * <- explicit orchestration/runtime input
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This module owns ONLY Search snapshot identity production.
 *
 * It does NOT own:
 * - document identity;
 * - query identity;
 * - cohort identity;
 * - snapshot content;
 * - snapshot traceability;
 * - variable lineage;
 * - private decision;
 * - cohort distribution;
 * - analytical scores;
 * - publication timestamps;
 * - runtime clock.
 *
 * PRODUCER / EXECUTION-BOUNDARY SEPARATION
 * ----------------------------------------------------------------------------
 *
 * Canonical producer:
 *
 * buildSearchSnapshotId
 * <- this file
 *
 * Runtime execution boundary:
 *
 * resolve_snapshot_id
 * <- Search runtime port
 *
 * The runtime/bootstrap may bind this producer by exact function reference.
 *
 * That binding does NOT transfer canonical ownership to runtime/bootstrap.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - one canonical snapshot-id producer
 * - deterministic explicit input only
 * - exact upstream identities preserved
 * - no local clock
 * - no Date.now()
 * - no implicit current timestamp
 * - no randomUUID()
 * - no random value
 * - no counter
 * - no process-local state
 * - no persistence lookup
 * - no database-generated identity
 * - no network dependency
 * - no file-system dependency
 * - no cache dependency
 * - no analytical calculation
 * - no score inspection
 * - no decision inspection
 * - no trace generation
 * - no lineage generation
 * - no source truth reconstruction
 * - no identifier normalization
 * - no silent fallback
 *
 * IDENTITY SEMANTICS
 * ----------------------------------------------------------------------------
 * Snapshot identity represents the exact tuple:
 *
 * document_id
 * × query_id
 * × cohort_id
 * × snapshot_version
 * × created_at
 *
 * Therefore:
 *
 * same exact identity tuple
 * -> same snapshot_id
 *
 * any identity-field change
 * -> different snapshot_id
 *
 * The producer does NOT infer whether two snapshots are analytically
 * equivalent.
 *
 * Snapshot identity is instance identity, not analytical equivalence.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * malformed document_id
 * => document identity / snapshot identity boundary
 *
 * malformed query_id
 * => query identity / snapshot identity boundary
 *
 * malformed cohort_id
 * => cohort identity / snapshot identity boundary
 *
 * malformed snapshot_version
 * => snapshot configuration boundary
 *
 * malformed created_at
 * => orchestration timestamp boundary
 *
 * locally generated timestamp
 * => snapshot identity ownership violation
 *
 * random identifier generation
 * => determinism violation
 *
 * analytical value included in snapshot identity
 * => ownership / identity-domain violation
 *
 * generic non-Search snapshot identity reused here
 * => domain ownership violation
 *
 * INVARIANTS
 * ----------------------------------------------------------------------------
 * - same canonical input -> same snapshot_id
 * - input objects are never mutated
 * - no upstream identity is reconstructed
 * - no upstream identity is normalized
 * - no analytical value participates in the identity
 * - no private decision participates in the identity
 * - no cohort statistic participates in the identity
 * - no traceability value participates in the identity
 * - no public projection value participates in the identity
 * - no runtime clock is read
 * - no randomness is used
 * ========================================================================== */

import {
  createHash,
} from "node:crypto";

import type {
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

import type {
  SearchPrivateDocumentSnapshot,
} from "../contracts/search-private-snapshot-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_SNAPSHOT_IDENTITY_MODULE_NAME =
  "xyvala-search-snapshot-identity-core" as const;

export const XYVALA_SEARCH_SNAPSHOT_IDENTITY_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/**
 * Version of the snapshot-identity materialization algorithm.
 *
 * This version is intentionally distinct from:
 * - snapshot_version;
 * - Search contract version;
 * - module version;
 * - policy versions.
 *
 * A module refactor that does not change identity semantics must not
 * necessarily change generated snapshot identities.
 */
export const XYVALA_SEARCH_SNAPSHOT_IDENTITY_ALGORITHM_VERSION =
  "1" as const;

const XYVALA_SEARCH_SNAPSHOT_IDENTITY_NAMESPACE =
  "xyvala-search-snapshot" as const;

/* ============================================================================
 * 2. CANONICAL SNAPSHOT IDENTITY TYPES
 * ----------------------------------------------------------------------------
 * Types are derived from the canonical private snapshot contract rather than
 * redeclared locally.
 *
 * This preserves Contract Before Runtime and prevents a parallel identity
 * contract from emerging in the identity producer.
 * ========================================================================== */

export type SearchCanonicalSnapshotId =
  SearchPrivateDocumentSnapshot["snapshot_id"];

export type SearchSnapshotIdentityDocumentId =
  SearchPrivateDocumentSnapshot["document_id"];

export type SearchSnapshotIdentityQueryId =
  SearchPrivateDocumentSnapshot["query_id"];

export type SearchSnapshotIdentityCohortId =
  SearchPrivateDocumentSnapshot["cohort_id"];

export type SearchSnapshotIdentityVersion =
  SearchPrivateDocumentSnapshot["snapshot_version"];

export type SearchSnapshotIdentityCreatedAt =
  SearchPrivateDocumentSnapshot["created_at"];

/* ============================================================================
 * 3. CANONICAL INPUT
 * ----------------------------------------------------------------------------
 * This structure intentionally mirrors the canonical runtime snapshot identity
 * input without importing the runtime.
 *
 * Dependency direction remains:
 *
 * canonical Search contracts
 *        ↓
 * snapshot identity producer
 *        ↓
 * runtime binding
 *
 * Never:
 *
 * runtime
 *        ↓
 * domain identity producer
 * ========================================================================== */

export interface SearchSnapshotIdentityInput {
  readonly document_id:
    SearchSnapshotIdentityDocumentId;

  readonly query_id:
    SearchSnapshotIdentityQueryId;

  readonly cohort_id:
    SearchSnapshotIdentityCohortId;

  readonly snapshot_version:
    SearchSnapshotIdentityVersion;

  /**
   * Explicit snapshot creation timestamp supplied by orchestration.
   *
   * This producer must never obtain the current time itself.
   */
  readonly created_at:
    SearchSnapshotIdentityCreatedAt;
}

/* ============================================================================
 * 4. SAFE STRING ASSERTION
 * ----------------------------------------------------------------------------
 * Validation does not normalize values.
 *
 * In particular:
 * - no trim is written back;
 * - no casing transformation occurs;
 * - no identifier coercion occurs.
 *
 * Canonical upstream values remain exact.
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
      `[${XYVALA_SEARCH_SNAPSHOT_IDENTITY_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 5. EXPLICIT TIMESTAMP ASSERTION
 * ----------------------------------------------------------------------------
 * This is not a second temporal producer.
 *
 * The timestamp is not transformed, normalized or replaced.
 *
 * Validation only protects the identity boundary against an obviously invalid
 * timestamp value.
 * ========================================================================== */

function assertValidExplicitTimestamp(
  value:
    SearchSnapshotIdentityCreatedAt,

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
      `[${XYVALA_SEARCH_SNAPSHOT_IDENTITY_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must contain a valid explicit timestamp.`,
    );
  }
}

/* ============================================================================
 * 6. INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Only the exact fields consumed by snapshot identity are validated here.
 *
 * This module does NOT revalidate:
 * - Search document semantics;
 * - SearchQuery;
 * - SearchCohortDefinition;
 * - Private Decision;
 * - snapshot contents;
 * - snapshot traceability.
 *
 * Their canonical owners remain authoritative.
 * ========================================================================== */

function validateSearchSnapshotIdentityInput(
  input:
    SearchSnapshotIdentityInput,
): void {
  assertNonEmptyString(
    input.document_id,
    "document_id",
  );

  assertNonEmptyString(
    input.query_id,
    "query_id",
  );

  assertNonEmptyString(
    input.cohort_id,
    "cohort_id",
  );

  assertNonEmptyString(
    input.snapshot_version,
    "snapshot_version",
  );

  assertValidExplicitTimestamp(
    input.created_at,
    "created_at",
  );
}

/* ============================================================================
 * 7. CANONICAL IDENTITY PAYLOAD
 * ----------------------------------------------------------------------------
 * Payload shape and key order are explicitly owned by this identity algorithm.
 *
 * Arbitrary upstream objects are never serialized.
 *
 * Only exact snapshot identity components participate.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * The module version is deliberately NOT included in the hashed payload.
 *
 * A module-only refactor must not silently change snapshot identity semantics.
 *
 * Identity semantics are versioned through:
 *
 * XYVALA_SEARCH_SNAPSHOT_IDENTITY_ALGORITHM_VERSION
 * ========================================================================== */

function buildSearchSnapshotIdentityPayload(
  input:
    SearchSnapshotIdentityInput,
): string {
  const identityEnvelope =
    Object.freeze({
      namespace:
        XYVALA_SEARCH_SNAPSHOT_IDENTITY_NAMESPACE,

      algorithm_version:
        XYVALA_SEARCH_SNAPSHOT_IDENTITY_ALGORITHM_VERSION,

      document_id:
        input.document_id,

      query_id:
        input.query_id,

      cohort_id:
        input.cohort_id,

      snapshot_version:
        input.snapshot_version,

      created_at:
        input.created_at,
    });

  return JSON.stringify(
    identityEnvelope,
  );
}

/* ============================================================================
 * 8. DETERMINISTIC DIGEST
 * ----------------------------------------------------------------------------
 * SHA-256 is used only as deterministic identity compaction.
 *
 * It is NOT:
 * - an analytical score;
 * - random identity generation;
 * - authorization;
 * - acquisition content hashing;
 * - document identity ownership.
 * ========================================================================== */

function computeSearchSnapshotIdentityDigest(
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
 * 9. CANONICAL SNAPSHOT ID PRODUCER
 * ----------------------------------------------------------------------------
 * OFFICIAL EXECUTION
 *
 * document_id
 * + query_id
 * + cohort_id
 * + snapshot_version
 * + explicit created_at
 *        ↓
 * validate identity boundary
 *        ↓
 * deterministic canonical payload
 *        ↓
 * deterministic digest
 *        ↓
 * Search snapshot_id
 *
 * No analytical truth is inspected.
 * ========================================================================== */

export function buildSearchSnapshotId(
  input:
    SearchSnapshotIdentityInput,
): SearchCanonicalSnapshotId {
  validateSearchSnapshotIdentityInput(
    input,
  );

  const canonicalPayload =
    buildSearchSnapshotIdentityPayload(
      input,
    );

  const digest =
    computeSearchSnapshotIdentityDigest(
      canonicalPayload,
    );

  return (
    `${XYVALA_SEARCH_SNAPSHOT_IDENTITY_NAMESPACE}` +
    `:v${XYVALA_SEARCH_SNAPSHOT_IDENTITY_ALGORITHM_VERSION}` +
    `:${digest}`
  );
}

/* ============================================================================
 * 10. OWNERSHIP DECLARATION
 * ----------------------------------------------------------------------------
 * Static governance metadata only.
 *
 * This declaration does not create runtime truth.
 * ========================================================================== */

export const XYVALA_SEARCH_SNAPSHOT_IDENTITY_OWNERSHIP =
  Object.freeze({
    canonical_truth:
      "snapshot_id",

    canonical_owner:
      "SEARCH_SNAPSHOT_IDENTITY",

    canonical_producer:
      "search-snapshot-identity-core.ts",

    canonical_producer_function:
      "buildSearchSnapshotId",

    downstream_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    runtime_execution_boundary:
      "resolve_snapshot_id",

    document_identity_is_reference:
      true,

    query_identity_is_reference:
      true,

    cohort_identity_is_reference:
      true,

    snapshot_version_is_input:
      true,

    created_at_is_explicit_input:
      true,

    analytical_owner:
      false,

    traceability_owner:
      false,

    lineage_owner:
      false,

    private_snapshot_owner:
      false,
  } as const);

/* ============================================================================
 * 11. GOVERNANCE DECLARATION
 * ----------------------------------------------------------------------------
 * Architecture / audit metadata only.
 * ========================================================================== */

export const XYVALA_SEARCH_SNAPSHOT_IDENTITY_GOVERNANCE =
  Object.freeze({
    deterministic:
      true,

    pure:
      true,

    canonical_truth_producer:
      true,

    compute:
      true,

    observe:
      false,

    mutate:
      false,

    explicit_timestamp_required:
      true,

    runtime_clock_access_allowed:
      false,

    random_identity_allowed:
      false,

    upstream_identity_reconstruction_allowed:
      false,

    upstream_identity_normalization_allowed:
      false,

    analytical_value_in_identity_allowed:
      false,

    private_decision_in_identity_allowed:
      false,

    cohort_statistics_in_identity_allowed:
      false,

    traceability_in_identity_allowed:
      false,

    public_projection_in_identity_allowed:
      false,

    persistence_dependency_allowed:
      false,

    network_dependency_allowed:
      false,

    hidden_fallback_allowed:
      false,

    unavailable_forgery_allowed:
      false,

    runtime_port:
      "resolve_snapshot_id",

    prohibited_shortcuts:
      Object.freeze([
        "random_uuid_snapshot_identity",
        "runtime_clock_snapshot_identity",
        "database_generated_snapshot_identity",
        "process_counter_snapshot_identity",
        "generic_cross_domain_snapshot_identity_reuse",

        "snapshot_identity_from_score",
        "snapshot_identity_from_private_decision",
        "snapshot_identity_from_cohort_statistics",
        "snapshot_identity_from_public_position",

        "reconstructed_document_id",
        "reconstructed_query_id",
        "reconstructed_cohort_id",

        "normalized_upstream_identity",
        "implicit_created_at",
        "fallback_snapshot_version",
      ] as const),
  } as const);
