/* ============================================================================
 * FILE: lib/xyvala/search/governance/search-producer-module-version-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical producer module-version registry
 *
 * ROLE
 * - bind exact VLR producer_module identities to their canonical
 *   producer-owned *_MODULE_VERSION constants
 * - implement SearchVariableLineageProducerVersionResolver
 * - enforce exact ACTIVE VLR producer coverage at compile time
 * - enforce exact producer / ownership concordance at runtime
 * - validate Private Snapshot producer-version resolvability
 * - preserve canonical producer version truth unchanged
 *
 * CLASSIFICATION
 * - SEARCH GOVERNANCE
 * - VARIABLE LINEAGE SUPPORT
 * - PRODUCER VERSION GOVERNANCE
 * - REFERENCE REGISTRY
 * - RESOLVE / VALIDATE
 * - PURE
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * canonical Search producer
 *        ↓
 * producer-owned *_MODULE_VERSION
 *        ↓
 * SEARCH PRODUCER MODULE VERSION REGISTRY
 *        ↓
 * resolveSearchProducerModuleVersion(...)
 *        ↓
 * materializeSearchPrivateSnapshotVariableLineage(...)
 *        ↓
 * SearchVariableLineage[]
 *        ↓
 * resolve_snapshot_variable_lineage
 *        ↓
 * SearchRuntimeExecutionContext
 *        ↓
 * PRIVATE_SNAPSHOT
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This module does NOT own producer version truth.
 *
 * Version truth remains owned by each canonical producer.
 *
 * Example:
 *
 * search-temporal-signals-search-core.ts
 *        ↓
 * XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_VERSION
 *
 * This registry owns only the exact governed reference:
 *
 * VLR producer_module identity
 *        ↓
 * exact producer-owned module-version constant
 *
 * There is therefore no duplicated version literal.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * The canonical VLR already defines:
 *
 * SearchVariableLineageProducerVersionResolutionInput
 * SearchVariableLineageProducerVersionResolver
 * materializeSearchPrivateSnapshotVariableLineage(...)
 *
 * This file implements that existing resolution boundary.
 *
 * It introduces:
 * - no second lineage contract;
 * - no second producer identity;
 * - no second module-version truth.
 *
 * TYPE-LEVEL COVERAGE GOVERNANCE
 * ----------------------------------------------------------------------------
 * The set of required producer modules is derived directly from:
 *
 * XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
 *
 * and specifically from entries where:
 *
 * lineage_status === "ACTIVE"
 *
 * Therefore:
 *
 * ACTIVE VLR producer missing from this registry
 * -> TypeScript compile-time divergence
 *
 * registry producer absent from ACTIVE VLR
 * -> TypeScript compile-time divergence
 *
 * This avoids maintaining a second handwritten list of expected producers.
 *
 * PRIVATE SNAPSHOT GOVERNANCE
 * ----------------------------------------------------------------------------
 * Private Snapshot lineage requires only VLR entries where:
 *
 * lineage_status === "ACTIVE"
 * &&
 * snapshot_transport_required === true
 *
 * This subset is also derived directly from the VLR.
 *
 * No snapshot variable list is duplicated locally.
 *
 * VLR RESOLUTION CONCORDANCE
 * ----------------------------------------------------------------------------
 * For every resolution request:
 *
 * input.variable_name
 *        ↓
 * canonical VLR entry
 *
 * input.producer_layer
 * === VLR ownership_layer
 *
 * input.producer_module
 * === VLR producer_module
 *
 * Only then may module version resolution occur.
 *
 * The resolver MUST NOT repair an incorrect request.
 *
 * LIFECYCLE GOVERNANCE
 * ----------------------------------------------------------------------------
 * ACTIVE
 * -> runtime resolution authorized
 *
 * DEPRECATED
 * -> explicit compatibility inspection may resolve when the referenced
 *    canonical producer remains registered
 *
 * PLANNED
 * -> runtime resolution forbidden
 *
 * RETIRED
 * -> runtime resolution forbidden
 *
 * INVALID
 * -> runtime resolution forbidden
 *
 * Planned producer identities therefore receive no fabricated version.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - exact producer module identity only
 * - exact producer-owned version reference only
 * - ACTIVE VLR coverage derived from VLR
 * - Private Snapshot coverage derived from VLR
 * - exact producer_layer concordance
 * - exact producer_module concordance
 *
 * - no hardcoded producer version literal
 * - no version inference
 * - no filename parsing
 * - no basename parsing
 * - no path normalization
 * - no case normalization
 * - no fuzzy matching
 * - no startsWith()
 * - no includes()
 * - no layer-to-version mapping
 * - no contract-version fallback
 * - no VLR-version fallback
 * - no registry-version fallback
 * - no package-version fallback
 * - no DEFAULT_* version
 *
 * - no PLANNED producer fallback
 * - no UNKNOWN producer fallback
 *
 * - no SearchVariableLineage reconstruction
 * - no SearchTraceRecord production
 * - no Private Snapshot reconstruction
 * - no analytical calculation
 * - no scoring
 * - no calibration
 *
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no randomness
 * - no persistence
 * - no cache mutation
 * - no logging
 * - no network
 * - no file-system access
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * producer module-version truth
 * <- CONFIGURED_CANONICAL_PRODUCER
 *
 * producer_module identity
 * <- VARIABLE_LINEAGE_GOVERNANCE
 *
 * producer_module -> producer_module_version reference mapping
 * <- SEARCH_PRODUCER_MODULE_VERSION_REGISTRY
 *
 * SearchVariableLineage
 * <- VARIABLE_LINEAGE_GOVERNANCE
 *
 * SearchTraceRecord
 * <- EXECUTION_TRACEABILITY
 *
 * Private Snapshot
 * <- PRIVATE_SNAPSHOT
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * ACTIVE VLR producer missing from registry
 * => compile-time producer-version coverage boundary
 *
 * unknown registry producer
 * => compile-time producer-version coverage boundary
 *
 * producer_layer differs from VLR ownership_layer
 * => resolver request boundary
 *
 * producer_module differs from VLR producer_module
 * => resolver request boundary
 *
 * PLANNED variable reaches runtime resolution
 * => lineage lifecycle boundary
 *
 * RETIRED variable reaches runtime resolution
 * => lineage lifecycle boundary
 *
 * INVALID variable reaches runtime resolution
 * => lineage lifecycle boundary
 *
 * producer version copied as a local literal
 * => canonical producer ownership violation
 *
 * producer version inferred from Search contract version
 * => provenance violation
 *
 * producer version inferred from VLR version
 * => provenance violation
 *
 * producer version inferred from filename
 * => provenance violation
 *
 * unknown producer receives fallback
 * => governance violation
 *
 * INVARIANTS
 * ----------------------------------------------------------------------------
 * - registry producer domain equals ACTIVE VLR producer domain
 * - every value is an exact imported producer-owned version constant
 * - no producer version is locally calculated
 * - no producer version is locally normalized
 * - no producer version is locally mutated
 * - Private Snapshot producer coverage is complete
 * - producer_layer concordance is exact
 * - producer_module concordance is exact
 * - PLANNED producer versions are never fabricated
 * - runtime clock is never read
 * - no analytical truth is created
 * - no execution trace is created
 * - no variable lineage is reconstructed
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

import {
  XYVALA_SEARCH_ACQUISITION_MODULE_VERSION,
} from "../acquisition/search-acquisition-core";

import {
  XYVALA_SEARCH_EXTRACTION_MODULE_VERSION,
} from "../extraction/search-extraction-core";

import {
  XYVALA_SEARCH_SEGMENTATION_MODULE_VERSION,
} from "../segmentation/search-segmentation-core";

import {
  XYVALA_SEARCH_LEXICAL_MODULE_VERSION,
} from "../lexical/search-lexical-analysis-core";

import {
  XYVALA_SEARCH_FREQUENCY_SIGNALS_MODULE_VERSION,
} from "../signals/search-frequency-signals-core";

import {
  XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_VERSION,
} from "../signals/search-anchor-signals-core";

import {
  XYVALA_SEARCH_CONTEXT_AGGREGATION_MODULE_VERSION,
} from "../aggregation/search-context-aggregation-core";

import {
  XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_VERSION,
} from "../signals/search-link-signals-search-core";

import {
  XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_VERSION,
} from "../temporal/search-temporal-signals-search-core";

import {
  XYVALA_SEARCH_BEHAVIORAL_SIGNALS_SEARCH_CORE_MODULE_VERSION,
} from "../signals/search-behavioral-signals-search-core";

import {
  XYVALA_SEARCH_QUERY_ANALYSIS_MODULE_VERSION,
} from "../query/search-query-analysis-core";

import {
  XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_VERSION,
} from "../query/search-query-document-signals-core";

import {
  XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_VERSION,
} from "../scoring/search-document-scoring-core";

import {
  XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_VERSION,
} from "../scoring/search-temporal-document-scoring-core";

import {
  XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_VERSION,
} from "../scoring/search-query-relevance-scoring-core";

import {
  XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_VERSION,
} from "../scoring/search-link-authority-scoring-core";

import {
  XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_VERSION,
} from "../scoring/search-behavioral-calibration-scoring-core";

import {
  XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_VERSION,
} from "../scoring/search-penalty-evaluation-core";

import {
  XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_VERSION,
} from "../aggregation/search-analytical-aggregation-core";

import {
  XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_VERSION,
} from "../eligibility/search-eligibility-evaluation-core";

import {
  XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_VERSION,
} from "../cohort/search-cohort-normalization-core";

import {
  XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_VERSION,
} from "../cohort/search-relative-cohort-evaluation-core";

import {
  XYVALA_SEARCH_PRIVATE_DECISION_MODULE_VERSION,
} from "../decision/search-private-decision-core";

import {
  XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_VERSION,
} from "../transformers/search-public-result-transformer";

import {
  XYVALA_SEARCH_PUBLIC_RANKING_MODULE_VERSION,
} from "../ranking/search-public-ranking-core";

import {
  XYVALA_SEARCH_REGISTERED_VARIABLE_NAMES,
  XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY,
  getSearchVariableLineageRegistryEntry,
  validateSearchVariableLineageRegistry,
} from "./search-variable-lineage-registry";

import type {
  SearchRegisteredVariableName,
  SearchVariableLineageProducerVersionResolver,
} from "./search-variable-lineage-registry";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME =
  "xyvala-search-producer-module-version-registry" as const;

export const XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

/* ============================================================================
 * 2. ACTIVE VLR PRODUCER MODULE DOMAIN
 * ----------------------------------------------------------------------------
 * Derived from the canonical VLR.
 *
 * No second handwritten producer-name union exists.
 * ========================================================================== */

