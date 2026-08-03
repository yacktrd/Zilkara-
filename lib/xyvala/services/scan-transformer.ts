/* ============================================================================
 * FILE: lib/xyvala/services/scan-transformer.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical public scan transformer
 *
 * ROLE
 * - project validated private scan assets into the public ScanAsset contract
 * - validate already-public scan assets without analytical reconstruction
 * - map authorized private truths to canonical public-safe labels
 * - preserve observable market values without inventing fallback data
 * - provide one deterministic public projection pipeline
 *
 * CLASSIFICATION
 * - TRANSFORMER
 * - OBSERVE / VALIDATE / PROJECT
 * - no analytical COMPUTE
 * - no MUTATE
 *
 * UPSTREAM
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - private snapshot producers
 * - validated public snapshot producers
 *
 * DOWNSTREAM
 * - lib/xyvala/services/scan-service.ts
 * - public snapshot
 * - public rankings
 * - public APIs
 * - passive interfaces
 *
 * DIRECTIVES
 * - transformer boundary only
 * - public output only
 * - private calculates, public displays
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no Analytical Aggregation recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no decision logic
 * - no opportunity logic
 * - no confidence logic
 * - no rupture probability exposure
 * - no crash-state exposure
 * - no private score exposure
 * - no API shaping
 * - no UI logic
 * - no broker or affiliate exposure
 * - no fake fallback data
 * - no synthetic identity
 * - no silent data repair
 * - no uncontrolled aliases
 * - undefined must never be exposed
 * - null means explicitly unavailable
 * - Unavailable means a public analytical label is unavailable
 * - number means a confirmed observable number
 * - READ -> VALIDATE -> MAP -> PROJECT
 *
 * INPUTS
 * - PrivateScanAsset
 * - ScanAsset
 * - strictly validated Record<string, unknown>
 *
 * OUTPUTS
 * - ScanAsset
 * - ScanTransformerItem
 * - ScanTransformerResult
 *
 * INVARIANTS
 * - public output remains descriptive only
 * - public labels are propagated or explicitly mapped from validated truths
 * - public labels are never reconstructed from observable market fields
 * - global structure never comes from 24H or 7D data
 * - missing structure never becomes neutral
 * - missing identity causes rejection
 * - invalid observable data becomes null
 * - invalid public labels become Unavailable
 * - invalid arrays are rejected, never repaired
 * - private fields never cross the public boundary
 * - every public ScanAsset follows the same canonical projection path
 * - same input + same transformer version => same output
 *
 * PUBLIC LINEAGE
 * - public_structure_transition
 *   <- validated private structural_transition
 *   OR already-propagated public_structure_transition
 *
 * - public_impulse_context
 *   <- validated private impulse_transition_state
 *   OR already-propagated public_impulse_context
 *
 * - public_activity
 *   <- already-propagated public_activity only
 *
 * - public_sparkline_context_7d
 *   <- already-propagated public_sparkline_context_7d only
 *
 * SENSITIVE ZONES
 * - private/public boundary
 * - structural-transition projection
 * - impulse-context projection
 * - canonical identity
 * - unavailable-state preservation
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";

import {
  buildPublicStructure,
  toPublicActivityLabel,
  toPublicImpulseContext,
  toPublicSparklineContext7D,
  toPublicStructureTransition,
  type PublicActivityLabel,
  type PublicImpulseContext,
  type PublicSparklineContext7D,
  type PublicStructureTransition,
} from "@/lib/xyvala/public/public-structure";

import {
  buildStructure7D,
  type Structure7D,
} from "@/lib/xyvala/structures/structure-7d";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ScanTransformerSource =
  | "snapshot"
  | "scan"
  | "fallback"
  | "unknown";

export type ScanTransformerInput =
  | PrivateScanAsset
  | ScanAsset
  | Record<string, unknown>;

export type ScanTransformerItem = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  market_cap: number | null;
  volume_24h: number | null;

  sparkline_7d: number[] | null;
  structure_7d: Structure7D;

  public_activity: ScanAsset["public_activity"];
  public_sparkline_context_7d:
    ScanAsset["public_sparkline_context_7d"];
  public_structure_transition:
    ScanAsset["public_structure_transition"];
  public_impulse_context:
    ScanAsset["public_impulse_context"];

  rank: number | null;
  logo_url: string | null;

  transformer_source: ScanTransformerSource;
  transformer_warnings: string[];
};

export type ScanTransformerResult = {
  ok: boolean;
  source: ScanTransformerSource;
  data: ScanTransformerItem[];
  rejected_count: number;
  warnings: string[];
};

type CanonicalIdentity = {
  id: string;
  symbol: string;
  name: string;
};

type ProjectedPublicLabels = {
  activity: PublicActivityLabel;
  sparkline_context_7d: PublicSparklineContext7D;
  structure_transition: PublicStructureTransition;
  impulse_context: PublicImpulseContext;
};

/* ============================================================================
 * 2. VERSION
 * ========================================================================== */

