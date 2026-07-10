/* ============================================================================
 * FILE: lib/xyvala/runtime/migrations/migration-engine.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala PostgreSQL migration engine
 *
 * ROLE
 * - register and execute deterministic database migrations
 * - preserve schema version history
 * - prevent duplicate migration execution
 * - prepare durable persistence for accounts, billing, organizations and audit
 *
 * PARENTS
 * - lib/xyvala/runtime/postgres/postgres-adapter.ts
 *
 * DIRECTIVES
 * - schema infrastructure only
 * - no business logic
 * - no UI logic
 * - no route response building
 * - no billing mutation rules
 * - no account mutation rules
 * - no RBAC rules
 * - no quota rules
 * - no Redis logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic migration execution only
 *
 * INVARIANTS
 * - migrations execute once
 * - migrations execute in declared order
 * - migration history is persisted before next migration
 * - failed migrations stop the sequence
 * - migration table is created before migration execution
 * ========================================================================== */

import {
  postgresQuery,
  type PostgresQueryResult,
} from "@/lib/xyvala/runtime/postgres/postgres-adapter";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MigrationDefinition = {
  id: string;
  name: string;
  sql: string;
};

export type AppliedMigration = {
  id: string;
  name: string;
  applied_at: string;
};

export type MigrationEngineResult = {
  ok: boolean;
  applied: AppliedMigration[];
  skipped: AppliedMigration[];
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS xyvala_migrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

function isValidMigration(migration: MigrationDefinition): boolean {
  return (
    safeString(migration.id).length > 0 &&
    safeString(migration.name).length > 0 &&
    safeString(migration.sql).length > 0
  );
}

/* ============================================================================
 * 4. MIGRATION TABLE
 * ========================================================================== */

export async function ensureMigrationTable(): Promise<PostgresQueryResult> {
  return postgresQuery(MIGRATION_TABLE_SQL);
}

export async function listAppliedMigrations(): Promise<AppliedMigration[]> {
  const result = await postgresQuery<AppliedMigration>(
    `
    SELECT id, name, applied_at::TEXT AS applied_at
    FROM xyvala_migrations
    ORDER BY id ASC;
    `,
  );

  return result.ok ? result.rows : [];
}

async function recordMigration(
  migration: MigrationDefinition,
): Promise<PostgresQueryResult> {
  return postgresQuery(
    `
    INSERT INTO xyvala_migrations (id, name)
    VALUES ($1, $2)
    ON CONFLICT (id) DO NOTHING;
    `,
    [migration.id, migration.name],
  );
}

/* ============================================================================
 * 5. EXECUTION
 * ========================================================================== */

export async function runMigrations(
  migrations: MigrationDefinition[],
): Promise<MigrationEngineResult> {
  const validMigrations = migrations.filter(isValidMigration);

  if (validMigrations.length !== migrations.length) {
    return {
      ok: false,
      applied: [],
      skipped: [],
      warnings: ["invalid_migration_definition"],
      error: "invalid_migration_definition",
    };
  }

  const table = await ensureMigrationTable();

  if (!table.ok) {
    return {
      ok: false,
      applied: [],
      skipped: [],
      warnings: uniqueWarnings(table.warnings, ["migration_table_failed"]),
      error: table.error ?? "migration_table_failed",
    };
  }

  const alreadyApplied = await listAppliedMigrations();
  const appliedIds = new Set(alreadyApplied.map((item) => item.id));

  const applied: AppliedMigration[] = [];
  const skipped: AppliedMigration[] = [];

  for (const migration of validMigrations) {
    if (appliedIds.has(migration.id)) {
      const existing = alreadyApplied.find((item) => item.id === migration.id);

      if (existing) {
        skipped.push(existing);
      }

      continue;
    }

    const executed = await postgresQuery(migration.sql);

    if (!executed.ok) {
      return {
        ok: false,
        applied,
        skipped,
        warnings: uniqueWarnings(
          executed.warnings,
          [`migration_failed:${migration.id}`],
        ),
        error: executed.error ?? `migration_failed:${migration.id}`,
      };
    }

    const recorded = await recordMigration(migration);

    if (!recorded.ok) {
      return {
        ok: false,
        applied,
        skipped,
        warnings: uniqueWarnings(
          recorded.warnings,
          [`migration_record_failed:${migration.id}`],
        ),
        error: recorded.error ?? `migration_record_failed:${migration.id}`,
      };
    }

    applied.push({
      id: migration.id,
      name: migration.name,
      applied_at: new Date().toISOString(),
    });

    appliedIds.add(migration.id);
  }

  return {
    ok: true,
    applied,
    skipped,
    warnings: [],
    error: null,
  };
}
