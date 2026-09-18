/* ============================================================================
 * FILE: lib/xyvala/search/governance/search-execution-traceability-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical execution traceability core
 *
 * ROLE
 * - observe explicit Search execution facts
 * - validate execution-trace observation boundaries
 * - produce the canonical deterministic SearchTraceId
 * - materialize canonical SearchTraceRecord truth
 * - preserve explicit execution provenance
 * - preserve optional evidence exactly
 * - preserve missing-data truth exactly
 * - preserve explicit contract / policy / corpus references
 * - provide deterministic collection materialization without reconstructing
 *   execution history
 *
 * CLASSIFICATION
 * - SEARCH GOVERNANCE
 * - EXECUTION TRACEABILITY
 * - CANONICAL TRACE PRODUCER
 * - OBSERVE
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
 * actual Search producer execution
 *            ↓
 * explicit execution observation
 *            ↓
 * SEARCH EXECUTION TRACEABILITY
 *            ↓
 * SearchTraceRecord
 *            ↓
 * trace collection
 *            ↓
 * resolve_snapshot_traceability
 *            ↓
 * PRIVATE_SNAPSHOT
 *
 * IN PARALLEL
 * ----------------------------------------------------------------------------
 *
 * VARIABLE_LINEAGE_GOVERNANCE
 *            ↓
 * materializeSearchPrivateSnapshotVariableLineage(...)
 *            ↓
 * SearchVariableLineage[]
 *            ↓
 * resolve_snapshot_traceability
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 *
 * SearchTraceRecord
 * <- EXECUTION_TRACEABILITY
 *
 * SearchTraceId
 * <- EXECUTION_TRACEABILITY
 *
 * SearchVariableLineage
 * <- VARIABLE_LINEAGE_GOVERNANCE
 *
 * Private Snapshot
 * <- PRIVATE_SNAPSHOT
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This producer does NOT reconstruct execution history.
 *
 * It only accepts facts explicitly observed at the execution boundary.
 *
 * It is forbidden to infer:
 * - module_name from output shape;
 * - module_version from VLR after execution;
 * - method from producer naming;
 * - execution_nature from SearchPipelineLayer;
 * - input_contracts from downstream objects;
 * - output_contract from snapshot contents;
 * - confidence from final scores;
 * - missing_data from unavailable downstream values;
 * - policy_version from current configuration;
 * - corpus_version from current corpus state;
 * - duration_ms from a later clock read.
 *
 * If any required execution fact was not observed when the execution occurred,
 * this producer must reject the incomplete observation.
 *
 * It must never repair it from downstream state.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * SearchTraceRecord already exists in the canonical Search pipeline contract.
 *
 * SearchTraceId already exists as a canonical trace identity.
 *
 * Both are already governed by EXECUTION_TRACEABILITY.
 *
 * The observation input declared in this module is NOT a second canonical
 * trace truth.
 *
 * It is a producer-boundary input derived directly from SearchTraceRecord,
 * excluding only:
 *
 * - contract_version
 * - trace_id
 *
 * contract_version belongs to the canonical Search contract.
 * trace_id belongs to this producer.
 *
 * DIRECTIVES
 * - observation only
 * - explicit execution facts only
 * - deterministic trace identity
 * - no local clock
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no random value
 * - no process-local sequence
 * - no database identity
 * - no runtime-state reconstruction
 * - no snapshot reconstruction
 * - no VLR reconstruction
 * - no analytical calculation
 * - no score calculation
 * - no policy resolution
 * - no policy fallback
 * - no corpus resolution
 * - no confidence reconstruction
 * - no missing-data reconstruction
 * - no validation-state reconstruction
 * - no output-contract inference
 * - no input-contract inference
 * - no method inference
 * - no module inference
 * - no execution-nature inference
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no persistence
 * - no logging
 * - no network access
 * - no file-system access
 *
 * TRACE IDENTITY SEMANTICS
 * ----------------------------------------------------------------------------
 * SearchTraceId identifies the exact canonical execution observation.
 *
 * Its identity is derived from:
 *
 * canonical Search contract version
 * + explicit created_at
 * + optional document/query/cohort identities
 * + execution layer
 * + module identity/version
 * + execution nature
 * + method
 * + explicit parameters
 * + input contracts
 * + output contract
 * + validation state
 * + explicit missing data
 * + explicit confidence evidence
 * + optional corpus version
 * + optional policy version
 * + optional duration
 *
 * Same exact canonical observation
 * -> same SearchTraceId
 *
 * Any observed execution-truth difference
 * -> different SearchTraceId
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This does not guarantee that two physically repeated but completely
 * indistinguishable observations receive different IDs.
 *
 * SearchTraceId identifies canonical observation identity, not an invented
 * runtime sequence number.
 *
 * If physical execution-instance distinction is ever required beyond the
 * current SearchTraceRecord contract, it must first be added contractually.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * missing explicit module_name
 * => execution-observation boundary
 *
 * missing explicit module_version
 * => execution-observation boundary
 *
 * missing method
 * => execution-observation boundary
 *
 * missing input/output contract reference
 * => execution-observation boundary
 *
 * confidence reconstructed from score
 * => EXECUTION_TRACEABILITY ownership violation
 *
 * missing_data reconstructed from snapshot
 * => downstream reconstruction violation
 *
 * policy_version resolved after execution
 * => policy-provenance violation
 *
 * duration calculated from a later clock
 * => execution-timing provenance violation
 *
 * RuntimeTraceEvent transformed into SearchTraceRecord by inventing fields
 * => downstream reconstruction violation
 *
 * trace generated from Private Snapshot
 * => downstream reconstruction violation
 *
 * INVARIANTS
 * ----------------------------------------------------------------------------
 * - SearchTraceRecord has exactly one canonical producer domain
 * - SearchTraceId is deterministic
 * - created_at is explicit
 * - no runtime clock is read
 * - no randomness is used
 * - observation facts are preserved
 * - optional fields are never fabricated
 * - confidence availability semantics are preserved
 * - missing_data is preserved
 * - input contract references are preserved
 * - output contract reference is preserved
 * - execution order supplied to collection materialization is preserved
 * - collection materialization does not sort or deduplicate traces
 * - traceability does not create analytical truth
 * - traceability does not create variable-lineage truth
 * ========================================================================== */

