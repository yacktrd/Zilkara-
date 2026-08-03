/* ============================================================================
 * FILE: lib/xyvala/scan-engine.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private scan RFS propagation engine
 *
 * ROLE
 * - read the canonical Acquisition -> RFS input transport
 * - execute the canonical RFS producer once per eligible private asset
 * - propagate validated RFS-owned truths into the private scan contract
 * - preserve truths owned by Triple Layer, Impulse Layer, Crash System and MCI
 * - preserve deterministic asset ordering
 * - build the private market context from enriched private assets
 *
 * CLASSIFICATION
 * - PRIVATE
 * - COMPUTE
 * - PROPAGATION
 * - PURE
 * - NON-MUTATING
 *
 * PARENTS
 * - Acquisition Layer
 * - RFS score contract
 * - RFS producer
 * - private scan contract
 *
 * CONSUMERS
 * - private scan service
 * - private snapshot builder
 * - private analytical aggregation
 * - private rankings
 *
 * DIRECTIVES
 * - private engine only
 * - no UI logic
 * - no API response construction
 * - no public wording
 * - no timestamp generation
 * - no observation reconstruction
 * - no sparkline-to-RFS reconstruction
 * - no local observation sorting
 * - no provider-data repair
 * - no score clamping
 * - no unavailable-to-zero substitution
 * - no unavailable-to-neutral substitution
 * - no Triple Layer computation
 * - no Impulse Layer computation
 * - no Crash System computation
 * - no MCI computation
 * - no calibration computation
 * - no market score reconstruction
 * - no confidence reconstruction
 * - no persistence
 * - no event publication
 * - no runtime mutation
 * - same canonical input and versions => same canonical output
 *
 * INPUTS
 * - PrivateScanAsset[]
 * - canonical private RFS input transport carried by each eligible asset
 *
 * OUTPUTS
 * - RFS-enriched PrivateScanAsset[]
 * - deterministic private market context
 *
 * OWNERSHIP
 * - RFS owns:
 *   - structural axes
 *   - structural evolution detail
 *   - pattern truth
 *   - stability truth
 *   - RFS regime truth
 *   - rupture truth
 *   - rupture evolution truth
 *   - structural temporal context
 *
 * NON-OWNERSHIP
 * - Triple Layer owns Triple Layer truths
 * - Impulse Layer owns impulse truths
 * - Crash System owns crash truths
 * - Analytical Aggregation owns aggregated contexts
 * - MCI owns opportunity, confidence and decision truths
 * - Calibration owns decision policies and thresholds
 *
 * INVARIANTS
 * - one eligible asset triggers exactly one RFS execution
 * - RFS receives only the canonical transported observations and metadata
 * - no RFS input is reconstructed from sparkline_7d
 * - no downstream analytical truth is overwritten by RFS propagation
 * - no invalid RFS score is silently clamped
 * - null remains distinct from zero
 * - missing RFS input produces an explicit degraded propagation state
 * - RFS producer failure produces an explicit invalid lineage state
 * - output ordering remains deterministic
 *
 * BOUNDARIES
 * - Acquisition -> RFS
 * - RFS -> PrivateScanAsset
 * - PrivateScanAsset -> private market context
 *
 * FIRST DIVERGENCE
 * - missing canonical RFS transport
 *   => Acquisition -> RFS
 *
 * - valid transport rejected by RFS
 *   => RFS producer
 *
 * - valid RFS result incompatible with private projection
 *   => RFS -> PrivateScanAsset
 *
 * SENSITIVE ZONES
 * - canonical input transport
 * - score-domain validation
 * - ownership separation
 * - rupture evolution mapping
 * - lineage propagation
 * - deterministic sorting
 * ========================================================================== */

import type {
  PrivateLineageStatus,
  PrivateRuptureEvolutionState,
  PrivateScanAsset,
  PrivateScanStatus,
} from "@/lib/xyvala/contracts/scan-private-contract";

import type {
  RfsComputationStatus,
  RfsPropagationStatus,
  RfsRuptureEvolutionState,
  RfsScoreInput,
  RfsScoreResult,
} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

