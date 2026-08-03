/* ============================================================================
 * FILE: lib/xyvala/public/public-display-policy.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical public display policy
 *
 * ROLE
 * - define the canonical European presentation policy for public Xyvala data
 * - centralize public terminology, definitions and availability wording
 * - format public numbers, percentages, monetary values, ranks and timestamps
 * - translate already-resolved public states without reclassifying them
 * - provide one deterministic display policy for every public interface
 *
 * CLASSIFICATION
 * - PUBLIC
 * - PRESENTATION POLICY
 * - READ / FORMAT / LABEL
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
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
 * - canonical private-to-public transformer
 *
 * CONSUMERS
 * - components/scan-table.tsx
 * - public asset cards
 * - public structural context panels
 * - public ranking views
 * - public exports
 * - public documentation surfaces
 *
 * DIRECTIVES
 * - public presentation only
 * - no analytical computation
 * - no structural classification
 * - no transition classification
 * - no public ranking computation
 * - no private contract dependency
 * - no RFS dependency
 * - no Triple Layer producer dependency
 * - no Impulse Layer producer dependency
 * - no MCI dependency
 * - no calibration dependency
 * - no provider parsing
 * - no React dependency
 * - no Next.js runtime dependency
 * - no CSS dependency
 * - no private score exposure
 * - no threshold exposure
 * - no formula exposure
 * - no local clock access
 * - no timestamp generation
 * - no currency inference from asset identity
 * - no unavailable-to-neutral substitution
 * - no unavailable-to-zero substitution
 * - no synthetic rank
 * - no synthetic analytical truth
 * - no native Intl compact notation
 * - no investment recommendation wording
 * - EUR remains the default monetary reference
 * - USD and USDT remain explicit alternatives
 * - USDT is never represented as EUR or USD
 *
 * INPUTS
 * - validated public values
 * - explicit public language
 * - explicit public currency
 * - explicit timestamps supplied by upstream contracts
 *
 * OUTPUTS
 * - PublicDisplayPolicy
 * - canonical public labels
 * - canonical public definitions
 * - canonical availability wording
 * - deterministic European display strings
 *
 * OWNERSHIP
 * - public transformers own public analytical truth
 * - public structure owns public analytical classifications
 * - public ranking modules own public ranking truth
 * - this file owns public representation conventions only
 *
 * INVARIANTS
 * - public truth and public representation remain separate
 * - one public concept has one canonical label per language
 * - unavailable never becomes neutral
 * - partial never becomes neutral
 * - invalid never becomes neutral
 * - zero remains a valid observable value
 * - null remains explicitly unavailable
 * - undefined is not a governed display value
 * - formatting never changes its source value
 * - identical value and context produce identical output
 * - definitions never expose thresholds, formulas or private scores
 * - monetary values require an explicit currency
 * - temporal formatting requires an explicit upstream timestamp
 * - public-state translation accepts only public contract states
 * - server and client monetary abbreviations remain identical
 *
 * FIRST DIVERGENCE
 * - invalid public value
 *   => public contract or private/public transformer
 *
 * - valid public value represented with incorrect terminology
 *   => public display policy
 *
 * - valid display-policy output altered locally
 *   => consuming interface
 *
 * SENSITIVE ZONES
 * - European terminology
 * - public contract compatibility
 * - locale resolution
 * - deterministic compact monetary formatting
 * - USDT formatting
 * - availability semantics
 * - timestamp formatting
 * - public disclaimer wording
 * - public/private separation
 * ========================================================================== */

import type {
  PublicActivityLabel,
  PublicCoreStructure,
  PublicDecayContext,
  PublicGrowthContext,
  PublicImpulseContext,
  PublicMarketClimate,
  PublicSparklineContext7D,
  PublicStructureTransition,
} from "@/lib/xyvala/public/public-structure";

/* ============================================================================
 * 1. POLICY IDENTITY
 * ========================================================================== */

export const XYVALA_PUBLIC_DISPLAY_POLICY_NAME =
  "xyvala-public-display-policy" as const;

export const XYVALA_PUBLIC_DISPLAY_POLICY_VERSION =
  "1.2.0" as const;

export type PublicDisplayPolicyName =
  typeof XYVALA_PUBLIC_DISPLAY_POLICY_NAME;

export type PublicDisplayPolicyVersion =
  typeof XYVALA_PUBLIC_DISPLAY_POLICY_VERSION;

/* ============================================================================
 * 2. DISPLAY CONTEXT
 * ========================================================================== */

export type PublicDisplayLanguage =
  | "en"
  | "fr";

export type PublicDisplayLocale =
  | "en-GB"
  | "fr-FR";

export type PublicDisplayJurisdiction =
  "FR/EU";

export type PublicDisplayTimeZone =
  "Europe/Paris";

export type PublicDisplayCurrency =
  | "EUR"
  | "USD"
  | "USDT";

export type PublicDisplayContext = Readonly<{
  language: PublicDisplayLanguage;
  locale: PublicDisplayLocale;
  jurisdiction: PublicDisplayJurisdiction;
  time_zone: PublicDisplayTimeZone;
  default_currency: PublicDisplayCurrency;
}>;

export const DEFAULT_PUBLIC_DISPLAY_CONTEXT:
  PublicDisplayContext =
  Object.freeze({
    language: "en",
    locale: "en-GB",
    jurisdiction: "FR/EU",
    time_zone: "Europe/Paris",
    default_currency: "EUR",
  });

