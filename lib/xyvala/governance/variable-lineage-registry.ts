/* ============================================================================
 * FILE: lib/xyvala/governance/variable-lineage-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical variable lineage registry
 *
 * ROLE
 * - define the unique canonical registry of governed Xyvala variables
 * - declare variable identity, ownership, source truth and contracts
 * - declare canonical propagation and legitimate runtime observation paths
 * - distinguish canonical existence from active runtime availability
 * - distinguish required, optional, blocked and out-of-scope variables
 * - support Contract Before Runtime, Boundary Protection, Propagation Audit
 *   and First Divergence diagnostics
 *
 * PARENTS
 * - lib/xyvala/governance/governance-layer-order.ts
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/services/scan-transformer.ts
 *
 * CLASSIFICATION
 * - GOVERNANCE
 * - OBSERVE / VALIDATE
 * - deterministic read-only registry
 *
 * DIRECTIVES
 * - no analytical computation
 * - no market computation
 * - no RFS computation
 * - no Triple Layer computation
 * - no Impulse Layer computation
 * - no Analytical Aggregation computation
 * - no MCI computation
 * - no calibration computation
 * - no snapshot construction
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no cache logic
 * - no persistence
 * - no runtime mutation
 * - no inferred variable identity
 * - no silent contract repair
 * - no local analytical alias creation
 * - no automatic activation of undemonstrated variables
 *
 * INPUTS
 * - canonical variable definitions
 * - GovernanceLayer contract
 *
 * OUTPUTS
 * - canonical variable lineage registry
 * - active registry views
 * - required and optional runtime views
 * - private scan runtime view
 * - public projection view
 * - boundary views
 * - deterministic validation result
 *
 * INVARIANTS
 * - one variable has one canonical identity
 * - one variable has one official owner
 * - one variable has one official source of truth
 * - one variable has one official producer contract
 * - canonical existence does not imply runtime availability
 * - ACTIVE does not imply REQUIRED
 * - BLOCKED does not mean deleted
 * - OUT_OF_SCOPE does not mean deprecated
 * - canonical propagation does not prove runtime observation
 * - runtime observation does not change variable ownership
 * - producer and runtime contracts remain distinct
 * - every canonical path contains the owner and source truth
 * - every downstream consumer belongs to the canonical path
 * - every runtime observation remains inside the canonical path
 * - no private variable is publicly exposable
 * - no public projection reconstructs an upstream analytical truth
 * - blocked and deprecated variables cannot be runtime-required
 * - undefined is never a governed business value
 * - registry declarations are rejected rather than silently repaired
 *
 * CRITICAL DEPENDENCIES
 * - GovernanceLayer names
 * - PrivateScanAsset field identities
 * - ScanAsset public field identities
 * - RFS producer field identities
 * - Triple Layer producer field identities
 * - Impulse Layer producer field identities
 * - MCI producer field identities
 *
 * SENSITIVE ZONES
 * - variable identity
 * - variable ownership
 * - source truth
 * - producer/runtime contract distinction
 * - private/public exposure
 * - runtime requirement
 * - runtime scope
 * - canonical propagation
 * - public projection dependencies
 * ========================================================================== */

import type {
  GovernanceLayer,
} from "@/lib/xyvala/governance/governance-layer-order";

/* ============================================================================
 * 1. GOVERNANCE TYPES
 * ========================================================================== */

export type VariableCriticalityLevel =
  | "CORE_TRUTH"
  | "STRUCTURAL_SUPPORT"
  | "AGGREGATED_CONTEXT"
  | "PROJECTION_VARIABLE"
  | "CALIBRATION_VARIABLE";

export type VariableExposureLevel =
  | "PRIVATE"
  | "INTERNAL"
  | "PUBLIC";

export type VariableLineageStatus =
  | "ACTIVE"
  | "BLOCKED"
  | "DEPRECATED";

export type VariableLineageStatusReason =
  | "PRODUCER_NOT_IMPLEMENTED"
  | "PRODUCTION_NOT_DEMONSTRATED"
  | "RUNTIME_CONTRACT_NOT_DEMONSTRATED"
  | "MIGRATION_PENDING"
  | "DEPRECATION_PENDING"
  | null;

export type VariableRuntimeRequirement =
  | "REQUIRED"
  | "OPTIONAL"
  | "OUT_OF_SCOPE";

export type VariableRuntimeScope =
  | "PRIVATE_SCAN"
  | "CALIBRATION"
  | "SNAPSHOT"
  | "PUBLIC_PROJECTION"
  | "INTERFACE"
  | "CANONICAL_ONLY";

export type VariableOwnerLayer =
  GovernanceLayer;

export type VariableCategory =
  | "MARKET_INPUT"
  | "STRUCTURAL"
  | "RUPTURE"
  | "CRASH"
  | "TRIPLE_LAYER"
  | "IMPULSE"
  | "AGGREGATION"
  | "DECISION"
  | "NEUTRALIZATION"
  | "CALIBRATION"
  | "SNAPSHOT"
  | "PUBLIC_PROJECTION"
  | "UI_PROJECTION";

export type VariableLineageEntry = {
  variable_name: string;

  /**
   * Layer responsible for producing the governed variable.
   */
  ownership_layer: VariableOwnerLayer;

  /**
   * Analytical layer from which the semantic truth originates.
   *
   * For direct truths, source_truth equals ownership_layer.
   * For public projections, source_truth remains the upstream analytical layer
   * while ownership_layer becomes TRANSFORMER.
   */
  source_truth: VariableOwnerLayer;

  /**
   * Contract or module that produces the variable under its canonical name.
   */
  producer_contract: string;

  /**
   * Contract from which the governed runtime legitimately observes the value.
   */
  runtime_contract: string;

  /**
   * Deprecated compatibility alias.
   *
   * It must always equal runtime_contract.
   */
  contract_source: string;

  category: VariableCategory;
  criticality_level: VariableCriticalityLevel;
  exposure_level: VariableExposureLevel;

  /**
   * Complete canonical lineage route for this exact variable identity.
   *
   * A public projection starts at TRANSFORMER because it is a distinct
   * projection identity. Its analytical source is declared by source_truth and
   * upstream_dependencies.
   */
  canonical_propagation_path:
    readonly VariableOwnerLayer[];

  /**
   * Layers from which runtime traces may legitimately report this exact
   * variable identity.
   *
   * This path is explicit and must never be inferred from the canonical path.
   */
  runtime_observation_path:
    readonly VariableOwnerLayer[];

  /**
   * Deprecated compatibility alias.
   *
   * It always mirrors canonical_propagation_path.
   */
  propagation_path:
    readonly VariableOwnerLayer[];

  upstream_dependencies:
    readonly string[];

  downstream_consumers:
    readonly VariableOwnerLayer[];

  runtime_scope:
    VariableRuntimeScope;

  runtime_requirement:
    VariableRuntimeRequirement;

  reconstruction_allowed: false;
  public_exposure_allowed: boolean;
  validation_required: true;

  lineage_status:
    VariableLineageStatus;

  lineage_status_reason:
    VariableLineageStatusReason;

  protocol_reference:
    readonly string[];
};

export type VariableLineageValidationResult = {
  ok: boolean;

  checked_count: number;

  active_count: number;
  blocked_count: number;
  deprecated_count: number;

  required_count: number;
  optional_count: number;
  out_of_scope_count: number;

  violation_count: number;
  warning_count: number;
  information_count: number;

  warnings: string[];
  violations: string[];
  information: string[];
};

export type VariableLineageBoundary = {
  from_layer: GovernanceLayer;
  to_layer: GovernanceLayer;
};

export type VariableBoundaryScope =
  | "CANONICAL"
  | "ACTIVE"
  | "REQUIRED_RUNTIME"
  | "PRIVATE_SCAN_RUNTIME";

export type VariableLineageBoundaryView = {
  scope: VariableBoundaryScope;

  boundary:
    Readonly<VariableLineageBoundary>;

  variables:
    readonly Readonly<VariableLineageEntry>[];
};

export type PrivateScanRuntimeVariableOptions = {
  include_optional?: boolean;
};

/* ============================================================================
 * 2. CANONICAL CONTRACT SOURCES
 * ========================================================================== */

