/** Synthetic, disposable local PostgreSQL only; never point this at production. */
import { createHash } from "node:crypto";
import { Pool } from "pg";
function target() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL to a disposable local _test database.");
  const parsed = new URL(url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !/^\/[a-zA-Z0-9_]+_test$/.test(parsed.pathname)) throw new Error("Only local databases ending in _test are allowed.");
  return url;
}
const id = (s: string) => createHash("md5").update(s).digest("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
const seedQueries = [
`INSERT INTO auth_users(id,email) SELECT md5('u'||i)::uuid, 'bench'||i||'@example.test' FROM generate_series(1,1000) i`,
`INSERT INTO users(id, username, display_name, onboarding_complete) SELECT md5('u'||i)::uuid,'bench'||i,'Benchmark',true FROM generate_series(1,1000) i`,
`INSERT INTO user_blocks(blocker_id,blocked_id) SELECT md5('u1')::uuid,md5('u'||i)::uuid FROM generate_series(2,20) i`,
`INSERT INTO documents (id,slug,title,description,author_id,file_url,status,visibility, published_at, download_count, search_vector) SELECT md5('d'||i)::uuid,'bench-'||i,CASE WHEN i%100=0 THEN 'Rare astronomy study' ELSE 'Common biology study' END,'Reference notes',md5('u'||((i%1000)+1))::uuid,'local-only',CASE WHEN i%10=0 THEN 'pending'::document_status ELSE 'approved'::document_status END,CASE WHEN i%20=1 THEN 'private'::visibility ELSE 'public'::visibility END,now()-(i||' seconds')::interval, i%100, to_tsvector('english',CASE WHEN i%100=0 THEN 'Rare astronomy study' ELSE 'Common biology study' END) FROM generate_series(1,100000) i`,
`INSERT INTO notifications (id,recipient_id,sender_id,type,title,message,is_read,created_at) SELECT md5('n'||i)::uuid,CASE WHEN i<=50000 THEN md5('u1')::uuid ELSE md5('u'||((i%999)+2))::uuid END, CASE WHEN i%20=0 THEN NULL ELSE md5('u'||((i%999)+2))::uuid END, 'follow','Notification','Test notification', i%5<>0, now()-(i||' seconds')::interval FROM generate_series(1,100000) i`, `UPDATE documents SET status='approved' WHERE title='Rare astronomy study'`];
async function main() {
  const url = target();
  const pool = new Pool({ connectionString: url, max: 1 });
  if (process.argv.includes("--seed")) {
    if (process.env.BENCH_WRITE !== "yes") throw new Error("Set BENCH_WRITE=yes to seed a new empty disposable database.");
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const tables = await c.query<{ name: string }>("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'");
      for (const { name } of tables.rows) {
        const safe = '"' + name.replaceAll('"', '""') + '"';
        const r = await c.query(`SELECT EXISTS (SELECT 1 FROM public.${safe}) AS occupied`);
        if (r.rows[0].occupied) throw new Error("Refusing to seed: database is not empty.");
      }
      for (const query of seedQueries) await c.query(query);
      await c.query("COMMIT");
    } catch (error) { await c.query("ROLLBACK"); throw error; }
    finally { c.release(); }
    await pool.query("ANALYZE"); await pool.end(); console.log("Synthetic fixtures created."); return;
  }
  process.env.DATABASE_URL = url; Object.assign(process.env, { NODE_ENV: "production" });
  const { db } = await import("../../src/lib/db/client");
  const { searchDocuments } = await import("../../src/lib/search/search");
  const { notificationsRepository } = await import("../../src/lib/db/repositories/notifications");
  const captured: { text: string; values: unknown[] }[] = [];
  const original = db.$client.query.bind(db.$client);
  (db.$client as any).query = (...args: any[]) => {
    const cfg = args[0]; const text = typeof cfg === "string" ? cfg : cfg.text;
    const values = Array.isArray(args[1]) ? args[1] : (cfg.values ?? []);
    captured.push({ text, values }); return (original as any)(...args);
  };
 const scenarios:[string,()=>Promise<any>][]=[['search common',()=>searchDocuments({query:'biology',limit:25},id('u1'))],['search rare',()=>searchDocuments({query:'astronomy',limit:25},id('u1'))],['search empty',()=>searchDocuments({query:'',limit:25},id('u1'))],['search deep',()=>searchDocuments({query:'biology',limit:25,page:100},id('u1'))],['search no-results page',()=>searchDocuments({query:'astronomy',limit:25,page:100},id('u1'))],['notifications list',()=>notificationsRepository.getForUser(id('u1'))],['notifications deep',()=>notificationsRepository.getForUser(id('u1'),{page:100,limit:30})],['notifications unread',()=>notificationsRepository.getUnreadCount(id('u1'))]];
 for(let [name,fn] of scenarios){await fn();let times:number[]=[];let result:any;for(let n=0;n<5;n++){captured.length=0;let t=performance.now();result=await fn();times.push(performance.now()-t)}times.sort((a,b)=>a-b);console.log('\n'+name,'p50',times[2].toFixed(1),'max',times[4].toFixed(1),'total',result?.total); for(const [i,q] of captured.entries()){let res=await pool.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+q.text,q.values);let p=res.rows[0]['QUERY PLAN'][0];console.log(i,'exec',p['Execution Time'],'hits',p.Plan['Shared Hit Blocks']);/* Do not log SQL, parameters, or plans containing personal data. */}}
  await pool.end(); await db.$client.end();
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Benchmark failed"); process.exitCode = 1; });
