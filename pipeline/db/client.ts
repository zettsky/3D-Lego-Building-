/**
 * Minimal database interface used by the whole pipeline, with two drivers:
 *  - PGlite (PostgreSQL in WASM) for development and tests, in memory or in a directory;
 *  - node-postgres (`pg`) for a real PostgreSQL server (production target).
 * Only parameterised queries are used. Every SQL feature we rely on is plain PostgreSQL.
 */
export interface QueryResult<T> {
  rows: T[];
  affectedRows?: number;
}

export interface Db {
  readonly driver: "pglite" | "pg";
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  /** Runs several statements without parameters (migrations). */
  exec(sql: string): Promise<void>;
  /** Runs `fn` inside BEGIN/COMMIT; rolls back on error. Nested calls reuse the outer transaction. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface OpenOptions {
  /** postgres://… → pg driver. Otherwise PGlite: a directory path, or omitted for in-memory. */
  url?: string;
}

export async function openDb(opts: OpenOptions = {}): Promise<Db> {
  const url = opts.url ?? process.env.DATABASE_URL;
  if (url && /^postgres(ql)?:\/\//.test(url)) return openPg(url);
  return openPglite(url ?? process.env.PGLITE_DIR);
}

async function openPglite(dir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = dir ? new PGlite(dir) : new PGlite();
  await pg.waitReady;
  const make = (inner: { query: typeof pg.query; exec: typeof pg.exec }, inTx: boolean): Db => ({
    driver: "pglite",
    async query<T>(sql: string, params?: unknown[]) {
      const r = await inner.query<T>(sql, params as unknown[] | undefined);
      return { rows: r.rows, affectedRows: r.affectedRows };
    },
    async exec(sql: string) {
      await inner.exec(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      if (inTx) return fn(make(inner, true));
      return pg.transaction(async (tx) => fn(make(tx as unknown as typeof inner, true)));
    },
    async close() {
      if (!inTx) await pg.close();
    },
  });
  return make(pg, false);
}

async function openPg(url: string): Promise<Db> {
  const { default: pgmod } = await import("pg");
  const pool = new pgmod.Pool({ connectionString: url, max: 5 });
  type Runner = { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }> };
  const make = (runner: Runner, inTx: boolean): Db => ({
    driver: "pg",
    async query<T>(sql: string, params?: unknown[]) {
      const r = await runner.query(sql, params);
      return { rows: r.rows as T[], affectedRows: r.rowCount ?? undefined };
    },
    async exec(sql: string) {
      await runner.query(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      if (inTx) return fn(make(runner, true));
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn(make(client as unknown as Runner, true));
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    async close() {
      if (!inTx) await pool.end();
    },
  });
  return make(pool as unknown as Runner, false);
}