const CONTRACT_SOURCE =
  Object.freeze({
    COINGECKO_MAPPER:
      "coingecko-mapper",

    RAW_ASSETS_SERVICE:
      "raw-assets-service",

    RFS_MARKET:
      "rfs-market",

    CRASH_SYSTEM:
      "crash-system",

    TRIPLE_LAYER:
      "triple-layer",

    IMPULSE_STATE_CORE:
      "impulse-state-core",

    ANALYTICAL_AGGREGATION:
      "analytical-aggregation",

    MCI_MARKET:
      "mci-market",

    CALIBRATION_SAMPLE_CONTRACTS:
      "calibration-sample-contracts",

    CALIBRATION:
      "calibration",

    SCAN_PRIVATE_CONTRACT:
      "scan-private-contract",

    SCAN_TRANSFORMER:
      "scan-transformer",

    SCAN_CONTRACT:
      "scan-contract",

    SNAPSHOT:
      "snapshot",

    UI:
      "ui",
  } as const);

/* ============================================================================
 * 3. CANONICAL LAYER ORDER
 * ----------------------------------------------------------------------------
 * This order validates propagation direction only.
 *
 * Crash System remains an independent analytical branch positioned before
 * Analytical Aggregation and MCI.
 *
 * Neutralization remains MCI-owned until a distinct upstream producer contract
 * is demonstrated.
 * ========================================================================== */

const CANONICAL_LAYER_ORDER =
  Object.freeze([
    "ACQUISITION",
    "RFS",
    "CRASH_SYSTEM",
    "TRIPLE_LAYER",
    "IMPULSE_LAYER",
    "ANALYTICAL_AGGREGATION_SYSTEM",
    "MCI",
    "CALIBRATION",
    "SNAPSHOT",
    "TRANSFORMER",
    "API",
    "INTERFACE",
  ] as const satisfies readonly GovernanceLayer[]);

const CANONICAL_LAYER_INDEX =
  new Map<GovernanceLayer, number>(
    CANONICAL_LAYER_ORDER.map(
      (layer, index) => [
        layer,
        index,
      ],
    ),
  );

/* ============================================================================
 * 4. SAFE HELPERS
 * ========================================================================== */

function safeString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function freezeStrings(
  values: readonly string[],
): readonly string[] {
  return Object.freeze([
    ...values,
  ]);
}

function freezeLayers(
  values:
    readonly GovernanceLayer[],
): readonly GovernanceLayer[] {
  return Object.freeze([
    ...values,
  ]);
}

function uniqueStrings(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values
        .map(safeString)
        .filter(
          (value) =>
            value.length > 0,
        ),
    ),
  ].sort();
}

function listDuplicateStrings(
  values: readonly string[],
): string[] {
  const seen =
    new Set<string>();

  const duplicates =
    new Set<string>();

  for (const rawValue of values) {
    const value =
      safeString(rawValue);

    if (!value) {
      continue;
    }

    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [
    ...duplicates,
  ].sort();
}

function listDuplicateLayers(
  values:
    readonly GovernanceLayer[],
): GovernanceLayer[] {
  const seen =
    new Set<GovernanceLayer>();

  const duplicates =
    new Set<GovernanceLayer>();

  for (const layer of values) {
    if (seen.has(layer)) {
      duplicates.add(layer);
    }

    seen.add(layer);
  }

  return [
    ...duplicates,
  ];
}

function freezeEntry<
  const Name extends string,
>(
  input:
    VariableLineageEntry & {
      variable_name: Name;
    },
): Readonly<
  VariableLineageEntry & {
    variable_name: Name;
  }
> {
  return Object.freeze({
    ...input,

    canonical_propagation_path:
      freezeLayers(
        input
          .canonical_propagation_path,
      ),

    runtime_observation_path:
      freezeLayers(
        input
          .runtime_observation_path,
      ),

    propagation_path:
      freezeLayers(
        input
          .canonical_propagation_path,
      ),

    upstream_dependencies:
      freezeStrings(
        input.upstream_dependencies,
      ),

    downstream_consumers:
      freezeLayers(
        input.downstream_consumers,
      ),

    protocol_reference:
      freezeStrings(
        input.protocol_reference,
      ),
  });
}

function entry<
  const Name extends string,
>(
  input:
    Omit<
      VariableLineageEntry,
      "propagation_path"
    > & {
      variable_name: Name;
    },
): Readonly<
  VariableLineageEntry & {
    variable_name: Name;
  }
> {
  return freezeEntry({
    ...input,

    propagation_path:
      input
        .canonical_propagation_path,
  });
}

function defineVariableGroup<
  const Names extends
    readonly string[],
>(input: {
  variable_names: Names;

  ownership_layer:
    VariableOwnerLayer;

  source_truth?:
    VariableOwnerLayer;

  producer_contract:
    string;

  runtime_contract:
    string;

  category:
    VariableCategory;

  criticality_level:
    VariableCriticalityLevel;

  exposure_level:
    VariableExposureLevel;

  canonical_propagation_path:
    readonly GovernanceLayer[];

  runtime_observation_path:
    readonly GovernanceLayer[];

  upstream_dependencies:
    | readonly string[]
    | ((
        variableName:
          Names[number],
      ) => readonly string[]);

  downstream_consumers:
    readonly GovernanceLayer[];

  runtime_scope:
    VariableRuntimeScope;

  runtime_requirement:
    | VariableRuntimeRequirement
    | ((
        variableName:
          Names[number],
      ) =>
        VariableRuntimeRequirement);

  public_exposure_allowed?:
    boolean;

  lineage_status?:
    VariableLineageStatus;

  lineage_status_reason?:
    VariableLineageStatusReason;

  protocol_reference:
    readonly string[];
}): readonly Readonly<
  VariableLineageEntry & {
    variable_name:
      Names[number];
  }
>[] {
  return Object.freeze(
    input.variable_names.map(
      (variableName) =>
        entry({
          variable_name:
            variableName,

          ownership_layer:
            input.ownership_layer,

          source_truth:
            input.source_truth ??
            input.ownership_layer,

          producer_contract:
            input.producer_contract,

          runtime_contract:
            input.runtime_contract,

          contract_source:
            input.runtime_contract,

          category:
            input.category,

          criticality_level:
            input.criticality_level,

          exposure_level:
            input.exposure_level,

          canonical_propagation_path:
            input
              .canonical_propagation_path,

          runtime_observation_path:
            input
              .runtime_observation_path,

          upstream_dependencies:
            typeof input
              .upstream_dependencies ===
            "function"
              ? input
                  .upstream_dependencies(
                    variableName,
                  )
              : input
                  .upstream_dependencies,

          downstream_consumers:
            input
              .downstream_consumers,

          runtime_scope:
            input.runtime_scope,

          runtime_requirement:
            typeof input
              .runtime_requirement ===
            "function"
              ? input
                  .runtime_requirement(
                    variableName,
                  )
              : input
                  .runtime_requirement,

          reconstruction_allowed:
            false,

          public_exposure_allowed:
            input
              .public_exposure_allowed ??
            false,

          validation_required:
            true,

          lineage_status:
            input.lineage_status ??
            "ACTIVE",

          lineage_status_reason:
            input
              .lineage_status_reason ??
            null,

          protocol_reference:
            input
              .protocol_reference,
        }),
    ),
  );
}

function pathContainsBoundary(
  propagationPath:
    readonly GovernanceLayer[],
  fromLayer:
    GovernanceLayer,
  toLayer:
    GovernanceLayer,
): boolean {
  for (
    let index = 0;
    index <
    propagationPath.length - 1;
    index += 1
  ) {
    if (
      propagationPath[index] ===
        fromLayer &&
      propagationPath[index + 1] ===
        toLayer
    ) {
      return true;
    }
  }

  return false;
}

function isPathOrdered(
  path:
    readonly GovernanceLayer[],
): boolean {
  let previousIndex = -1;

  for (const layer of path) {
    const currentIndex =
      CANONICAL_LAYER_INDEX.get(
        layer,
      );

    if (
      currentIndex === undefined ||
      currentIndex < previousIndex
    ) {
      return false;
    }

    previousIndex =
      currentIndex;
  }

  return true;
}

function isRuntimeActiveEntry(
  registryEntry:
    Readonly<VariableLineageEntry>,
): boolean {
  return (
    registryEntry.lineage_status ===
      "ACTIVE" &&
    registryEntry.runtime_requirement !==
      "OUT_OF_SCOPE" &&
    registryEntry.runtime_scope !==
      "CANONICAL_ONLY"
  );
}

function isRequiredRuntimeEntry(
  registryEntry:
    Readonly<VariableLineageEntry>,
): boolean {
  return (
    isRuntimeActiveEntry(
      registryEntry,
    ) &&
    registryEntry.runtime_requirement ===
      "REQUIRED"
  );
}

function isOptionalRuntimeEntry(
  registryEntry:
    Readonly<VariableLineageEntry>,
): boolean {
  return (
    isRuntimeActiveEntry(
      registryEntry,
    ) &&
    registryEntry.runtime_requirement ===
      "OPTIONAL"
  );
}

/* ============================================================================
 * 5. ACQUISITION VARIABLES
 * ----------------------------------------------------------------------------
 * These names match the canonical mapped/private contracts.
 *
 * Currency remains explicit through quote.
 * Monetary variables are therefore not renamed locally to *_eur.
 * ========================================================================== */

const MARKET_INPUT_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "id",
      "symbol",
      "name",
      "quote",
      "price",
      "chg_24h_pct",
      "chg_7d_pct",
      "sparkline_7d",
      "market_cap",
      "volume_24h",
      "rank",
      "logo_url",
    ] as const,

    ownership_layer:
      "ACQUISITION",

    producer_contract:
      CONTRACT_SOURCE
        .COINGECKO_MAPPER,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "MARKET_INPUT",

    criticality_level:
      "STRUCTURAL_SUPPORT",

    exposure_level:
      "INTERNAL",

    canonical_propagation_path: [
      "ACQUISITION",
      "RFS",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "SNAPSHOT",
      "TRANSFORMER",
      "API",
      "INTERFACE",
    ],

    runtime_observation_path: [
      "ACQUISITION",
    ],

    upstream_dependencies: [],

    downstream_consumers: [
      "RFS",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "SNAPSHOT",
      "TRANSFORMER",
      "API",
      "INTERFACE",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      (variableName) => {
        switch (variableName) {
          case "id":
          case "symbol":
          case "quote":
          case "price":
          case "sparkline_7d":
            return "REQUIRED";

          default:
            return "OPTIONAL";
        }
      },

    protocol_reference: [
      "Data Acquisition",
      "France and European Union Compatibility",
      "Variable Governance System",
      "Contract Before Runtime Rule",
    ],
  });