import {
  runRFS,
} from "@/lib/xyvala/rfs-core";

import {
  buildMarketContext,
  type MarketContext,
} from "@/lib/xyvala/market-context";

/* ============================================================================
 * 1. PUBLIC TYPES
 * ========================================================================== */

export type ScanEngineSortKey =
  | "stability"
  | "price";

export type ScanEngineSortOrder =
  | "asc"
  | "desc";

export type ScanEngineResult = Readonly<{
  data: PrivateScanAsset[];
  market_context: MarketContext;
}>;

/* ============================================================================
 * 2. INTERNAL TYPES
 * ========================================================================== */

type RfsProjectionFailureCode =
  | "scan_engine_rfs_input_unavailable"
  | "scan_engine_rfs_contract_violation"
  | "scan_engine_rfs_producer_failure";

type RfsProjectionBoundary =
  | "Acquisition -> RFS"
  | "RFS producer"
  | "RFS -> PrivateScanAsset";

type RfsProjectionValues = Readonly<{
  stability_score: number | null;
  structure_score: number | null;
  coherence_score: number | null;

  occurrence_score: number | null;
  frequency_score: number | null;
  convergence_score: number | null;
  duration_score: number | null;
  evolution_score: number | null;

  rupture_score: number | null;
  rupture_probability: number | null;
  rupture_penalty_score: number | null;

  rupture_occurrence_score: number | null;
  rupture_frequency_score: number | null;
  rupture_convergence_score: number | null;
  rupture_duration_score: number | null;
  rupture_evolution_score: number | null;

  rupture_evolution_state: PrivateRuptureEvolutionState;
  rupture_acceleration_score: number | null;

  continuity_probability: number | null;
}>;

/* ============================================================================
 * 3. PURE VALUE READERS
 * ----------------------------------------------------------------------------
 * These helpers validate and read values.
 *
 * They never:
 * - clamp
 * - normalize
 * - repair
 * - synthesize
 * - mutate
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isScoreValue(
  value: unknown,
): value is number {
  return (
    isFiniteNumber(value) &&
    value >= 0 &&
    value <= 100
  );
}

function readNullableScore(
  value: unknown,
  variableName: string,
): number | null {
  if (value === null) {
    return null;
  }

  if (!isScoreValue(value)) {
    throw new RangeError(
      `SCAN_ENGINE_RFS_SCORE_INVALID: ${variableName} must be null or a finite score between 0 and 100`,
    );
  }

  return value;
}

function readNullableProbability(
  value: unknown,
  variableName: string,
): number | null {
  return readNullableScore(
    value,
    variableName,
  );
}

function uniqueWarnings(
  warnings: readonly string[],
): string[] {
  return [
    ...new Set(
      warnings.filter(
        (
          warning,
        ): warning is string =>
          typeof warning === "string" &&
          warning.trim().length > 0,
      ),
    ),
  ];
}

function appendPropagationPath(
  currentPath: readonly string[],
  additions: readonly string[],
): string[] {
  return uniqueWarnings([
    ...currentPath,
    ...additions,
  ]);
}

function readRfsProjectionBoundary(
  value: string | null,
): RfsProjectionBoundary | null {
  switch (value) {
    case "Acquisition -> RFS":
    case "RFS producer":
    case "RFS -> PrivateScanAsset":
      return value;

    case null:
    default:
      return null;
  }
}

/* ============================================================================
 * 4. CANONICAL RFS INPUT TRANSPORT
 * ----------------------------------------------------------------------------
 * CLASSIFICATION
 * - OBSERVE
 * - PURE
 * - NON-MUTATING
 *
 * ROLE
 * - read the canonical Acquisition -> RFS transport
 *
 * DIRECTIVES
 * - no reconstruction from sparkline_7d
 * - no timestamp generation
 * - no currency inference
 * - no version inference
 * - no local repair
 * ========================================================================== */

function readCanonicalRfsInput(
  asset: PrivateScanAsset,
): Readonly<RfsScoreInput> | null {
  return asset.rfs_input ?? null;
}

