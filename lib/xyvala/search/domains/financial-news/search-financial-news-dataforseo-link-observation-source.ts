/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-dataforseo-link-observation-source.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News DataForSEO link-observation source
 *
 * ROLE
 * - implement the existing authorized Financial News Link observation source
 * - query DataForSEO Backlinks Live for the exact canonical document source URI
 * - map provider backlink observations to SearchInboundLinkObservation[]
 * - expose explicit provider identity alongside those observations
 * - preserve the canonical Link Signals producer as sole owner of derived Link
 *   analytical truth
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - EXTERNAL OBSERVATION SOURCE
 * - LINK OBSERVATION SOURCE
 * - NETWORK BOUNDARY
 * - SERVER-SIDE INTEGRATION
 * - OBSERVE / VALIDATE / MAP
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 * - NON-PERSISTENT
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * SearchRuntimeLinkSignalsInput
 *        ↓
 * canonical raw_document.source_uri
 * used ONLY as DataForSEO lookup target
 *        ↓
 * THIS SOURCE
 *        ↓
 * POST /v3/backlinks/backlinks/live
 *        ↓
 * provider response validation
 *        ↓
 * SearchInboundLinkObservation[]
 *        +
 * link_data_provider = DATAFORSEO_BACKLINKS_LIVE
 *        ↓
 * Financial News authorized provider boundary
 *        ↓
 * Search Runtime Link producer adapter
 *        ↓
 * canonical Search Link Signals producer
 *        ↓
 * SearchLinkSignals
 *
 * CANONICAL PROVIDER MAPPING
 * ----------------------------------------------------------------------------
 * DataForSEO url_from
 * -> SearchInboundLinkObservation.source_uri
 *
 * DataForSEO anchor
 * -> SearchInboundLinkObservation.anchor_text
 *    only when the provider actually supplied a string
 *
 * DataForSEO last_seen
 * -> SearchInboundLinkObservation.observed_at
 *
 * DataForSEO does NOT currently provide canonical truth for:
 *
 * - reciprocal_link_observed
 * - suspected_link_cluster
 *
 * Those fields are therefore OMITTED.
 *
 * They MUST NOT be fabricated as false.
 *
 * LINK SIGNAL OWNERSHIP
 * ----------------------------------------------------------------------------
 * This source MUST NOT produce or calculate:
 *
 * - inbound_link_count
 * - unique_source_page_count
 * - unique_source_domain_count
 * - source_diversity_score
 * - anchor_text_convergence_score
 * - reciprocal_link_ratio
 * - suspected_link_cluster_ratio
 * - repeated_anchor_text_ratio
 * - link_signal_confidence
 * - final link_data_observed_at
 *
 * All those values remain owned by:
 *
 * search-link-signals-search-core.ts
 *
 * OBSERVATION SEMANTICS
 * ----------------------------------------------------------------------------
 * DataForSEO Backlinks Live returns unique backlink records from referring
 * pages.
 *
 * links_count is NOT expanded into synthetic repeated observations.
 *
 * One returned provider item
 * =
 * one SearchInboundLinkObservation.
 *
 * This source performs:
 * - no deduplication;
 * - no sorting;
 * - no filtering of valid returned items;
 * - no automatic pagination.
 *
 * Therefore one invocation represents ONE explicitly bounded provider page.
 *
 * A returned page MUST NOT be interpreted as the complete backlink graph.
 *
 * ZERO-RESULT SEMANTICS
 * ----------------------------------------------------------------------------
 * A successful provider response containing:
 *
 * items: []
 *
 * becomes:
 *
 * observations: []
 *
 * This means:
 *
 * no validated Link observations were returned by THIS provider request.
 *
 * It does NOT mean:
 * - the document has zero backlinks;
 * - no backlink exists elsewhere;
 * - canonical inbound_link_count equals zero.
 *
 * The canonical Link Signals producer already preserves this distinction by
 * returning unavailable/degraded evidence for an empty observation population.
 *
 * PROVIDER FAILURE SEMANTICS
 * ----------------------------------------------------------------------------
 * Transport, HTTP, root DataForSEO, task DataForSEO, schema and item failures
 * throw.
 *
 * They MUST NOT become:
 *
 * observations: []
 *
 * No catch-and-empty fallback exists.
 * No provider failure becomes unavailable analytical evidence here.
 *
 * DATAFORSEO REQUEST POLICY — V1
 * ----------------------------------------------------------------------------
 * Endpoint:
 *
 * POST https://api.dataforseo.com/v3/backlinks/backlinks/live
 *
 * One call contains exactly one task.
 *
 * Explicit request semantics:
 * - target = exact raw_document.source_uri
 * - mode = "as_is"
 * - backlinks_status_type = "live"
 * - exclude_internal_backlinks = true
 * - limit = explicit configuration
 * - offset = explicit configuration
 *
 * Rationale:
 * - as_is preserves provider backlink records without grouping by domain/anchor;
 * - live requests currently observed backlinks;
 * - internal backlinks are excluded explicitly to focus this Link evidence on
 *   external referring pages;
 * - pagination remains caller-controlled and explicit.
 *
 * No provider default is relied upon for these semantic fields.
 *
 * PAGINATION
 * ----------------------------------------------------------------------------
 * v1 deliberately supports one explicit page using:
 *
 * - limit
 * - offset
 *
 * It does NOT automatically consume search_after_token.
 *
 * A future multi-page acquisition design requires Contract Before Runtime and
 * explicit lifecycle/cost/partial-failure semantics.
 *
 * AUTHENTICATION
 * ----------------------------------------------------------------------------
 * DataForSEO API login and API password are explicit injected configuration.
 *
 * They are sent only through HTTP Basic Authorization.
 *
 * This source:
 * - does not read process.env;
 * - does not read .env files;
 * - does not place credentials in the URL;
 * - does not log credentials;
 * - does not include credentials in thrown error messages.
 *
 * Credentials MUST be provided by an authorized server-side configuration
 * boundary.
 *
 * TARGET GOVERNANCE
 * ----------------------------------------------------------------------------
 * raw_document.source_uri is used only as an external provider lookup target.
 *
 * This module MUST NOT:
 * - infer Link observations from raw_document content;
 * - infer Link observations from extracted_document;
 * - fetch the raw document URI directly;
 * - rewrite or normalize the target URI;
 * - generate another target from title/domain/query data.
 *
 * Provider item source_uri values are validated structurally but transported
 * unchanged.
 *
 * URI normalization remains owned by the canonical Link Signals producer.
 *
 * ANCHOR GOVERNANCE
 * ----------------------------------------------------------------------------
 * Provider anchor values are transported unchanged when they are strings.
 *
 * null / absent anchor
 * -> anchor_text omitted
 *
 * This source MUST NOT:
 * - lowercase anchor text;
 * - trim anchor text;
 * - normalize Unicode;
 * - collapse whitespace;
 * - infer anchor text from page title or surrounding text.
 *
 * Anchor canonicalization remains owned by the Link Signals producer.
 *
 * TEMPORAL GOVERNANCE
 * ----------------------------------------------------------------------------
 * DataForSEO last_seen is provider observation truth:
 *
 * "most recent date when our crawler visited the backlink".
 *
 * DataForSEO currently returns timestamps in the documented UTC representation:
 *
 * YYYY-MM-DD HH:MM:SS +00:00
 *
 * SearchInboundLinkObservation requires SearchIsoTimestamp.
 *
 * This source therefore performs ONE explicit deterministic format translation:
 *
 * YYYY-MM-DD HH:MM:SS +00:00
 *        ↓
 * YYYY-MM-DDTHH:MM:SS.000Z
 *
 * The instant is preserved exactly.
 *
 * This is transport-format adaptation, NOT timestamp generation.
 *
 * This source MUST NOT:
 * - read a runtime clock;
 * - use input.created_at as observed_at;
 * - use raw_document.fetched_at as observed_at;
 * - use raw_document.source_published_at as observed_at;
 * - compare observed_at with input.created_at;
 * - repair provider time;
 * - invent a current observation timestamp.
 *
 * The current canonical Link Signals core validates parseability and selects
 * the latest supplied observed_at. It does not impose an observed_at <=
 * created_at relation.
 *
 * BOOLEAN EVIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * reciprocal_link_observed and suspected_link_cluster are OPTIONAL canonical
 * observation facts.
 *
 * DataForSEO Backlinks Live fields used by this v1 integration do not establish
 * either truth.
 *
 * Therefore both fields are omitted.
 *
 * NEVER:
 *
 * unknown -> false
 *
 * The canonical Link Signals producer then correctly exposes:
 * - reciprocal ratio unavailable when no reciprocal evidence exists;
 * - cluster ratio unavailable when no cluster evidence exists.
 *
 * PROVIDER STATUS GOVERNANCE
 * ----------------------------------------------------------------------------
 * A response is admitted only when all of the following hold:
 *
 * HTTP success
 * +
 * DataForSEO root status_code === 20000
 * +
 * tasks_count === 1
 * +
 * tasks_error === 0
 * +
 * exactly one task
 * +
 * task status_code === 20000
 * +
 * exactly one result object
 * +
 * valid items array
 *
 * No partial task/result repair is performed.
 *
 * SECURITY / RESOURCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * - fixed HTTPS DataForSEO endpoint
 * - POST only
 * - redirects rejected
 * - cookies omitted
 * - cache disabled
 * - explicit AbortSignal timeout
 * - response bytes bounded before JSON parsing
 * - provider/transport error details sanitized
 * - no response body appears in thrown error messages
 * - no target URI appears in thrown error messages
 *
 * SIDE EFFECTS
 * ----------------------------------------------------------------------------
 * Factory creation performs:
 * - no network request
 * - no clock read
 *
 * Source invocation performs:
 * - exactly one DataForSEO request
 * - no retry
 * - no persistence
 * - no logging
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * This file introduces no parallel Search analytical contract.
 *
 * Input/output types are derived from:
 *
 * - SearchFinancialNewsAuthorizedLinkObservationSource
 * - SearchInboundLinkObservation
 *
 * Provider schema types remain PRIVATE integration details.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * invalid source dependency/configuration
 * => THIS source factory
 *
 * invalid target URI
 * => THIS external source boundary
 *
 * transport/HTTP failure
 * => THIS external source boundary
 *
 * DataForSEO root/task failure
 * => THIS external source boundary
 *
 * malformed provider response/item
 * => THIS external source boundary
 *
 * canonical Link observation incompatibility
 * => compile-time mapping or Link Signals boundary
 *
 * derived Link signal divergence
 * => canonical Link Signals producer
 *
 * This module MUST NOT repair downstream divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - explicit credentials
 * - explicit bounded page
 * - exact target reference
 * - one provider item = one canonical observation
 * - explicit provider identity
 * - deterministic timestamp-format adaptation only
 * - exact omission of unavailable boolean evidence
 *
 * - no implicit credential
 * - no environment access
 * - no automatic retry
 * - no automatic pagination
 * - no deduplication
 * - no sorting
 * - no links_count expansion
 * - no observation from raw/extracted content
 * - no anchor inference
 * - no reciprocal inference
 * - no cluster inference
 * - no score calculation
 * - no confidence calculation
 * - no runtime clock
 * - no trace generation
 * - no lineage generation
 * - no persistence
 * - no logging
 *
 * PROTOCOL
 * ----------------------------------------------------------------------------
 * - Xyvala Search Protocol 3.0
 * - Search VLR OFFICIAL / NORMATIVE
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - reality before interpretation
 * - one truth = one canonical owner
 * - explicit availability
 * - unavailable != zero
 * - unknown boolean evidence != false
 * - provider failure != zero observations
 * - Compute / Observe / Mutate separation
 * ========================================================================== */