export const FRENCH_PUBLIC_DISPLAY_CONTEXT:
  PublicDisplayContext =
  Object.freeze({
    language: "fr",
    locale: "fr-FR",
    jurisdiction: "FR/EU",
    time_zone: "Europe/Paris",
    default_currency: "EUR",
  });

/* ============================================================================
 * 3. LABEL AND DEFINITION IDENTITIES
 * ========================================================================== */

export type PublicDisplayLabelKey =
  | "product_name"
  | "product_positioning"
  | "product_description"
  | "market_structure_context"
  | "dominant_structural_transition"
  | "structural_impulse_context"
  | "structural_activity"
  | "structural_reinforcement"
  | "core_structure"
  | "structural_erosion"
  | "assets_analysed"
  | "fully_qualified_assets"
  | "asset"
  | "market_cap_rank"
  | "price"
  | "change_24h"
  | "change_7d"
  | "sparkline_7d"
  | "sparkline_context_7d"
  | "trading_volume_24h"
  | "market_capitalisation"
  | "structural_transition"
  | "structural_transitions"
  | "transition"
  | "impulse"
  | "activity"
  | "search_placeholder"
  | "search_results"
  | "last_updated"
  | "data_source"
  | "reference_currency"
  | "jurisdiction"
  | "display_policy"
  | "available"
  | "partially_available"
  | "unavailable"
  | "invalid"
  | "not_applicable"
  | "no_data"
  | "no_matching_assets"
  | "no_qualified_transition"
  | "logo_unavailable"
  | "public_disclaimer";

export type PublicDisplayDefinitionKey =
  | "market_structure_context"
  | "dominant_structural_transition"
  | "structural_activity"
  | "structural_impulse_context"
  | "structural_reinforcement"
  | "core_structure"
  | "structural_erosion"
  | "structural_transition"
  | "sparkline_context_7d"
  | "market_cap_rank"
  | "assets_analysed";

export type PublicDisplayAvailability =
  | "available"
  | "partial"
  | "unavailable"
  | "invalid"
  | "not_applicable";

export type PublicDisplayLabels =
  Readonly<
    Record<
      PublicDisplayLabelKey,
      string
    >
  >;

export type PublicDisplayDefinitions =
  Readonly<
    Record<
      PublicDisplayDefinitionKey,
      string
    >
  >;

/* ============================================================================
 * 4. EUROPEAN ENGLISH CATALOGUE
 * ========================================================================== */

const EN_GB_PUBLIC_LABELS:
  PublicDisplayLabels =
  Object.freeze({
    product_name:
      "Xyvala",

    product_positioning:
      "European Market Structure Intelligence",

    product_description:
      "Read validated structural market contexts and transitions across digital assets.",

    market_structure_context:
      "Market Structure Context",

    dominant_structural_transition:
      "Dominant Structural Transition",

    structural_impulse_context:
      "Structural Impulse Context",

    structural_activity:
      "Structural Activity",

    structural_reinforcement:
      "Structural Reinforcement",

    core_structure:
      "Core Structure",

    structural_erosion:
      "Structural Erosion",

    assets_analysed:
      "Assets Analysed",

    fully_qualified_assets:
      "Fully Qualified Assets",

    asset:
      "Asset",

    market_cap_rank:
      "Market Capitalisation Rank",

    price:
      "Price",

    change_24h:
      "24H Change",

    change_7d:
      "7D Change",

    sparkline_7d:
      "7D Price Structure",

    sparkline_context_7d:
      "7D Structural Context",

    trading_volume_24h:
      "24H Trading Volume",

    market_capitalisation:
      "Market Capitalisation",

    structural_transition:
      "Structural Transition",

    structural_transitions:
      "Structural Transitions",

    transition:
      "Transition",

    impulse:
      "Impulse",

    activity:
      "Activity",

    search_placeholder:
      "Search by asset name or symbol",

    search_results:
      "Search Results",

    last_updated:
      "Last Updated",

    data_source:
      "Data Source",

    reference_currency:
      "Reference Currency",

    jurisdiction:
      "Jurisdiction",

    display_policy:
      "Display Policy",

    available:
      "Available",

    partially_available:
      "Partially Available",

    unavailable:
      "Unavailable",

    invalid:
      "Unavailable",

    not_applicable:
      "Not Applicable",

    no_data:
      "No public data available.",

    no_matching_assets:
      "No assets match this search.",

    no_qualified_transition:
      "No qualified structural transition is currently available.",

    logo_unavailable:
      "Asset logo unavailable",

    public_disclaimer:
      "For information only. This does not constitute investment advice or an investment recommendation.",
  });

const EN_GB_PUBLIC_DEFINITIONS:
  PublicDisplayDefinitions =
  Object.freeze({
    market_structure_context:
      "A public summary of the dominant structural conditions observed across the analysed market universe.",

    dominant_structural_transition:
      "The most represented qualified structural transition within the analysed public universe.",

    structural_activity:
      "The validated public level of structural movement observed for an asset or across the analysed universe.",

    structural_impulse_context:
      "A public contextual reading describing how structural pressure is currently expressed.",

    structural_reinforcement:
      "A public context describing whether established structures are strengthening across the analysed universe.",

    core_structure:
      "A public reading of the central structural condition observed across the analysed universe.",

    structural_erosion:
      "A public context describing whether previously established structures are weakening.",

    structural_transition:
      "The validated public description of an ongoing change in market structure.",

    sparkline_context_7d:
      "A validated public contextual description of the observed seven-day price structure.",

    market_cap_rank:
      "The asset rank supplied by the authorised market-data source, normally based on market capitalisation.",

    assets_analysed:
      "The number of assets included in the complete public analytical universe before interface search or display limits.",
  });

