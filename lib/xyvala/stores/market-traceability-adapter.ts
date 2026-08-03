/* ============================================================================
 * FILE: lib/xyvala/stores/market-traceability-adapter.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical private market traceability adapter
 *
 * ROLE
 * - validate canonical private market evaluations
 * - project already-computed analytical truths into PrivateScanAsset
 * - preserve strict ownership, identity and lineage of private variables
 * - expose the unique MarketEvaluation -> PrivateScanAsset adaptation boundary
 *
 * CLASSIFICATION
 * - PRIVATE ADAPTER
 * - READ / VALIDATE / PROJECT
 * - no analytical COMPUTE
 * - no public projection
 * - no MUTATE
 *
 * PARENTS
 * - lib/xyvala/services/raw-assets-service.ts
 * - lib/xyvala/mapping/coingecko-mapper.ts
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/engine/mci-market.ts
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/factories/scan-asset-factory.ts
 *
 * UPSTREAM
 * - lib/xyvala/services/raw-assets-service.ts
 * - lib/xyvala/mapping/coingecko-mapper.ts
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/engine/mci-market.ts
 *
 * DOWNSTREAM
 * - lib/xyvala/factories/scan-asset-factory.ts
 * - lib/xyvala/stores/traceability-store-orchestrator.ts
 * - lib/xyvala/services/scan-transformer.ts
 *
 * INPUTS
 * - canonical CoinGeckoMappedAsset
 * - canonical RFS market result
 * - canonical MCI market result
 * - canonical execution timestamp
 * - canonical analytical version
 * - canonical source identity
 *
 * OUTPUTS
 * - canonical PrivateScanAsset contracts
 * - deterministic adaptation counts
 * - deterministic private warnings
 *
 * DIRECTIVES
 * - private adapter only
 * - no API logic
 * - no UI logic
 * - no snapshot writing
 * - no public exposure
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no Analytical Aggregation recomputation
 * - no MCI recomputation
 * - no calibration computation
 * - no prediction
 * - no investment semantics
 * - no provider alias resolution
 * - no multi-source analytical fallback
 * - no synthetic identity
 * - no synthetic analytical version
 * - no runtime timestamp generation
 * - no silent repair
 * - no semantic renaming
 * - no cross-layer value replacement
 * - no root-contract fallback
 * - no MCI fallback for Impulse Layer variables
 * - null means explicitly unavailable
 * - undefined must never be propagated
 * - READ -> VALIDATE -> PROJECT
 *
 * OWNERSHIP
 * - mapped observable values
 *   <- CoinGeckoMappedAsset
 *
 * - structural truths
 *   <- marketRfs canonical contracts
 *
 * - structural transition
 *   <- marketRfs.structural_transition
 *
 * - Triple Layer truths
 *   <- marketRfs.triple_layer
 *
 * - Impulse Layer truths
 *   <- marketRfs.impulse
 *
 * - regime and continuity truths
 *   <- marketRfs.states / marketRfs.probabilities
 *
 * - decision, opportunity, confidence and neutralization truths
 *   <- marketMci canonical contracts
 *
 * - execution metadata
 *   <- MarketTraceabilityEvaluation
 *
 * INVARIANTS
 * - one private variable has one official producer
 * - one canonical field has one canonical location
 * - the adapter never searches alternative owners
 * - the adapter never repairs missing canonical metadata
 * - the adapter never generates analytical truth
 * - the adapter never generates analytical metadata
 * - the adapter never reads the local clock
 * - MCI never replaces an unavailable RFS truth
 * - MCI never replaces an unavailable Triple Layer truth
 * - MCI never replaces an unavailable Impulse Layer truth
 * - missing canonical identity causes rejection
 * - invalid quote causes rejection
 * - missing analytical version causes rejection
 * - missing generated_at causes rejection
 * - invalid source causes rejection
 * - same canonical evaluation produces the same PrivateScanAsset
 * - every rejected evaluation exposes its first invalid boundary
 * - warnings are deterministic and deduplicated
 *
 * CRITICAL DEPENDENCIES
 * - scan-private-contract.ts
 * - scan-asset-factory.ts
 * - coingecko-mapper.ts
 * - rfs-market.ts
 * - mci-market.ts
 *
 * SENSITIVE ZONES
 * - canonical identity
 * - canonical metadata
 * - analytical ownership
 * - structural-transition propagation
 * - Triple Layer propagation
 * - Impulse Layer propagation
 * - MCI private truth propagation
 * - private warning propagation
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

import type {
  PrivateScanAsset,
} from "@/lib/xyvala/contracts/scan-private-contract";

import type {
  CoinGeckoMappedAsset,
} from "@/lib/xyvala/mapping/coingecko-mapper";

import type {
  runRfsMarket,
} from "@/lib/xyvala/engine/rfs-market";

import type {
  runMciMarket,
} from "@/lib/xyvala/engine/mci-market";

import {
  buildPrivateScanAsset,
} from "@/lib/xyvala/factories/scan-asset-factory";

/* ============================================================================
 * 1. CANONICAL TYPES
 * ========================================================================== */