import {
  Buffer,
} from "node:buffer";

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import type {
  SearchInboundLinkObservation,
} from "../../signals/search-link-signals-search-core";

import type {
  SearchFinancialNewsAuthorizedLinkObservationSource,
} from "./search-financial-news-link-observation-provider";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_MODULE_NAME =
  "xyvala-search-financial-news-dataforseo-link-observation-source" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

export const XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_DATA_PROVIDER =
  "DATAFORSEO_BACKLINKS_LIVE" as const;

const DATAFORSEO_BACKLINKS_LIVE_ENDPOINT =
  "https://api.dataforseo.com/v3/backlinks/backlinks/live";

const DATAFORSEO_SUCCESS_STATUS_CODE =
  20000;

const DATAFORSEO_MAXIMUM_LIMIT =
  1000;

const DATAFORSEO_MAXIMUM_OFFSET =
  20_000;

const MAXIMUM_TIMER_DELAY_MS =
  2_147_483_647;

/* ============================================================================
 * 2. TYPES DERIVED FROM CANONICAL FINANCIAL NEWS SOURCE CONTRACT
 * ========================================================================== */

type SearchFinancialNewsDataForSeoLinkObservationSourceInput =
  Parameters<
    SearchFinancialNewsAuthorizedLinkObservationSource
  >[0];

