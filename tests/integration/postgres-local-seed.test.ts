import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { PDFDocument } from "pdf-lib";
import { assertLocalSeedTarget } from "../../scripts/seed/guard";

const url = process.env.TEST_SEED_DATABASE_URL;
const enabled = !!url && process.env.TEST_DATABASE_WRITE === "yes";
describe.skipIf(!enabled)("local seed on an empty disposable PostgreSQL database", () => {
  it("creates usable fixtures and safely reruns without duplicate activity", async () => {
    assertLocalSeedTarget(url, "test");
    if (!new URL(url!).pathname.endsWith("_seed_test")) throw new Error("Database name must end with _seed_test");
    const client = new Client({ connectionString: url }); await client.connect();
    try {
      const existing = await client.query("SELECT (SELECT count(*) FROM auth_users) + (SELECT count(*) FROM posts) + (SELECT count(*) FROM documents) AS n");
      if (Number(existing.rows[0].n) !== 0) throw new Error("Seed integration test requires an empty database");
      // A reserved email belonging to another ID must abort without touching it.
      const outsideId = "9436ffbc-7b54-4a7f-8d22-91af72b9ebfe";
      await client.query("INSERT INTO auth_users (id, email, name) VALUES ($1, $2, $3)", [outsideId, "learner01@example.test", "Existing person"]);
      const collision = spawnSync(process.execPath, ["--import", "tsx", "scripts/seed.ts"], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, DATABASE_URL: url!, NODE_ENV: "test" }, timeout: 90_000 });
      expect(collision.status).not.toBe(0);
      expect((await client.query("SELECT count(*)::int AS n FROM auth_users")).rows[0].n).toBe(1);
      expect((await client.query("SELECT name FROM auth_users WHERE id=$1", [outsideId])).rows[0].name).toBe("Existing person");
      // Remove only the record created by this test, never existing data.
      await client.query("DELETE FROM auth_users WHERE id=$1", [outsideId]);
      await client.query("INSERT INTO auth_users (id, email, name) VALUES ($1, $2, $3)", [outsideId, "existing@example.test", "Existing person"]);
      for (let run = 0; run < 2; run++) {
        const child = spawnSync(process.execPath, ["--import", "tsx", "scripts/seed.ts"], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, DATABASE_URL: url!, NODE_ENV: "test" }, timeout: 90_000 });
        expect(child.status, child.stderr).toBe(0);
        if (run === 0) {
          await client.query("UPDATE users SET avatar_url = '/custom-avatar.jpg' WHERE username = 'demo_learner01'");
          await client.query("UPDATE users SET avatar_url = NULL WHERE username = 'demo_learner02'");
        }
      }
      const avatars = await client.query("SELECT username, avatar_url FROM users WHERE username IN ('demo_learner01', 'demo_learner02') ORDER BY username");
      expect(avatars.rows.map(row => row.avatar_url)).toEqual(['/custom-avatar.jpg', '/seed-assets/avatars/02.jpg']);
      expect((await client.query("SELECT count(*)::int AS n FROM users WHERE avatar_url LIKE '/seed-assets/avatars/%.jpg'")).rows[0].n).toBe(49);
      expect((await readFile('public/seed-assets/avatars/02.jpg')).equals(await readFile('scripts/seed/avatars/02.jpg'))).toBe(true);
      for (const [table, count] of [["auth_users", 51], ["posts", 120], ["post_replies", 120], ["follows", 150], ["documents", 8], ["user_interests", 100], ["document_tags", 8]] as const) {
        const result = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
        expect(result.rows[0].n).toBe(count);
      }
      expect((await client.query("SELECT name FROM auth_users WHERE id=$1", [outsideId])).rows[0].name).toBe("Existing person");
      const auth = await client.query("SELECT a.provider_account_id FROM auth_accounts a JOIN auth_users u ON u.id=a.user_id WHERE u.email=$1", ["learner01@example.test"]);
      expect(await bcrypt.compare("Password123!", auth.rows[0].provider_account_id)).toBe(true);
      const doc = await client.query("SELECT id FROM documents WHERE search_vector @@ plainto_tsquery('english', 'evidence')");
      expect(doc.rowCount).toBeGreaterThan(0);
      expect((await PDFDocument.load((await readFile("public/seed-assets/guide-01.pdf")).toString("base64"))).getPageCount()).toBe(1);
    } finally { await client.end(); }
  }, 120_000);
});
