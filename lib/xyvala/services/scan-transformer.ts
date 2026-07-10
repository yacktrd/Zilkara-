/* ============================================================================
 * FILE: lib/xyvala/services/scan-transformer.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan transformer
 *
 * ROLE
 * - project private scan assets into the public ScanAsset contract
 * - normalize unknown scan-like inputs into public-safe market assets
 * - preserve observable market data only
 * - produce public descriptive structure labels from observable fields only
 * - propagate public-safe impulse context without exposing private scores
 * - prevent scoring, regime, decision, opportunity, confidence, rupture and broker leakage
 *
 * DIRECTIVES
 * - transformer boundary only
 * - public output only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no API logic
 * - no UI logic
 * - no broker / affiliation exposure
 * - no fake fallback data
 * - undefined must never be exposed
 * - null means explicitly unavailable
 * - number means confirmed observable value
 * - READ -> VALIDATE -> NORMALIZE -> PROJECT
 *
 * INPUTS
 * - PrivateScanAsset
 * - ScanAsset
 * - Record<string, unknown>
 *
 * OUTPUTS
 * - ScanAsset
 * - ScanTransformerItem
 * - ScanTransformerResult
 *
 * INVARIANTS
 * - public output remains descriptive only
 * - public impulse mapping comes from public-structure.ts only
 * - private fields never cross the public boundary
 * - UI displays fields, it never rebuilds them
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/public/public-structure.ts
 * - lib/xyvala/structures/structure-7d.ts
 *
 * SENSITIVE ZONES
 * - private/public boundary
 * - public impulse context propagation
 * - descriptive public labels
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";

import {
  buildPublicStructure,
  toPublicImpulseContext,
  type PublicImpulseContext,
} from "@/lib/xyvala/public/public-structure";

import {
  buildStructure7D,
  type Structure7D,
} from "@/lib/xyvala/structures/structure-7d";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ScanTransformerSource = "snapshot" | "scan" | "fallback" | "unknown";

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
  public_sparkline_context_7d: ScanAsset["public_sparkline_context_7d"];
  public_structure_transition: ScanAsset["public_structure_transition"];
  public_impulse_context: ScanAsset["public_impulse_context"];

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

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeUpper(value: unknown): string {
  return safeString(value).toUpperCase();
}

function safeLower(value: unknown): string {
  return safeString(value).toLowerCase();
}

function safeNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function round(value: number, precision: number): number {
  if (!Number.isFinite(value)) return 0;

  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function round8(value: number): number {
  return round(value, 8);
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

/* ============================================================================
 * 3. FIELD NORMALIZERS
 * ========================================================================== */

function normalizeNullableNumber(value: unknown): number | null {
  const parsed = safeNumber(value);
  return parsed === null ? null : round8(parsed);
}

function normalizeRank(value: unknown): number | null {
  const parsed = safeNumber(value);

  if (parsed === null || parsed <= 0) {
    return null;
  }

  return Math.trunc(parsed);
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = safeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeUrl(value: unknown): string | null {
  const normalized = safeString(value);

  if (!normalized) return null;

  if (
    normalized.startsWith("https://") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("/")
  ) {
    return normalized;
  }

  return null;
}

function normalizeNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const points = value.filter(isFiniteNumber);

  return points.length >= 2 ? points : null;
}

/* ============================================================================
 * 4. RAW FIELD READERS
 * ========================================================================== */

function readField(
  asset: Record<string, unknown>,
  primary: string,
  fallback?: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(asset, primary)) {
    return asset[primary];
  }

  if (fallback && Object.prototype.hasOwnProperty.call(asset, fallback)) {
    return asset[fallback];
  }

  return undefined;
}

function readIdentity(asset: Record<string, unknown>): {
  id: string;
  symbol: string;
  name: string;
  warnings: string[];
} | null {
  const symbol = safeUpper(readField(asset, "symbol"));

  if (!symbol) {
    return null;
  }

  const id =
    safeLower(readField(asset, "id")) ||
    safeLower(readField(asset, "key")) ||
    symbol.toLowerCase();

  const name = safeString(readField(asset, "name"), symbol);

  return {
    id,
    symbol,
    name,
    warnings: [],
  };
}

function readLogo(asset: Record<string, unknown>): string | null {
  return (
    normalizeUrl(readField(asset, "logo_url")) ??
    normalizeUrl(readField(asset, "logo")) ??
    normalizeUrl(readField(asset, "logoUrl")) ??
    normalizeUrl(readField(asset, "image")) ??
    normalizeNullableString(readField(asset, "logo_url")) ??
    normalizeNullableString(readField(asset, "logo")) ??
    normalizeNullableString(readField(asset, "logoUrl")) ??
    normalizeNullableString(readField(asset, "image"))
  );
}

