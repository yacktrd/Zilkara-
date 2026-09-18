/* ============================================================================
 * FILE:
 * scripts/xyvala/search/validate-financial-news-acquisition-extraction-causality.ts
 * ----------------------------------------------------------------------------
 * PRIVATE OFFLINE REGRESSION TEST — NOT A PRODUCTION RUNTIME MODULE.
 *
 * Uses the existing Acquisition and Extraction producers, not substitute cores.
 * The acquisition observation and timestamps are explicit synthetic test data.
 * No network, clock, persistence, runtime bootstrap, trace or VLR is executed.
 *
 * Checks:
 * - an extraction timestamp preceding fetched_at produces the expected rejection;
 * - a separate analytical timestamp following acquisition permits extraction;
 * - identical extraction inputs reproduce identical outputs;
 * - acquisition observations and raw documents are not mutated.
 *
 * A successful report validates this producer boundary only. It does not prove
 * that a production preparation boundary has been wired into application.run().
 * ========================================================================== */

import { isDeepStrictEqual } from "node:util";

import {
  buildSearchRawDocument,
  type SearchAcquisitionInput,
} from "../../../lib/xyvala/search/acquisition/search-acquisition-core";

import {
  buildSearchExtractedDocument,
  isSearchExtractedDocumentAccepted,
  validateSearchExtractionInput,
  type SearchExtractionInput,
} from "../../../lib/xyvala/search/extraction/search-extraction-core";

const TIMES = Object.freeze({
  request_started_at: "2025-01-02T12:00:00.000Z",
  fetched_at: "2025-01-02T12:00:01.000Z",
  acquisition_created_at: "2025-01-02T12:00:02.000Z",
  analytical_started_at: "2025-01-02T12:00:03.000Z",
});

class CheckFailure extends Error {
  constructor(readonly check_name: string) {
    super(check_name);
    this.name = "CheckFailure";
  }
}

function main(): void {
  const report: {
    contract: string;
    contract_version: string;
    mode: "OFFLINE_SYNTHETIC_FIXTURE";
    status: "RUNNING" | "SUCCESS" | "FAILURE";
    network_calls: number;
    runtime_clock_reads: number;
    checks: string[];
    cases: {
      name: string;
      extraction_created_at: string;
      validation_state: string;
      input_rejection_reasons: readonly string[];
    }[];
    error: { code: string; check: string | null } | null;
  } = {
    contract: "xyvala-acquisition-extraction-causality-validation",
    contract_version: "1.0.0",
    mode: "OFFLINE_SYNTHETIC_FIXTURE",
    status: "RUNNING",
    network_calls: 0,
    runtime_clock_reads: 0,
    checks: [],
    cases: [],
    error: null,
  };

  const check = (condition: boolean, name: string): void => {
    if (!condition) throw new CheckFailure(name);
    report.checks.push(name);
  };

  try {
    const observation = Object.freeze({
      source_uri: "https://example.invalid/xyvala-private-causality-test",
      source_type: "ARTICLE",
      mime_type: "text/plain",
      raw_content: "Private synthetic document for the acquisition-extraction test.",
      fetched_at: TIMES.fetched_at,
      source_published_at: Object.freeze({
        availability_state: "AVAILABLE",
        value: "2025-01-02T11:00:00.000Z",
      } as const),
      created_at: TIMES.acquisition_created_at,
      acquisition_method: "PRIVATE_TEST_SYNTHETIC_OBSERVATION_V1",
      acquisition_module_version: "1.0.0",
    } satisfies SearchAcquisitionInput);

    const observationBefore = structuredClone(observation);
    const rawDocument = buildSearchRawDocument(observation);
    const rawDocumentBefore = structuredClone(rawDocument);

    check(rawDocument.validation_state === "VALID", "acquisition_fixture_valid");
    check(rawDocument.rejection_reasons.length === 0, "acquisition_has_no_rejection");

    const earlyInput = Object.freeze({
      raw_document: rawDocument,
      created_at: TIMES.request_started_at,
    } satisfies SearchExtractionInput);

    const earlyValidation = validateSearchExtractionInput(earlyInput);
    const earlyDocument = buildSearchExtractedDocument(earlyInput);

    report.cases.push({
      name: "REQUEST_TIMESTAMP_BEFORE_ACQUISITION",
      extraction_created_at: earlyInput.created_at,
      validation_state: earlyDocument.validation_state,
      input_rejection_reasons: earlyValidation.rejection_reasons,
    });

    check(
      earlyValidation.rejection_reasons.includes("CREATED_AT_BEFORE_ACQUISITION"),
      "early_timestamp_rejected_by_validator",
    );
    check(earlyDocument.validation_state === "REJECTED", "builder_preserves_rejection");
    check(!isSearchExtractedDocumentAccepted(earlyDocument), "rejected_extraction_not_accepted");

    // A different explicit phase timestamp. Neither original timestamp is changed.
    const analyticalInput = Object.freeze({
      raw_document: rawDocument,
      created_at: TIMES.analytical_started_at,
    } satisfies SearchExtractionInput);

    const analyticalValidation = validateSearchExtractionInput(analyticalInput);
    const analyticalDocument = buildSearchExtractedDocument(analyticalInput);

    report.cases.push({
      name: "ANALYTICAL_TIMESTAMP_AFTER_ACQUISITION",
      extraction_created_at: analyticalInput.created_at,
      validation_state: analyticalDocument.validation_state,
      input_rejection_reasons: analyticalValidation.rejection_reasons,
    });

    check(analyticalValidation.rejection_reasons.length === 0, "analytical_input_has_no_rejection");
    check(isSearchExtractedDocumentAccepted(analyticalDocument), "post_acquisition_extraction_accepted");
    check(analyticalDocument.document_id === rawDocument.document_id, "document_identity_preserved");
    check(
      analyticalDocument.created_at === TIMES.analytical_started_at,
      "explicit_analytical_timestamp_preserved",
    );

    const replay = buildSearchExtractedDocument(analyticalInput);
    check(isDeepStrictEqual(replay, analyticalDocument), "identical_extraction_replay");
    check(isDeepStrictEqual(rawDocument, rawDocumentBefore), "raw_document_not_mutated");
    check(isDeepStrictEqual(observation, observationBefore), "acquisition_observation_not_mutated");
    check(
      earlyInput.raw_document === analyticalInput.raw_document,
      "same_raw_document_reference_in_both_cases",
    );

    report.status = "SUCCESS";
  } catch (error: unknown) {
    report.status = "FAILURE";
    report.error = error instanceof CheckFailure
      ? { code: "CHECK_FAILED", check: error.check_name }
      : { code: "UNEXPECTED_CORE_ERROR", check: null };
    process.exitCode = 1;
  }

  console.log(JSON.stringify(report, null, 2));
}

main();