export type SearchActiveVlrProducerModuleName =
  {
    readonly [
      TVariableName in
        SearchRegisteredVariableName
    ]:
      (
        typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
      )[TVariableName] extends {
        readonly lineage_status:
          "ACTIVE";

        readonly producer_module:
          infer TProducerModule extends string;
      }
        ? TProducerModule
        : never;
  }[
    SearchRegisteredVariableName
  ];

/* ============================================================================
 * 3. PRIVATE SNAPSHOT VLR PRODUCER MODULE DOMAIN
 * ----------------------------------------------------------------------------
 * Exact subset:
 *
 * ACTIVE
 * +
 * snapshot_transport_required === true
 *
 * Derived from the canonical registry.
 * ========================================================================== */

export type SearchPrivateSnapshotVlrProducerModuleName =
  {
    readonly [
      TVariableName in
        SearchRegisteredVariableName
    ]:
      (
        typeof XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY
      )[TVariableName] extends {
        readonly lineage_status:
          "ACTIVE";

        readonly snapshot_transport_required:
          true;

        readonly producer_module:
          infer TProducerModule extends string;
      }
        ? TProducerModule
        : never;
  }[
    SearchRegisteredVariableName
  ];

/* ============================================================================
 * 4. CANONICAL PRODUCER MODULE VERSION REGISTRY
 * ----------------------------------------------------------------------------
 * Every value is a direct reference to the producer-owned module-version
 * constant.
 *
 * No local producer version literal is authorized.
 *
 * `satisfies` enforces compile-time ACTIVE VLR producer coverage.
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY =
  Object.freeze({
    /* -------------------------------------------------------------------------
     * ACQUISITION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/acquisition/search-acquisition-core.ts":
      XYVALA_SEARCH_ACQUISITION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * EXTRACTION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/extraction/search-extraction-core.ts":
      XYVALA_SEARCH_EXTRACTION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * SEGMENTATION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/segmentation/search-segmentation-core.ts":
      XYVALA_SEARCH_SEGMENTATION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * LEXICAL ANALYSIS
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/lexical/search-lexical-analysis-core.ts":
      XYVALA_SEARCH_LEXICAL_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * FREQUENCY SIGNAL DETECTION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/signals/search-frequency-signals-core.ts":
      XYVALA_SEARCH_FREQUENCY_SIGNALS_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * ANCHOR SIGNAL DETECTION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/signals/search-anchor-signals-core.ts":
      XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * CONTEXT AGGREGATION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/aggregation/search-context-aggregation-core.ts":
      XYVALA_SEARCH_CONTEXT_AGGREGATION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * LINK SIGNAL DETECTION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/signals/search-link-signals-search-core.ts":
      XYVALA_SEARCH_LINK_SIGNALS_SEARCH_CORE_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * TEMPORAL SIGNAL DETECTION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/temporal/search-temporal-signals-search-core.ts":
      XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * BEHAVIORAL SIGNAL DETECTION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/signals/search-behavioral-signals-search-core.ts":
      XYVALA_SEARCH_BEHAVIORAL_SIGNALS_SEARCH_CORE_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * QUERY PROFILING
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/query/search-query-analysis-core.ts":
      XYVALA_SEARCH_QUERY_ANALYSIS_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * QUERY-DOCUMENT SIGNAL DETECTION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/query/search-query-document-signals-core.ts":
      XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * INTRINSIC DOCUMENT SCORING
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/scoring/search-document-scoring-core.ts":
      XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * TEMPORAL DOCUMENT SCORING
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/scoring/search-temporal-document-scoring-core.ts":
      XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * QUERY RELEVANCE SCORING
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/scoring/search-query-relevance-scoring-core.ts":
      XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * LINK AUTHORITY SCORING
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/scoring/search-link-authority-scoring-core.ts":
      XYVALA_SEARCH_LINK_AUTHORITY_SCORING_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * BEHAVIORAL CALIBRATION SCORING
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/scoring/search-behavioral-calibration-scoring-core.ts":
      XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * PENALTY EVALUATION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/scoring/search-penalty-evaluation-core.ts":
      XYVALA_SEARCH_PENALTY_EVALUATION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * ANALYTICAL AGGREGATION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts":
      XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * ELIGIBILITY
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/eligibility/search-eligibility-evaluation-core.ts":
      XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * COHORT NORMALIZATION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/cohort/search-cohort-normalization-core.ts":
      XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * RELATIVE COHORT EVALUATION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts":
      XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * PRIVATE DECISION
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/decision/search-private-decision-core.ts":
      XYVALA_SEARCH_PRIVATE_DECISION_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * TRANSFORMATION
     *
     * ACTIVE VLR producer.
     * Not part of Private Snapshot lineage materialization itself.
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/transformers/search-public-result-transformer.ts":
      XYVALA_SEARCH_PUBLIC_RESULT_TRANSFORMER_MODULE_VERSION,

    /* -------------------------------------------------------------------------
     * PUBLIC RANKING
     *
     * ACTIVE VLR producer.
     * Downstream of Private Snapshot.
     * ---------------------------------------------------------------------- */

    "lib/xyvala/search/ranking/search-public-ranking-core.ts":
      XYVALA_SEARCH_PUBLIC_RANKING_MODULE_VERSION,
  } as const satisfies Readonly<
    Record<
      SearchActiveVlrProducerModuleName,
      SearchModuleVersion
    >
  >);