function readPublicImpulseContext(
  asset: Record<string, unknown>,
): PublicImpulseContext {
  const publicValue = readField(
    asset,
    "public_impulse_context",
    "impulse_context",
  );

  const normalizedPublicValue = toPublicImpulseContext(publicValue);

  if (normalizedPublicValue !== "Unavailable") {
    return normalizedPublicValue;
  }

  const transitionValue = readField(asset, "impulse_transition_state");

  return toPublicImpulseContext(transitionValue);
}

/* ============================================================================
 * 5. STRUCTURE ADAPTERS
 * ========================================================================== */

function buildStructureFromAsset(asset: Record<string, unknown>): Structure7D {
  return buildStructure7D({
    sparkline_7d: readField(asset, "sparkline_7d", "sparkline"),
    chg_7d_pct: readField(asset, "chg_7d_pct"),

    rolling_7d_price_path: readField(asset, "rolling_7d_price_path"),
    initial_7d_price_path: readField(asset, "initial_7d_price_path"),

    initial_7d_structure_score: readField(asset, "initial_7d_structure_score"),
    initial_7d_structure_status: readField(asset, "initial_7d_structure_status"),

    intro_7d_score: readField(asset, "intro_7d_score"),
    intro_7d_status: readField(asset, "intro_7d_status"),
  });
}

function buildPublicStructureFromValues(input: {
  chg24h: number | null;
  chg7d: number | null;
  volume24h: number | null;
  marketCap: number | null;
  sparkline7d: number[] | null;
  impulseTransitionState?: unknown;
  publicImpulseContext?: unknown;
}) {
  return buildPublicStructure({
    pct_24h: input.chg24h,
    pct_7d: input.chg7d,
    volume_24h: input.volume24h,
    market_cap: input.marketCap,
    sparkline_7d: input.sparkline7d,
    impulse_transition_state: input.impulseTransitionState,
    public_impulse_context: input.publicImpulseContext,
  });
}

/* ============================================================================
 * 6. PRIVATE -> PUBLIC PROJECTION
 * ========================================================================== */

export function privateScanAssetToPublicScanAsset(
  asset: PrivateScanAsset,
): ScanAsset {
  const symbol = safeString(asset.symbol, "UNKNOWN").toUpperCase();

  const price = normalizeNullableNumber(asset.price);
  const chg24h = normalizeNullableNumber(asset.chg_24h_pct);
  const chg7d = normalizeNullableNumber(asset.chg_7d_pct);
  const marketCap = normalizeNullableNumber(asset.market_cap);
  const volume24h = normalizeNullableNumber(asset.volume_24h);
  const sparkline7d = normalizeNumberArray(asset.sparkline_7d);

  const publicStructure = buildPublicStructureFromValues({
  chg24h,
  chg7d,
  volume24h,
  marketCap,
  sparkline7d,
  impulseTransitionState: asset.impulse_transition_state,
});

console.log("XYVALA_PRIVATE_TO_PUBLIC_IMPULSE", {
  symbol,
  impulse_transition_state: asset.impulse_transition_state,
  public_impulse_context: publicStructure.impulse_context,
});

  return {
    id: safeString(asset.id, symbol.toLowerCase()),
    symbol,
    name: safeString(asset.name, symbol),

    price,
    chg_24h_pct: chg24h,
    chg_7d_pct: chg7d,

    market_cap: marketCap,
    volume_24h: volume24h,

    sparkline_7d: sparkline7d,

    public_activity: publicStructure.activity,
    public_sparkline_context_7d: publicStructure.sparkline_context_7d,
    public_structure_transition: publicStructure.structure_transition,
    public_impulse_context: publicStructure.impulse_context,

    rank: normalizeRank(asset.rank),
    logo_url: normalizeNullableString(asset.logo_url),
  };
}

export function privateScanAssetsToPublicScanAssets(
  assets: readonly PrivateScanAsset[],
): ScanAsset[] {
  return assets.map(privateScanAssetToPublicScanAsset);
}

/* ============================================================================
 * 7. PUBLIC TRANSFORMER
 * ========================================================================== */