/* ============================================================================
 * 5. STATUS MAPPERS
 * ----------------------------------------------------------------------------
 * These mappers convert contract vocabulary only.
 *
 * They do not change analytical meaning.
 * ========================================================================== */

function mapRfsComputationStatus(
  status: RfsComputationStatus,
): PrivateScanStatus {
  switch (status) {
    case "computed":
      return "computed";

    case "partial":
    case "insufficient_data":
      return "partial";

    case "invalid":
      return "degraded";

    case "unavailable":
    default:
      return "unavailable";
  }
}

function mapRfsPropagationStatus(
  status: RfsPropagationStatus,
): PrivateLineageStatus {
  switch (status) {
    case "full":
      return "valid";

    case "degraded":
      return "partial";

    case "blocked":
    default:
      return "invalid";
  }
}

function mapRfsRuptureEvolutionState(
  state: RfsRuptureEvolutionState,
): PrivateRuptureEvolutionState {
  switch (state) {
    case "EXPLOSIVE":
      return "explosive";

    case "INCREASING":
    case "PERSISTENT":
      return "worsening";

    case "DECREASING":
      return "improving";

    case "STABLE":
      return "stable";

    case "INSUFFICIENT_DATA":
    case "UNAVAILABLE":
    default:
      return "unknown";
  }
}

/* ============================================================================
 * 6. RFS RESULT VALIDATION AND PROJECTION
 * ----------------------------------------------------------------------------
 * ROLE
 * - validate the RFS -> PrivateScanAsset boundary
 * - extract only truths legitimately owned by RFS
 *
 * DIRECTIVES
 * - no score clamping
 * - no alias creation
 * - no market score reconstruction
 * - no confidence reconstruction
 * - no crash reconstruction
 * - no decision regime overwrite
 * - no Triple Layer growth overwrite
 * ========================================================================== */

function readRfsProjectionValues(
  rfs: RfsScoreResult,
): RfsProjectionValues {
  return {
    stability_score:
      readNullableScore(
        rfs.stability
          .stability_score,
        "stability.stability_score",
      ),

    structure_score:
      readNullableScore(
        rfs.stability
          .structure_score,
        "stability.structure_score",
      ),

    coherence_score:
      readNullableScore(
        rfs.stability
          .coherence_score,
        "stability.coherence_score",
      ),

    occurrence_score:
      readNullableScore(
        rfs.structural_axes
          .occurrence_score,
        "structural_axes.occurrence_score",
      ),

    frequency_score:
      readNullableScore(
        rfs.structural_axes
          .frequency_score,
        "structural_axes.frequency_score",
      ),

    convergence_score:
      readNullableScore(
        rfs.structural_axes
          .convergence_score,
        "structural_axes.convergence_score",
      ),

    duration_score:
      readNullableScore(
        rfs.structural_axes
          .duration_score,
        "structural_axes.duration_score",
      ),

    evolution_score:
      readNullableScore(
        rfs.structural_axes
          .evolution_score,
        "structural_axes.evolution_score",
      ),

    rupture_score:
      readNullableScore(
        rfs.rupture
          .rupture_score,
        "rupture.rupture_score",
      ),

    rupture_probability:
      readNullableProbability(
        rfs.rupture
          .rupture_probability,
        "rupture.rupture_probability",
      ),

    rupture_penalty_score:
      readNullableScore(
        rfs.rupture
          .rupture_penalty_score,
        "rupture.rupture_penalty_score",
      ),

    rupture_occurrence_score:
      readNullableScore(
        rfs.rupture.axes
          .rupture_occurrence_score,
        "rupture.axes.rupture_occurrence_score",
      ),

    rupture_frequency_score:
      readNullableScore(
        rfs.rupture.axes
          .rupture_frequency_score,
        "rupture.axes.rupture_frequency_score",
      ),

    rupture_convergence_score:
      readNullableScore(
        rfs.rupture.axes
          .rupture_convergence_score,
        "rupture.axes.rupture_convergence_score",
      ),

    rupture_duration_score:
      readNullableScore(
        rfs.rupture.axes
          .rupture_duration_score,
        "rupture.axes.rupture_duration_score",
      ),

    rupture_evolution_score:
      readNullableScore(
        rfs.rupture.axes
          .rupture_evolution_score,
        "rupture.axes.rupture_evolution_score",
      ),

    rupture_evolution_state:
      mapRfsRuptureEvolutionState(
        rfs.rupture.evolution
          .rupture_evolution_state,
      ),

    rupture_acceleration_score:
      readNullableScore(
        rfs.rupture.evolution
          .rupture_acceleration_score,
        "rupture.evolution.rupture_acceleration_score",
      ),

    continuity_probability:
      readNullableProbability(
        rfs.rupture
          .continuity_probability,
        "rupture.continuity_probability",
      ),
  };
}

