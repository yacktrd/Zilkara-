/* ============================================================================
 * FILE: app/api/search/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical public HTTP route adapter
 *
 * ROLE
 * - expose the canonical Xyvala Search public boundary through Next.js HTTP
 * - receive one externally supplied public-ranking projection candidate
 * - validate the HTTP request envelope only
 * - delegate canonical public-projection validation to Search Public API Core
 * - delegate public transport assembly to Search Public Response Builder
 * - serialize the resulting public-safe response
 * - keep framework concerns outside canonical Search producers
 *
 * CLASSIFICATION
 * - HTTP ADAPTER
 * - SEARCH DOMAIN
 * - API
 * - FRAMEWORK BOUNDARY
 * - TRANSPORT
 * - NON-ANALYTICAL
 * - NON-RANKING
 * - NON-TRANSFORMATION
 * - NON-CALIBRATION
 * - NON-MUTATING OF CANONICAL TRUTH
 * - PUBLIC-SAFE
 *
 * POSITION IN OFFICIAL CHAIN
 * - Acquisition
 * - Extraction
 * - Segmentation
 * - Lexical Analysis
 * - Frequency Signal Detection
 * - Anchor Signal Detection
 * - Context Aggregation
 * - Link Signal Detection
 * - Temporal Signal Detection
 * - Behavioral Signal Detection
 * - Query Normalization
 * - Query Profiling
 * - Query-Document Signal Detection
 * - Intrinsic Document Scoring
 * - Temporal Document Scoring
 * - Query Relevance Scoring
 * - Link Authority Scoring
 * - Behavioral Calibration Scoring
 * - Positive Score Assembly
 * - Penalty Evaluation
 * - Analytical Aggregation
 * - Eligibility Evaluation
 * - Cohort Normalization
 * - Relative Cohort Evaluation
 * - Private Decision
 * - Calibration
 * - Private Snapshot
 * - Transformation
 * - Public Ranking
 * - API Core
 * - Public Response Builder
 * - HTTP Route
 * - Interface
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchPublicRankingProjection
 * - Search Public API Core
 * - Search Public Response Builder
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Public Exposure Governance System
 * - Ranking Governance System
 *
 * PRODUCER INPUT
 * ----------------------------------------------------------------------------
 * CURRENT TEMPORARY BOUNDARY
 *
 * - externally supplied SearchPublicRankingProjection candidate
 *
 * TARGET BOUNDARY
 *
 * - canonical Xyvala Search runtime orchestrator
 *   -> SearchPublicRankingProjection
 *
 * CONSUMERS
 * - Xyvala Search interface
 * - HTTP clients
 * - Search transport integration tests
 *
 * DIRECTIVES
 * - HTTP transport only
 * - framework concerns only
 * - public Search truth only
 * - validate HTTP envelope before canonical consumption
 * - delegate canonical public validation to Search Public API Core
 * - delegate response assembly to Search Public Response Builder
 * - preserve canonical projection identity
 * - preserve canonical public ranking truth
 * - preserve canonical public_position
 * - no acquisition
 * - no extraction
 * - no segmentation
 * - no lexical analysis
 * - no signal calculation
 * - no scoring
 * - no score reconstruction
 * - no penalty evaluation
 * - no analytical aggregation
 * - no eligibility evaluation
 * - no cohort normalization
 * - no relative cohort evaluation
 * - no private decision
 * - no calibration
 * - no private snapshot access
 * - no public transformation
 * - no ranking
 * - no sorting
 * - no filtering
 * - no public_position creation
 * - no public_position mutation
 * - no label reconstruction
 * - no excerpt reconstruction
 * - no source reconstruction
 * - no private analytical field exposure
 * - no BLOCK / WATCH / ALLOW exposure
 * - no private threshold exposure
 * - no internal weight exposure
 * - no private confidence exposure
 * - no analytical payload logging
 * - no persistence
 * - no Search cache mutation
 *
 * CURRENT ARCHITECTURAL LIMIT
 * ----------------------------------------------------------------------------
 * This route currently receives an already-produced
 * SearchPublicRankingProjection.
 *
 * This is deliberately temporary.
 *
 * The HTTP route must NOT compensate for the absence of a canonical Search
 * runtime orchestrator by reconstructing:
 * - query execution;
 * - document acquisition;
 * - scoring;
 * - eligibility;
 * - cohorts;
 * - private decisions;
 * - transformation;
 * - ranking.
 *
 * When the canonical Search runtime orchestrator exists, only the producer
 * side of this adapter should change.
 *
 * TARGET EXECUTION
 *
 * HTTP Search request
 * -> canonical Search runtime orchestrator
 * -> SearchPublicRankingProjection
 * -> Search Public API Core
 * -> Search Public Response Builder
 * -> HTTP serialization
 *
 * CURRENT EXECUTION
 *
 * HTTP projection candidate
 * -> HTTP envelope validation
 * -> Search Public API Core
 * -> canonical validated SearchPublicRankingProjection
 * -> Search Public Response Builder
 * -> HTTP serialization
 *
 * HTTP OWNERSHIP
 * - JSON parsing
 * - HTTP request-envelope validation
 * - request_id generation
 * - response created_at generation
 * - HTTP status
 * - HTTP headers
 * - JSON serialization
 *
 * NON-OWNERSHIP
 * - Search analytical truth
 * - Search ranking truth
 * - Search public projection truth
 * - public_position
 * - relevance labels
 * - evidence labels
 * - excerpts
 * - source projection
 * - availability truth
 * - calibration
 * - private decision
 *
 * INVARIANTS
 * - route never imports private Search analytical contracts
 * - route never imports SearchPrivateDocumentSnapshot
 * - route never imports SearchPrivateDecision
 * - route never imports SearchGlobalScore
 * - route never imports SearchPenaltyVector
 * - route never imports SearchEligibilityResult
 * - route never imports SearchRelativeEvaluationContext
 * - route never computes ranking
 * - route never creates public_position
 * - route never modifies canonical public projection
 * - route never repairs malformed canonical truth
 * - route never reproduces Search Public API Core validation
 * - route never exposes internal validation details
 * - public response originates only from validated canonical public truth
 * - request identity is transport metadata only
 * - response timestamp is transport metadata only
 *
 * FIRST DIVERGENCE
 * - invalid JSON
 *   => HTTP boundary
 *
 * - malformed HTTP envelope
 *   => HTTP boundary
 *
 * - missing projection
 *   => HTTP boundary
 *
 * - malformed SearchPublicRankingProjection
 *   => Search Public API Core
 *
 * - private-field contamination
 *   => Search Public API Core
 *
 * - invalid ranking cardinality
 *   => Public Ranking / Search Public API Core boundary
 *
 * - invalid public_position
 *   => Public Ranking / Search Public API Core boundary
 *
 * - response transport divergence
 *   => Search Public Response Builder
 *
 * SENSITIVE AREAS
 * - private/public separation
 * - untyped HTTP input
 * - canonical projection authorization
 * - transport metadata ownership
 * - accidental analytical reconstruction
 * - accidental ranking reconstruction
 * - leaking private validation details through public errors
 * ========================================================================== */

