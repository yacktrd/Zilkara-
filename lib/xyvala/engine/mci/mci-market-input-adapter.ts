/* ============================================================================

 * FILE: lib/xyvala/engine/mci/mci-market-input-adapter.ts

 * ----------------------------------------------------------------------------

 * TITLE

 * - Xyvala canonical private MCI Market input adapter

 *

 * ROLE

 * - validate private MCI execution metadata

 * - consume the canonical RFS result

 * - project canonical RFS structural truth into MCI structural context

 * - project canonical RFS rupture-evolution truth into MCI rupture context

 * - receive already-produced independent upstream analytical contexts

 * - receive the canonical Analytical Aggregation producer result

 * - validate canonical Analytical Aggregation identity and contract

 * - transport AnalyticalAggregationMarketResult without semantic copy

 * - materialize explicit unavailable contexts only for independent optional

 *   upstream contexts whose absence is contractually allowed

 * - build the unique canonical RunMciMarketInput contract

 * - report the first invalid adaptation boundary

 *

 * CLASSIFICATION

 * - PRIVATE ADAPTER

 * - READ / VALIDATE / PROJECT / TRANSPORT

 * - NON-COMPUTE

 * - NON-MUTATING

 * - NON-PUBLIC

 *

 * POSITION IN OFFICIAL ARCHITECTURE

 * - Acquisition

 * - RFS

 *   - Structural Axes

 *   - Stability

 *   - Regime

 *   - Rupture

 *   - Rupture Evolution

 * - Triple Layer

 * - Impulse Layer

 * - Neutralization System

 * - Crash System

 * - Analytical Aggregation System

 * - Comparable Historical Occurrences

 * - MCI Input Adaptation

 * - MCI Scoring

 * - MCI Constraints

 * - MCI Decision

 *

 * PARENTS

 * - lib/xyvala/rfs/contracts/rfs-score-contract.ts

 * - lib/xyvala/rfs/validation/rfs-score-contract-validator.ts

 * - lib/xyvala/engine/analytical-aggregation-market-core.ts

 * - lib/xyvala/engine/mci/mci-market-types.ts

 * - canonical Triple Layer producer

 * - canonical Impulse Layer producer

 * - canonical Crash System producer

 * - canonical Neutralization producer

 * - canonical Temporal Context producer

 * - canonical comparable-occurrence producer

 * - private orchestration owner

 *

 * CONSUMERS

 * - lib/xyvala/services/raw-assets-service.ts

 * - lib/xyvala/services/traceability-debug-service.ts

 * - lib/xyvala/engine/mci-market.ts

 * - private MCI orchestrators

 * - private MCI tests

 *

 * DIRECTIVES

 * - private MCI input adaptation only

 * - canonical RFS contract only

 * - canonical Analytical Aggregation contract only

 * - no legacy RfsMarketResult dependency

 * - no legacy RFS status translation

 * - no provider parsing

 * - no raw price reading

 * - no raw market-cap reading

 * - no raw volume reading

 * - no raw sparkline reading

 * - no RFS recomputation

 * - no RFS semantic reconstruction

 * - no Triple Layer recomputation

 * - no Impulse Layer recomputation

 * - no Rupture Evolution recomputation

 * - no Crash System recomputation

 * - no Neutralization recomputation

 * - no temporal computation

 * - no Analytical Aggregation computation

 * - no Analytical Aggregation context reconstruction

 * - no Analytical Aggregation mirror contract

 * - no Analytical Aggregation status translation

 * - no Analytical Aggregation unavailable factory

 * - no historical comparison computation

 * - no MCI scoring

 * - no MCI decision

 * - no calibration

 * - no logging

 * - no persistence

 * - no public projection

 * - no UI logic

 * - no API logic

 * - no local clock access

 * - no timestamp generation

 * - no synthetic analytical version

 * - no synthetic context version

 * - no unavailable-to-zero conversion

 * - no unavailable-to-neutral conversion

 * - no invalid-to-unavailable conversion for a supplied canonical producer

 * - no semantic alias reconstruction

 * - no cross-layer analytical replacement

 * - null means explicitly unavailable where the canonical contract permits it

 * - undefined must never cross the adapter boundary

 *

 * OWNERSHIP

 * - structural truth

 *   <- canonical RFS

 *

 * - rupture evolution truth

 *   <- canonical RFS

 * - rupture evolution validation semantics

 *   <- canonical RFS shared validator

 *

 * - Triple Layer truth

 *   <- supplied Triple Layer context

 *

 * - Impulse truth

 *   <- supplied Impulse Layer context

 *

 * - Crash truth

 *   <- supplied Crash System context

 *

 * - Neutralization truth

 *   <- supplied Neutralization context

 *

 * - temporal truth

 *   <- supplied Temporal Context

 *

 * - Analytical Aggregation truth

 *   <- canonical Analytical Aggregation producer

 *

 * - Analytical Aggregation transport

 *   <- this adapter

 *

 * - comparable historical observations

 *   <- supplied Historical Context

 *

 * - execution metadata

 *   <- private orchestration owner

 *

 * INVARIANTS

 * - the adapter creates no analytical truth

 * - the adapter never searches an alternative analytical owner

 * - RFS lineage originates only from RfsScoreResult

 * - canonical RFS fields are propagated without recomputation

 * - structural context and rupture evolution share the same RFS source

 * - RFS computation and propagation statuses remain distinct

 * - coherence_score is propagated from canonical RFS stability truth

 * - rupture evolution is never supplied through a second adapter input

 * - Analytical Aggregation lineage originates only from

 *   AnalyticalAggregationMarketResult

 * - Analytical Aggregation is mandatory at the MCI input boundary

 * - supplied Analytical Aggregation producer identity must be canonical

 * - supplied malformed Analytical Aggregation truth blocks MCI construction

 * - supplied canonical Aggregation status "invalid" blocks MCI construction

 * - Aggregation status "computed" is transported unchanged

 * - Aggregation status "partial" is transported unchanged

 * - Aggregation status "unavailable" is transported unchanged

 * - Aggregation warnings remain owned by Analytical Aggregation

 * - Aggregation contexts remain owned by Analytical Aggregation

 * - no Aggregation field is renamed into an MCI-owned analytical identity

 * - no Aggregation availability state is derived locally

 * - no Aggregation numerical value determines availability locally

 * - unavailable independent upstream contexts remain explicitly unavailable

 * - an unavailable context never becomes neutral

 * - an unavailable score never becomes zero

 * - invalid structural RFS truth blocks MCI input construction

 * - invalid execution metadata blocks MCI input construction

 * - optional independent upstream contexts are validated before propagation

 * - warnings are deterministic, deduplicated and ordered at adapter level

 * - producer-owned warning arrays are not duplicated into adapter warnings

 * - identical canonical inputs produce identical canonical output

 *

 * FIRST DIVERGENCE

 * - invalid adapter request

 *   => mci_input_request_invalid

 *

 * - invalid canonical RFS contract

 *   => mci_input_rfs_invalid

 *

 * - invalid generated_at

 *   => mci_input_generated_at_invalid

 *

 * - invalid analytical_version

 *   => mci_input_analytical_version_invalid

 *

 * - invalid context_version

 *   => mci_input_context_version_invalid

 *

 * - invalid source

 *   => mci_input_source_invalid

 *

 * - absent canonical Analytical Aggregation result

 *   => mci_input_analytical_aggregation_invalid

 *

 * - malformed canonical Analytical Aggregation result

 *   => mci_input_analytical_aggregation_invalid

 *

 * - canonical Analytical Aggregation producer returns invalid

 *   => mci_input_analytical_aggregation_invalid

 *

 * - malformed independent optional upstream context

 *   => explicit unavailable context and deterministic adapter warning

 *

 * SENSITIVE ZONES

 * - RFS lineage

 * - RFS structural projection

 * - RFS rupture-evolution projection

 * - computation / propagation state separation

 * - Analytical Aggregation producer identity

 * - Analytical Aggregation producer version

 * - Analytical Aggregation analytical version

 * - Analytical Aggregation status preservation

 * - Analytical Aggregation exact-result transport

 * - Aggregation warning ownership

 * - Aggregation lineage

 * - independent context availability

 * - metadata lineage

 * - unavailable independent context materialization

 * - optional context validation

 * - first-divergence reporting

 * ========================================================================== */

