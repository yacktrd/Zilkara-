/* ============================================================================
 * FILE: lib/xyvala/search/contracts/search-temporal-postgres-transaction-port-contract.ts
 *
 * Search-owned consumer contract for the PostgreSQL transaction capability
 * required by Search temporal observation persistence.
 *
 * Search owns only the capability shape it consumes.
 * PostgreSQL configuration, connections, transaction lifecycle and provider
 * binding remain external responsibilities.
 *
 * No runtime implementation, fallback or transaction reconstruction lives here.
 * ========================================================================== */

export const XYVALA_SEARCH_TEMPORAL_POSTGRES_TRANSACTION_PORT_CONTRACT_VERSION =
  "1.0.0" as const;

export type SearchTemporalPostgresTransactionMode =
  | "READ_COMMITTED"
  | "REPEATABLE_READ_READ_ONLY";

export interface SearchTemporalPostgresQueryResult {
  readonly rows: readonly unknown[];
  readonly row_count: number | null;
}

export interface SearchTemporalPostgresTransactionClient {
  readonly query: (
    sql: string,
    values?: readonly unknown[],
  ) => Promise<SearchTemporalPostgresQueryResult>;
}

export type SearchTemporalPostgresTransactionResult<T> =
  | Readonly<{
      ok: true;
      outcome: "COMMITTED";
      data: T;
    }>
  | Readonly<{
      ok: false;
      outcome: "ROLLED_BACK" | "UNKNOWN";
    }>;

export type SearchTemporalPostgresWithTransaction = <T>(
  work: (client: SearchTemporalPostgresTransactionClient) => Promise<T>,
  mode: SearchTemporalPostgresTransactionMode,
) => Promise<SearchTemporalPostgresTransactionResult<T>>;