type MarketRfsResult =
  ReturnType<typeof runRfsMarket>;

type MarketMciResult =
  ReturnType<typeof runMciMarket>;

export type MarketTraceabilitySource =
  "scan";

export type MarketTraceabilityEvaluation = {
  mapped: CoinGeckoMappedAsset;

  marketRfs: MarketRfsResult;
  marketMci: MarketMciResult;

  /**
   * Canonical metadata produced by the orchestration owner.
   *
   * These fields are mandatory.
   * The adapter never generates or replaces them.
   */
  generated_at: string;
  analytical_version: string;
  source: MarketTraceabilitySource;
};

export type MarketTraceabilityAdapterResult = {
  ok: boolean;

  assets: PrivateScanAsset[];

  count: number;
  rejected_count: number;

  warnings: string[];
};

type CanonicalIdentity = {
  id: string;
  symbol: string;
  name: string;
};

type CanonicalMetadata = {
  analyticalVersion: string;
  generatedAt: string;
  source: MarketTraceabilitySource;
};

type EvaluationRejectionReason =
  | "invalid_evaluation_contract"
  | "canonical_identity_missing"
  | "canonical_quote_invalid"
  | "canonical_generated_at_missing"
  | "canonical_generated_at_invalid"
  | "canonical_analytical_version_missing"
  | "canonical_source_invalid"
  | "private_asset_projection_failed";

type AdaptationSuccess = {
  ok: true;

  asset: PrivateScanAsset;

  warnings: string[];
};

type AdaptationFailure = {
  ok: false;

  asset: null;

  reason: EvaluationRejectionReason;

  warnings: string[];
};

type AdaptationResult =
  | AdaptationSuccess
  | AdaptationFailure;

/* ============================================================================
 * 2. VERSION
 * ========================================================================== */

export const MARKET_TRACEABILITY_ADAPTER_VERSION =
  "3.0.0" as const;

/* ============================================================================
 * 3. SAFE PRIMITIVE HELPERS
 * ========================================================================== */

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOwn(
  source: Record<string, unknown>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    source,
    key,
  );
}

function readExact(
  source: Record<string, unknown>,
  key: string,
): unknown {
  return hasOwn(source, key)
    ? source[key]
    : null;
}

function readExactRecord(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value =
    readExact(
      source,
      key,
    );

  return isPlainObject(value)
    ? value
    : {};
}

function readCanonicalValue(
  source: Record<string, unknown>,
  key: string,
): unknown {
  const value =
    readExact(
      source,
      key,
    );

  return value === undefined
    ? null
    : value;
}

function normalizeRequiredString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function isValidIsoTimestamp(
  value: string,
): boolean {
  const timestamp =
    Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  /*
   * Validation only.
   *
   * The original upstream representation is preserved.
   * The adapter does not rewrite the canonical timestamp.
   */
  return true;
}

function normalizeCanonicalQuote(
  value: unknown,
): Quote | null {
  if (value === "eur") {
    return "eur";
  }

  if (value === "usd") {
    return "usd";
  }

  if (value === "usdt") {
    return "usdt";
  }

  return null;
}

function compareDeterministicStrings(
  left: string,
  right: string,
): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function uniqueWarnings(
  ...groups: Array<
    readonly string[] | undefined | null
  >
): string[] {
  const normalized =
    groups
      .flatMap((group) =>
        Array.isArray(group)
          ? group
          : [],
      )
      .filter(
        (warning): warning is string =>
          typeof warning === "string",
      )
      .map((warning) =>
        warning.trim(),
      )
      .filter(
        (warning) =>
          warning.length > 0,
      );

  return [
    ...new Set(normalized),
  ].sort(compareDeterministicStrings);
}

