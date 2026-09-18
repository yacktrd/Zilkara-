/* ============================================================================
 * FILE:
 * lib/xyvala/search/domains/financial-*news/
 * search-financial-news-acquisition-adapter.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News acquisition adapter
 *
 * ROLE
 * - consume Financial News acquisition observations produced by an explicitly
 *   authorized external acquisition source
 * - preserve source-owned acquisition truth
 * - delegate canonical SearchRawDocument construction exclusively to the
 *   canonical Search acquisition core
 * - expose the exact SearchRuntimePorts["acquire_documents"] contract
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - ACQUISITION ADAPTER
 * - CONTRACT ADAPTATION
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-PERSISTING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * Authorized external Financial News source
 * -> SearchFinancialNewsAcquisitionInput[]
 * -> THIS ADAPTER
 * -> buildSearchRawDocument()
 * -> SearchRawDocument[]
 * -> SearchRuntimePorts["acquire_documents"]
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 *
 * The authorized external acquisition source owns:
 * - payload retrieval;
 * - source URI;
 * - MIME type;
 * - raw content;
 * - fetched_at;
 * - acquisition created_at;
 * - acquisition method;
 * - acquisition module version;
 * - source metadata.
 *
 * The canonical Search acquisition core owns:
 * - acquisition validation;
 * - content_hash;
 * - document_id;
 * - canonical SearchRawDocument;
 * - validation_state;
 * - rejection_reasons;
 * - canonical acquisition contract version.
 *
 * This adapter owns no analytical truth.
 *
 * TIMESTAMP GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * Runtime created_at and acquisition created_at are distinct realities.
 *
 * SearchRuntimeAcquisitionInput.created_at:
 * - belongs to the Search runtime execution.
 *
 * SearchFinancialNewsAcquisitionInput.created_at:
 * - belongs to the acquired raw-document observation;
 * - is supplied explicitly by the authorized acquisition source;
 * - must satisfy the canonical acquisition contract relative to fetched_at.
 *
 * This adapter MUST NOT replace acquisition created_at with runtime created_at.
 *
 * Likewise:
 *
 * fetched_at
 * != published_at
 *
 * published_at is documentary / temporal evidence and MUST NOT be derived,
 * repaired, inferred, or converted into fetched_at here.
 *
 * AVAILABILITY / FAILURE GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * The runtime acquisition port does not currently expose
 * SearchOptionalEvidence.
 *
 * Therefore:
 * - actual zero search results may be represented by an empty collection;
 * - provider failure MUST NOT be converted into an empty collection;
 * - transport/provider errors MUST propagate as errors;
 * - rejected canonical acquisition inputs MUST NOT be silently filtered;
 * - analytical INSUFFICIENT_DATA MUST NOT be manufactured here.
 *
 * DOMAIN GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * Financial News documents handled by this adapter are ARTICLE observations.
 *
 * Explicit acquisition lineage is mandatory for this domain:
 * - acquisition_method is required;
 * - acquisition_module_version is required.
 *
 * The Financial News domain deliberately does not rely on the optional
 * canonical acquisition defaults.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - one truth = one canonical producer
 * - exact runtime-port compatibility
 * - no network access in this adapter
 * - no local clock
 * - no random identifier
 * - no local hashing
 * - no local document identity
 * - no local validation-state creation
 * - no source-metadata reconstruction
 * - no error swallowing
 * - no result filtering
 * - no duplicate-document resolution
 * - no query profiling
 * - no contextual concordance
 * - no temporal 24H / 7D classification
 * - no source authority calculation
 * - no scoring
 * - no MCI logic
 * - no public transformation
 * ========================================================================== */

import {
  buildSearchRawDocument,
} from "../../acquisition/search-acquisition-core";

import type {
  SearchAcquisitionInput,
} from "../../acquisition/search-acquisition-core";

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import type {
  SearchRuntimeAcquisitionInput,
  SearchRuntimePortResult,
  SearchRuntimePorts,
} from "../../runtime/search-runtime-orchestrator";

