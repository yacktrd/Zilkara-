/* ============================================================================
 * FILE: scripts/xyvala/search/validate-search-temporal-postgres.cjs
 * Private integration test entry point, version 1.0.1.
 * Default OBSERVE. --run explicitly enables MUTATE on an isolated Neon branch.
 * Synthetic fixtures belong to this test file; they are not collected evidence.
 * Canonical repository/configuration/transactions remain the execution owners.
 * No migration, runtime binding, cleanup, trigger disabling or automatic retry.
 * Actual commits are required. A rollback is never reported as a stored record.
 * References: general rules 34, 52-57, 61-67, 99-104; Search LXXXIV-LXXXVI;
 * Search VLR XLII-XLIV. This script is not an analytical policy or producer.
 * ========================================================================== */
'use strict';

const VERSION = '1.0.1';
const TABLE = 'public.xyvala_search_temporal_observations';
const MIGRATION = '004_xyvala_search_temporal_observations';
const TIMEOUT = 10000;
class ValidationError extends Error {}
function requireTrue(value, code) {
  if (!value) throw new ValidationError(code);
}
function frozen(value) {
  return value === null || typeof value !== 'object'
    || (Object.isFrozen(value) && Object.values(value).every(frozen));
}

async function loadProject(root) {
  const [fs, path, { default: Module }] = await Promise.all([
    import('node:fs'), import('node:path'), import('node:module'),
  ]);
  const local = Module.createRequire(path.join(root, 'package.json'));
  const ts = local('typescript');
  requireTrue(ts.version === '5.4.5', 'TYPESCRIPT_VERSION_REVIEW_REQUIRED');
  const resolve = Module._resolveFilename;
  const extension = Module._extensions['.ts'];
  Module._resolveFilename = function (request, parent, ...rest) {
    return resolve.call(this, request.startsWith('@/')
      ? path.join(root, request.slice(2)) : request, parent, ...rest);
  };
  Module._extensions['.ts'] = function (mod, filename) {
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    });
    mod._compile(result.outputText, filename);
  };
  return { local, restore() {
    Module._resolveFilename = resolve;
    if (extension) Module._extensions['.ts'] = extension;
    else delete Module._extensions['.ts'];
  } };
}

function target(configuration, env) {
  requireTrue(configuration.status === 'VALID'
    && configuration.tls_mode === 'REQUIRED'
    && configuration.reject_unauthorized === true, 'VERIFIED_TLS_REQUIRED');
  requireTrue(env.XYVALA_SEARCH_TEST_TARGET === 'isolated_test'
    && env.NODE_ENV !== 'production' && env.VERCEL_ENV !== 'production',
  'EXPLICIT_ISOLATED_TEST_TARGET_REQUIRED');
  const host = env.XYVALA_SEARCH_EXPECTED_HOST;
  const source = env.XYVALA_SEARCH_TEST_SOURCE_HOST;
  const database = env.XYVALA_SEARCH_EXPECTED_DATABASE;
  const role = env.XYVALA_SEARCH_EXPECTED_ROLE;
  const run = env.XYVALA_SEARCH_TEST_RUN_ID;
  const neon = /^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/;
  requireTrue(typeof host === 'string' && typeof source === 'string'
    && neon.test(host) && neon.test(source) && database && role
    && typeof run === 'string' && /^[a-z0-9-]{1,48}$/.test(run),
  'EXPLICIT_TEST_IDENTITIES_REQUIRED');
  // Pooled and direct hostnames of one endpoint do not establish isolation.
  requireTrue(host.split('.')[0].replace(/-pooler$/, '')
    !== source.split('.')[0].replace(/-pooler$/, ''), 'SOURCE_ENDPOINT_FORBIDDEN');
  requireTrue(new URL(configuration.database_url).hostname === host,
    'TARGET_HOST_MISMATCH');
  return { database, role, run };
}