/* ============================================================================
 * 6. RFS CORE VARIABLES
 * ========================================================================== */

const RFS_CORE_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "stability_score",
      "regime",
      "rupture_score",
      "rupture_probability",
      "continuity_probability",
    ] as const,

    ownership_layer:
      "RFS",

    producer_contract:
      CONTRACT_SOURCE.RFS_MARKET,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "STRUCTURAL",

    criticality_level:
      "CORE_TRUTH",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "RFS",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_observation_path: [
      "RFS",
    ],

    upstream_dependencies:
      (variableName) => {
        switch (variableName) {
          case "stability_score":
            return [
              "price",
              "sparkline_7d",
            ];

          case "regime":
            return [
              "stability_score",
              "rupture_score",
            ];

          case "rupture_score":
            return [
              "sparkline_7d",
              "chg_24h_pct",
              "chg_7d_pct",
            ];

          case "rupture_probability":
            return [
              "rupture_score",
            ];

          case "continuity_probability":
            return [
              "stability_score",
              "rupture_score",
            ];

          default:
            return [];
        }
      },

    downstream_consumers: [
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      "REQUIRED",

    protocol_reference: [
      "RFS — Structural Truth",
      "Variable Governance System",
      "Variable Lineage and Traceability",
      "Propagation Audit Rule",
    ],
  });

/* ============================================================================
 * 7. RFS SUPPORT VARIABLES
 * ========================================================================== */

const RFS_SUPPORT_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "stability_status",
      "structure_score",
      "market_score",
      "coherence_score",
      "occurrence_score",
      "frequency_score",
      "convergence_score",
      "duration_score",
      "evolution_score",
      "growth_score",
    ] as const,

    ownership_layer:
      "RFS",

    producer_contract:
      CONTRACT_SOURCE.RFS_MARKET,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "STRUCTURAL",

    criticality_level:
      "STRUCTURAL_SUPPORT",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "RFS",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
    ],

    runtime_observation_path: [
      "RFS",
    ],

    upstream_dependencies:
      (variableName) => {
        if (
          variableName ===
          "stability_status"
        ) {
          return [
            "stability_score",
          ];
        }

        return [
          "price",
          "sparkline_7d",
        ];
      },

    downstream_consumers: [
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      (variableName) =>
        variableName ===
        "structure_score"
          ? "REQUIRED"
          : "OPTIONAL",

    protocol_reference: [
      "RFS — Structural Truth",
      "Mandatory Analytical Axes",
      "Controlled Degradation",
      "Propagation Audit Rule",
    ],
  });

const STRUCTURAL_TRANSITION_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "structural_transition",
    ] as const,

    ownership_layer:
      "RFS",

    producer_contract:
      CONTRACT_SOURCE.RFS_MARKET,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "STRUCTURAL",

    criticality_level:
      "CORE_TRUTH",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "RFS",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
      "TRANSFORMER",
    ],

    runtime_observation_path: [
      "RFS",
    ],

    upstream_dependencies: [
      "stability_score",
      "regime",
      "rupture_score",
      "chg_24h_pct",
      "chg_7d_pct",
    ],

    downstream_consumers: [
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
      "TRANSFORMER",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      "REQUIRED",

    protocol_reference: [
      "Transition Governance System",
      "RFS — Structural Truth",
      "Public Projection Validation",
      "First Divergence Rule",
    ],
  });

const RFS_RUPTURE_SUPPORT_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "rupture_penalty_score",
      "rupture_occurrence_score",
      "rupture_frequency_score",
      "rupture_convergence_score",
      "rupture_duration_score",
      "rupture_evolution_score",
      "rupture_evolution_state",
      "rupture_acceleration_score",
    ] as const,

    ownership_layer:
      "RFS",

    producer_contract:
      CONTRACT_SOURCE.RFS_MARKET,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "RUPTURE",

    criticality_level:
      "STRUCTURAL_SUPPORT",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "RFS",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
    ],

    runtime_observation_path: [
      "RFS",
    ],

    upstream_dependencies: [
      "rupture_score",
      "rupture_probability",
    ],

    downstream_consumers: [
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      "OPTIONAL",

    protocol_reference: [
      "Rupture Evolution System",
      "Variable Governance System",
      "Controlled Degradation",
      "Propagation Audit Rule",
    ],
  });

/* ============================================================================
 * 8. CRASH SYSTEM VARIABLES
 * ========================================================================== */

const CRASH_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "crash_score",
      "crash_state",
    ] as const,

    ownership_layer:
      "CRASH_SYSTEM",

    producer_contract:
      CONTRACT_SOURCE.CRASH_SYSTEM,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "CRASH",

    criticality_level:
      "CORE_TRUTH",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "CRASH_SYSTEM",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_observation_path: [
      "CRASH_SYSTEM",
    ],

    upstream_dependencies:
      (variableName) =>
        variableName ===
        "crash_score"
          ? [
              "rupture_score",
              "rupture_probability",
            ]
          : [
              "crash_score",
            ],

    downstream_consumers: [
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      "REQUIRED",

    protocol_reference: [
      "Crash System",
      "Analytical Hierarchy",
      "First Divergence Rule",
      "Public Exposure Governance System",
    ],
  });

/* ============================================================================
 * 9. TRIPLE LAYER VARIABLES
 * ----------------------------------------------------------------------------
 * Names match PrivateScanAsset and adapter identities.
 *
 * No growth_layer/core_pattern_layer/decay_layer aliases are introduced.
 * ========================================================================== */

const TRIPLE_LAYER_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "triple_layer_state",
      "growth_layer_score",
      "core_pattern_score",
      "decay_score",
    ] as const,

    ownership_layer:
      "TRIPLE_LAYER",

    producer_contract:
      CONTRACT_SOURCE.TRIPLE_LAYER,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "TRIPLE_LAYER",

    criticality_level:
      "STRUCTURAL_SUPPORT",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "TRIPLE_LAYER",
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
    ],

    runtime_observation_path: [
      "TRIPLE_LAYER",
    ],

    upstream_dependencies:
      (variableName) => {
        switch (variableName) {
          case "triple_layer_state":
            return [
              "growth_layer_score",
              "core_pattern_score",
              "decay_score",
            ];

          case "growth_layer_score":
          case "core_pattern_score":
            return [
              "stability_score",
              "regime",
            ];

          case "decay_score":
            return [
              "stability_score",
              "rupture_score",
            ];

          default:
            return [];
        }
      },

    downstream_consumers: [
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      (variableName) =>
        variableName ===
        "triple_layer_state"
          ? "OPTIONAL"
          : "REQUIRED",

    protocol_reference: [
      "Triple Layer System",
      "Triple Layer Contextualization",
      "Variable Governance System",
      "Contract Before Runtime Rule",
    ],
  });