export function toScanServiceItem(
  input: ScanTransformerInput,
  source: ScanTransformerSource = "unknown",
): ScanTransformerItem | null {
  if (!isPlainObject(input)) {
    return null;
  }

  const identity = readIdentity(input);

  if (!identity) {
    return null;
  }

  const warnings: string[] = [...identity.warnings];
  const structure7d = buildStructureFromAsset(input);

  const price = normalizeNullableNumber(readField(input, "price"));

  const chg24h = normalizeNullableNumber(
    readField(input, "chg_24h_pct", "pct24h"),
  );

  const chg7d =
    normalizeNullableNumber(structure7d.chg_7d_pct) ??
    normalizeNullableNumber(readField(input, "chg_7d_pct"));

  const sparkline7d =
    structure7d.sparkline_7d ??
    normalizeNumberArray(readField(input, "sparkline_7d", "sparkline"));

  const marketCap = normalizeNullableNumber(readField(input, "market_cap"));
  const volume24h = normalizeNullableNumber(readField(input, "volume_24h"));
  const publicImpulseContext = readPublicImpulseContext(input);

console.log("XYVALA_TRANSFORMER_IMPULSE_MAPPING", {
  symbol: identity.symbol,
  raw_public_impulse_context: readField(input, "public_impulse_context"),
  raw_impulse_context: readField(input, "impulse_context"),
  raw_impulse_transition_state: readField(input, "impulse_transition_state"),
  resolved_public_impulse_context: publicImpulseContext,
});

  const publicStructure = buildPublicStructureFromValues({
  chg24h,
  chg7d,
  volume24h,
  marketCap,
  sparkline7d,
  impulseTransitionState: readField(input, "impulse_transition_state"),
  publicImpulseContext,
});
  if (price === null) {
    warnings.push("scan_transformer_price_unavailable");
  }

  if (chg24h === null) {
    warnings.push("scan_transformer_chg_24h_unavailable");
  }

  if (chg7d === null) {
    warnings.push("scan_transformer_chg_7d_unavailable");
  }

  if (!sparkline7d) {
    warnings.push("scan_transformer_sparkline_7d_unavailable");
  }

  return {
    id: identity.id,
    symbol: identity.symbol,
    name: identity.name,

    price,
    chg_24h_pct: chg24h,
    chg_7d_pct: chg7d,

    market_cap: marketCap,
    volume_24h: volume24h,

    sparkline_7d: sparkline7d,
    structure_7d: structure7d,

    public_activity: publicStructure.activity,
    public_sparkline_context_7d: publicStructure.sparkline_context_7d,
    public_structure_transition: publicStructure.structure_transition,
    public_impulse_context: publicStructure.impulse_context,

    rank: normalizeRank(readField(input, "rank")),
    logo_url: readLogo(input),

    transformer_source: source,
    transformer_warnings: uniqueWarnings(warnings),
  };
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
    const item = toScanServiceItem(asset as ScanTransformerInput, source);

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
  const source = input.source ?? "unknown";

  if (!Array.isArray(input.assets)) {
    return {
      ok: false,
      source,
      data: [],
      rejected_count: 0,
      warnings: uniqueWarnings(input.warnings, [
        "scan_transformer_assets_not_array",
      ]),
    };
  }

  const data = toScanServiceItems(input.assets, source);
  const rejectedCount = input.assets.length - data.length;

  return {
    ok: true,
    source,
    data,
    rejected_count: rejectedCount,
    warnings: uniqueWarnings(
      input.warnings,
      rejectedCount > 0
        ? [`scan_transformer_rejected_assets:${rejectedCount}`]
        : [],
    ),
  };
}

/* ============================================================================
 * 8. CONTRACT BRIDGE HELPERS
 * ========================================================================== */

export function toPublicScanAsset(item: ScanTransformerItem): ScanAsset {
  return {
    id: item.id,
    symbol: item.symbol,
    name: item.name,

    price: item.price,
    chg_24h_pct: item.chg_24h_pct,
    chg_7d_pct: item.chg_7d_pct,

    market_cap: item.market_cap,
    volume_24h: item.volume_24h,

    sparkline_7d: item.sparkline_7d,

    public_activity: item.public_activity,
    public_sparkline_context_7d: item.public_sparkline_context_7d,
    public_structure_transition: item.public_structure_transition,
    public_impulse_context: item.public_impulse_context,

    rank: item.rank,
    logo_url: item.logo_url,
  };
}

export function toPublicScanAssets(
  items: readonly ScanTransformerItem[],
): ScanAsset[] {
  return items.map(toPublicScanAsset);
}