import {

  RFS_SCORE_ANALYTICAL_VERSION,

  RFS_SCORE_CONTRACT_NAME,

  RFS_SCORE_CONTRACT_VERSION,

  type RfsComputationStatus,

  type RfsPropagationStatus,

  type RfsRegimeReading,

  type RfsScoreResult,

} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

import {

  isRfsRuptureEvolutionState,

} from "@/lib/xyvala/rfs/validation/rfs-score-contract-validator";

import {

  isAnalyticalAggregationMarketResult,

  type AnalyticalAggregationMarketResult,

} from "@/lib/xyvala/engine/analytical-aggregation-market-core";

import type {

  MciContextAvailability,

  MciCrashContext,

  MciExecutionMetadata,

  MciHistoricalContext,

  MciImpulseContext,

  MciNeutralizationContext,

  MciRuptureEvolutionContext,

  MciStructuralContext,

  MciTemporalContext,

  MciTripleLayerContext,

  RunMciMarketInput,

} from "./mci-market-types";

/* ============================================================================

 * 1. VERSION

 * ----------------------------------------------------------------------------

 * Breaking adapter correction:

 * - Analytical Aggregation is now mandatory

 * - no MCI mirror contract

 * - no Aggregation unavailable factory

 * - exact canonical result transport

 * ========================================================================== */

export const MCI_MARKET_INPUT_ADAPTER_VERSION =

  "5.0.0" as const;

/* ============================================================================

 * 2. PUBLIC CONTRACTS

 * ----------------------------------------------------------------------------

 * RFS is the unique owner of:

 * - structural truth

 * - rupture-evolution truth

 *

 * Therefore Rupture Evolution is deliberately absent as an independent

 * request property.

 *

 * Analytical Aggregation is mandatory:

 * - the request receives the producer's canonical result

 * - the adapter validates that canonical result

 * - the exact result is transported into RunMciMarketInput

 * - no MCI-owned mirror representation exists

 * ========================================================================== */

export type BuildMciMarketInputRequest =

  Readonly<{

    /**

     * Canonical RFS truth.

     *

     * This single contract owns both:

     * - structural MCI projection

     * - rupture-evolution MCI projection

     */

    rfs:

      RfsScoreResult;

    /**

     * Independent optional upstream transport contexts.

     *

     * null or omission means that the authoritative producer did not supply

     * the context for this execution.

     */

    triple_layer?:

      MciTripleLayerContext | null;

    impulse?:

      MciImpulseContext | null;

    crash?:

      MciCrashContext | null;

    neutralization?:

      MciNeutralizationContext | null;

    temporal_context?:

      MciTemporalContext | null;

    /**

     * Canonical Analytical Aggregation producer truth.

     *

     * REQUIRED.

     *

     * Absence is an invalid MCI input boundary.

     *

     * aggregation_status:

     * - computed    -> transport unchanged

     * - partial     -> transport unchanged

     * - unavailable -> transport unchanged

     * - invalid     -> reject boundary

     */

    analytical_aggregation:

      AnalyticalAggregationMarketResult;

    historical_context?:

      MciHistoricalContext | null;

    generated_at:

      string;

    analytical_version:

      string;

    context_version:

      string;

    source:

      "scan";

  }>;

export type MciMarketInputAdapterFailureReason =

  | "mci_input_request_invalid"

  | "mci_input_rfs_invalid"

  | "mci_input_generated_at_invalid"

  | "mci_input_analytical_version_invalid"

  | "mci_input_context_version_invalid"

  | "mci_input_source_invalid"

  | "mci_input_analytical_aggregation_invalid";