/* ============================================================================
 * 10. IMPULSE LAYER VARIABLES
 * ========================================================================== */

const IMPULSE_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "impulse_pressure_score",
      "impulse_acceleration_score",
      "impulse_alignment_score",
      "impulse_instability_score",
      "impulse_saturation_score",
      "impulse_exhaustion_score",
      "impulse_directional_bias",
      "impulse_transition_state",
      "impulse_status",
    ] as const,

    ownership_layer:
      "IMPULSE_LAYER",

    producer_contract:
      CONTRACT_SOURCE
        .IMPULSE_STATE_CORE,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "IMPULSE",

    criticality_level:
      "STRUCTURAL_SUPPORT",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
      "TRANSFORMER",
    ],

    runtime_observation_path: [
      "IMPULSE_LAYER",
    ],

    upstream_dependencies:
      (variableName) => {
        switch (variableName) {
          case "impulse_pressure_score":
            return [
              "stability_score",
              "rupture_score",
              "growth_layer_score",
              "core_pattern_score",
              "decay_score",
            ];

          case "impulse_acceleration_score":
            return [
              "impulse_pressure_score",
            ];

          case "impulse_alignment_score":
            return [
              "impulse_pressure_score",
              "growth_layer_score",
              "core_pattern_score",
            ];

          case "impulse_instability_score":
            return [
              "rupture_score",
              "rupture_probability",
            ];

          case "impulse_saturation_score":
            return [
              "impulse_pressure_score",
              "rupture_score",
            ];

          case "impulse_exhaustion_score":
            return [
              "impulse_saturation_score",
              "decay_score",
            ];

          case "impulse_directional_bias":
            return [
              "impulse_pressure_score",
              "impulse_alignment_score",
            ];

          case "impulse_transition_state":
          case "impulse_status":
            return [
              "impulse_pressure_score",
              "impulse_acceleration_score",
              "impulse_alignment_score",
              "impulse_instability_score",
              "impulse_saturation_score",
              "impulse_exhaustion_score",
            ];

          default:
            return [];
        }
      },

    downstream_consumers: [
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
      "TRANSFORMER",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      (variableName) => {
        switch (variableName) {
          case "impulse_pressure_score":
          case "impulse_instability_score":
          case "impulse_saturation_score":
          case "impulse_exhaustion_score":
          case "impulse_directional_bias":
          case "impulse_transition_state":
            return "REQUIRED";

          default:
            return "OPTIONAL";
        }
      },

    protocol_reference: [
      "Impulse Layer System",
      "Impulse Propagation System",
      "Governance of Impulse Variables",
      "Controlled Degradation",
    ],
  });

/* ============================================================================
 * 11. ANALYTICAL AGGREGATION VARIABLES
 * ----------------------------------------------------------------------------
 * These variables remain canonically registered but runtime-blocked until:
 *
 * - the producer implementation is demonstrated
 * - the producer contract is validated
 * - PrivateScanAsset or another authorized runtime contract transports them
 *
 * They must not be reconstructed by MCI, snapshot, transformer, API or UI.
 * ========================================================================== */

const AGGREGATED_CONTEXT_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "structural_context",
      "transition_context",
      "risk_context",
      "temporal_context",
    ] as const,

    ownership_layer:
      "ANALYTICAL_AGGREGATION_SYSTEM",

    producer_contract:
      CONTRACT_SOURCE
        .ANALYTICAL_AGGREGATION,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "AGGREGATION",

    criticality_level:
      "AGGREGATED_CONTEXT",

    exposure_level:
      "INTERNAL",

    canonical_propagation_path: [
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_observation_path: [],

    upstream_dependencies:
      (variableName) => {
        switch (variableName) {
          case "structural_context":
            return [
              "stability_score",
              "regime",
              "rupture_score",
              "rupture_probability",
              "rupture_evolution_state",
            ];

          case "transition_context":
            return [
              "growth_layer_score",
              "core_pattern_score",
              "decay_score",
              "impulse_transition_state",
              "impulse_directional_bias",
            ];

          case "risk_context":
            return [
              "crash_score",
              "crash_state",
              "neutralized",
              "neutralization_severity",
              "rupture_evolution_state",
            ];

          case "temporal_context":
            return [
              "chg_24h_pct",
              "chg_7d_pct",
              "sparkline_7d",
            ];

          default:
            return [];
        }
      },

    downstream_consumers: [
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_scope:
      "CANONICAL_ONLY",

    runtime_requirement:
      "OUT_OF_SCOPE",

    lineage_status:
      "BLOCKED",

    lineage_status_reason:
      "PRODUCTION_NOT_DEMONSTRATED",

    protocol_reference: [
      "Analytical Aggregation System",
      "Governance of Aggregated Contexts",
      "Contract Before Runtime Rule",
      "First Divergence Rule",
    ],
  });

/* ============================================================================
 * 12. MCI DECISION VARIABLES
 * ========================================================================== */

const MCI_DECISION_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "decision",
      "decision_status",
      "decision_score",
      "opportunity_score",
      "opportunity_status",
      "confidence_score",
      "confidence_status",
    ] as const,

    ownership_layer:
      "MCI",

    producer_contract:
      CONTRACT_SOURCE.MCI_MARKET,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "DECISION",

    criticality_level:
      "CORE_TRUTH",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_observation_path: [
      "MCI",
    ],

    upstream_dependencies:
      (variableName) => {
        switch (variableName) {
          case "decision":
            return [
              "stability_score",
              "regime",
              "rupture_score",
              "crash_state",
              "impulse_transition_state",
            ];

          case "decision_status":
          case "decision_score":
            return [
              "decision",
            ];

          case "opportunity_score":
          case "opportunity_status":
            return [
              "decision",
              "stability_score",
              "convergence_score",
            ];

          case "confidence_score":
          case "confidence_status":
            return [
              "decision",
              "stability_score",
              "convergence_score",
            ];

          default:
            return [];
        }
      },

    downstream_consumers: [
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      (variableName) =>
        variableName === "decision"
          ? "REQUIRED"
          : "OPTIONAL",

    protocol_reference: [
      "MCI — Private Decision Orchestration",
      "Analytical Hierarchy",
      "Controlled Degradation",
      "Public Exposure Governance System",
    ],
  });

/* ============================================================================
 * 13. NEUTRALIZATION VARIABLES
 * ----------------------------------------------------------------------------
 * Neutralization remains MCI-owned until a separate upstream producer is
 * contractually demonstrated.
 * ========================================================================== */

const MCI_NEUTRALIZATION_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "neutralized",
      "neutralization_reason",
      "neutralization_severity",
      "neutralization_validity",
    ] as const,

    ownership_layer:
      "MCI",

    producer_contract:
      CONTRACT_SOURCE.MCI_MARKET,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_PRIVATE_CONTRACT,

    category:
      "NEUTRALIZATION",

    criticality_level:
      "STRUCTURAL_SUPPORT",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_observation_path: [
      "MCI",
    ],

    upstream_dependencies: [
      "decision",
      "confidence_score",
      "rupture_score",
      "crash_state",
    ],

    downstream_consumers: [
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_scope:
      "PRIVATE_SCAN",

    runtime_requirement:
      "OPTIONAL",

    protocol_reference: [
      "Neutralization System",
      "Controlled Degradation",
      "MCI — Private Decision Orchestration",
      "Public Exposure Governance System",
    ],
  });

/* ============================================================================
 * 14. MCI CANONICAL PENDING VARIABLES
 * ========================================================================== */

