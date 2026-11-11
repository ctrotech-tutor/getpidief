import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
const url = process.env.TEST_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
const m = vi.hoisted(() => ({ auth: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/storage/private-pdf", () => ({ privatePdfKey: (v: string) => v === "uploadthing-private:abc123" ? "abc123" : null, getPrivatePdfUrl: m.sign }));

describe.skipIf(!enabled)("private PDF access with disposable PostgreSQL", () => {
  const ids = { author: randomUUID(), moderator: randomUUID(), student: randomUUID(), document: randomUUID() };
  let db: typeof import("@/lib/db/client").db;
  let get: typeof import("@/app/api/documents/[id]/file/route").GET;
  const request = () => new NextRequest(`http://localhost/api/documents/${ids.document}/file`);
  const params = { params: Promise.resolve({ id: ids.document }) };
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) throw new Error("Write tests require a local, disposable database whose name ends in _test");
    process.env.DATABASE_URL = url;
    ({ db } = await import("@/lib/db/client"));
    ({ GET: get } = await import("@/app/api/documents/[id]/file/route"));
    for (const name of ["author", "moderator", "student"] as const) {
      const id = ids[name];
      await db.execute(sql`INSERT INTO auth_users (id, email) VALUES (${id}::uuid, ${id + "@example.test"})`);
      await db.execute(sql`INSERT INTO users (id, username, display_name, role) VALUES (${id}::uuid, ${name + id.slice(0, 8)}, ${name}, ${name === "moderator" ? "moderator" : "student"}::user_role)`);
    }
    await db.execute(sql`INSERT INTO documents (id, slug, title, author_id, file_url, status, visibility) VALUES (${ids.document}::uuid, ${ids.document}, 'Private file test', ${ids.author}::uuid, 'uploadthing-private:abc123', 'pending', 'public')`);
    m.sign.mockResolvedValue("https://provider.example/signed");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("pdf", { status: 200 })));
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    if (db) { try { await db.execute(sql`DELETE FROM auth_users WHERE id IN (${ids.author}::uuid, ${ids.moderator}::uuid, ${ids.student}::uuid)`); } finally { await db.$client.end(); } }
  });
  it("enforces moderation status and current reviewer role", async () => {
    m.auth.mockResolvedValue(null); expect((await get(request(), params)).status).toBe(404);
    m.auth.mockResolvedValue({ user: { id: ids.student } }); expect((await get(request(), params)).status).toBe(404);
    m.auth.mockResolvedValue({ user: { id: ids.moderator } }); expect((await get(request(), params)).status).toBe(200);
    await db.execute(sql`UPDATE users SET status = 'suspended' WHERE id = ${ids.moderator}::uuid`);
    expect((await get(request(), params)).status).toBe(404);
  });
  it("allows approved public content but rejects flagged, private and deleted content", async () => {
    m.auth.mockResolvedValue(null);
    await db.execute(sql`UPDATE documents SET status = 'approved' WHERE id = ${ids.document}::uuid`);
    expect((await get(request(), params)).status).toBe(200);
    await db.execute(sql`UPDATE documents SET visibility = 'private' WHERE id = ${ids.document}::uuid`);
    expect((await get(request(), params)).status).toBe(404);
    await db.execute(sql`UPDATE documents SET visibility = 'public', status = 'flagged' WHERE id = ${ids.document}::uuid`);
    expect((await get(request(), params)).status).toBe(404);
    await db.execute(sql`UPDATE documents SET status = 'approved', deleted_at = now() WHERE id = ${ids.document}::uuid`);
    expect((await get(request(), params)).status).toBe(404);
  });
});
