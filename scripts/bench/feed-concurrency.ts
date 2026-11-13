import { assertLocalTestDatabase } from "../lib/local-test-database";
/** Writes synthetic data: use only a newly migrated, disposable local database. */
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

function target() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || process.env.BENCH_WRITE !== "yes") throw new Error("Set TEST_DATABASE_URL and BENCH_WRITE=yes for an isolated local test database.");
  return assertLocalTestDatabase(url);
}
const id = (s: string) => createHash("md5").update(s).digest("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
async function main() {
  const url = target(); const monitor = new Pool({ connectionString: url, max: 1 });
  if (process.argv.includes("--seed")) {
    const client = await monitor.connect();
    try {
      await client.query("BEGIN");
      const tables = await client.query<{ name: string }>("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'");
      for (const { name } of tables.rows) {
        const safe = '"' + name.replaceAll('"', '""') + '"';
        const result = await client.query(`SELECT EXISTS (SELECT 1 FROM public.${safe}) AS occupied`);
        if (result.rows[0].occupied) throw new Error("Refusing to seed: public tables are not empty.");
      }
      await client.query(`INSERT INTO auth_users (id,email) SELECT md5('bench-user-'||i)::uuid, 'concurrency-'||i||'@example.test' FROM generate_series(1,240) i`);
      await client.query(`INSERT INTO users (id,username,display_name,onboarding_complete) SELECT md5('bench-user-'||i)::uuid, 'concurrency-'||i, 'Benchmark', true FROM generate_series(1,240) i`);
      await client.query(`INSERT INTO posts (id,author_id,kind,body) SELECT md5('bench-post-'||i)::uuid,md5('bench-user-'||i)::uuid,'thought','Synthetic benchmark' FROM generate_series(1,120) i`);
      await client.query(`INSERT INTO posts (id,author_id,kind,body) SELECT md5('bench-hot-post-'||i)::uuid,md5('bench-user-1')::uuid,'thought','Synthetic benchmark' FROM generate_series(1,120) i`);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    await monitor.end(); console.log("Synthetic concurrency fixtures created."); return;
  }
  // Verify the complete expected fixtures before deleting benchmark likes.
  const fixture = await monitor.query(`SELECT
    (SELECT count(*) FROM auth_users) AS auth_count,
    (SELECT count(*) FROM users) AS user_count,
    (SELECT count(*) FROM posts) AS post_count,
    (SELECT count(*) FROM generate_series(1,240) i JOIN users u ON u.id = md5('bench-user-'||i)::uuid AND u.username = 'concurrency-'||i JOIN auth_users a ON a.id=u.id AND a.email='concurrency-'||i||'@example.test') AS matched_users,
    (SELECT count(*) FROM generate_series(1,120) i JOIN posts p ON p.id=md5('bench-post-'||i)::uuid AND p.author_id=md5('bench-user-'||i)::uuid AND p.body='Synthetic benchmark') +
    (SELECT count(*) FROM generate_series(1,120) i JOIN posts p ON p.id=md5('bench-hot-post-'||i)::uuid AND p.author_id=md5('bench-user-1')::uuid AND p.body='Synthetic benchmark') AS matched_posts`);
  const { auth_count, user_count, post_count, matched_users, matched_posts } = fixture.rows[0];
  if ([auth_count, user_count, matched_users].some(v => v !== '240') || [post_count, matched_posts].some(v => v !== '240')) throw new Error("Expected exclusive synthetic fixtures not found; refusing to write.");
  const runtimeUrl = new URL(url); runtimeUrl.searchParams.set("application_name", "feed-concurrency-benchmark");
  process.env.DATABASE_URL = runtimeUrl.toString(); Object.assign(process.env, { NODE_ENV: "production" });
  const { db } = await import("../../src/lib/db/client");
  const { withPostInteraction } = await import("../../src/lib/feed/interaction-transaction");
  const modes = ["different authors", "same author, different posts", "same post"] as const;
  for (const mode of modes) for (const concurrency of [5, 20]) {
    await monitor.query(`DELETE FROM post_likes WHERE user_id IN (SELECT md5('bench-user-'||i)::uuid FROM generate_series(121,240) i) AND post_id IN (SELECT md5('bench-post-'||i)::uuid FROM generate_series(1,120) i UNION ALL SELECT md5('bench-hot-post-'||i)::uuid FROM generate_series(1,120) i)`);
    let next = 0; let failed = 0; let maxPoolWaiters = 0; let maxLockWaiters = 0; let sampling = false; let samplePromise: Promise<void> = Promise.resolve();
    const durations: number[] = []; const started = performance.now();
    const timer = setInterval(() => {
      maxPoolWaiters = Math.max(maxPoolWaiters, db.$client.waitingCount);
      if (sampling) return; sampling = true;
      samplePromise = monitor.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND application_name='feed-concurrency-benchmark' AND wait_event_type='Lock'`).then(result => { maxLockWaiters = Math.max(maxLockWaiters, result.rows[0].n); }).finally(() => { sampling = false; });
    }, 5);
    async function worker() {
      for (;;) {
        const n = next++; if (n >= 120) return;
        const viewer = id(`bench-user-${n + 121}`);
        const post = id(mode === "different authors" ? `bench-post-${n + 1}` : mode === "same post" ? "bench-hot-post-1" : `bench-hot-post-${n + 1}`);
        const start = performance.now();
        try { await withPostInteraction(viewer, post, async tx => { await tx.execute(sql`INSERT INTO post_likes(post_id,user_id) VALUES (${post}::uuid,${viewer}::uuid) ON CONFLICT DO NOTHING`); }); }
        catch { failed++; }
        durations.push(performance.now() - start);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker)); clearInterval(timer); await samplePromise;
    const elapsed = performance.now() - started;
    const count = await monitor.query("SELECT count(*)::int AS n FROM post_likes");
    durations.sort((a,b) => a-b);
    const percentile = (p: number) => durations[Math.ceil(durations.length * p) - 1].toFixed(2);
    console.log(`${mode}; concurrency=${concurrency}; operations=120; failed=${failed}; rows=${count.rows[0].n}; elapsed=${elapsed.toFixed(1)}ms; p50=${percentile(.5)}ms; p95=${percentile(.95)}ms; max=${durations.at(-1)?.toFixed(2)}ms; sampled pool waiters=${maxPoolWaiters}; sampled lock waiters=${maxLockWaiters}`);
    if (failed || count.rows[0].n !== 120) throw new Error("Unexpected interaction results.");
  }
  await db.$client.end(); await monitor.end();
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Benchmark failed"); process.exitCode = 1; });
