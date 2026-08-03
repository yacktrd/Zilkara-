/* ============================================================================
 * FILE: lib/xyvala/engine/impulse-market.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical Impulse Layer market orchestrator
 *
 * ROLE
 * - expose the canonical private execution boundary of the Impulse Layer
 * - receive validated upstream RFS, temporal and Triple Layer truths
 * - receive the governed Impulse Layer policy selected upstream
 * - delegate impulse computation exclusively to impulse-state-core.ts
 * - preserve the exact producer vocabulary and nullable availability
 * - expose the exact Impulse Layer result without reconstruction
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - COMPUTE
 * - ORCHESTRATOR
 * - NON-MUTATING
 *
 * OFFICIAL POSITION
 * - RFS
 * - Triple Layer
 * - Impulse Layer
 * - Analytical Aggregation System
 * - MCI
 * - Calibration
 * - Snapshot
 * - Transformers
 * - Rankings
 * - API
 * - Interface
 *
 * PARENTS
 * - lib/xyvala/engine/rfs-market.ts
 * - canonical Triple Layer producer
 * - governed Impulse policy resolver
 *
 * CHILDREN
 * - Analytical Aggregation System
 * - MCI private orchestration
 * - private traceability adapters
 * - private snapshots
 * - authorized calibration observers
 *
 * SOURCE OF TRUTH
 * - impulse-state-core.ts remains the unique producer of impulse truths
 * - this file orchestrates the producer but never duplicates its calculations
 *
 * INPUTS
 * - canonical current structural signature
 * - canonical structural axes
 * - canonical stability and coherence readings
 * - canonical rupture readings
 * - canonical 7D temporal context
 * - canonical 24H temporal context
 * - canonical Triple Layer context
 * - governed Impulse Layer policy
 *
 * OUTPUTS
 * - exact ImpulseStateResult produced by computeImpulseState()
 *
 * DIRECTIVES
 * - COMPUTE only
 * - orchestration only
 * - no local impulse score calculation
 * - no local compression calculation
 * - no local transition-state calculation
 * - no local directional-bias calculation
 * - no local vocabulary conversion
 * - no RFS calculation
 * - no Triple Layer calculation
 * - no Analytical Aggregation calculation
 * - no MCI decision logic
 * - no calibration resolution
 * - no calibration persistence
 * - no threshold creation
 * - no fallback reconstruction
 * - no null replacement
 * - no synthetic neutral value
 * - no snapshot construction
 * - no transformation
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no persistence
 * - no cache mutation
 * - no event publication
 * - no runtime mutation
 * - no console logging
 *
 * INVARIANTS
 * - Impulse Layer remains the unique source of impulse truth
 * - RFS remains the unique source of structural truth
 * - Triple Layer remains the unique source of maturity context
 * - policy remains supplied by its authorized governance boundary
 * - this file never invents an unavailable upstream value
 * - this file never substitutes one layer for another
 * - this file never changes the producer vocabulary
 * - this file never converts UP into POSITIVE
 * - this file never converts DOWN into NEGATIVE
 * - this file never converts unavailable into neutral
 * - identical validated inputs and policy produce identical outputs
 * - undefined is rejected at the orchestration boundary
 * - null remains an explicit business-level unavailability value
 *
 * CONTRACT BEFORE RUNTIME
 * - input and output types are derived directly from computeImpulseState
 * - no parallel local representation of the producer contract is created
 * - contract evolution in impulse-state-core becomes visible at compilation
 *
 * FIRST DIVERGENCE
 * - missing RFS value
 *   => investigate the RFS producer or RFS -> Impulse boundary
 *
 * - missing Triple Layer value
 *   => investigate the Triple Layer producer or Triple Layer -> Impulse boundary
 *
 * - missing governed policy
 *   => investigate the policy resolver or policy -> Impulse boundary
 *
 * - invalid Impulse Layer result
 *   => investigate impulse-state-core.ts
 *
 * - incompatible downstream vocabulary
 *   => investigate the downstream contract migration
 *
 * - public projection inconsistency
 *   => investigate the private snapshot -> transformer boundary
 *
 * SENSITIVE ZONES
 * - producer contract identity
 * - Triple Layer propagation
 * - governed policy propagation
 * - directional-bias vocabulary
 * - transition-state vocabulary
 * - nullable availability
 * - private/public separation
 * ========================================================================== */

