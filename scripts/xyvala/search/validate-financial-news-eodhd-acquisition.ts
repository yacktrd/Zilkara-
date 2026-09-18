/* ============================================================================
 * FILE: scripts/xyvala/search/validate-financial-news-eodhd-acquisition.ts
 * ----------------------------------------------------------------------------
 * PRIVATE ACQUISITION INTEGRATION CHECK — NOT A SEARCH RUNTIME MODULE
 *
 * Chain under test:
 * EODHD source -> Financial News adapter -> Acquisition core -> RawDocument[]
 * The existing acquisition provider boundary is also exercised.
 *
 * --offline   : simulated transports only, zero real network requests.
 * --live-demo : offline checks, then ONE real EODHD demo request for AAPL.US.
 *
 * Explicit test-only configuration. No environment or credential file is read.
 * No production policy, source, adapter, core or orchestrator is modified.
 *
 * The SearchQuery below is a PRIVATE_TEST / UNVALIDATED fixture. Its identifier
 * and version label are test data, NOT canonical query-production claims.
 * It is passed only to the acquisition boundary; no orchestrator is executed.
 *
 * Replay reuses the exact captured acquisition observations and timestamps.
 * Direct core invocation is a test oracle, never downstream reconstruction in
 * production. No alternative hash or document identity algorithm is implemented.
 *
 * A live empty page is INCONCLUSIVE, never SUCCESS for document production.
 * Upstream failure remains FAILURE, never an empty successful page.
 *
 * Console output contains control results and limited technical summaries only.
 * No token, request URL, article body or uncontrolled exception is printed.
 * Clock access is owned by this external test harness, not by analytical cores.
 * No article or observation is persisted.
 * ========================================================================== */

import { isDeepStrictEqual } from "node:util";

import type {
  SearchQuery,
  SearchRawDocument,
} from "../../../lib/xyvala/search/contracts/search-pipeline-contract";

import {
  buildSearchRawDocument,
} from "../../../lib/xyvala/search/acquisition/search-acquisition-core";