const MCI_PENDING_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "allow_raw_score",
      "block_raw_score",
      "decision_support_probability",
      "risk_rupture_probability",
      "decision_reason",
    ] as const,

    ownership_layer:
      "MCI",

    producer_contract:
      CONTRACT_SOURCE.MCI_MARKET,

    runtime_contract:
      CONTRACT_SOURCE
        .CALIBRATION_SAMPLE_CONTRACTS,

    category:
      "DECISION",

    criticality_level:
      "STRUCTURAL_SUPPORT",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "MCI",
      "CALIBRATION",
    ],

    runtime_observation_path: [],

    upstream_dependencies:
      (variableName) => {
        switch (variableName) {
          case "allow_raw_score":
            return [
              "decision_score",
              "opportunity_score",
              "confidence_score",
            ];

          case "block_raw_score":
            return [
              "decision_score",
              "rupture_score",
              "rupture_probability",
            ];

          case "decision_support_probability":
            return [
              "decision_score",
              "confidence_score",
              "convergence_score",
            ];

          case "risk_rupture_probability":
            return [
              "rupture_score",
              "rupture_probability",
              "risk_context",
            ];

          case "decision_reason":
            return [
              "decision",
              "decision_score",
            ];

          default:
            return [];
        }
      },

    downstream_consumers: [
      "CALIBRATION",
    ],

    runtime_scope:
      "CANONICAL_ONLY",

    runtime_requirement:
      "OUT_OF_SCOPE",

    lineage_status:
      "BLOCKED",

    lineage_status_reason:
      "PRODUCTION_NOT_DEMONSTRATED",

    protocol_reference: [
      "MCI — Private Decision Orchestration",
      "Calibration",
      "Contract Before Runtime Rule",
      "Canonical Registry Completeness",
    ],
  });

/* ============================================================================
 * 15. CALIBRATION VARIABLES
 * ========================================================================== */

const CALIBRATION_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "calibration_allow_threshold",
      "calibration_watch_threshold",
      "calibration_block_threshold",
      "calibration_status",
      "calibration_source",
      "calibration_version",
    ] as const,

    ownership_layer:
      "CALIBRATION",

    producer_contract:
      CONTRACT_SOURCE.CALIBRATION,

    runtime_contract:
      CONTRACT_SOURCE.CALIBRATION,

    category:
      "CALIBRATION",

    criticality_level:
      "CALIBRATION_VARIABLE",

    exposure_level:
      "PRIVATE",

    canonical_propagation_path: [
      "CALIBRATION",
      "SNAPSHOT",
    ],

    runtime_observation_path: [],

    upstream_dependencies:
      (variableName) => {
        switch (variableName) {
          case "calibration_allow_threshold":
            return [
              "decision",
              "decision_score",
              "allow_raw_score",
            ];

          case "calibration_watch_threshold":
            return [
              "decision",
              "decision_score",
            ];

          case "calibration_block_threshold":
            return [
              "decision",
              "decision_score",
              "block_raw_score",
            ];

          default:
            return [
              "decision",
              "decision_status",
            ];
        }
      },

    downstream_consumers: [
      "SNAPSHOT",
    ],

    runtime_scope:
      "CALIBRATION",

    runtime_requirement:
      "OUT_OF_SCOPE",

    lineage_status:
      "BLOCKED",

    lineage_status_reason:
      "RUNTIME_CONTRACT_NOT_DEMONSTRATED",

    protocol_reference: [
      "Calibration",
      "Variable Governance System",
      "Contract Before Runtime Rule",
      "Public Exposure Governance System",
    ],
  });

/* ============================================================================
 * 16. PUBLIC PROJECTION VARIABLES
 * ----------------------------------------------------------------------------
 * Public projection variables are distinct identities produced by TRANSFORMER.
 *
 * They depend on already-computed private truths.
 * They never depend on raw observables to reconstruct analytical states.
 * ========================================================================== */

const PUBLIC_PROJECTION_VARIABLES =
  defineVariableGroup({
    variable_names: [
      "public_stability_score",
      "public_impulse_context",
      "public_structure_transition",
    ] as const,

    ownership_layer:
      "TRANSFORMER",

    source_truth:
      "RFS",

    producer_contract:
      CONTRACT_SOURCE
        .SCAN_TRANSFORMER,

    runtime_contract:
      CONTRACT_SOURCE
        .SCAN_CONTRACT,

    category:
      "PUBLIC_PROJECTION",

    criticality_level:
      "PROJECTION_VARIABLE",

    exposure_level:
      "PUBLIC",

    canonical_propagation_path: [
      "TRANSFORMER",
      "API",
      "INTERFACE",
    ],

    runtime_observation_path: [
      "TRANSFORMER",
      "API",
      "INTERFACE",
    ],

    upstream_dependencies:
      (variableName) => {
        switch (variableName) {
          case "public_stability_score":
            return [
              "stability_score",
            ];

          case "public_impulse_context":
            return [
              "impulse_transition_state",
            ];

          case "public_structure_transition":
            return [
              "structural_transition",
            ];

          default:
            return [];
        }
      },

    downstream_consumers: [
      "API",
      "INTERFACE",
    ],

    runtime_scope:
      "PUBLIC_PROJECTION",

    runtime_requirement:
      "REQUIRED",

    public_exposure_allowed:
      true,

    protocol_reference: [
      "Public Projection Validation",
      "Public Exposure Governance System",
      "Private Calculates, Public Displays",
      "Transform Without Reconstruction",
    ],
  });

/* ============================================================================
 * 17. UI PROJECTION VARIABLES
 * ----------------------------------------------------------------------------
 * No analytical UI-owned variable is registered.
 *
 * The interface may render or translate a public enum visually, but it must not
 * become the owner of a new analytical truth.
 * ========================================================================== */

const UI_PROJECTION_VARIABLES =
  Object.freeze(
    [] as readonly Readonly<
      VariableLineageEntry
    >[],
  );

/* ============================================================================
 * 18. CANONICAL UNIFIED REGISTRY
 * ========================================================================== */

export const VARIABLE_LINEAGE_REGISTRY =
  Object.freeze([
    ...MARKET_INPUT_VARIABLES,

    ...RFS_CORE_VARIABLES,
    ...RFS_SUPPORT_VARIABLES,
    ...STRUCTURAL_TRANSITION_VARIABLES,
    ...RFS_RUPTURE_SUPPORT_VARIABLES,

    ...CRASH_VARIABLES,

    ...TRIPLE_LAYER_VARIABLES,

    ...IMPULSE_VARIABLES,

    ...AGGREGATED_CONTEXT_VARIABLES,

    ...MCI_DECISION_VARIABLES,
    ...MCI_NEUTRALIZATION_VARIABLES,
    ...MCI_PENDING_VARIABLES,

    ...CALIBRATION_VARIABLES,

    ...PUBLIC_PROJECTION_VARIABLES,

    ...UI_PROJECTION_VARIABLES,
  ]);

/* ============================================================================
 * 19. DERIVED TYPES
 * ========================================================================== */

export type VariableName =
  (typeof VARIABLE_LINEAGE_REGISTRY)[number]["variable_name"];

/* ============================================================================
 * 20. DERIVED REGISTRY VIEWS
 * ========================================================================== */

export const ACTIVE_VARIABLE_LINEAGE_REGISTRY =
  Object.freeze(
    VARIABLE_LINEAGE_REGISTRY.filter(
      (registryEntry) =>
        registryEntry.lineage_status ===
        "ACTIVE",
    ),
  );

export const RUNTIME_ACTIVE_VARIABLE_LINEAGE_REGISTRY =
  Object.freeze(
    ACTIVE_VARIABLE_LINEAGE_REGISTRY.filter(
      isRuntimeActiveEntry,
    ),
  );

export const REQUIRED_RUNTIME_VARIABLE_LINEAGE_REGISTRY =
  Object.freeze(
    RUNTIME_ACTIVE_VARIABLE_LINEAGE_REGISTRY.filter(
      isRequiredRuntimeEntry,
    ),
  );

export const OPTIONAL_RUNTIME_VARIABLE_LINEAGE_REGISTRY =
  Object.freeze(
    RUNTIME_ACTIVE_VARIABLE_LINEAGE_REGISTRY.filter(
      isOptionalRuntimeEntry,
    ),
  );

export const BLOCKED_VARIABLE_LINEAGE_REGISTRY =
  Object.freeze(
    VARIABLE_LINEAGE_REGISTRY.filter(
      (registryEntry) =>
        registryEntry.lineage_status ===
        "BLOCKED",
    ),
  );

export const DEPRECATED_VARIABLE_LINEAGE_REGISTRY =
  Object.freeze(
    VARIABLE_LINEAGE_REGISTRY.filter(
      (registryEntry) =>
        registryEntry.lineage_status ===
        "DEPRECATED",
    ),
  );

/* ============================================================================
 * 21. READ-ONLY INDEXES
 * ========================================================================== */

const VARIABLE_LINEAGE_BY_NAME_INTERNAL =
  new Map<
    string,
    Readonly<VariableLineageEntry>
  >();