import {
  computeImpulseState,
} from "@/lib/xyvala/engine/impulse-state-core";

/* ============================================================================
 * 1. CANONICAL PRODUCER-DERIVED TYPES
 * ----------------------------------------------------------------------------
 * The orchestration boundary derives its types directly from the unique
 * Impulse Layer producer.
 *
 * This prevents:
 * - parallel contracts
 * - silent producer/orchestrator drift
 * - duplicated vocabularies
 * - local reinterpretation of producer fields
 * ========================================================================== */

export type ImpulseMarketInput =
  Parameters<
    typeof computeImpulseState
  >[0];

export type ImpulseMarketResult =
  ReturnType<
    typeof computeImpulseState
  >;

/* ============================================================================
 * 2. CONTRACT VERSION
 * ----------------------------------------------------------------------------
 * This version identifies the orchestration boundary.
 *
 * It does not replace the version of:
 * - impulse-state-core
 * - RFS contracts
 * - Triple Layer contracts
 * - policy contracts
 * ========================================================================== */

export const IMPULSE_MARKET_VERSION =
  "impulse-market-v1" as const;

export type ImpulseMarketVersion =
  typeof IMPULSE_MARKET_VERSION;

/* ============================================================================
 * 3. EXECUTION RESULT
 * ----------------------------------------------------------------------------
 * The successful analytical result remains exactly the result produced by
 * impulse-state-core.ts.
 *
 * No wrapper containing public wording, decisions or reconstructed values is
 * introduced around the analytical truth.
 * ========================================================================== */

export type RunImpulseMarketResult =
  ImpulseMarketResult;

/* ============================================================================
 * 4. SAFE PRIMITIVE HELPERS
 * ----------------------------------------------------------------------------
 * Helpers validate boundary shape only.
 *
 * They do not:
 * - validate analytical meaning
 * - infer missing states
 * - calculate scores
 * - normalize producer output
 * ========================================================================== */

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOwn(
  value: Record<string, unknown>,
  property: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    property,
  );
}

/* ============================================================================
 * 5. TOP-LEVEL INPUT BOUNDARY VALIDATION
 * ----------------------------------------------------------------------------
 * This validation protects the orchestration boundary against undefined or
 * structurally incomplete runtime calls.
 *
 * IMPORTANT
 * - null may remain a legitimate analytical unavailability value inside
 *   governed nested contracts
 * - undefined at a required top-level boundary is rejected
 * - nested analytical validation remains owned by the producing contracts and
 *   their dedicated validators
 * ========================================================================== */

const REQUIRED_INPUT_PROPERTIES =
  Object.freeze([
    "current_signature",
    "occurrence_score",
    "frequency_score",
    "convergence_score",
    "correlation_score",
    "duration_score",
    "rupture_probability",
    "rupture_penalty_score",
    "stability_score",
    "coherence_score",
    "rolling_7d",
    "rolling_24h",
    "triple_layer",
    "policy",
  ] as const);

type RequiredImpulseMarketInputProperty =
  (typeof REQUIRED_INPUT_PROPERTIES)[number];

function assertImpulseMarketInputBoundary(
  value: unknown,
): asserts value is ImpulseMarketInput {
  if (!isRecord(value)) {
    throw new Error(
      "impulse_market_invalid_input_root",
    );
  }

  for (
    const property of
    REQUIRED_INPUT_PROPERTIES
  ) {
    if (!hasOwn(value, property)) {
      throw new Error(
        `impulse_market_missing_input:${property}`,
      );
    }

    if (value[property] === undefined) {
      throw new Error(
        `impulse_market_undefined_input:${property}`,
      );
    }
  }
}