type SearchFinancialNewsDataForSeoLinkObservationResolution =
  Awaited<
    ReturnType<
      SearchFinancialNewsAuthorizedLinkObservationSource
    >
  >;

/* ============================================================================
 * 3. EXPLICIT SOURCE CONFIGURATION / DEPENDENCIES
 * ========================================================================== */

export interface SearchFinancialNewsDataForSeoLinkObservationSourceConfiguration {
  readonly api_login:
    string;

  readonly api_password:
    string;

  readonly limit:
    number;

  readonly offset:
    number;

  readonly request_timeout_ms:
    number;

  readonly maximum_response_bytes:
    number;
}

export interface SearchFinancialNewsDataForSeoLinkObservationSourceDependencies {
  readonly configuration:
    SearchFinancialNewsDataForSeoLinkObservationSourceConfiguration;

  readonly fetch:
    typeof globalThis.fetch;
}

/* ============================================================================
 * 4. SOURCE ERROR CONTRACT
 * ========================================================================== */

export type SearchFinancialNewsDataForSeoLinkObservationErrorCode =
  | "INVALID_CONFIGURATION"
  | "INVALID_RUNTIME_INPUT"
  | "INVALID_TARGET_URI"
  | "TRANSPORT_FAILURE"
  | "REQUEST_TIMEOUT"
  | "HTTP_FAILURE"
  | "UNEXPECTED_CONTENT_TYPE"
  | "RESPONSE_TOO_LARGE"
  | "INVALID_RESPONSE_ENCODING"
  | "INVALID_JSON"
  | "DATAFORSEO_ROOT_FAILURE"
  | "DATAFORSEO_TASK_FAILURE"
  | "INVALID_PROVIDER_PAYLOAD"
  | "INVALID_PROVIDER_ITEM";

