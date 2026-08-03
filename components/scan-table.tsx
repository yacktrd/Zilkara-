"use client";

/* ============================================================================
 * FILE: components/scan-table.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical public structural market interface
 *
 * ROLE
 * - consume canonical public ScanAsset contracts
 * - consume the canonical public display policy
 * - render the complete public market context
 * - render governed structural transition highlights
 * - render searchable desktop and mobile market views
 * - preserve one normalized public view model for every responsive projection
 *
 * CLASSIFICATION
 * - PUBLIC
 * - INTERFACE
 * - READ / FILTER / RENDER
 * - CLIENT COMPONENT
 * - NON-ANALYTICAL
 *
 * POSITION IN OFFICIAL CHAIN
 * - Acquisition
 * - RFS
 * - Triple Layer
 * - Impulse Layer
 * - Analytical Aggregation System
 * - MCI
 * - Calibration
 * - Snapshot
 * - Private/Public Transformers
 * - Public Contracts
 * - Public Rankings
 * - Public Display Policy
 * - API
 * - Interface
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/public/public-structure.ts
 * - lib/xyvala/public/public-display-policy.ts
 * - lib/xyvala/rankings/structural-transition-ranking.ts
 * - components/sparkline.tsx
 *
 * CONSUMERS
 * - public scan page
 *
 * DIRECTIVES
 * - public UI only
 * - no private contract dependency
 * - no private score usage
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no MCI recomputation
 * - no calibration exposure
 * - no public analytical reconstruction
 * - no local public classification policy
 * - no local public label policy
 * - no local monetary formatting policy
 * - no local availability substitution
 * - no synthetic rank
 * - no unavailable-to-neutral substitution
 * - no malformed asset identity repair
 * - no local ranking policy
 * - no public ranking recomputation
 * - no provider parsing
 * - no investment advice
 * - desktop and mobile consume the same normalized public data
 * - search affects visible market rows only
 * - search does not affect global market context
 * - search does not affect transition highlights
 *
 * INPUTS
 * - public ScanAsset collection
 * - explicit public quote
 * - optional public language
 * - optional public source
 * - optional upstream update timestamp
 * - optional visible row limit
 *
 * OUTPUTS
 * - public market context
 * - governed structural transition highlights
 * - searchable desktop market table
 * - searchable mobile market cards
 * - public metadata and disclaimer
 *
 * OWNERSHIP
 * - public contracts own public analytical truth
 * - public-structure.ts owns public market aggregation
 * - structural-transition-ranking.ts owns highlight ordering
 * - public-display-policy.ts owns labels and representation
 * - this component owns responsive rendering and local search only
 *
 * INVARIANTS
 * - one public asset produces one normalized interface view model
 * - desktop and mobile views use the same visible collection
 * - transition cards use the same normalized asset identities
 * - malformed public identities are rejected, never repaired
 * - missing rank remains unavailable
 * - missing transition remains unavailable
 * - missing logo never blocks asset rendering
 * - null remains unavailable
 * - zero remains a valid public value
 * - USDT is never displayed as EUR or USD
 * - public display strings come from the canonical display policy
 * - transition ranking consumes the complete qualified universe
 * - market summary consumes the complete qualified universe
 * - search result count is an interface-only observable
 *
 * FIRST DIVERGENCE
 * - malformed public ScanAsset
 *   => private/public transformer or public contract
 *
 * - valid public value incorrectly represented
 *   => public-display-policy.ts
 *
 * - incorrect transition highlight order
 *   => structural-transition-ranking.ts
 *
 * - desktop/mobile display divergence
 *   => this component
 *
 * SENSITIVE ZONES
 * - public/private boundary
 * - public-state validation
 * - unavailable versus neutral semantics
 * - responsive data consistency
 * - complete-universe preservation
 * - ranking consumption
 * - logo rendering
 * - European monetary representation
 * ========================================================================== */

import React, {
  useDeferredValue,
  useMemo,
  useState,
} from "react";

import { Sparkline } from "./sparkline";

import type {
  ScanAsset,
} from "@/lib/xyvala/contracts/scan-contract";

import {
  buildPublicMarketStructureSummary,
  type PublicActivityLabel,
  type PublicCoreStructure,
  type PublicDecayContext,
  type PublicGrowthContext,
  type PublicImpulseContext,
  type PublicMarketClimate,
  type PublicSparklineContext7D,
  type PublicStructureTransition,
} from "@/lib/xyvala/public/public-structure";

