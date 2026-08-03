/* ============================================================================
 * FILE: app/api/internal/calibration/seed/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala internal decision calibration seed route
 *
 * ROLE
 * - expose a private POST-only calibration seed endpoint
 * - execute deterministic internal decision calibration scenarios
 * - invoke the canonical MCI orchestrator as the unique decision producer
 * - populate the runtime decision calibration store through authorized
 *   orchestrator writes
 * - expose a bounded private execution summary for internal audit
 *
 * CLASSIFICATION
 * - PRIVATE INTERNAL ROUTE
 * - ORCHESTRATE
 * - MUTATE
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
 * - Transformers
 * - Rankings
 * - API
 * - Interface
 *
 * PARENTS
 * - lib/xyvala/calibration/calibration-seed-scenarios.ts
 * - lib/xyvala/engine/mci-orchestrator.ts
 * - lib/xyvala/calibration/store/decision-distribution-store.ts
 *
 * CONSUMERS
 * - authenticated internal calibration tooling
 * - private calibration diagnostics
 * - private decision-distribution audits
 *
 * DIRECTIVES
 * - private internal route only
 * - POST only
 * - GET must never mutate
 * - authentication must fail closed
 * - no provider acquisition
 * - no provider parsing
 * - no UI logic
 * - no public analytical projection
 * - no snapshot shaping
 * - no external market fetch
 * - no direct calibration sample write
 * - no direct decision distribution write
 * - MCI orchestrator remains the unique decision sample producer
 * - no RFS computation
 * - no RFS reconstruction from public values
 * - no Triple Layer computation
 * - no Triple Layer reconstruction
 * - no Impulse Layer computation
 * - no Impulse Layer reconstruction
 * - no Crash System computation
 * - no crash derivation from rupture
 * - no MCI computation implemented locally
 * - no calibration threshold computation
 * - no public decision exposure
 * - no temporary diagnostic logging
 * - no secret logging
 * - no arbitrary internal exception exposure
 * - deterministic scenario generation only
 *
 * INPUTS
 * - authenticated internal POST request
 * - explicit bounded seed count
 * - explicit analytical version
 * - explicit analytical horizon
 * - optional authorized calibration-store reset
 *
 * OUTPUTS
 * - private seed execution summary
 * - private decision calibration store statistics
 * - private controlled mutation metadata
 *
 * OWNERSHIP
 * - calibration-seed-scenarios owns deterministic fixture generation
 * - RFS fixture adapter owns contract-compatible fixture projection only
 * - MCI orchestrator owns opportunity, confidence and decision production
 * - decision-distribution store owns runtime decision sample persistence
 * - this route owns request authorization and orchestration only
 *
 * INVARIANTS
 * - one scenario produces one MCI orchestrator execution
 * - no synthetic Impulse result is inserted into RFS
 * - no local decision formula exists in this route
 * - no local calibration sample formula exists in this route
 * - no route helper becomes an analytical source of truth
 * - reset is explicit and occurs before seed execution
 * - invalid authentication causes no mutation
 * - invalid request parameters are bounded deterministically
 * - private runtime errors are exposed through stable error identities only
 * - identical scenario parameters produce identical analytical fixtures
 *
 * BOUNDARIES
 * - authenticated request -> seed orchestration
 * - calibration fixture -> MCI orchestrator
 * - MCI orchestrator -> decision calibration store
 * - calibration store -> private diagnostic response
 *
 * FIRST DIVERGENCE
 * - internal debugging disabled
 *   => internal route availability boundary
 *
 * - missing configured authentication token
 *   => internal route configuration boundary
 *
 * - invalid caller token
 *   => request authentication boundary
 *
 * - invalid seed scenario
 *   => calibration seed scenario producer
 *
 * - invalid RFS fixture projection
 *   => seed scenario -> RFS fixture boundary
 *
 * - MCI orchestration failure
 *   => MCI orchestrator
 *
 * - calibration-store read failure
 *   => decision calibration store
 *
 * SENSITIVE ZONES
 * - internal authentication
 * - mutation authorization
 * - seed fixture contract alignment
 * - crash ownership
 * - Impulse ownership
 * - MCI invocation
 * - calibration-store reset
 * - private error exposure
 * ========================================================================== */