import {
  NextResponse,
} from "next/server";

import type {
  NextRequest,
} from "next/server";

import type {
  SearchPublicRankingProjection,
} from "@/lib/xyvala/search/contracts/search-pipeline-contract";

import {
  exposeSearchPublicRankingProjection,
} from "@/lib/xyvala/search/api/search-public-api-core";

import {
  buildSearchPublicResponse,
} from "@/lib/xyvala/search/api/search-public-response-builder";

/* ============================================================================
 * 1. NEXT.JS RUNTIME
 * ----------------------------------------------------------------------------
 * HTTP/framework configuration only.
 *
 * No Search analytical behavior depends on these values.
 * ========================================================================== */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* ============================================================================
 * 2. HTTP ERROR CONTRACT
 * ----------------------------------------------------------------------------
 * Public transport errors only.
 *
 * Internal analytical details, validation internals, stack traces and private
 * field identities must never be serialized through this contract.
 * ========================================================================== */

type SearchHttpErrorCode =
  | "INVALID_REQUEST"
  | "SEARCH_PUBLIC_BOUNDARY_REJECTED"
  | "METHOD_NOT_ALLOWED";

interface SearchHttpErrorResponse {
  readonly error:
    SearchHttpErrorCode;

  readonly message:
    string;

  readonly visibility:
    "PUBLIC";
}