/* ============================================================================
 * 7. CONTROLLED RFS DEGRADATION
 * ----------------------------------------------------------------------------
 * These factories invalidate only RFS-owned flattened values.
 *
 * They deliberately preserve:
 * - market_score
 * - regime
 * - crash_score
 * - crash_state
 * - Triple Layer values
 * - Impulse Layer values
 * - aggregated contexts
 * - confidence values
 * - opportunity values
 * - decisions
 * - calibration values
 *
 * growth_score is deliberately preserved because the current flattened private
 * contract contains an unresolved RFS / Triple Layer identity collision.
 * ========================================================================== */

function buildUnavailableRfsAsset(
  asset: PrivateScanAsset,
  input: {
    status: PrivateScanStatus;
    warning: RfsProjectionFailureCode;
    lineage_status: PrivateLineageStatus;
    last_valid_boundary: RfsProjectionBoundary | null;
    first_invalid_boundary: RfsProjectionBoundary;
  },
): PrivateScanAsset {
  return {
    ...asset,

    stability_score:
      null,

    stability_status:
      input.status,

    structure_score:
      null,

    coherence_score:
      null,

    occurrence_score:
      null,

    frequency_score:
      null,

    convergence_score:
      null,

    duration_score:
      null,

    evolution_score:
      null,

    rupture_score:
      null,

    rupture_probability:
      null,

    rupture_penalty_score:
      null,

    rupture_occurrence_score:
      null,

    rupture_frequency_score:
      null,

    rupture_convergence_score:
      null,

    rupture_duration_score:
      null,

    rupture_evolution_score:
      null,

    rupture_evolution_state:
      "unknown",

    rupture_acceleration_score:
      null,

    continuity_probability:
      null,

    governance: {
      ...asset.governance,

      warnings:
        uniqueWarnings([
          ...asset.governance
            .warnings,
          input.warning,
        ]),

      lineage_status:
        input.lineage_status,

      last_valid_boundary:
        input.last_valid_boundary,

      first_invalid_boundary:
        input.first_invalid_boundary,
    },
  };
}

function buildMissingRfsInputAsset(
  asset: PrivateScanAsset,
): PrivateScanAsset {
  return buildUnavailableRfsAsset(
    asset,
    {
      status:
        "partial",

      warning:
        "scan_engine_rfs_input_unavailable",

      lineage_status:
        asset.governance
          .lineage_status === "invalid"
          ? "invalid"
          : "partial",

      last_valid_boundary:
        readRfsProjectionBoundary(
          asset.governance
            .last_valid_boundary,
        ),

      first_invalid_boundary:
        "Acquisition -> RFS",
    },
  );
}

function buildRfsContractViolationAsset(
  asset: PrivateScanAsset,
): PrivateScanAsset {
  return buildUnavailableRfsAsset(
    asset,
    {
      status:
        "degraded",

      warning:
        "scan_engine_rfs_contract_violation",

      lineage_status:
        "invalid",

      last_valid_boundary:
        "RFS producer",

      first_invalid_boundary:
        "RFS -> PrivateScanAsset",
    },
  );
}

function buildRfsProducerFailureAsset(
  asset: PrivateScanAsset,
): PrivateScanAsset {
  return buildUnavailableRfsAsset(
    asset,
    {
      status:
        "degraded",

      warning:
        "scan_engine_rfs_producer_failure",

      lineage_status:
        "invalid",

      last_valid_boundary:
        "Acquisition -> RFS",

      first_invalid_boundary:
        "RFS producer",
    },
  );
}