const VARIABLE_LINEAGE_BY_OWNER_INTERNAL =
  new Map<
    GovernanceLayer,
    Readonly<VariableLineageEntry>[]
  >();

const VARIABLE_LINEAGE_BY_CATEGORY_INTERNAL =
  new Map<
    VariableCategory,
    Readonly<VariableLineageEntry>[]
  >();

const VARIABLE_LINEAGE_BY_RUNTIME_SCOPE_INTERNAL =
  new Map<
    VariableRuntimeScope,
    Readonly<VariableLineageEntry>[]
  >();

for (
  const registryEntry of
  VARIABLE_LINEAGE_REGISTRY
) {
  VARIABLE_LINEAGE_BY_NAME_INTERNAL.set(
    registryEntry.variable_name,
    registryEntry,
  );

  const ownerEntries =
    VARIABLE_LINEAGE_BY_OWNER_INTERNAL.get(
      registryEntry.ownership_layer,
    ) ?? [];

  ownerEntries.push(
    registryEntry,
  );

  VARIABLE_LINEAGE_BY_OWNER_INTERNAL.set(
    registryEntry.ownership_layer,
    ownerEntries,
  );

  const categoryEntries =
    VARIABLE_LINEAGE_BY_CATEGORY_INTERNAL.get(
      registryEntry.category,
    ) ?? [];

  categoryEntries.push(
    registryEntry,
  );

  VARIABLE_LINEAGE_BY_CATEGORY_INTERNAL.set(
    registryEntry.category,
    categoryEntries,
  );

  const scopeEntries =
    VARIABLE_LINEAGE_BY_RUNTIME_SCOPE_INTERNAL.get(
      registryEntry.runtime_scope,
    ) ?? [];

  scopeEntries.push(
    registryEntry,
  );

  VARIABLE_LINEAGE_BY_RUNTIME_SCOPE_INTERNAL.set(
    registryEntry.runtime_scope,
    scopeEntries,
  );
}

/* ============================================================================
 * 22. READ-ONLY HELPERS
 * ========================================================================== */

export function listVariableLineageEntries():
  readonly Readonly<VariableLineageEntry>[] {
  return VARIABLE_LINEAGE_REGISTRY;
}

export function listActiveVariableLineageEntries():
  readonly Readonly<VariableLineageEntry>[] {
  return ACTIVE_VARIABLE_LINEAGE_REGISTRY;
}

export function listRuntimeActiveVariableLineageEntries():
  readonly Readonly<VariableLineageEntry>[] {
  return RUNTIME_ACTIVE_VARIABLE_LINEAGE_REGISTRY;
}

export function listRequiredRuntimeVariableLineageEntries():
  readonly Readonly<VariableLineageEntry>[] {
  return REQUIRED_RUNTIME_VARIABLE_LINEAGE_REGISTRY;
}

export function listOptionalRuntimeVariableLineageEntries():
  readonly Readonly<VariableLineageEntry>[] {
  return OPTIONAL_RUNTIME_VARIABLE_LINEAGE_REGISTRY;
}

export function listPrivateScanRuntimeVariableLineageEntries(
  options:
    PrivateScanRuntimeVariableOptions = {},
): readonly Readonly<VariableLineageEntry>[] {
  const includeOptional =
    options.include_optional ??
    false;

  return Object.freeze(
    ACTIVE_VARIABLE_LINEAGE_REGISTRY.filter(
      (registryEntry) => {
        if (
          registryEntry.runtime_scope !==
          "PRIVATE_SCAN"
        ) {
          return false;
        }

        if (
          registryEntry
            .runtime_observation_path
            .length === 0
        ) {
          return false;
        }

        if (
          registryEntry.runtime_requirement ===
          "REQUIRED"
        ) {
          return true;
        }

        return (
          includeOptional &&
          registryEntry.runtime_requirement ===
            "OPTIONAL"
        );
      },
    ),
  );
}

export function listBlockedVariableLineageEntries():
  readonly Readonly<VariableLineageEntry>[] {
  return BLOCKED_VARIABLE_LINEAGE_REGISTRY;
}

export function listDeprecatedVariableLineageEntries():
  readonly Readonly<VariableLineageEntry>[] {
  return DEPRECATED_VARIABLE_LINEAGE_REGISTRY;
}

export function getVariableLineageEntry(
  variableName: string,
): Readonly<VariableLineageEntry> | null {
  return (
    VARIABLE_LINEAGE_BY_NAME_INTERNAL.get(
      safeString(variableName),
    ) ??
    null
  );
}

export function hasVariableLineageEntry(
  variableName: string,
): boolean {
  return VARIABLE_LINEAGE_BY_NAME_INTERNAL.has(
    safeString(variableName),
  );
}

export function isVariableRuntimeActive(
  variableName: string,
): boolean {
  const registryEntry =
    getVariableLineageEntry(
      variableName,
    );

  return (
    registryEntry !== null &&
    isRuntimeActiveEntry(
      registryEntry,
    )
  );
}

export function isVariableRuntimeRequired(
  variableName: string,
): boolean {
  const registryEntry =
    getVariableLineageEntry(
      variableName,
    );

  return (
    registryEntry !== null &&
    isRequiredRuntimeEntry(
      registryEntry,
    )
  );
}

export function listVariablesByOwner(
  layer: GovernanceLayer,
): readonly Readonly<VariableLineageEntry>[] {
  return Object.freeze([
    ...(
      VARIABLE_LINEAGE_BY_OWNER_INTERNAL.get(
        layer,
      ) ??
      []
    ),
  ]);
}

export function listVariablesByCategory(
  category: VariableCategory,
): readonly Readonly<VariableLineageEntry>[] {
  return Object.freeze([
    ...(
      VARIABLE_LINEAGE_BY_CATEGORY_INTERNAL.get(
        category,
      ) ??
      []
    ),
  ]);
}

export function listVariablesByRuntimeScope(
  scope: VariableRuntimeScope,
): readonly Readonly<VariableLineageEntry>[] {
  return Object.freeze([
    ...(
      VARIABLE_LINEAGE_BY_RUNTIME_SCOPE_INTERNAL.get(
        scope,
      ) ??
      []
    ),
  ]);
}

export function listCanonicalPublicVariables():
  readonly Readonly<VariableLineageEntry>[] {
  return Object.freeze(
    VARIABLE_LINEAGE_REGISTRY.filter(
      (registryEntry) =>
        registryEntry.exposure_level ===
          "PUBLIC" &&
        registryEntry
          .public_exposure_allowed,
    ),
  );
}

export function listPublicVariables():
  readonly Readonly<VariableLineageEntry>[] {
  return Object.freeze(
    ACTIVE_VARIABLE_LINEAGE_REGISTRY.filter(
      (registryEntry) =>
        registryEntry.exposure_level ===
          "PUBLIC" &&
        registryEntry
          .public_exposure_allowed,
    ),
  );
}

export function listCanonicalPrivateVariables():
  readonly Readonly<VariableLineageEntry>[] {
  return Object.freeze(
    VARIABLE_LINEAGE_REGISTRY.filter(
      (registryEntry) =>
        registryEntry.exposure_level ===
        "PRIVATE",
    ),
  );
}

export function listPrivateVariables():
  readonly Readonly<VariableLineageEntry>[] {
  return Object.freeze(
    ACTIVE_VARIABLE_LINEAGE_REGISTRY.filter(
      (registryEntry) =>
        registryEntry.exposure_level ===
        "PRIVATE",
    ),
  );
}

/* ============================================================================
 * 23. BOUNDARY HELPERS
 * ========================================================================== */

function listEntriesForBoundaryScope(
  scope:
    VariableBoundaryScope,
): readonly Readonly<VariableLineageEntry>[] {
  switch (scope) {
    case "ACTIVE":
      return ACTIVE_VARIABLE_LINEAGE_REGISTRY;

    case "REQUIRED_RUNTIME":
      return REQUIRED_RUNTIME_VARIABLE_LINEAGE_REGISTRY;

    case "PRIVATE_SCAN_RUNTIME":
      return listPrivateScanRuntimeVariableLineageEntries();

    case "CANONICAL":
    default:
      return VARIABLE_LINEAGE_REGISTRY;
  }
}

