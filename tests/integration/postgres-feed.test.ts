import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";

const url = process.env.TEST_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
const m = vi.hoisted(() => ({ auth: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); }, notFound: () => { throw new Error("NOT_FOUND"); }, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/redis/client", () => ({ redisRateLimit: {}, rateLimiters: { feedPost: { limit: async () => ({ success: true }) }, comment: { limit: async () => ({ success: true }) }, report: { limit: async () => ({ success: true }) } } }));

describe.skipIf(!enabled)("feed with disposable PostgreSQL", () => {
  const ids = { author: randomUUID(), reader: randomUUID(), moderator: randomUUID() };
  let db: typeof import("@/lib/db/client").db;
  let actions: typeof import("@/app/(app)/home/actions");
  let review: typeof import("@/app/admin/feed-reports/actions").reviewFeedReport;
  let home: typeof import("@/app/(app)/home/page").default;
  let discussion: typeof import("@/app/(app)/home/post/[id]/page").default;
  let postId: string; let replyId: string;
  const as = (id: string) => m.auth.mockResolvedValue({ user: { id } });
  const form = (values: Record<string, string>) => { const f = new FormData(); for (const [key, value] of Object.entries(values)) f.set(key, value); return f; };
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Write tests require a local, disposable database whose name ends in _test");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    actions = await import("@/app/(app)/home/actions");
    ({ reviewFeedReport: review } = await import("@/app/admin/feed-reports/actions"));
    ({ default: home } = await import("@/app/(app)/home/page"));
    ({ default: discussion } = await import("@/app/(app)/home/post/[id]/page"));
    for (const [name, id] of Object.entries(ids)) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${name + id.slice(0, 8)}, ${name}, ${name === "moderator" ? "moderator" : "student"}::user_role, true)`);
    }
  });
  afterAll(async () => {
    if (!db) return;
    try {
      await db.execute(sql`DELETE FROM audit_logs WHERE admin_id = ${ids.moderator}::uuid`);
      await db.execute(sql`DELETE FROM auth_users WHERE id IN (${ids.author}::uuid, ${ids.reader}::uuid, ${ids.moderator}::uuid)`);
    } finally { await db.$client.end(); }
  });
  it("creates and reads a post and reply through the feed queries", async () => {
    as(ids.author); await actions.createPost(form({ kind: "question", body: "What is a useful way to learn?" }));
    const rows = (await db.execute<{id: string}>(sql`SELECT id FROM posts WHERE author_id = ${ids.author}::uuid`)).rows;
    expect(rows).toHaveLength(1); postId = rows[0].id;
    as(ids.reader); await actions.reply(form({ postId, body: "Practise and discuss." }));
    replyId = (await db.execute<{id: string}>(sql`SELECT id FROM post_replies WHERE post_id = ${postId}::uuid`)).rows[0].id;
    expect(await home({ searchParams: Promise.resolve({}) })).toBeTruthy();
    expect(await discussion({ params: Promise.resolve({ id: postId }), searchParams: Promise.resolve({}) })).toBeTruthy();
  });
  it("filters blocked post authors in both directions and rejects direct post access and interactions", async () => {
    await db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${ids.reader}::uuid, ${ids.author}::uuid)`);
    for (const [viewer, target] of [[ids.reader, ids.author], [ids.author, ids.reader]]) {
      as(viewer);
      const targetPost = target === ids.author ? postId : randomUUID();
      if (target === ids.reader) await db.execute(sql`INSERT INTO posts (id, author_id, kind, body) VALUES (${targetPost}::uuid, ${ids.reader}::uuid, 'thought', 'Blocked reader content')`);
      const markup = renderToStaticMarkup(await home({ searchParams: Promise.resolve({}) }));
      expect(markup).not.toContain(target === ids.author ? "What is a useful way to learn?" : "Blocked reader content");
      await expect(discussion({ params: Promise.resolve({ id: targetPost }), searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
      await expect(actions.toggleLike(form({ postId: targetPost, active: "false" }))).rejects.toThrow("Post unavailable");
      if (target === ids.reader) await db.execute(sql`DELETE FROM posts WHERE id = ${targetPost}::uuid`);
    }
    await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id = ${ids.reader}::uuid AND blocked_id = ${ids.author}::uuid`);
  });
  it("does not let a viewer report a blocked person's reply through a direct ID", async () => {
    const otherPost = randomUUID(), otherReply = randomUUID();
    await db.execute(sql`INSERT INTO posts (id, author_id, kind, body) VALUES (${otherPost}::uuid, ${ids.moderator}::uuid, 'thought', 'Another post')`);
    await db.execute(sql`INSERT INTO post_replies (id, post_id, author_id, body) VALUES (${otherReply}::uuid, ${otherPost}::uuid, ${ids.author}::uuid, 'A blocked reply')`);
    await db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${ids.reader}::uuid, ${ids.author}::uuid)`);
    as(ids.reader);
    await expect(actions.reportFeedContent(form({ postId: otherPost, replyId: otherReply, reason: "spam" }))).rejects.toThrow("Reply unavailable");
    await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id = ${ids.reader}::uuid AND blocked_id = ${ids.author}::uuid`);
    await db.execute(sql`DELETE FROM posts WHERE id = ${otherPost}::uuid`);
  });
  it("paginates posts that share a timestamp without losing or duplicating rows", async () => {
    for (let i = 0; i < 24; i++) await db.execute(sql`INSERT INTO posts (author_id, kind, body, created_at) VALUES (${ids.author}::uuid, 'thought', ${`Cursor fixture ${i}`}, '2026-01-01 00:00:00.123456+00'::timestamptz)`);
    as(ids.reader);
    const first = renderToStaticMarkup(await home({ searchParams: Promise.resolve({}) }));
    const cursor = first.match(/before=([0-9a-f-]{36})/i)?.[1];
    expect(cursor).toBeTruthy();
    const second = renderToStaticMarkup(await home({ searchParams: Promise.resolve({ before: cursor }) }));
    const names = [...first.matchAll(/Cursor fixture (\d+)/g), ...second.matchAll(/Cursor fixture (\d+)/g)].map(m => Number(m[1]));
    expect(names).toHaveLength(24);
    expect(new Set(names).size).toBe(24);
  });
  it("shows only followed authors in the following feed and preserves the view when paging", async () => {
    as(ids.reader);
    const empty = renderToStaticMarkup(await home({ searchParams: Promise.resolve({ view: "following" }) }));
    expect(empty).toContain("Your circle starts here.");
    expect(empty).not.toContain("Cursor fixture");
    await db.execute(sql`INSERT INTO follows (follower_id, following_id) VALUES (${ids.reader}::uuid, ${ids.author}::uuid)`);
    const first = renderToStaticMarkup(await home({ searchParams: Promise.resolve({ view: "following" }) }));
    expect(first).toContain("Cursor fixture");
    expect(first).toContain("view=following&amp;before=");
    await db.execute(sql`DELETE FROM follows WHERE follower_id = ${ids.reader}::uuid AND following_id = ${ids.author}::uuid`);
  });
  it("shows real followed accounts in the right rail, excludes blocked and inactive users, and updates after unfollow", async () => {
    const person = randomUUID(), hidden = randomUUID();
    try {
      for (const [id, name] of [[person, "Rail Person"], [hidden, "Rail Hidden"]]) {
        await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
        await db.execute(sql`INSERT INTO users (id, username, display_name, role, onboarding_complete) VALUES (${id}::uuid, ${"rail" + id.replaceAll("-", "")}, ${name}, 'student'::user_role, true)`);
      }
      as(ids.reader);
      await db.execute(sql`INSERT INTO follows (follower_id, following_id) VALUES (${ids.reader}::uuid, ${person}::uuid), (${ids.reader}::uuid, ${hidden}::uuid)`);
      await db.execute(sql`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${hidden}::uuid, ${ids.reader}::uuid)`);
      const markup = renderToStaticMarkup(await home({ searchParams: Promise.resolve({}) }));
      const rail = markup.split('aria-labelledby="following-accounts-title"')[1].split('</section>')[0];
      expect(rail).toContain('Rail Person');
      expect(rail).toContain('/u/rail' + person.replaceAll('-', ''));
      expect(rail).toContain('/dashboard/following');
      expect(rail).not.toContain('Rail Hidden');
      expect(markup.indexOf('following-accounts-title')).toBeLessThan(markup.indexOf('recent-resources-title'));
      await db.execute(sql`DELETE FROM follows WHERE follower_id = ${ids.reader}::uuid AND following_id = ${person}::uuid`);
      const empty = renderToStaticMarkup(await home({ searchParams: Promise.resolve({}) }));
      const emptyRail = empty.split('aria-labelledby="following-accounts-title"')[1].split('</section>')[0];
      expect(emptyRail).toContain('not following anyone yet');
      expect(emptyRail).not.toContain('Rail Person');
      await db.execute(sql`DELETE FROM user_blocks WHERE blocker_id = ${hidden}::uuid AND blocked_id = ${ids.reader}::uuid`);
      await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${hidden}::uuid`);
      const inactive = renderToStaticMarkup(await home({ searchParams: Promise.resolve({}) }));
      expect(inactive.split('aria-labelledby="following-accounts-title"')[1].split('</section>')[0]).not.toContain('Rail Hidden');
    } finally {
      for (const id of [person, hidden]) await db.execute(sql`DELETE FROM auth_users WHERE id = ${id}::uuid`);
    }
  });
  it("reposts idempotently, attributes the event, and allows undo", async () => {
    as(ids.reader);
    await Promise.all(Array.from({ length: 4 }, () => actions.setRepost(form({ postId, repost: "true" }))));
    expect((await db.execute<{ n: number }>(sql`SELECT count(*)::int as n FROM post_reposts WHERE post_id = ${postId}::uuid AND user_id = ${ids.reader}::uuid`)).rows[0].n).toBe(1);
    const feed = renderToStaticMarkup(await home({ searchParams: Promise.resolve({}) }));
    expect(feed).toContain("reader</a> reposted");
    as(ids.moderator);
    await db.execute(sql`INSERT INTO follows (follower_id, following_id) VALUES (${ids.moderator}::uuid, ${ids.reader}::uuid)`);
    const following = renderToStaticMarkup(await home({ searchParams: Promise.resolve({ view: "following" }) }));
    expect(following).toContain("reader</a> reposted");
    expect(following).toContain("What is a useful way to learn?");
    as(ids.reader);
    await actions.setRepost(form({ postId, repost: "false" }));
    await actions.setRepost(form({ postId, repost: "false" }));
    expect((await db.execute<{ n: number }>(sql`SELECT count(*)::int as n FROM post_reposts WHERE post_id = ${postId}::uuid`)).rows[0].n).toBe(0);
    await expect(actions.setRepost(form({ postId, repost: "invalid" }))).rejects.toThrow("Invalid repost");
  });
  it("paginates mixed posts and reposts sharing a timestamp", async () => {
    const timestamp = "2026-02-01 00:00:00.123456+00";
    for (let i = 0; i < 24; i++) {
      const id = randomUUID();
      await db.execute(sql`INSERT INTO posts (id, author_id, kind, body, created_at) VALUES (${id}::uuid, ${ids.author}::uuid, 'thought', ${`Mixed fixture ${i}`}, ${timestamp}::timestamptz)`);
      await db.execute(sql`INSERT INTO post_reposts (post_id, user_id, created_at) VALUES (${id}::uuid, ${ids.reader}::uuid, ${timestamp}::timestamptz)`);
    }
    as(ids.moderator);
    let params: { before?: string; beforeKind?: string } = {};
    const seen: string[] = [];
    for (let page = 0; page < 4; page++) {
      const markup = renderToStaticMarkup(await home({ searchParams: Promise.resolve(params) }));
      seen.push(...Array.from(markup.matchAll(/Mixed fixture (\d+)/g), m => m[1]));
      const match = markup.match(/before=([0-9a-f-]{36})(?:&amp;beforeKind=(repost))?/i);
      if (!match) break;
      params = { before: match[1], beforeKind: match[2] };
    }
    expect(seen).toHaveLength(48);
    for (let i = 0; i < 24; i++) expect(seen.filter(x => x === String(i))).toHaveLength(2);
    await db.execute(sql`DELETE FROM posts WHERE body LIKE 'Mixed fixture %' AND author_id = ${ids.author}::uuid`);
  });
  it("makes repeated likes and saves idempotent and blocks another user deleting the post", async () => {
    as(ids.reader);
    await Promise.all(Array.from({ length: 6 }, () => actions.toggleLike(form({ postId, active: "false" }))));
    await Promise.all(Array.from({ length: 6 }, () => actions.toggleSave(form({ postId, active: "false" }))));
    expect(Number((await db.execute<{n: number}>(sql`SELECT count(*)::int as n FROM post_likes WHERE post_id = ${postId}::uuid`)).rows[0].n)).toBe(1);
    expect(Number((await db.execute<{n: number}>(sql`SELECT count(*)::int as n FROM post_saves WHERE post_id = ${postId}::uuid`)).rows[0].n)).toBe(1);
    await actions.deletePost(form({ postId }));
    expect((await db.execute<{deleted_at: Date | null}>(sql`SELECT deleted_at FROM posts WHERE id = ${postId}::uuid`)).rows[0].deleted_at).toBeNull();
    expect(await home({ searchParams: Promise.resolve({ view: "saved" }) })).toBeTruthy();
  });
  it("allows only the reply author to remove their reply", async () => {
    as(ids.author); await actions.deleteReply(form({ postId, replyId }));
    expect((await db.execute<{deleted_at: Date | null}>(sql`SELECT deleted_at FROM post_replies WHERE id = ${replyId}::uuid`)).rows[0].deleted_at).toBeNull();
    as(ids.reader); await actions.deleteReply(form({ postId, replyId }));
    expect((await db.execute<{deleted_at: Date | null}>(sql`SELECT deleted_at FROM post_replies WHERE id = ${replyId}::uuid`)).rows[0].deleted_at).not.toBeNull();
    as(ids.author); await actions.reply(form({ postId, body: "Another reply for reporting." }));
    replyId = (await db.execute<{id: string}>(sql`SELECT id FROM post_replies WHERE post_id = ${postId}::uuid AND deleted_at IS NULL`)).rows[0].id;
  });
  it("reports and removes a reply without hiding its post", async () => {
    as(ids.reader);
    await expect(actions.reportFeedContent(form({ postId, replyId, reason: "harassment" }))).rejects.toThrow("REDIRECT:");
    const report = (await db.execute<{id: string}>(sql`SELECT id FROM feed_reports WHERE reply_id = ${replyId}::uuid`)).rows[0];
    as(ids.moderator); await review(form({ reportId: report.id, decision: "removed", note: "Reviewed reply" }));
    expect((await db.execute<{deleted_at: Date | null}>(sql`SELECT deleted_at FROM post_replies WHERE id = ${replyId}::uuid`)).rows[0].deleted_at).not.toBeNull();
    expect((await db.execute<{deleted_at: Date | null}>(sql`SELECT deleted_at FROM posts WHERE id = ${postId}::uuid`)).rows[0].deleted_at).toBeNull();
  });
  it("rejects self reports and deduplicates concurrent reports", async () => {
    as(ids.author);
    await expect(actions.reportFeedContent(form({ postId, reason: "spam" }))).rejects.toThrow("own content");
    as(ids.reader);
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => actions.reportFeedContent(form({ postId, reason: "spam" }))));
    expect(results.every(r => r.status === "rejected" && String(r.reason).includes("REDIRECT:"))).toBe(true);
    expect((await db.execute<{n: number}>(sql`SELECT count(*)::int as n FROM feed_reports WHERE post_id = ${postId}::uuid AND reply_id IS NULL`)).rows[0].n).toBe(1);
    await expect(actions.reportFeedContent(form({ postId, replyId, reason: "spam" }))).rejects.toThrow("Reply unavailable");
  });
  it("requires a current moderator role and records a removal in the same transaction", async () => {
    const reportId = (await db.execute<{id: string}>(sql`SELECT id FROM feed_reports WHERE post_id = ${postId}::uuid AND reply_id IS NULL`)).rows[0].id;
    const data = form({ reportId, decision: "removed", note: "Reviewed as spam" });
    as(ids.reader); await expect(review(data)).rejects.toThrow("Not authorized");
    as(ids.moderator); await review(data);
    expect((await db.execute<{status: string}>(sql`SELECT status FROM feed_reports WHERE id = ${reportId}::uuid`)).rows[0].status).toBe("removed");
    expect((await db.execute<{deleted_at: Date | null}>(sql`SELECT deleted_at FROM posts WHERE id = ${postId}::uuid`)).rows[0].deleted_at).not.toBeNull();
    expect((await db.execute<{n: number}>(sql`SELECT count(*)::int AS n FROM audit_logs WHERE entity_id = ${reportId}::uuid`)).rows[0].n).toBe(1);
    await expect(review(data)).rejects.toThrow("already been reviewed");
    await expect(actions.reply(form({ postId, body: "Should fail" }))).rejects.toThrow("Post unavailable");
  });
});