/* ============================================================================
 * 5. FRENCH CATALOGUE
 * ========================================================================== */

const FR_FR_PUBLIC_LABELS:
  PublicDisplayLabels =
  Object.freeze({
    product_name:
      "Xyvala",

    product_positioning:
      "Intelligence européenne des structures de marché",

    product_description:
      "Lecture des contextes et transitions structurelles validés sur les actifs numériques.",

    market_structure_context:
      "Contexte structurel du marché",

    dominant_structural_transition:
      "Transition structurelle dominante",

    structural_impulse_context:
      "Contexte d’impulsion structurelle",

    structural_activity:
      "Activité structurelle",

    structural_reinforcement:
      "Renforcement structurel",

    core_structure:
      "Structure centrale",

    structural_erosion:
      "Érosion structurelle",

    assets_analysed:
      "Actifs analysés",

    fully_qualified_assets:
      "Actifs entièrement qualifiés",

    asset:
      "Actif",

    market_cap_rank:
      "Rang par capitalisation",

    price:
      "Prix",

    change_24h:
      "Variation sur 24 h",

    change_7d:
      "Variation sur 7 j",

    sparkline_7d:
      "Structure du prix sur 7 j",

    sparkline_context_7d:
      "Contexte structurel sur 7 j",

    trading_volume_24h:
      "Volume d’échange sur 24 h",

    market_capitalisation:
      "Capitalisation",

    structural_transition:
      "Transition structurelle",

    structural_transitions:
      "Transitions structurelles",

    transition:
      "Transition",

    impulse:
      "Impulsion",

    activity:
      "Activité",

    search_placeholder:
      "Rechercher par nom ou symbole",

    search_results:
      "Résultats de recherche",

    last_updated:
      "Dernière mise à jour",

    data_source:
      "Source des données",

    reference_currency:
      "Devise de référence",

    jurisdiction:
      "Juridiction",

    display_policy:
      "Politique d’affichage",

    available:
      "Disponible",

    partially_available:
      "Partiellement disponible",

    unavailable:
      "Indisponible",

    invalid:
      "Indisponible",

    not_applicable:
      "Non applicable",

    no_data:
      "Aucune donnée publique disponible.",

    no_matching_assets:
      "Aucun actif ne correspond à cette recherche.",

    no_qualified_transition:
      "Aucune transition structurelle qualifiée n’est actuellement disponible.",

    logo_unavailable:
      "Logo de l’actif indisponible",

    public_disclaimer:
      "Informations fournies à titre indicatif uniquement. Elles ne constituent ni un conseil en investissement ni une recommandation d’investissement.",
  });

const FR_FR_PUBLIC_DEFINITIONS:
  PublicDisplayDefinitions =
  Object.freeze({
    market_structure_context:
      "Synthèse publique des conditions structurelles dominantes observées sur l’univers de marché analysé.",

    dominant_structural_transition:
      "Transition structurelle qualifiée la plus représentée dans l’univers public analysé.",

    structural_activity:
      "Niveau public validé de mouvement structurel observé sur un actif ou sur l’univers analysé.",

    structural_impulse_context:
      "Lecture contextuelle publique décrivant la manière dont la pression structurelle s’exprime actuellement.",

    structural_reinforcement:
      "Contexte public décrivant le renforcement éventuel des structures établies dans l’univers analysé.",

    core_structure:
      "Lecture publique de la condition structurelle centrale observée dans l’univers analysé.",

    structural_erosion:
      "Contexte public décrivant l’affaiblissement éventuel de structures précédemment établies.",

    structural_transition:
      "Description publique validée d’un changement en cours dans la structure de marché.",

    sparkline_context_7d:
      "Description contextuelle publique validée de la structure du prix observée sur sept jours.",

    market_cap_rank:
      "Rang fourni par la source de données de marché autorisée, généralement fondé sur la capitalisation.",

    assets_analysed:
      "Nombre d’actifs inclus dans l’univers analytique public complet avant recherche ou limitation d’affichage.",
  });

/* ============================================================================
 * 6. POLICY CONTRACT
 * ========================================================================== */

export type PublicDisplayPolicy =
  Readonly<{
    policy_name:
      PublicDisplayPolicyName;

    policy_version:
      PublicDisplayPolicyVersion;

    context:
      PublicDisplayContext;

    labels:
      PublicDisplayLabels;

    definitions:
      PublicDisplayDefinitions;

    disclaimer:
      string;
  }>;