import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  runMciOrchestrator,
} from "@/lib/xyvala/engine/mci-orchestrator";

import {
  clearDecisionDistributionStore,
  getDecisionDistributionStoreStats,
} from "@/lib/xyvala/calibration/store/decision-distribution-store";

import {
  CALIBRATION_SEED_REGIME_PLAN,
  buildCalibrationSeedScenario,
  type CalibrationSeedScenario,
} from "@/lib/xyvala/calibration/calibration-seed-scenarios";

/* ============================================================================
 * 1. INTERNAL CONTRACTS
 * ========================================================================== */

type SeedDecision =
  | "ALLOW"
  | "WATCH"
  | "BLOCK";

type SeedRegime =
  | "STABLE"
  | "TRANSITION"
  | "VOLATILE";

type SeedAlignment =
  | "ALIGNED"
  | "OPPOSED"
  | "NEUTRAL"
  | "UNAVAILABLE";

type SeedRfsStatus =
  | "VALID"
  | "WEAK_STRUCTURE"
  | "INSUFFICIENT_DATA"
  | "INVALID";

type SeedMidTermState =
  | "FAVORABLE"
  | "NEUTRAL"
  | "UNFAVORABLE";

type SeedCrashState =
  | "NONE"
  | "RISING"
  | "CRASH"
  | "UNKNOWN";

type SeedScenario = Readonly<{
  asset_id: string;
  symbol: string;

  regime: SeedRegime;

  occurrence: number;
  convergence: number;
  duration: number;
  frequency: number;
  correlation: number;

  stability: number;
  structure: number;
  rupture: number;

  /*
   * These are explicit fixture values.
   *
   * They are not derived from rupture because crash truth belongs to the
   * Crash System and must never be reconstructed from RFS rupture values.
   */
  crash_score: number;
  crash_state: SeedCrashState;

  mid_term: number;

  rupture_probability: number;
  continuity_probability: number;
  confidence: number;

  pattern_count: number;
  sample_size: number;
  direction_changes: number;
  rupture_events: number;
  stable_run_length: number;

  dominant_direction_ratio: number;
  liquidity_support: number;

  confirmation_alignment:
    SeedAlignment;

  rfs_status:
    SeedRfsStatus;

  mid_term_state:
    SeedMidTermState;
}>;

type SeedDecisionSummary = Readonly<{
  asset_id: string;
  symbol: string;

  decision:
    SeedDecision;

  regime:
    SeedRegime;

  decision_reason:
    string;

  calibration_source:
    "fallback" |
    "calibrated" |
    "bootstrap";

  stability:
    number;

  opportunity:
    number;

  convergence:
    number;

  confidence:
    number;

  decision_score:
    number;

  allow_raw_score:
    number;

  block_raw_score:
    number;

  risk_rupture_probability:
    number;

  decision_support_probability:
    number;

  recovery_probability:
    number;

  recovery_rupture_dominance:
    number;
}>;

type SeedFailureCode =
  | "xyvala_internal_debug_disabled"
  | "xyvala_internal_debug_token_missing"
  | "xyvala_internal_debug_unauthorized"
  | "xyvala_internal_calibration_seed_invalid_scenario"
  | "xyvala_internal_calibration_seed_orchestration_failed"
  | "xyvala_internal_calibration_seed_store_read_failed"
  | "xyvala_internal_calibration_seed_route_failed";

type MciOrchestratorInput =
  Parameters<
    typeof runMciOrchestrator
  >[0];

type SeedRfsFixture =
  MciOrchestratorInput["rfs"];