function readWarnings(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (warning): warning is string =>
        typeof warning === "string",
    )
    .map((warning) =>
      warning.trim(),
    )
    .filter(
      (warning) =>
        warning.length > 0,
    );
}

function hasContractContent(
  value: Record<string, unknown>,
): boolean {
  return Object.keys(value).length > 0;
}

/* ============================================================================
 * 4. EVALUATION CONTRACT VALIDATION
 * ----------------------------------------------------------------------------
 * This validator protects the MarketEvaluation -> PrivateScanAsset boundary.
 *
 * It validates the complete mandatory transport contract.
 * It does not validate every analytical value, which remains the responsibility
 * of its canonical producer contract and the PrivateScanAsset factory.
 * ========================================================================== */

function isMarketTraceabilityEvaluation(
  value: unknown,
): value is MarketTraceabilityEvaluation {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!isPlainObject(value.mapped)) {
    return false;
  }

  if (!isPlainObject(value.marketRfs)) {
    return false;
  }

  if (!isPlainObject(value.marketMci)) {
    return false;
  }

  if (
    typeof value.generated_at !==
    "string"
  ) {
    return false;
  }

  if (
    typeof value.analytical_version !==
    "string"
  ) {
    return false;
  }

  return value.source === "scan";
}

/* ============================================================================
 * 5. CANONICAL IDENTITY
 * ----------------------------------------------------------------------------
 * Identity is accepted only from canonical mapped fields.
 *
 * The adapter validates and propagates.
 * It does not:
 * - derive an identifier
 * - alter canonical casing
 * - create UNKNOWN values
 * - use provider aliases
 * ========================================================================== */

function readCanonicalIdentity(
  mapped: CoinGeckoMappedAsset,
): CanonicalIdentity | null {
  const mappedRecord =
    mapped as unknown as Record<
      string,
      unknown
    >;

  const id =
    normalizeRequiredString(
      readExact(
        mappedRecord,
        "canonical_id",
      ),
    );

  const symbol =
    normalizeRequiredString(
      readExact(
        mappedRecord,
        "canonical_symbol",
      ),
    );

  const name =
    normalizeRequiredString(
      readExact(
        mappedRecord,
        "canonical_name",
      ),
    );

  if (!id || !symbol || !name) {
    return null;
  }

  return {
    id,
    symbol,
    name,
  };
}

/* ============================================================================
 * 6. CANONICAL METADATA
 * ----------------------------------------------------------------------------
 * Metadata has one source:
 * - MarketTraceabilityEvaluation
 *
 * Forbidden fallbacks:
 * - marketRfs.generated_at
 * - marketMci.generated_at
 * - mapped.last_updated
 * - marketRfs.analytical_version
 * - marketMci.analytical_version
 * - locally generated metadata
 * ========================================================================== */

function readCanonicalMetadata(
  evaluation: MarketTraceabilityEvaluation,
):
  | {
      ok: true;
      metadata: CanonicalMetadata;
    }
  | {
      ok: false;
      reason: EvaluationRejectionReason;
    } {
  const generatedAt =
    normalizeRequiredString(
      evaluation.generated_at,
    );

  if (!generatedAt) {
    return {
      ok: false,
      reason:
        "canonical_generated_at_missing",
    };
  }

  if (
    !isValidIsoTimestamp(
      generatedAt,
    )
  ) {
    return {
      ok: false,
      reason:
        "canonical_generated_at_invalid",
    };
  }

  const analyticalVersion =
    normalizeRequiredString(
      evaluation.analytical_version,
    );

  if (!analyticalVersion) {
    return {
      ok: false,
      reason:
        "canonical_analytical_version_missing",
    };
  }

  if (evaluation.source !== "scan") {
    return {
      ok: false,
      reason:
        "canonical_source_invalid",
    };
  }

  return {
    ok: true,

    metadata: {
      analyticalVersion,
      generatedAt,
      source:
        evaluation.source,
    },
  };
}

/* ============================================================================
 * 7. CANONICAL MAPPED OBSERVABLES
 * ----------------------------------------------------------------------------
 * CoinGecko mapper is the unique provider normalization boundary.
 *
 * This adapter reads canonical mapped fields exactly.
 * It does not resolve provider aliases or repair invalid values.
 * ========================================================================== */

function readMappedValue(
  mapped: CoinGeckoMappedAsset,
  key: string,
): unknown {
  return readCanonicalValue(
    mapped as unknown as Record<
      string,
      unknown
    >,
    key,
  );
}

