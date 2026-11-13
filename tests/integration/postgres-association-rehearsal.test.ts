import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { rehearseAssociationUniqueness } from "../../scripts/audit/rehearse-association-uniqueness";
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("rollback-only association rehearsal", () => {
  const user=randomUUID(), doc=randomUUID(), tag=randomUUID(), course=randomUUID();
  let client: Client;
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test") || parsed.search) throw new Error("Requires an isolated local _test database");
    client = new Client({ connectionString: url }); await client.connect();
    await client.query("INSERT INTO auth_users(id,email) VALUES ($1,$2)", [user, user+"@example.test"]);
    await client.query("INSERT INTO users(id,username,display_name) VALUES ($1,$2,'Fixture')", [user,"u"+user.replaceAll("-","")]);
    await client.query("INSERT INTO documents(id,slug,title,author_id,file_url) VALUES ($1,$2,'Fixture',$3,'test.pdf')", [doc,doc,user]);
    await client.query("INSERT INTO tags(id,name,slug) VALUES ($1,$2,$2)", [tag,tag]);
    await client.query("INSERT INTO course_codes(id,code) VALUES ($1,$2)", [course,course]);
    await client.query("INSERT INTO user_interests(user_id,tag_id) VALUES ($1,$2),($1,$2)", [user,tag]);
    await client.query("INSERT INTO document_tags(document_id,tag_id) VALUES ($1,$2),($1,$2)", [doc,tag]);
    await client.query("INSERT INTO document_course_codes(document_id,course_code_id,raw_code) VALUES ($1,$2,'BIO101'),($1,$2,'BIO101')", [doc,course]);
  });
  afterAll(async () => {
    if (!client) return;
    try { await client.query("DELETE FROM auth_users WHERE id=$1", [user]); await client.query("DELETE FROM tags WHERE id=$1", [tag]); await client.query("DELETE FROM course_codes WHERE id=$1", [course]); }
    finally { await client.end(); }
  });
  it("deduplicates and builds indexes only inside a transaction, then restores all rows and schema", async () => {
    const result = await rehearseAssociationUniqueness(url!, true);
    expect(result.removed).toEqual({ user_interests: 1, document_tags: 1, document_course_codes: 1 });
    expect(result.after.duplicates.every(row => row.excess_rows === "0")).toBe(true);
    for (const [table,column,id] of [["user_interests","user_id",user],["document_tags","document_id",doc],["document_course_codes","document_id",doc]] as const) {
      const result = await client.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${column}=$1`, [id]);
      expect(result.rows[0].n).toBe(2);
    }
    const indexes = await client.query("SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'rehearsal\\_%' ESCAPE '\\'");
    expect(indexes.rows[0].n).toBe(0);
  });
  it("rejects conflicting course values without persisting any partial changes", async () => {
    await client.query("UPDATE document_course_codes SET raw_code=NULL WHERE ctid = (SELECT ctid FROM document_course_codes WHERE document_id=$1 LIMIT 1)", [doc]);
    try {
      await expect(rehearseAssociationUniqueness(url!, true)).rejects.toThrow(/Conflicting/);
      expect((await client.query("SELECT count(*)::int AS n FROM user_interests WHERE user_id=$1", [user])).rows[0].n).toBe(2);
      expect((await client.query("SELECT count(*)::int AS n FROM document_course_codes WHERE document_id=$1", [doc])).rows[0].n).toBe(2);
    } finally { await client.query("UPDATE document_course_codes SET raw_code='BIO101' WHERE document_id=$1", [doc]); }
  });
  it("times out on competing writers and leaves the fixture unchanged", async () => {
    await client.query("BEGIN");
    try {
      await client.query("LOCK TABLE public.document_tags IN ROW EXCLUSIVE MODE");
      await expect(rehearseAssociationUniqueness(url!, true)).rejects.toMatchObject({ code: "55P03" });
    } finally { await client.query("ROLLBACK"); }
    expect((await client.query("SELECT count(*)::int AS n FROM user_interests WHERE user_id=$1", [user])).rows[0].n).toBe(2);
  });
  it("refuses unconfirmed, remote and parameterized targets before connecting", async () => {
    await expect(rehearseAssociationUniqueness(url!, false)).rejects.toThrow(/Requires/);
    await expect(rehearseAssociationUniqueness("postgres://example.com/fixture_test", true)).rejects.toThrow(/Requires/);
    await expect(rehearseAssociationUniqueness(url! + "?host=example.com", true)).rejects.toThrow(/Requires/);
  });
});