/* ============================================================================
 * 7. SAFE PRIMITIVE HELPERS
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function normalizeMinimumFractionDigits(
  value: number | undefined,
  fallback: number,
): number {
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 20
  ) {
    return fallback;
  }

  return value;
}

function normalizeMaximumFractionDigits(
  value: number | undefined,
  fallback: number,
): number {
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 20
  ) {
    return fallback;
  }

  return value;
}

function resolveBaseContext(
  language:
    PublicDisplayLanguage | undefined,
): PublicDisplayContext {
  return language === "fr"
    ? FRENCH_PUBLIC_DISPLAY_CONTEXT
    : DEFAULT_PUBLIC_DISPLAY_CONTEXT;
}

function resolveLabels(
  language:
    PublicDisplayLanguage,
): PublicDisplayLabels {
  return language === "fr"
    ? FR_FR_PUBLIC_LABELS
    : EN_GB_PUBLIC_LABELS;
}

function resolveDefinitions(
  language:
    PublicDisplayLanguage,
): PublicDisplayDefinitions {
  return language === "fr"
    ? FR_FR_PUBLIC_DEFINITIONS
    : EN_GB_PUBLIC_DEFINITIONS;
}

/* ============================================================================
 * 8. POLICY RESOLUTION
 * ========================================================================== */

export function resolvePublicDisplayPolicy(
  input?:
    Readonly<{
      language?:
        PublicDisplayLanguage;

      default_currency?:
        PublicDisplayCurrency;
    }>,
): PublicDisplayPolicy {
  const baseContext =
    resolveBaseContext(
      input?.language,
    );

  const context:
    PublicDisplayContext =
    Object.freeze({
      ...baseContext,

      default_currency:
        input?.default_currency ??
        baseContext.default_currency,
    });

  const labels =
    resolveLabels(
      context.language,
    );

  const definitions =
    resolveDefinitions(
      context.language,
    );

  return Object.freeze({
    policy_name:
      XYVALA_PUBLIC_DISPLAY_POLICY_NAME,

    policy_version:
      XYVALA_PUBLIC_DISPLAY_POLICY_VERSION,

    context,

    labels,

    definitions,

    disclaimer:
      labels.public_disclaimer,
  });
}

export const DEFAULT_PUBLIC_DISPLAY_POLICY =
  resolvePublicDisplayPolicy();

export const FRENCH_PUBLIC_DISPLAY_POLICY =
  resolvePublicDisplayPolicy({
    language: "fr",
  });

/* ============================================================================
 * 9. CATALOGUE READERS
 * ========================================================================== */

export function getPublicDisplayLabel(
  key:
    PublicDisplayLabelKey,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return policy.labels[key];
}

export function getPublicDisplayDefinition(
  key:
    PublicDisplayDefinitionKey,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return policy.definitions[key];
}

/* ============================================================================
 * 10. AVAILABILITY REPRESENTATION
 * ========================================================================== */

export function formatPublicAvailability(
  availability:
    PublicDisplayAvailability,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  switch (availability) {
    case "available":
      return policy.labels.available;

    case "partial":
      return policy.labels.partially_available;

    case "not_applicable":
      return policy.labels.not_applicable;

    case "invalid":
      return policy.labels.invalid;

    case "unavailable":
    default:
      return policy.labels.unavailable;
  }
}

export function formatPublicNullableText(
  value:
    string | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return isNonEmptyString(value)
    ? value.trim()
    : policy.labels.unavailable;
}

/* ============================================================================
 * 11. NUMBER FORMATTING
 * ========================================================================== */

export type PublicNumberFormatOptions =
  Readonly<{
    minimum_fraction_digits?:
      number;

    maximum_fraction_digits?:
      number;

    use_grouping?:
      boolean;
  }>;

export function formatPublicNumber(
  value:
    number | null,

  options:
    PublicNumberFormatOptions =
      {},

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  if (!isFiniteNumber(value)) {
    return policy.labels.unavailable;
  }

  const minimumFractionDigits =
    normalizeMinimumFractionDigits(
      options.minimum_fraction_digits,
      0,
    );

  const maximumFractionDigits =
    Math.max(
      minimumFractionDigits,
      normalizeMaximumFractionDigits(
        options.maximum_fraction_digits,
        2,
      ),
    );

  return new Intl.NumberFormat(
    policy.context.locale,
    {
      notation: "standard",
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping:
        options.use_grouping ??
        true,
    },
  ).format(value);
}

/* ============================================================================
 * 12. PERCENTAGE FORMATTING
 * ----------------------------------------------------------------------------
 * Xyvala convention:
 * - 4.25 means 4.25%
 * - 4.25 does not mean 425%
 * ========================================================================== */

export type PublicPercentageFormatOptions =
  Readonly<{
    minimum_fraction_digits?:
      number;

    maximum_fraction_digits?:
      number;

    show_positive_sign?:
      boolean;
  }>;

export function formatPublicPercentage(
  value:
    number | null,

  options:
    PublicPercentageFormatOptions =
      {},

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  if (!isFiniteNumber(value)) {
    return policy.labels.unavailable;
  }

  const minimumFractionDigits =
    normalizeMinimumFractionDigits(
      options.minimum_fraction_digits,
      2,
    );

  const maximumFractionDigits =
    Math.max(
      minimumFractionDigits,
      normalizeMaximumFractionDigits(
        options.maximum_fraction_digits,
        2,
      ),
    );

  return new Intl.NumberFormat(
    policy.context.locale,
    {
      style: "percent",
      minimumFractionDigits,
      maximumFractionDigits,

      signDisplay:
        options.show_positive_sign === false
          ? "auto"
          : "exceptZero",
    },
  ).format(
    value / 100,
  );
}

