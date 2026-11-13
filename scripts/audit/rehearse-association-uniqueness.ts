/** Rollback-only experiment for an isolated local test database. NOT a production migration. */
import { Client } from "pg";
import { inspectAssociations } from "./association-integrity";

type Result = { removed: Record<string, number>; after: Awaited<ReturnType<typeof inspectAssociations>> };
export async function rehearseAssociationUniqueness(url: string, confirmed: boolean): Promise<Result> {
  const target = new URL(url);
  if (!confirmed || target.protocol !== "postgres:" && target.protocol !== "postgresql:" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
      !/^\/[a-zA-Z0-9_]+_test$/.test(target.pathname) || target.search || target.hash) {
    throw new Error("Requires explicit confirmation and an isolated local _test database URL without parameters.");
  }
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL lock_timeout = '2s'");
      await client.query("SET LOCAL statement_timeout = '30s'");
      // A local rehearsal takes write-conflicting table locks until rollback.
      // This is intentionally NOT an online production rollout plan.
      await client.query("LOCK TABLE public.user_interests, public.document_tags, public.document_course_codes IN SHARE ROW EXCLUSIVE MODE");
      const before = await inspectAssociations(client);
      if (before.risks.conflicting_course_code_groups !== "0") throw new Error("Conflicting course-code values require a reviewed policy.");
      const removed: Record<string, number> = {};
      for (const [table, first, second] of [
        ["user_interests", "user_id", "tag_id"],
        ["document_tags", "document_id", "tag_id"],
        ["document_course_codes", "document_id", "course_code_id"],
      ] as const) {
        // Identifiers are fixed constants, never supplied by the user. Earliest
        // timestamp wins; ctid breaks ties only within this rollback-only run.
        const result = await client.query(`DELETE FROM public.${table} t USING (
          SELECT ctid, row_number() OVER (PARTITION BY ${first}, ${second} ORDER BY created_at, ctid) AS n FROM public.${table}
        ) d WHERE t.ctid=d.ctid AND d.n > 1`);
        removed[table] = result.rowCount ?? 0;
        await client.query(`CREATE UNIQUE INDEX rehearsal_${table}_pair ON public.${table} (${first}, ${second})`);
      }
      const after = await inspectAssociations(client);
      if (after.duplicates.some(row => row.excess_rows !== "0")) throw new Error("Deduplication verification failed.");
      return { removed, after };
    } finally {
      // No commit path: even successful DDL and deletes must disappear.
      await client.query("ROLLBACK");
    }
  } finally { await client.end(); }
}

if (require.main === module) {
  const url = process.env.TEST_DATABASE_URL ?? "";
  rehearseAssociationUniqueness(url, process.env.ASSOCIATION_REHEARSAL_WRITE === "yes")
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(() => { console.error("Rehearsal failed; verify target, confirmation, conflicts, permissions, and lock/statement timeouts. No commit was requested."); process.exitCode = 1; });
}