/* ============================================================================
 * 2. GOVERNED CONFIGURATION
 * ========================================================================== */

const INTERNAL_ROUTE_VERSION =
  "2.0.0" as const;

const DEFAULT_ANALYTICAL_VERSION =
  "v8";

const DEFAULT_HORIZON =
  "7D";

const DEFAULT_SEED_COUNT =
  24;

const MINIMUM_SEED_COUNT =
  1;

const MAXIMUM_SEED_COUNT =
  250;

/*
 * This is an explicit test-fixture value.
 *
 * It does not claim observed Crash System truth and it is not derived from
 * rupture. The seed producer currently exposes no independent crash fixture.
 */
const DEFAULT_SEED_CRASH_SCORE =
  0;

const DEFAULT_SEED_CRASH_STATE:
  SeedCrashState =
  "NONE";

const SEED_REGIME_PLAN =
  CALIBRATION_SEED_REGIME_PLAN;

/* ============================================================================
 * 3. PURE PRIMITIVE VALIDATORS
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

function normalizeRequiredString(
  value: unknown,
  fallback: string,
): string {
  return isNonEmptyString(value)
    ? value.trim()
    : fallback;
}

function clampInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!isFiniteNumber(value)) {
    return fallback;
  }

  const integerValue =
    Math.trunc(value);

  return Math.min(
    maximum,
    Math.max(
      minimum,
      integerValue,
    ),
  );
}

function assertFiniteScore(
  value: unknown,
  variableName: string,
): number {
  if (
    !isFiniteNumber(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new RangeError(
      `CALIBRATION_SEED_SCORE_INVALID: ${variableName} must be a finite score between 0 and 100`,
    );
  }

  return value;
}

function assertNonNegativeInteger(
  value: unknown,
  variableName: string,
): number {
  if (
    !isFiniteNumber(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new RangeError(
      `CALIBRATION_SEED_INTEGER_INVALID: ${variableName} must be a non-negative integer`,
    );
  }

  return value;
}

function assertPositiveInteger(
  value: unknown,
  variableName: string,
): number {
  const integerValue =
    assertNonNegativeInteger(
      value,
      variableName,
    );

  if (integerValue <= 0) {
    throw new RangeError(
      `CALIBRATION_SEED_INTEGER_INVALID: ${variableName} must be greater than zero`,
    );
  }

  return integerValue;
}

/* ============================================================================
 * 4. REQUEST PARAMETER READERS
 * ========================================================================== */

function readSearchParameter(
  request: Request,
  key: string,
): string | null {
  const searchParams =
    new URL(
      request.url,
    ).searchParams;

  const value =
    searchParams
      .get(key)
      ?.trim();

  return value &&
    value.length > 0
    ? value
    : null;
}

function readBooleanSearchParameter(
  request: Request,
  key: string,
): boolean {
  const value =
    readSearchParameter(
      request,
      key,
    );

  return (
    value === "1" ||
    value === "true" ||
    value === "yes"
  );
}

function readSeedCount(
  request: Request,
): number {
  const rawValue =
    readSearchParameter(
      request,
      "count",
    );

  if (rawValue === null) {
    return DEFAULT_SEED_COUNT;
  }

  const parsedValue =
    Number(rawValue);

  return clampInteger(
    parsedValue,
    DEFAULT_SEED_COUNT,
    MINIMUM_SEED_COUNT,
    MAXIMUM_SEED_COUNT,
  );
}

/* ============================================================================
 * 5. INTERNAL AUTHENTICATION
 * ----------------------------------------------------------------------------
 * Authentication fails closed.
 *
 * No token content, token fragment or token hash is logged or returned.
 * ========================================================================== */

function isInternalDebugEnabled():
  boolean {
  return (
    process.env
      .XYVALA_INTERNAL_DEBUG_ENABLED ===
    "true"
  );
}