/* ============================================================================
 * 8. CANONICAL RFS PROPAGATION
 * ----------------------------------------------------------------------------
 * ROLE
 * - execute one RFS evaluation per eligible asset
 * - validate the producer output
 * - propagate RFS-owned values without reconstruction
 * - preserve all non-RFS values carried by the private asset
 *
 * CLASSIFICATION
 * - COMPUTE
 * - PRIVATE
 * - PURE
 * - NON-MUTATING
 *
 * INVARIANTS
 * - exactly one runRFS call per eligible asset
 * - no second analytical pass
 * - no local fallback calculation
 * - no crash assignment
 * - no confidence assignment
 * - no market_score assignment
 * - no decision regime assignment
 * - no growth_score assignment until collision migration is completed
 * ========================================================================== */

function projectRfsResult(
  asset: PrivateScanAsset,
  rfs: RfsScoreResult,
): PrivateScanAsset {
  const projection =
    readRfsProjectionValues(
      rfs,
    );

  return {
    ...asset,

    stability_score:
      projection
        .stability_score,

    stability_status:
      mapRfsComputationStatus(
        rfs.stability.status,
      ),

    structure_score:
      projection
        .structure_score,

    coherence_score:
      projection
        .coherence_score,

    occurrence_score:
      projection
        .occurrence_score,

    frequency_score:
      projection
        .frequency_score,

    convergence_score:
      projection
        .convergence_score,

    duration_score:
      projection
        .duration_score,

    evolution_score:
      projection
        .evolution_score,

    rupture_score:
      projection
        .rupture_score,

    rupture_probability:
      projection
        .rupture_probability,

    rupture_penalty_score:
      projection
        .rupture_penalty_score,

    rupture_occurrence_score:
      projection
        .rupture_occurrence_score,

    rupture_frequency_score:
      projection
        .rupture_frequency_score,

    rupture_convergence_score:
      projection
        .rupture_convergence_score,

    rupture_duration_score:
      projection
        .rupture_duration_score,

    rupture_evolution_score:
      projection
        .rupture_evolution_score,

    rupture_evolution_state:
      projection
        .rupture_evolution_state,

    rupture_acceleration_score:
      projection
        .rupture_acceleration_score,

    continuity_probability:
      projection
        .continuity_probability,

    /*
     * INTENTIONALLY PRESERVED NON-RFS TRUTHS
     * ----------------------------------------
     * The object spread preserves:
     *
     * - regime
     *   Current flattened contract ownership belongs to PrivateDecisionLayer.
     *   A distinct rfs_regime field requires a versioned migration.
     *
     * - growth_score
     *   Current flattened contract contains an unresolved RFS / Triple Layer
     *   identity collision. RFS must not overwrite Triple Layer truth.
     *
     * - market_score
     *   Not present in the canonical RFS v2 result.
     *
     * - crash_score / crash_state
     *   Owned by Crash System.
     *
     * - confidence_score / confidence_status
     *   Owned by MCI.
     *
     * - all Triple Layer, Impulse, Aggregation, Decision and Calibration fields
     *   Owned by their respective authoritative layers.
     */

    governance: {
      ...asset.governance,

      analytical_version:
        rfs.analytical_version,

      warnings:
        uniqueWarnings([
          ...asset.governance
            .warnings,

          ...rfs.validation_issues.map(
            (issue) =>
              issue.code,
          ),
        ]),

      deterministic:
        true,

      jurisdiction:
        "FR/EU",

      default_currency:
        "EUR",

      lineage_status:
        mapRfsPropagationStatus(
          rfs.propagation_status,
        ),

      source_layer:
        "RFS",

      source_contract:
        `${rfs.contract_name}@${rfs.contract_version}`,

      propagation_path:
        appendPropagationPath(
          asset.governance
            .propagation_path,
          [
            "Acquisition",
            "RFS",
            "PrivateScanAsset",
          ],
        ),

      last_valid_boundary:
        rfs.propagation_status ===
          "blocked"
          ? "Acquisition -> RFS"
          : "RFS -> PrivateScanAsset",

      first_invalid_boundary:
        rfs.propagation_status ===
          "blocked"
          ? "RFS -> PrivateScanAsset"
          : null,
    },
  };
}