/* ============================================================================
 * 13. DETERMINISTIC MONETARY HELPERS
 * ----------------------------------------------------------------------------
 * Native Intl compact notation is deliberately forbidden.
 *
 * Xyvala resolves:
 * - magnitude
 * - magnitude suffix
 * - suffix position
 * - currency position
 *
 * Intl is limited to stable standard decimal and currency representation.
 * ========================================================================== */

type PublicMonetaryMagnitude =
  | "unit"
  | "thousand"
  | "million"
  | "billion"
  | "trillion";

type NonUnitPublicMonetaryMagnitude =
  Exclude<
    PublicMonetaryMagnitude,
    "unit"
  >;

type ResolvedPublicMonetaryMagnitude =
  Readonly<{
    magnitude:
      PublicMonetaryMagnitude;

    divisor:
      number;
  }>;

const PUBLIC_MONETARY_MAGNITUDES:
  readonly ResolvedPublicMonetaryMagnitude[] =
  Object.freeze([
    Object.freeze({
      magnitude: "trillion",
      divisor: 1_000_000_000_000,
    }),

    Object.freeze({
      magnitude: "billion",
      divisor: 1_000_000_000,
    }),

    Object.freeze({
      magnitude: "million",
      divisor: 1_000_000,
    }),

    Object.freeze({
      magnitude: "thousand",
      divisor: 1_000,
    }),
  ]);

const PUBLIC_MONETARY_SUFFIXES:
  Readonly<
    Record<
      PublicDisplayLanguage,
      Readonly<
        Record<
          NonUnitPublicMonetaryMagnitude,
          string
        >
      >
    >
  > =
  Object.freeze({
    en:
      Object.freeze({
        thousand: "K",
        million: "M",
        billion: "bn",
        trillion: "tn",
      }),

    fr:
      Object.freeze({
        thousand: "k",
        million: "M",
        billion: "Md",
        trillion: "Bn",
      }),
  });

function resolvePriceFractionDigits(
  value: number,
): Readonly<{
  minimum_fraction_digits: number;
  maximum_fraction_digits: number;
}> {
  const absoluteValue =
    Math.abs(value);

  if (
    absoluteValue > 0 &&
    absoluteValue < 0.0001
  ) {
    return {
      minimum_fraction_digits: 0,
      maximum_fraction_digits: 8,
    };
  }

  if (
    absoluteValue > 0 &&
    absoluteValue < 1
  ) {
    return {
      minimum_fraction_digits: 0,
      maximum_fraction_digits: 6,
    };
  }

  return {
    minimum_fraction_digits: 0,
    maximum_fraction_digits: 2,
  };
}

function resolvePublicMonetaryMagnitude(
  value: number,
): ResolvedPublicMonetaryMagnitude {
  const absoluteValue =
    Math.abs(value);

  for (
    const candidate of
    PUBLIC_MONETARY_MAGNITUDES
  ) {
    if (
      absoluteValue >=
      candidate.divisor
    ) {
      return candidate;
    }
  }

  return {
    magnitude: "unit",
    divisor: 1,
  };
}

function resolveCompactFractionDigits(
  value: number,
): Readonly<{
  minimum_fraction_digits: number;
  maximum_fraction_digits: number;
}> {
  const absoluteValue =
    Math.abs(value);

  if (absoluteValue >= 100) {
    return {
      minimum_fraction_digits: 0,
      maximum_fraction_digits: 0,
    };
  }

  if (absoluteValue >= 10) {
    return {
      minimum_fraction_digits: 0,
      maximum_fraction_digits: 1,
    };
  }

  return {
    minimum_fraction_digits: 0,
    maximum_fraction_digits: 2,
  };
}

function formatDeterministicNumber(
  value: number,

  input:
    Readonly<{
      locale:
        PublicDisplayLocale;

      minimum_fraction_digits:
        number;

      maximum_fraction_digits:
        number;

      use_grouping:
        boolean;
    }>,
): string {
  return new Intl.NumberFormat(
    input.locale,
    {
      notation: "standard",

      minimumFractionDigits:
        input.minimum_fraction_digits,

      maximumFractionDigits:
        input.maximum_fraction_digits,

      useGrouping:
        input.use_grouping,
    },
  ).format(value);
}