export class SearchFinancialNewsDataForSeoLinkObservationError
  extends Error {
  readonly code:
    SearchFinancialNewsDataForSeoLinkObservationErrorCode;

  readonly field:
    string | null;

  readonly http_status:
    number | null;

  readonly provider_status_code:
    number | null;

  readonly task_status_code:
    number | null;

  readonly item_index:
    number | null;

  constructor(
    code:
      SearchFinancialNewsDataForSeoLinkObservationErrorCode,

    options:
      Readonly<{
        field?:
          string;

        http_status?:
          number;

        provider_status_code?:
          number;

        task_status_code?:
          number;

        item_index?:
          number;
      }> =
      {},
  ) {
    super(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_MODULE_NAME}] ` +
        `${code}; field=${options.field ?? "none"}; ` +
        `http_status=${options.http_status ?? "none"}; ` +
        `provider_status_code=${options.provider_status_code ?? "none"}; ` +
        `task_status_code=${options.task_status_code ?? "none"}; ` +
        `item_index=${options.item_index ?? "none"}.`,
    );

    this.name =
      "SearchFinancialNewsDataForSeoLinkObservationError";

    this.code =
      code;

    this.field =
      options.field ??
      null;

    this.http_status =
      options.http_status ??
      null;

    this.provider_status_code =
      options.provider_status_code ??
      null;

    this.task_status_code =
      options.task_status_code ??
      null;

    this.item_index =
      options.item_index ??
      null;
  }
}

/* ============================================================================
 * 5. SAFE STRUCTURAL HELPERS
 * ========================================================================== */

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
  return (
    value !==
      null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  );
}

function isNonEmptyString(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}

function hasAsciiControlCharacter(
  value:
    string,
): boolean {
  return Array.from(
    value,
  ).some(
    (
      character,
    ) => {
      const code =
        character.charCodeAt(
          0,
        );

      return (
        code <
          32 ||
        code ===
          127
      );
    },
  );
}

function isSafeIntegerWithin(
  value:
    unknown,

  minimum:
    number,

  maximum:
    number,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isSafeInteger(
      value,
    ) &&
    value >=
      minimum &&
    value <=
      maximum
  );
}

/* ============================================================================
 * 6. CONFIGURATION VALIDATION
 * ========================================================================== */

function invalidConfiguration(
  field:
    string,
): never {
  throw new SearchFinancialNewsDataForSeoLinkObservationError(
    "INVALID_CONFIGURATION",
    {
      field,
    },
  );
}

function validateSearchFinancialNewsDataForSeoLinkObservationSourceConfiguration(
  configuration:
    SearchFinancialNewsDataForSeoLinkObservationSourceConfiguration,
): void {
  if (
    !isRecord(
      configuration,
    )
  ) {
    invalidConfiguration(
      "configuration",
    );
  }

  if (
    !isNonEmptyString(
      configuration.api_login,
    ) ||
    configuration.api_login.includes(
      ":",
    ) ||
    hasAsciiControlCharacter(
      configuration.api_login,
    )
  ) {
    invalidConfiguration(
      "api_login",
    );
  }

  if (
    !isNonEmptyString(
      configuration.api_password,
    ) ||
    hasAsciiControlCharacter(
      configuration.api_password,
    )
  ) {
    invalidConfiguration(
      "api_password",
    );
  }

  if (
    !isSafeIntegerWithin(
      configuration.limit,
      1,
      DATAFORSEO_MAXIMUM_LIMIT,
    )
  ) {
    invalidConfiguration(
      "limit",
    );
  }

  if (
    !isSafeIntegerWithin(
      configuration.offset,
      0,
      DATAFORSEO_MAXIMUM_OFFSET,
    )
  ) {
    invalidConfiguration(
      "offset",
    );
  }

  if (
    !isSafeIntegerWithin(
      configuration.request_timeout_ms,
      1,
      MAXIMUM_TIMER_DELAY_MS,
    )
  ) {
    invalidConfiguration(
      "request_timeout_ms",
    );
  }

  if (
    !isSafeIntegerWithin(
      configuration.maximum_response_bytes,
      1,
      Number.MAX_SAFE_INTEGER,
    )
  ) {
    invalidConfiguration(
      "maximum_response_bytes",
    );
  }
}

/* ============================================================================
 * 7. TARGET VALIDATION
 * ========================================================================== */

function validateDataForSeoTargetUri(
  value:
    unknown,
): string {
  if (
    !isNonEmptyString(
      value,
    )
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_TARGET_URI",
      {
        field:
          "raw_document.source_uri",
      },
    );
  }

  try {
    const parsed =
      new URL(
        value,
      );

    if (
      (
        parsed.protocol !==
          "http:" &&
        parsed.protocol !==
          "https:"
      ) ||
      parsed.hostname.length ===
        0 ||
      parsed.username.length >
        0 ||
      parsed.password.length >
        0
    ) {
      throw new Error(
        "invalid target",
      );
    }
  } catch {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_TARGET_URI",
      {
        field:
          "raw_document.source_uri",
      },
    );
  }

  return value;
}

function validateSearchFinancialNewsDataForSeoLinkObservationRuntimeInput(
  input:
    SearchFinancialNewsDataForSeoLinkObservationSourceInput,
): string {
  if (
    !isRecord(
      input,
    ) ||
    !isRecord(
      input.raw_document,
    )
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_RUNTIME_INPUT",
      {
        field:
          "input",
      },
    );
  }

  return validateDataForSeoTargetUri(
    input
      .raw_document
      .source_uri,
  );
}

/* ============================================================================
 * 8. AUTHORIZATION
 * ========================================================================== */

function buildDataForSeoAuthorizationHeader(
  configuration:
    SearchFinancialNewsDataForSeoLinkObservationSourceConfiguration,
): string {
  const credential =
    `${configuration.api_login}:${configuration.api_password}`;

  return `Basic ${Buffer.from(
    credential,
    "utf8",
  ).toString(
    "base64",
  )}`;
}

/* ============================================================================
 * 9. REQUEST BODY
 * ========================================================================== */

interface DataForSeoBacklinksLiveTask {
  readonly target:
    string;

  readonly mode:
    "as_is";

  readonly backlinks_status_type:
    "live";

  readonly exclude_internal_backlinks:
    true;

  readonly limit:
    number;

  readonly offset:
    number;
}

function buildDataForSeoBacklinksLiveRequestBody(
  target:
    string,

  configuration:
    SearchFinancialNewsDataForSeoLinkObservationSourceConfiguration,
): string {
  const task =
    Object.freeze({
      target,

      mode:
        "as_is",

      backlinks_status_type:
        "live",

      exclude_internal_backlinks:
        true,

      limit:
        configuration.limit,

      offset:
        configuration.offset,
    } satisfies DataForSeoBacklinksLiveTask);

  return JSON.stringify([
    task,
  ]);
}

/* ============================================================================
 * 10. BOUNDED RESPONSE BODY READING
 * ========================================================================== */

function discardResponseBody(
  response:
    Response,
): void {
  if (
    response.body !==
    null
  ) {
    void response
      .body
      .cancel()
      .catch(
        () =>
          undefined,
      );
  }
}

async function readBoundedResponseBody(
  response:
    Response,

  maximumResponseBytes:
    number,

  signal:
    AbortSignal,
): Promise<string> {
  if (
    response.body ===
    null
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_JSON",
      {
        field:
          "response.body",
      },
    );
  }

  const reader =
    response.body
      .getReader();

  const decoder =
    new TextDecoder(
      "utf-8",
      {
        fatal:
          true,
      },
    );

  const parts:
    string[] =
    [];

  let receivedBytes =
    0;

  let completed =
    false;

  const cancel =
    (): void => {
      void reader
        .cancel()
        .catch(
          () =>
            undefined,
        );
    };

  signal.addEventListener(
    "abort",
    cancel,
    {
      once:
        true,
    },
  );

  try {
    for (;;) {
      if (
        signal.aborted
      ) {
        throw new SearchFinancialNewsDataForSeoLinkObservationError(
          "REQUEST_TIMEOUT",
        );
      }

      const chunk =
        await reader.read();

      if (
        signal.aborted
      ) {
        throw new SearchFinancialNewsDataForSeoLinkObservationError(
          "REQUEST_TIMEOUT",
        );
      }

      if (
        chunk.done
      ) {
        break;
      }

      if (
        chunk.value.byteLength >
        maximumResponseBytes -
          receivedBytes
      ) {
        throw new SearchFinancialNewsDataForSeoLinkObservationError(
          "RESPONSE_TOO_LARGE",
        );
      }

      receivedBytes +=
        chunk.value.byteLength;

      try {
        parts.push(
          decoder.decode(
            chunk.value,
            {
              stream:
                true,
            },
          ),
        );
      } catch {
        throw new SearchFinancialNewsDataForSeoLinkObservationError(
          "INVALID_RESPONSE_ENCODING",
        );
      }
    }

    try {
      parts.push(
        decoder.decode(),
      );
    } catch {
      throw new SearchFinancialNewsDataForSeoLinkObservationError(
        "INVALID_RESPONSE_ENCODING",
      );
    }

    completed =
      true;

    return parts.join(
      "",
    );
  } finally {
    signal.removeEventListener(
      "abort",
      cancel,
    );

    if (
      !completed
    ) {
      cancel();
    }

    reader.releaseLock();
  }
}

/* ============================================================================
 * 11. DATAFORSEO TRANSPORT
 * ========================================================================== */

async function retrieveDataForSeoBacklinksLiveBody(
  target:
    string,

  dependencies:
    SearchFinancialNewsDataForSeoLinkObservationSourceDependencies,
): Promise<string> {
  const configuration =
    dependencies.configuration;

  const controller =
    new AbortController();

  let timer:
    ReturnType<typeof setTimeout> |
    undefined;

  const timeout =
    new Promise<never>(
      (
        _resolve,
        reject,
      ) => {
        timer =
          setTimeout(
            () => {
              reject(
                new SearchFinancialNewsDataForSeoLinkObservationError(
                  "REQUEST_TIMEOUT",
                ),
              );

              controller.abort();
            },
            configuration
              .request_timeout_ms,
          );
      },
    );

  const operation =
    async (): Promise<string> => {
      try {
        const response =
          await dependencies.fetch(
            DATAFORSEO_BACKLINKS_LIVE_ENDPOINT,
            {
              method:
                "POST",

              headers:
                Object.freeze({
                  Accept:
                    "application/json",

                  Authorization:
                    buildDataForSeoAuthorizationHeader(
                      configuration,
                    ),

                  "Content-Type":
                    "application/json; charset=utf-8",
                }),

              body:
                buildDataForSeoBacklinksLiveRequestBody(
                  target,
                  configuration,
                ),

              redirect:
                "error",

              credentials:
                "omit",

              cache:
                "no-store",

              signal:
                controller.signal,
            },
          );

        if (
          controller.signal
            .aborted
        ) {
          discardResponseBody(
            response,
          );

          throw new SearchFinancialNewsDataForSeoLinkObservationError(
            "REQUEST_TIMEOUT",
          );
        }

        if (
          response.redirected ||
          !response.ok
        ) {
          discardResponseBody(
            response,
          );

          throw new SearchFinancialNewsDataForSeoLinkObservationError(
            "HTTP_FAILURE",
            {
              http_status:
                response.status,
            },
          );
        }

        const contentType =
          response.headers
            .get(
              "content-type",
            )
            ?.split(
              ";",
            )[0]
            ?.trim()
            .toLowerCase() ??
          "";

        if (
          contentType !==
            "application/json" &&
          !/^application\/[a-z0-9!#$&^_.+-]+\+json$/.test(
            contentType,
          )
        ) {
          discardResponseBody(
            response,
          );

          throw new SearchFinancialNewsDataForSeoLinkObservationError(
            "UNEXPECTED_CONTENT_TYPE",
            {
              field:
                "content-type",
            },
          );
        }

        return await readBoundedResponseBody(
          response,
          configuration
            .maximum_response_bytes,
          controller.signal,
        );
      } catch (
        error:
          unknown
      ) {
        if (
          error instanceof
          SearchFinancialNewsDataForSeoLinkObservationError
        ) {
          throw error;
        }

        throw new SearchFinancialNewsDataForSeoLinkObservationError(
          controller.signal
            .aborted
            ? "REQUEST_TIMEOUT"
            : "TRANSPORT_FAILURE",
        );
      }
    };

  try {
    return await Promise.race([
      operation(),
      timeout,
    ]);
  } finally {
    if (
      timer !==
      undefined
    ) {
      clearTimeout(
        timer,
      );
    }

    controller.abort();
  }
}

/* ============================================================================
 * 12. DATAFORSEO TIMESTAMP FORMAT ADAPTATION
 * ========================================================================== */

function mapDataForSeoLastSeenToSearchIsoTimestamp(
  value:
    unknown,

  itemIndex:
    number,
): SearchInboundLinkObservation[
  "observed_at"
] {
  if (
    typeof value !==
    "string"
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_ITEM",
      {
        field:
          "last_seen",

        item_index:
          itemIndex,
      },
    );
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2}) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d) \+00:00$/.exec(
      value,
    );

  if (
    match ===
      null
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_ITEM",
      {
        field:
          "last_seen",

        item_index:
          itemIndex,
      },
    );
  }

  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
    second,
  ] =
    match;

  const iso =
    `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;

  if (
    !Number.isFinite(
      Date.parse(
        iso,
      ),
    )
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_ITEM",
      {
        field:
          "last_seen",

        item_index:
          itemIndex,
      },
    );
  }

  return iso;
}

