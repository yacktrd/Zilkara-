/* ============================================================================
 * FILE:
 * lib/xyvala/search/domains/financial-news/search-financial-news-eodhd-acquisition-source.ts
 * ----------------------------------------------------------------------------
 * Xyvala Search Financial News - EODHD acquisition source
 *
 * ROLE
 * - implement the existing SearchFinancialNewsAcquisitionSourcePort;
 * - retrieve ONE explicitly configured EODHD news page per invocation;
 * - map provider observations to SearchFinancialNewsAcquisitionInput[];
 * - leave SearchRawDocument production to the existing acquisition adapter/core.
 *
 * BOUNDARY
 * - SERVER-SIDE external acquisition / observation boundary;
 * - HTTP transport, credentials, scope, limits and clock are explicitly supplied;
 * - factory construction performs no request and reads no clock;
 * - live I/O is NOT deterministic: replay requires the same response AND times;
 * - mapping is deterministic for identical payload, configuration and timestamps.
 *
 * SCOPE
 * - symbol is explicitly selected by the authorized caller;
 * - query.raw_query is NOT interpreted as an EODHD ticker or topic;
 * - this version is NOT a free-text search-to-symbol resolver;
 * - one page only: limit/offset do not imply corpus completeness;
 * - no automatic pagination, retry, filtering, deduplication or reordering;
 * - only an actual successful empty JSON array produces an empty result.
 *
 * DOCUMENT REPRESENTATION
 * - link -> source_uri, unchanged;
 * - content -> raw_content, unchanged, including whitespace;
 * - content_mime_type describes content, NOT the surrounding HTTP JSON;
 * - title, provider symbols/tags and request scope are transport metadata;
 * - symbols/tags are serialized explicitly because canonical metadata is scalar;
 * - provider sentiment is deliberately not consumed;
 * - article completeness and independent editorial corroboration are not inferred.
 *
 * TEMPORAL PROVENANCE
 * - fetched_at is observed after receiving/decoding the complete response body;
 * - acquisition created_at is observed after validating/mapping the provider page;
 * - neither timestamp is copied from runtime input.created_at or provider date;
 * - acquisition created_at must not precede fetched_at;
 * - provider date is transported unchanged when valid;
 * - absent/null date becomes explicit UNAVAILABLE evidence with a precise reason;
 * - present malformed date rejects the page; it never becomes UNAVAILABLE;
 * - no publication age, 24H/7D classification or future-date repair occurs here.
 *
 * OWNERSHIP
 * - canonical acquisition core owns document_id, content_hash, validation_state
 *   and rejection_reasons; this source does not manufacture these fields;
 * - provider schema validation is distinct from canonical document validation;
 * - empty string content remains observable and reaches canonical validation;
 * - metadata is not an analytical score, policy, trace or VLR entry;
 * - no source policy is inferred from current-run observations;
 * - no MCI, Market, calibration, ranking or public transformation logic.
 *
 * OPERATIONAL SAFETY
 * - fixed HTTPS endpoint; no URL comes from the user query;
 * - no article link is fetched;
 * - redirects, cookies and implicit HTTP caching are disabled in request options;
 * - injected fetch must honor those options and AbortSignal;
 * - explicit timeout covers fetch and body consumption;
 * - response size is limited while reading, before JSON parsing;
 * - errors retain safe codes/status/index, never credentials or response bodies;
 * - raw transport exceptions are sanitized here, not converted into empty data;
 * - adapters above this source must propagate these errors, not suppress them;
 * - no environment access, persistence, logging or mutable module-level state.
 *
 * CONTRACT / MIGRATION
 * - local configuration is a provider-specific execution contract, not a new
 *   canonical Search policy or analytical contract;
 * - no import of runtime orchestration as a value;
 * - callers must keep this module and credentials on the server;
 * - commercial/data-redistribution authorization remains an upstream concern.
 *
 * REFERENCES
 * https://eodhd.com/financial-apis/stock-market-financial-news-api
 * https://fetch.spec.whatwg.org/
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import type {
  SearchFinancialNewsAcquisitionInput,
  SearchFinancialNewsAcquisitionSourcePort,
} from "./search-financial-news-acquisition-adapter";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_SOURCE_MODULE_NAME =
  "xyvala-search-financial-news-eodhd-acquisition-source" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_SOURCE_MODULE_VERSION:
  SearchModuleVersion = "1.0.0";

export const XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_METHOD =
  "EODHD_NEWS_EXPLICIT_SYMBOL_SINGLE_PAGE_V1" as const;

const EODHD_NEWS_ENDPOINT = "https://eodhd.com/api/news";
const EODHD_MAXIMUM_PAGE_LIMIT = 1000;
const MAXIMUM_TIMER_DELAY_MS = 2_147_483_647;

/* ============================================================================
 * 2. EXPLICIT PROVIDER CONFIGURATION / DEPENDENCIES
 * ========================================================================== */