import {
  buildPublicAssetLogoAlt,
  formatPublicActivityLabel,
  formatPublicCompactMonetaryValue,
  formatPublicCoreStructureLabel,
  formatPublicCount,
  formatPublicDateTime,
  formatPublicDecayContextLabel,
  formatPublicGrowthContextLabel,
  formatPublicImpulseContextLabel,
  formatPublicMarketClimateLabel,
  formatPublicNullableText,
  formatPublicPercentage,
  formatPublicPrice,
  formatPublicRank,
  formatPublicSparklineContext7DLabel,
  formatPublicStructureTransitionLabel,
  getPublicDisplayDefinition,
  getPublicDisclaimer,
  isPublicDisplayCurrency,
  resolvePublicDisplayPolicy,
  type PublicDisplayCurrency,
  type PublicDisplayLanguage,
  type PublicDisplayPolicy,
} from "@/lib/xyvala/public/public-display-policy";

import {
  getStructuralTransitionHighlights,
} from "@/lib/xyvala/rankings/structural-transition-ranking";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type AssetInput =
  Partial<ScanAsset>;

type PublicAssetViewModel =
  Readonly<{
    key:
      string;

    id:
      string;

    rank:
      number | null;

    symbol:
      string;

    name:
      string;

    logo_url:
      string | null;

    price:
      number | null;

    change_24h_pct:
      number | null;

    change_7d_pct:
      number | null;

    market_cap:
      number | null;

    volume_24h:
      number | null;

    sparkline_7d:
      number[] | null;

    activity:
      PublicActivityLabel;

    sparkline_context_7d:
      PublicSparklineContext7D;

    structural_transition:
      PublicStructureTransition | null;

    impulse_context:
      PublicImpulseContext;
  }>;

type QualifiedPublicAssetViewModel =
  PublicAssetViewModel &
  Readonly<{
    structural_transition:
      PublicStructureTransition;
  }>;

type Props =
  Readonly<{
    assets:
      unknown;

    quote?:
      PublicDisplayCurrency |
      string;

    language?:
      PublicDisplayLanguage;

    updatedAt?:
      string |
      number |
      Date |
      null;

    dataSource?:
      string |
      null;

    limit?:
      number;
  }>;

type ContextCardProps =
  Readonly<{
    label:
      string;

    value:
      string;

    definition?:
      string;

    emphasized?:
      boolean;
  }>;

/* ============================================================================
 * 2. SAFE PRIMITIVE READERS
 * ----------------------------------------------------------------------------
 * These helpers validate public contract values only.
 *
 * They never:
 * - classify
 * - translate
 * - infer
 * - repair identity
 * - create analytical defaults
 * ========================================================================== */

function readNonEmptyString(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function readFiniteNumber(
  value: unknown,
): number | null {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function readPositiveInteger(
  value: unknown,
): number | null {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  )
    ? value
    : null;
}

function readNumberArray(
  value: unknown,
): number[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 2
  ) {
    return null;
  }

  if (
    !value.every(
      (
        point,
      ): point is number =>
        typeof point === "number" &&
        Number.isFinite(point),
    )
  ) {
    return null;
  }

  return [
    ...value,
  ];
}

function readLogoUrl(
  value: unknown,
): string | null {
  const normalized =
    readNonEmptyString(
      value,
    );

  if (normalized === null) {
    return null;
  }

  if (
    normalized.startsWith(
      "https://",
    ) ||
    normalized.startsWith(
      "/",
    )
  ) {
    return normalized;
  }

  return null;
}

function normalizeSourceAssets(
  value: unknown,
): readonly unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    if (
      Array.isArray(
        record.data,
      )
    ) {
      return record.data;
    }
  }

  return null;
}

function normalizeLimit(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return 250;
  }

  return value;
}

function resolveDisplayCurrency(
  value:
    PublicDisplayCurrency |
    string |
    undefined,
): PublicDisplayCurrency {
  const normalized =
    typeof value === "string"
      ? value.trim().toUpperCase()
      : value;

  return isPublicDisplayCurrency(
    normalized,
  )
    ? normalized
    : "EUR";
}

/* ============================================================================
 * 3. PUBLIC CONTRACT STATE READERS
 * ----------------------------------------------------------------------------
 * Unknown public states remain unavailable.
 *
 * The interface does not replace invalid or unknown states with:
 * - Neutral
 * - Stable
 * - Low
 * - any other valid analytical classification
 * ========================================================================== */