/* ============================================================================
 * 13. PROVIDER ITEM VALIDATION / MAPPING
 * ========================================================================== */

function validateProviderSourceUri(
  value:
    unknown,

  itemIndex:
    number,
): string {
  if (
    !isNonEmptyString(
      value,
    )
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_ITEM",
      {
        field:
          "url_from",

        item_index:
          itemIndex,
      },
    );
  }

  try {
    const parsed =
      new URL(
        value,
      );

    if (
      (
        parsed.protocol !==
          "http:" &&
        parsed.protocol !==
          "https:"
      ) ||
      parsed.hostname.length ===
        0 ||
      parsed.username.length >
        0 ||
      parsed.password.length >
        0
    ) {
      throw new Error(
        "invalid source uri",
      );
    }
  } catch {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_ITEM",
      {
        field:
          "url_from",

        item_index:
          itemIndex,
      },
    );
  }

  return value;
}

function mapDataForSeoBacklinkItem(
  item:
    unknown,

  itemIndex:
    number,
): SearchInboundLinkObservation {
  if (
    !isRecord(
      item,
    )
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_ITEM",
      {
        field:
          "item",

        item_index:
          itemIndex,
      },
    );
  }

  if (
    item.type !==
      "backlink"
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_ITEM",
      {
        field:
          "type",

        item_index:
          itemIndex,
      },
    );
  }

  const sourceUri =
    validateProviderSourceUri(
      item.url_from,
      itemIndex,
    );

  const observedAt =
    mapDataForSeoLastSeenToSearchIsoTimestamp(
      item.last_seen,
      itemIndex,
    );

  const anchor =
    item.anchor;

  if (
    anchor !==
      undefined &&
    anchor !==
      null &&
    typeof anchor !==
      "string"
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_ITEM",
      {
        field:
          "anchor",

        item_index:
          itemIndex,
      },
    );
  }

  /*
   * links_count is deliberately ignored.
   *
   * One provider record remains one observation.
   * No multiplicity expansion is authorized.
   */

  if (
    typeof anchor ===
      "string"
  ) {
    return Object.freeze({
      source_uri:
        sourceUri,

      anchor_text:
        anchor,

      observed_at:
        observedAt,
    } satisfies SearchInboundLinkObservation);
  }

  return Object.freeze({
    source_uri:
      sourceUri,

    observed_at:
      observedAt,
  } satisfies SearchInboundLinkObservation);
}

