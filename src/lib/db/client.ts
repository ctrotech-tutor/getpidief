import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import ws from "ws";
import * as schema from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT STRATEGY
//
// We use THREE different clients depending on context:
//
// 1. HTTP (serverless)  — Next.js Edge Functions, API Routes, Server Components
//    ✅ No connection state, cold-start safe, works on Vercel Edge
//
// 2. WebSocket Pool     — Long-running contexts needing transactions
//    ✅ Real transactions, use in Server Actions with BEGIN/COMMIT
//
// 3. Node-postgres      — Inngest workers, migration scripts, seeding
//    ✅ Full pg features, not edge-compatible
//
// ─────────────────────────────────────────────────────────────────────────────

// Configure Neon WebSocket for non-edge environments
if (typeof process !== "undefined" && process.env.NEXT_RUNTIME !== "edge") {
  neonConfig.webSocketConstructor = ws;
}

// ── 1. HTTP Client (default — use this everywhere unless you need transactions) ──

const httpSql = neon(DATABASE_URL);

export const db = drizzleNeon(httpSql, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

// ── 2. Pool Client (for Server Actions that need transactions) ─────────────────

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: DATABASE_URL });
  }
  return _pool;
}

export function getPooledDb() {
  return drizzlePool(getPool(), { schema, logger: false });
}

// ── 3. Node client (for scripts / Inngest workers) ────────────────────────────

export function getNodeDb() {
  const { Pool: PgPool } = require("pg");
  const pool = new PgPool({ connectionString: DATABASE_URL });
  return drizzleNode(pool, { schema, logger: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION HELPER  (wraps pooled client)
// ─────────────────────────────────────────────────────────────────────────────

export async function withTransaction<T>(
  callback: (tx: ReturnType<typeof getPooledDb>) => Promise<T>
): Promise<T> {
  const pooledDb = getPooledDb();
  return pooledDb.transaction(callback as any);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export type Database = typeof db;
export type { schema };