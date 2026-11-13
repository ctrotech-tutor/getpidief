/** Synthetic, disposable local database only. Never point this at hosted data. */
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import { PgDialect } from "drizzle-orm/pg-core";
function target() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL to a disposable local _test database.");
  const parsed = new URL(url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !/^\/[a-zA-Z0-9_]+_test$/.test(parsed.pathname)) throw new Error("Only local databases ending in _test are allowed.");
  return url;
}
const id = (s: string) => createHash("md5").update(s).digest("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
async function main() {
  const url = target(); const pool = new Pool({ connectionString: url, max: 1 });
  let appPool: { end(): Promise<void> } | undefined;
  try {
  if (process.argv.includes("--seed")) {
    if (process.env.BENCH_WRITE !== "yes") throw new Error("Set BENCH_WRITE=yes to seed a new empty disposable database.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const tables = await client.query<{name: string}>("SELECT tablename AS name FROM pg_tables WHERE schemaname='public'");
      for (const { name } of tables.rows) {
        const safe = '"' + name.replaceAll('"', '""') + '"';
        if ((await client.query(`SELECT EXISTS (SELECT 1 FROM public.${safe}) AS occupied`)).rows[0].occupied) throw new Error("Refusing to seed: database is not empty.");
      }
      await client.query(`INSERT INTO institutions(id,name,slug,country,country_code) SELECT md5('bench-inst-'||i)::uuid,'Institution '||i,'bench-inst-'||i,'Test','TT' FROM generate_series(1,5) i`);
      await client.query(`INSERT INTO tags(id,name,slug) SELECT md5('bench-tag-'||i)::uuid,'Tag '||i,'bench-tag-'||i FROM generate_series(1,100) i`);
      await client.query(`INSERT INTO auth_users(id,email) SELECT md5('bench-user-'||i)::uuid,'bench-'||i||'@example.test' FROM generate_series(1,50000) i`);
      await client.query(`INSERT INTO users(id,username,display_name,onboarding_complete,institution_id,follower_count) SELECT md5('bench-user-'||i)::uuid,'bench-'||i,'Benchmark',true,CASE WHEN i%7=0 THEN NULL ELSE md5('bench-inst-'||((i%5)+1))::uuid END, i%500 FROM generate_series(1,50000) i`);
      await client.query(`INSERT INTO user_interests(user_id,tag_id) SELECT md5('bench-user-'||i)::uuid,md5('bench-tag-'||((i*17+j*13)%100+1))::uuid FROM generate_series(3,50000) i CROSS JOIN generate_series(1,5) j`);
      await client.query(`INSERT INTO user_interests(user_id,tag_id) SELECT md5('bench-user-1')::uuid,md5('bench-tag-'||i)::uuid FROM generate_series(1,5) i`);
      await client.query(`INSERT INTO user_interests(user_id,tag_id) SELECT md5('bench-user-3')::uuid,md5('bench-tag-'||i)::uuid FROM generate_series(6,55) i`);
      await client.query(`INSERT INTO follows(follower_id,following_id) SELECT md5('bench-user-1')::uuid,md5('bench-user-'||i)::uuid FROM generate_series(4,103) i`);
      await client.query(`INSERT INTO user_blocks(blocker_id,blocked_id) SELECT md5('bench-user-1')::uuid,md5('bench-user-'||i)::uuid FROM generate_series(104,113) i`);
      await client.query(`INSERT INTO user_blocks(blocker_id,blocked_id) SELECT md5('bench-user-'||i)::uuid,md5('bench-user-1')::uuid FROM generate_series(114,123) i`);
      await client.query(`UPDATE users SET status='suspended' WHERE username IN ('bench-124','bench-125')`);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    await pool.query("ANALYZE"); console.log("Synthetic people fixtures created."); return;
  }
  process.env.DATABASE_URL = url; Object.assign(process.env, { NODE_ENV: "production" });
  const { db } = await import("../../src/lib/db/client");
  appPool = db.$client;
  const { usersRepository } = await import("../../src/lib/db/repositories/users");
  const dialect = new PgDialect(); const captured: { sql: string; params: unknown[] }[] = []; const original = db.execute.bind(db);
  (db as any).execute = (query: any) => { captured.push(dialect.sqlToQuery(query)); return original(query); };
  const scenarios: [string, string, number][] = [["five interests", "bench-user-1", 0], ["no interests", "bench-user-2", 0], ["many interests", "bench-user-3", 0], ["deep offset", "bench-user-1", 1000]];
  for (const [name, viewer, offset] of scenarios.filter(([name]) => !process.env.BENCH_SCENARIO || name === process.env.BENCH_SCENARIO)) {
    const run = () => usersRepository.getFollowSuggestions(id(viewer), 26, offset);
    await run(); const durations: number[] = [];
    for (let i = 0; i < 5; i++) { captured.length = 0; const start = performance.now(); await run(); durations.push(performance.now()-start); }
    durations.sort((a,b)=>a-b); const query = captured[0];
    const result = await pool.query("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) "+query.sql, query.params);
    const plan = result.rows[0]["QUERY PLAN"][0];
    console.log(`${name}: median=${durations[2].toFixed(2)}ms max=${durations[4].toFixed(2)}ms plan=${plan["Execution Time"].toFixed(2)}ms hits=${plan.Plan["Shared Hit Blocks"]}`);
  }
  } finally {
    await appPool?.end();
    await pool.end();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Benchmark failed"); process.exitCode = 1; });