/* ============================================================================
 * 14. PROVIDER RESPONSE VALIDATION / MAPPING
 * ========================================================================== */

function requireSafeInteger(
  value:
    unknown,

  field:
    string,
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isSafeInteger(
      value,
    )
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_PAYLOAD",
      {
        field,
      },
    );
  }

  return value;
}

function parseDataForSeoBacklinksLiveResponse(
  body:
    string,
): SearchFinancialNewsDataForSeoLinkObservationResolution {
  let payload:
    unknown;

  try {
    payload =
      JSON.parse(
        body,
      );
  } catch {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_JSON",
    );
  }

  if (
    !isRecord(
      payload,
    )
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_PAYLOAD",
      {
        field:
          "root",
      },
    );
  }

  const rootStatusCode =
    requireSafeInteger(
      payload.status_code,
      "status_code",
    );

  if (
    rootStatusCode !==
    DATAFORSEO_SUCCESS_STATUS_CODE
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "DATAFORSEO_ROOT_FAILURE",
      {
        provider_status_code:
          rootStatusCode,
      },
    );
  }

  const tasksCount =
    requireSafeInteger(
      payload.tasks_count,
      "tasks_count",
    );

  const tasksError =
    requireSafeInteger(
      payload.tasks_error,
      "tasks_error",
    );

  if (
    tasksCount !==
      1 ||
    tasksError !==
      0 ||
    !Array.isArray(
      payload.tasks,
    ) ||
    payload.tasks.length !==
      1
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_PAYLOAD",
      {
        field:
          "tasks",
      },
    );
  }

  const task =
    payload.tasks[
      0
    ];

  if (
    !isRecord(
      task,
    )
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_PAYLOAD",
      {
        field:
          "tasks[0]",
      },
    );
  }

  const taskStatusCode =
    requireSafeInteger(
      task.status_code,
      "tasks[0].status_code",
    );

  if (
    taskStatusCode !==
    DATAFORSEO_SUCCESS_STATUS_CODE
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "DATAFORSEO_TASK_FAILURE",
      {
        provider_status_code:
          rootStatusCode,

        task_status_code:
          taskStatusCode,
      },
    );
  }

  if (
    !Array.isArray(
      task.result,
    ) ||
    task.result.length !==
      1
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_PAYLOAD",
      {
        field:
          "tasks[0].result",
      },
    );
  }

  const result =
    task.result[
      0
    ];

  if (
    !isRecord(
      result,
    ) ||
    !Array.isArray(
      result.items,
    )
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_PAYLOAD",
      {
        field:
          "tasks[0].result[0].items",
      },
    );
  }

  const itemsCount =
    requireSafeInteger(
      result.items_count,
      "tasks[0].result[0].items_count",
    );

  if (
    itemsCount !==
    result.items.length
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_PROVIDER_PAYLOAD",
      {
        field:
          "tasks[0].result[0].items_count",
      },
    );
  }

  const observations =
    Object.freeze(
      result.items.map(
        (
          item,
          index,
        ) =>
          mapDataForSeoBacklinkItem(
            item,
            index,
          ),
      ),
    );

  return Object.freeze({
    observations,

    link_data_provider:
      XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_DATA_PROVIDER,
  } satisfies SearchFinancialNewsDataForSeoLinkObservationResolution);
}

