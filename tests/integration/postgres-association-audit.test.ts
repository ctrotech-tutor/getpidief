import { describe, expect, it } from "vitest";
import { Client } from "pg";
import { inspectAssociations } from "../../scripts/audit/association-integrity";
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url || process.env.TEST_DATABASE_WRITE !== "yes")("association audit", () => {
  it("counts duplicate groups, excess rows, differing raw codes, and orphan interests", async () => {
    const target = new URL(url!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !target.pathname.endsWith("_test")) throw new Error("Requires a local disposable _test database");
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      await client.query("BEGIN");
      // Session-local fixtures shadow the real tables and are rolled back.
      await client.query(`CREATE TEMP TABLE user_interests (user_id text, tag_id text);
        CREATE TEMP TABLE document_tags (document_id text, tag_id text);
        CREATE TEMP TABLE document_course_codes (document_id text, course_code_id text, raw_code text);
        CREATE TEMP TABLE tags (id text);
        INSERT INTO tags VALUES ('known');
        INSERT INTO user_interests VALUES ('u','known'),('u','known'),('u','known'),('v','missing');
        INSERT INTO document_tags VALUES ('d','t'),('d','t');
        INSERT INTO document_course_codes VALUES ('d','c','one'),('d','c','two'),('d','c',NULL),('d','x','same'),('d','x','same');`);
      const result = await inspectAssociations(client);
      expect(result.duplicates).toEqual([
        { association: 'user_interests', duplicate_groups: '1', excess_rows: '2' },
        { association: 'document_tags', duplicate_groups: '1', excess_rows: '1' },
        { association: 'document_course_codes', duplicate_groups: '2', excess_rows: '3' },
      ]);
      expect(result.risks).toEqual({ conflicting_course_code_groups: '1', orphan_interest_rows: '1' });
    } finally { await client.query("ROLLBACK"); await client.end(); }
  });
});