/* ============================================================================
 * 8. CANONICAL ANALYTICAL CONTRACT EXTRACTION
 * ----------------------------------------------------------------------------
 * Each analytical domain has one canonical contract location.
 *
 * No root fallback is allowed.
 * No alternative owner is searched.
 * ========================================================================== */

type RfsContracts = {
  metrics: Record<string, unknown>;
  axes: Record<string, unknown>;
  scores: Record<string, unknown>;
  states: Record<string, unknown>;
  probabilities: Record<string, unknown>;
  quality: Record<string, unknown>;

  structuralTransition:
    Record<string, unknown>;

  tripleLayer:
    Record<string, unknown>;

  impulse:
    Record<string, unknown>;

  ruptureEvolution:
    Record<string, unknown>;

  crash:
    Record<string, unknown>;
};

type MciContracts = {
  decision:
    Record<string, unknown>;

  opportunity:
    Record<string, unknown>;

  confidence:
    Record<string, unknown>;

  neutralization:
    Record<string, unknown>;
};

function extractRfsContracts(
  marketRfs: Record<string, unknown>,
): RfsContracts {
  return {
    metrics:
      readExactRecord(
        marketRfs,
        "metrics",
      ),

    axes:
      readExactRecord(
        marketRfs,
        "axes",
      ),

    scores:
      readExactRecord(
        marketRfs,
        "scores",
      ),

    states:
      readExactRecord(
        marketRfs,
        "states",
      ),

    probabilities:
      readExactRecord(
        marketRfs,
        "probabilities",
      ),

    quality:
      readExactRecord(
        marketRfs,
        "quality",
      ),

    structuralTransition:
      readExactRecord(
        marketRfs,
        "structural_transition",
      ),

    tripleLayer:
      readExactRecord(
        marketRfs,
        "triple_layer",
      ),

    impulse:
      readExactRecord(
        marketRfs,
        "impulse",
      ),

    ruptureEvolution:
      readExactRecord(
        marketRfs,
        "rupture_evolution",
      ),

    crash:
      readExactRecord(
        marketRfs,
        "crash",
      ),
  };
}

function extractMciContracts(
  marketMci: Record<string, unknown>,
): MciContracts {
  return {
    decision:
      readExactRecord(
        marketMci,
        "decision",
      ),

    opportunity:
      readExactRecord(
        marketMci,
        "opportunity",
      ),

    confidence:
      readExactRecord(
        marketMci,
        "confidence",
      ),

    neutralization:
      readExactRecord(
        marketMci,
        "neutralization",
      ),
  };
}

/* ============================================================================
 * 9. PRIVATE ADAPTATION
 * ----------------------------------------------------------------------------
 * FIRST DIVERGENCE ORDER
 * 1. canonical identity
 * 2. canonical quote
 * 3. canonical metadata
 * 4. canonical private projection
 *
 * Analytical values missing from their official contracts remain null.
 * They are never reconstructed from another layer.
 * ========================================================================== */