function resolveCurrencySymbol(
  currency:
    Exclude<
      PublicDisplayCurrency,
      "USDT"
    >,

  locale:
    PublicDisplayLocale,
): string {
  const parts =
    new Intl.NumberFormat(
      locale,
      {
        style: "currency",
        currency,
        currencyDisplay: "symbol",
        notation: "standard",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    ).formatToParts(0);

  const currencyPart =
    parts.find(
      (part) =>
        part.type === "currency",
    );

  return currencyPart?.value ??
    currency;
}

function joinMonetaryParts(
  input:
    Readonly<{
      formatted_number:
        string;

      magnitude_suffix:
        string | null;

      currency:
        PublicDisplayCurrency;

      locale:
        PublicDisplayLocale;
    }>,
): string {
  const magnitudePart =
    input.magnitude_suffix === null
      ? input.formatted_number
      : `${input.formatted_number} ${input.magnitude_suffix}`;

  if (input.currency === "USDT") {
    return `${magnitudePart} USDT`;
  }

  const currencySymbol =
    resolveCurrencySymbol(
      input.currency,
      input.locale,
    );

  if (input.locale === "fr-FR") {
    return `${magnitudePart} ${currencySymbol}`;
  }

  return `${currencySymbol}${magnitudePart}`;
}

/* ============================================================================
 * 14. PRICE FORMATTING
 * ========================================================================== */

export function formatPublicPrice(
  value:
    number | null,

  currency:
    PublicDisplayCurrency,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  if (!isFiniteNumber(value)) {
    return policy.labels.unavailable;
  }

  const fractionDigits =
    resolvePriceFractionDigits(
      value,
    );

  if (currency === "USDT") {
    const formattedNumber =
      formatDeterministicNumber(
        value,
        {
          locale:
            policy.context.locale,

          minimum_fraction_digits:
            fractionDigits.minimum_fraction_digits,

          maximum_fraction_digits:
            fractionDigits.maximum_fraction_digits,

          use_grouping:
            true,
        },
      );

    return joinMonetaryParts({
      formatted_number:
        formattedNumber,

      magnitude_suffix:
        null,

      currency,

      locale:
        policy.context.locale,
    });
  }

  return new Intl.NumberFormat(
    policy.context.locale,
    {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      notation: "standard",

      minimumFractionDigits:
        fractionDigits.minimum_fraction_digits,

      maximumFractionDigits:
        fractionDigits.maximum_fraction_digits,
    },
  ).format(value);
}

/* ============================================================================
 * 15. COMPACT MONETARY FORMATTING
 * ========================================================================== */

export function formatPublicCompactMonetaryValue(
  value:
    number | null,

  currency:
    PublicDisplayCurrency,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  if (!isFiniteNumber(value)) {
    return policy.labels.unavailable;
  }

  const magnitude =
    resolvePublicMonetaryMagnitude(
      value,
    );

  const scaledValue =
    value /
    magnitude.divisor;

  const fractionDigits =
    resolveCompactFractionDigits(
      scaledValue,
    );

  const formattedNumber =
    formatDeterministicNumber(
      scaledValue,
      {
        locale:
          policy.context.locale,

        minimum_fraction_digits:
          fractionDigits.minimum_fraction_digits,

        maximum_fraction_digits:
          fractionDigits.maximum_fraction_digits,

        use_grouping:
          magnitude.magnitude === "unit",
      },
    );

  const magnitudeSuffix =
    magnitude.magnitude === "unit"
      ? null
      : PUBLIC_MONETARY_SUFFIXES[
          policy.context.language
        ][magnitude.magnitude];

  return joinMonetaryParts({
    formatted_number:
      formattedNumber,

    magnitude_suffix:
      magnitudeSuffix,

    currency,

    locale:
      policy.context.locale,
  });
}

/* ============================================================================
 * 16. TIMESTAMP FORMATTING
 * ========================================================================== */

export type PublicTimestampInput =
  | string
  | number
  | Date
  | null;

function resolveTimestampDate(
  value:
    PublicTimestampInput,
): Date | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    const timestamp =
      value.getTime();

    return Number.isFinite(timestamp)
      ? new Date(timestamp)
      : null;
  }

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const date =
    new Date(value);

  return Number.isFinite(
    date.getTime(),
  )
    ? date
    : null;
}

export function formatPublicDateTime(
  value:
    PublicTimestampInput,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  const date =
    resolveTimestampDate(
      value,
    );

  if (date === null) {
    return policy.labels.unavailable;
  }

  return new Intl.DateTimeFormat(
    policy.context.locale,
    {
      dateStyle: "short",
      timeStyle: "short",
      hourCycle: "h23",
      timeZone:
        policy.context.time_zone,
    },
  ).format(date);
}

/* ============================================================================
 * 17. RANK AND COUNT FORMATTING
 * ========================================================================== */