export type BuildMciMarketInputSuccess =

  Readonly<{

    ok:

      true;

    input:

      RunMciMarketInput;

    reason:

      null;

    warnings:

      readonly string[];

  }>;

export type BuildMciMarketInputFailure =

  Readonly<{

    ok:

      false;

    input:

      null;

    reason:

      MciMarketInputAdapterFailureReason;

    warnings:

      readonly string[];

  }>;

export type BuildMciMarketInputResult =

  | BuildMciMarketInputSuccess

  | BuildMciMarketInputFailure;

/* ============================================================================

 * 3. INTERNAL CONTRACTS

 * ========================================================================== */

type OptionalContextResolution<T> =

  Readonly<{

    context:

      T;

    warning:

      string | null;

  }>;

type RfsProjectionResult<T> =

  | Readonly<{

      ok:

        true;

      context:

        T;

      warnings:

        readonly string[];

    }>

  | Readonly<{

      ok:

        false;

      context:

        null;

      warnings:

        readonly string[];

    }>;

type StructuralProjectionResult =

  RfsProjectionResult<MciStructuralContext>;

type RuptureEvolutionProjectionResult =

  RfsProjectionResult<MciRuptureEvolutionContext>;

type AnalyticalAggregationValidationResult =

  | Readonly<{

      ok:

        true;

      result:

        AnalyticalAggregationMarketResult;

      warnings:

        readonly string[];

    }>

  | Readonly<{

      ok:

        false;

      result:

        null;

      warnings:

        readonly string[];

    }>;

/* ============================================================================

 * 4. SAFE PRIMITIVE HELPERS

 * ========================================================================== */

function isPlainObject(

  value:

    unknown,

): value is Record<

  string,

  unknown

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

function isBoundedScore(

  value:

    unknown,

): value is number {

  return (

    isFiniteNumber(

      value,

    ) &&

    value >= 0 &&

    value <= 100

  );

}