export function variableCrossesBoundary(
  variableName: string,
  boundary:
    VariableLineageBoundary,
  options?: {
    scope?: VariableBoundaryScope;
    observation_path?: boolean;
  },
): boolean {
  const registryEntry =
    getVariableLineageEntry(
      variableName,
    );

  if (!registryEntry) {
    return false;
  }

  const scope =
    options?.scope ??
    "CANONICAL";

  const scopedEntries =
    listEntriesForBoundaryScope(
      scope,
    );

  if (
    !scopedEntries.includes(
      registryEntry,
    )
  ) {
    return false;
  }

  const path =
    options?.observation_path
      ? registryEntry
          .runtime_observation_path
      : registryEntry
          .canonical_propagation_path;

  return pathContainsBoundary(
    path,
    boundary.from_layer,
    boundary.to_layer,
  );
}

export function listVariablesCrossingBoundary(
  boundary:
    VariableLineageBoundary,
  options?: {
    scope?: VariableBoundaryScope;
    observation_path?: boolean;
    active_only?: boolean;
  },
): readonly Readonly<VariableLineageEntry>[] {
  const scope =
    options?.active_only
      ? "ACTIVE"
      : (
          options?.scope ??
          "CANONICAL"
        );

  const sourceEntries =
    listEntriesForBoundaryScope(
      scope,
    );

  return Object.freeze(
    sourceEntries.filter(
      (registryEntry) => {
        const path =
          options?.observation_path
            ? registryEntry
                .runtime_observation_path
            : registryEntry
                .canonical_propagation_path;

        return pathContainsBoundary(
          path,
          boundary.from_layer,
          boundary.to_layer,
        );
      },
    ),
  );
}

export function buildVariableBoundaryView(
  boundary:
    VariableLineageBoundary,
  options?: {
    scope?: VariableBoundaryScope;
    observation_path?: boolean;
    active_only?: boolean;
  },
): VariableLineageBoundaryView {
  const scope:
    VariableBoundaryScope =
      options?.active_only
        ? "ACTIVE"
        : (
            options?.scope ??
            "CANONICAL"
          );

  return Object.freeze({
    scope,

    boundary:
      Object.freeze({
        ...boundary,
      }),

    variables:
      listVariablesCrossingBoundary(
        boundary,
        {
          scope,

          ...(
            options
              ?.observation_path !==
            undefined
              ? {
                  observation_path:
                    options
                      .observation_path,
                }
              : {}
          ),
        },
      ),
  });
}

/* ============================================================================
 * 24. VALIDATION HELPERS
 * ========================================================================== */

function validatePathDuplicates(input: {
  variableName: string;
  pathName: string;
  path:
    readonly GovernanceLayer[];
  violations: string[];
}): void {
  const duplicateLayers =
    listDuplicateLayers(
      input.path,
    );

  for (
    const duplicateLayer of
    duplicateLayers
  ) {
    input.violations.push(
      [
        "VLR-016",
        "duplicate_layer_in_path",
        input.variableName,
        input.pathName,
        duplicateLayer,
      ].join(":"),
    );
  }
}

function validateStringDuplicates(input: {
  variableName: string;
  fieldName: string;
  values: readonly string[];
  violationCode: string;
  violations: string[];
}): void {
  const duplicateValues =
    listDuplicateStrings(
      input.values,
    );

  for (
    const duplicateValue of
    duplicateValues
  ) {
    input.violations.push(
      [
        input.violationCode,
        `duplicate_${input.fieldName}`,
        input.variableName,
        duplicateValue,
      ].join(":"),
    );
  }
}

/* ============================================================================
 * 25. VALIDATION
 * ========================================================================== */