function readPublicActivity(
  value: unknown,
): PublicActivityLabel {
  switch (value) {
    case "Low":
    case "Normal":
    case "High":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

function readPublicSparklineContext7D(
  value: unknown,
): PublicSparklineContext7D {
  switch (value) {
    case "Compression":
    case "Expansion":
    case "Recovery":
    case "Fragmented":
    case "Stable":
    case "Neutral":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

function readPublicStructureTransition(
  value: unknown,
): PublicStructureTransition | null {
  switch (value) {
    case "Compression Phase":
    case "Expansion Phase":
    case "Recovery Structure":
    case "Fragmentation Detected":
    case "Stable Structure":
    case "Active Expansion":
    case "Neutral Structure":
      return value;

    default:
      return null;
  }
}

function readPublicImpulseContext(
  value: unknown,
): PublicImpulseContext {
  switch (value) {
    case "Compression":
    case "Pressure Building":
    case "Release":
    case "Exhaustion":
    case "Neutral":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

/* ============================================================================
 * 4. CANONICAL PUBLIC VIEW-MODEL ADAPTATION
 * ----------------------------------------------------------------------------
 * The UI accepts only complete public identities.
 *
 * Missing identity is not repaired with:
 * - UNKNOWN
 * - row index
 * - symbol-derived identifiers
 * - provider aliases
 * ========================================================================== */

function adaptPublicAsset(
  input: AssetInput,
): PublicAssetViewModel | null {
  const id =
    readNonEmptyString(
      input.id,
    );

  const symbol =
    readNonEmptyString(
      input.symbol,
    );

  const name =
    readNonEmptyString(
      input.name,
    );

  if (
    id === null ||
    symbol === null ||
    name === null
  ) {
    return null;
  }

  const canonicalSymbol =
    symbol.toUpperCase();

  return Object.freeze({
    key:
      id,

    id,

    rank:
      readPositiveInteger(
        input.rank,
      ),

    symbol:
      canonicalSymbol,

    name,

    logo_url:
      readLogoUrl(
        input.logo_url,
      ),

    price:
      readFiniteNumber(
        input.price,
      ),

    change_24h_pct:
      readFiniteNumber(
        input.chg_24h_pct,
      ),

    change_7d_pct:
      readFiniteNumber(
        input.chg_7d_pct,
      ),

    market_cap:
      readFiniteNumber(
        input.market_cap,
      ),

    volume_24h:
      readFiniteNumber(
        input.volume_24h,
      ),

    sparkline_7d:
      readNumberArray(
        input.sparkline_7d,
      ),

    activity:
      readPublicActivity(
        input.public_activity,
      ),

    sparkline_context_7d:
      readPublicSparklineContext7D(
        input
          .public_sparkline_context_7d,
      ),

    structural_transition:
      readPublicStructureTransition(
        input
          .public_structure_transition,
      ),

    impulse_context:
      readPublicImpulseContext(
        input
          .public_impulse_context,
      ),
  });
}

function isQualifiedPublicAsset(
  asset:
    PublicAssetViewModel,
): asset is QualifiedPublicAssetViewModel {
  return (
    asset.structural_transition !==
    null
  );
}

/* ============================================================================
 * 5. PRESENTATION HELPERS
 * ========================================================================== */

function resolveChangeClassName(
  value: number | null,
): string {
  if (value === null) {
    return "valueNeutral";
  }

  if (value > 0) {
    return "valuePositive";
  }

  if (value < 0) {
    return "valueNegative";
  }

  return "valueNeutral";
}

/* ============================================================================
 * 6. SHARED ASSET IDENTITY
 * ----------------------------------------------------------------------------
 * Logo rendering failure affects presentation only.
 *
 * It never changes:
 * - public identity
 * - analytical status
 * - ranking
 * ========================================================================== */

function AssetIdentity({
  asset,
  policy,
  compact = false,
}: {
  asset:
    PublicAssetViewModel;

  policy:
    PublicDisplayPolicy;

  compact?:
    boolean;
}) {
  const [
    imageUnavailable,
    setImageUnavailable,
  ] =
    useState(false);

  const showImage =
    asset.logo_url !== null &&
    !imageUnavailable;

  const logoAlt =
    buildPublicAssetLogoAlt(
      {
        asset_name:
          asset.name,

        asset_symbol:
          asset.symbol,
      },

      policy,
    );

  return (
    <div
      className={
        compact
          ? "assetIdentity assetIdentityCompact"
          : "assetIdentity"
      }
    >
      <div
        className="assetLogoFrame"
        title={
          showImage
            ? logoAlt
            : policy.labels.logo_unavailable
        }
      >
        {showImage ? (
          <img
            className="assetLogo"
            src={asset.logo_url ?? undefined}
            alt={logoAlt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() =>
              setImageUnavailable(
                true,
              )
            }
          />
        ) : (
          <span
            className="assetLogoFallback"
            aria-label={
              policy.labels
                .logo_unavailable
            }
          >
            {asset.symbol.slice(
              0,
              2,
            )}
          </span>
        )}
      </div>

      <div className="assetIdentityText">
        <strong>
          {asset.symbol}
        </strong>

        <span>
          {asset.name}
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
 * 7. CONTEXT CARDS
 * ========================================================================== */

function ContextCard({
  label,
  value,
  definition,
  emphasized = false,
}: ContextCardProps) {
  return (
    <div
      className={
        emphasized
          ? "contextCard contextCardMain"
          : "contextCard"
      }
      title={definition}
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function ContextBand({
  marketClimate,
  dominantTransition,
  impulseContext,
  growthContext,
  coreStructure,
  decayContext,
  activityContext,
  assetsAnalysed,
  qualifiedAssets,
  policy,
}: {
  marketClimate:
    PublicMarketClimate;

  dominantTransition:
    PublicStructureTransition |
    "Unavailable";

  impulseContext:
    PublicImpulseContext;

  growthContext:
    PublicGrowthContext;

  coreStructure:
    PublicCoreStructure;

  decayContext:
    PublicDecayContext;

  activityContext:
    PublicActivityLabel;

  assetsAnalysed:
    number;

  qualifiedAssets:
    number;

  policy:
    PublicDisplayPolicy;
}) {
  return (
    <div className="contextBand">
      <ContextCard
        emphasized
        label={
          policy.labels
            .market_structure_context
        }
        value={
          formatPublicMarketClimateLabel(
            marketClimate,
            policy,
          )
        }
        definition={
          getPublicDisplayDefinition(
            "market_structure_context",
            policy,
          )
        }
      />

      <ContextCard
        label={
          policy.labels
            .dominant_structural_transition
        }
        value={
          dominantTransition ===
          "Unavailable"
            ? policy.labels
                .unavailable
            : formatPublicStructureTransitionLabel(
                dominantTransition,
                policy,
              )
        }
        definition={
          getPublicDisplayDefinition(
            "dominant_structural_transition",
            policy,
          )
        }
      />

      <ContextCard
        label={
          policy.labels
            .structural_impulse_context
        }
        value={
          formatPublicImpulseContextLabel(
            impulseContext,
            policy,
          )
        }
        definition={
          getPublicDisplayDefinition(
            "structural_impulse_context",
            policy,
          )
        }
      />

      <ContextCard
        label={
          policy.labels
            .structural_activity
        }
        value={
          formatPublicActivityLabel(
            activityContext,
            policy,
          )
        }
        definition={
          getPublicDisplayDefinition(
            "structural_activity",
            policy,
          )
        }
      />

      <ContextCard
        label={
          policy.labels
            .structural_reinforcement
        }
        value={
          formatPublicGrowthContextLabel(
            growthContext,
            policy,
          )
        }
        definition={
          getPublicDisplayDefinition(
            "structural_reinforcement",
            policy,
          )
        }
      />

      <ContextCard
        label={
          policy.labels
            .core_structure
        }
        value={
          formatPublicCoreStructureLabel(
            coreStructure,
            policy,
          )
        }
        definition={
          getPublicDisplayDefinition(
            "core_structure",
            policy,
          )
        }
      />

      <ContextCard
        label={
          policy.labels
            .structural_erosion
        }
        value={
          formatPublicDecayContextLabel(
            decayContext,
            policy,
          )
        }
        definition={
          getPublicDisplayDefinition(
            "structural_erosion",
            policy,
          )
        }
      />

      <ContextCard
        label={
          policy.labels
            .assets_analysed
        }
        value={
          formatPublicCount(
            assetsAnalysed,
            policy,
          )
        }
        definition={
          getPublicDisplayDefinition(
            "assets_analysed",
            policy,
          )
        }
      />

      <ContextCard
        label={
          policy.labels
            .fully_qualified_assets
        }
        value={
          formatPublicCount(
            qualifiedAssets,
            policy,
          )
        }
      />
    </div>
  );
}

/* ============================================================================
 * 8. PUBLIC METADATA
 * ========================================================================== */

function PublicMetadata({
  updatedAt,
  dataSource,
  currency,
  policy,
}: {
  updatedAt:
    string |
    number |
    Date |
    null;

  dataSource:
    string |
    null;

  currency:
    PublicDisplayCurrency;

  policy:
    PublicDisplayPolicy;
}) {
  return (
    <div className="publicMetadata">
      <div>
        <span>
          {
            policy.labels
              .reference_currency
          }
        </span>

        <strong>
          {currency}
        </strong>
      </div>

      {updatedAt !== null ? (
        <div>
          <span>
            {
              policy.labels
                .last_updated
            }
          </span>

          <strong>
            {formatPublicDateTime(
              updatedAt,
              policy,
            )}
          </strong>
        </div>
      ) : null}

      {dataSource !== null ? (
        <div>
          <span>
            {
              policy.labels
                .data_source
            }
          </span>

          <strong>
            {formatPublicNullableText(
              dataSource,
              policy,
            )}
          </strong>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================================
 * 9. STRUCTURAL TRANSITION HIGHLIGHTS
 * ========================================================================== */

function TransitionPanel({
  assets,
  currency,
  policy,
}: {
  assets:
    readonly QualifiedPublicAssetViewModel[];

  currency:
    PublicDisplayCurrency;

  policy:
    PublicDisplayPolicy;
}) {
  return (
    <section className="transitionPanel">
      <div className="transitionPanelHeader">
        <div>
          <h2>
            {
              policy.labels
                .structural_transitions
            }
          </h2>

          <p
            title={
              getPublicDisplayDefinition(
                "structural_transition",
                policy,
              )
            }
          >
            {
              getPublicDisplayDefinition(
                "dominant_structural_transition",
                policy,
              )
            }
          </p>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="emptyState">
          {
            policy.labels
              .no_qualified_transition
          }
        </div>
      ) : (
        <div className="transitionGrid">
          {assets.map(
            (
              asset,
            ) => (
              <article
                className="transitionCard"
                key={
                  `transition-${asset.key}`
                }
              >
                <div className="transitionCardIdentity">
                  <AssetIdentity
                    asset={asset}
                    policy={policy}
                    compact
                  />

                  <span>
                    {formatPublicRank(
                      asset.rank,
                      policy,
                    )}
                  </span>
                </div>

                <div className="transitionCardPrice">
                  <strong>
                    {formatPublicPrice(
                      asset.price,
                      currency,
                      policy,
                    )}
                  </strong>

                  <span
                    className={
                      resolveChangeClassName(
                        asset
                          .change_7d_pct,
                      )
                    }
                  >
                    {formatPublicPercentage(
                      asset
                        .change_7d_pct,

                      {},

                      policy,
                    )}
                  </span>
                </div>

                <div className="transitionCardSpark">
                  <Sparkline
                    data={
                      asset.sparkline_7d
                    }
                    animated
                  />
                </div>

                <div>
                  <span>
                    {
                      policy.labels
                        .structural_transition
                    }
                  </span>

                  <p>
                    {formatPublicStructureTransitionLabel(
                      asset
                        .structural_transition,
                      policy,
                    )}
                  </p>
                </div>

                <div>
                  <span>
                    {
                      policy.labels
                        .structural_impulse_context
                    }
                  </span>

                  <p>
                    {formatPublicImpulseContextLabel(
                      asset
                        .impulse_context,
                      policy,
                    )}
                  </p>
                </div>

                <div>
                  <span>
                    {
                      policy.labels
                        .sparkline_context_7d
                    }
                  </span>

                  <p>
                    {formatPublicSparklineContext7DLabel(
                      asset
                        .sparkline_context_7d,
                      policy,
                    )}
                  </p>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}

/* ============================================================================
 * 10. DESKTOP MARKET TABLE
 * ========================================================================== */

function DesktopMarketTable({
  assets,
  currency,
  policy,
}: {
  assets:
    readonly PublicAssetViewModel[];

  currency:
    PublicDisplayCurrency;

  policy:
    PublicDisplayPolicy;
}) {
  return (
    <div className="desktopMarketTable">
      <table className="table">
        <thead>
          <tr>
            <th
              title={
                getPublicDisplayDefinition(
                  "market_cap_rank",
                  policy,
                )
              }
            >
              #
            </th>

            <th>
              {
                policy.labels
                  .asset
              }
            </th>

            <th>
              {
                policy.labels
                  .price
              }
            </th>

            <th>
              {
                policy.labels
                  .change_24h
              }
            </th>

            <th>
              {
                policy.labels
                  .change_7d
              }
            </th>

            <th>
              {
                policy.labels
                  .sparkline_7d
              }
            </th>

            <th
              title={
                getPublicDisplayDefinition(
                  "sparkline_context_7d",
                  policy,
                )
              }
            >
              {
                policy.labels
                  .sparkline_context_7d
              }
            </th>

            <th
              title={
                getPublicDisplayDefinition(
                  "structural_activity",
                  policy,
                )
              }
            >
              {
                policy.labels
                  .structural_activity
              }
            </th>

            <th
              title={
                getPublicDisplayDefinition(
                  "structural_impulse_context",
                  policy,
                )
              }
            >
              {
                policy.labels
                  .structural_impulse_context
              }
            </th>

            <th>
              {
                policy.labels
                  .trading_volume_24h
              }
            </th>

            <th>
              {
                policy.labels
                  .market_capitalisation
              }
            </th>

            <th
              title={
                getPublicDisplayDefinition(
                  "structural_transition",
                  policy,
                )
              }
            >
              {
                policy.labels
                  .structural_transition
              }
            </th>
          </tr>
        </thead>

        <tbody>
          {assets.map(
            (
              asset,
            ) => (
              <tr key={asset.key}>
                <td>
                  {formatPublicRank(
                    asset.rank,
                    policy,
                  )}
                </td>

                <td>
                  <AssetIdentity
                    asset={asset}
                    policy={policy}
                  />
                </td>

                <td className="dynamicPrice">
                  {formatPublicPrice(
                    asset.price,
                    currency,
                    policy,
                  )}
                </td>

                <td
                  className={
                    `dynamicPct24h ${resolveChangeClassName(
                      asset
                        .change_24h_pct,
                    )}`
                  }
                >
                  {formatPublicPercentage(
                    asset
                      .change_24h_pct,

                    {},

                    policy,
                  )}
                </td>

                <td
                  className={
                    resolveChangeClassName(
                      asset
                        .change_7d_pct,
                    )
                  }
                >
                  {formatPublicPercentage(
                    asset
                      .change_7d_pct,

                    {},

                    policy,
                  )}
                </td>

                <td>
                  <Sparkline
                    data={
                      asset.sparkline_7d
                    }
                    animated
                  />
                </td>

                <td>
                  {formatPublicSparklineContext7DLabel(
                    asset
                      .sparkline_context_7d,
                    policy,
                  )}
                </td>

                <td>
                  {formatPublicActivityLabel(
                    asset.activity,
                    policy,
                  )}
                </td>

                <td>
                  {formatPublicImpulseContextLabel(
                    asset
                      .impulse_context,
                    policy,
                  )}
                </td>

                <td>
                  {formatPublicCompactMonetaryValue(
                    asset
                      .volume_24h,
                    currency,
                    policy,
                  )}
                </td>

                <td>
                  {formatPublicCompactMonetaryValue(
                    asset.market_cap,
                    currency,
                    policy,
                  )}
                </td>

                <td>
                  {formatPublicStructureTransitionLabel(
                    asset
                      .structural_transition,
                    policy,
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================
 * 11. MOBILE MARKET CARDS
 * ========================================================================== */

function MobileMarketCards({
  assets,
  currency,
  policy,
}: {
  assets:
    readonly PublicAssetViewModel[];

  currency:
    PublicDisplayCurrency;

  policy:
    PublicDisplayPolicy;
}) {
  return (
    <div className="mobileMarketCards">
      {assets.map(
        (
          asset,
        ) => (
          <article
            className="mobileAssetCard"
            key={
              `mobile-${asset.key}`
            }
          >
            <div className="mobileAssetHeader">
              <div>
                <span>
                  #
                  {formatPublicRank(
                    asset.rank,
                    policy,
                  )}
                </span>

                <AssetIdentity
                  asset={asset}
                  policy={policy}
                  compact
                />
              </div>

              <div className="mobileAssetPrice">
                <strong className="dynamicPrice">
                  {formatPublicPrice(
                    asset.price,
                    currency,
                    policy,
                  )}
                </strong>

                <span
                  className={
                    `dynamicPct24h ${resolveChangeClassName(
                      asset
                        .change_24h_pct,
                    )}`
                  }
                >
                  {formatPublicPercentage(
                    asset
                      .change_24h_pct,

                    {},

                    policy,
                  )}
                </span>
              </div>
            </div>

            <div className="mobileSparkline">
              <Sparkline
                data={
                  asset.sparkline_7d
                }
                animated
              />

              <span
                className={
                  resolveChangeClassName(
                    asset
                      .change_7d_pct,
                  )
                }
              >
                {formatPublicPercentage(
                  asset
                    .change_7d_pct,

                  {},

                  policy,
                )}
              </span>
            </div>

            <div className="mobileAssetMeta">
              <div>
                <span>
                  {
                    policy.labels
                      .structural_transition
                  }
                </span>

                <strong>
                  {formatPublicStructureTransitionLabel(
                    asset
                      .structural_transition,
                    policy,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  {
                    policy.labels
                      .structural_impulse_context
                  }
                </span>

                <strong>
                  {formatPublicImpulseContextLabel(
                    asset
                      .impulse_context,
                    policy,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  {
                    policy.labels
                      .structural_activity
                  }
                </span>

                <strong>
                  {formatPublicActivityLabel(
                    asset.activity,
                    policy,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  {
                    policy.labels
                      .sparkline_context_7d
                  }
                </span>

                <strong>
                  {formatPublicSparklineContext7DLabel(
                    asset
                      .sparkline_context_7d,
                    policy,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  {
                    policy.labels
                      .trading_volume_24h
                  }
                </span>

                <strong>
                  {formatPublicCompactMonetaryValue(
                    asset
                      .volume_24h,
                    currency,
                    policy,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  {
                    policy.labels
                      .market_capitalisation
                  }
                </span>

                <strong>
                  {formatPublicCompactMonetaryValue(
                    asset
                      .market_cap,
                    currency,
                    policy,
                  )}
                </strong>
              </div>
            </div>
          </article>
        ),
      )}
    </div>
  );
}

/* ============================================================================
 * 12. MAIN COMPONENT
 * ========================================================================== */

export default function ScanTable({
  assets,
  quote = "EUR",
  language = "en",
  updatedAt = null,
  dataSource = null,
  limit = 250,
}: Props) {
  const [
    query,
    setQuery,
  ] =
    useState("");

  const deferredQuery =
    useDeferredValue(
      query,
    );

  const currency =
    resolveDisplayCurrency(
      quote,
    );

  const policy =
    useMemo(
      () =>
        resolvePublicDisplayPolicy({
          language,

          default_currency:
            currency,
        }),
      [
        language,
        currency,
      ],
    );

  const sourceAssets =
    useMemo(
      () =>
        normalizeSourceAssets(
          assets,
        ),
      [
        assets,
      ],
    );

  const normalizedLimit =
    normalizeLimit(
      limit,
    );

  /*
   * Complete normalized public universe.
   *
   * This collection remains independent from:
   * - search
   * - visible row limit
   * - desktop/mobile rendering
   * - transition highlight count
   */
  const normalizedData =
    useMemo<
      PublicAssetViewModel[]
    >(
      () => {
        if (
          sourceAssets === null
        ) {
          return [];
        }

        const normalized:
          PublicAssetViewModel[] =
          [];

        for (
          const candidate of
          sourceAssets
        ) {
          if (
            typeof candidate !==
              "object" ||
            candidate === null
          ) {
            continue;
          }

          const asset =
            adaptPublicAsset(
              candidate as
                AssetInput,
            );

          if (asset !== null) {
            normalized.push(
              asset,
            );
          }
        }

        return normalized;
      },
      [
        sourceAssets,
      ],
    );

  /*
   * Qualified public universe.
   *
   * A qualified asset has an explicit public structural transition.
   * Missing transition is not converted into Neutral Structure.
   */
  const qualifiedData =
    useMemo<
      QualifiedPublicAssetViewModel[]
    >(
      () =>
        normalizedData.filter(
          isQualifiedPublicAsset,
        ),
      [
        normalizedData,
      ],
    );

  /*
   * Visible market rows only.
   *
   * Search and row limit do not affect:
   * - global context
   * - qualified count
   * - structural transition ranking
   */
  const visibleData =
    useMemo<
      PublicAssetViewModel[]
    >(
      () => {
        const normalizedQuery =
          deferredQuery
            .trim()
            .toLowerCase();

        const filtered =
          normalizedQuery.length >
          0
            ? normalizedData.filter(
                (
                  asset,
                ) =>
                  asset.symbol
                    .toLowerCase()
                    .includes(
                      normalizedQuery,
                    ) ||
                  asset.name
                    .toLowerCase()
                    .includes(
                      normalizedQuery,
                    ),
              )
            : normalizedData;

        return filtered.slice(
          0,
          normalizedLimit,
        );
      },
      [
        normalizedData,
        deferredQuery,
        normalizedLimit,
      ],
    );

  /*
   * Global public summary.
   *
   * Only contract-qualified structural-transition records are supplied.
   * The UI does not create a replacement transition for unavailable assets.
   */
  const structuralSummary =
    useMemo(
      () =>
        buildPublicMarketStructureSummary(
          qualifiedData.map(
            (
              asset,
            ) => ({
              activity:
                asset.activity,

              sparkline_context_7d:
                asset
                  .sparkline_context_7d,

              structure_transition:
                asset
                  .structural_transition,

              impulse_context:
                asset
                  .impulse_context,
            }),
          ),
        ),
      [
        qualifiedData,
      ],
    );

  /*
   * Governed structural-transition highlights.
   *
   * Ranking priority, tie-breakers and validation remain owned by:
   * - structural-transition-ranking.ts
   */
  const transitionHighlights =
    useMemo<
      QualifiedPublicAssetViewModel[]
    >(
      () => {
        const ranking =
          getStructuralTransitionHighlights(
            qualifiedData.map(
              (
                asset,
              ) => ({
                id:
                  asset.id,

                symbol:
                  asset.symbol,

                public_activity:
                  asset.activity,

                public_structure_transition:
                  asset
                    .structural_transition,

                public_impulse_context:
                  asset
                    .impulse_context,
              }),
            ),
            3,
          );

        if (
          !ranking.validation
            .valid
        ) {
          return [];
        }

        const assetsByIdentity =
          new Map<
            string,
            QualifiedPublicAssetViewModel
          >(
            qualifiedData.map(
              (
                asset,
              ) => [
                asset.id,
                asset,
              ],
            ),
          );

        return ranking.data
          .map(
            (
              rankedAsset,
            ) => {
              const id =
                readNonEmptyString(
                  rankedAsset.id,
                );

              return id === null
                ? undefined
                : assetsByIdentity.get(
                    id,
                  );
            },
          )
          .filter(
            (
              asset,
            ): asset is
              QualifiedPublicAssetViewModel =>
              asset !==
              undefined,
          );
      },
      [
        qualifiedData,
      ],
    );

  if (
    sourceAssets === null
  ) {
    return (
      <div className="emptyState">
        {
          policy.labels
            .no_data
        }
      </div>
    );
  }

  return (
    <section className="section">
      <header className="header">
        <h1>
          {
            policy.labels
              .product_name
          }
        </h1>

        <p>
          {
            policy.labels
              .product_positioning
          }
        </p>

        <p>
          {
            policy.labels
              .product_description
          }
        </p>

        <PublicMetadata
          updatedAt={
            updatedAt
          }
          dataSource={
            dataSource
          }
          currency={
            currency
          }
          policy={
            policy
          }
        />
      </header>

      <ContextBand
        marketClimate={
          structuralSummary
            .market_climate
        }
        dominantTransition={
          structuralSummary
            .dominant_transition
        }
        impulseContext={
          structuralSummary
            .impulse_context
        }
        activityContext={
          structuralSummary
            .activity_context
        }
        growthContext={
          structuralSummary
            .growth_context
        }
        coreStructure={
          structuralSummary
            .core_structure
        }
        decayContext={
          structuralSummary
            .decay_context
        }
        assetsAnalysed={
          normalizedData.length
        }
        qualifiedAssets={
          qualifiedData.length
        }
        policy={
          policy
        }
      />

      <div className="toolbar">
        <div className="marketState">
          <span>
            {
              policy.labels
                .market_structure_context
            }
          </span>

          <strong>
            {formatPublicMarketClimateLabel(
              structuralSummary
                .market_climate,
              policy,
            )}
          </strong>
        </div>

        <div className="searchControl">
          <input
            type="search"
            placeholder={
              policy.labels
                .search_placeholder
            }
            aria-label={
              policy.labels
                .search_placeholder
            }
            value={query}
            onChange={(
              event,
            ) =>
              setQuery(
                event.target
                  .value,
              )
            }
          />

          <span>
            {
              policy.labels
                .search_results
            }
            :{" "}
            {formatPublicCount(
              visibleData.length,
              policy,
            )}
          </span>
        </div>
      </div>

      <TransitionPanel
        assets={
          transitionHighlights
        }
        currency={
          currency
        }
        policy={
          policy
        }
      />

      <section className="marketSection">
        <div className="marketSectionHeader">
          <h2>
            {
              policy.labels
                .market_structure_context
            }
          </h2>
        </div>

        {visibleData.length ===
        0 ? (
          <div className="emptyState">
            {
              deferredQuery
                .trim()
                .length > 0
                ? policy.labels
                    .no_matching_assets
                : policy.labels
                    .no_data
            }
          </div>
        ) : (
          <>
            <DesktopMarketTable
              assets={
                visibleData
              }
              currency={
                currency
              }
              policy={
                policy
              }
            />

            <MobileMarketCards
              assets={
                visibleData
              }
              currency={
                currency
              }
              policy={
                policy
              }
            />
          </>
        )}
      </section>

      <footer className="publicDisclaimer">
        <p>
          {getPublicDisclaimer(
            policy,
          )}
        </p>

        <p>
          {
            policy.labels
              .reference_currency
          }
          : {currency}
        </p>
      </footer>
    </section>
  );
}