export interface SearchFinancialNewsEodhdAcquisitionSourceConfiguration {
  readonly api_token: string;
  readonly symbol: string;
  readonly limit: number;
  readonly offset: number;

  /** YYYY-MM-DD or explicit null: no date is inferred from the runtime clock. */
  readonly from_date: string | null;
  readonly to_date: string | null;

  /** Actual representation of the provider's content string, not HTTP JSON. */
  readonly content_mime_type: "text/plain" | "text/html";

  readonly request_timeout_ms: number;
  readonly maximum_response_bytes: number;
}

export interface SearchFinancialNewsEodhdAcquisitionSourceDependencies {
  readonly configuration:
    SearchFinancialNewsEodhdAcquisitionSourceConfiguration;

  /** Native-compatible server fetch or an explicitly authorized test transport. */
  readonly fetch: typeof globalThis.fetch;

  /** Acquisition observation clock; never a fallback to runtime created_at. */
  readonly read_timestamp:
    () => SearchFinancialNewsAcquisitionInput["fetched_at"];
}

/* ============================================================================
 * 3. SAFE OPERATIONAL ERRORS - NOT ANALYTICAL AVAILABILITY
 * ========================================================================== */

export type SearchFinancialNewsEodhdAcquisitionErrorCode =
  | "INVALID_CONFIGURATION"
  | "INVALID_RUNTIME_INPUT"
  | "TRANSPORT_FAILURE"
  | "REQUEST_TIMEOUT"
  | "HTTP_FAILURE"
  | "UNEXPECTED_CONTENT_TYPE"
  | "RESPONSE_TOO_LARGE"
  | "INVALID_RESPONSE_ENCODING"
  | "INVALID_JSON"
  | "INVALID_PROVIDER_PAYLOAD"
  | "INVALID_PROVIDER_ITEM"
  | "CLOCK_FAILURE"
  | "CLOCK_REGRESSION";

export class SearchFinancialNewsEodhdAcquisitionError extends Error {
  readonly code: SearchFinancialNewsEodhdAcquisitionErrorCode;
  readonly field: string | null;
  readonly http_status: number | null;
  readonly item_index: number | null;