function isNullableBoundedScore(

  value:

    unknown,

): value is

  | number

  | null {

  return (

    value ===

      null ||

    isBoundedScore(

      value,

    )

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

function normalizeRequiredString(

  value:

    unknown,

): string | null {

  if (

    typeof value !==

      "string"

  ) {

    return null;

  }

  const normalized =

    value.trim();

  return normalized.length >

    0

    ? normalized

    : null;

}

function isValidIsoTimestamp(

  value:

    string,

): boolean {

  const parsed =

    Date.parse(

      value,

    );

  return Number.isFinite(

    parsed,

  );

}

function compareDeterministicStrings(

  left:

    string,

  right:

    string,

): number {

  if (

    left <

      right

  ) {

    return -1;

  }

  if (

    left >

      right

  ) {

    return 1;

  }

  return 0;

}

function uniqueWarnings(

  ...groups:

    Array<

      | readonly string[]

      | null

      | undefined

    >

): string[] {

  const normalized =

    groups

      .flatMap(

        (group) =>

          Array.isArray(

            group,

          )

            ? group

            : [],

      )

      .filter(

        (

          warning,

        ): warning is string =>

          typeof warning ===

            "string",

      )

      .map(

        (warning) =>

          warning.trim(),

      )

      .filter(

        (warning) =>

          warning.length >

          0,

      );

  return [

    ...new Set(

      normalized,

    ),

  ].sort(

    compareDeterministicStrings,

  );

}

function freezeWarnings(

  warnings:

    readonly string[],

): readonly string[] {

  return Object.freeze([

    ...warnings,

  ]);

}

/* ============================================================================

 * 5. CANONICAL RFS ENUM / TRANSPORT VALIDATION

 * ----------------------------------------------------------------------------

 * RFS Rupture Evolution state validation is consumed from the shared

 * canonical RFS validator.

 *

 * The remaining helpers validate transport/status vocabularies required by

 * this MCI adapter boundary only.

 *

 * No legacy MCI or RfsMarketResult aliases are accepted.

 * ========================================================================== */

function isRfsComputationStatus(

  value:

    unknown,

): value is RfsComputationStatus {

  return (

    value ===

      "computed" ||

    value ===

      "partial" ||

    value ===

      "insufficient_data" ||

    value ===

      "unavailable" ||

    value ===

      "invalid"

  );

}

function isRfsPropagationStatus(

  value:

    unknown,

): value is RfsPropagationStatus {

  return (

    value ===

      "full" ||

    value ===

      "degraded" ||

    value ===

      "blocked"

  );

}

function isNullableRfsRegime(

  value:

    unknown,

): value is RfsRegimeReading["regime"] {

  return (

    value ===

      null ||

    value ===

      "STABLE" ||

    value ===

      "TRANSITION" ||

    value ===

      "VOLATILE"

  );

}

/* ============================================================================

 * 6. MCI CONTEXT ENUM VALIDATION

 * ========================================================================== */

function isContextAvailability(

  value:

    unknown,

): value is MciContextAvailability {

  return (

    value ===

      "AVAILABLE" ||

    value ===

      "PARTIAL" ||

    value ===

      "DEGRADED" ||

    value ===

      "UNAVAILABLE" ||

    value ===

      "INVALID"

  );

}

/* ============================================================================

 * 7. CANONICAL METADATA VALIDATION

 * ========================================================================== */

function buildExecutionMetadata(

  request:

    BuildMciMarketInputRequest,

):

  | Readonly<{

      ok:

        true;

      metadata:

        MciExecutionMetadata;

    }>

  | Readonly<{

      ok:

        false;

      reason:

        MciMarketInputAdapterFailureReason;

    }> {

  const generatedAt =

    normalizeRequiredString(

      request.generated_at,

    );

  if (

    generatedAt ===

      null ||

    !isValidIsoTimestamp(

      generatedAt,

    )

  ) {

    return {

      ok:

        false,

      reason:

        "mci_input_generated_at_invalid",

    };

  }

  const analyticalVersion =

    normalizeRequiredString(

      request

        .analytical_version,

    );

  if (

    analyticalVersion ===

      null

  ) {

    return {

      ok:

        false,

      reason:

        "mci_input_analytical_version_invalid",

    };

  }

  const contextVersion =

    normalizeRequiredString(

      request

        .context_version,

    );

  if (

    contextVersion ===

      null

  ) {

    return {

      ok:

        false,

      reason:

        "mci_input_context_version_invalid",

    };

  }

  if (

    request.source !==

      "scan"

  ) {

    return {

      ok:

        false,

      reason:

        "mci_input_source_invalid",

    };

  }

  return {

    ok:

      true,

    metadata:

      Object.freeze({

        generated_at:

          generatedAt,

        analytical_version:

          analyticalVersion,

        source:

          request.source,

        context_version:

          contextVersion,

      }),

  };

}

/* ============================================================================

 * 8. RFS VALIDATION ISSUE PROPAGATION

 * ----------------------------------------------------------------------------

 * RFS validation issue codes are propagated inside the RFS-derived transport

 * contexts.

 *

 * Their analytical meaning is not translated or reinterpreted here.

 * ========================================================================== */

function readRfsValidationWarnings(

  rfs:

    RfsScoreResult,

): readonly string[] {

  if (

    !Array.isArray(

      rfs.validation_issues,

    )

  ) {

    return Object.freeze(

      [],

    );

  }

  const warnings =

    rfs.validation_issues

      .map(

        (issue) =>

          isPlainObject(

            issue,

          )

            ? normalizeRequiredString(

                issue.code,

              )

            : null,

      )

      .filter(

        (

          code,

        ): code is string =>

          code !==

            null,

      );

  return freezeWarnings(

    uniqueWarnings(

      warnings,

    ),

  );

}

/* ============================================================================

 * 9. CANONICAL RFS CONTRACT VALIDATION

 * ----------------------------------------------------------------------------

 * Only canonical RFS fields consumed by this adapter are validated locally.

 *

 * Contract identity/version is exact.

 *

 * The adapter does not:

 * - recompute a field

 * - infer an unavailable field

 * - replace null with zero

 * - translate a legacy RFS state

 * - repair malformed RFS truth

 * ========================================================================== */

function isValidRfsContract(

  value:

    unknown,

): value is RfsScoreResult {

  if (

    !isPlainObject(

      value,

    )

  ) {

    return false;

  }

  if (

    value.contract_name !==

      RFS_SCORE_CONTRACT_NAME ||

    value.contract_version !==

      RFS_SCORE_CONTRACT_VERSION ||

    value.analytical_version !==

      RFS_SCORE_ANALYTICAL_VERSION ||

    normalizeRequiredString(

      value.source_version,

    ) ===

      null ||

    normalizeRequiredString(

      value.data_version,

    ) ===

      null

  ) {

    return false;

  }

  if (

    !isRfsComputationStatus(

      value.status,

    ) ||

    !isRfsPropagationStatus(

      value.propagation_status,

    ) ||

    !isNonNegativeInteger(

      value.observation_count,

    )

  ) {

    return false;

  }

  if (

    !isPlainObject(

      value.structural_axes,

    ) ||

    !isPlainObject(

      value.stability,

    ) ||

    !isPlainObject(

      value.regime,

    ) ||

    !isPlainObject(

      value.rupture,

    )

  ) {

    return false;

  }

  const structuralAxes =

    value.structural_axes;

  const stability =

    value.stability;

  const regime =

    value.regime;

  const rupture =

    value.rupture;

  if (

    !isNullableBoundedScore(

      structuralAxes

        .convergence_score,

    ) ||

    !isRfsComputationStatus(

      structuralAxes.status,

    )

  ) {

    return false;

  }

  if (

    !isNullableBoundedScore(

      stability

        .stability_score,

    ) ||

    !isNullableBoundedScore(

      stability

        .structure_score,

    ) ||

    !isNullableBoundedScore(

      stability

        .coherence_score,

    ) ||

    !isRfsComputationStatus(

      stability.status,

    )

  ) {

    return false;

  }

  if (

    !isNullableRfsRegime(

      regime.regime,

    ) ||

    !isRfsComputationStatus(

      regime.status,

    )

  ) {

    return false;

  }

  if (

    !isNullableBoundedScore(

      rupture

        .rupture_score,

    ) ||

    !isNullableBoundedScore(

      rupture

        .continuity_probability,

    ) ||

    !isRfsComputationStatus(

      rupture.status,

    ) ||

    !isPlainObject(

      rupture.axes,

    ) ||

    !isPlainObject(

      rupture.evolution,

    )

  ) {

    return false;

  }

  const ruptureAxes =

    rupture.axes;

  const ruptureEvolution =

    rupture.evolution;

  if (

    !isNullableBoundedScore(

      ruptureAxes

        .rupture_evolution_score,

    ) ||

    !isRfsComputationStatus(

      ruptureAxes.status,

    )

  ) {

    return false;

  }

  if (

    !isRfsRuptureEvolutionState(

      ruptureEvolution

        .rupture_evolution_state,

    ) ||

    !isNullableBoundedScore(

      ruptureEvolution

        .rupture_acceleration_score,

    ) ||

    !isNullableBoundedScore(

      ruptureEvolution

        .rupture_persistence_score,

    ) ||

    !isNullableBoundedScore(

      ruptureEvolution

        .rupture_deceleration_score,

    ) ||

    !isRfsComputationStatus(

      ruptureEvolution.status,

    )

  ) {

    return false;

  }

  if (

    !Array.isArray(

      value.validation_issues,

    )

  ) {

    return false;

  }

  return true;

}

/* ============================================================================

 * 10. STRUCTURAL AVAILABILITY

 * ----------------------------------------------------------------------------

 * Availability qualifies the MCI transport representation only.

 *

 * It does not modify or reinterpret RFS analytical truth.

 * ========================================================================== */

function resolveStructuralAvailability(

  rfs:

    RfsScoreResult,

): MciContextAvailability {

  if (

    rfs.status ===

      "invalid"

  ) {

    return "INVALID";

  }

  if (

    rfs.propagation_status ===

      "blocked"

  ) {

    return "UNAVAILABLE";

  }

  if (

    rfs.status ===

      "unavailable"

  ) {

    return "UNAVAILABLE";

  }

  if (

    rfs.status ===

      "insufficient_data"

  ) {

    return "DEGRADED";

  }

  if (

    rfs.propagation_status ===

      "degraded"

  ) {

    return "DEGRADED";

  }

  if (

    rfs.status ===

      "partial"

  ) {

    return "PARTIAL";

  }

  const structuralValues = [

    rfs.stability

      .stability_score,

    rfs.stability

      .structure_score,

    rfs.stability

      .coherence_score,

    rfs.rupture

      .rupture_score,

    rfs.rupture

      .continuity_probability,

    rfs.structural_axes

      .convergence_score,

    rfs.regime.regime,

  ] as const;

  return structuralValues.some(

    (value) =>

      value ===

        null,

  )

    ? "PARTIAL"

    : "AVAILABLE";

}

/* ============================================================================

 * 11. RFS STRUCTURAL CONTEXT PROJECTION

 * ========================================================================== */

function projectRfsStructuralContext(

  rfs:

    RfsScoreResult,

): StructuralProjectionResult {

  if (

    !isValidRfsContract(

      rfs,

    )

  ) {

    return {

      ok:

        false,

      context:

        null,

      warnings:

        Object.freeze([

          "mci_input_rfs_invalid",

        ]),

    };

  }

  if (

    rfs.status ===

      "invalid"

  ) {

    return {

      ok:

        false,

      context:

        null,

      warnings:

        freezeWarnings(

          uniqueWarnings(

            readRfsValidationWarnings(

              rfs,

            ),

            [

              "mci_input_rfs_invalid",

            ],

          ),

        ),

    };

  }

  const sourceWarnings =

    readRfsValidationWarnings(

      rfs,

    );

  return {

    ok:

      true,

    context:

      Object.freeze({

        availability:

          resolveStructuralAvailability(

            rfs,

          ),

        stability_score:

          rfs.stability

            .stability_score,

        structure_score:

          rfs.stability

            .structure_score,

        coherence_score:

          rfs.stability

            .coherence_score,

        rupture_score:

          rfs.rupture

            .rupture_score,

        continuity_probability:

          rfs.rupture

            .continuity_probability,

        convergence_score:

          rfs.structural_axes

            .convergence_score,

        regime:

          rfs.regime.regime,

        rfs_computation_status:

          rfs.status,

        rfs_propagation_status:

          rfs.propagation_status,

        source_warnings:

          sourceWarnings,

      }),

    warnings:

      Object.freeze(

        [],

      ),

  };

}

/* ============================================================================

 * 12. RUPTURE EVOLUTION AVAILABILITY

 * ----------------------------------------------------------------------------

 * Rupture Evolution is RFS-owned.

 *

 * Availability is qualified from canonical RFS computation and propagation

 * states. No second producer or local analytical reconstruction is authorized.

 * ========================================================================== */

function resolveRuptureEvolutionAvailability(

  rfs:

    RfsScoreResult,

): MciContextAvailability {

  const axesStatus =

    rfs.rupture.axes

      .status;

  const evolutionStatus =

    rfs.rupture

      .evolution

      .status;

  if (

    rfs.status ===

      "invalid" ||

    axesStatus ===

      "invalid" ||

    evolutionStatus ===

      "invalid"

  ) {

    return "INVALID";

  }

  if (

    rfs.status ===

      "unavailable" ||

    rfs.propagation_status ===

      "blocked" ||

    axesStatus ===

      "unavailable" ||

    evolutionStatus ===

      "unavailable"

  ) {

    return "UNAVAILABLE";

  }

  if (

    rfs.status ===

      "insufficient_data" ||

    axesStatus ===

      "insufficient_data" ||

    evolutionStatus ===

      "insufficient_data"

  ) {

    return "DEGRADED";

  }

  if (

    rfs.propagation_status ===

      "degraded"

  ) {

    return "DEGRADED";

  }

  if (

    rfs.status ===

      "partial" ||

    axesStatus ===

      "partial" ||

    evolutionStatus ===

      "partial"

  ) {

    return "PARTIAL";

  }

  const ruptureEvolutionValues = [

    rfs.rupture.axes

      .rupture_evolution_score,

    rfs.rupture

      .evolution

      .rupture_acceleration_score,

    rfs.rupture

      .evolution

      .rupture_persistence_score,

    rfs.rupture

      .evolution

      .rupture_deceleration_score,

  ] as const;

  return ruptureEvolutionValues.some(

    (value) =>

      value ===

        null,

  )

    ? "PARTIAL"

    : "AVAILABLE";

}

/* ============================================================================

 * 13. RFS RUPTURE EVOLUTION PROJECTION

 * ========================================================================== */

function projectRfsRuptureEvolutionContext(

  rfs:

    RfsScoreResult,

): RuptureEvolutionProjectionResult {

  if (

    !isValidRfsContract(

      rfs,

    )

  ) {

    return {

      ok:

        false,

      context:

        null,

      warnings:

        Object.freeze([

          "mci_input_rfs_invalid",

        ]),

    };

  }

  const sourceWarnings =

    readRfsValidationWarnings(

      rfs,

    );

  return {

    ok:

      true,

    context:

      Object.freeze({

        availability:

          resolveRuptureEvolutionAvailability(

            rfs,

          ),

        rupture_evolution_score:

          rfs.rupture.axes

            .rupture_evolution_score,

        rupture_evolution_state:

          rfs.rupture

            .evolution

            .rupture_evolution_state,

        rupture_acceleration_score:

          rfs.rupture

            .evolution

            .rupture_acceleration_score,

        rupture_persistence_score:

          rfs.rupture

            .evolution

            .rupture_persistence_score,

        rupture_deceleration_score:

          rfs.rupture

            .evolution

            .rupture_deceleration_score,

        rupture_axes_status:

          rfs.rupture.axes

            .status,

        rupture_evolution_status:

          rfs.rupture

            .evolution

            .status,

        source_warnings:

          sourceWarnings,

      }),

    warnings:

      Object.freeze(

        [],

      ),

  };

}

/* ============================================================================

 * 14. EXPLICIT UNAVAILABLE INDEPENDENT CONTEXT FACTORIES

 * ----------------------------------------------------------------------------

 * These factories apply ONLY to independent optional upstream transport

 * contexts whose absence is still contractually allowed during the migration.

 *

 * They MUST NOT be used for Analytical Aggregation.

 *

 * Zero is used only for factual collection counters.

 * Analytical scores remain null.

 * ========================================================================== */

function buildUnavailableTripleLayerContext():

  MciTripleLayerContext {

  return Object.freeze({

    availability:

      "UNAVAILABLE",

    triple_layer_state:

      null,

    growth_score:

      null,

    core_pattern_score:

      null,

    decay_score:

      null,

    growth_status:

      "UNAVAILABLE",

    core_status:

      "UNAVAILABLE",

    decay_status:

      "UNAVAILABLE",

    source_warnings:

      Object.freeze([

        "mci_input_triple_layer_context_unavailable",

      ]),

  });

}

function buildUnavailableImpulseContext():

  MciImpulseContext {

  return Object.freeze({

    availability:

      "UNAVAILABLE",

    impulse_pressure_score:

      null,

    impulse_acceleration_score:

      null,

    impulse_alignment_score:

      null,

    impulse_instability_score:

      null,

    impulse_saturation_score:

      null,

    impulse_exhaustion_score:

      null,

    impulse_directional_bias:

      null,

    impulse_transition_state:

      null,

    impulse_status:

      "UNAVAILABLE",

    source_warnings:

      Object.freeze([

        "mci_input_impulse_context_unavailable",

      ]),

  });

}

function buildUnavailableCrashContext():

  MciCrashContext {

  return Object.freeze({

    availability:

      "UNAVAILABLE",

    crash_score:

      null,

    crash_state:

      null,

    validity:

      "unavailable",

    source_warnings:

      Object.freeze([

        "mci_input_crash_context_unavailable",

      ]),

  });

}

function buildUnavailableNeutralizationContext():

  MciNeutralizationContext {

  return Object.freeze({

    availability:

      "UNAVAILABLE",

    neutralized:

      null,

    neutralization_reason:

      null,

    neutralization_severity:

      null,

    neutralization_validity:

      "unavailable",

    source_warnings:

      Object.freeze([

        "mci_input_neutralization_context_unavailable",

      ]),

  });

}

function buildUnavailableTemporalContext():

  MciTemporalContext {

  return Object.freeze({

    availability:

      "UNAVAILABLE",

    context_7d_status:

      "UNAVAILABLE",

    timing_24h_status:

      "UNAVAILABLE",

    temporal_alignment:

      "UNAVAILABLE",

    temporal_coherence_score:

      null,

    temporal_support_score:

      null,

    source_warnings:

      Object.freeze([

        "mci_input_temporal_context_unavailable",

      ]),

  });

}

function buildUnavailableHistoricalContext():

  MciHistoricalContext {

  return Object.freeze({

    availability:

      "UNAVAILABLE",

    comparable_occurrences:

      Object.freeze(

        [],

      ),

    comparable_occurrence_count:

      0,

    valid_occurrence_count:

      0,

    historical_similarity_score:

      null,

    historical_convergence_score:

      null,

    source_warnings:

      Object.freeze([

        "mci_input_historical_context_unavailable",

      ]),

  });

}

/* ============================================================================

 * 15. GENERIC OPTIONAL CONTEXT RESOLUTION

 * ----------------------------------------------------------------------------

 * Applies only to independent optional contexts already expressed in their

 * current MCI transport representation.

 *

 * Analytical Aggregation MUST NOT use this path.

 *

 * A supplied context must:

 * - be a plain object

 * - expose a valid MCI availability state

 *

 * This adapter never repairs malformed analytical payloads.

 * ========================================================================== */

function resolveOptionalContext<

  T extends {

    availability:

      MciContextAvailability;

  },

>(input: {

  supplied:

    | T

    | null

    | undefined;

  unavailableFactory:

    () => T;

  malformedWarning:

    string;

}): OptionalContextResolution<T> {

  if (

    input.supplied ===

      null ||

    input.supplied ===

      undefined

  ) {

    return {

      context:

        input

          .unavailableFactory(),

      warning:

        null,

    };

  }

  if (

    !isPlainObject(

      input.supplied,

    ) ||

    !isContextAvailability(

      input.supplied

        .availability,

    )

  ) {

    return {

      context:

        input

          .unavailableFactory(),

      warning:

        input

          .malformedWarning,

    };

  }

  return {

    context:

      input.supplied,

    warning:

      null,

  };

}

/* ============================================================================

 * 16. UNDEFINED BOUNDARY PROTECTION

 * ========================================================================== */

function containsUndefinedDeep(

  value:

    unknown,

  seen:

    Set<unknown> =

      new Set(),

): boolean {

  if (

    value ===

      undefined

  ) {

    return true;

  }

  if (

    value ===

      null ||

    typeof value !==

      "object"

  ) {

    return false;

  }

  if (

    seen.has(

      value,

    )

  ) {

    return false;

  }

  seen.add(

    value,

  );

  if (

    Array.isArray(

      value,

    )

  ) {

    return value.some(

      (item) =>

        containsUndefinedDeep(

          item,

          seen,

        ),

    );

  }

  return Object.values(

    value as Record<

      string,

      unknown

    >,

  ).some(

    (item) =>

      containsUndefinedDeep(

        item,

        seen,

      ),

  );

}

function resolveGovernedOptionalContext<

  T extends {

    availability:

      MciContextAvailability;

  },

>(input: {

  supplied:

    | T

    | null

    | undefined;

  unavailableFactory:

    () => T;

  malformedWarning:

    string;

}): OptionalContextResolution<T> {

  const resolved =

    resolveOptionalContext(

      input,

    );

  if (

    containsUndefinedDeep(

      resolved.context,

    )

  ) {

    return {

      context:

        input

          .unavailableFactory(),

      warning:

        input

          .malformedWarning,

    };

  }

  return resolved;

}

/* ============================================================================

 * 17. CANONICAL ANALYTICAL AGGREGATION VALIDATION

 * ----------------------------------------------------------------------------

 * CONTRACT BEFORE RUNTIME

 *

 * Analytical Aggregation is NOT an optional MCI transport context.

 *

 * REQUIRED INPUT

 * - AnalyticalAggregationMarketResult

 *

 * VALIDATION

 * - canonical result contract

 * - canonical producer identity

 * - canonical producer version

 * - canonical analytical version

 * - canonical root/context structure

 * - undefined boundary

 *

 * The canonical producer validator owns the result-contract validation.

 *

 * VALID PRODUCER STATES

 * - computed

 * - partial

 * - unavailable

 *

 * These states cross the MCI boundary unchanged.

 *

 * INVALID BOUNDARY

 * - absent result

 * - malformed result

 * - invalid producer identity

 * - invalid producer version

 * - invalid analytical version

 * - undefined inside canonical result

 * - aggregation_status === "invalid"

 *

 * No invalid or absent result is converted into an MCI UNAVAILABLE structure.

 * No Aggregation field is renamed, normalized, copied or reconstructed here.

 * ========================================================================== */

function validateAnalyticalAggregation(

  supplied:

    unknown,

): AnalyticalAggregationValidationResult {

  if (

    supplied ===

      null ||

    supplied ===

      undefined

  ) {

    return {

      ok:

        false,

      result:

        null,

      warnings:

        Object.freeze([

          "mci_input_analytical_aggregation_missing",

        ]),

    };

  }

  if (

    containsUndefinedDeep(

      supplied,

    )

  ) {

    return {

      ok:

        false,

      result:

        null,

      warnings:

        Object.freeze([

          "mci_input_analytical_aggregation_undefined_boundary_violation",

        ]),

    };

  }

  if (

    !isAnalyticalAggregationMarketResult(

      supplied,

    )

  ) {

    return {

      ok:

        false,

      result:

        null,

      warnings:

        Object.freeze([

          "mci_input_analytical_aggregation_contract_invalid",

        ]),

    };

  }

  if (

    supplied

      .aggregation_status ===

      "invalid"

  ) {

    return {

      ok:

        false,

      result:

        null,

      warnings:

        Object.freeze([

          "mci_input_analytical_aggregation_status_invalid",

        ]),

    };

  }

  return {

    ok:

      true,

    /*

     * IMPORTANT:

     * This is the exact canonical producer result.

     *

     * No spread.

     * No Object reconstruction.

     * No status conversion.

     * No warning duplication.

     * No context projection.

     */

    result:

      supplied,

    warnings:

      Object.freeze(

        [],

      ),

  };

}

/* ============================================================================

 * 18. ADAPTER FAILURE FACTORY

 * ========================================================================== */

function buildFailure(

  reason:

    MciMarketInputAdapterFailureReason,

  warnings:

    readonly string[] =

      [],

): BuildMciMarketInputFailure {

  return Object.freeze({

    ok:

      false,

    input:

      null,

    reason,

    warnings:

      freezeWarnings(

        uniqueWarnings(

          [

            reason,

          ],

          warnings,

        ),

      ),

  });

}

/* ============================================================================

 * 19. CANONICAL ADAPTER API

 * ----------------------------------------------------------------------------

 * READ

 * - canonical RfsScoreResult

 * - optional independent upstream contexts

 * - mandatory canonical AnalyticalAggregationMarketResult

 * - canonical execution metadata

 *

 * VALIDATE

 * - request shape

 * - canonical RFS transport contract

 * - execution metadata

 * - independent optional context transport integrity

 * - canonical Analytical Aggregation producer result

 *

 * PROJECT

 * - RfsScoreResult -> MciStructuralContext

 * - RfsScoreResult -> MciRuptureEvolutionContext

 * - absent independent optional contexts -> explicit unavailable contexts

 *

 * TRANSPORT

 * - AnalyticalAggregationMarketResult -> exact same canonical result

 * - supplied independent contexts -> RunMciMarketInput

 *

 * The adapter never executes MCI.

 * ========================================================================== */

export function buildMciMarketInput(

  request:

    BuildMciMarketInputRequest,

): BuildMciMarketInputResult {

  /* --------------------------------------------------------------------------

   * FIRST DIVERGENCE 1

   * Adapter request

   * ----------------------------------------------------------------------- */

  if (

    !isPlainObject(

      request,

    )

  ) {

    return buildFailure(

      "mci_input_request_invalid",

    );

  }

  /* --------------------------------------------------------------------------

   * FIRST DIVERGENCE 2

   * Canonical RFS contract

   * ----------------------------------------------------------------------- */

  if (

    !isValidRfsContract(

      request.rfs,

    )

  ) {

    return buildFailure(

      "mci_input_rfs_invalid",

    );

  }

  /* --------------------------------------------------------------------------

   * RFS STRUCTURAL PROJECTION

   * ----------------------------------------------------------------------- */

  const structuralProjection =

    projectRfsStructuralContext(

      request.rfs,

    );

  if (

    !structuralProjection.ok

  ) {

    return buildFailure(

      "mci_input_rfs_invalid",

      structuralProjection

        .warnings,

    );

  }

  /* --------------------------------------------------------------------------

   * RFS RUPTURE EVOLUTION PROJECTION

   * ----------------------------------------------------------------------- */

  const ruptureEvolutionProjection =

    projectRfsRuptureEvolutionContext(

      request.rfs,

    );

  if (

    !ruptureEvolutionProjection.ok

  ) {

    return buildFailure(

      "mci_input_rfs_invalid",

      ruptureEvolutionProjection

        .warnings,

    );

  }

  /* --------------------------------------------------------------------------

   * FIRST DIVERGENCE 3

   * Canonical execution metadata

   * ----------------------------------------------------------------------- */

  const metadataResult =

    buildExecutionMetadata(

      request,

    );

  if (

    !metadataResult.ok

  ) {

    return buildFailure(

      metadataResult.reason,

    );

  }

  /* --------------------------------------------------------------------------

   * INDEPENDENT OPTIONAL UPSTREAM CONTEXTS

   *

   * These contexts remain provisionally expressed in MCI transport form.

   *

   * Their authorized absence may still become an explicit UNAVAILABLE

   * transport context.

   *

   * This mechanism MUST NOT be extended to Analytical Aggregation.

   * ----------------------------------------------------------------------- */

  const tripleLayer =

    resolveGovernedOptionalContext({

      supplied:

        request.triple_layer,

      unavailableFactory:

        buildUnavailableTripleLayerContext,

      malformedWarning:

        "mci_input_triple_layer_context_invalid",

    });

  const impulse =

    resolveGovernedOptionalContext({

      supplied:

        request.impulse,

      unavailableFactory:

        buildUnavailableImpulseContext,

      malformedWarning:

        "mci_input_impulse_context_invalid",

    });

  const crash =

    resolveGovernedOptionalContext({

      supplied:

        request.crash,

      unavailableFactory:

        buildUnavailableCrashContext,

      malformedWarning:

        "mci_input_crash_context_invalid",

    });

  const neutralization =

    resolveGovernedOptionalContext({

      supplied:

        request

          .neutralization,

      unavailableFactory:

        buildUnavailableNeutralizationContext,

      malformedWarning:

        "mci_input_neutralization_context_invalid",

    });

  const temporal =

    resolveGovernedOptionalContext({

      supplied:

        request

          .temporal_context,

      unavailableFactory:

        buildUnavailableTemporalContext,

      malformedWarning:

        "mci_input_temporal_context_invalid",

    });

  /* --------------------------------------------------------------------------

   * FIRST DIVERGENCE 4

   * CANONICAL ANALYTICAL AGGREGATION

   *

   * Analytical Aggregation is mandatory.

   *

   * - absent result => hard failure

   * - malformed result => hard failure

   * - aggregation_status "invalid" => hard failure

   * - aggregation_status "computed" => transport unchanged

   * - aggregation_status "partial" => transport unchanged

   * - aggregation_status "unavailable" => transport unchanged

   *

   * No MCI mirror context exists.

   * ----------------------------------------------------------------------- */

  const analyticalAggregation =

    validateAnalyticalAggregation(

      request

        .analytical_aggregation,

    );

  if (

    !analyticalAggregation.ok

  ) {

    return buildFailure(

      "mci_input_analytical_aggregation_invalid",

      analyticalAggregation

        .warnings,

    );

  }

  const historical =

    resolveGovernedOptionalContext({

      supplied:

        request

          .historical_context,

      unavailableFactory:

        buildUnavailableHistoricalContext,

      malformedWarning:

        "mci_input_historical_context_invalid",

    });

  /* --------------------------------------------------------------------------

   * ADAPTER WARNINGS

   *

   * Only adapter-owned diagnostics belong here.

   *

   * Analytical Aggregation producer warnings remain exclusively inside:

   *

   * request.analytical_aggregation.warnings

   *

   * They are not copied, renamed, normalized or merged into this array.

   * ----------------------------------------------------------------------- */

  const adapterWarnings =

    uniqueWarnings(

      structuralProjection

        .warnings,

      ruptureEvolutionProjection

        .warnings,

      tripleLayer.warning

        ? [

            tripleLayer.warning,

          ]

        : [],

      impulse.warning

        ? [

            impulse.warning,

          ]

        : [],

      crash.warning

        ? [

            crash.warning,

          ]

        : [],

      neutralization.warning

        ? [

            neutralization.warning,

          ]

        : [],

      temporal.warning

        ? [

            temporal.warning,

          ]

        : [],

      historical.warning

        ? [

            historical.warning,

          ]

        : [],

    );

  /* --------------------------------------------------------------------------

   * CANONICAL RUN MCI INPUT

   *

   * Analytical Aggregation is transported by exact canonical reference.

   *

   * No analytical value is recalculated here.

   * ----------------------------------------------------------------------- */

  const input:

    RunMciMarketInput =

      Object.freeze({

        structural_context:

          structuralProjection

            .context,

        triple_layer_context:

          tripleLayer.context,

        impulse_context:

          impulse.context,

        rupture_evolution_context:

          ruptureEvolutionProjection

            .context,

        crash_context:

          crash.context,

        neutralization_context:

          neutralization

            .context,

        temporal_context:

          temporal.context,

        analytical_aggregation:

          analyticalAggregation

            .result,

        historical_context:

          historical.context,

        metadata:

          metadataResult

            .metadata,

      });

  /* --------------------------------------------------------------------------

   * FINAL UNDEFINED BOUNDARY

   * ----------------------------------------------------------------------- */

  if (

    containsUndefinedDeep(

      input,

    )

  ) {

    return buildFailure(

      "mci_input_request_invalid",

      [

        "mci_input_undefined_boundary_violation",

      ],

    );

  }

  return Object.freeze({

    ok:

      true,

    input,

    reason:

      null,

    warnings:

      freezeWarnings(

        adapterWarnings,

      ),

  });

}
