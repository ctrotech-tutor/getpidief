import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("feed refresh event selection", () => {
  const viewer = randomUUID(), author = randomUUID(), reposter = randomUUID(), post = randomUUID(), hiddenPost = randomUUID(), repost = randomUUID();
  let db: typeof import("@/lib/db/client").db;
  let read: typeof import("@/lib/feed/read").readFeed;
  beforeAll(async () => {
    const target = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !target.pathname.endsWith("_test") || target.search) throw new Error("Requires an isolated local _test database");
    process.env.DATABASE_URL = url;
    ({db} = await import("@/lib/db/client")); ({readFeed: read} = await import("@/lib/feed/read"));
    for (const id of [viewer,author,reposter]) {
      await db.execute(sql`INSERT INTO auth_users(id,email) VALUES (${id}::uuid,${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users(id,username,display_name,onboarding_complete) VALUES (${id}::uuid,${"u"+id.replaceAll("-","")},'Fixture',true)`);
    }
    await db.execute(sql`INSERT INTO posts(id,author_id,kind,body,created_at) VALUES (${post}::uuid,${author}::uuid,'thought','original','2026-01-01 00:00:00+00'),(${hiddenPost}::uuid,${reposter}::uuid,'thought','deleted','2026-01-01 00:00:00+00')`);
    await db.execute(sql`UPDATE posts SET deleted_at=now() WHERE id=${hiddenPost}::uuid`);
    await db.execute(sql`INSERT INTO post_reposts(id,post_id,user_id,created_at) VALUES (${repost}::uuid,${post}::uuid,${reposter}::uuid,'2026-01-02 00:00:00+00')`);
    await db.execute(sql`INSERT INTO follows(follower_id,following_id) VALUES (${viewer}::uuid,${author}::uuid)`);
    await db.execute(sql`INSERT INTO post_saves(user_id,post_id) VALUES (${viewer}::uuid,${post}::uuid)`);
  });
  afterAll(async () => { if (!db) return; try { for(const id of [viewer,author,reposter]) await db.execute(sql`DELETE FROM auth_users WHERE id=${id}::uuid`); } finally { await db.$client.end(); } });
  const keys = [{kind:"post" as const,id:post},{kind:"post" as const,id:post},{kind:"repost" as const,id:repost},{kind:"post" as const,id:hiddenPost},{kind:"repost" as const,id:randomUUID()},{kind:"repost" as const,id:post}];
  it("returns only the requested distinct live events in chronological order", async () => {
    expect(await read(viewer,"latest",undefined,undefined,undefined,[])).toEqual({items:[],hasMore:false});
    const all = await read(viewer,"latest",undefined,undefined,undefined,keys);
    expect(all.items.map(x=>[x.eventKind,x.eventId])).toEqual([["repost",repost],["post",post]]);
    expect(all.hasMore).toBe(false);
    const posts = await read(viewer,"latest",undefined,undefined,undefined,[{kind:"post",id:post}]);
    expect(posts.items.map(x=>x.eventId)).toEqual([post]);
    const reposts = await read(viewer,"latest",undefined,undefined,undefined,[{kind:"repost",id:repost}]);
    expect(reposts.items.map(x=>x.eventId)).toEqual([repost]);
    const cursor = await read(viewer,"latest",repost,"repost","2026-01-02T00:00:00.000000Z",keys);
    expect(cursor.items.map(x=>x.eventId)).toEqual([post]);
  });
  it("rechecks followed actors, saved state, and blocks on either side", async () => {
    expect((await read(viewer,"following",undefined,undefined,undefined,keys)).items.map(x=>x.eventId)).toEqual([post]);
    expect((await read(viewer,"saved",undefined,undefined,undefined,keys)).items.map(x=>x.eventId)).toEqual([post]);
    for (const [from,to] of [[viewer,reposter],[reposter,viewer]]) {
      await db.execute(sql`INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (${from}::uuid,${to}::uuid)`);
      try { expect((await read(viewer,"latest",undefined,undefined,undefined,keys)).items.map(x=>x.eventId)).toEqual([post]); }
      finally { await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id=${from}::uuid AND blocked_id=${to}::uuid`); }
    }
    await db.execute(sql`UPDATE users SET status='suspended' WHERE id=${author}::uuid`);
    try { expect((await read(viewer,"latest",undefined,undefined,undefined,keys)).items).toEqual([]); }
    finally { await db.execute(sql`UPDATE users SET status='active' WHERE id=${author}::uuid`); }
  });
});
