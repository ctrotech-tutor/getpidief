import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
const url = process.env.TEST_DATABASE_URL;
const auth = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth/auth", () => ({ auth: async () => ({ user: { id: auth.id } }) }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: vi.fn().mockResolvedValue(undefined) } }));

describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("document tag integrity on PostgreSQL", () => {
  const user = randomUUID(), category = randomUUID(), institution = randomUUID(), tag = randomUUID(), receipt = randomUUID();
  const name = `topic-${tag}`;
  let db: typeof import("@/lib/db/client").db;
  let post: typeof import("@/app/api/documents/route").POST;
  beforeAll(async () => {
    const target = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !target.pathname.endsWith("_test")) throw new Error("Requires a disposable local _test database");
    process.env.DATABASE_URL = url; auth.id = user;
    ({ db } = await import("@/lib/db/client")); ({ POST: post } = await import("@/app/api/documents/route"));
    await db.execute(sql`INSERT INTO auth_users(id,email) VALUES (${user}::uuid,${user+"@example.test"})`);
    await db.execute(sql`INSERT INTO users(id,username,display_name) VALUES (${user}::uuid,${"u"+user.replaceAll("-","")},'Fixture')`);
    await db.execute(sql`INSERT INTO categories(id,name,slug) VALUES (${category}::uuid,'Fixture',${category})`);
    await db.execute(sql`INSERT INTO institutions(id,name,slug,country,country_code) VALUES (${institution}::uuid,'Fixture',${institution},'Test','TT')`);
    await db.execute(sql`INSERT INTO tags(id,name,slug) VALUES (${tag}::uuid,${name},${name})`);
    await db.execute(sql`INSERT INTO document_uploads(id,user_id,storage_key,file_url,file_size,expires_at) VALUES (${receipt}::uuid,${user}::uuid,${receipt},'https://example.test/test.pdf',100,now()+interval '1 hour')`);
  });
  afterAll(async () => {
    if (!db) return;
    try {
      await db.execute(sql`DELETE FROM auth_users WHERE id=${user}::uuid`);
      await db.execute(sql`DELETE FROM tags WHERE id=${tag}::uuid`);
      await db.execute(sql`DELETE FROM categories WHERE id=${category}::uuid`);
      await db.execute(sql`DELETE FROM institutions WHERE id=${institution}::uuid`);
    } finally { await db.$client.end(); }
  });
  it("saves one link when IDs, names and normalized names overlap", async () => {
    const response = await post(new NextRequest("http://localhost/api/documents", { method: "POST", body: JSON.stringify({ title: "Document fixture", uploadId: receipt, categoryId: category, institutionId: institution, resourceType: "other", tagIds: [tag, tag], tagNames: [name, name.toUpperCase()] }) }));
    expect(response.status).toBe(201);
    const result = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM document_tags dt JOIN documents d ON d.id=dt.document_id WHERE d.author_id=${user}::uuid AND dt.tag_id=${tag}::uuid`);
    expect(result.rows[0].n).toBe(1);
    const count = await db.execute<{ usage_count: number }>(sql`SELECT usage_count FROM tags WHERE id=${tag}::uuid`);
    expect(count.rows[0].usage_count).toBe(1);
  });
});