import {
  createSearchFinancialNewsAcquisitionAdapter,
  type SearchFinancialNewsAcquisitionInput,
  type SearchFinancialNewsAcquisitionSourcePort,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-acquisition-adapter";

import {
  buildSearchFinancialNewsAcquisitionPort,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-acquisition-provider";

import {
  createSearchFinancialNewsEodhdAcquisitionSource,
  SearchFinancialNewsEodhdAcquisitionError,
  type SearchFinancialNewsEodhdAcquisitionErrorCode,
  type SearchFinancialNewsEodhdAcquisitionSourceConfiguration,
  type SearchFinancialNewsEodhdAcquisitionSourceDependencies,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-eodhd-acquisition-source";

/* ============================================================================
 * 1. TEST-ONLY TYPES AND FIXTURES
 * ========================================================================== */

type AcquisitionRuntimeInput =
  Parameters<SearchFinancialNewsAcquisitionSourcePort>[0];

type ObservationBatch = readonly SearchFinancialNewsAcquisitionInput[];

type TestMode = "--offline" | "--live-demo";

type Check = (condition: boolean, name: string) => void;

interface DocumentSummary {
  readonly index: number;
  readonly document_id: string;
  readonly content_hash: string;
  readonly validation_state: string;
  readonly acquisition_contract_version: string;
  readonly publication_availability: string;
  readonly fetched_at: string;
  readonly acquisition_created_at: string;
  readonly source_host: string;
  readonly received_content_length: number;
  readonly received_content_length_unit: "characters" | "bytes";
}

class ValidationFailure extends Error {
  constructor(readonly check_name: string) {
    super(check_name);
    this.name = "ValidationFailure";
  }
}

const TEST_CONFIGURATION = Object.freeze({
  api_token: "demo",
  symbol: "AAPL.US",
  limit: 2,
  offset: 0,
  from_date: null,
  to_date: null,
  content_mime_type: "text/plain",
  request_timeout_ms: 30_000,
  maximum_response_bytes: 1_000_000,
} satisfies SearchFinancialNewsEodhdAcquisitionSourceConfiguration);

const FIXED_FETCHED_AT = "2025-01-02T12:00:01.000Z";

const FIXED_CREATED_AT = "2025-01-02T12:00:02.000Z";

const PROVIDER_FIXTURE = Object.freeze({
  title: "Private acquisition integration fixture",
  content: "  Private test content. No investment claim.\nSecond paragraph.  ",
  date: "2025-01-02T11:00:00+00:00",
  link: "https://example.invalid/xyvala-acquisition-fixture",
  symbols: Object.freeze(["AAPL.US"]),
  tags: Object.freeze(["private-test"]),
});

function buildQueryFixture(createdAt: string): AcquisitionRuntimeInput {
  const query = Object.freeze({
    contract_version: "PRIVATE_TEST_FIXTURE_V1",
    query_id: "xyvala-private-test-eodhd-acquisition",
    created_at: createdAt,
    raw_query: "AAPL.US",
    requested_source_types: Object.freeze(["ARTICLE"] as const),
    query_origin: "PRIVATE_TEST",
    validation_state: "UNVALIDATED",
    rejection_reasons: Object.freeze([]),
  } satisfies SearchQuery);

  return Object.freeze({
    query,
    created_at: createdAt,
  });
}

function fixedObservationClock():
  SearchFinancialNewsEodhdAcquisitionSourceDependencies["read_timestamp"] {
  const timestamps = [FIXED_FETCHED_AT, FIXED_CREATED_AT];

  let index = 0;

  return () => {
    const timestamp = timestamps[index];

    if (timestamp === undefined) {
      throw new ValidationFailure("unexpected_additional_clock_read");
    }

    index += 1;

    return timestamp;
  };
}

function responseTransport(
  body: string,
  status = 200,
): typeof globalThis.fetch {
  return async () => new Response(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function createBoundAdapter(
  source: SearchFinancialNewsAcquisitionSourcePort,
) {
  const adapter = createSearchFinancialNewsAcquisitionAdapter({
    authorized_source: source,
  });

  const port = buildSearchFinancialNewsAcquisitionPort({
    authorized_acquisition_source: adapter,
  });

  if (port !== adapter) {
    throw new ValidationFailure(
      "provider_must_preserve_adapter_reference",
    );
  }

  return port;
}

/* ============================================================================
 * 2. CANONICAL OUTPUT CHECKS — NO ALTERNATIVE PRODUCER
 * ========================================================================== */

function contentLength(content: unknown): {
  readonly length: number;
  readonly unit: "characters" | "bytes";
} {
  if (typeof content === "string") {
    return {
      length: content.length,
      unit: "characters",
    };
  }

  if (content instanceof Uint8Array) {
    return {
      length: content.byteLength,
      unit: "bytes",
    };
  }

  throw new ValidationFailure(
    "unsupported_acquisition_content_representation",
  );
}

function inspectCanonicalBatch(
  observations: ObservationBatch,
  documents: readonly SearchRawDocument[],
  summaries: DocumentSummary[],
  check: Check,
): void {
  check(
    documents.length === observations.length,
    "batch_cardinality_preserved",
  );

  const identities = new Set<string>();

  for (const [index, observation] of observations.entries()) {
    const document = documents[index];

    if (document === undefined) {
      throw new ValidationFailure(`document_${index}_missing`);
    }

    const contentSummary = contentLength(observation.raw_content);

    summaries.push({
      index,
      document_id: document.document_id,
      content_hash: document.content_hash,
      validation_state: document.validation_state,
      acquisition_contract_version: document.contract_version,
      publication_availability:
        document.source_published_at.availability_state,
      fetched_at: document.fetched_at,
      acquisition_created_at: document.created_at,
      source_host: new URL(observation.source_uri).hostname,
      received_content_length: contentSummary.length,
      received_content_length_unit: contentSummary.unit,
    });

    // Compare with the existing canonical producer, not a reconstructed result.
    const directCoreOutput = buildSearchRawDocument(observation);

    check(
      isDeepStrictEqual(document, directCoreOutput),
      `document_${index}_matches_core`,
    );

    check(
      document.validation_state === "VALID" ||
        document.validation_state === "DEGRADED",
      `document_${index}_accepted_by_core`,
    );

    check(
      typeof document.document_id === "string" &&
        document.document_id.length > 0,
      `document_${index}_identity_present`,
    );

    check(
      typeof document.content_hash === "string" &&
        document.content_hash.length > 0,
      `document_${index}_hash_present`,
    );

    check(
      document.source_uri === observation.source_uri &&
        document.source_type === observation.source_type,
      `document_${index}_source_preserved`,
    );

    check(
      document.fetched_at === observation.fetched_at &&
        document.created_at === observation.created_at,
      `document_${index}_timestamps_preserved`,
    );

    check(
      isDeepStrictEqual(
        document.source_published_at,
        observation.source_published_at,
      ),
      `document_${index}_publication_preserved`,
    );

    check(
      Date.parse(observation.created_at) >=
        Date.parse(observation.fetched_at),
      `document_${index}_acquisition_causality`,
    );

    // Duplicate identities are a runtime incompatibility, not something to repair.
    check(
      !identities.has(document.document_id),
      `document_${index}_unique_identity`,
    );

    identities.add(document.document_id);
  }
}

async function verifyReplay(
  observations: ObservationBatch,
  firstDocuments: readonly SearchRawDocument[],
  input: AcquisitionRuntimeInput,
  check: Check,
): Promise<void> {
  const beforeReplay = structuredClone(observations);

  let replayCalls = 0;

  const replaySource: SearchFinancialNewsAcquisitionSourcePort = (received) => {
    check(
      received === input,
      "replay_runtime_input_reference_preserved",
    );

    replayCalls += 1;

    return observations;
  };

  const secondDocuments = await createBoundAdapter(replaySource)(input);

  check(
    replayCalls === 1,
    "replay_source_called_once",
  );

  check(
    isDeepStrictEqual(secondDocuments, firstDocuments),
    "identical_observation_replay",
  );

  check(
    isDeepStrictEqual(observations, beforeReplay),
    "replay_does_not_mutate_observations",
  );
}

/* ============================================================================
 * 3. SIMULATED ERROR PROPAGATION
 * ========================================================================== */

async function expectSourceError(
  transport: typeof globalThis.fetch,
  expectedCode: SearchFinancialNewsEodhdAcquisitionErrorCode,
  input: AcquisitionRuntimeInput,
  check: Check,
): Promise<void> {
  const errorsAtSource: unknown[] = [];

  let clockCalls = 0;
  let transportCalls = 0;

  const countedTransport: typeof globalThis.fetch = (request, options) => {
    transportCalls += 1;

    return transport(request, options);
  };

  const source = createSearchFinancialNewsEodhdAcquisitionSource({
    configuration: TEST_CONFIGURATION,
    fetch: countedTransport,
    read_timestamp: () => {
      clockCalls += 1;

      return FIXED_FETCHED_AT;
    },
  });

  const recordingSource: SearchFinancialNewsAcquisitionSourcePort =
    async (received) => {
      try {
        return await source(received);
      } catch (error: unknown) {
        errorsAtSource.push(error);

        throw error;
      }
    };

  let rejected = false;

  try {
    await createBoundAdapter(recordingSource)(input);
  } catch (error: unknown) {
    rejected = true;

    if (!(error instanceof SearchFinancialNewsEodhdAcquisitionError)) {
      throw new ValidationFailure(`expected_${expectedCode}`);
    }

    check(
      error.code === expectedCode,
      `${expectedCode}_is_not_empty_success`,
    );

    check(
      errorsAtSource.length === 1 && errorsAtSource[0] === error,
      `${expectedCode}_error_identity_preserved`,
    );

    check(
      !error.message.includes("PRIVATE_TRANSPORT_ERROR_DETAIL"),
      `${expectedCode}_transport_detail_not_exposed`,
    );
  }

  check(
    rejected,
    `${expectedCode}_must_reject`,
  );

  check(
    transportCalls === 1,
    `${expectedCode}_no_retry`,
  );

  if (
    expectedCode === "HTTP_FAILURE" ||
    expectedCode === "TRANSPORT_FAILURE"
  ) {
    check(
      clockCalls === 0,
      `${expectedCode}_no_false_acquisition_timestamp`,
    );
  }
}

/* ============================================================================
 * 4. OFFLINE INTEGRATION CONTROLS
 * ========================================================================== */

async function runOfflineChecks(check: Check): Promise<void> {
  const input = buildQueryFixture("2025-01-02T12:00:00.000Z");

  let transportCalls = 0;
  let clockCalls = 0;

  const clock = fixedObservationClock();

  const transport: typeof globalThis.fetch = async () => {
    transportCalls += 1;

    return new Response(JSON.stringify([PROVIDER_FIXTURE]), {
      headers: {
        "content-type": "application/json",
      },
    });
  };

  const source = createSearchFinancialNewsEodhdAcquisitionSource({
    configuration: TEST_CONFIGURATION,
    fetch: transport,
    read_timestamp: () => {
      clockCalls += 1;

      return clock();
    },
  });

  check(
    transportCalls === 0 && clockCalls === 0,
    "factory_performs_no_io",
  );

  const observations = await source(input);
  const observation = observations[0];

  if (observation === undefined) {
    throw new ValidationFailure("offline_observation_missing");
  }

  check(
    observations.length === 1,
    "offline_source_cardinality",
  );

  check(
    observation.raw_content === PROVIDER_FIXTURE.content,
    "source_preserves_content_including_whitespace",
  );

  check(
    observation.fetched_at === FIXED_FETCHED_AT &&
      observation.created_at === FIXED_CREATED_AT,
    "source_uses_injected_observation_clock",
  );

  check(
    observation.source_published_at.availability_state === "AVAILABLE" &&
      observation.source_published_at.value === PROVIDER_FIXTURE.date,
    "source_does_not_rewrite_publication_timestamp",
  );

  const baseline = structuredClone(observations);

  const documents = await createBoundAdapter(() => observations)(input);

  inspectCanonicalBatch(
    observations,
    documents,
    [],
    check,
  );

  await verifyReplay(
    observations,
    documents,
    input,
    check,
  );

  check(
    isDeepStrictEqual(observations, baseline),
    "adapter_and_core_do_not_mutate_input",
  );

  check(
    transportCalls === 1 && clockCalls === 2,
    "offline_replay_has_no_io",
  );

  const emptySource = createSearchFinancialNewsEodhdAcquisitionSource({
    configuration: TEST_CONFIGURATION,
    fetch: responseTransport("[]"),
    read_timestamp: fixedObservationClock(),
  });

  const emptyDocuments = await createBoundAdapter(emptySource)(input);

  check(
    emptyDocuments.length === 0,
    "successful_empty_array_remains_empty",
  );

  await expectSourceError(
    responseTransport("{}", 429),
    "HTTP_FAILURE",
    input,
    check,
  );

  await expectSourceError(
    responseTransport("not-json"),
    "INVALID_JSON",
    input,
    check,
  );

  await expectSourceError(
    responseTransport('{"error":"fixture"}'),
    "INVALID_PROVIDER_PAYLOAD",
    input,
    check,
  );

  await expectSourceError(
    async () => {
      throw new Error("PRIVATE_TRANSPORT_ERROR_DETAIL");
    },
    "TRANSPORT_FAILURE",
    input,
    check,
  );
}

/* ============================================================================
 * 5. EXPLICIT PRIVATE CLI — ONE REAL REQUEST AT MOST
 * ========================================================================== */

async function main(): Promise<void> {
  const report: {
    contract: string;
    contract_version: string;
    status: "RUNNING" | "SUCCESS" | "INCONCLUSIVE" | "FAILURE";
    mode: TestMode | null;
    stage: string;
    real_http_calls: number;
    live_clock_reads: number;
    checks: string[];
    documents: DocumentSummary[];
    live_status: string;
    error: Readonly<Record<string, string | number | null>> | null;
  } = {
    contract: "xyvala-financial-news-eodhd-acquisition-validation",
    contract_version: "1.0.0",
    status: "RUNNING",
    mode: null,
    stage: "arguments",
    real_http_calls: 0,
    live_clock_reads: 0,
    checks: [],
    documents: [],
    live_status: "NOT_RUN",
    error: null,
  };

  const check: Check = (condition, name) => {
    if (!condition) {
      throw new ValidationFailure(name);
    }

    report.checks.push(`${report.stage}:${name}`);
  };

  try {
    const mode = process.argv[2];

    if (
      process.argv.length !== 3 ||
      (mode !== "--offline" && mode !== "--live-demo")
    ) {
      throw new ValidationFailure(
        "explicit_mode_required_offline_or_live_demo",
      );
    }

    report.mode = mode;
    report.stage = "offline_integration";

    await runOfflineChecks(check);

    if (mode === "--offline") {
      report.status = "SUCCESS";
      report.stage = "offline_completed";
    } else {
      report.stage = "live_acquisition";
      report.live_status = "RUNNING";

      const input = buildQueryFixture(new Date().toISOString());
      const originalInput = structuredClone(input);

      const nativeTransport: typeof globalThis.fetch = (request, options) => {
        report.real_http_calls += 1;

        if (report.real_http_calls > 1) {
          throw new ValidationFailure(
            "more_than_one_real_request_forbidden",
          );
        }

        return globalThis.fetch(request, options);
      };

      const source = createSearchFinancialNewsEodhdAcquisitionSource({
        configuration: TEST_CONFIGURATION,
        fetch: nativeTransport,
        read_timestamp: () => {
          report.live_clock_reads += 1;

          return new Date().toISOString();
        },
      });

      const captures: {
        readonly observations: ObservationBatch;
        readonly before_adapter: ObservationBatch;
      }[] = [];

      const recordingSource: SearchFinancialNewsAcquisitionSourcePort =
        async (received) => {
          check(
            received === input,
            "live_runtime_input_reference_preserved",
          );

          const observations = await source(received);

          captures.push({
            observations,
            before_adapter: structuredClone(observations),
          });

          report.stage = "live_adapter_and_core";

          return observations;
        };

      const port = createBoundAdapter(recordingSource);

      check(
        report.real_http_calls === 0 && report.live_clock_reads === 0,
        "live_factories_perform_no_io",
      );

      const documents = await port(input);
      const capture = captures[0];

      if (capture === undefined) {
        throw new ValidationFailure("live_capture_missing");
      }

      check(
        captures.length === 1 && report.real_http_calls === 1,
        "exactly_one_real_acquisition_call",
      );

      check(
        report.live_clock_reads === 2,
        "two_real_acquisition_clock_observations",
      );

      check(
        isDeepStrictEqual(input, originalInput),
        "live_runtime_input_unchanged",
      );

      check(
        isDeepStrictEqual(
          capture.observations,
          capture.before_adapter,
        ),
        "live_observations_unchanged_after_adapter",
      );

      if (capture.observations.length === 0) {
        check(
          documents.length === 0,
          "live_empty_page_is_not_fabricated_documents",
        );

        report.status = "INCONCLUSIVE";
        report.live_status =
          "EMPTY_PAGE_NO_DOCUMENT_PRODUCTION_VALIDATION";
        report.stage = "live_empty_page";

        process.exitCode = 2;
      } else {
        report.stage = "live_canonical_checks";

        inspectCanonicalBatch(
          capture.observations,
          documents,
          report.documents,
          check,
        );

        report.stage = "live_replay";

        await verifyReplay(
          capture.observations,
          documents,
          input,
          check,
        );

        check(
          report.real_http_calls === 1 &&
            report.live_clock_reads === 2,
          "live_replay_performs_no_additional_io",
        );

        check(
          isDeepStrictEqual(
            capture.observations,
            capture.before_adapter,
          ),
          "live_original_observations_unchanged_after_all_checks",
        );

        report.status = "SUCCESS";
        report.live_status =
          "NON_EMPTY_ACQUISITION_AND_REPLAY_PASSED";
        report.stage = "completed";
      }
    }
  } catch (error: unknown) {
    report.status = "FAILURE";

    if (report.live_status === "RUNNING") {
      report.live_status = "FAILURE";
    }

    report.error = error instanceof ValidationFailure
      ? {
          code: "CHECK_FAILED",
          check: error.check_name,
        }
      : error instanceof SearchFinancialNewsEodhdAcquisitionError
        ? {
            code: error.code,
            field: error.field,
            http_status: error.http_status,
            item_index: error.item_index,
          }
        : {
            code: "UNEXPECTED_ERROR_DETAILS_WITHHELD",
          };

    process.exitCode = 1;
  }

  console.log(JSON.stringify(report, null, 2));
}

void main();