/* ============================================================================
 * 3. SAFE RECORD GUARD
 * ----------------------------------------------------------------------------
 * HTTP shape guard only.
 *
 * Passing this guard does NOT authorize a value as canonical Search truth.
 * ========================================================================== */

function isRecord(
  value:
    unknown,
): value is Readonly<
  Record<string, unknown>
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}

/* ============================================================================
 * 4. REQUEST JSON PARSING
 * ----------------------------------------------------------------------------
 * Framework boundary only.
 *
 * Parsed JSON remains unknown until explicitly qualified.
 * ========================================================================== */

async function parseRequestBody(
  request:
    NextRequest,
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error(
      "Request body must contain valid JSON.",
    );
  }
}

/* ============================================================================
 * 5. PUBLIC PROJECTION CANDIDATE EXTRACTION
 * ----------------------------------------------------------------------------
 * This function validates only the HTTP envelope:
 *
 * {
 *   projection: ...
 * }
 *
 * It deliberately does NOT validate SearchPublicRankingProjection itself.
 *
 * Runtime authorization belongs exclusively to:
 *
 * exposeSearchPublicRankingProjection(...)
 *
 * The cast below therefore represents an untyped HTTP-boundary handoff, not
 * canonical authorization.
 * ========================================================================== */

function readSearchPublicProjectionCandidate(
  body:
    unknown,
): SearchPublicRankingProjection {
  if (
    !isRecord(
      body,
    )
  ) {
    throw new Error(
      "Request body must be a JSON object.",
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      body,
      "projection",
    )
  ) {
    throw new Error(
      "Request body must contain projection.",
    );
  }

  const projectionCandidate =
    body.projection;

  if (
    !isRecord(
      projectionCandidate,
    )
  ) {
    throw new Error(
      "projection must be a JSON object.",
    );
  }

  /*
   * HTTP-boundary cast only.
   *
   * No canonical authorization exists at this point.
   *
   * Search Public API Core validates the complete projection immediately
   * after this handoff.
   */
  return projectionCandidate as unknown as
    SearchPublicRankingProjection;
}

/* ============================================================================
 * 6. REQUEST IDENTITY
 * ----------------------------------------------------------------------------
 * request_id is HTTP transport metadata.
 *
 * It is deliberately NOT:
 * - SearchDocumentId
 * - SearchQueryId
 * - SearchCohortId
 * - SearchDistributionId
 * - snapshot_id
 * - analytical identity
 *
 * Runtime generation is therefore authorized at this outer orchestration
 * boundary.
 * ========================================================================== */

function createHttpRequestId(): string {
  return crypto.randomUUID();
}

/* ============================================================================
 * 7. RESPONSE TIMESTAMP
 * ----------------------------------------------------------------------------
 * created_at generated here belongs to HTTP response transport only.
 *
 * Canonical analytical producers remain forbidden from reading the runtime
 * clock internally.
 * ========================================================================== */

function createHttpResponseTimestamp(): string {
  return new Date()
    .toISOString();
}

/* ============================================================================
 * 8. PUBLIC HTTP ERROR RESPONSE
 * ----------------------------------------------------------------------------
 * One canonical local helper for framework transport errors.
 *
 * Cache is disabled because Search HTTP responses are request-bound.
 * ========================================================================== */