/* ============================================================================
 * 15. CANONICAL SOURCE FACTORY
 * ========================================================================== */

export function createSearchFinancialNewsDataForSeoLinkObservationSource(
  dependencies:
    SearchFinancialNewsDataForSeoLinkObservationSourceDependencies,
): SearchFinancialNewsAuthorizedLinkObservationSource {
  if (
    !isRecord(
      dependencies,
    ) ||
    typeof dependencies.fetch !==
      "function"
  ) {
    throw new SearchFinancialNewsDataForSeoLinkObservationError(
      "INVALID_CONFIGURATION",
      {
        field:
          "dependencies",
      },
    );
  }

  validateSearchFinancialNewsDataForSeoLinkObservationSourceConfiguration(
    dependencies.configuration,
  );

  const configuration =
    Object.freeze({
      api_login:
        dependencies
          .configuration
          .api_login,

      api_password:
        dependencies
          .configuration
          .api_password,

      limit:
        dependencies
          .configuration
          .limit,

      offset:
        dependencies
          .configuration
          .offset,

      request_timeout_ms:
        dependencies
          .configuration
          .request_timeout_ms,

      maximum_response_bytes:
        dependencies
          .configuration
          .maximum_response_bytes,
    } satisfies SearchFinancialNewsDataForSeoLinkObservationSourceConfiguration);

  const fetchTransport =
    dependencies.fetch;

  const source:
    SearchFinancialNewsAuthorizedLinkObservationSource =
      async (
        input,
      ) => {
        const target =
          validateSearchFinancialNewsDataForSeoLinkObservationRuntimeInput(
            input,
          );

        const body =
          await retrieveDataForSeoBacklinksLiveBody(
            target,
            {
              configuration,

              fetch:
                fetchTransport,
            },
          );

        return parseDataForSeoBacklinksLiveResponse(
          body,
        );
      };

  return source;
}

