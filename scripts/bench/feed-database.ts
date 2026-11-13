import { assertLocalTestDatabase } from "../lib/local-test-database";
/** Disposable local benchmark only: never run against production or personal data. */
import { Pool } from "pg";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { PgDialect } from "drizzle-orm/pg-core";

function target(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL to a disposable local database ending in _test.");
  return assertLocalTestDatabase(url);
}
const id = (value: string) => createHash("md5").update(value).digest("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
const queries = [
  `INSERT INTO auth_users(id,email) SELECT md5('u'||i)::uuid, 'bench'||i||'@example.test' FROM generate_series(1,1000) i`,
  `INSERT INTO users(id, username, display_name, onboarding_complete) SELECT md5('u'||i)::uuid,'bench'||i,'Benchmark',true FROM generate_series(1,1000) i`,
  `INSERT INTO follows(follower_id,following_id) SELECT md5('u1')::uuid,md5('u'||i)::uuid FROM generate_series(4,103) i`,
  `INSERT INTO follows(follower_id,following_id) SELECT md5('u2')::uuid,md5('u4')::uuid`,
  `INSERT INTO user_blocks(blocker_id,blocked_id) SELECT md5('u1')::uuid, md5('u'||i)::uuid FROM generate_series(98,103) i`,
  `INSERT INTO posts(id,author_id,kind,body,created_at) SELECT md5('p'||i)::uuid,md5('u'||((i%1000)+1))::uuid,'thought','benchmark post', '2026-01-01 00:00:00+00'::timestamptz-(i||' seconds')::interval FROM generate_series(1,100000) i`,
  `INSERT INTO post_reposts(id,post_id,user_id,created_at) SELECT md5('r'||i)::uuid,md5('p'||((i*3)%100000+1))::uuid,md5('u'||((i%1000)+1))::uuid,'2026-01-01 00:00:00+00'::timestamptz-(i||' seconds')::interval FROM generate_series(1,30000) i`,
  `INSERT INTO post_replies(id,post_id,author_id,body,created_at) SELECT md5('c'||i)::uuid,md5('p'||((i*7)%100000+1))::uuid,md5('u'||((i%1000)+1))::uuid,'benchmark reply','2026-01-01 00:00:00+00'::timestamptz-(i||' seconds')::interval FROM generate_series(1,100000) i`,
  `INSERT INTO post_likes(post_id,user_id) SELECT md5('p'||i)::uuid,md5('u'||((i%1000)+1))::uuid FROM generate_series(1,100000) i`,
  `INSERT INTO post_saves(post_id,user_id) SELECT md5('p'||i)::uuid,md5('u1')::uuid FROM generate_series(1,5000) i`,
  `UPDATE users SET status='suspended' WHERE username IN ('bench90','bench91')`,
];
async function main() {
  const url = target(); const pool = new Pool({ connectionString: url, max: 1 });
  let appPool: { end(): Promise<void> } | undefined;
  try {
  if (process.argv.includes("--seed")) {
    if (process.env.BENCH_WRITE !== "yes") throw new Error("Set BENCH_WRITE=yes to seed an EMPTY disposable local test database.");
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const tables = await c.query<{ name: string }>(`SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'`);
      for (const { name } of tables.rows) {
        const safeName = '"' + name.replaceAll('"', '""') + '"';
        const present = await c.query(`SELECT EXISTS (SELECT 1 FROM public.${safeName}) AS occupied`);
        if (present.rows[0].occupied) throw new Error("Refusing to seed: database is not empty.");
      }
      for (const q of queries) await c.query(q);
      await c.query('COMMIT');
    }
    catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
    await pool.query('ANALYZE'); console.log('Synthetic fixtures created.'); return;
  }
  process.env.DATABASE_URL = url; Object.assign(process.env, { NODE_ENV: 'production' });
  const { db } = await import('../../src/lib/db/client'); appPool = db.$client; const { readFeed } = await import('../../src/lib/feed/read');
  const { discoveryCandidates } = await import('../../src/lib/feed/discovery');
  const { usersRepository } = await import('../../src/lib/db/repositories/users');
  const dialect = new PgDialect(); const captured: { sql: string; params: unknown[] }[] = [];
  const original = db.execute.bind(db);
  // Capture only for local EXPLAIN; never print SQL parameters.
  (db as any).execute = (query: any) => { captured.push(dialect.sqlToQuery(query)); return original(query); };
  const deepTime = '2025-12-31T10:06:40.000000Z';
  const scenarios: [string, () => Promise<unknown>][] = [
    ['for-you candidates', () => discoveryCandidates(id('u1'))],
    ['for-you 20 IDs', () => readFeed(id('u1'), 'latest', undefined, undefined, undefined, Array.from({length:20}, (_,i) => ({kind: 'post' as const, id: id('p'+(i+1))})))],
    ['refresh 140 posts', () => readFeed(id('u1'), 'latest', undefined, undefined, undefined, Array.from({length:140}, (_,i) => ({kind: 'post' as const, id: id('p'+(i+1))})))],
    ['refresh 140 mixed', () => readFeed(id('u1'), 'latest', undefined, undefined, undefined, Array.from({length:140}, (_,i) => i%2 === 0 ? ({kind: 'post' as const, id: id('p'+(i+1))}) : ({kind: 'repost' as const, id: id('r'+(i+1))})))],
    ['following 100 accounts', () => readFeed(id('u1'), 'following')],
    ['following 1 account', () => readFeed(id('u2'), 'following')],
    ['following none', () => readFeed(id('u3'), 'following')],
    ['following deep', () => readFeed(id('u1'), 'following', id('p50000'), 'post', deepTime)],
    ['latest first', () => readFeed(id('u1'), 'latest')],
    ['saved first', () => readFeed(id('u1'), 'saved')],
    ['people suggestions', () => usersRepository.getFollowSuggestions(id('u1'), 3)],
  ];
  for (const [name, run] of scenarios) {
    await run(); const times: number[] = [];
    for (let i=0; i<10; i++) { captured.length = 0; const t = performance.now(); await run(); times.push(performance.now()-t); }
    times.sort((a,b)=>a-b); const q = captured[0];
    const explain = await pool.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+q.sql, q.params);
    const plan = explain.rows[0]['QUERY PLAN'][0];
    console.log(`${name}: median(lower middle)=${times[4].toFixed(2)}ms sample-max=${times[9].toFixed(2)}ms plan=${plan['Execution Time'].toFixed(2)}ms shared_hits=${plan.Plan['Shared Hit Blocks']}`);
  }
  } finally { await appPool?.end(); await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Benchmark failed'); process.exitCode = 1; });