function adaptMarketEvaluation(
  evaluation: MarketTraceabilityEvaluation,
): AdaptationResult {
  /* --------------------------------------------------------------------------
   * BOUNDARY 1
   * Canonical identity
   * ----------------------------------------------------------------------- */

  const identity =
    readCanonicalIdentity(
      evaluation.mapped,
    );

  if (!identity) {
    return {
      ok: false,

      asset: null,

      reason:
        "canonical_identity_missing",

      warnings: [
        "market_traceability_canonical_identity_missing",
      ],
    };
  }

  /* --------------------------------------------------------------------------
   * BOUNDARY 2
   * Canonical quote
   * ----------------------------------------------------------------------- */

  const quote =
    normalizeCanonicalQuote(
      readMappedValue(
        evaluation.mapped,
        "quote",
      ),
    );

  if (!quote) {
    return {
      ok: false,

      asset: null,

      reason:
        "canonical_quote_invalid",

      warnings: [
        "market_traceability_canonical_quote_invalid",
      ],
    };
  }

  /* --------------------------------------------------------------------------
   * BOUNDARY 3
   * Canonical execution metadata
   * ----------------------------------------------------------------------- */

  const metadataResult =
    readCanonicalMetadata(
      evaluation,
    );

  if (!metadataResult.ok) {
    return {
      ok: false,

      asset: null,

      reason:
        metadataResult.reason,

      warnings: [
        `market_traceability_${metadataResult.reason}`,
      ],
    };
  }

  const metadata =
    metadataResult.metadata;

  /* --------------------------------------------------------------------------
   * Canonical analytical contract extraction
   * ----------------------------------------------------------------------- */

  const marketRfs =
    evaluation.marketRfs as unknown as Record<
      string,
      unknown
    >;

  const marketMci =
    evaluation.marketMci as unknown as Record<
      string,
      unknown
    >;

  const rfs =
    extractRfsContracts(
      marketRfs,
    );

  const mci =
    extractMciContracts(
      marketMci,
    );

  /* --------------------------------------------------------------------------
   * Contract-level diagnostics
   *
   * These warnings describe missing canonical contracts.
   * They never create or replace analytical values.
   * ----------------------------------------------------------------------- */

  const adapterWarnings: string[] = [];

  if (
    !hasContractContent(
      rfs.structuralTransition,
    )
  ) {
    adapterWarnings.push(
      "market_traceability_rfs_structural_transition_unavailable",
    );
  }

  if (
    !hasContractContent(
      rfs.tripleLayer,
    )
  ) {
    adapterWarnings.push(
      "market_traceability_rfs_triple_layer_unavailable",
    );
  }

  if (
    !hasContractContent(
      rfs.impulse,
    )
  ) {
    adapterWarnings.push(
      "market_traceability_rfs_impulse_contract_unavailable",
    );
  }

  if (
    !hasContractContent(
      rfs.ruptureEvolution,
    )
  ) {
    adapterWarnings.push(
      "market_traceability_rfs_rupture_evolution_unavailable",
    );
  }

  if (
    !hasContractContent(
      rfs.crash,
    )
  ) {
    adapterWarnings.push(
      "market_traceability_rfs_crash_contract_unavailable",
    );
  }

  if (
    !hasContractContent(
      mci.decision,
    )
  ) {
    adapterWarnings.push(
      "market_traceability_mci_decision_contract_unavailable",
    );
  }

  if (
    !hasContractContent(
      mci.opportunity,
    )
  ) {
    adapterWarnings.push(
      "market_traceability_mci_opportunity_contract_unavailable",
    );
  }

  if (
    !hasContractContent(
      mci.confidence,
    )
  ) {
    adapterWarnings.push(
      "market_traceability_mci_confidence_contract_unavailable",
    );
  }

  if (
    !hasContractContent(
      mci.neutralization,
    )
  ) {
    adapterWarnings.push(
      "market_traceability_mci_neutralization_contract_unavailable",
    );
  }

  const impulseTransitionState =
    readCanonicalValue(
      rfs.impulse,
      "impulse_transition_state",
    );

  const impulseStatus =
    readCanonicalValue(
      rfs.impulse,
      "impulse_status",
    );

  if (impulseTransitionState === null) {
    adapterWarnings.push(
      "market_traceability_impulse_transition_state_unavailable",
    );
  }

  if (impulseStatus === null) {
    adapterWarnings.push(
      "market_traceability_impulse_status_unavailable",
    );
  }

  const warnings =
    uniqueWarnings(
      readWarnings(
        readExact(
          marketRfs,
          "warnings",
        ),
      ),

      readWarnings(
        readExact(
          marketMci,
          "warnings",
        ),
      ),

      adapterWarnings,
    );

  /* --------------------------------------------------------------------------
   * BOUNDARY 4
   * Canonical PrivateScanAsset projection
   *
   * Every value is read from its official contract.
   * Missing values remain null.
   * ----------------------------------------------------------------------- */

  try {
    const asset =
      buildPrivateScanAsset({
        /* ====================================================================
         * IDENTITY
         * ================================================================= */

        id:
          identity.id,

        symbol:
          identity.symbol,

        name:
          identity.name,

        /* ====================================================================
         * CANONICAL MAPPED OBSERVABLES
         * ================================================================= */

        quote,

        price:
          readMappedValue(
            evaluation.mapped,
            "price",
          ),

        chg_24h_pct:
          readMappedValue(
            evaluation.mapped,
            "chg_24h_pct",
          ),

        chg_7d_pct:
          readMappedValue(
            evaluation.mapped,
            "chg_7d_pct",
          ),

        market_cap:
          readMappedValue(
            evaluation.mapped,
            "market_cap",
          ),

        volume_24h:
          readMappedValue(
            evaluation.mapped,
            "volume_24h",
          ),

        sparkline_7d:
          readMappedValue(
            evaluation.mapped,
            "sparkline_7d",
          ),

        rank:
          readMappedValue(
            evaluation.mapped,
            "rank",
          ),

        logo_url:
          readMappedValue(
            evaluation.mapped,
            "logo_url",
          ),

        /* ====================================================================
         * STRUCTURAL TRANSITION
         *
         * OWNER
         * - marketRfs.structural_transition
         * ================================================================= */

        structural_transition:
          hasContractContent(
            rfs.structuralTransition,
          )
            ? rfs.structuralTransition
            : null,

        /* ====================================================================
         * RFS STRUCTURAL SCORES
         *
         * OWNER
         * - marketRfs.scores
         * ================================================================= */

        stability_score:
          readCanonicalValue(
            rfs.scores,
            "stability_score",
          ),

        structure_score:
          readCanonicalValue(
            rfs.scores,
            "structure_score",
          ),

        market_score:
          readCanonicalValue(
            rfs.scores,
            "market_score",
          ),

        coherence_score:
          readCanonicalValue(
            rfs.scores,
            "coherence_score",
          ),

        growth_score:
          readCanonicalValue(
            rfs.scores,
            "growth_score",
          ),

        rupture_score:
          readCanonicalValue(
            rfs.scores,
            "rupture_score",
          ),

        rupture_penalty_score:
          readCanonicalValue(
            rfs.scores,
            "rupture_penalty_score",
          ),

        /* ====================================================================
         * RFS STRUCTURAL STATES
         *
         * OWNER
         * - marketRfs.states
         * ================================================================= */

        stability_status:
          readCanonicalValue(
            rfs.states,
            "stability_status",
          ),

        regime:
          readCanonicalValue(
            rfs.states,
            "regime",
          ),

        /* ====================================================================
         * RFS ANALYTICAL AXES
         *
         * OWNER
         * - marketRfs.axes
         * ================================================================= */

        occurrence_score:
          readCanonicalValue(
            rfs.axes,
            "occurrence_score",
          ),

        frequency_score:
          readCanonicalValue(
            rfs.axes,
            "frequency_score",
          ),

        convergence_score:
          readCanonicalValue(
            rfs.axes,
            "convergence_score",
          ),

        duration_score:
          readCanonicalValue(
            rfs.axes,
            "duration_score",
          ),

        evolution_score:
          readCanonicalValue(
            rfs.axes,
            "evolution_score",
          ),

        /* ====================================================================
         * RFS PROBABILITIES
         *
         * OWNER
         * - marketRfs.probabilities
         * ================================================================= */

        rupture_probability:
          readCanonicalValue(
            rfs.probabilities,
            "rupture_probability",
          ),

        continuity_probability:
          readCanonicalValue(
            rfs.probabilities,
            "continuity_probability",
          ),

        /* ====================================================================
         * RUPTURE EVOLUTION SYSTEM
         *
         * OWNER
         * - marketRfs.rupture_evolution
         * ================================================================= */

        rupture_occurrence_score:
          readCanonicalValue(
            rfs.ruptureEvolution,
            "rupture_occurrence_score",
          ),

        rupture_frequency_score:
          readCanonicalValue(
            rfs.ruptureEvolution,
            "rupture_frequency_score",
          ),

        rupture_convergence_score:
          readCanonicalValue(
            rfs.ruptureEvolution,
            "rupture_convergence_score",
          ),

        rupture_duration_score:
          readCanonicalValue(
            rfs.ruptureEvolution,
            "rupture_duration_score",
          ),

        rupture_evolution_score:
          readCanonicalValue(
            rfs.ruptureEvolution,
            "rupture_evolution_score",
          ),

        rupture_evolution_state:
          readCanonicalValue(
            rfs.ruptureEvolution,
            "rupture_evolution_state",
          ),

        rupture_acceleration_score:
          readCanonicalValue(
            rfs.ruptureEvolution,
            "rupture_acceleration_score",
          ),

        /* ====================================================================
         * CRASH SYSTEM
         *
         * OWNER
         * - marketRfs.crash
         * ================================================================= */

        crash_score:
          readCanonicalValue(
            rfs.crash,
            "crash_score",
          ),

        crash_state:
          readCanonicalValue(
            rfs.crash,
            "crash_state",
          ),

        /* ====================================================================
         * TRIPLE LAYER
         *
         * OWNER
         * - marketRfs.triple_layer
         *
         * The adapter never reads Triple Layer copies from MCI.
         * ================================================================= */

        triple_layer_state:
          readCanonicalValue(
            rfs.tripleLayer,
            "triple_layer_state",
          ),

        growth_layer_score:
          readCanonicalValue(
            rfs.tripleLayer,
            "growth_layer_score",
          ),

        core_pattern_score:
          readCanonicalValue(
            rfs.tripleLayer,
            "core_pattern_score",
          ),

        decay_score:
          readCanonicalValue(
            rfs.tripleLayer,
            "decay_score",
          ),

        /* ====================================================================
         * IMPULSE LAYER
         *
         * UNIQUE OWNER
         * - marketRfs.impulse
         *
         * FORBIDDEN
         * - marketRfs root fallback
         * - marketMci fallback
         * - semantic aliases
         * - status inference
         * - score reconstruction
         * ================================================================= */

        impulse_pressure_score:
          readCanonicalValue(
            rfs.impulse,
            "impulse_pressure_score",
          ),

        impulse_acceleration_score:
          readCanonicalValue(
            rfs.impulse,
            "impulse_acceleration_score",
          ),

        impulse_alignment_score:
          readCanonicalValue(
            rfs.impulse,
            "impulse_alignment_score",
          ),

        impulse_instability_score:
          readCanonicalValue(
            rfs.impulse,
            "impulse_instability_score",
          ),

        impulse_saturation_score:
          readCanonicalValue(
            rfs.impulse,
            "impulse_saturation_score",
          ),

        impulse_exhaustion_score:
          readCanonicalValue(
            rfs.impulse,
            "impulse_exhaustion_score",
          ),

        impulse_directional_bias:
          readCanonicalValue(
            rfs.impulse,
            "impulse_directional_bias",
          ),

        impulse_transition_state:
          impulseTransitionState,

        impulse_status:
          impulseStatus,

        /* ====================================================================
         * NEUTRALIZATION SYSTEM
         *
         * OWNER
         * - marketMci.neutralization
         * ================================================================= */

        neutralized:
          readCanonicalValue(
            mci.neutralization,
            "neutralized",
          ),

        neutralization_reason:
          readCanonicalValue(
            mci.neutralization,
            "neutralization_reason",
          ),

        neutralization_severity:
          readCanonicalValue(
            mci.neutralization,
            "neutralization_severity",
          ),

        neutralization_validity:
          readCanonicalValue(
            mci.neutralization,
            "neutralization_validity",
          ),

        /* ====================================================================
         * DECISION SYSTEM
         *
         * OWNER
         * - marketMci.decision
         * ================================================================= */

        decision:
          readCanonicalValue(
            mci.decision,
            "decision",
          ),

        decision_status:
          readCanonicalValue(
            mci.decision,
            "decision_status",
          ),

        decision_score:
          readCanonicalValue(
            mci.decision,
            "decision_score",
          ),

        /* ====================================================================
         * OPPORTUNITY SYSTEM
         *
         * OWNER
         * - marketMci.opportunity
         * ================================================================= */

        opportunity_score:
          readCanonicalValue(
            mci.opportunity,
            "opportunity_score",
          ),

        opportunity_status:
          readCanonicalValue(
            mci.opportunity,
            "opportunity_status",
          ),

        /* ====================================================================
         * CONFIDENCE SYSTEM
         *
         * OWNER
         * - marketMci.confidence
         * ================================================================= */

        confidence_score:
          readCanonicalValue(
            mci.confidence,
            "confidence_score",
          ),

        confidence_status:
          readCanonicalValue(
            mci.confidence,
            "confidence_status",
          ),

        /* ====================================================================
         * CANONICAL EXECUTION METADATA
         *
         * OWNER
         * - MarketTraceabilityEvaluation
         * ================================================================= */

        analytical_version:
          metadata.analyticalVersion,

        generated_at:
          metadata.generatedAt,

        source:
          metadata.source,

        warnings,
      });

    return {
      ok: true,

      asset,

      warnings,
    };
  } catch {
    return {
      ok: false,

      asset: null,

      reason:
        "private_asset_projection_failed",

      warnings:
        uniqueWarnings(
          warnings,
          [
            "market_traceability_private_asset_projection_failed",
          ],
        ),
    };
  }
}