/* ============================================================================
 * 16. STATIC MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_MANIFEST =
  Object.freeze({
    source:
      "FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_V1",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    provider:
      XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_DATA_PROVIDER,

    endpoint:
      DATAFORSEO_BACKLINKS_LIVE_ENDPOINT,

    request_method:
      "POST",

    task_count_per_invocation:
      1,

    mode:
      "as_is",

    backlinks_status_type:
      "live",

    exclude_internal_backlinks:
      true,

    automatic_retry:
      false,

    automatic_pagination:
      false,

    links_count_expansion:
      false,

    reciprocal_truth_produced:
      false,

    cluster_truth_produced:
      false,

    runtime_clock_read:
      false,

    direct_target_fetch:
      false,
  } as const);

/* ============================================================================
 * 17. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "EXTERNAL_OBSERVATION_PLANE",

    architectural_role:
      "DATAFORSEO_LINK_OBSERVATION_SOURCE",

    external_observation_truth_owner:
      "DATAFORSEO_BACKLINKS_LIVE",

    canonical_observation_contract:
      "SearchInboundLinkObservation",

    canonical_link_signals_owner:
      "SEARCH_LINK_SIGNALS_SEARCH_CORE",

    provider_identity_owner:
      "FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE",

    target_truth_owner:
      "SEARCH_RAW_DOCUMENT",

    source_uri_truth_owner:
      "DATAFORSEO_BACKLINK_ITEM_URL_FROM",

    anchor_text_truth_owner:
      "DATAFORSEO_BACKLINK_ITEM_ANCHOR",

    observed_at_truth_owner:
      "DATAFORSEO_BACKLINK_ITEM_LAST_SEEN",

    reciprocal_link_truth_owner:
      "UNAVAILABLE_FROM_THIS_SOURCE_V1",

    suspected_cluster_truth_owner:
      "UNAVAILABLE_FROM_THIS_SOURCE_V1",

    provider_schema_validation_owned_here:
      true,

    provider_transport_mapping_owned_here:
      true,

    timestamp_format_translation_owned_here:
      true,

    timestamp_instant_created_here:
      false,

    uri_normalization_owned_here:
      false,

    anchor_normalization_owned_here:
      false,

    observation_identity_created_here:
      false,

    link_signal_created_here:
      false,

    score_created_here:
      false,

    confidence_created_here:
      false,

    execution_trace_created_here:
      false,

    variable_lineage_created_here:
      false,

    persistence_performed:
      false,

    mutable_global_state_created:
      false,

    network_access_initiated_here:
      true,
  } as const);

/* ============================================================================
 * 18. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_OBSERVATION_SOURCE_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_truth_one_owner:
      true,

    explicit_credentials_required:
      true,

    explicit_page_limit_required:
      true,

    explicit_page_offset_required:
      true,

    exact_raw_document_target_required:
      true,

    one_provider_item_one_observation_required:
      true,

    provider_item_order_preserved:
      true,

    provider_item_cardinality_preserved:
      true,

    provider_anchor_reference_preserved:
      true,

    provider_last_seen_instant_preserved:
      true,

    provider_identity_explicit:
      true,

    implicit_credentials_allowed:
      false,

    environment_access_allowed:
      false,

    target_uri_reconstruction_allowed:
      false,

    target_uri_normalization_allowed:
      false,

    direct_target_fetch_allowed:
      false,

    observation_from_raw_document_allowed:
      false,

    observation_from_extracted_document_allowed:
      false,

    source_uri_generation_allowed:
      false,

    source_uri_normalization_allowed:
      false,

    anchor_text_inference_allowed:
      false,

    anchor_text_normalization_allowed:
      false,

    reciprocal_link_inference_allowed:
      false,

    reciprocal_unknown_as_false_allowed:
      false,

    cluster_inference_allowed:
      false,

    cluster_unknown_as_false_allowed:
      false,

    observed_at_from_runtime_created_at_allowed:
      false,

    observed_at_from_fetched_at_allowed:
      false,

    observed_at_from_source_published_at_allowed:
      false,

    observed_at_clock_generation_allowed:
      false,

    observed_at_runtime_comparison_required:
      false,

    timestamp_format_translation_allowed:
      true,

    timestamp_instant_repair_allowed:
      false,

    links_count_expansion_allowed:
      false,

    observation_deduplication_allowed:
      false,

    observation_sorting_allowed:
      false,

    automatic_retry_allowed:
      false,

    automatic_pagination_allowed:
      false,

    provider_failure_as_empty_observations_allowed:
      false,

    partial_invalid_item_filtering_allowed:
      false,

    derived_link_count_calculation_allowed:
      false,

    source_diversity_calculation_allowed:
      false,

    anchor_convergence_calculation_allowed:
      false,

    reciprocal_ratio_calculation_allowed:
      false,

    cluster_ratio_calculation_allowed:
      false,

    repeated_anchor_ratio_calculation_allowed:
      false,

    confidence_calculation_allowed:
      false,

    analytical_scoring_allowed:
      false,

    calibration_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    execution_trace_generation_allowed:
      false,

    variable_lineage_generation_allowed:
      false,

    persistence_allowed:
      false,

    module_level_mutable_state_allowed:
      false,

    logging_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "credentials_from_process_env",
        "credentials_in_url",
        "credential_logging",

        "derive_target_from_query",
        "derive_target_from_title",
        "normalize_target_uri",
        "fetch_target_document_directly",

        "link_observation_from_raw_document",
        "link_observation_from_extracted_document",

        "generate_source_uri",
        "normalize_source_uri",

        "infer_anchor_text",
        "normalize_anchor_text",

        "infer_reciprocal_link",
        "reciprocal_unknown_to_false",

        "infer_suspected_link_cluster",
        "cluster_unknown_to_false",

        "observed_at_from_created_at",
        "observed_at_from_fetched_at",
        "observed_at_from_source_published_at",
        "observed_at_from_runtime_clock",
        "repair_observed_at",

        "expand_links_count_to_observations",
        "deduplicate_provider_items",
        "sort_provider_items",

        "automatic_retry",
        "automatic_pagination",

        "provider_failure_to_empty_observations",
        "filter_invalid_provider_item_and_continue",

        "calculate_inbound_link_count",
        "calculate_source_diversity",
        "calculate_anchor_convergence",
        "calculate_reciprocal_ratio",
        "calculate_cluster_ratio",
        "calculate_repeated_anchor_ratio",
        "calculate_link_confidence",

        "execution_trace_generation",
        "variable_lineage_generation",

        "persistence",
        "mutable_global_state",
        "logging",
      ] as const),
  } as const);