function fixtures(run, buildSeriesId, copyRecord) {
  const prefix = `xyvala-search-storage-test-v1:${run}:`;
  const series = ['main', 'other', 'corrupt', 'race-id', 'race-hash'].map((name) =>
    buildSeriesId({ source_uri: `https://xyvala-storage-test.invalid/${run}/${name}`,
      source_type: 'ARTICLE' }));
  function record(id, timestamp, document = id, group = series[0], hash = 'hash-a') {
    // Explicit fixture owner. No real document, timestamp or score is inferred.
    const unavailable = () => ({ availability_state: 'UNAVAILABLE',
      reason: 'SYNTHETIC_STORAGE_FIXTURE_NO_ANALYTICAL_OBSERVATION' });
    const value = {
      observation: { document_series_id: group, observation_id: prefix + id,
        document_id: prefix + document, observed_at: timestamp,
        content_hash: { availability_state: 'AVAILABLE', value: hash },
        frequency_structure_value: unavailable(), anchor_structure_value: unavailable(),
        convergence_value: unavailable(), link_profile_value: unavailable(),
        validation_state: 'DEGRADED', degradation_reasons: ['SYNTHETIC_TEST_FIXTURE'] },
      provenance: { producer_module: 'validate-search-temporal-postgres-fixtures',
        producer_version: VERSION, source_reference: prefix + id },
    };
    copyRecord(value);
    return value;
  }
  return { prefix, series, record };
}