export function formatPublicRank(
  value:
    number | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  if (
    !isFiniteNumber(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return policy.labels.unavailable;
  }

  return new Intl.NumberFormat(
    policy.context.locale,
    {
      notation: "standard",
      maximumFractionDigits: 0,
      useGrouping: true,
    },
  ).format(value);
}

export function formatPublicCount(
  value:
    number | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  if (
    !isFiniteNumber(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    return policy.labels.unavailable;
  }

  return new Intl.NumberFormat(
    policy.context.locale,
    {
      notation: "standard",
      maximumFractionDigits: 0,
      useGrouping: true,
    },
  ).format(value);
}

/* ============================================================================
 * 18. PUBLIC STATE TRANSLATION MAPS
 * ----------------------------------------------------------------------------
 * Only states already declared by public contracts are accepted.
 *
 * Partial records are deliberate:
 * - upstream public contracts remain authoritative
 * - future states require explicit display-policy governance
 * - missing French translations remain unavailable
 * ========================================================================== */

const FR_ACTIVITY_LABELS:
  Readonly<
    Partial<
      Record<
        PublicActivityLabel,
        string
      >
    >
  > =
  Object.freeze({
    Low: "Faible",
    Normal: "Normale",
    High: "Élevée",
  });

const FR_SPARKLINE_CONTEXT_LABELS:
  Readonly<
    Partial<
      Record<
        PublicSparklineContext7D,
        string
      >
    >
  > =
  Object.freeze({
    Compression: "Compression",
    Expansion: "Expansion",
    Recovery: "Récupération",
    Fragmented: "Fragmentée",
    Stable: "Stable",
    Neutral: "Neutre",
  });

const FR_STRUCTURE_TRANSITION_LABELS:
  Readonly<
    Partial<
      Record<
        PublicStructureTransition,
        string
      >
    >
  > =
  Object.freeze({
    "Compression Phase":
      "Phase de compression",

    "Expansion Phase":
      "Phase d’expansion",

    "Recovery Structure":
      "Structure en récupération",

    "Fragmentation Detected":
      "Fragmentation détectée",

    "Stable Structure":
      "Structure stable",

    "Active Expansion":
      "Expansion active",

    "Neutral Structure":
      "Structure neutre",
  });

const FR_IMPULSE_CONTEXT_LABELS:
  Readonly<
    Partial<
      Record<
        PublicImpulseContext,
        string
      >
    >
  > =
  Object.freeze({
    Compression:
      "Compression",

    "Pressure Building":
      "Pression croissante",

    Release:
      "Libération",

    Exhaustion:
      "Épuisement",

    Neutral:
      "Neutre",
  });

const FR_MARKET_CLIMATE_LABELS:
  Readonly<
    Partial<
      Record<
        PublicMarketClimate,
        string
      >
    >
  > =
  Object.freeze({
    "Transitioning Market":
      "Marché en transition",

    "Fragmented Market":
      "Marché fragmenté",
  });

const FR_GROWTH_CONTEXT_LABELS:
  Readonly<
    Partial<
      Record<
        PublicGrowthContext,
        string
      >
    >
  > =
  Object.freeze({
    Low:
      "Faible",

    Moderate:
      "Modéré",
  });

const FR_CORE_STRUCTURE_LABELS:
  Readonly<
    Partial<
      Record<
        PublicCoreStructure,
        string
      >
    >
  > =
  Object.freeze({
    Stable:
      "Stable",

    Mixed:
      "Mixte",
  });

const FR_DECAY_CONTEXT_LABELS:
  Readonly<
    Partial<
      Record<
        PublicDecayContext,
        string
      >
    >
  > =
  Object.freeze({
    Limited:
      "Limitée",

    Elevated:
      "Élevée",
  });

/* ============================================================================
 * 19. GENERIC PUBLIC STATE FORMATTER
 * ========================================================================== */

function formatTranslatedPublicState<
  TState extends string,
>(
  value:
    TState | null,

  unavailableValue:
    TState,

  translations:
    Readonly<
      Partial<
        Record<
          TState,
          string
        >
      >
    >,

  policy:
    PublicDisplayPolicy,
): string {
  if (
    value === null ||
    value === unavailableValue
  ) {
    return policy.labels.unavailable;
  }

  if (policy.context.language === "en") {
    return value;
  }

  return translations[value] ??
    policy.labels.unavailable;
}

/* ============================================================================
 * 20. PUBLIC STATE FORMATTERS
 * ========================================================================== */

export function formatPublicActivityLabel(
  value:
    PublicActivityLabel | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return formatTranslatedPublicState(
    value,
    "Unavailable",
    FR_ACTIVITY_LABELS,
    policy,
  );
}

export function formatPublicSparklineContext7DLabel(
  value:
    PublicSparklineContext7D | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return formatTranslatedPublicState(
    value,
    "Unavailable",
    FR_SPARKLINE_CONTEXT_LABELS,
    policy,
  );
}

export function formatPublicStructureTransitionLabel(
  value:
    PublicStructureTransition | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  if (value === null) {
    return policy.labels.unavailable;
  }

  if (policy.context.language === "en") {
    return value;
  }

  return FR_STRUCTURE_TRANSITION_LABELS[value] ??
    policy.labels.unavailable;
}

export function formatPublicImpulseContextLabel(
  value:
    PublicImpulseContext | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return formatTranslatedPublicState(
    value,
    "Unavailable",
    FR_IMPULSE_CONTEXT_LABELS,
    policy,
  );
}

export function formatPublicMarketClimateLabel(
  value:
    PublicMarketClimate | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return formatTranslatedPublicState(
    value,
    "Unavailable",
    FR_MARKET_CLIMATE_LABELS,
    policy,
  );
}

export function formatPublicGrowthContextLabel(
  value:
    PublicGrowthContext | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return formatTranslatedPublicState(
    value,
    "Unavailable",
    FR_GROWTH_CONTEXT_LABELS,
    policy,
  );
}

export function formatPublicCoreStructureLabel(
  value:
    PublicCoreStructure | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return formatTranslatedPublicState(
    value,
    "Unavailable",
    FR_CORE_STRUCTURE_LABELS,
    policy,
  );
}

export function formatPublicDecayContextLabel(
  value:
    PublicDecayContext | null,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return formatTranslatedPublicState(
    value,
    "Unavailable",
    FR_DECAY_CONTEXT_LABELS,
    policy,
  );
}

/* ============================================================================
 * 21. ACCESSIBILITY
 * ========================================================================== */

export function buildPublicAssetLogoAlt(
  input:
    Readonly<{
      asset_name:
        string | null;

      asset_symbol:
        string | null;
    }>,

  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  const name =
    isNonEmptyString(
      input.asset_name,
    )
      ? input.asset_name.trim()
      : null;

  const symbol =
    isNonEmptyString(
      input.asset_symbol,
    )
      ? input.asset_symbol
          .trim()
          .toUpperCase()
      : null;

  if (
    name !== null &&
    symbol !== null
  ) {
    return `${name} (${symbol})`;
  }

  if (name !== null) {
    return name;
  }

  if (symbol !== null) {
    return symbol;
  }

  return policy.labels.logo_unavailable;
}

/* ============================================================================
 * 22. DISCLAIMER
 * ========================================================================== */

export function getPublicDisclaimer(
  policy:
    PublicDisplayPolicy =
      DEFAULT_PUBLIC_DISPLAY_POLICY,
): string {
  return policy.disclaimer;
}

/* ============================================================================
 * 23. POLICY ASSERTIONS
 * ========================================================================== */

export function isPublicDisplayCurrency(
  value: unknown,
): value is PublicDisplayCurrency {
  return (
    value === "EUR" ||
    value === "USD" ||
    value === "USDT"
  );
}

export function isPublicDisplayLanguage(
  value: unknown,
): value is PublicDisplayLanguage {
  return (
    value === "en" ||
    value === "fr"
  );
}

export function isPublicDisplayAvailability(
  value: unknown,
): value is PublicDisplayAvailability {
  return (
    value === "available" ||
    value === "partial" ||
    value === "unavailable" ||
    value === "invalid" ||
    value === "not_applicable"
  );
}

export function isPublicDisplayPolicy(
  value: unknown,
): value is PublicDisplayPolicy {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate =
    value as Partial<
      PublicDisplayPolicy
    >;

  if (
    candidate.policy_name !==
      XYVALA_PUBLIC_DISPLAY_POLICY_NAME ||
    candidate.policy_version !==
      XYVALA_PUBLIC_DISPLAY_POLICY_VERSION
  ) {
    return false;
  }

  if (
    typeof candidate.context !== "object" ||
    candidate.context === null
  ) {
    return false;
  }

  if (
    !isPublicDisplayLanguage(
      candidate.context.language,
    ) ||
    !isPublicDisplayCurrency(
      candidate.context.default_currency,
    ) ||
    candidate.context.jurisdiction !== "FR/EU" ||
    candidate.context.time_zone !== "Europe/Paris"
  ) {
    return false;
  }

  if (
    candidate.context.language === "en" &&
    candidate.context.locale !== "en-GB"
  ) {
    return false;
  }

  if (
    candidate.context.language === "fr" &&
    candidate.context.locale !== "fr-FR"
  ) {
    return false;
  }

  return (
    typeof candidate.labels === "object" &&
    candidate.labels !== null &&
    typeof candidate.definitions === "object" &&
    candidate.definitions !== null &&
    isNonEmptyString(
      candidate.disclaimer,
    )
  );
}

/* ============================================================================
 * 24. PUBLIC / PRIVATE PROTECTION
 * ========================================================================== */

export const PUBLIC_DISPLAY_FORBIDDEN_VARIABLE_NAMES =
  Object.freeze([
    "decision",
    "decision_status",
    "decision_score",

    "opportunity_score",
    "opportunity_status",

    "confidence_score",
    "confidence_status",

    "stability_score",
    "structure_score",
    "coherence_score",

    "occurrence_score",
    "frequency_score",
    "convergence_score",
    "duration_score",
    "evolution_score",
    "growth_score",

    "rupture_score",
    "rupture_probability",
    "rupture_penalty_score",
    "rupture_occurrence_score",
    "rupture_frequency_score",
    "rupture_convergence_score",
    "rupture_duration_score",
    "rupture_evolution_score",

    "crash_score",
    "crash_state",

    "impulse_pressure_score",
    "impulse_acceleration_score",
    "impulse_alignment_score",
    "impulse_instability_score",
    "impulse_saturation_score",
    "impulse_exhaustion_score",

    "neutralized",
    "neutralization_reason",
    "neutralization_severity",
    "neutralization_validity",

    "calibration_allow_threshold",
    "calibration_watch_threshold",
    "calibration_block_threshold",
    "calibration_status",
  ] as const);

export type PublicDisplayForbiddenVariableName =
  (
    typeof PUBLIC_DISPLAY_FORBIDDEN_VARIABLE_NAMES
  )[number];

/* ============================================================================
 * 25. CONSUMER MIGRATION DECLARATION
 * ========================================================================== */

export const PUBLIC_DISPLAY_POLICY_MIGRATION =
  Object.freeze({
    from:
      "local-component-display-rules",

    to:
      XYVALA_PUBLIC_DISPLAY_POLICY_VERSION,

    compatibility:
      "CONTROLLED_MIGRATION",

    migration_required:
      true,

    required_consumers:
      Object.freeze([
        "components/scan-table.tsx",
      ] as const),

    required_changes:
      Object.freeze([
        "remove_local_public_labels",
        "remove_local_price_formatting",
        "remove_local_percentage_formatting",
        "remove_local_compact_currency_formatting",
        "remove_native_intl_compact_notation",
        "remove_synthetic_rank_fallback",
        "consume_public_state_formatters",
        "consume_public_definitions_for_tooltips",
        "display_explicit_reference_currency",
        "display_canonical_public_disclaimer",
        "display_public_jurisdiction",
        "display_public_data_source",
        "display_upstream_last_updated",
        "render_logo_alt_with_public_policy",
      ] as const),

    reasons:
      Object.freeze([
        "european_terminology_harmonisation",
        "currency_formatting_centralisation",
        "hydration_determinism",
        "usdt_representation_correction",
        "availability_semantic_separation",
        "synthetic_rank_removal",
        "public_label_governance",
        "public_definition_governance",
        "private_public_boundary_protection",
        "public_contract_compatibility",
      ] as const),
  } as const);