function readConfiguredDebugToken():
  string | null {
  const token =
    process.env
      .XYVALA_INTERNAL_DEBUG_TOKEN
      ?.trim();

  return token &&
    token.length > 0
    ? token
    : null;
}

function readProvidedDebugToken(
  request: Request,
): string | null {
  const headerToken =
    request.headers
      .get(
        "x-xyvala-internal-token",
      )
      ?.trim();

  if (
    headerToken &&
    headerToken.length > 0
  ) {
    return headerToken;
  }

  const authorization =
    request.headers
      .get("authorization")
      ?.trim() ??
    "";

  const bearerPrefix =
    "Bearer ";

  if (
    !authorization.startsWith(
      bearerPrefix,
    )
  ) {
    return null;
  }

  const bearerToken =
    authorization
      .slice(
        bearerPrefix.length,
      )
      .trim();

  return bearerToken.length > 0
    ? bearerToken
    : null;
}

function safelyCompareSecrets(
  provided: string | null,
  expected: string | null,
): boolean {
  if (
    provided === null ||
    expected === null
  ) {
    return false;
  }

  const providedBuffer =
    Buffer.from(
      provided,
      "utf8",
    );

  const expectedBuffer =
    Buffer.from(
      expected,
      "utf8",
    );

  if (
    providedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    providedBuffer,
    expectedBuffer,
  );
}

/* ============================================================================
 * 6. PRIVATE RESPONSE FACTORIES
 * ========================================================================== */