/* ============================================================================
 * 6. PRODUCER OUTPUT BOUNDARY VALIDATION
 * ----------------------------------------------------------------------------
 * This check confirms that the producer returned a runtime object.
 *
 * It deliberately does not:
 * - repair output
 * - insert defaults
 * - convert vocabularies
 * - validate a separate duplicate result schema
 *
 * Detailed analytical validation belongs to the canonical Impulse contract
 * validator once the producer vocabulary and transport contract migration are
 * fully aligned.
 * ========================================================================== */

function assertImpulseMarketResultBoundary(
  value: unknown,
): asserts value is ImpulseMarketResult {
  if (!isRecord(value)) {
    throw new Error(
      "impulse_market_invalid_result_root",
    );
  }
}

/* ============================================================================
 * 7. CANONICAL IMPULSE EXECUTION
 * ----------------------------------------------------------------------------
 * This is the unique market-level execution boundary for the Impulse Layer.
 *
 * EXECUTION
 * - validate orchestration boundary presence
 * - delegate once to computeImpulseState()
 * - validate producer root
 * - return the exact producer result
 *
 * DETERMINISM
 * - no local clock
 * - no random source
 * - no environment read
 * - no persistence read
 * - no cache read
 * - no hidden policy selection
 * - no second analytical pass
 *
 * PROPAGATION
 * - input truths are consumed without replacement
 * - producer output is returned without reconstruction
 * ========================================================================== */

export function runImpulseMarket(
  input: ImpulseMarketInput,
): RunImpulseMarketResult {
  assertImpulseMarketInputBoundary(
    input,
  );

  const result =
    computeImpulseState(
      input,
    );

  assertImpulseMarketResultBoundary(
    result,
  );

  return result;
}

/* ============================================================================
 * 8. EXPLICIT COMPATIBILITY ALIAS
 * ----------------------------------------------------------------------------
 * The alias preserves a single execution implementation.
 *
 * It does not create:
 * - another engine
 * - another computation path
 * - another contract
 * - another source of truth
 * ========================================================================== */

export const runImpulseLayerMarket =
  runImpulseMarket;

/* ============================================================================
 * 9. ORCHESTRATION METADATA
 * ----------------------------------------------------------------------------
 * Immutable descriptive metadata only.
 *
 * This metadata:
 * - does not influence computation
 * - does not select policy
 * - does not expose analytical values
 * - does not mutate runtime
 * ========================================================================== */

export const IMPULSE_MARKET_METADATA =
  Object.freeze({
    version:
      IMPULSE_MARKET_VERSION,

    classification:
      "COMPUTE",

    source_layer:
      "IMPULSE_LAYER",

    producer:
      "impulse-state-core",

    reconstruction_allowed:
      false,

    mutation_allowed:
      false,

    public_exposure_allowed:
      false,
  } as const);

/* ============================================================================
 * 10. TYPE-LEVEL CONTRACT ASSERTIONS
 * ----------------------------------------------------------------------------
 * These assertions make required producer-input evolution visible during
 * TypeScript validation.
 *
 * They create no runtime behavior.
 * ========================================================================== */

type MissingRequiredInputProperty =
  Exclude<
    RequiredImpulseMarketInputProperty,
    keyof ImpulseMarketInput
  >;

export type ImpulseMarketRequiredInputContractIsComplete =
  MissingRequiredInputProperty extends never
    ? true
    : false;

type UnknownDeclaredRequiredProperty =
  Exclude<
    RequiredImpulseMarketInputProperty,
    keyof ImpulseMarketInput
  >;

export type ImpulseMarketRequiredInputContractHasNoUnknownProperty =
  UnknownDeclaredRequiredProperty extends never
    ? true
    : false;