export function applyRFS(
  data: readonly PrivateScanAsset[],
): PrivateScanAsset[] {
  return data.map(
    (asset) => {
      const rfsInput =
        readCanonicalRfsInput(
          asset,
        );

      if (rfsInput === null) {
        return buildMissingRfsInputAsset(
          asset,
        );
      }

      let rfs:
        RfsScoreResult;

      try {
        rfs =
          runRFS(
            rfsInput,
          );
      } catch {
        return buildRfsProducerFailureAsset(
          asset,
        );
      }

      try {
        return projectRfsResult(
          asset,
          rfs,
        );
      } catch {
        return buildRfsContractViolationAsset(
          asset,
        );
      }
    },
  );
}

/* ============================================================================
 * 9. DETERMINISTIC INTERNAL ORDERING
 * ----------------------------------------------------------------------------
 * This ordering is an internal operational projection.
 *
 * It is not:
 * - an opportunity ranking
 * - a transition ranking
 * - an Impulse ranking
 * - a decision ranking
 * - a public ranking
 *
 * Null or unavailable values are placed after valid values independently of
 * requested sort direction.
 * ========================================================================== */

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: 1 | -1,
): number {
  const leftValid =
    isFiniteNumber(left);

  const rightValid =
    isFiniteNumber(right);

  if (
    leftValid &&
    !rightValid
  ) {
    return -1;
  }

  if (
    !leftValid &&
    rightValid
  ) {
    return 1;
  }

  if (
    !leftValid &&
    !rightValid
  ) {
    return 0;
  }

  if (left === right) {
    return 0;
  }

  return (
    (
      left as number
    ) -
    (
      right as number
    )
  ) * direction;
}

export function sortAssets(
  data: readonly PrivateScanAsset[],
  key: ScanEngineSortKey,
  order: ScanEngineSortOrder,
): PrivateScanAsset[] {
  const direction:
    1 | -1 =
      order === "asc"
        ? 1
        : -1;

  return [...data].sort(
    (
      leftAsset,
      rightAsset,
    ) => {
      const leftValue =
        key === "price"
          ? leftAsset.price
          : leftAsset
              .stability_score;

      const rightValue =
        key === "price"
          ? rightAsset.price
          : rightAsset
              .stability_score;

      const valueComparison =
        compareNullableNumbers(
          leftValue,
          rightValue,
          direction,
        );

      if (
        valueComparison !== 0
      ) {
        return valueComparison;
      }

      const symbolComparison =
        leftAsset.symbol.localeCompare(
          rightAsset.symbol,
          "en",
          {
            sensitivity:
              "base",
          },
        );

      if (
        symbolComparison !== 0
      ) {
        return symbolComparison;
      }

      return leftAsset.id.localeCompare(
        rightAsset.id,
        "en",
        {
          sensitivity:
            "base",
        },
      );
    },
  );
}

/* ============================================================================
 * 10. PRIVATE SCAN EXECUTION
 * ----------------------------------------------------------------------------
 * ROLE
 * - apply canonical RFS propagation
 * - perform deterministic internal ordering
 * - build private market context
 *
 * DIRECTIVES
 * - no public projection
 * - no Impulse policy
 * - no calibration policy
 * - no ranking score creation
 * - no mutation
 * ========================================================================== */

export function buildScanEngineResult(
  input: Readonly<{
    data:
      readonly PrivateScanAsset[];

    key?:
      ScanEngineSortKey;

    order?:
      ScanEngineSortOrder;
  }>,
): ScanEngineResult {
  const enriched =
    applyRFS(
      input.data,
    );

  const sorted =
    sortAssets(
      enriched,

      input.key ??
        "stability",

      input.order ??
        "desc",
    );

  return {
    data:
      sorted,

    market_context:
      buildMarketContext(
        sorted,
      ),
  };
}