function buildJsonResponse(
  payload: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(
    payload,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function buildPrivateFailureResponse(
  input: Readonly<{
    code:
      SeedFailureCode;

    status:
      number;

    mutation:
      boolean;
  }>,
): NextResponse {
  return buildJsonResponse(
    {
      ok:
        false,

      error:
        input.code,

      version:
        INTERNAL_ROUTE_VERSION,

      meta: {
        internal:
          true,

        mutation:
          input.mutation,
      },
    },
    input.status,
  );
}

function buildMethodNotAllowedResponse():
  NextResponse {
  return buildJsonResponse(
    {
      ok:
        false,

      error:
        "method_not_allowed_use_post",

      version:
        INTERNAL_ROUTE_VERSION,

      meta: {
        internal:
          true,

        mutation:
          false,

        allowed_methods: [
          "POST",
        ],
      },
    },
    405,
  );
}

/* ============================================================================
 * 7. CALIBRATION SEED SCENARIO ADAPTER
 * ----------------------------------------------------------------------------
 * ROLE
 * - validate the deterministic fixture produced by the canonical seed producer
 * - project it into the route-owned fixture transport
 *
 * CLASSIFICATION
 * - VALIDATE
 * - PROJECT TEST FIXTURE
 *
 * DIRECTIVES
 * - no analytical computation
 * - no Impulse reconstruction
 * - no crash derivation from rupture
 * - no decision computation
 * - no unavailable-to-neutral market substitution
 *
 * NOTE
 * - crash values below are explicit test-fixture constants
 * - they are not inferred from rupture
 * - they do not claim runtime Crash System truth
 * ========================================================================== */

function mapSeedScenario(
  input:
    CalibrationSeedScenario,
): SeedScenario {
  if (
    !isNonEmptyString(
      input.asset_id,
    ) ||
    !isNonEmptyString(
      input.symbol,
    )
  ) {
    throw new TypeError(
      "CALIBRATION_SEED_IDENTITY_INVALID: asset_id and symbol are required",
    );
  }

  return {
    asset_id:
      input.asset_id.trim(),

    symbol:
      input.symbol.trim(),

    regime:
      input.regime,

    occurrence:
      assertFiniteScore(
        input.pattern_occurrence_score,
        "pattern_occurrence_score",
      ),

    convergence:
      assertFiniteScore(
        input.pattern_convergence_score,
        "pattern_convergence_score",
      ),

    duration:
      assertFiniteScore(
        input.pattern_duration_score,
        "pattern_duration_score",
      ),

    frequency:
      assertFiniteScore(
        input.pattern_frequency_score,
        "pattern_frequency_score",
      ),

    correlation:
      assertFiniteScore(
        input.pattern_correlation_score,
        "pattern_correlation_score",
      ),

    stability:
      assertFiniteScore(
        input.stability_score,
        "stability_score",
      ),

    structure:
      assertFiniteScore(
        input.structure_score,
        "structure_score",
      ),

    rupture:
      assertFiniteScore(
        input.rupture_score,
        "rupture_score",
      ),

    crash_score:
      DEFAULT_SEED_CRASH_SCORE,

    crash_state:
      DEFAULT_SEED_CRASH_STATE,

    mid_term:
      assertFiniteScore(
        input.mid_term_score,
        "mid_term_score",
      ),

    rupture_probability:
      assertFiniteScore(
        input.rupture_probability,
        "rupture_probability",
      ),

    continuity_probability:
      assertFiniteScore(
        input.continuity_probability,
        "continuity_probability",
      ),

    confidence:
      assertFiniteScore(
        input.confidence_score,
        "confidence_score",
      ),

    pattern_count:
      assertNonNegativeInteger(
        input.pattern_count,
        "pattern_count",
      ),

    sample_size:
      assertPositiveInteger(
        input.sample_size,
        "sample_size",
      ),

    direction_changes:
      assertNonNegativeInteger(
        input.direction_change_count,
        "direction_change_count",
      ),

    rupture_events:
      assertNonNegativeInteger(
        input.rupture_event_count,
        "rupture_event_count",
      ),

    stable_run_length:
      assertNonNegativeInteger(
        input.stable_run_length,
        "stable_run_length",
      ),

    dominant_direction_ratio:
      assertFiniteScore(
        input.dominant_direction_ratio,
        "dominant_direction_ratio",
      ),

    liquidity_support:
      assertFiniteScore(
        input.liquidity_support_score,
        "liquidity_support_score",
      ),

    confirmation_alignment:
      input.confirmation_alignment,

    rfs_status:
      input.rfs_status,

    mid_term_state:
      input.mid_term_state,
  };
}

function buildScenario(
  index: number,
  count: number,
): SeedScenario {
  return mapSeedScenario(
    buildCalibrationSeedScenario(
      index,
      count,
    ),
  );
}

/* ============================================================================
 * 8. CONTRACT-COMPLIANT RFS FIXTURE
 * ----------------------------------------------------------------------------
 * ROLE
 * - project an already-generated deterministic seed scenario into the exact
 *   RFS compatibility contract consumed by the MCI orchestrator
 *
 * CLASSIFICATION
 * - TEST FIXTURE PROJECTION
 * - NO ANALYTICAL COMPUTE
 *
 * DIRECTIVES
 * - no local RFS formula
 * - no Impulse field
 * - no Triple Layer field
 * - no decision field
 * - no opportunity field
 * - no calibration field
 * - no cross-layer reconstruction
 *
 * INVARIANT
 * - the return type is derived directly from runMciOrchestrator
 * - contract drift therefore becomes a TypeScript failure at this boundary
 * ========================================================================== */

function buildSeedRfsFixture(
  scenario:
    SeedScenario,
): SeedRfsFixture {
  return {
    metrics: {
      pattern_count:
        scenario.pattern_count,

      sample_size:
        scenario.sample_size,

      direction_changes:
        scenario
          .direction_changes,

      rupture_events:
        scenario.rupture_events,

      stable_run_length:
        scenario
          .stable_run_length,

      dominant_direction_ratio:
        scenario
          .dominant_direction_ratio,

      liquidity_support:
        scenario
          .liquidity_support,

      confirmation_alignment:
        scenario
          .confirmation_alignment,
    },

    axes: {
      occurrence:
        scenario.occurrence,

      convergence:
        scenario.convergence,

      duration:
        scenario.duration,

      frequency:
        scenario.frequency,

      correlation:
        scenario.correlation,
    },

    scores: {
      occurrence:
        scenario.occurrence,

      convergence:
        scenario.convergence,

      duration:
        scenario.duration,

      frequency:
        scenario.frequency,

      correlation:
        scenario.correlation,

      stability:
        scenario.stability,

      structure:
        scenario.structure,

      rupture:
        scenario.rupture,

      crash_score:
        scenario.crash_score,

      mid_term:
        scenario.mid_term,
    },

    states: {
      regime:
        scenario.regime,

      rfs_status:
        scenario.rfs_status,

      mid_term_state:
        scenario.mid_term_state,

      crash_state:
        scenario.crash_state,
    },

    probabilities: {
      rupture_probability:
        scenario
          .rupture_probability,

      continuity_probability:
        scenario
          .continuity_probability,
    },

    quality: {
      confidence:
        scenario.confidence,
    },

    warnings: [],
  };
}

/* ============================================================================
 * 9. MCI ORCHESTRATOR BRIDGE
 * ----------------------------------------------------------------------------
 * ROLE
 * - invoke the canonical MCI orchestrator exactly once per seed scenario
 * - read the resulting private decision calibration values
 *
 * CLASSIFICATION
 * - ORCHESTRATE
 * - MUTATE THROUGH AUTHORIZED PRODUCER
 *
 * DIRECTIVES
 * - no decision recomputation
 * - no confidence recomputation
 * - no opportunity recomputation
 * - no direct calibration-store write
 * - no synthetic Impulse attachment
 * ========================================================================== */

function runSeedScenario(
  input: Readonly<{
    scenario:
      SeedScenario;

    analytical_version:
      string;

    horizon:
      string;
  }>,
): SeedDecisionSummary {
  const result =
    runMciOrchestrator({
      asset_id:
        input.scenario
          .asset_id,

      symbol:
        input.scenario
          .symbol,

      analytical_version:
        input
          .analytical_version,

      horizon:
        input.horizon,

      refresh_calibration:
        false,

      rfs:
        buildSeedRfsFixture(
          input.scenario,
        ),
    });

  return {
    asset_id:
      input.scenario
        .asset_id,

    symbol:
      input.scenario.symbol,

    decision:
      result.decision,

    regime:
      result.regime,

    decision_reason:
      result.decision_reason,

    calibration_source:
      result
        .calibration_source,

    stability:
      result.stability,

    opportunity:
      result.opportunity,

    convergence:
      result.convergence,

    confidence:
      result.confidence,

    decision_score:
      result.decision_score,

    allow_raw_score:
      result.allow_raw_score,

    block_raw_score:
      result.block_raw_score,

    risk_rupture_probability:
      result
        .risk_rupture_probability,

    decision_support_probability:
      result
        .decision_support_probability,

    recovery_probability:
      result
        .recovery_probability,

    recovery_rupture_dominance:
      result
        .recovery_rupture_dominance,
  };
}

/* ============================================================================
 * 10. CONTROLLED SEED EXECUTION
 * ----------------------------------------------------------------------------
 * Mutation is authorized only after successful authentication.
 * ========================================================================== */

function executeSeedBatch(
  input: Readonly<{
    count:
      number;

    analytical_version:
      string;

    horizon:
      string;
  }>,
): SeedDecisionSummary[] {
  const seeded:
    SeedDecisionSummary[] = [];

  for (
    let index = 0;
    index < input.count;
    index += 1
  ) {
    const scenario =
      buildScenario(
        index,
        input.count,
      );

    seeded.push(
      runSeedScenario({
        scenario,

        analytical_version:
          input
            .analytical_version,

        horizon:
          input.horizon,
      }),
    );
  }

  return seeded;
}

/* ============================================================================
 * 11. AUTHORIZED REQUEST HANDLER
 * ----------------------------------------------------------------------------
 * MUTATION ORDER
 * - authenticate
 * - validate request parameters
 * - optionally reset the calibration store
 * - execute deterministic seed scenarios
 * - read resulting calibration statistics
 * - return private summary
 * ========================================================================== */

async function handleSeedRequest(
  request: Request,
): Promise<NextResponse> {
  if (!isInternalDebugEnabled()) {
    return buildPrivateFailureResponse({
      code:
        "xyvala_internal_debug_disabled",

      status:
        404,

      mutation:
        false,
    });
  }

  const configuredToken =
    readConfiguredDebugToken();

  if (configuredToken === null) {
    return buildPrivateFailureResponse({
      code:
        "xyvala_internal_debug_token_missing",

      status:
        500,

      mutation:
        false,
    });
  }

  const providedToken =
    readProvidedDebugToken(
      request,
    );

  if (
    !safelyCompareSecrets(
      providedToken,
      configuredToken,
    )
  ) {
    return buildPrivateFailureResponse({
      code:
        "xyvala_internal_debug_unauthorized",

      status:
        401,

      mutation:
        false,
    });
  }

  const analyticalVersion =
    normalizeRequiredString(
      readSearchParameter(
        request,
        "analytical_version",
      ),
      DEFAULT_ANALYTICAL_VERSION,
    );

  const horizon =
    normalizeRequiredString(
      readSearchParameter(
        request,
        "horizon",
      ),
      DEFAULT_HORIZON,
    );

  const count =
    readSeedCount(
      request,
    );

  const reset =
    readBooleanSearchParameter(
      request,
      "reset",
    );

  if (reset) {
    clearDecisionDistributionStore();
  }

  let seeded:
    SeedDecisionSummary[];

  try {
    seeded =
      executeSeedBatch({
        count,

        analytical_version:
          analyticalVersion,

        horizon,
      });
  } catch (error) {
    const failureCode:
      SeedFailureCode =
      error instanceof RangeError ||
      error instanceof TypeError
        ? "xyvala_internal_calibration_seed_invalid_scenario"
        : "xyvala_internal_calibration_seed_orchestration_failed";

    return buildPrivateFailureResponse({
      code:
        failureCode,

      status:
        500,

      mutation:
        reset,
    });
  }

  let storeStats:
    ReturnType<
      typeof getDecisionDistributionStoreStats
    >;

  try {
    storeStats =
      getDecisionDistributionStoreStats();
  } catch {
    return buildPrivateFailureResponse({
      code:
        "xyvala_internal_calibration_seed_store_read_failed",

      status:
        500,

      mutation:
        true,
    });
  }

  return buildJsonResponse({
    ok:
      true,

    version:
      INTERNAL_ROUTE_VERSION,

    data: {
      seeded_count:
        seeded.length,

      seeded,

      store_stats:
        storeStats,
    },

    meta: {
      internal:
        true,

      mutation:
        true,

      analytical_version:
        analyticalVersion,

      horizon,

      reset_applied:
        reset,

      requested_seed_count:
        count,

      seed_distribution_plan:
        SEED_REGIME_PLAN,

      fixture_classification:
        "deterministic_internal_calibration_fixture",

      impulse_reconstruction:
        false,

      crash_derivation_from_rupture:
        false,
    },
  });
}

/* ============================================================================
 * 12. ROUTE EXPORTS
 * ========================================================================== */

export async function GET():
  Promise<NextResponse> {
  return buildMethodNotAllowedResponse();
}

export async function POST(
  request: Request,
): Promise<NextResponse> {
  try {
    return await handleSeedRequest(
      request,
    );
  } catch {
    return buildPrivateFailureResponse({
      code:
        "xyvala_internal_calibration_seed_route_failed",

      status:
        500,

      mutation:
        false,
    });
  }
}
