/* ============================================================================
 * FILE: scripts/xyvala/search/validate-financial-news-dataforseo-link-observation-source.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News DataForSEO Link observation-source validation
 *
 * ROLE
 * - validate the DataForSEO -> SearchInboundLinkObservation mapping offline
 * - exercise the real Financial News Link provider boundary
 * - feed mapped observations into the real canonical Link Signals producer
 * - verify missing boolean evidence remains unavailable instead of false
 * - verify provider failures remain failures instead of empty observations
 *
 * CLASSIFICATION
 * - PRIVATE TEST / VALIDATION SCRIPT
 * - OFFLINE
 * - SIMULATED DATAFORSEO TRANSPORT
 * - NO REAL NETWORK ACCESS
 * - NO CREDENTIAL FILE ACCESS
 * - NO PRODUCTION CONFIGURATION MUTATION
 *
 * TESTED CHAIN
 * ----------------------------------------------------------------------------
 *
 * simulated DataForSEO Backlinks Live response
 *        ↓
 * createSearchFinancialNewsDataForSeoLinkObservationSource(...)
 *        ↓
 * SearchInboundLinkObservation[]
 *        +
 * DATAFORSEO_BACKLINKS_LIVE
 *        ↓
 * buildSearchFinancialNewsLinkObservationProvider(...)
 *        ↓
 * buildSearchLinkSignals(...)
 *        ↓
 * canonical SearchLinkSignals
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This script does NOT:
 * - call the real DataForSEO API;
 * - read process.env;
 * - use real credentials;
 * - test billing;
 * - test DataForSEO account authorization;
 * - execute the complete Search runtime;
 * - generate execution trace or VLR truth.
 *
 * A successful report validates the local source mapping, failure semantics,
 * provider binding and Link Signals integration only.
 *
 * EXPECTED OBSERVATION SEMANTICS
 * ----------------------------------------------------------------------------
 * url_from
 * -> source_uri, exact provider string
 *
 * anchor string
 * -> anchor_text, exact provider string
 *
 * anchor null
 * -> anchor_text omitted
 *
 * last_seen
 * -> equivalent canonical ISO timestamp
 *
 * reciprocal_link_observed
 * -> omitted
 *
 * suspected_link_cluster
 * -> omitted
 *
 * links_count
 * -> ignored; never expanded into synthetic observations
 *
 * EXPECTED LINK-SIGNAL SEMANTICS
 * ----------------------------------------------------------------------------
 * Three simulated provider items produce:
 *
 * inbound_link_count = 3
 * unique_source_page_count = 3
 * unique_source_domain_count = 2
 * source_diversity_score = 2 / 3
 *
 * Two supplied anchor strings canonicalize to the same anchor:
 *
 * "  Apple   NEWS  "
 * "apple news"
 *
 * Therefore:
 *
 * anchor_text_convergence_score = 1
 * repeated_anchor_text_ratio = 1
 *
 * No reciprocal/cluster observations are supplied, therefore:
 *
 * reciprocal_link_ratio = UNAVAILABLE
 * suspected_link_cluster_ratio = UNAVAILABLE
 *
 * The canonical Link Signals producer remains the only calculator of all those
 * values.
 *
 * FAILURE GOVERNANCE
 * ----------------------------------------------------------------------------
 * Simulated:
 * - HTTP failure
 * - invalid JSON
 * - DataForSEO root failure
 * - DataForSEO task failure
 * - malformed provider item
 * - items_count mismatch
 * - transport failure
 * - unexpected content type
 *
 * must reject.
 *
 * None may become:
 *
 * observations: []
 *
 * Each failed invocation must perform exactly one transport call: no retry.
 *
 * PROTOCOL
 * ----------------------------------------------------------------------------
 * - Xyvala Search Protocol 3.0
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - one truth = one canonical owner
 * - provider failure != zero observations
 * - unavailable boolean evidence != false
 * - no analytical reconstruction in tests
 * ========================================================================== */