async function runSuite({ repository, withTransaction, fixture, report }) {
  const { isDeepStrictEqual } = await import('node:util');
  function same(actual, expected, code) {
    requireTrue(isDeepStrictEqual(actual, expected), code);
  }
  const store = repository({ with_transaction: withTransaction, statement_timeout_ms: TIMEOUT });
  const { series, record } = fixture;
  const day = '2000-01-01T';
  const current = record('current', day + '03:00:00Z');
  const early = record('early', day + '00:00:00Z');
  const tieA = record('tie-a', day + '01:00:00Z');
  const tieZ = record('tie-z', day + '01:00:00Z');
  const equal = record('equal', day + '03:00:00Z');
  const future = record('future', day + '04:00:00Z');
  const other = record('other', day + '00:00:00Z', 'other', series[1]);
  const input = (value) => ({ document_series_id: value.observation.document_series_id,
    current_observation_id: value.observation.observation_id });
  async function check(name, action) {
    await action();
    report(name);
  }
  async function stored(value, owner = store) {
    const result = await owner.write(value);
    requireTrue(result.reason !== 'WRITE_OUTCOME_UNKNOWN', 'WRITE_OUTCOME_UNKNOWN');
    same(result.status, 'STORED', 'WRITE_NOT_CONFIRMED');
    same(result.record, value, 'WRITE_ROUNDTRIP_MISMATCH');
    requireTrue(result.record !== value && frozen(result), 'WRITE_NOT_DETACHED_IMMUTABLE');
  }
  async function read(value = current, owner = store) {
    const result = await owner.read(input(value));
    same(result.status, 'AVAILABLE', 'READ_NOT_AVAILABLE');
    same(result.coverage, 'ALL_RECORDED_BEFORE_CURRENT', 'COVERAGE_MISMATCH');
    same(result.current_record, value, 'CURRENT_RECORD_MISMATCH');
    requireTrue(frozen(result), 'READ_NOT_DEEPLY_IMMUTABLE');
    return result;
  }
  await check('missing_current_is_not_found', async () => {
    same(await store.read(input(current)), { status: 'NOT_FOUND',
      reason: 'CURRENT_OBSERVATION_NOT_FOUND' }, 'MISSING_CURRENT_MISMATCH');
  });
  await check('commit_and_read_empty_recorded_history', async () => {
    await stored(current);
    same((await read()).historical_records, [], 'EMPTY_RECORDED_HISTORY_MISMATCH');
    requireTrue(!Object.isFrozen(current) && !Object.isFrozen(current.observation),
      'CALLER_INPUT_WAS_FROZEN');
  });
  await check('idempotence_ignores_object_key_order', async () => {
    const reordered = { provenance: { ...current.provenance },
      observation: Object.fromEntries(Object.entries(current.observation).reverse()) };
    const result = await store.write(reordered);
    same(result.status, 'ALREADY_PRESENT', 'IDEMPOTENCE_MISMATCH');
    same(result.record, current, 'IDEMPOTENCE_CHANGED_TRUTH');
  });
  await check('same_id_changed_provenance_conflicts', async () => {
    const changed = structuredClone(current);
    changed.provenance.source_reference += ':changed';
    const result = await store.write(changed);
    same(result.status, 'CONFLICT', 'IDENTITY_CONFLICT_MISSING');
    same(result.reason, 'OBSERVATION_ID_CONFLICT', 'IDENTITY_CONFLICT_REASON');
    same(result.existing_record, current, 'IDENTITY_CONFLICT_CHANGED_RECORD');
    await read();
  });
  await check('same_document_changed_hash_conflicts', async () => {
    const changed = record('hash-conflict', day + '04:00:00Z', 'current', series[0], 'hash-b');
    const result = await store.write(changed);
    same(result.status, 'CONFLICT', 'HASH_CONFLICT_MISSING');
    same(result.reason, 'DOCUMENT_CONTENT_HASH_CONFLICT', 'HASH_CONFLICT_REASON');
    same(result.existing_record, current, 'HASH_CONFLICT_CHANGED_RECORD');
    same((await store.read(input(changed))).status, 'NOT_FOUND', 'CONFLICT_WAS_PERSISTED');
  });
  await check('strict_history_ties_and_series_isolation', async () => {
    for (const value of [future, tieZ, other, equal, early, tieA]) await stored(value);
    same((await read()).historical_records, [early, tieA, tieZ], 'HISTORY_MISMATCH');
    same((await read(other)).historical_records, [], 'CROSS_SERIES_LEAK');
    same((await store.read({ ...input(current), document_series_id: series[1] })).status,
      'INVALID', 'SERIES_IDENTITY_MISMATCH_ACCEPTED');
  });
  await check('negative_zero_and_exact_strings_survive', async () => {
    const value = record('exact\u0000\ud800', day + '02:00:00Z');
    value.observation.frequency_structure_value = { availability_state: 'AVAILABLE', value: -0 };
    await stored(value);
    const result = await read(value);
    requireTrue(Object.is(result.current_record.observation.frequency_structure_value.value, -0),
      'NEGATIVE_ZERO_LOST');
  });
  await check('repeatable_read_snapshot_excludes_later_commit', async () => {
    const before = await read();
    const inserted = record('backdated', day + '00:30:00Z');
    const snapshotStore = repository({ statement_timeout_ms: TIMEOUT,
      with_transaction: (work, mode) => withTransaction(async (tx) => {
        same(mode, 'REPEATABLE_READ_READ_ONLY', 'READ_MODE_MISMATCH');
        await tx.query(`SELECT count(*) FROM ${TABLE}`);
        await stored(inserted);
        return work(tx);
      }, mode) });
    same((await read(current, snapshotStore)).historical_records,
      before.historical_records, 'READ_SNAPSHOT_CHANGED');
    const after = await read();
    same(after.historical_records.map((x) => x.observation.observation_id),
      [early, inserted, tieA, tieZ, record('exact\u0000\ud800', day + '02:00:00Z')]
        .map((x) => x.observation.observation_id), 'NEW_SNAPSHOT_MISSING_COMMIT');
  });
  async function race(values, expected) {
    const pids = new Set();
    let arrivals = 0;
    let release;
    let reject;
    const gate = new Promise((resolve, fail) => { release = resolve; reject = fail; });
    const timer = setTimeout(() => reject(new ValidationError('CONCURRENT_CLIENTS_TIMEOUT')), TIMEOUT);
    const concurrent = repository({ statement_timeout_ms: TIMEOUT,
      with_transaction: (work, mode) => withTransaction(async (tx) => {
        const result = await tx.query('SELECT pg_backend_pid() AS pid');
        pids.add(result.rows[0].pid);
        arrivals += 1;
        if (arrivals === 2) { clearTimeout(timer); release(); }
        await gate;
        return work(tx);
      }, mode) });
    try {
      const results = await Promise.allSettled(values.map((value) => concurrent.write(value)));
      requireTrue(results.every((x) => x.status === 'fulfilled'), 'CONCURRENT_WRITE_REJECTED');
      requireTrue(pids.size === 2, 'TWO_DATABASE_SESSIONS_REQUIRED');
      const outputs = results.map((x) => x.value);
      requireTrue(outputs.every((x) => x.reason !== 'WRITE_OUTCOME_UNKNOWN'), 'WRITE_OUTCOME_UNKNOWN');
      same(outputs.map((x) => x.status).sort(), expected, 'CONCURRENT_OUTCOMES_MISMATCH');
      const winner = outputs.findIndex((x) => x.status === 'STORED');
      await read(values[winner]);
      return outputs;
    } finally { clearTimeout(timer); }
  }
  await check('concurrent_identical_writes_commit_once', async () => {
    const value = record('race-identical', day + '00:00:00Z', 'race-identical', series[3]);
    await race([value, structuredClone(value)], ['ALREADY_PRESENT', 'STORED']);
  });
  await check('concurrent_hash_conflict_preserves_winner', async () => {
    const a = record('race-hash-a', day + '00:00:00Z', 'race-document', series[4], 'a');
    const b = record('race-hash-b', day + '00:00:00Z', 'race-document', series[4], 'b');
    const results = await race([a, b], ['CONFLICT', 'STORED']);
    same(results.find((x) => x.status === 'CONFLICT').reason,
      'DOCUMENT_CONTENT_HASH_CONFLICT', 'CONCURRENT_HASH_REASON');
    const loser = results[0].status === 'CONFLICT' ? a : b;
    same((await store.read(input(loser))).status, 'NOT_FOUND', 'CONCURRENT_LOSER_PERSISTED');
  });
  await check('concurrent_same_id_different_records_conflict', async () => {
    const a = record('race-identity-conflict', day + '00:00:00Z', 'race-identity-conflict', series[3]);
    const b = structuredClone(a);
    b.provenance.source_reference += ':different';
    const results = await race([a, b], ['CONFLICT', 'STORED']);
    const conflict = results.find((x) => x.status === 'CONFLICT');
    same(conflict.reason, 'OBSERVATION_ID_CONFLICT', 'CONCURRENT_IDENTITY_REASON');
    same(conflict.existing_record, results.find((x) => x.status === 'STORED').record,
      'CONCURRENT_IDENTITY_CHANGED_WINNER');
  });
  await check('invalid_input_is_rejected', async () => {
    const value = structuredClone(current);
    value.observation.observed_at = 'invalid';
    same((await store.write(value)).status, 'INVALID', 'INVALID_TIMESTAMP_ACCEPTED');
  });
  await check('real_sql_failure_is_unavailable', async () => {
    const failing = repository({ statement_timeout_ms: TIMEOUT,
      with_transaction: (work, mode) => withTransaction(async (tx) => {
        await tx.query('SELECT 1 / 0');
        return work(tx);
      }, mode) });
    same((await failing.read(input(current))).status, 'UNAVAILABLE', 'READ_FAILURE_MASKED');
    same((await failing.write(current)).status, 'UNAVAILABLE', 'WRITE_FAILURE_MASKED');
    await read();
  });
  await check('malformed_stored_payload_is_invalid', async () => {
    const value = record('corrupt', day + '00:00:00Z', 'corrupt', series[2]);
    const inserted = await withTransaction((tx) => tx.query(
      `INSERT INTO ${TABLE} (observation_key, document_series_id, document_key,
        observed_at_ms, record_format, payload) VALUES ($1,$2,$3,$4,$5,$6)`,
      [JSON.stringify(value.observation.observation_id), series[2],
        JSON.stringify(value.observation.document_id), 946684800000, '1.0.0', '{}']));
    requireTrue(inserted.ok && inserted.outcome === 'COMMITTED', 'CORRUPT_FIXTURE_NOT_COMMITTED');
    same(await store.read(input(value)), { status: 'INVALID', reason: 'INVALID_STORED_RECORD' },
      'CORRUPT_RECORD_WAS_REPAIRED_OR_HIDDEN');
  });
  await check('sql_immutability_blocks_update_delete_truncate', async () => {
    const statements = [
      `UPDATE ${TABLE} SET payload = payload WHERE false`,
      `DELETE FROM ${TABLE} WHERE false`,
      `TRUNCATE TABLE ${TABLE}`,
    ];
    for (const sql of statements) {
      // Fixed test SQL only. If a forbidden statement succeeds, the exception
      // rolls the whole statement/subtransaction back and fails this case.
      const result = await withTransaction((tx) => tx.query(`DO $test$
        BEGIN
          BEGIN
            ${sql};
            RAISE EXCEPTION 'IMMUTABILITY_DID_NOT_REJECT';
          EXCEPTION WHEN SQLSTATE 'P0001' THEN
            IF SQLERRM <> 'Search temporal observations are immutable' THEN RAISE; END IF;
          END;
        END $test$`));
      requireTrue(result.ok && result.outcome === 'COMMITTED', 'IMMUTABILITY_TEST_FAILED');
    }
    await read();
  });
}