  constructor(
    code: SearchFinancialNewsEodhdAcquisitionErrorCode,
    field: string | null = null,
    httpStatus: number | null = null,
    itemIndex: number | null = null,
  ) {
    super(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_SOURCE_MODULE_NAME}] ` +
        `${code}; field=${field ?? "none"}; ` +
        `http_status=${httpStatus ?? "none"}; item_index=${itemIndex ?? "none"}.`,
    );
    this.name = "SearchFinancialNewsEodhdAcquisitionError";
    this.code = code;
    this.field = field;
    this.http_status = httpStatus;
    this.item_index = itemIndex;
  }
}

/* ============================================================================
 * 4. PROVIDER-SHAPE / TEMPORAL HELPERS
 * ========================================================================== */

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAsciiControl(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

function isIntegerWithin(value: unknown, minimum: number, maximum: number):
  value is number {
  return typeof value === "number" && Number.isSafeInteger(value) &&
    value >= minimum && value <= maximum;
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maximumDay = month === 2 ? (leap ? 29 : 28) :
    ([4, 6, 9, 11].includes(month) ? 30 : 31);
  return day <= maximumDay;
}

/** Explicit timezone required. Date.parse validates a supplied value, not now. */
function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const syntax =
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
  return syntax.test(value) && isCalendarDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value));
}

function validateConfiguration(
  value: SearchFinancialNewsEodhdAcquisitionSourceConfiguration,
): void {
  const invalid = (field: string): never => {
    throw new SearchFinancialNewsEodhdAcquisitionError(
      "INVALID_CONFIGURATION", field,
    );
  };

  if (!isRecord(value)) invalid("configuration");
  if (!isNonEmptyString(value.api_token) || /\s/.test(value.api_token) ||
      hasAsciiControl(value.api_token)) {
    invalid("api_token");
  }
  // Exactly one explicit symbol; no silent trimming, uppercasing or splitting.
  if (!isNonEmptyString(value.symbol) || /[\s,]/.test(value.symbol) ||
      hasAsciiControl(value.symbol)) {
    invalid("symbol");
  }
  if (!isIntegerWithin(value.limit, 1, EODHD_MAXIMUM_PAGE_LIMIT)) invalid("limit");
  if (!isIntegerWithin(value.offset, 0, Number.MAX_SAFE_INTEGER)) invalid("offset");
  if (value.from_date !== null && !isCalendarDate(value.from_date)) {
    invalid("from_date");
  }
  if (value.to_date !== null && !isCalendarDate(value.to_date)) invalid("to_date");
  if (value.from_date !== null && value.to_date !== null &&
      value.from_date > value.to_date) invalid("date_range");
  if (value.content_mime_type !== "text/plain" &&
      value.content_mime_type !== "text/html") invalid("content_mime_type");
  if (!isIntegerWithin(value.request_timeout_ms, 1, MAXIMUM_TIMER_DELAY_MS)) {
    invalid("request_timeout_ms");
  }
  if (!isIntegerWithin(value.maximum_response_bytes, 1, Number.MAX_SAFE_INTEGER)) {
    invalid("maximum_response_bytes");
  }
}

function validateRuntimeInput(
  input: Parameters<SearchFinancialNewsAcquisitionSourcePort>[0],
): void {
  if (!isRecord(input) || !isRecord(input.query) ||
      !isNonEmptyString(input.query.query_id) ||
      !isNonEmptyString(input.query.raw_query) || !isTimestamp(input.created_at)) {
    throw new SearchFinancialNewsEodhdAcquisitionError("INVALID_RUNTIME_INPUT");
  }
  // Query identity, policy semantics and canonical validation remain upstream.
  // In particular, input.created_at is never used as an acquisition observation.
}

/* ============================================================================
 * 5. FIXED-ENDPOINT REQUEST - NEVER LOG THE RETURNED URL
 * ========================================================================== */

function buildRequestUrl(
  configuration: SearchFinancialNewsEodhdAcquisitionSourceConfiguration,
): string {
  const url = new URL(EODHD_NEWS_ENDPOINT);
  url.searchParams.set("api_token", configuration.api_token);
  url.searchParams.set("s", configuration.symbol);
  url.searchParams.set("limit", String(configuration.limit));
  url.searchParams.set("offset", String(configuration.offset));
  url.searchParams.set("fmt", "json");
  if (configuration.from_date !== null) {
    url.searchParams.set("from", configuration.from_date);
  }
  if (configuration.to_date !== null) {
    url.searchParams.set("to", configuration.to_date);
  }
  return url.href;
}

/* ============================================================================
 * 6. BOUNDED BODY READING / TRANSPORT
 * ========================================================================== */

function discardResponseBody(response: Response): void {
  // Cleanup only. Its failure must never replace the primary operational error.
  if (response.body !== null) {
    void response.body.cancel().catch(() => undefined);
  }
}

async function readBoundedBody(
  response: Response,
  maximumBytes: number,
  signal: AbortSignal,
): Promise<string> {
  if (response.body === null) {
    throw new SearchFinancialNewsEodhdAcquisitionError("INVALID_JSON", "body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parts: string[] = [];
  let receivedBytes = 0;
  let completed = false;
  const cancel = (): void => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });

  try {
    for (;;) {
      if (signal.aborted) {
        throw new SearchFinancialNewsEodhdAcquisitionError("REQUEST_TIMEOUT");
      }
      const chunk = await reader.read();
      if (signal.aborted) {
        throw new SearchFinancialNewsEodhdAcquisitionError("REQUEST_TIMEOUT");
      }
      if (chunk.done) break;
      if (chunk.value.byteLength > maximumBytes - receivedBytes) {
        throw new SearchFinancialNewsEodhdAcquisitionError("RESPONSE_TOO_LARGE");
      }
      receivedBytes += chunk.value.byteLength;
      try {
        parts.push(decoder.decode(chunk.value, { stream: true }));
      } catch {
        throw new SearchFinancialNewsEodhdAcquisitionError("INVALID_RESPONSE_ENCODING");
      }
    }
    try {
      parts.push(decoder.decode());
    } catch {
      throw new SearchFinancialNewsEodhdAcquisitionError("INVALID_RESPONSE_ENCODING");
    }
    completed = true;
    return parts.join("");
  } finally {
    signal.removeEventListener("abort", cancel);
    if (!completed) cancel();
    reader.releaseLock();
  }
}

async function retrieveProviderBody(
  configuration: SearchFinancialNewsEodhdAcquisitionSourceConfiguration,
  fetchTransport: SearchFinancialNewsEodhdAcquisitionSourceDependencies["fetch"],
): Promise<string> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new SearchFinancialNewsEodhdAcquisitionError("REQUEST_TIMEOUT"));
      controller.abort();
    }, configuration.request_timeout_ms);
  });

  const operation = async (): Promise<string> => {
    try {
      const response = await fetchTransport(buildRequestUrl(configuration), {
        method: "GET",
        headers: { Accept: "application/json" },
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        discardResponseBody(response);
        throw new SearchFinancialNewsEodhdAcquisitionError("REQUEST_TIMEOUT");
      }
      if (response.redirected || response.status !== 200) {
        discardResponseBody(response);
        throw new SearchFinancialNewsEodhdAcquisitionError(
          "HTTP_FAILURE", null, response.status,
        );
      }
      const mediaType = (response.headers.get("content-type") ?? "")
        .split(";")[0]?.trim().toLowerCase();
      if (mediaType !== "application/json" &&
          !/^application\/[a-z0-9!#$&^_.+-]+\+json$/.test(mediaType ?? "")) {
        discardResponseBody(response);
        throw new SearchFinancialNewsEodhdAcquisitionError("UNEXPECTED_CONTENT_TYPE");
      }
      return await readBoundedBody(
        response, configuration.maximum_response_bytes, controller.signal,
      );
    } catch (error: unknown) {
      if (error instanceof SearchFinancialNewsEodhdAcquisitionError) throw error;
      // Do not expose an injected/native error that may contain api_token/URL.
      throw new SearchFinancialNewsEodhdAcquisitionError(
        controller.signal.aborted ? "REQUEST_TIMEOUT" : "TRANSPORT_FAILURE",
      );
    }
  };

  try {
    return await Promise.race([operation(), timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  }
}

/* ============================================================================
 * 7. PROVIDER PAGE MAPPING
 * ========================================================================== */

type PublicationEvidence =
  SearchFinancialNewsAcquisitionInput["source_published_at"];

type SourceMetadata = NonNullable<
  SearchFinancialNewsAcquisitionInput["source_metadata"]
>;

interface MappedProviderArticle {
  readonly source_uri: string;
  readonly raw_content: string;
  readonly source_published_at: PublicationEvidence;
  readonly source_metadata: SourceMetadata;
}

function invalidItem(field: string, index: number): never {
  throw new SearchFinancialNewsEodhdAcquisitionError(
    "INVALID_PROVIDER_ITEM", field, null, index,
  );
}

function readProviderString(
  article: Record<string, unknown>, field: string, index: number,
): string {
  const value = article[field];
  if (typeof value !== "string") return invalidItem(field, index);
  return value;
}

function serializeProviderStringArray(
  value: unknown, field: string, index: number,
): string | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return invalidItem(field, index);
  for (const entry of value) {
    if (typeof entry !== "string") return invalidItem(field, index);
  }
  // Exact order/content retained; absent field is NOT serialized as [].
  return JSON.stringify(value);
}

function mapPublicationEvidence(value: unknown, index: number): PublicationEvidence {
  if (value === undefined || value === null) {
    return Object.freeze({
      availability_state: "UNAVAILABLE",
      reason: value === null ? "eodhd_date_is_null" : "eodhd_date_is_missing",
    } satisfies PublicationEvidence);
  }
  if (!isTimestamp(value)) return invalidItem("date", index);
  return Object.freeze({
    availability_state: "AVAILABLE",
    value,
  } satisfies PublicationEvidence);
}

function mapProviderPage(
  body: string,
  configuration: SearchFinancialNewsEodhdAcquisitionSourceConfiguration,
): readonly MappedProviderArticle[] {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new SearchFinancialNewsEodhdAcquisitionError("INVALID_JSON");
  }
  if (!Array.isArray(payload) || payload.length > configuration.limit) {
    throw new SearchFinancialNewsEodhdAcquisitionError("INVALID_PROVIDER_PAYLOAD");
  }

  return Object.freeze(payload.map((item: unknown, index: number): MappedProviderArticle => {
    if (!isRecord(item)) return invalidItem("item", index);
    const content = readProviderString(item, "content", index);
    const title = readProviderString(item, "title", index);
    const link = readProviderString(item, "link", index);
    let articleUrl: URL;
    try {
      articleUrl = new URL(link);
    } catch {
      return invalidItem("link", index);
    }
    if ((articleUrl.protocol !== "https:" && articleUrl.protocol !== "http:") ||
        !articleUrl.hostname || articleUrl.username || articleUrl.password ||
        link.trim() !== link) return invalidItem("link", index);

    const publication = mapPublicationEvidence(item.date, index);
    const symbols = serializeProviderStringArray(item.symbols, "symbols", index);
    const tags = serializeProviderStringArray(item.tags, "tags", index);

    const metadata: Record<string, string | number | boolean> = {
      title,
      provider: "EODHD",
      provider_endpoint: EODHD_NEWS_ENDPOINT,
      provider_content_field: "content",
      provider_content_completeness: "UNVERIFIED",
      provider_publication_field: "date",
      provider_sentiment_consumed: false,
      acquisition_scope: "EXPLICIT_CONFIGURED_SYMBOL",
      requested_symbol: configuration.symbol,
      requested_limit: configuration.limit,
      requested_offset: configuration.offset,
      provider_page_item_count: payload.length,
      provider_page_item_index: index,
      pagination_mode: "SINGLE_PAGE",
      corpus_completeness: "NOT_ASSERTED",
      article_link_host: articleUrl.hostname,
    };
    if (configuration.from_date !== null) metadata.requested_from_date = configuration.from_date;
    if (configuration.to_date !== null) metadata.requested_to_date = configuration.to_date;
    if (typeof item.date === "string") metadata.provider_date_raw = item.date;
    if (symbols !== undefined) metadata.provider_symbols_json = symbols;
    if (tags !== undefined) metadata.provider_tags_json = tags;

    return Object.freeze({
      source_uri: link,
      raw_content: content,
      source_published_at: publication,
      source_metadata: Object.freeze(metadata),
    });
  }));
}

/* ============================================================================
 * 8. OBSERVATION CLOCK - NO RUNTIME TIMESTAMP SUBSTITUTION
 * ========================================================================== */

function observeTimestamp(
  readTimestamp: SearchFinancialNewsEodhdAcquisitionSourceDependencies["read_timestamp"],
  field: "fetched_at" | "created_at",
): SearchFinancialNewsAcquisitionInput["fetched_at"] {
  let value: unknown;
  try {
    value = readTimestamp();
  } catch {
    throw new SearchFinancialNewsEodhdAcquisitionError("CLOCK_FAILURE", field);
  }
  if (!isTimestamp(value)) {
    throw new SearchFinancialNewsEodhdAcquisitionError("CLOCK_FAILURE", field);
  }
  return value;
}

/* ============================================================================
 * 9. CANONICAL SOURCE FACTORY
 * ========================================================================== */

export function createSearchFinancialNewsEodhdAcquisitionSource(
  dependencies: SearchFinancialNewsEodhdAcquisitionSourceDependencies,
): SearchFinancialNewsAcquisitionSourcePort {
  if (!isRecord(dependencies) || typeof dependencies.fetch !== "function" ||
      typeof dependencies.read_timestamp !== "function") {
    throw new SearchFinancialNewsEodhdAcquisitionError(
      "INVALID_CONFIGURATION", "dependencies",
    );
  }
  validateConfiguration(dependencies.configuration);

  // Snapshot primitive configuration only. No caller-owned object is frozen.
  const configuration = Object.freeze({
    api_token: dependencies.configuration.api_token,
    symbol: dependencies.configuration.symbol,
    limit: dependencies.configuration.limit,
    offset: dependencies.configuration.offset,
    from_date: dependencies.configuration.from_date,
    to_date: dependencies.configuration.to_date,
    content_mime_type: dependencies.configuration.content_mime_type,
    request_timeout_ms: dependencies.configuration.request_timeout_ms,
    maximum_response_bytes: dependencies.configuration.maximum_response_bytes,
  } satisfies SearchFinancialNewsEodhdAcquisitionSourceConfiguration);
  const fetchTransport = dependencies.fetch;
  const readTimestamp = dependencies.read_timestamp;

  const source: SearchFinancialNewsAcquisitionSourcePort = async (input) => {
    validateRuntimeInput(input);
    const body = await retrieveProviderBody(configuration, fetchTransport);
    const fetchedAt = observeTimestamp(readTimestamp, "fetched_at");
    const articles = mapProviderPage(body, configuration);
    const createdAt = observeTimestamp(readTimestamp, "created_at");

    if (Date.parse(createdAt) < Date.parse(fetchedAt)) {
      throw new SearchFinancialNewsEodhdAcquisitionError("CLOCK_REGRESSION", "created_at");
    }

    // No filtering/sorting/deduplication. An invalid page never becomes [].
    return Object.freeze(articles.map((article): SearchFinancialNewsAcquisitionInput =>
      Object.freeze({
        source_uri: article.source_uri,
        source_type: "ARTICLE",
        mime_type: configuration.content_mime_type,
        raw_content: article.raw_content,
        fetched_at: fetchedAt,
        source_published_at: article.source_published_at,
        created_at: createdAt,
        acquisition_method: XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_METHOD,
        acquisition_module_version:
          XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_SOURCE_MODULE_VERSION,
        source_metadata: article.source_metadata,
      } satisfies SearchFinancialNewsAcquisitionInput),
    ));
  };

  return source;
}

/* ============================================================================
 * 10. STATIC OWNERSHIP / GOVERNANCE - DESCRIPTIVE, NOT A VALIDATION REPORT
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_SOURCE_OWNERSHIP =
  Object.freeze({
    module: XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_SOURCE_MODULE_NAME,
    module_version: XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_SOURCE_MODULE_VERSION,
    domain: "FINANCIAL_NEWS",
    provider: "EODHD",
    architectural_role: "EXTERNAL_ACQUISITION_SOURCE",
    canonical_output: "SearchFinancialNewsAcquisitionInput[]",
    canonical_raw_document_owner: "SEARCH_ACQUISITION_CORE",
    scope_selection_owner: "AUTHORIZED_CALLER",
    timestamp_source: "EXPLICIT_INJECTED_ACQUISITION_CLOCK",
    provider_schema_validation_owned_here: true,
    acquisition_observation_mapping_owned_here: true,
    canonical_document_validation_owned_here: false,
    factory_performs_io: false,
    source_invocation_performs_io: true,
    live_io_deterministic: false,
    identical_observation_mapping_deterministic: true,
  } as const);

export const XYVALA_SEARCH_FINANCIAL_NEWS_EODHD_ACQUISITION_SOURCE_GOVERNANCE =
  Object.freeze({
    explicit_symbol_required: true,
    implicit_demo_token_allowed: false,
    implicit_symbol_allowed: false,
    query_to_symbol_inference_allowed: false,
    automatic_pagination_allowed: false,
    automatic_retry_allowed: false,
    provider_failure_as_empty_result_allowed: false,
    partial_page_return_allowed: false,
    silent_result_filtering_allowed: false,
    duplicate_resolution_allowed: false,
    content_rewriting_allowed: false,
    full_article_claim_allowed: false,
    provider_sentiment_as_search_score_allowed: false,
    runtime_timestamp_as_fetched_at_allowed: false,
    runtime_timestamp_as_acquisition_created_at_allowed: false,
    fetched_at_as_publication_timestamp_allowed: false,
    source_publication_age_calculation_allowed: false,
    canonical_document_identity_creation_allowed: false,
    analytical_calculation_allowed: false,
    calibration_allowed: false,
    mci_logic_allowed: false,
    environment_access_allowed: false,
    credential_logging_allowed: false,
    persistence_allowed: false,
    mutable_global_state_allowed: false,
  } as const);
