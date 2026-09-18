/* ============================================================================
 * FILE: scripts/xyvala/search/install-search-temporal-schema.cjs
 * Explicit Search schema deployment entry point. Default: read-only diagnostic.
 * Configuration/credentials: canonical PostgreSQL configuration boundary.
 * Transactions: canonical adapter. SQL/journal/lock: canonical migration engine.
 * No provider calls, observation collection, retry, repair or runtime activation.
 * Execute from the project root after npm run typecheck.
 * ========================================================================== */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
class InstallationError extends Error {}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--apply')) {
    throw new InstallationError('INVALID_ARGUMENTS');
  }
  const apply = args[0] === '--apply';
  const root = process.cwd();
  const localRequire = Module.createRequire(path.join(root, 'package.json'));
  const ts = localRequire('typescript');
  if (ts.version !== '5.4.5') throw new InstallationError('REVIEWED_TYPESCRIPT_VERSION_REQUIRED');

  // Process-local loader for existing project TypeScript and @/ imports.
  // No package installation, generated project files, or compiler option edits.
  const originalResolve = Module._resolveFilename;
  const originalTs = Module._extensions['.ts'];
  Module._resolveFilename = function (request, parent, ...rest) {
    const resolved = request.startsWith('@/')
      ? path.join(root, request.slice(2)) : request;
    return originalResolve.call(this, resolved, parent, ...rest);
  };
  Module._extensions['.ts'] = function (mod, filename) {
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    });
    mod._compile(result.outputText, filename);
  };

  let adapter;
  try {
    const { getPostgresConfiguration } = localRequire(
      './lib/xyvala/infrastructure/postgres/postgres-configuration.ts');
    adapter = localRequire('./lib/xyvala/runtime/postgres/postgres-adapter.ts');
    if (adapter.POSTGRES_TRANSACTION_TLS_VERIFICATION_VERSION !== '1.0.0') {
      throw new InstallationError('TRANSACTION_TLS_VERIFICATION_ADAPTER_REQUIRED');
    }
    const { runMigrations } = localRequire('./lib/xyvala/runtime/migrations/migration-engine.ts');
    const { XYVALA_SCHEMA_MIGRATIONS: registry } = localRequire(
      './lib/xyvala/runtime/migrations/schema-definitions.ts');
    const id = '004_xyvala_search_temporal_observations';
    const reviewedIds = [
      '001_initial_xyvala_schema', '002_xyvala_schema_indexes',
      '003_xyvala_market_historical_observations', id,
    ];
    if (!Array.isArray(registry) || registry.length !== reviewedIds.length
      || registry.some((item, index) => item.id !== reviewedIds[index])) {
      throw new InstallationError('REGISTRY_REVIEW_REQUIRED');
    }
    const configuration = getPostgresConfiguration();
    if (configuration.status !== 'VALID' || configuration.tls_mode !== 'REQUIRED'
      || configuration.reject_unauthorized !== true) {
      throw new InstallationError('VERIFIED_TLS_CONFIGURATION_REQUIRED');
    }
    // These are independent operator assertions, never inferred from the URL.
    const expectedHost = process.env.XYVALA_SEARCH_EXPECTED_HOST;
    const expectedDatabase = process.env.XYVALA_SEARCH_EXPECTED_DATABASE;
    const expectedRole = process.env.XYVALA_SEARCH_EXPECTED_ROLE;
    if (process.env.XYVALA_SEARCH_MIGRATION_TARGET !== 'development'
      || process.env.NODE_ENV === 'production'
      || !expectedHost || !expectedDatabase || !expectedRole) {
      throw new InstallationError('EXPLICIT_DEVELOPMENT_TARGET_REQUIRED');
    }
    if (new URL(configuration.database_url).hostname !== expectedHost) {
      throw new InstallationError('TARGET_HOST_MISMATCH');
    }

    async function inspect() {
      let failure;
      const result = await adapter.withPostgresTransaction(async (transaction) => {
        try {
        const identity = await transaction.query(`
          SELECT current_database() = $1 AS database_matches,
                 current_user = $2 AS role_matches,
                 current_schema() = 'public' AS schema_matches,
                 to_regclass('xyvala_migrations') =
                   to_regclass('public.xyvala_migrations') AS journal_matches
        `, [expectedDatabase, expectedRole]);
        const row = identity.rows[0];
        if (identity.rows.length !== 1 || !row || Object.values(row).some((v) => v !== true)) {
          throw new InstallationError('TARGET_OR_JOURNAL_MISMATCH');
        }
        const history = await transaction.query(`
          SELECT id, name FROM public.xyvala_migrations ORDER BY id COLLATE "C"
        `);
        if (history.rows.length < 3 || history.rows.length > 4
          || history.rows.some((item, index) => item.id !== registry[index].id
            || item.name !== registry[index].name)) {
          throw new InstallationError('PRIOR_MIGRATION_HISTORY_MISMATCH');
        }
        const objects = await transaction.query(`
          SELECT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relname = ANY($1::text[])) AS relations_present,
            EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='xyvala_search_temporal_reject_mutation')
            AS function_present
        `, [[ 'xyvala_search_temporal_observations',
          'xyvala_search_temporal_observations_pkey',
          'xyvala_search_temporal_series_time_idx', 'xyvala_search_temporal_document_idx' ]]);
        const catalog = objects.rows[0];
        if (!catalog) throw new InstallationError('CATALOG_READ_INVALID');
        const recorded = history.rows.length === 4;
        if (!recorded && (catalog.relations_present || catalog.function_present)) {
          throw new InstallationError('UNRECORDED_SEARCH_OBJECTS');
        }
        return { recorded };
        } catch (error) {
          if (error instanceof InstallationError) failure = error;
          throw error;
        }
      }, 'REPEATABLE_READ_READ_ONLY');
      if (!result.ok) {
        if (result.outcome === 'NOT_STARTED' && [
          'postgres_transaction_tls_unverified',
          'postgres_transaction_tls_identity_unverified',
        ].includes(result.error)) {
          throw new InstallationError('VERIFIED_CLIENT_TLS_REQUIRED');
        }
        throw result.outcome === 'ROLLED_BACK' && failure
          ? failure : new InstallationError('PREFLIGHT_FAILED');
      }
      return result.data;
    }

    const before = await inspect();
    if (!apply || before.recorded) {
      console.log(JSON.stringify({
        ok: true, mode: 'DIAGNOSTIC', migration: id,
        state: before.recorded ? 'RECORDED_PHYSICAL_VALIDATION_REQUIRED' : 'READY_FOR_EXPLICIT_APPLY',
        schema_mutation: false, physical_schema_validated: false,
        client_tls_verified: true,
      }, null, 2));
      return;
    }
    // Complete canonical registry + exact pending scope checked under its lock.
    const result = await runMigrations(registry, [id]);
    console.log(JSON.stringify({
      ok: result.ok, mode: 'APPLY', migration: id,
      transaction_outcome: result.transaction_outcome,
      applied: result.applied.map((item) => item.id),
      error: result.error,
      physical_schema_validated: false,
      next: result.ok ? 'VALIDATE_PHYSICAL_SCHEMA'
        : result.transaction_outcome === 'UNKNOWN' ? 'RECONCILE_WITHOUT_RETRY' : 'INSPECT_FAILURE',
    }, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally {
    try { if (adapter) await adapter.closePostgresPool(); }
    catch {
      console.error(JSON.stringify({ ok: false, error: 'POOL_CLOSE_FAILED' }));
      process.exitCode = 1;
    }
    finally {
      Module._resolveFilename = originalResolve;
      if (originalTs) Module._extensions['.ts'] = originalTs;
      else delete Module._extensions['.ts'];
    }
  }
}

main().catch((error) => {
  // No connection strings, identity values, provider data, or raw exceptions.
  console.error(JSON.stringify({ ok: false, error: error instanceof InstallationError
    ? error.message : 'SEARCH_SCHEMA_INSTALLATION_STOPPED' }));
  process.exitCode = 1;
});