/* ============================================================================
 * 5. ACTUAL CANONICAL PRODUCER MODULE DOMAIN
 * ========================================================================== */

export type SearchCanonicalProducerModuleName =
  keyof typeof XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY;

/* ============================================================================
 * 6. COMPILE-TIME ACTIVE VLR COVERAGE
 * ----------------------------------------------------------------------------
 * Both directions are checked.
 *
 * Missing:
 * ACTIVE VLR producer absent from registry.
 *
 * Unknown:
 * registry producer not present in ACTIVE VLR.
 * ========================================================================== */

type SearchProducerModuleVersionRegistryMissingProducer =
  Exclude<
    SearchActiveVlrProducerModuleName,
    SearchCanonicalProducerModuleName
  >;

type SearchProducerModuleVersionRegistryUnknownProducer =
  Exclude<
    SearchCanonicalProducerModuleName,
    SearchActiveVlrProducerModuleName
  >;

type SearchProducerModuleVersionRegistryCoverageIsExact =
  [
    SearchProducerModuleVersionRegistryMissingProducer,
    SearchProducerModuleVersionRegistryUnknownProducer,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_COVERAGE_IS_EXACT:
  SearchProducerModuleVersionRegistryCoverageIsExact =
    true;

void XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_COVERAGE_IS_EXACT;

/* ============================================================================
 * 7. PRIVATE SNAPSHOT PRODUCER COVERAGE
 * ----------------------------------------------------------------------------
 * Every ACTIVE producer required by Private Snapshot must belong to the
 * canonical ACTIVE producer registry.
 *
 * This is logically implied by complete ACTIVE coverage, but retained as an
 * explicit architectural assertion because Private Snapshot lineage is a
 * critical governance boundary.
 * ========================================================================== */

type SearchPrivateSnapshotMissingProducerVersion =
  Exclude<
    SearchPrivateSnapshotVlrProducerModuleName,
    SearchCanonicalProducerModuleName
  >;

type SearchPrivateSnapshotProducerVersionCoverageIsExact =
  SearchPrivateSnapshotMissingProducerVersion extends never
    ? true
    : false;

const XYVALA_SEARCH_PRIVATE_SNAPSHOT_PRODUCER_VERSION_COVERAGE_IS_EXACT:
  SearchPrivateSnapshotProducerVersionCoverageIsExact =
    true;

void XYVALA_SEARCH_PRIVATE_SNAPSHOT_PRODUCER_VERSION_COVERAGE_IS_EXACT;

/* ============================================================================
 * 8. REGISTERED PRODUCER MODULE COLLECTION
 * ----------------------------------------------------------------------------
 * Registry declaration order only.
 *
 * This collection does NOT represent:
 * - execution order;
 * - pipeline order;
 * - trace order;
 * - snapshot order.
 * ========================================================================== */

export const XYVALA_SEARCH_REGISTERED_PRODUCER_MODULE_NAMES =
  Object.freeze(
    Object.keys(
      XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY,
    ) as SearchCanonicalProducerModuleName[],
  );

/* ============================================================================
 * 9. SAFE NON-EMPTY STRING ASSERTION
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
      `[${XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME}] ` +
        `Producer-module-version governance violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 10. CANONICAL PRODUCER MODULE TYPE GUARD
 * ----------------------------------------------------------------------------
 * Exact object-key membership only.
 *
 * No path manipulation.
 * No fuzzy resolution.
 * ========================================================================== */

export function isSearchCanonicalProducerModuleName(
  value:
    string,
): value is SearchCanonicalProducerModuleName {
  return Object.prototype.hasOwnProperty.call(
    XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY,
    value,
  );
}

/* ============================================================================
 * 11. EXACT PRODUCER MODULE VERSION LOOKUP
 * ----------------------------------------------------------------------------
 * Static canonical lookup only.
 *
 * This function assumes that producer-module identity has already been
 * authorized by the caller.
 *
 * Full VLR concordance belongs to:
 *
 * resolveSearchProducerModuleVersion(...)
 * ========================================================================== */

export function getSearchProducerModuleVersion(
  producerModule:
    SearchCanonicalProducerModuleName,
): SearchModuleVersion {
  const producerModuleVersion =
    XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY[
      producerModule
    ];

  assertNonEmptyString(
    producerModuleVersion,
    `producer_module_version:${producerModule}`,
  );

  return producerModuleVersion;
}

/* ============================================================================
 * 12. EXACT ACTIVE VLR RUNTIME COVERAGE VALIDATION
 * ----------------------------------------------------------------------------
 * PURPOSE
 * - provide the runtime Protocol-as-Code counterpart of compile-time coverage
 * - prove exact bidirectional concordance between:
 *
 *   ACTIVE VLR producer_module identities
 *   and
 *   canonical producer module-version registry identities
 *
 * REQUIRED INVARIANT
 * ----------------------------------------------------------------------------
 *
 * ACTIVE VLR producers
 *        ==
 * SEARCH PRODUCER MODULE VERSION REGISTRY
 *
 * Direction A
 * - every ACTIVE VLR producer must exist in the producer-version registry
 *
 * Direction B
 * - every producer-version registry entry must be referenced by at least one
 *   ACTIVE VLR variable
 *
 * This prevents:
 * - missing producer-version references
 * - stale registry producers
 * - orphan producer mappings
 * - silent registry drift
 *
 * GOVERNANCE ONLY
 * ----------------------------------------------------------------------------
 * No lineage is materialized.
 * No producer executes.
 * No version is inferred.
 * No analytical truth is created.
 * ========================================================================== */

function validateActiveVlrProducerCoverage():
  void {
  const activeVlrProducerModules =
    new Set<SearchCanonicalProducerModuleName>();

  /* --------------------------------------------------------------------------
   * A. ACTIVE VLR -> PRODUCER VERSION REGISTRY
   * ----------------------------------------------------------------------- */

  for (
    const variableName of
    XYVALA_SEARCH_REGISTERED_VARIABLE_NAMES
  ) {
    const entry =
      getSearchVariableLineageRegistryEntry(
        variableName,
      );

    if (
      entry.lineage_status !==
      "ACTIVE"
    ) {
      continue;
    }

    assertNonEmptyString(
      entry.producer_module,
      `${variableName}.producer_module`,
    );

    if (
      !isSearchCanonicalProducerModuleName(
        entry.producer_module,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME}] ` +
          `First divergence: ACTIVE VLR variable ${variableName} references ` +
          `producer_module ${entry.producer_module}, but no canonical producer ` +
          `module-version mapping exists.`,
      );
    }

    activeVlrProducerModules.add(
      entry.producer_module,
    );

    getSearchProducerModuleVersion(
      entry.producer_module,
    );
  }

  /* --------------------------------------------------------------------------
   * B. PRODUCER VERSION REGISTRY -> ACTIVE VLR
   * ----------------------------------------------------------------------- */

  for (
    const producerModule of
    XYVALA_SEARCH_REGISTERED_PRODUCER_MODULE_NAMES
  ) {
    if (
      !activeVlrProducerModules.has(
        producerModule,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME}] ` +
          `First divergence: producer module-version registry contains ` +
          `${producerModule}, but no ACTIVE VLR variable references that ` +
          `canonical producer.`,
      );
    }

    getSearchProducerModuleVersion(
      producerModule,
    );
  }
}