import {
  createHash,
} from "node:crypto";

import {
  XYVALA_SEARCH_PIPELINE_CONTRACT,
} from "../contracts/search-pipeline-contract";

import type {
  SearchTraceRecord,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME =
  "xyvala-search-execution-traceability-core" as const;

export const XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_VERSION:
  SearchTraceRecord["module_version"] =
    "1.0.0";

/**
 * Version of the deterministic SearchTraceId materialization algorithm.
 *
 * It is deliberately distinct from:
 * - Search contract version;
 * - traced producer module version;
 * - policy version;
 * - corpus version.
 *
 * A refactor of this file that leaves identity semantics unchanged does not
 * need to alter trace identity.
 */
export const XYVALA_SEARCH_EXECUTION_TRACE_IDENTITY_ALGORITHM_VERSION =
  "1" as const;

const XYVALA_SEARCH_EXECUTION_TRACE_IDENTITY_NAMESPACE =
  "xyvala-search-execution-trace" as const;

/* ============================================================================
 * 2. EXECUTION OBSERVATION INPUT
 * ----------------------------------------------------------------------------
 * Producer-boundary observation contract.
 *
 * It is structurally derived from canonical SearchTraceRecord.
 *
 * It deliberately excludes:
 *
 * contract_version
 * <- canonical Search contract
 *
 * trace_id
 * <- EXECUTION_TRACEABILITY
 *
 * No second trace schema is created here.
 * ========================================================================== */

export type SearchExecutionTraceObservationInput =
  Readonly<
    Omit<
      SearchTraceRecord,
      | "contract_version"
      | "trace_id"
    >
  >;

/* ============================================================================
 * 3. DERIVED CANONICAL TYPES
 * ----------------------------------------------------------------------------
 * Local aliases are always derived from SearchTraceRecord.
 *
 * No parallel primitive identities are declared.
 * ========================================================================== */

export type SearchCanonicalTraceId =
  SearchTraceRecord["trace_id"];

type SearchExecutionTraceCreatedAt =
  SearchTraceRecord["created_at"];

type SearchExecutionTraceParameters =
  SearchTraceRecord["parameters"];

type SearchExecutionTraceConfidence =
  SearchTraceRecord["confidence"];

/* ============================================================================
 * 4. SAFE RECORD GUARD
 * ========================================================================== */

function isRecord(
  value:
    unknown,
): value is Readonly<
  Record<string, unknown>
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

/* ============================================================================
 * 5. NON-EMPTY STRING ASSERTION
 * ----------------------------------------------------------------------------
 * Validation never normalizes canonical values.
 *
 * trim() is used only to detect an empty/whitespace-only value.
 *
 * The original value is always preserved.
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
      `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
        `Execution trace observation violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 6. OPTIONAL NON-EMPTY STRING ASSERTION
 * ========================================================================== */

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
 * 7. EXPLICIT TIMESTAMP ASSERTION
 * ----------------------------------------------------------------------------
 * No timestamp is produced or normalized here.
 *
 * Date.parse is used only as a boundary validation predicate.
 * ========================================================================== */

function assertValidExplicitTimestamp(
  value:
    SearchExecutionTraceCreatedAt,

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
      `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
        `Execution trace observation violation: ${fieldName} must contain a valid explicit timestamp.`,
    );
  }
}

/* ============================================================================
 * 8. STRING COLLECTION ASSERTION
 * ----------------------------------------------------------------------------
 * Collection order is preserved.
 *
 * No sorting.
 * No deduplication.
 *
 * If execution observation provided duplicate contract/missing-data references,
 * they remain measurable rather than being silently repaired here.
 * ========================================================================== */

function assertStringCollection(
  values:
    readonly string[],

  fieldName:
    string,
): void {
  if (
    !Array.isArray(
      values,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
        `Execution trace observation violation: ${fieldName} must be an array.`,
    );
  }

  for (
    let index = 0;
    index <
    values.length;
    index += 1
  ) {
    const value =
      values[index];

    if (
      value ===
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
          `Execution trace observation violation: ${fieldName}[${String(index)}] is missing.`,
      );
    }

    assertNonEmptyString(
      value,
      `${fieldName}[${String(index)}]`,
    );
  }
}

/* ============================================================================
 * 9. DURATION ASSERTION
 * ----------------------------------------------------------------------------
 * Duration is an observed execution fact.
 *
 * It is never calculated here.
 * ========================================================================== */

function assertOptionalDuration(
  value:
    SearchTraceRecord["duration_ms"],
): void {
  if (
    value ===
    undefined
  ) {
    return;
  }

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    ) ||
    value <
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
        "Execution trace observation violation: duration_ms must be a finite non-negative observed duration.",
    );
  }
}

/* ============================================================================
 * 10. DETERMINISTIC VALUE SERIALIZATION
 * ----------------------------------------------------------------------------
 * SearchTraceId requires deterministic compaction of the explicit observation.
 *
 * Arbitrary JavaScript object insertion order must not alter trace identity.
 *
 * Object keys are therefore ordered for ID materialization only.
 *
 * Array order remains significant and is preserved.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * The original observed values are NOT normalized or mutated.
 *
 * This serializer is used only to build SearchTraceId.
 *
 * Unsupported non-deterministic / non-portable JavaScript values are rejected.
 *
 * No coercion or fallback is performed.
 * ========================================================================== */

function serializeDeterministicValue(
  value:
    unknown,

  fieldPath:
    string,

  seen:
    Set<object>,
): string {
  if (
    value ===
    null
  ) {
    return "null";
  }

  switch (
    typeof value
  ) {
    case "string":
      return JSON.stringify(
        value,
      );

    case "boolean":
      return value
        ? "true"
        : "false";

    case "number":
      if (
        !Number.isFinite(
          value,
        )
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
            `Trace identity violation: ${fieldPath} contains a non-finite number.`,
        );
      }

      return JSON.stringify(
        value,
      );

    case "undefined":
      throw new Error(
        `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
          `Trace identity violation: ${fieldPath} contains undefined.`,
      );

    case "bigint":
    case "symbol":
    case "function":
      throw new Error(
        `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
          `Trace identity violation: ${fieldPath} contains a non-deterministically serializable value.`,
      );

    case "object":
      break;

    default:
      throw new Error(
        `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
          `Trace identity violation: ${fieldPath} contains an unsupported value.`,
      );
  }

  const objectValue =
    value as object;

  if (
    seen.has(
      objectValue,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
        `Trace identity violation: ${fieldPath} contains a circular reference.`,
    );
  }

  seen.add(
    objectValue,
  );

  try {
    if (
      Array.isArray(
        value,
      )
    ) {
      const serializedItems =
        value.map(
          (
            item,
            index,
          ) =>
            serializeDeterministicValue(
              item,
              `${fieldPath}[${String(index)}]`,
              seen,
            ),
        );

      return (
        "[" +
        serializedItems.join(
          ",",
        ) +
        "]"
      );
    }

    if (
      !isRecord(
        value,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
          `Trace identity violation: ${fieldPath} must contain only plain record/array parameter structures.`,
      );
    }

    const keys =
      Object.keys(
        value,
      ).sort();

    const serializedEntries =
      keys.map(
        (
          key,
        ) => {
          const childValue =
            value[key];

          const serializedKey =
            JSON.stringify(
              key,
            );

          const serializedValue =
            serializeDeterministicValue(
              childValue,
              `${fieldPath}.${key}`,
              seen,
            );

          return (
            serializedKey +
            ":" +
            serializedValue
          );
        },
      );

    return (
      "{" +
      serializedEntries.join(
        ",",
      ) +
      "}"
    );
  } finally {
    seen.delete(
      objectValue,
    );
  }
}

