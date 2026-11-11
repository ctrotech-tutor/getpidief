import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

// Only disposable, local databases with an explicit opt-in may receive fixtures.
const url = process.env.TEST_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), send: vi.fn(), trigger: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: mocks.send } }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger: mocks.trigger }, CHANNELS: { privateDocument: (id: string) => id }, EVENTS: { REACTION_UPDATED: "reaction", COMMENT_POSTED: "comment" } }));
vi.mock("@/lib/redis/client", () => ({ redis: null, incrCounter: async () => {}, rateLimiters: { report: { limit: async () => ({ success: true }) }, comment: { limit: async () => ({ success: true }) } }, KEYS: { viewCountBuffer: (id: string) => id, followerCount: (id: string) => id, userFollowingList: (id: string) => id }, invalidateCache: async () => {} }));

describe.skipIf(!enabled)("real PostgreSQL social mutations", () => {
  const ids = { actor: randomUUID(), author: randomUUID(), mod: randomUUID(), doc: randomUUID(), privateDoc: randomUUID(), category: randomUUID(), institution: randomUUID(), upload: randomUUID() };
  let db: typeof import("@/lib/db/client").db;
  let bookmark: typeof import("@/app/api/bookmarks/route");
  let reaction: typeof import("@/app/api/documents/[id]/react/route");
  let views: typeof import("@/app/api/documents/[id]/view/route");
  let reports: typeof import("@/app/api/reports/route");
  let comments: typeof import("@/app/api/comments/route");
  let commentActions: typeof import("@/app/api/comments/[id]/route");
  let submission: typeof import("@/app/api/documents/route");
  let usersRepo: typeof import("@/lib/db/repositories/users").usersRepository;
  let resolveReport: typeof import("@/lib/moderation/reports").resolveReport;
  const request = (body: unknown, method = "POST") => new NextRequest("http://localhost/api", { method, body: JSON.stringify(body) });
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) {
      throw new Error("Write tests require a local, disposable database whose name ends in _test");
    }
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    bookmark = await import("@/app/api/bookmarks/route");
    reaction = await import("@/app/api/documents/[id]/react/route");
    views = await import("@/app/api/documents/[id]/view/route");
    reports = await import("@/app/api/reports/route");
    comments = await import("@/app/api/comments/route");
    commentActions = await import("@/app/api/comments/[id]/route");
    submission = await import("@/app/api/documents/route");
    ({ usersRepository: usersRepo } = await import("@/lib/db/repositories/users"));
    ({ resolveReport } = await import("@/lib/moderation/reports"));
    mocks.auth.mockResolvedValue({ user: { id: ids.actor } });
    mocks.send.mockResolvedValue(undefined); mocks.trigger.mockResolvedValue(undefined);
    for (const [name, id] of [["actor", ids.actor], ["author", ids.author], ["mod", ids.mod]]) {
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role) VALUES (${id}::uuid, ${name + id.slice(0, 8)}, ${name}, ${name === "mod" ? "moderator" : "student"}::user_role)`);
    }
    await db.execute(sql`INSERT INTO categories (id, name, slug) VALUES (${ids.category}::uuid, 'Test category', ${ids.category})`);
    await db.execute(sql`INSERT INTO institutions (id, name, slug, country, country_code) VALUES (${ids.institution}::uuid, 'Test institution', ${ids.institution}, 'Test', 'TT')`);
    await db.execute(sql`INSERT INTO document_uploads (id, user_id, storage_key, file_url, file_size, expires_at) VALUES (${ids.upload}::uuid, ${ids.actor}::uuid, ${ids.upload}, 'https://example.test/owned.pdf', 1234, now() + interval '1 hour')`);
    for (const [id, visibility] of [[ids.doc, "public"], [ids.privateDoc, "private"]]) {
      await db.execute(sql`INSERT INTO documents (id, slug, title, author_id, file_url, status, visibility) VALUES (${id}::uuid, ${id}, 'Test document', ${ids.author}::uuid, 'https://example.test/file.pdf', 'approved', ${visibility}::visibility)`);
    }
  });
  afterAll(async () => {
    if (!db) return;
    try {
      await db.execute(sql`DELETE FROM audit_logs WHERE admin_id = ${ids.mod}::uuid`);
      await db.execute(sql`DELETE FROM auth_users WHERE id IN (${ids.actor}::uuid, ${ids.author}::uuid, ${ids.mod}::uuid)`);
      await db.execute(sql`DELETE FROM categories WHERE id = ${ids.category}::uuid`);
      await db.execute(sql`DELETE FROM institutions WHERE id = ${ids.institution}::uuid`);
    } finally { await db.$client.end(); }
  });

  it("serializes duplicate bookmarks and removals without drifting counters", async () => {
    const data = { documentId: ids.doc };
    const saved = await Promise.all(Array.from({ length: 8 }, () => bookmark.POST(request(data))));
    expect(saved.map((r) => r.status)).toEqual(Array(8).fill(200));
    const [row] = (await db.execute<{ bookmark_count: number }>(sql`SELECT bookmark_count FROM documents WHERE id = ${ids.doc}::uuid`)).rows;
    expect(row.bookmark_count).toBe(1);
    const removed = await Promise.all(Array.from({ length: 8 }, () => bookmark.DELETE(request(data, "DELETE"))));
    expect(removed.map((r) => r.status)).toEqual(Array(8).fill(200));
    expect((await db.execute<{ bookmark_count: number }>(sql`SELECT bookmark_count FROM documents WHERE id = ${ids.doc}::uuid`)).rows[0].bookmark_count).toBe(0);
    expect((await bookmark.POST(request({ documentId: ids.privateDoc }))).status).toBe(404);
  });
  it("keeps follow counts correct under repeated concurrent requests", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => usersRepo.follow(ids.actor, ids.author)));
    expect(results.filter((r) => r.changed)).toHaveLength(1);
    const rows = (await db.execute<{ id: string; following_count: number; follower_count: number }>(sql`SELECT id, following_count, follower_count FROM users WHERE id IN (${ids.actor}::uuid, ${ids.author}::uuid)`)).rows;
    expect(rows.find((r) => r.id === ids.actor)?.following_count).toBe(1);
    expect(rows.find((r) => r.id === ids.author)?.follower_count).toBe(1);
    await Promise.all(Array.from({ length: 8 }, () => usersRepo.unfollow(ids.actor, ids.author)));
    const end = (await db.execute<{ following_count: number }>(sql`SELECT following_count FROM users WHERE id = ${ids.actor}::uuid`)).rows[0];
    expect(end.following_count).toBe(0);
  });
  it("serializes retry-safe reactions and prevents private reactions", async () => {
    const response = await Promise.all(Array.from({ length: 8 }, () => reaction.POST(request({ reaction: "like" }), params(ids.doc))));
    expect(response.map((r) => r.status)).toEqual(Array(8).fill(200));
    const [row] = (await db.execute<{ like_count: number }>(sql`SELECT like_count FROM documents WHERE id = ${ids.doc}::uuid`)).rows;
    expect(row.like_count).toBe(1);
    expect((await reaction.POST(request({ reaction: "like" }), params(ids.privateDoc))).status).toBe(404);
  });
  it("serializes duplicate reports and competing resolutions", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => reports.POST(request({ documentId: ids.doc, reasons: ["spam"] }))));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    const [report] = (await db.execute<{ id: string }>(sql`SELECT id FROM document_reports WHERE document_id = ${ids.doc}::uuid AND reported_by_user_id = ${ids.actor}::uuid`)).rows;
    const outcomes = await Promise.all(["actioned", "dismissed"].map((decision) => resolveReport(ids.mod, { documentId: ids.doc, reportId: report.id, decision: decision as "actioned" | "dismissed", note: "Reviewed report" })));
    expect(outcomes.map((r) => r.outcome).sort()).toEqual(["conflict", "updated"]);
    expect((await db.execute<{ count: string }>(sql`SELECT count(*) FROM audit_logs WHERE entity_id = ${report.id}::uuid`)).rows[0].count).toBe("1");
  });
  it("consumes one upload receipt only once under concurrent submission", async () => {
    const body = { title: "Verified test resource", uploadId: ids.upload, categoryId: ids.category,
      institutionId: ids.institution, resourceType: "other", visibility: "public", fileUrl: "http://127.0.0.1/unsafe", fileSize: 1 };
    const results = await Promise.all(Array.from({ length: 6 }, () => submission.POST(request(body))));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 404)).toHaveLength(5);
    const rows = (await db.execute<{ file_url: string; file_size: string }>(sql`SELECT file_url, file_size FROM documents WHERE author_id = ${ids.actor}::uuid`)).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ file_url: "https://example.test/owned.pdf", file_size: "1234" });
  });
  it("persists concurrent comments and updates the document count", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => comments.POST(request({ documentId: ids.doc, content: `test comment ${i}` }))));
    expect(results.map((r) => r.status)).toEqual(Array(5).fill(201));
    expect((await db.execute<{ comment_count: number }>(sql`SELECT comment_count FROM documents WHERE id = ${ids.doc}::uuid`)).rows[0].comment_count).toBe(5);
    expect((await comments.POST(request({ documentId: ids.privateDoc, content: "hidden" }))).status).toBe(404);
  });
  it("protects comment edits and preserves replies after deleting their parent", async () => {
    const created = await comments.POST(request({ documentId: ids.doc, content: "Original parent" }));
    expect(created.status).toBe(201);
    const parentId = (await created.json()).data.comment.id as string;
    const replied = await comments.POST(request({ documentId: ids.doc, parentId, content: "Independent reply" }));
    expect(replied.status).toBe(201);
    const replyId = (await replied.json()).data.comment.id as string;
    const votes = await Promise.all(Array.from({ length: 6 }, () => commentActions.PATCH(request({ action: "helpful" }, "PATCH"), params(parentId))));
    expect(votes.every((r) => r.status === 200)).toBe(true);
    const count = await db.execute<{ helpful_count: number }>(sql`SELECT helpful_count FROM comments WHERE id = ${parentId}::uuid`);
    expect(count.rows[0].helpful_count).toBe(1);
    mocks.auth.mockResolvedValue({ user: { id: ids.author } });
    expect((await commentActions.PATCH(request({ content: "hijacked" }, "PATCH"), params(parentId))).status).toBe(403);
    expect((await commentActions.DELETE(request({}, "DELETE"), params(parentId))).status).toBe(403);
    mocks.auth.mockResolvedValue({ user: { id: ids.actor } });
    expect((await commentActions.PATCH(request({ content: "Edited parent" }, "PATCH"), params(parentId))).status).toBe(200);
    const deletes = await Promise.all(Array.from({ length: 4 }, () => commentActions.DELETE(request({}, "DELETE"), params(parentId))));
    expect(deletes.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    const list = await comments.GET(new NextRequest(`http://localhost/api/comments?documentId=${ids.doc}`));
    const data = await list.json();
    const tombstone = data.data.comments.find((c: { id: string }) => c.id === parentId);
    expect(tombstone).toMatchObject({ content: "[deleted]", isDeleted: true, userId: null, user: null, replyCount: 1 });
    expect(tombstone.replies[0].id).toBe(replyId);
    const children = await comments.GET(new NextRequest(`http://localhost/api/comments?documentId=${ids.doc}&parentId=${parentId}`));
    expect(children.status).toBe(200);
    expect((await db.execute<{ comment_count: number }>(sql`SELECT comment_count FROM documents WHERE id = ${ids.doc}::uuid`)).rows[0].comment_count).toBe(6);
    expect((await commentActions.DELETE(request({}, "DELETE"), params(replyId))).status).toBe(200);
    const final = await comments.GET(new NextRequest(`http://localhost/api/comments?documentId=${ids.doc}`));
    expect((await final.json()).data.comments.some((c: { id: string }) => c.id === parentId)).toBe(false);
    expect((await db.execute<{ comment_count: number }>(sql`SELECT comment_count FROM documents WHERE id = ${ids.doc}::uuid`)).rows[0].comment_count).toBe(5);
  });

  it("denies mutations on inaccessible comments and validates requests", async () => {
    const hidden = randomUUID();
    await db.execute(sql`INSERT INTO comments (id, document_id, user_id, content) VALUES (${hidden}::uuid, ${ids.privateDoc}::uuid, ${ids.actor}::uuid, 'Private text')`);
    expect((await commentActions.PATCH(request({ action: "helpful" }, "PATCH"), params(hidden))).status).toBe(404);
    expect((await commentActions.DELETE(request({}, "DELETE"), params(hidden))).status).toBe(404);
    expect((await commentActions.PATCH(request({ content: " " }, "PATCH"), params(hidden))).status).toBe(400);
    expect((await commentActions.PATCH(request({ action: "helpful", content: "ambiguous" }, "PATCH"), params(hidden))).status).toBe(400);
    await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${ids.actor}::uuid`);
    const result = await comments.POST(request({ documentId: ids.doc, content: "should not post" }));
    expect(result.status).toBe(404);
    await db.execute(sql`UPDATE users SET status = 'active' WHERE id = ${ids.actor}::uuid`);
  });

  it("records only public document views without storing authentication cookies", async () => {
    const viewRequest = () => new NextRequest("http://localhost/view", { method: "POST", headers: { cookie: "__session=sensitive-cookie", referer: "https://example.test/private?token=secret" } });
    expect((await views.POST(viewRequest(), params(ids.privateDoc))).status).toBe(404);
    expect((await views.POST(viewRequest(), params(ids.doc))).status).toBe(200);
    const rows = (await db.execute<{ session_id: string; referrer: string | null }>(sql`SELECT session_id, referrer FROM document_views WHERE document_id = ${ids.doc}::uuid`)).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].session_id).not.toContain("sensitive-cookie");
    expect(rows[0].referrer).toBeNull();
  });

});