/* ============================================================================
 * 13. PRIVATE SNAPSHOT PRODUCER COVERAGE VALIDATION
 * ----------------------------------------------------------------------------
 * Only:
 *
 * ACTIVE
 * +
 * snapshot_transport_required
 *
 * are considered.
 *
 * PLANNED and DEPRECATED variables cannot create snapshot producer-version
 * requirements here.
 * ========================================================================== */

export function validateSearchPrivateSnapshotProducerModuleVersionCoverage():
  void {
  for (
    const variableName of
    XYVALA_SEARCH_REGISTERED_VARIABLE_NAMES
  ) {
    const entry =
      getSearchVariableLineageRegistryEntry(
        variableName,
      );

    if (
      entry.lineage_status !==
        "ACTIVE" ||
      !entry.snapshot_transport_required
    ) {
      continue;
    }

    if (
      !isSearchCanonicalProducerModuleName(
        entry.producer_module,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME}] ` +
          `Private Snapshot lineage divergence: variable ${variableName} ` +
          `requires producer ${entry.producer_module}, but that producer has ` +
          "no canonical module-version mapping.",
      );
    }

    getSearchProducerModuleVersion(
      entry.producer_module,
    );
  }
}

/* ============================================================================
 * 14. COMPLETE REGISTRY VALIDATION
 * ----------------------------------------------------------------------------
 * Validation order:
 *
 * canonical VLR
 * -> complete ACTIVE producer coverage
 * -> Private Snapshot subset coverage
 *
 * Contract Before Runtime.
 * ========================================================================== */

export function validateSearchProducerModuleVersionRegistry():
  void {
  validateSearchVariableLineageRegistry();

  validateActiveVlrProducerCoverage();

  validateSearchPrivateSnapshotProducerModuleVersionCoverage();

  /*
   * Validate all declared registry values independently.
   *
   * This does not infer or reconstruct a producer version.
   */
  for (
    const producerModule of
    XYVALA_SEARCH_REGISTERED_PRODUCER_MODULE_NAMES
  ) {
    getSearchProducerModuleVersion(
      producerModule,
    );
  }
}

/* ============================================================================
 * 15. CANONICAL VLR PRODUCER VERSION RESOLVER
 * ----------------------------------------------------------------------------
 * OFFICIAL FLOW
 *
 * SearchVariableLineageProducerVersionResolutionInput
 *        ↓
 * canonical VLR variable lookup
 *        ↓
 * ownership_layer concordance
 *        ↓
 * producer_module concordance
 *        ↓
 * lifecycle authorization
 *        ↓
 * exact producer registry membership
 *        ↓
 * exact producer-owned SearchModuleVersion
 *
 * This function resolves version truth only.
 *
 * It does NOT materialize SearchVariableLineage.
 * ========================================================================== */

export const resolveSearchProducerModuleVersion:
  SearchVariableLineageProducerVersionResolver =
    (
      input,
    ): SearchModuleVersion => {
      const entry =
        getSearchVariableLineageRegistryEntry(
          input.variable_name,
        );

      /* ----------------------------------------------------------------------
       * 1. OWNERSHIP LAYER CONCORDANCE
       * ------------------------------------------------------------------- */

      if (
        input.producer_layer !==
        entry.ownership_layer
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME}] ` +
            `First divergence: variable ${input.variable_name} requested ` +
            `producer_layer ${input.producer_layer}, while canonical VLR ` +
            `ownership_layer is ${entry.ownership_layer}.`,
        );
      }

      /* ----------------------------------------------------------------------
       * 2. PRODUCER MODULE CONCORDANCE
       * ------------------------------------------------------------------- */

      if (
        input.producer_module !==
        entry.producer_module
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME}] ` +
            `First divergence: variable ${input.variable_name} requested ` +
            `producer_module ${input.producer_module}, while canonical VLR ` +
            `producer_module is ${entry.producer_module}.`,
        );
      }

     /* ==========================================================================
 * 3. LINEAGE LIFECYCLE AUTHORIZATION
 * --------------------------------------------------------------------------
 * Runtime producer module-version resolution is explicitly authorized only
 * for lifecycle states that may legitimately participate in lineage
 * inspection/materialization.
 *
 * ACTIVE
 * - canonical runtime lineage.
 *
 * DEPRECATED
 * - compatibility lineage may still require the canonical producer version
 *   when explicitly inspected.
 *
 * Every other present or future lifecycle state is rejected by default.
 *
 * This is intentionally an allow-list:
 * - no widening of the actual registry lifecycle domain;
 * - no dependency on currently absent RETIRED / INVALID members;
 * - future states cannot silently become runtime-authorized.
 * ======================================================================== */

if (
  entry.lineage_status !== "ACTIVE" &&
  entry.lineage_status !== "DEPRECATED"
) {
  throw new Error(
    `[${XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME}] ` +
      `Runtime producer module-version resolution is forbidden for ` +
      `${input.variable_name} with lineage_status ` +
      `${entry.lineage_status}.`,
  );
}
      /* ----------------------------------------------------------------------
       * 4. EXACT PRODUCER REGISTRY MEMBERSHIP
       * ------------------------------------------------------------------- */

      if (
        !isSearchCanonicalProducerModuleName(
          input.producer_module,
        )
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME}] ` +
            `Producer module ${input.producer_module} for variable ` +
            `${input.variable_name} has no canonical Search module-version ` +
            "mapping. No fallback is authorized.",
        );
      }

      /* ----------------------------------------------------------------------
       * 5. EXACT PRODUCER-OWNED VERSION
       * ------------------------------------------------------------------- */

      return getSearchProducerModuleVersion(
        input.producer_module,
      );
    };

