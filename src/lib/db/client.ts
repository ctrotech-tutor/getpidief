import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// All application queries and transactions use the PostgreSQL wire protocol.
// This module is server-only and must not be imported by Edge runtime code.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");

// Reuse one bounded pool in a Node process, including during development reloads.
const globalForDb = globalThis as typeof globalThis & { getpidiefPool?: Pool };
const pool = globalForDb.getpidiefPool ?? new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
if (process.env.NODE_ENV !== "production") globalForDb.getpidiefPool = pool;

export const db = drizzle(pool, { schema, logger: process.env.NODE_ENV === "development" });
export function getPooledDb() { return db; }
export function getNodeDb() { return db; }

export async function withTransaction<T>(
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}

export type Database = typeof db;
export type { schema };
