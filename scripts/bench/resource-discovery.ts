import { assertLocalTestDatabase } from "../lib/local-test-database";
/** Synthetic benchmark: disposable, isolated local _test databases only. */
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import { PgDialect } from "drizzle-orm/pg-core";
const id = (s: string) => createHash("md5").update(s).digest("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
async function main() {
  const url = assertLocalTestDatabase(process.env.TEST_DATABASE_URL);
  const pool = new Pool({ connectionString: url, max: 1 });
  let appPool: { end(): Promise<void> } | undefined;
  try {
    if (process.argv.includes("--seed")) {
      if (process.env.BENCH_WRITE !== "yes") throw new Error("Set BENCH_WRITE=yes to seed an empty disposable database.");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const tables = await client.query<{ name: string }>("SELECT tablename AS name FROM pg_tables WHERE schemaname='public'");
        for (const { name } of tables.rows) {
          const safe = '"' + name.replaceAll('"', '""') + '"';
          if ((await client.query(`SELECT EXISTS(SELECT 1 FROM public.${safe}) AS occupied`)).rows[0].occupied) throw new Error("Refusing to seed: database is not empty.");
        }
        await client.query(`INSERT INTO auth_users(id,email) SELECT md5('bench-user-'||i)::uuid, 'bench-'||i||'@example.test' FROM generate_series(1,101) i`);
        await client.query(`INSERT INTO users(id,username,display_name,onboarding_complete) SELECT md5('bench-user-'||i)::uuid, 'bench-'||i, 'Benchmark', true FROM generate_series(1,101) i`);
        await client.query(`INSERT INTO tags(id,name,slug) SELECT md5('bench-tag-'||i)::uuid,'Tag '||i,'bench-tag-'||i FROM generate_series(1,100) i`);
        await client.query(`INSERT INTO user_interests(user_id,tag_id) SELECT md5('bench-user-1')::uuid,md5('bench-tag-'||i)::uuid FROM generate_series(1,5) i`);
        await client.query(`INSERT INTO documents(id,slug,title,author_id,file_url,status,visibility,published_at,trending_score) SELECT md5('bench-doc-'||i)::uuid, 'bench-doc-'||i, 'Synthetic resource', md5('bench-user-'||((i%100)+2))::uuid, 'test.pdf', 'approved', 'public', now(), i%100 FROM generate_series(1,50000) i`);
        await client.query(`INSERT INTO document_tags(document_id,tag_id) SELECT md5('bench-doc-'||i)::uuid,md5('bench-tag-'||((i*7+j*13)%100+1))::uuid FROM generate_series(1,50000) i CROSS JOIN generate_series(1,3) j`);
        await client.query(`INSERT INTO document_views(user_id,document_id) SELECT md5('bench-user-1')::uuid,md5('bench-doc-'||i)::uuid FROM generate_series(1,500) i`);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
      await pool.query("ANALYZE"); console.log("Synthetic resource fixtures created."); return;
    }
    process.env.DATABASE_URL = url; Object.assign(process.env, { NODE_ENV: "production" });
    const { db } = await import("../../src/lib/db/client"); appPool = db.$client;
    const { documentsRepository } = await import("../../src/lib/db/repositories/documents");
    const dialect = new PgDialect(), captured: {sql: string; params: unknown[]}[] = [];
    const original = db.execute.bind(db);
    (db as any).execute = (query: any) => { captured.push(dialect.sqlToQuery(query)); return original(query); };
    for (const [label, user] of [["five interests and 500 views", "bench-user-1"], ["no interests or views", "bench-user-2"]]) {
      const run = () => documentsRepository.getRecommended(id(user), 6);
      await run(); const samples: number[] = [];
      for (let i=0; i<5; i++) { captured.length = 0; const start = performance.now(); await run(); samples.push(performance.now()-start); }
      samples.sort((a,b)=>a-b);
      const plan = (await pool.query("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + captured[0].sql, captured[0].params)).rows[0]["QUERY PLAN"][0];
      console.log(`${label}: median=${samples[2].toFixed(2)}ms max=${samples[4].toFixed(2)}ms rank-plan=${plan["Execution Time"].toFixed(2)}ms hits=${plan.Plan["Shared Hit Blocks"]}`);
    }
  } finally { await appPool?.end(); await pool.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Benchmark failed"); process.exitCode = 1; });