/* ============================================================================
 * 16. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_OWNERSHIP =
  Object.freeze({
    registry_owner:
      "SEARCH_PRODUCER_MODULE_VERSION_REGISTRY",

    governance_plane:
      "GOVERNANCE_PLANE",

    governance_domain:
      "VARIABLE_LINEAGE_GOVERNANCE",

    canonical_version_truth_owner:
      "CONFIGURED_CANONICAL_PRODUCER",

    producer_module_identity_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    producer_module_version_mapping_owner:
      "SEARCH_PRODUCER_MODULE_VERSION_REGISTRY",

    resolver_contract_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    resolver_contract:
      "SearchVariableLineageProducerVersionResolver",

    resolver:
      "resolveSearchProducerModuleVersion",

    registry_module:
      XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_MODULE_NAME,

    active_producer_domain_source:
      "XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY",

    private_snapshot_producer_domain_source:
      "XYVALA_SEARCH_VARIABLE_LINEAGE_REGISTRY",

    registered_producer_count:
      XYVALA_SEARCH_REGISTERED_PRODUCER_MODULE_NAMES
        .length,

    registered_producers:
      XYVALA_SEARCH_REGISTERED_PRODUCER_MODULE_NAMES,

    version_values_are_direct_producer_references:
      true,

    version_values_are_locally_owned:
      false,

    active_vlr_coverage_is_compile_time_exact:
      true,

    private_snapshot_coverage_is_compile_time_derived:
      true,

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    private_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    analytical_truth_owner:
      false,

    scoring_truth_owner:
      false,

    policy_owner:
      false,

    trace_owner:
      false,

    identity_owner:
      false,

    variable_lineage_materialized_here:
      false,

    execution_trace_generated_here:
      false,

    runtime_clock_read:
      false,

    random_identity_generated:
      false,

    persistence_performed:
      false,
  } as const);

/* ============================================================================
 * 17. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_MODULE_VERSION_REGISTRY_GOVERNANCE =
  Object.freeze({
    producer_module_version_reference_registry:
      true,

    analytical_producer:
      false,

    pipeline_layer_created:
      false,

    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    canonical_vlr_required:
      true,

    active_producer_domain_derived_from_vlr:
      true,

    private_snapshot_producer_domain_derived_from_vlr:
      true,

    exact_active_vlr_producer_coverage_required:
      true,

    exact_active_vlr_producer_coverage_compile_time_enforced:
      true,

    exact_vlr_producer_identity_required:
      true,

    exact_vlr_ownership_layer_required:
      true,

    direct_producer_module_version_reference_required:
      true,

    producer_version_literal_duplication_allowed:
      false,

    producer_version_inference_allowed:
      false,

    producer_version_normalization_allowed:
      false,

    producer_version_mutation_allowed:
      false,

    producer_filename_version_inference_allowed:
      false,

    producer_basename_version_inference_allowed:
      false,

    producer_module_path_normalization_allowed:
      false,

    producer_module_case_normalization_allowed:
      false,

    fuzzy_producer_module_matching_allowed:
      false,

    producer_layer_version_inference_allowed:
      false,

    contract_version_as_producer_version_allowed:
      false,

    vlr_version_as_producer_version_allowed:
      false,

    registry_version_as_producer_version_allowed:
      false,

    package_version_as_producer_version_allowed:
      false,

    runtime_state_version_reconstruction_allowed:
      false,

    execution_trace_version_reconstruction_allowed:
      false,

    private_snapshot_version_reconstruction_allowed:
      false,

    planned_producer_runtime_resolution_allowed:
      false,

    retired_producer_runtime_resolution_allowed:
      false,

    invalid_producer_runtime_resolution_allowed:
      false,

    deprecated_reference_explicit_resolution_allowed:
      true,

    unknown_producer_fallback_allowed:
      false,

    default_producer_version_allowed:
      false,

    variable_lineage_materialization_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    execution_trace_generation_allowed:
      false,

    private_snapshot_reconstruction_allowed:
      false,

    analytical_calculation_allowed:
      false,

    scoring_allowed:
      false,

    policy_resolution_allowed:
      false,

    calibration_execution_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    persistence_allowed:
      false,

    cache_mutation_allowed:
      false,

    network_access_allowed:
      false,

    file_system_access_allowed:
      false,

    logging_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "hardcoded_producer_module_version",

        "producer_version_from_search_contract_version",
        "producer_version_from_vlr_contract_version",
        "producer_version_from_vlr_schema_version",
        "producer_version_from_registry_module_version",
        "producer_version_from_package_version",

        "producer_version_from_filename",
        "producer_version_from_module_basename",
        "producer_version_from_pipeline_layer",

        "producer_module_path_normalization",
        "producer_module_case_normalization",
        "producer_module_fuzzy_match",
        "producer_module_starts_with_match",
        "producer_module_includes_match",

        "unknown_producer_default_version",
        "unknown_producer_fallback_version",

        "planned_producer_runtime_version",
        "retired_producer_runtime_version",
        "invalid_producer_runtime_version",

        "producer_layer_repaired_from_vlr",
        "producer_module_repaired_from_vlr",

        "producer_version_from_execution_trace",
        "producer_version_from_private_snapshot",
        "producer_version_from_final_runtime_state",

        "variable_lineage_reconstructed_here",
        "execution_trace_generated_here",
        "private_snapshot_reconstructed_here",

        "runtime_clock_access",
        "random_identity_generation",

        "persistence",
        "cache_mutation",
        "logging",
        "network_access",
      ] as const),
  } as const);
