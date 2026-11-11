import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";

const url = process.env.TEST_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
const m = vi.hoisted(() => ({ auth: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
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