export function validateVariableLineageRegistry():
  VariableLineageValidationResult {
  const warnings: string[] = [];
  const violations: string[] = [];
  const information: string[] = [];

  const names =
    new Set<string>();

  for (
    const registryEntry of
    VARIABLE_LINEAGE_REGISTRY
  ) {
    const variableName =
      safeString(
        registryEntry.variable_name,
      );

    if (!variableName) {
      violations.push(
        "VLR-000:empty_variable_name",
      );

      continue;
    }

    if (names.has(variableName)) {
      violations.push(
        `VLR-001:duplicate_variable:${variableName}`,
      );
    }

    names.add(variableName);

    if (
      registryEntry
        .reconstruction_allowed !==
      false
    ) {
      violations.push(
        `VLR-002:reconstruction_allowed:${variableName}`,
      );
    }

    if (
      registryEntry
        .validation_required !==
      true
    ) {
      violations.push(
        `VLR-003:validation_not_required:${variableName}`,
      );
    }

    if (
      registryEntry
        .canonical_propagation_path
        .length === 0
    ) {
      violations.push(
        `VLR-004:empty_canonical_propagation:${variableName}`,
      );
    }

    if (
      !registryEntry
        .canonical_propagation_path
        .includes(
          registryEntry
            .ownership_layer,
        )
    ) {
      violations.push(
        `VLR-005:owner_not_in_canonical_path:${variableName}`,
      );
    }

    const sourceTruthInCanonicalPath =
      registryEntry
        .canonical_propagation_path
        .includes(
          registryEntry.source_truth,
        );

    const isProjectionVariable =
      registryEntry.category ===
        "PUBLIC_PROJECTION" ||
      registryEntry.category ===
        "UI_PROJECTION";

    /*
     * Projection variables may have an upstream source_truth that is not part
     * of the new projection identity's own path.
     *
     * Their source must instead be declared as an upstream dependency.
     */
    if (
      !sourceTruthInCanonicalPath &&
      !isProjectionVariable
    ) {
      violations.push(
        `VLR-006:source_truth_not_in_canonical_path:${variableName}`,
      );
    }

    if (
      registryEntry
        .public_exposure_allowed &&
      registryEntry.exposure_level ===
        "PRIVATE"
    ) {
      violations.push(
        `VLR-007:private_variable_public:${variableName}`,
      );
    }

    if (
      registryEntry.exposure_level ===
        "PUBLIC" &&
      !registryEntry
        .public_exposure_allowed
    ) {
      violations.push(
        `VLR-008:public_variable_not_exposable:${variableName}`,
      );
    }

    if (
      registryEntry
        .upstream_dependencies
        .includes(variableName)
    ) {
      violations.push(
        `VLR-009:self_dependency:${variableName}`,
      );
    }

    const ownerIndex =
      registryEntry
        .canonical_propagation_path
        .indexOf(
          registryEntry
            .ownership_layer,
        );

    for (
      const consumer of
      registryEntry
        .downstream_consumers
    ) {
      if (
        !registryEntry
          .canonical_propagation_path
          .includes(consumer)
      ) {
        violations.push(
          `VLR-010:consumer_not_in_canonical_path:${variableName}:${consumer}`,
        );

        continue;
      }

      const consumerIndex =
        registryEntry
          .canonical_propagation_path
          .indexOf(consumer);

      if (
        ownerIndex >= 0 &&
        consumerIndex >= 0 &&
        consumerIndex < ownerIndex
      ) {
        violations.push(
          `VLR-011:consumer_before_owner:${variableName}:${consumer}`,
        );
      }
    }

    if (
      safeString(
        registryEntry
          .producer_contract,
      ).length === 0
    ) {
      violations.push(
        `VLR-012:empty_producer_contract:${variableName}`,
      );
    }

    if (
      safeString(
        registryEntry
          .runtime_contract,
      ).length === 0
    ) {
      violations.push(
        `VLR-013:empty_runtime_contract:${variableName}`,
      );
    }

    if (
      registryEntry
        .contract_source !==
      registryEntry
        .runtime_contract
    ) {
      violations.push(
        `VLR-014:contract_source_alias_mismatch:${variableName}`,
      );
    }

    if (
      !isPathOrdered(
        registryEntry
          .canonical_propagation_path,
      )
    ) {
      violations.push(
        `VLR-015:invalid_canonical_layer_order:${variableName}`,
      );
    }

    if (
      registryEntry
        .runtime_observation_path
        .length > 0 &&
      !isPathOrdered(
        registryEntry
          .runtime_observation_path,
      )
    ) {
      violations.push(
        `VLR-016:invalid_runtime_layer_order:${variableName}`,
      );
    }

    validatePathDuplicates({
      variableName,

      pathName:
        "canonical_propagation_path",

      path:
        registryEntry
          .canonical_propagation_path,

      violations,
    });

    validatePathDuplicates({
      variableName,

      pathName:
        "runtime_observation_path",

      path:
        registryEntry
          .runtime_observation_path,

      violations,
    });

    validateStringDuplicates({
      variableName,

      fieldName:
        "dependency",

      values:
        registryEntry
          .upstream_dependencies,

      violationCode:
        "VLR-017",

      violations,
    });

    const duplicateConsumers =
      listDuplicateLayers(
        registryEntry
          .downstream_consumers,
      );

    for (
      const duplicateConsumer of
      duplicateConsumers
    ) {
      violations.push(
        [
          "VLR-018",
          "duplicate_consumer",
          variableName,
          duplicateConsumer,
        ].join(":"),
      );
    }

    validateStringDuplicates({
      variableName,

      fieldName:
        "protocol_reference",

      values:
        registryEntry
          .protocol_reference,

      violationCode:
        "VLR-019",

      violations,
    });

    for (
      const observedLayer of
      registryEntry
        .runtime_observation_path
    ) {
      if (
        !registryEntry
          .canonical_propagation_path
          .includes(observedLayer)
      ) {
        violations.push(
          `VLR-020:runtime_layer_not_in_canonical_path:${variableName}:${observedLayer}`,
        );
      }
    }

    if (
      registryEntry
        .runtime_requirement ===
        "REQUIRED" &&
      registryEntry
        .runtime_observation_path
        .length === 0
    ) {
      violations.push(
        `VLR-021:required_variable_without_runtime_path:${variableName}`,
      );
    }

    if (
      registryEntry
        .runtime_requirement ===
        "OUT_OF_SCOPE" &&
      registryEntry
        .runtime_observation_path
        .length > 0
    ) {
      violations.push(
        `VLR-022:out_of_scope_variable_has_runtime_path:${variableName}`,
      );
    }

    if (
      registryEntry.runtime_scope ===
        "CANONICAL_ONLY" &&
      registryEntry
        .runtime_requirement !==
        "OUT_OF_SCOPE"
    ) {
      violations.push(
        `VLR-023:canonical_only_variable_runtime_required:${variableName}`,
      );
    }

    if (
      registryEntry.lineage_status !==
        "ACTIVE" &&
      registryEntry
        .runtime_requirement !==
        "OUT_OF_SCOPE"
    ) {
      violations.push(
        `VLR-024:inactive_variable_runtime_enabled:${variableName}`,
      );
    }

    if (
      registryEntry.lineage_status ===
        "ACTIVE" &&
      registryEntry
        .lineage_status_reason !==
        null
    ) {
      violations.push(
        `VLR-025:active_variable_has_block_reason:${variableName}`,
      );
    }

    if (
      registryEntry.lineage_status !==
        "ACTIVE" &&
      registryEntry
        .lineage_status_reason ===
        null
    ) {
      violations.push(
        `VLR-026:inactive_variable_without_reason:${variableName}`,
      );
    }

    if (
      registryEntry.runtime_scope ===
        "PRIVATE_SCAN" &&
      registryEntry
        .runtime_observation_path
        .some(
          (layer) =>
            layer === "TRANSFORMER" ||
            layer === "API" ||
            layer === "INTERFACE",
        )
    ) {
      violations.push(
        `VLR-027:private_scan_crosses_public_runtime_boundary:${variableName}`,
      );
    }

    if (
      registryEntry.runtime_scope ===
        "PUBLIC_PROJECTION" &&
      registryEntry.exposure_level !==
        "PUBLIC"
    ) {
      violations.push(
        `VLR-028:public_projection_not_public:${variableName}`,
      );
    }

    if (
      registryEntry.category ===
        "PUBLIC_PROJECTION" &&
      registryEntry.ownership_layer !==
        "TRANSFORMER"
    ) {
      violations.push(
        `VLR-029:public_projection_not_transformer_owned:${variableName}`,
      );
    }

    if (
      registryEntry.category ===
        "PUBLIC_PROJECTION" &&
      registryEntry.producer_contract !==
        CONTRACT_SOURCE
          .SCAN_TRANSFORMER
    ) {
      violations.push(
        `VLR-030:public_projection_invalid_producer:${variableName}`,
      );
    }

    if (
      registryEntry.category ===
        "UI_PROJECTION" &&
      registryEntry
        .criticality_level !==
        "PROJECTION_VARIABLE"
    ) {
      violations.push(
        `VLR-031:ui_projection_analytical_truth:${variableName}`,
      );
    }

    if (
      registryEntry
        .protocol_reference
        .length === 0
    ) {
      warnings.push(
        `VLR-WARN:missing_protocol_reference:${variableName}`,
      );
    }

    for (
      const dependency of
      registryEntry
        .upstream_dependencies
    ) {
      if (
        !VARIABLE_LINEAGE_BY_NAME_INTERNAL.has(
          dependency,
        )
      ) {
        warnings.push(
          `VLR-WARN:unknown_dependency:${variableName}:${dependency}`,
        );
      }
    }

    if (
      registryEntry.lineage_status ===
        "BLOCKED"
    ) {
      information.push(
        [
          "VLR-INFO",
          "blocked_variable",
          variableName,
          registryEntry
            .lineage_status_reason ??
            "unknown",
        ].join(":"),
      );
    }

    if (
      registryEntry.lineage_status ===
        "DEPRECATED"
    ) {
      information.push(
        [
          "VLR-INFO",
          "deprecated_variable",
          variableName,
          registryEntry
            .lineage_status_reason ??
            "unknown",
        ].join(":"),
      );
    }

    if (
      registryEntry
        .runtime_requirement ===
        "OPTIONAL"
    ) {
      information.push(
        `VLR-INFO:optional_runtime_variable:${variableName}`,
      );
    }
  }

  /*
   * Required active variables cannot rely on blocked or deprecated canonical
   * dependencies.
   *
   * This is blocking because the required runtime truth would otherwise depend
   * on a truth that has not been demonstrated.
   */
  for (
    const registryEntry of
    VARIABLE_LINEAGE_REGISTRY
  ) {
    if (
      registryEntry.lineage_status !==
        "ACTIVE" ||
      registryEntry.runtime_requirement !==
        "REQUIRED"
    ) {
      continue;
    }

    for (
      const dependency of
      registryEntry
        .upstream_dependencies
    ) {
      const dependencyEntry =
        VARIABLE_LINEAGE_BY_NAME_INTERNAL.get(
          dependency,
        );

      if (!dependencyEntry) {
        continue;
      }

      if (
        dependencyEntry.lineage_status ===
        "BLOCKED"
      ) {
        violations.push(
          `VLR-032:required_variable_depends_on_blocked_variable:${registryEntry.variable_name}:${dependency}`,
        );
      }

      if (
        dependencyEntry.lineage_status ===
        "DEPRECATED"
      ) {
        violations.push(
          `VLR-033:required_variable_depends_on_deprecated_variable:${registryEntry.variable_name}:${dependency}`,
        );
      }
    }
  }

  const uniqueWarningsList =
    uniqueStrings(warnings);

  const uniqueViolationsList =
    uniqueStrings(violations);

  const uniqueInformationList =
    uniqueStrings(information);

  return {
    ok:
      uniqueViolationsList.length ===
      0,

    checked_count:
      VARIABLE_LINEAGE_REGISTRY.length,

    active_count:
      ACTIVE_VARIABLE_LINEAGE_REGISTRY.length,

    blocked_count:
      BLOCKED_VARIABLE_LINEAGE_REGISTRY.length,

    deprecated_count:
      DEPRECATED_VARIABLE_LINEAGE_REGISTRY.length,

    required_count:
      VARIABLE_LINEAGE_REGISTRY.filter(
        (registryEntry) =>
          registryEntry.runtime_requirement ===
          "REQUIRED",
      ).length,

    optional_count:
      VARIABLE_LINEAGE_REGISTRY.filter(
        (registryEntry) =>
          registryEntry.runtime_requirement ===
          "OPTIONAL",
      ).length,

    out_of_scope_count:
      VARIABLE_LINEAGE_REGISTRY.filter(
        (registryEntry) =>
          registryEntry.runtime_requirement ===
          "OUT_OF_SCOPE",
      ).length,

    violation_count:
      uniqueViolationsList.length,

    warning_count:
      uniqueWarningsList.length,

    information_count:
      uniqueInformationList.length,

    warnings:
      uniqueWarningsList,

    violations:
      uniqueViolationsList,

    information:
      uniqueInformationList,
  };
}

export function assertVariableLineageRegistryValid():
  void {
  const result =
    validateVariableLineageRegistry();

  if (result.ok) {
    return;
  }

  throw new Error(
    [
      "variable_lineage_registry_invalid",
      ...result.violations,
    ].join(":"),
  );
}
