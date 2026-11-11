import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

// Explicit opt-in: never fall back to DATABASE_URL, which may be production.
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("isolated PostgreSQL connectivity", () => {
  it("uses the PostgreSQL wire protocol and rolls a transaction back", async () => {
    const previousUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = url;
    const { db, withTransaction } = await import("@/lib/db/client");
    try {
      const result = await db.execute<{ value: number }>(sql`SELECT 1 AS value`);
      expect(result.rows[0].value).toBe(1);
      await expect(withTransaction(async (tx) => {
        await tx.execute(sql`CREATE TEMP TABLE getpidief_rollback_test (value integer) ON COMMIT DROP`);
        await tx.execute(sql`INSERT INTO getpidief_rollback_test VALUES (1)`);
        throw new Error("rollback test");
      })).rejects.toThrow("rollback test");
      const check = await db.execute<{ name: string | null }>(sql`SELECT to_regclass('pg_temp.getpidief_rollback_test')::text AS name`);
      expect(check.rows[0].name).toBeNull();
    } finally {
      await db.$client.end();
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
    }
  });
});