/* ============================================================================
 * 1. FINANCIAL NEWS ACQUISITION INPUT
 * ----------------------------------------------------------------------------
 * This is the minimum domain contract accepted from an authorized Financial
 * News acquisition source before canonical SearchRawDocument production.
 *
 * source_type is deliberately narrowed to ARTICLE.
 *
 * acquisition_method and acquisition_module_version are deliberately made
 * mandatory even though the generic SearchAcquisitionInput allows them to be
 * omitted.
 *
 * This preserves explicit Financial News acquisition lineage.
 * ========================================================================== */

export type SearchFinancialNewsAcquisitionInput =
  Readonly<
    Omit<
      SearchAcquisitionInput,
      | "source_type"
      | "acquisition_method"
      | "acquisition_module_version"
    > & {
      readonly source_type:
        "ARTICLE";

      readonly acquisition_method:
        string;

      readonly acquisition_module_version:
        SearchModuleVersion;
    }
  >;

/* ============================================================================
 * 2. AUTHORIZED EXTERNAL SOURCE PORT
 * ----------------------------------------------------------------------------
 * The external source receives the exact canonical runtime acquisition input.
 *
 * It may use:
 * - the canonical SearchQuery;
 * - the explicit runtime execution timestamp;
 *
 * according to its own authorized transport contract.
 *
 * It must return acquisition observations, NOT SearchRawDocument.
 *
 * SearchRawDocument remains exclusively owned by search-acquisition-core.ts.
 * ========================================================================== */

export type SearchFinancialNewsAcquisitionSourcePort =
  (
    input:
      SearchRuntimeAcquisitionInput,
  ) =>
    SearchRuntimePortResult<
      readonly SearchFinancialNewsAcquisitionInput[]
    >;

/* ============================================================================
 * 3. ADAPTER DEPENDENCIES
 * ========================================================================== */

export interface SearchFinancialNewsAcquisitionAdapterDependencies {
  readonly authorized_source:
    SearchFinancialNewsAcquisitionSourcePort;
}

/* ============================================================================
 * 4. CANONICAL DOCUMENT ADAPTATION
 * ----------------------------------------------------------------------------
 * This helper performs exactly one adaptation:
 *
 * SearchFinancialNewsAcquisitionInput
 * -> SearchAcquisitionInput
 * -> canonical buildSearchRawDocument()
 *
 * It performs no validation reconstruction.
 *
 * Rejected canonical inputs remain rejected SearchRawDocument values and are
 * allowed to reach the canonical runtime boundary, where propagation
 * authorization is already enforced.
 * ========================================================================== */

function buildFinancialNewsRawDocument(
  input:
    SearchFinancialNewsAcquisitionInput,
) {
  return buildSearchRawDocument(
    input,
  );
}

/* ============================================================================
 * 5. RUNTIME ACQUISITION ADAPTER
 * ----------------------------------------------------------------------------
 * Produces the exact canonical SearchRuntimePorts["acquire_documents"] port.
 *
 * Important:
 *
 * No try/catch exists here intentionally.
 *
 * A provider failure is not equivalent to:
 * - zero results;
 * - unavailable analytical evidence;
 * - insufficient analytical data.
 *
 * Therefore transport/provider failures propagate unchanged.
 * ========================================================================== */

export function createSearchFinancialNewsAcquisitionAdapter(
  dependencies:
    SearchFinancialNewsAcquisitionAdapterDependencies,
): SearchRuntimePorts["acquire_documents"] {
  const acquireDocuments:
    SearchRuntimePorts["acquire_documents"] =
    async (
      input,
    ) => {
      const acquisitionInputs =
        await dependencies
          .authorized_source(
            input,
          );

      const rawDocuments =
        acquisitionInputs.map(
          (
            acquisitionInput,
          ) =>
            buildFinancialNewsRawDocument(
              acquisitionInput,
            ),
        );

      return Object.freeze([
        ...rawDocuments,
      ]);
    };

  return acquireDocuments;
}