/* ============================================================================
 * 11. TRACE PARAMETERS VALIDATION
 * ----------------------------------------------------------------------------
 * Parameters are explicit execution-observation metadata.
 *
 * They are not inspected analytically.
 *
 * Deterministic serializability is required because they participate in
 * SearchTraceId.
 * ========================================================================== */

function validateTraceParameters(
  parameters:
    SearchExecutionTraceParameters,
): void {
  if (
    !isRecord(
      parameters,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
        "Execution trace observation violation: parameters must be a record.",
    );
  }

  serializeDeterministicValue(
    parameters,
    "parameters",
    new Set<object>(),
  );
}

/* ============================================================================
 * 12. CONFIDENCE EVIDENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Confidence belongs to the observed execution.
 *
 * This producer neither calculates nor repairs it.
 *
 * The canonical SearchOptionalEvidence structure is preserved exactly.
 *
 * Deterministic serializability is verified because confidence participates in
 * SearchTraceId.
 * ========================================================================== */

function validateTraceConfidence(
  confidence:
    SearchExecutionTraceConfidence,
): void {
  if (
    !isRecord(
      confidence,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_EXECUTION_TRACEABILITY_MODULE_NAME}] ` +
        "Execution trace observation violation: confidence must use canonical SearchOptionalEvidence structure.",
    );
  }

  serializeDeterministicValue(
    confidence,
    "confidence",
    new Set<object>(),
  );
}

/* ============================================================================
 * 13. COMPLETE OBSERVATION VALIDATION
 * ----------------------------------------------------------------------------
 * Only execution-trace observation truth is validated here.
 *
 * This module does NOT revalidate:
 * - analytical producer output;
 * - SearchQuery;
 * - SearchCohortDefinition;
 * - SearchCohortDistribution;
 * - SearchPrivateDocumentSnapshot;
 * - SearchVariableLineage.
 * ========================================================================== */

function validateSearchExecutionTraceObservation(
  input:
    SearchExecutionTraceObservationInput,
): void {
  assertValidExplicitTimestamp(
    input.created_at,
    "created_at",
  );

  assertOptionalNonEmptyString(
    input.document_id,
    "document_id",
  );

  assertOptionalNonEmptyString(
    input.query_id,
    "query_id",
  );

  assertOptionalNonEmptyString(
    input.cohort_id,
    "cohort_id",
  );

  assertNonEmptyString(
    input.layer,
    "layer",
  );

  assertNonEmptyString(
    input.module_name,
    "module_name",
  );

  assertNonEmptyString(
    input.module_version,
    "module_version",
  );

  assertNonEmptyString(
    input.execution_nature,
    "execution_nature",
  );

  assertNonEmptyString(
    input.method,
    "method",
  );

  validateTraceParameters(
    input.parameters,
  );

  assertStringCollection(
    input.input_contracts,
    "input_contracts",
  );

  assertNonEmptyString(
    input.output_contract,
    "output_contract",
  );

  assertNonEmptyString(
    input.validation_state,
    "validation_state",
  );

  assertStringCollection(
    input.missing_data,
    "missing_data",
  );

  validateTraceConfidence(
    input.confidence,
  );

  assertOptionalNonEmptyString(
    input.corpus_version,
    "corpus_version",
  );

  assertOptionalNonEmptyString(
    input.policy_version,
    "policy_version",
  );

  assertOptionalDuration(
    input.duration_ms,
  );
}

/* ============================================================================
 * 14. TRACE IDENTITY PAYLOAD
 * ----------------------------------------------------------------------------
 * Identity includes every canonical execution fact represented by the current
 * SearchTraceRecord contract.
 *
 * Optional fields use explicit null in the identity payload only.
 *
 * This makes absence itself deterministic without forging an output value.
 *
 * Output optional properties remain absent when unavailable.
 * ========================================================================== */

function buildSearchExecutionTraceIdentityPayload(
  input:
    SearchExecutionTraceObservationInput,
): string {
  const identityEnvelope =
    Object.freeze({
      namespace:
        XYVALA_SEARCH_EXECUTION_TRACE_IDENTITY_NAMESPACE,

      algorithm_version:
        XYVALA_SEARCH_EXECUTION_TRACE_IDENTITY_ALGORITHM_VERSION,

      contract_version:
        XYVALA_SEARCH_PIPELINE_CONTRACT
          .contract_version,

      created_at:
        input.created_at,

      document_id:
        input.document_id ??
        null,

      query_id:
        input.query_id ??
        null,

      cohort_id:
        input.cohort_id ??
        null,

      layer:
        input.layer,

      module_name:
        input.module_name,

      module_version:
        input.module_version,

      execution_nature:
        input.execution_nature,

      method:
        input.method,

      parameters:
        input.parameters,

      input_contracts:
        input.input_contracts,

      output_contract:
        input.output_contract,

      validation_state:
        input.validation_state,

      missing_data:
        input.missing_data,

      confidence:
        input.confidence,

      corpus_version:
        input.corpus_version ??
        null,

      policy_version:
        input.policy_version ??
        null,

      duration_ms:
        input.duration_ms ??
        null,
    });

  return serializeDeterministicValue(
    identityEnvelope,
    "trace_identity",
    new Set<object>(),
  );
}

/* ============================================================================
 * 15. DETERMINISTIC TRACE DIGEST
 * ----------------------------------------------------------------------------
 * SHA-256 is used only for deterministic identity compaction.
 *
 * It is NOT:
 * - an analytical score;
 * - random identity generation;
 * - authorization;
 * - content hashing ownership;
 * - runtime sequencing.
 * ========================================================================== */

function computeSearchExecutionTraceDigest(
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
 * 16. CANONICAL TRACE ID PRODUCER
 * ========================================================================== */

export function buildSearchTraceId(
  input:
    SearchExecutionTraceObservationInput,
): SearchCanonicalTraceId {
  validateSearchExecutionTraceObservation(
    input,
  );

  const canonicalPayload =
    buildSearchExecutionTraceIdentityPayload(
      input,
    );

  const digest =
    computeSearchExecutionTraceDigest(
      canonicalPayload,
    );

  return (
    `${XYVALA_SEARCH_EXECUTION_TRACE_IDENTITY_NAMESPACE}` +
    `:v${XYVALA_SEARCH_EXECUTION_TRACE_IDENTITY_ALGORITHM_VERSION}` +
    `:${digest}`
  );
}

/* ============================================================================
 * 17. CANONICAL SearchTraceRecord PRODUCER
 * ----------------------------------------------------------------------------
 * OFFICIAL EXECUTION
 *
 * explicit execution observation
 *        ↓
 * validation
 *        ↓
 * deterministic SearchTraceId
 *        ↓
 * SearchTraceRecord
 *
 * No execution field is inferred.
 * ========================================================================== */

export function buildSearchExecutionTraceRecord(
  input:
    SearchExecutionTraceObservationInput,
): SearchTraceRecord {
  validateSearchExecutionTraceObservation(
    input,
  );

  const traceId =
    buildSearchTraceId(
      input,
    );

  const traceRecord = {
    contract_version:
      XYVALA_SEARCH_PIPELINE_CONTRACT
        .contract_version,

    created_at:
      input.created_at,

    trace_id:
      traceId,

    ...(
      input.document_id !==
      undefined
        ? {
            document_id:
              input.document_id,
          }
        : {}
    ),

    ...(
      input.query_id !==
      undefined
        ? {
            query_id:
              input.query_id,
          }
        : {}
    ),

    ...(
      input.cohort_id !==
      undefined
        ? {
            cohort_id:
              input.cohort_id,
          }
        : {}
    ),

    layer:
      input.layer,

    module_name:
      input.module_name,

    module_version:
      input.module_version,

    execution_nature:
      input.execution_nature,

    method:
      input.method,

    parameters:
      Object.freeze({
        ...input.parameters,
      }),

    input_contracts:
      Object.freeze([
        ...input.input_contracts,
      ]),

    output_contract:
      input.output_contract,

    validation_state:
      input.validation_state,

    missing_data:
      Object.freeze([
        ...input.missing_data,
      ]),

    confidence:
      input.confidence,

    ...(
      input.corpus_version !==
      undefined
        ? {
            corpus_version:
              input.corpus_version,
          }
        : {}
    ),

    ...(
      input.policy_version !==
      undefined
        ? {
            policy_version:
              input.policy_version,
          }
        : {}
    ),

    ...(
      input.duration_ms !==
      undefined
        ? {
            duration_ms:
              input.duration_ms,
          }
        : {}
    ),
  } satisfies SearchTraceRecord;

  return Object.freeze(
    traceRecord,
  );
}

/* ============================================================================
 * 18. CANONICAL TRACE COLLECTION MATERIALIZATION
 * ----------------------------------------------------------------------------
 * Input order is preserved exactly.
 *
 * This producer does NOT:
 * - sort;
 * - deduplicate;
 * - merge;
 * - resolve conflicts;
 * - infer execution chronology.
 *
 * Runtime execution order must already be explicit upstream.
 * ========================================================================== */

export function buildSearchExecutionTraceRecords(
  inputs:
    readonly SearchExecutionTraceObservationInput[],
): readonly SearchTraceRecord[] {
  const traces:
    SearchTraceRecord[] =
      [];

  for (
    const input of
    inputs
  ) {
    traces.push(
      buildSearchExecutionTraceRecord(
        input,
      ),
    );
  }

  return Object.freeze(
    traces,
  );
}

/* ============================================================================
 * 19. OWNERSHIP DECLARATION
 * ----------------------------------------------------------------------------
 * Static governance metadata only.
 * ========================================================================== */

export const XYVALA_SEARCH_EXECUTION_TRACEABILITY_OWNERSHIP =
  Object.freeze({
    canonical_owner:
      "EXECUTION_TRACEABILITY",

    canonical_trace_truth:
      "SearchTraceRecord",

    canonical_trace_identity:
      "SearchTraceId",

    canonical_producer:
      "search-execution-traceability-core.ts",

    trace_record_producer_function:
      "buildSearchExecutionTraceRecord",

    trace_collection_producer_function:
      "buildSearchExecutionTraceRecords",

    trace_id_producer_function:
      "buildSearchTraceId",

    runtime_transport_boundary:
      "resolve_snapshot_traceability",

    downstream_consumer:
      "PRIVATE_SNAPSHOT",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    private_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    analytical_owner:
      false,

    policy_owner:
      false,

    corpus_owner:
      false,

    confidence_owner:
      false,
  } as const);

/* ============================================================================
 * 20. GOVERNANCE DECLARATION
 * ----------------------------------------------------------------------------
 * Architecture / audit metadata only.
 * ========================================================================== */

export const XYVALA_SEARCH_EXECUTION_TRACEABILITY_GOVERNANCE =
  Object.freeze({
    execution_traceability:
      true,

    observe_only:
      true,

    analytical_owner:
      false,

    deterministic:
      true,

    canonical_trace_producer:
      true,

    canonical_trace_id_producer:
      true,

    explicit_execution_observation_required:
      true,

    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    runtime_clock_access_allowed:
      false,

    random_identity_allowed:
      false,

    runtime_sequence_fabrication_allowed:
      false,

    execution_history_reconstruction_allowed:
      false,

    snapshot_reconstruction_allowed:
      false,

    variable_lineage_production_allowed:
      false,

    analytical_calculation_allowed:
      false,

    score_calculation_allowed:
      false,

    policy_resolution_allowed:
      false,

    corpus_resolution_allowed:
      false,

    confidence_reconstruction_allowed:
      false,

    missing_data_reconstruction_allowed:
      false,

    validation_reconstruction_allowed:
      false,

    method_inference_allowed:
      false,

    module_inference_allowed:
      false,

    input_contract_inference_allowed:
      false,

    output_contract_inference_allowed:
      false,

    execution_nature_inference_allowed:
      false,

    collection_sorting_allowed:
      false,

    collection_deduplication_allowed:
      false,

    unavailable_to_zero_allowed:
      false,

    unavailable_to_neutral_allowed:
      false,

    persistence_allowed:
      false,

    network_access_allowed:
      false,

    canonical_owner:
      "EXECUTION_TRACEABILITY",

    downstream_transport_boundary:
      "resolve_snapshot_traceability",

    prohibited_shortcuts:
      Object.freeze([
        "trace_from_private_snapshot",
        "trace_from_final_analytical_state",
        "trace_from_runtime_trace_event_field_invention",

        "reconstructed_module_name",
        "reconstructed_module_version",
        "reconstructed_method",
        "reconstructed_execution_nature",

        "reconstructed_input_contracts",
        "reconstructed_output_contract",

        "reconstructed_missing_data",
        "reconstructed_confidence",

        "resolved_policy_after_execution",
        "resolved_corpus_after_execution",

        "duration_from_later_runtime_clock",
        "implicit_trace_created_at",

        "random_trace_id",
        "process_counter_trace_id",
        "database_generated_trace_id",

        "sorted_execution_history",
        "deduplicated_execution_history",

        "execution_trace_generated_by_private_snapshot",
        "execution_trace_generated_by_runtime_orchestrator",

        "variable_lineage_generated_by_execution_traceability",

        "unavailable_to_zero",
        "unavailable_to_neutral",
      ] as const),
  } as const);