function buildHttpErrorResponse(
  status:
    number,

  error:
    SearchHttpErrorCode,

  message:
    string,
): NextResponse<SearchHttpErrorResponse> {
  return NextResponse.json(
    Object.freeze({
      error,

      message,

      visibility:
        "PUBLIC",
    }),

    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

/* ============================================================================
 * 9. INVALID REQUEST RESPONSE
 * ----------------------------------------------------------------------------
 * HTTP envelope failures may expose concise transport-level explanations.
 *
 * No canonical Search validation has occurred yet at this point.
 * ========================================================================== */

function buildInvalidRequestResponse(
  message:
    string,
): NextResponse<SearchHttpErrorResponse> {
  return buildHttpErrorResponse(
    400,
    "INVALID_REQUEST",
    message,
  );
}

/* ============================================================================
 * 10. CANONICAL BOUNDARY REJECTION RESPONSE
 * ----------------------------------------------------------------------------
 * Canonical validation errors deliberately receive a stable public message.
 *
 * Internal Error.message is NOT exposed because it may contain:
 * - internal contract names;
 * - private field identities;
 * - boundary implementation details;
 * - private governance terminology.
 *
 * The HTTP adapter must not become an information-leak boundary.
 * ========================================================================== */

function buildPublicBoundaryRejectedResponse():
  NextResponse<SearchHttpErrorResponse> {
  return buildHttpErrorResponse(
    422,
    "SEARCH_PUBLIC_BOUNDARY_REJECTED",
    "The supplied Search public projection was rejected by the canonical public boundary.",
  );
}

/* ============================================================================
 * 11. POST
 * ----------------------------------------------------------------------------
 * CURRENT EXECUTION
 *
 * raw HTTP JSON
 * -> parse as unknown
 * -> validate HTTP envelope
 * -> obtain unvalidated public projection candidate
 * -> Search Public API Core
 * -> canonical SearchPublicRankingProjection
 * -> Search Public Response Builder
 * -> SearchPublicResponse
 * -> HTTP JSON
 *
 * IMPORTANT
 *
 * Search Public API Core is the authorization boundary.
 *
 * Search Public Response Builder is the transport assembly boundary.
 *
 * This route owns neither responsibility.
 * ========================================================================== */

export async function POST(
  request:
    NextRequest,
): Promise<NextResponse> {
  let requestBody:
    unknown;

  /* --------------------------------------------------------------------------
   * HTTP JSON boundary
   * ----------------------------------------------------------------------- */

  try {
    requestBody =
      await parseRequestBody(
        request,
      );
  } catch (
    error
  ) {
    return buildInvalidRequestResponse(
      error instanceof Error
        ? error.message
        : "Invalid JSON request body.",
    );
  }

  /* --------------------------------------------------------------------------
   * HTTP envelope boundary
   * ----------------------------------------------------------------------- */

  let searchPublicProjectionCandidate:
    SearchPublicRankingProjection;

  try {
    searchPublicProjectionCandidate =
      readSearchPublicProjectionCandidate(
        requestBody,
      );
  } catch (
    error
  ) {
    return buildInvalidRequestResponse(
      error instanceof Error
        ? error.message
        : "Invalid Search request envelope.",
    );
  }

  /* --------------------------------------------------------------------------
   * Canonical Search public boundary
   * ----------------------------------------------------------------------- */

  try {
    const searchPublicRankingProjection =
      exposeSearchPublicRankingProjection({
        projection:
          searchPublicProjectionCandidate,
      });

    /*
     * Transport metadata is created only after canonical Search public truth
     * has crossed the authorized API boundary.
     */
    const requestId =
      createHttpRequestId();

    const createdAt =
      createHttpResponseTimestamp();

    /*
     * SearchPublicRankingProjection remains the canonical upstream identity.
     *
     * Search Public Response Builder transports that truth without:
     * - ranking;
     * - filtering;
     * - sorting;
     * - public_position reconstruction;
     * - label reconstruction.
     */
    const searchPublicResponse =
      buildSearchPublicResponse({
        projection:
          searchPublicRankingProjection,

        request_id:
          requestId,

        created_at:
          createdAt,
      });

    return NextResponse.json(
      searchPublicResponse,
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch {
    /*
     * Do not expose the canonical boundary Error.message.
     *
     * Search validation internals remain private even when the rejected input
     * arrived through a public HTTP boundary.
     */
    return buildPublicBoundaryRejectedResponse();
  }
}

/* ============================================================================
 * 12. GET
 * ----------------------------------------------------------------------------
 * GET is deliberately unavailable while this route still consumes an
 * externally produced SearchPublicRankingProjection.
 *
 * A query-oriented GET/POST Search API becomes legitimate only after the
 * canonical Search runtime orchestrator owns:
 *
 * query
 * -> private pipeline
 * -> transformation
 * -> public ranking
 * -> SearchPublicRankingProjection
 *
 * The HTTP adapter must not implement that orchestration locally.
 * ========================================================================== */

export function GET():
  NextResponse<SearchHttpErrorResponse> {
  return buildHttpErrorResponse(
    405,
    "METHOD_NOT_ALLOWED",
    "GET is not available on the current Search public boundary.",
  );
}