import {
  isDeepStrictEqual,
} from "node:util";

import {
  buildSearchRawDocument,
  type SearchAcquisitionInput,
} from "../../../lib/xyvala/search/acquisition/search-acquisition-core";

import {
  buildSearchExtractedDocument,
  isSearchExtractedDocumentAccepted,
  type SearchExtractionInput,
} from "../../../lib/xyvala/search/extraction/search-extraction-core";

import {
  buildSearchLinkSignals,
} from "../../../lib/xyvala/search/signals/search-link-signals-search-core";

import {
  buildSearchFinancialNewsLinkObservationProvider,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-link-observation-provider";

import {
  createSearchFinancialNewsDataForSeoLinkObservationSource,
  SearchFinancialNewsDataForSeoLinkObservationError,
  XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_DATA_PROVIDER,
  type SearchFinancialNewsDataForSeoLinkObservationErrorCode,
  type SearchFinancialNewsDataForSeoLinkObservationSourceConfiguration,
} from "../../../lib/xyvala/search/domains/financial-news/search-financial-news-dataforseo-link-observation-source";

/* ============================================================================
 * 1. TEST FIXTURES
 * ========================================================================== */

const TEST_CONFIGURATION =
  Object.freeze({
    api_login:
      "private-test-login",

    api_password:
      "private-test-password",

    limit:
      3,

    offset:
      0,

    request_timeout_ms:
      5_000,

    maximum_response_bytes:
      1_000_000,
  } satisfies SearchFinancialNewsDataForSeoLinkObservationSourceConfiguration);

const TARGET_SOURCE_URI =
  "https://finance.example.test/article?id=42";

const ACQUISITION_FETCHED_AT =
  "2026-09-12T10:00:01.000Z";

const ACQUISITION_CREATED_AT =
  "2026-09-12T10:00:02.000Z";

const EXTRACTION_CREATED_AT =
  "2026-09-12T10:00:03.000Z";

const LINK_CREATED_AT =
  "2026-09-12T10:00:04.000Z";

const SUCCESS_ITEMS =
  Object.freeze([
    Object.freeze({
      type:
        "backlink",

      url_from:
        "https://alpha.example/a#section",

      anchor:
        "  Apple   NEWS  ",

      last_seen:
        "2026-09-10 09:00:00 +00:00",

      links_count:
        7,
    }),

    Object.freeze({
      type:
        "backlink",

      url_from:
        "https://beta.example/b",

      anchor:
        "apple news",

      last_seen:
        "2026-09-11 10:00:00 +00:00",

      links_count:
        1,
    }),

    Object.freeze({
      type:
        "backlink",

      url_from:
        "https://alpha.example/c",

      anchor:
        null,

      last_seen:
        "2026-09-09 08:00:00 +00:00",

      links_count:
        4,
    }),
  ]);

/* ============================================================================
 * 2. REPORT / ASSERTIONS
 * ========================================================================== */

class ValidationFailure
  extends Error {
  constructor(
    readonly check_name:
      string,
  ) {
    super(
      check_name,
    );

    this.name =
      "ValidationFailure";
  }
}

interface ValidationReport {
  contract:
    string;

  contract_version:
    string;

  mode:
    "OFFLINE_SIMULATED_DATAFORSEO";

  status:
    "RUNNING" | "SUCCESS" | "FAILURE";

  transport_calls:
    number;

  checks:
    string[];

  link_signals:
    {
      validation_state:
        string | null;

      inbound_link_count:
        number | null;

      unique_source_page_count:
        number | null;

      unique_source_domain_count:
        number | null;

      source_diversity_score:
        number | null;

      anchor_text_convergence_score:
        number | null;

      repeated_anchor_text_ratio:
        number | null;

      reciprocal_link_ratio_availability:
        string | null;

      suspected_link_cluster_ratio_availability:
        string | null;

      link_signal_confidence:
        number | null;

      link_data_provider:
        string | null;

      link_data_observed_at:
        string | null;
    };

  error:
    Readonly<
      Record<
        string,
        string | number | null
      >
    > |
    null;
}

type Check =
  (
    condition:
      boolean,

    name:
      string,
  ) =>
    void;

function approximatelyEqual(
  actual:
    number,

  expected:
    number,

  tolerance =
    1e-12,
): boolean {
  return Math.abs(
    actual -
      expected,
  ) <=
    tolerance;
}

function isRecord(
  value:
    unknown,
): value is Readonly<
  Record<string, unknown>
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

/* ============================================================================
 * 3. CANONICAL DOCUMENT FIXTURE
 * ----------------------------------------------------------------------------
 * Real Acquisition and Extraction producers are used.
 * No fake SearchRawDocument/SearchExtractedDocument object is constructed.
 * ========================================================================== */

function createCanonicalLinkRuntimeInput() {
  const acquisitionInput =
    Object.freeze({
      source_uri:
        TARGET_SOURCE_URI,

      source_type:
        "ARTICLE",

      mime_type:
        "text/plain",

      raw_content:
        "Private offline DataForSEO Link integration fixture.",

      fetched_at:
        ACQUISITION_FETCHED_AT,

      source_published_at:
        Object.freeze({
          availability_state:
            "AVAILABLE",

          value:
            "2026-09-12T09:30:00.000Z",
        } as const),

      created_at:
        ACQUISITION_CREATED_AT,

      acquisition_method:
        "PRIVATE_TEST_DATAFORSEO_LINK_VALIDATION_V1",

      acquisition_module_version:
        "1.0.0",
    } satisfies SearchAcquisitionInput);

  const rawDocument =
    buildSearchRawDocument(
      acquisitionInput,
    );

  if (
    rawDocument.validation_state !==
      "VALID"
  ) {
    throw new ValidationFailure(
      "raw_document_fixture_must_be_valid",
    );
  }

  const extractionInput =
    Object.freeze({
      raw_document:
        rawDocument,

      created_at:
        EXTRACTION_CREATED_AT,
    } satisfies SearchExtractionInput);

  const extractedDocument =
    buildSearchExtractedDocument(
      extractionInput,
    );

  if (
    !isSearchExtractedDocumentAccepted(
      extractedDocument,
    )
  ) {
    throw new ValidationFailure(
      "extracted_document_fixture_must_be_accepted",
    );
  }

  return Object.freeze({
    raw_document:
      rawDocument,

    extracted_document:
      extractedDocument,

    created_at:
      LINK_CREATED_AT,
  });
}

/* ============================================================================
 * 4. DATAFORSEO RESPONSE FIXTURES
 * ========================================================================== */

function buildProviderResponse(
  items:
    readonly unknown[],

  options:
    Readonly<{
      root_status_code?:
        number;

      task_status_code?:
        number;

      tasks_error?:
        number;

      items_count?:
        number;
    }> =
      {},
): string {
  return JSON.stringify({
    version:
      "0.1.20260912",

    status_code:
      options.root_status_code ??
      20000,

    status_message:
      "Ok.",

    time:
      "0.0500 sec.",

    cost:
      0.02,

    tasks_count:
      1,

    tasks_error:
      options.tasks_error ??
      0,

    tasks:
      [
        {
          id:
            "private-test-task",

          status_code:
            options.task_status_code ??
            20000,

          status_message:
            "Ok.",

          result:
            [
              {
                target:
                  TARGET_SOURCE_URI,

                total_count:
                  items.length,

                items_count:
                  options.items_count ??
                  items.length,

                items,
              },
            ],
        },
      ],
  });
}

function jsonResponse(
  body:
    string,

  status =
    200,

  contentType =
    "application/json; charset=utf-8",
): Response {
  return new Response(
    body,
    {
      status,

      headers:
        {
          "content-type":
            contentType,
        },
    },
  );
}

/* ============================================================================
 * 5. SUCCESS TRANSPORT
 * ----------------------------------------------------------------------------
 * Also validates the outbound DataForSEO request without exposing credentials.
 * ========================================================================== */

function createSuccessfulTransport(
  report:
    ValidationReport,

  check:
    Check,
): typeof globalThis.fetch {
  return async (
    request,
    init,
  ) => {
    report.transport_calls +=
      1;

    check(
      String(
        request,
      ) ===
        "https://api.dataforseo.com/v3/backlinks/backlinks/live",
      "request_endpoint_exact",
    );

    check(
      init?.method ===
        "POST",
      "request_method_post",
    );

    check(
      init?.redirect ===
        "error",
      "redirects_rejected",
    );

    check(
      init?.credentials ===
        "omit",
      "credentials_mode_omit",
    );

    check(
      init?.cache ===
        "no-store",
      "cache_disabled",
    );

    const headers =
      new Headers(
        init?.headers,
      );

    const authorization =
      headers.get(
        "authorization",
      );

    check(
      typeof authorization ===
        "string" &&
      authorization.startsWith(
        "Basic ",
      ),
      "basic_authorization_present",
    );

    check(
      !String(
        request,
      ).includes(
        TEST_CONFIGURATION.api_login,
      ) &&
      !String(
        request,
      ).includes(
        TEST_CONFIGURATION.api_password,
      ),
      "credentials_not_in_url",
    );

    check(
      typeof init?.body ===
        "string",
      "request_body_is_json_string",
    );

    if (
      typeof init?.body !==
      "string"
    ) {
      throw new ValidationFailure(
        "request_body_is_json_string",
      );
    }

    const parsedBody:
      unknown =
      JSON.parse(
        init.body,
      );

    check(
      Array.isArray(
        parsedBody,
      ) &&
      parsedBody.length ===
        1,
      "exactly_one_dataforseo_task",
    );

    if (
      !Array.isArray(
        parsedBody,
      )
    ) {
      throw new ValidationFailure(
        "exactly_one_dataforseo_task",
      );
    }

    const task =
      parsedBody[
        0
      ];

    check(
      isRecord(
        task,
      ),
      "dataforseo_task_is_object",
    );

    if (
      !isRecord(
        task,
      )
    ) {
      throw new ValidationFailure(
        "dataforseo_task_is_object",
      );
    }

    const taskRecord =
      task;

    check(
      taskRecord.target ===
        TARGET_SOURCE_URI,
      "target_uri_preserved_exactly",
    );

    check(
      taskRecord.mode ===
        "as_is",
      "request_mode_as_is",
    );

    check(
      taskRecord.backlinks_status_type ===
        "live",
      "request_live_backlinks_only",
    );

    check(
      taskRecord.exclude_internal_backlinks ===
        true,
      "internal_backlinks_explicitly_excluded",
    );

    check(
      taskRecord.limit ===
        TEST_CONFIGURATION.limit,
      "explicit_limit_preserved",
    );

    check(
      taskRecord.offset ===
        TEST_CONFIGURATION.offset,
      "explicit_offset_preserved",
    );

    return jsonResponse(
      buildProviderResponse(
        SUCCESS_ITEMS,
      ),
    );
  };
}

/* ============================================================================
 * 6. ERROR EXPECTATION
 * ========================================================================== */

async function expectSourceError(
  runtimeInput:
    ReturnType<
      typeof createCanonicalLinkRuntimeInput
    >,

  transport:
    typeof globalThis.fetch,

  expectedCode:
    SearchFinancialNewsDataForSeoLinkObservationErrorCode,

  check:
    Check,
): Promise<void> {
  let transportCalls =
    0;

  const countedTransport:
    typeof globalThis.fetch =
      async (
        request,
        init,
      ) => {
        transportCalls +=
          1;

        return transport(
          request,
          init,
        );
      };

  const source =
    createSearchFinancialNewsDataForSeoLinkObservationSource({
      configuration:
        TEST_CONFIGURATION,

      fetch:
        countedTransport,
    });

  const provider =
    buildSearchFinancialNewsLinkObservationProvider({
      authorized_link_observation_source:
        source,
    });

  let rejected =
    false;

  try {
    await provider(
      runtimeInput,
    );
  } catch (
    error:
      unknown
  ) {
    rejected =
      true;

    check(
      error instanceof
        SearchFinancialNewsDataForSeoLinkObservationError,
      `${expectedCode}_typed_error`,
    );

    if (
      !(
        error instanceof
        SearchFinancialNewsDataForSeoLinkObservationError
      )
    ) {
      throw error;
    }

    check(
      error.code ===
        expectedCode,
      `${expectedCode}_code_preserved`,
    );

    check(
      !error.message.includes(
        TEST_CONFIGURATION.api_login,
      ) &&
      !error.message.includes(
        TEST_CONFIGURATION.api_password,
      ) &&
      !error.message.includes(
        TARGET_SOURCE_URI,
      ) &&
      !error.message.includes(
        "PRIVATE_TRANSPORT_DETAIL",
      ),
      `${expectedCode}_sensitive_details_not_exposed`,
    );
  }

  check(
    rejected,
    `${expectedCode}_must_reject`,
  );

  check(
    transportCalls ===
      1,
    `${expectedCode}_no_retry`,
  );
}

/* ============================================================================
 * 7. MAIN VALIDATION
 * ========================================================================== */

async function main(): Promise<void> {
  const report:
    ValidationReport =
    {
      contract:
        "xyvala-financial-news-dataforseo-link-observation-validation",

      contract_version:
        "1.0.0",

      mode:
        "OFFLINE_SIMULATED_DATAFORSEO",

      status:
        "RUNNING",

      transport_calls:
        0,

      checks:
        [],

      link_signals:
        {
          validation_state:
            null,

          inbound_link_count:
            null,

          unique_source_page_count:
            null,

          unique_source_domain_count:
            null,

          source_diversity_score:
            null,

          anchor_text_convergence_score:
            null,

          repeated_anchor_text_ratio:
            null,

          reciprocal_link_ratio_availability:
            null,

          suspected_link_cluster_ratio_availability:
            null,

          link_signal_confidence:
            null,

          link_data_provider:
            null,

          link_data_observed_at:
            null,
        },

      error:
        null,
    };

  const check:
    Check =
      (
        condition,
        name,
      ) => {
        if (
          !condition
        ) {
          throw new ValidationFailure(
            name,
          );
        }

        report.checks.push(
          name,
        );
      };

  try {
    const runtimeInput =
      createCanonicalLinkRuntimeInput();

    /* ------------------------------------------------------------------------
     * 1. FACTORY / PROVIDER BOUNDARY
     * --------------------------------------------------------------------- */

    const successfulTransport =
      createSuccessfulTransport(
        report,
        check,
      );

    const source =
      createSearchFinancialNewsDataForSeoLinkObservationSource({
        configuration:
          TEST_CONFIGURATION,

        fetch:
          successfulTransport,
      });

    check(
      report.transport_calls ===
        0,
      "source_factory_performs_no_network_io",
    );

    const provider =
      buildSearchFinancialNewsLinkObservationProvider({
        authorized_link_observation_source:
          source,
      });

    check(
      provider ===
        source,
      "financial_news_provider_preserves_source_reference",
    );

    check(
      report.transport_calls ===
        0,
      "provider_binding_performs_no_network_io",
    );

    /* ------------------------------------------------------------------------
     * 2. SUCCESSFUL PROVIDER MAPPING
     * --------------------------------------------------------------------- */

    const runtimeInputBefore =
      structuredClone(
        runtimeInput,
      );

    const resolution =
      await provider(
        runtimeInput,
      );

    check(
      report.transport_calls ===
        1,
      "successful_source_invocation_exactly_one_transport_call",
    );

    check(
      isDeepStrictEqual(
        runtimeInput,
        runtimeInputBefore,
      ),
      "runtime_input_not_mutated",
    );

    check(
      resolution.link_data_provider ===
        XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_DATA_PROVIDER,
      "provider_identity_exact",
    );

    check(
      resolution.observations.length ===
        3,
      "one_provider_item_one_observation",
    );

    check(
      Object.isFrozen(
        resolution.observations,
      ),
      "observation_collection_immutable_envelope",
    );

    const first =
      resolution
        .observations[
        0
      ];

    const second =
      resolution
        .observations[
        1
      ];

    const third =
      resolution
        .observations[
        2
      ];

    if (
      first ===
        undefined ||
      second ===
        undefined ||
      third ===
        undefined
    ) {
      throw new ValidationFailure(
        "three_observations_required",
      );
    }

    check(
      first.source_uri ===
        "https://alpha.example/a#section",
      "provider_source_uri_preserved_exactly",
    );

    check(
      first.anchor_text ===
        "  Apple   NEWS  ",
      "provider_anchor_preserved_exactly",
    );

    check(
      first.observed_at ===
        "2026-09-10T09:00:00.000Z",
      "first_last_seen_instant_preserved",
    );

    check(
      second.observed_at ===
        "2026-09-11T10:00:00.000Z",
      "second_last_seen_instant_preserved",
    );

    check(
      !Object.prototype.hasOwnProperty.call(
        third,
        "anchor_text",
      ),
      "null_anchor_omitted",
    );

    for (
      const [
        index,
        observation,
      ] of resolution
        .observations
        .entries()
    ) {
      check(
        !Object.prototype.hasOwnProperty.call(
          observation,
          "reciprocal_link_observed",
        ),
        `observation_${String(index)}_reciprocal_truth_not_fabricated`,
      );

      check(
        !Object.prototype.hasOwnProperty.call(
          observation,
          "suspected_link_cluster",
        ),
        `observation_${String(index)}_cluster_truth_not_fabricated`,
      );
    }

    /*
     * links_count values in the fixture are 7 / 1 / 4.
     *
     * If the source expanded multiplicity, cardinality would exceed 3.
     */
    check(
      resolution.observations.length ===
        SUCCESS_ITEMS.length,
      "links_count_not_expanded",
    );

    /* ------------------------------------------------------------------------
     * 3. REAL CANONICAL LINK SIGNALS PRODUCER
     * --------------------------------------------------------------------- */

    const signals =
      buildSearchLinkSignals({
        document_id:
          runtimeInput
            .raw_document
            .document_id,

        created_at:
          runtimeInput
            .created_at,

        observations:
          resolution
            .observations,

        ...(
          resolution.link_data_provider !==
          undefined
            ? {
                link_data_provider:
                  resolution.link_data_provider,
              }
            : {}
        ),
      });

    check(
      signals.validation_state ===
        "DEGRADED",
      "link_signals_degraded_for_missing_boolean_evidence",
    );

    check(
      signals.inbound_link_count.availability_state ===
        "AVAILABLE" &&
      signals.inbound_link_count.value ===
        3,
      "canonical_inbound_link_count",
    );

    check(
      signals.unique_source_page_count.availability_state ===
        "AVAILABLE" &&
      signals.unique_source_page_count.value ===
        3,
      "canonical_unique_source_page_count",
    );

    check(
      signals.unique_source_domain_count.availability_state ===
        "AVAILABLE" &&
      signals.unique_source_domain_count.value ===
        2,
      "canonical_unique_source_domain_count",
    );

    check(
      signals.source_diversity_score.availability_state ===
        "AVAILABLE" &&
      approximatelyEqual(
        signals.source_diversity_score.value,
        2 /
          3,
      ),
      "canonical_source_diversity_score",
    );

    check(
      signals.anchor_text_convergence_score.availability_state ===
        "AVAILABLE" &&
      approximatelyEqual(
        signals.anchor_text_convergence_score.value,
        1,
      ),
      "canonical_anchor_convergence",
    );

    check(
      signals.repeated_anchor_text_ratio.availability_state ===
        "AVAILABLE" &&
      approximatelyEqual(
        signals.repeated_anchor_text_ratio.value,
        1,
      ),
      "canonical_repeated_anchor_ratio",
    );

    check(
      signals.reciprocal_link_ratio.availability_state !==
        "AVAILABLE",
      "reciprocal_ratio_remains_unavailable",
    );

    check(
      signals.suspected_link_cluster_ratio.availability_state !==
        "AVAILABLE",
      "cluster_ratio_remains_unavailable",
    );

    check(
      signals.link_signal_confidence.availability_state ===
        "AVAILABLE" &&
      approximatelyEqual(
        signals.link_signal_confidence.value,
        0.445,
      ),
      "canonical_link_confidence",
    );

    check(
      signals.link_data_provider.availability_state ===
        "AVAILABLE" &&
      signals.link_data_provider.value ===
        XYVALA_SEARCH_FINANCIAL_NEWS_DATAFORSEO_LINK_DATA_PROVIDER,
      "canonical_provider_evidence",
    );

    check(
      signals.link_data_observed_at.availability_state ===
        "AVAILABLE" &&
      signals.link_data_observed_at.value ===
        "2026-09-11T10:00:00.000Z",
      "canonical_latest_observed_at",
    );

    report.link_signals.validation_state =
      signals.validation_state;

    report.link_signals.inbound_link_count =
      signals.inbound_link_count.availability_state ===
        "AVAILABLE"
        ? signals.inbound_link_count.value
        : null;

    report.link_signals.unique_source_page_count =
      signals.unique_source_page_count.availability_state ===
        "AVAILABLE"
        ? signals.unique_source_page_count.value
        : null;

    report.link_signals.unique_source_domain_count =
      signals.unique_source_domain_count.availability_state ===
        "AVAILABLE"
        ? signals.unique_source_domain_count.value
        : null;

    report.link_signals.source_diversity_score =
      signals.source_diversity_score.availability_state ===
        "AVAILABLE"
        ? signals.source_diversity_score.value
        : null;

    report.link_signals.anchor_text_convergence_score =
      signals.anchor_text_convergence_score.availability_state ===
        "AVAILABLE"
        ? signals.anchor_text_convergence_score.value
        : null;

    report.link_signals.repeated_anchor_text_ratio =
      signals.repeated_anchor_text_ratio.availability_state ===
        "AVAILABLE"
        ? signals.repeated_anchor_text_ratio.value
        : null;

    report.link_signals.reciprocal_link_ratio_availability =
      signals.reciprocal_link_ratio.availability_state;

    report.link_signals.suspected_link_cluster_ratio_availability =
      signals.suspected_link_cluster_ratio.availability_state;

    report.link_signals.link_signal_confidence =
      signals.link_signal_confidence.availability_state ===
        "AVAILABLE"
        ? signals.link_signal_confidence.value
        : null;

    report.link_signals.link_data_provider =
      signals.link_data_provider.availability_state ===
        "AVAILABLE"
        ? signals.link_data_provider.value
        : null;

    report.link_signals.link_data_observed_at =
      signals.link_data_observed_at.availability_state ===
        "AVAILABLE"
        ? signals.link_data_observed_at.value
        : null;

    /* ------------------------------------------------------------------------
     * 4. SUCCESSFUL EMPTY PROVIDER PAGE
     * --------------------------------------------------------------------- */

    let emptyTransportCalls =
      0;

    const emptySource =
      createSearchFinancialNewsDataForSeoLinkObservationSource({
        configuration:
          TEST_CONFIGURATION,

        fetch:
          async () => {
            emptyTransportCalls +=
              1;

            return jsonResponse(
              buildProviderResponse(
                [],
              ),
            );
          },
      });

    const emptyResolution =
      await emptySource(
        runtimeInput,
      );

    check(
      emptyTransportCalls ===
        1,
      "empty_page_single_transport_call",
    );

    check(
      emptyResolution.observations.length ===
        0,
      "successful_empty_items_remain_empty_observations",
    );

    const emptySignals =
      buildSearchLinkSignals({
        document_id:
          runtimeInput
            .raw_document
            .document_id,

        created_at:
          runtimeInput
            .created_at,

        observations:
          emptyResolution
            .observations,

        ...(
          emptyResolution.link_data_provider !==
          undefined
            ? {
                link_data_provider:
                  emptyResolution.link_data_provider,
              }
            : {}
        ),
      });

    check(
      emptySignals.validation_state ===
        "DEGRADED",
      "empty_observation_population_is_degraded",
    );

    check(
      emptySignals.inbound_link_count.availability_state !==
        "AVAILABLE",
      "empty_observation_population_not_available_zero",
    );

    check(
      emptySignals.link_signal_confidence.availability_state !==
        "AVAILABLE",
      "empty_observation_confidence_not_available_zero",
    );

    /* ------------------------------------------------------------------------
     * 5. FAILURE SEMANTICS
     * --------------------------------------------------------------------- */

    await expectSourceError(
      runtimeInput,
      async () =>
        jsonResponse(
          "{}",
          503,
        ),
      "HTTP_FAILURE",
      check,
    );

    await expectSourceError(
      runtimeInput,
      async () =>
        jsonResponse(
          "not-json",
        ),
      "INVALID_JSON",
      check,
    );

    await expectSourceError(
      runtimeInput,
      async () =>
        jsonResponse(
          buildProviderResponse(
            [],
            {
              root_status_code:
                40101,
            },
          ),
        ),
      "DATAFORSEO_ROOT_FAILURE",
      check,
    );

    await expectSourceError(
      runtimeInput,
      async () =>
        jsonResponse(
          buildProviderResponse(
            [],
            {
              task_status_code:
                40501,
            },
          ),
        ),
      "DATAFORSEO_TASK_FAILURE",
      check,
    );

    await expectSourceError(
      runtimeInput,
      async () =>
        jsonResponse(
          buildProviderResponse(
            [
              {
                type:
                  "backlink",

                url_from:
                  "https://alpha.example/a",

                anchor:
                  "anchor",

                last_seen:
                  "not-a-dataforseo-timestamp",
              },
            ],
          ),
        ),
      "INVALID_PROVIDER_ITEM",
      check,
    );

    await expectSourceError(
      runtimeInput,
      async () =>
        jsonResponse(
          buildProviderResponse(
            SUCCESS_ITEMS,
            {
              items_count:
                2,
            },
          ),
        ),
      "INVALID_PROVIDER_PAYLOAD",
      check,
    );

    await expectSourceError(
      runtimeInput,
      async () =>
        jsonResponse(
          "{}",
          200,
          "text/plain",
        ),
      "UNEXPECTED_CONTENT_TYPE",
      check,
    );

    await expectSourceError(
      runtimeInput,
      async () => {
        throw new Error(
          "PRIVATE_TRANSPORT_DETAIL",
        );
      },
      "TRANSPORT_FAILURE",
      check,
    );

    report.status =
      "SUCCESS";
  } catch (
    error:
      unknown
  ) {
    report.status =
      "FAILURE";

    report.error =
      error instanceof
        ValidationFailure
        ? {
            code:
              "CHECK_FAILED",

            check:
              error.check_name,
          }
        : error instanceof
            SearchFinancialNewsDataForSeoLinkObservationError
          ? {
              code:
                error.code,

              field:
                error.field,

              http_status:
                error.http_status,

              provider_status_code:
                error.provider_status_code,

              task_status_code:
                error.task_status_code,

              item_index:
                error.item_index,
            }
          : {
              code:
                "UNEXPECTED_ERROR_DETAILS_WITHHELD",
            };

    process.exitCode =
      1;
  }

  console.log(
    JSON.stringify(
      report,
      null,
      2,
    ),
  );
}

void main();
