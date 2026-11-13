/** Read-only aggregate checks for an isolated local/staging copy; never print IDs or URLs. */
import { Client } from "pg";

export async function inspectAssociations(client: Client) {
  const duplicates = await client.query<{ association: string; duplicate_groups: string; excess_rows: string }>(`
    SELECT 'user_interests' AS association, count(*)::text AS duplicate_groups, coalesce(sum(n - 1), 0)::text AS excess_rows
    FROM (SELECT count(*) n FROM user_interests GROUP BY user_id, tag_id HAVING count(*) > 1) d
    UNION ALL
    SELECT 'document_tags', count(*)::text, coalesce(sum(n - 1), 0)::text
    FROM (SELECT count(*) n FROM document_tags GROUP BY document_id, tag_id HAVING count(*) > 1) d
    UNION ALL
    SELECT 'document_course_codes', count(*)::text, coalesce(sum(n - 1), 0)::text
    FROM (SELECT count(*) n FROM document_course_codes GROUP BY document_id, course_code_id HAVING count(*) > 1) d
  `);
  const risks = await client.query<{ conflicting_course_code_groups: string; orphan_interest_rows: string }>(`
    SELECT
      (SELECT count(*)::text FROM (SELECT 1 FROM document_course_codes GROUP BY document_id, course_code_id
        HAVING count(DISTINCT raw_code) > 1 OR (count(raw_code) > 0 AND count(raw_code) < count(*))) conflicts) AS conflicting_course_code_groups,
      (SELECT count(*)::text FROM user_interests ui WHERE NOT EXISTS (SELECT 1 FROM tags t WHERE t.id=ui.tag_id)) AS orphan_interest_rows
  `);
  return { duplicates: duplicates.rows, risks: risks.rows[0] };
}

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL to an isolated local _test database or staging copy.");
  const target = new URL(url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !/^\/[a-zA-Z0-9_]+_test$/.test(target.pathname)) throw new Error("Only local databases ending in _test are allowed.");
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout = '30s'");
    const result = await inspectAssociations(client);
    await client.query("COMMIT");
    console.log(JSON.stringify(result, null, 2));
  } finally { await client.end(); }
}

if (require.main === module) main().catch(() => { console.error("Integrity audit failed; check target, permissions, schema and timeout."); process.exitCode = 1; });