export const SCAN_TRANSFORMER_VERSION = "2.0.0" as const;

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

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function normalizeRequiredString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function normalizeNullableNumber(
  value: unknown,
): number | null {
  return isFiniteNumber(value)
    ? value
    : null;
}

function normalizePositiveInteger(
  value: unknown,
): number | null {
  if (
    !isFiniteNumber(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

function normalizeNumberArray(
  value: unknown,
): number[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 2
  ) {
    return null;
  }

  if (!value.every(isFiniteNumber)) {
    return null;
  }

  return [...value];
}

function normalizePublicUrl(
  value: unknown,
): string | null {
  const normalized =
    normalizeRequiredString(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("https://") ||
    normalized.startsWith("/")
  ) {
    return normalized;
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
  const warnings = groups
    .flatMap((group) =>
      Array.isArray(group)
        ? group
        : [],
    )
    .filter(
      (warning): warning is string =>
        typeof warning === "string" &&
        warning.trim().length > 0,
    )
    .map((warning) => warning.trim());

  return [
    ...new Set(warnings),
  ].sort(compareDeterministicStrings);
}

/* ============================================================================
 * 4. STRICT FIELD READER
 * ----------------------------------------------------------------------------
 * No fallback names are accepted here.
 *
 * Any legacy alias must be migrated upstream rather than silently supported at
 * the canonical private/public boundary.
 * ========================================================================== */

function readCanonicalField(
  asset: Record<string, unknown>,
  key: string,
): unknown {
  return hasOwn(asset, key)
    ? asset[key]
    : undefined;
}

/* ============================================================================
 * 5. CANONICAL IDENTITY
 * ----------------------------------------------------------------------------
 * Identity is never reconstructed from aliases or from another field.
 *
 * Missing id, symbol or name causes rejection.
 * ========================================================================== */

function readCanonicalIdentity(
  asset: Record<string, unknown>,
): CanonicalIdentity | null {
  const id =
    normalizeRequiredString(
      readCanonicalField(asset, "id"),
    );

  const symbol =
    normalizeRequiredString(
      readCanonicalField(asset, "symbol"),
    );

  const name =
    normalizeRequiredString(
      readCanonicalField(asset, "name"),
    );

  if (!id || !symbol || !name) {
    return null;
  }

  return {
    id: id.toLowerCase(),
    symbol: symbol.toUpperCase(),
    name,
  };
}

/* ============================================================================
 * 6. PRIVATE STRUCTURAL-TRANSITION PROJECTION
 * ----------------------------------------------------------------------------
 * This mapper does not detect, calculate or reconstruct a transition.
 *
 * It only converts the canonical validated private structural-transition
 * contract into an authorized public descriptive label.
 *
 * SOURCE OF TRUTH
 * - PrivateScanAsset.structural_transition
 *
 * INVARIANTS
 * - structural_transition_status controls availability
 * - UNKNOWN and CONFLICTED states are never exposed as valid transitions
 * - unsupported private kinds remain unavailable
 * - no private score participates in the mapping
 * - no observable market value participates in the mapping
 * - no legacy alias is accepted
 * ========================================================================== */

function normalizePrivateEnum(
  value: unknown,
): string | null {
  const normalized =
    normalizeRequiredString(value);

  return normalized
    ? normalized
        .replace(/[\s-]+/g, "_")
        .toUpperCase()
    : null;
}

type ReadPrivateStructuralTransition = {
  status: string | null;
  kind: string | null;
  state: string | null;
  evolution: string | null;
};

function readPrivateStructuralTransitionValue(
  value: unknown,
): ReadPrivateStructuralTransition | null {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    status: normalizePrivateEnum(
      readCanonicalField(
        value,
        "structural_transition_status",
      ),
    ),

    kind: normalizePrivateEnum(
      readCanonicalField(
        value,
        "structural_transition_kind",
      ),
    ),

    state: normalizePrivateEnum(
      readCanonicalField(
        value,
        "structural_transition_state",
      ),
    ),

    evolution: normalizePrivateEnum(
      readCanonicalField(
        value,
        "structural_transition_evolution",
      ),
    ),
  };
}

function isAvailablePrivateStatus(
  status: string | null,
): boolean {
  return (
    status === "COMPUTED" ||
    status === "PARTIAL" ||
    status === "DEGRADED"
  );
}

function projectPrivateStructuralTransition(
  value: unknown,
): PublicStructureTransition {
  const transition =
    readPrivateStructuralTransitionValue(
      value,
    );

  if (!transition) {
    return "Unavailable";
  }

  if (
    !isAvailablePrivateStatus(
      transition.status,
    )
  ) {
    return "Unavailable";
  }

  if (
    transition.kind === null ||
    transition.kind === "UNKNOWN" ||
    transition.state === null ||
    transition.state === "UNKNOWN" ||
    transition.state === "CONFLICTED"
  ) {
    return "Unavailable";
  }

  switch (transition.kind) {
    case "FRAGMENTATION":
      return "Fragmentation Detected";

    case "COMPRESSION":
      return "Compression Phase";

    case "EXPANSION":
      return transition.state === "PERSISTENT"
        ? "Active Expansion"
        : "Expansion Phase";

    case "RECOVERY":
      return "Recovery Structure";

    case "NONE":
      return transition.state === "NONE"
        ? "Stable Structure"
        : "Neutral Structure";

    /*
     * The current public contract does not expose a dedicated label for
     * reversal or reconfiguration.
     *
     * These states must remain unavailable rather than being converted into
     * an unrelated public transition.
     */
    case "REVERSAL":
    case "RECONFIGURATION":
    default:
      return "Unavailable";
  }
}

/* ============================================================================
 * 7. PRIVATE IMPULSE PROJECTION
 * ----------------------------------------------------------------------------
 * This mapper does not calculate or reconstruct impulse truth.
 *
 * SOURCE OF TRUTH
 * - PrivateScanAsset.impulse_transition_state
 * - PrivateScanAsset.impulse_status
 *
 * INVARIANTS
 * - impulse_status controls availability
 * - NEUTRAL is exposed only when it is a validated neutral observation
 * - unavailable never becomes neutral
 * - no fallback to impulse_context or another alias is permitted
 * ========================================================================== */

function projectPrivateImpulseContext(
  state: unknown,
  status: unknown,
): PublicImpulseContext {
  const normalizedStatus =
    normalizePrivateEnum(status);

  if (
    !isAvailablePrivateStatus(
      normalizedStatus,
    )
  ) {
    return "Unavailable";
  }

  const normalizedState =
    normalizePrivateEnum(state);

  switch (normalizedState) {
    case "COMPRESSION":
      return "Compression";

    case "PRESSURE_BUILDING":
      return "Pressure Building";

    case "RELEASE":
      return "Release";

    case "EXHAUSTION":
      return "Exhaustion";

    case "NEUTRAL":
      return "Neutral";

    default:
      return "Unavailable";
  }
}

/* ============================================================================
 * 8. CANONICAL PUBLIC-LABEL PROJECTION
 * ----------------------------------------------------------------------------
 * This function validates canonical public labels only.
 *
 * It does not:
 * - read observable market data
 * - infer missing labels
 * - reconstruct analytical truth
 * - convert unavailable values into neutral values
 * ========================================================================== */

function buildProjectedPublicLabels(input: {
  activity?: unknown;
  sparklineContext7D?: unknown;
  transition?: unknown;
  impulse?: unknown;
}): ProjectedPublicLabels {
  return buildPublicStructure({
    public_activity_label:
      toPublicActivityLabel(
        input.activity,
      ),

    public_sparkline_context_7d:
      toPublicSparklineContext7D(
        input.sparklineContext7D,
      ),

    public_transition_label:
      toPublicStructureTransition(
        input.transition,
      ),

    public_impulse_context:
      toPublicImpulseContext(
        input.impulse,
      ),
  });
}

/* ============================================================================
 * 9. PRIVATE -> PUBLIC LABEL MAPPING
 * ----------------------------------------------------------------------------
 * Private truths are explicitly mapped here.
 *
 * PUBLIC LINEAGE
 * - public_structure_transition
 *   <- structural_transition
 *
 * - public_impulse_context
 *   <- impulse_transition_state + impulse_status
 *
 * CURRENTLY UNAVAILABLE
 * - public_activity
 * - public_sparkline_context_7d
 *
 * These two values do not currently exist in PrivateScanAsset and must remain
 * unavailable until their legitimate upstream producers are identified and
 * governed.
 *
 * Observable market fields never participate in public-label production.
 * ========================================================================== */

function projectPrivateLabels(
  asset: Record<string, unknown>,
): ProjectedPublicLabels {
  const projectedTransition =
    projectPrivateStructuralTransition(
      readCanonicalField(
        asset,
        "structural_transition",
      ),
    );

  const projectedImpulse =
    projectPrivateImpulseContext(
      readCanonicalField(
        asset,
        "impulse_transition_state",
      ),

      readCanonicalField(
        asset,
        "impulse_status",
      ),
    );

  return buildProjectedPublicLabels({
    activity: "Unavailable",

    sparklineContext7D:
      "Unavailable",

    transition:
      projectedTransition,

    impulse:
      projectedImpulse,
  });
}

/* ============================================================================
 * 10. PUBLIC -> PUBLIC LABEL VALIDATION
 * ----------------------------------------------------------------------------
 * Already-public values are validated without reinterpretation.
 * ========================================================================== */

function validatePublicLabels(
  asset: Record<string, unknown>,
): ProjectedPublicLabels {
  return buildProjectedPublicLabels({
    activity:
      readCanonicalField(
        asset,
        "public_activity",
      ),

    sparklineContext7D:
      readCanonicalField(
        asset,
        "public_sparkline_context_7d",
      ),

    transition:
      readCanonicalField(
        asset,
        "public_structure_transition",
      ),

    impulse:
      readCanonicalField(
        asset,
        "public_impulse_context",
      ),
  });
}

/* ============================================================================
 * 11. INPUT CLASSIFICATION
 * ----------------------------------------------------------------------------
 * Classification only selects the authorized projection path.
 *
 * It does not change analytical values.
 * ========================================================================== */

function isPrivateProjectionInput(
  asset: Record<string, unknown>,
): boolean {
  return (
    hasOwn(asset, "structural_transition") ||
    hasOwn(asset, "impulse_transition_state")
  );
}

/* ============================================================================
 * 12. DESCRIPTIVE 7D ADAPTER
 * ----------------------------------------------------------------------------
 * Structure7D remains a descriptive service adapter.
 *
 * Its result is never used to produce:
 * - public_activity
 * - public_sparkline_context_7d
 * - public_structure_transition
 * - public_impulse_context
 * - global structure
 * - regime
 * - decision
 * - ranking priority
 * ========================================================================== */

function buildDescriptiveStructure7D(
  asset: Record<string, unknown>,
): Structure7D {
  return buildStructure7D({
    sparkline_7d:
      readCanonicalField(
        asset,
        "sparkline_7d",
      ),

    chg_7d_pct:
      readCanonicalField(
        asset,
        "chg_7d_pct",
      ),

    rolling_7d_price_path:
      readCanonicalField(
        asset,
        "rolling_7d_price_path",
      ),

    initial_7d_price_path:
      readCanonicalField(
        asset,
        "initial_7d_price_path",
      ),

    initial_7d_structure_score:
      readCanonicalField(
        asset,
        "initial_7d_structure_score",
      ),

    initial_7d_structure_status:
      readCanonicalField(
        asset,
        "initial_7d_structure_status",
      ),

    intro_7d_score:
      readCanonicalField(
        asset,
        "intro_7d_score",
      ),

    intro_7d_status:
      readCanonicalField(
        asset,
        "intro_7d_status",
      ),
  });
}

/* ============================================================================
 * 13. WARNING RESOLUTION
 * ========================================================================== */

function buildItemWarnings(input: {
  price: number | null;
  chg24h: number | null;
  chg7d: number | null;
  marketCap: number | null;
  volume24h: number | null;
  sparkline7d: number[] | null;
  rank: number | null;
  logoUrl: string | null;
  labels: ProjectedPublicLabels;
  rawRank: unknown;
  rawLogo: unknown;
  rawSparkline: unknown;
}): string[] {
  const warnings: string[] = [];

  if (input.price === null) {
    warnings.push(
      "scan_transformer_price_unavailable",
    );
  }

  if (input.chg24h === null) {
    warnings.push(
      "scan_transformer_chg_24h_unavailable",
    );
  }

  if (input.chg7d === null) {
    warnings.push(
      "scan_transformer_chg_7d_unavailable",
    );
  }

  if (input.marketCap === null) {
    warnings.push(
      "scan_transformer_market_cap_unavailable",
    );
  }

  if (input.volume24h === null) {
    warnings.push(
      "scan_transformer_volume_24h_unavailable",
    );
  }

  if (input.sparkline7d === null) {
    warnings.push(
      Array.isArray(input.rawSparkline)
        ? "scan_transformer_sparkline_7d_invalid"
        : "scan_transformer_sparkline_7d_unavailable",
    );
  }

  if (
    input.rawRank !== undefined &&
    input.rank === null
  ) {
    warnings.push(
      "scan_transformer_rank_invalid",
    );
  }

  if (
    input.rawLogo !== undefined &&
    input.logoUrl === null
  ) {
    warnings.push(
      "scan_transformer_logo_url_invalid",
    );
  }

  if (
    input.labels.activity ===
    "Unavailable"
  ) {
    warnings.push(
      "scan_transformer_public_activity_unavailable",
    );
  }

  if (
    input.labels.sparkline_context_7d ===
    "Unavailable"
  ) {
    warnings.push(
      "scan_transformer_public_sparkline_context_7d_unavailable",
    );
  }

  if (
    input.labels.structure_transition ===
    "Unavailable"
  ) {
    warnings.push(
      "scan_transformer_public_structure_transition_unavailable",
    );
  }

  if (
    input.labels.impulse_context ===
    "Unavailable"
  ) {
    warnings.push(
      "scan_transformer_public_impulse_context_unavailable",
    );
  }

  return uniqueWarnings(warnings);
}

/* ============================================================================
 * 14. CANONICAL INTERNAL ITEM BUILDER
 * ----------------------------------------------------------------------------
 * Every accepted input reaches this single builder.
 * ========================================================================== */

function buildCanonicalScanTransformerItem(input: {
  asset: Record<string, unknown>;
  identity: CanonicalIdentity;
  labels: ProjectedPublicLabels;
  source: ScanTransformerSource;
}): ScanTransformerItem {
  const price =
    normalizeNullableNumber(
      readCanonicalField(
        input.asset,
        "price",
      ),
    );

  const chg24h =
    normalizeNullableNumber(
      readCanonicalField(
        input.asset,
        "chg_24h_pct",
      ),
    );

  const chg7d =
    normalizeNullableNumber(
      readCanonicalField(
        input.asset,
        "chg_7d_pct",
      ),
    );

  const marketCap =
    normalizeNullableNumber(
      readCanonicalField(
        input.asset,
        "market_cap",
      ),
    );

  const volume24h =
    normalizeNullableNumber(
      readCanonicalField(
        input.asset,
        "volume_24h",
      ),
    );

  const rawSparkline =
    readCanonicalField(
      input.asset,
      "sparkline_7d",
    );

  const sparkline7d =
    normalizeNumberArray(
      rawSparkline,
    );

  const rawRank =
    readCanonicalField(
      input.asset,
      "rank",
    );

  const rank =
    normalizePositiveInteger(
      rawRank,
    );

  const rawLogo =
    readCanonicalField(
      input.asset,
      "logo_url",
    );

  const logoUrl =
    normalizePublicUrl(
      rawLogo,
    );

  const warnings =
    buildItemWarnings({
      price,
      chg24h,
      chg7d,
      marketCap,
      volume24h,
      sparkline7d,
      rank,
      logoUrl,
      labels: input.labels,
      rawRank,
      rawLogo,
      rawSparkline,
    });

  return {
    id: input.identity.id,
    symbol: input.identity.symbol,
    name: input.identity.name,

    price,
    chg_24h_pct: chg24h,
    chg_7d_pct: chg7d,

    market_cap: marketCap,
    volume_24h: volume24h,

    sparkline_7d: sparkline7d,

    structure_7d:
      buildDescriptiveStructure7D(
        input.asset,
      ),

    public_activity:
      input.labels.activity,

    public_sparkline_context_7d:
      input.labels.sparkline_context_7d,

    public_structure_transition:
      input.labels.structure_transition,

    public_impulse_context:
      input.labels.impulse_context,

    rank,
    logo_url: logoUrl,

    transformer_source:
      input.source,

    transformer_warnings:
      warnings,
  };
}

/* ============================================================================
 * 15. PRIVATE -> PUBLIC PROJECTION
 * ========================================================================== */

export function privateScanAssetToPublicScanAsset(
  asset: PrivateScanAsset,
): ScanAsset {
  const source =
    asset as unknown as Record<
      string,
      unknown
    >;

  const identity =
    readCanonicalIdentity(source);

  if (!identity) {
    throw new Error(
      "scan_transformer_invalid_private_asset_identity",
    );
  }

  const item =
    buildCanonicalScanTransformerItem({
      asset: source,
      identity,
      labels:
        projectPrivateLabels(source),
      source: "scan",
    });

  return toPublicScanAsset(item);
}

export function privateScanAssetsToPublicScanAssets(
  assets: readonly PrivateScanAsset[],
): ScanAsset[] {
  return assets.map(
    privateScanAssetToPublicScanAsset,
  );
}

/* ============================================================================
 * 16. PUBLIC / GENERIC TRANSFORMER
 * ----------------------------------------------------------------------------
 * Private-like inputs are routed through the private mapper.
 *
 * Already-public inputs are validated without reconstruction.
 * Invalid identities are rejected.
 * ========================================================================== */

export function toScanServiceItem(
  input: ScanTransformerInput,
  source: ScanTransformerSource = "unknown",
): ScanTransformerItem | null {
  if (!isPlainObject(input)) {
    return null;
  }

  const identity =
    readCanonicalIdentity(input);

  if (!identity) {
    return null;
  }

  const labels =
    isPrivateProjectionInput(input)
      ? projectPrivateLabels(input)
      : validatePublicLabels(input);

  return buildCanonicalScanTransformerItem({
    asset: input,
    identity,
    labels,
    source,
  });
}

export function toScanServiceItems(
  assets: unknown,
  source: ScanTransformerSource = "unknown",
): ScanTransformerItem[] {
  if (!Array.isArray(assets)) {
    return [];
  }

  const items: ScanTransformerItem[] = [];

  for (const asset of assets) {
    const item =
      toScanServiceItem(
        asset as ScanTransformerInput,
        source,
      );

    if (item !== null) {
      items.push(item);
    }
  }

  return items;
}

export function transformScanAssets(input: {
  assets: unknown;
  source?: ScanTransformerSource;
  warnings?: string[];
}): ScanTransformerResult {
  const source =
    input.source ?? "unknown";

  if (!Array.isArray(input.assets)) {
    return {
      ok: false,
      source,
      data: [],
      rejected_count: 0,
      warnings: uniqueWarnings(
        input.warnings,
        [
          "scan_transformer_assets_not_array",
        ],
      ),
    };
  }

  const data =
    toScanServiceItems(
      input.assets,
      source,
    );

  const rejectedCount =
    input.assets.length -
    data.length;

  return {
    ok: true,
    source,
    data,

    rejected_count:
      rejectedCount,

    warnings: uniqueWarnings(
      input.warnings,

      rejectedCount > 0
        ? [
            `scan_transformer_rejected_assets:${rejectedCount}`,
          ]
        : [],
    ),
  };
}

/* ============================================================================
 * 17. CONTRACT BRIDGE
 * ----------------------------------------------------------------------------
 * This is the only ScanTransformerItem -> ScanAsset projection.
 * ========================================================================== */

export function toPublicScanAsset(
  item: ScanTransformerItem,
): ScanAsset {
  return {
    id: item.id,
    symbol: item.symbol,
    name: item.name,

    price: item.price,
    chg_24h_pct:
      item.chg_24h_pct,
    chg_7d_pct:
      item.chg_7d_pct,

    market_cap:
      item.market_cap,
    volume_24h:
      item.volume_24h,

    sparkline_7d:
      item.sparkline_7d
        ? [...item.sparkline_7d]
        : null,

    public_activity:
      item.public_activity,

    public_sparkline_context_7d:
      item.public_sparkline_context_7d,

    public_structure_transition:
      item.public_structure_transition,

    public_impulse_context:
      item.public_impulse_context,

    rank: item.rank,
    logo_url: item.logo_url,
  };
}

export function toPublicScanAssets(
  items: readonly ScanTransformerItem[],
): ScanAsset[] {
  return items.map(
    toPublicScanAsset,
  );
}