/* ============================================================================
 * 10. DETERMINISTIC REJECTION REPORTING
 * ----------------------------------------------------------------------------
 * Rejections are aggregated by canonical cause.
 *
 * This prevents one warning per rejected asset while preserving:
 * - rejected count
 * - first rejected index
 * - rejection cause distribution
 * ========================================================================== */

function incrementRejectionCount(
  rejectionCounts:
    Map<EvaluationRejectionReason, number>,
  reason:
    EvaluationRejectionReason,
): void {
  rejectionCounts.set(
    reason,
    (
      rejectionCounts.get(reason) ??
      0
    ) + 1,
  );
}

function buildRejectionWarnings(input: {
  rejectionCounts:
    ReadonlyMap<
      EvaluationRejectionReason,
      number
    >;

  firstRejectedIndex:
    number | null;

  rejectedCount:
    number;
}): string[] {
  if (input.rejectedCount === 0) {
    return [];
  }

  const warnings: string[] = [
    `market_traceability_rejected:${input.rejectedCount}`,
  ];

  if (
    input.firstRejectedIndex !== null
  ) {
    warnings.push(
      `market_traceability_first_rejected_index:${input.firstRejectedIndex}`,
    );
  }

  const reasons =
    [
      ...input.rejectionCounts.entries(),
    ].sort(
      (
        [leftReason],
        [rightReason],
      ) =>
        compareDeterministicStrings(
          leftReason,
          rightReason,
        ),
    );

  for (
    const [
      reason,
      count,
    ] of reasons
  ) {
    warnings.push(
      `market_traceability_rejection:${reason}:${count}`,
    );
  }

  return warnings;
}