async function main() {
  const args = process.argv.slice(2);
  requireTrue(args.length === 0 || (args.length === 1 && args[0] === '--run'), 'INVALID_ARGUMENTS');
  const run = args[0] === '--run';
  const loader = await loadProject(process.cwd());
  let adapter;
  const passed = [];
  let writeTestsStarted = false;
  let testRun;
  try {
    const local = loader.local;
    const configuration = local('./lib/xyvala/infrastructure/postgres/postgres-configuration.ts')
      .getPostgresConfiguration();
    const expected = target(configuration, process.env);
    testRun = expected.run;
    adapter = local('./lib/xyvala/runtime/postgres/postgres-adapter.ts');
    const storage = local('./lib/xyvala/search/storage/search-temporal-observation-postgres-repository.ts');
    const contract = local('./lib/xyvala/search/contracts/search-temporal-observation-store-contract.ts');
    const identity = local('./lib/xyvala/search/temporal/search-temporal-document-series-identity.ts');
    const boundary = local('./lib/xyvala/search/temporal/search-temporal-observation-record-boundary.ts');
    requireTrue(adapter.POSTGRES_TRANSACTION_TLS_VERIFICATION_VERSION === '1.0.0'
      && storage.XYVALA_SEARCH_TEMPORAL_OBSERVATION_POSTGRES_REPOSITORY_MODULE_VERSION === '2.0.0'
      && contract.XYVALA_SEARCH_TEMPORAL_OBSERVATION_STORE_CONTRACT.contract_version === '1.0.0'
      && identity.XYVALA_SEARCH_TEMPORAL_DOCUMENT_SERIES_IDENTITY_MODULE_VERSION === '1.1.0'
      && boundary.XYVALA_SEARCH_TEMPORAL_OBSERVATION_RECORD_BOUNDARY_MODULE_VERSION === '1.0.0',
    'COMPONENT_VERSION_REVIEW_REQUIRED');
    const fixture = fixtures(testRun, identity.buildSearchTemporalDocumentSeriesId,
      boundary.validateAndCopySearchTemporalObservationRecord);
    let preflightError;
    const before = await adapter.withPostgresTransaction(async (tx) => {
      try {
      const identityResult = await tx.query(`SELECT current_database() = $1 AS database_matches,
        current_user = $2 AS role_matches, current_schema() = 'public' AS schema_matches,
        current_setting('session_replication_role') = 'origin' AS triggers_enforced,
        EXISTS (SELECT 1 FROM public.xyvala_migrations WHERE id = $3) AS migration_recorded,
        EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = '${TABLE}'::regclass
          AND tgname = 'xyvala_search_temporal_immutable' AND tgenabled IN ('O','A')
          AND tgtype = 58
          AND tgfoid = 'public.xyvala_search_temporal_reject_mutation()'::regprocedure
          AND NOT tgisinternal) AS immutability_enabled`, [expected.database, expected.role, MIGRATION]);
      requireTrue(identityResult.rows.length === 1
        && Object.values(identityResult.rows[0]).every((x) => x === true), 'TARGET_PREFLIGHT_MISMATCH');
      const rows = await tx.query(`SELECT count(*)::text AS count FROM ${TABLE}
        WHERE document_series_id = ANY($1::text[])`, [fixture.series]);
      requireTrue(rows.rows[0]?.count === '0', 'TEST_RUN_ALREADY_USED');
      } catch (error) { preflightError = error; throw error; }
    }, 'REPEATABLE_READ_READ_ONLY');
    if (!before.ok && before.outcome === 'ROLLED_BACK' && preflightError instanceof ValidationError) {
      throw preflightError;
    }
    requireTrue(before.ok && before.outcome === 'COMMITTED', 'PREFLIGHT_FAILED');
    if (run) {
      writeTestsStarted = true;
      await runSuite({ repository: storage.createSearchTemporalObservationPostgresRepository,
        withTransaction: adapter.withPostgresTransaction, fixture,
        report(name) { passed.push(name); console.log(JSON.stringify({ check: name, ok: true })); } });
    }
    console.log(JSON.stringify({ ok: true, mode: run ? 'MUTATE_TEST' : 'OBSERVE',
      validator_version: VERSION, run_id: testRun, client_tls_verified: true,
      state: run ? 'FUNCTIONAL_SUITE_PASSED' : 'READY_FOR_EXPLICIT_TEST_RUN',
      passed_checks: passed.length, write_tests_started: writeTestsStarted,
      fixtures_retained_on_test_branch: run, schema_migration_executed: false,
      runtime_binding_validated: false }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, mode: run ? 'MUTATE_TEST' : 'OBSERVE',
      validator_version: VERSION, run_id: testRun, passed_checks: passed,
      write_tests_started: writeTestsStarted, automatic_retry: false,
      error: error instanceof ValidationError ? error.message : 'VALIDATION_STOPPED' }, null, 2));
    process.exitCode = 1;
  } finally {
    try { if (adapter) await adapter.closePostgresPool(); }
    finally { loader.restore(); }
  }
}

module.exports = { fixtures, runSuite, target };
if (require.main === module) main().catch(() => {
  console.error(JSON.stringify({ ok: false, error: 'VALIDATOR_START_OR_CLOSE_FAILED' }));
  process.exitCode = 1;
});