/* ============================================================================
 * 11. PRIVATE ADAPTER API
 * ----------------------------------------------------------------------------
 * POLICY
 * - invalid evaluation contracts are rejected
 * - valid evaluations are adapted independently
 * - a partial private universe is explicit
 * - an empty private universe is blocked
 * - no analytical truth is repaired
 * - no rejection is hidden
 * ========================================================================== */

export function adaptMarketEvaluationsToPrivateScanAssets(
  evaluations: readonly unknown[],
): MarketTraceabilityAdapterResult {
  const assets: PrivateScanAsset[] = [];

  const propagatedWarnings: string[] = [];

  const rejectionCounts =
    new Map<
      EvaluationRejectionReason,
      number
    >();

  let rejectedCount = 0;

  let firstRejectedIndex:
    number | null = null;

  for (
    let index = 0;
    index < evaluations.length;
    index += 1
  ) {
    const candidate =
      evaluations[index];

    if (
      !isMarketTraceabilityEvaluation(
        candidate,
      )
    ) {
      rejectedCount += 1;

      if (
        firstRejectedIndex === null
      ) {
        firstRejectedIndex =
          index;
      }

      incrementRejectionCount(
        rejectionCounts,
        "invalid_evaluation_contract",
      );

      continue;
    }

    const adaptation =
      adaptMarketEvaluation(
        candidate,
      );

    propagatedWarnings.push(
      ...adaptation.warnings,
    );

    if (!adaptation.ok) {
      rejectedCount += 1;

      if (
        firstRejectedIndex === null
      ) {
        firstRejectedIndex =
          index;
      }

      incrementRejectionCount(
        rejectionCounts,
        adaptation.reason,
      );

      continue;
    }

    assets.push(
      adaptation.asset,
    );
  }

  const rejectionWarnings =
    buildRejectionWarnings({
      rejectionCounts,
      firstRejectedIndex,
      rejectedCount,
    });

  const resultWarnings: string[] = [
    ...propagatedWarnings,
    ...rejectionWarnings,
  ];

  if (
    evaluations.length === 0
  ) {
    resultWarnings.push(
      "market_traceability_evaluations_empty",
    );
  }

  if (
    assets.length === 0
  ) {
    resultWarnings.push(
      "market_traceability_assets_empty",
    );
  }

  if (
    assets.length > 0 &&
    rejectedCount > 0
  ) {
    resultWarnings.push(
      "market_traceability_partial",
    );
  }

  return {
    ok:
      evaluations.length > 0 &&
      rejectedCount === 0 &&
      assets.length ===
        evaluations.length,

    assets,

    count:
      assets.length,

    rejected_count:
      rejectedCount,

    warnings:
      uniqueWarnings(
        resultWarnings,
      ),
  };
}
