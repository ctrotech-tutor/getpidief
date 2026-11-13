#!/usr/bin/env tsx
/** Development fixtures only. Never reset a database or create known-password users on a remote host. */
import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";
import bcrypt from "bcryptjs";
import { assertLocalSeedTarget } from "./seed/guard";
import { account, fixtureId } from "./seed/identity";
import { topics, guides } from "./seed/content";
import { writeGuides } from "./seed/pdf";
import { seedAvatarUrl, writeAvatars } from "./seed/avatars";

config({ path: ".env.local", quiet: true }); config({ path: ".env", quiet: true });
const USER_COUNT = 50;
const PASSWORD = "Password123!";
const tagNames = ["Science", "Technology", "Education", "Research", "Mathematics", "Psychology", "History", "Design"];

async function seedUsers(client: PoolClient) {
  for (let i = 0; i < USER_COUNT; i++) {
    const u = account(i);
    const existing = await client.query("SELECT id, email FROM auth_users WHERE id = $1 OR email = $2", [u.id, u.email]);
    if (existing.rows.some(row => row.id !== u.id || row.email !== u.email)) throw new Error(`Account collision for ${u.email}; nothing was changed.`);
    const byUsername = await client.query("SELECT id FROM users WHERE username = $1", [u.username]);
    if (byUsername.rows.some(row => row.id !== u.id)) throw new Error(`Username collision for ${u.username}; nothing was changed.`);
    if (existing.rowCount) {
      const valid = await client.query("SELECT 1 FROM users u JOIN auth_accounts a ON a.user_id = u.id AND a.provider = 'credentials' WHERE u.id = $1 AND u.username = $2", [u.id, u.username]);
      if (!valid.rowCount) throw new Error(`Incomplete or modified demo account ${u.email}; no changes made.`);
      // Add fixture photos to existing demo accounts only when no avatar is set.
      await client.query("UPDATE users SET avatar_url = $2 WHERE id = $1 AND avatar_url IS NULL", [u.id, seedAvatarUrl(i)]);
      continue; // Never overwrite a password or existing profile photo.

    }
    // Each hash has its own salt; registration currently uses bcrypt cost 12.
    const hash = await bcrypt.hash(PASSWORD, 12);
    await client.query("INSERT INTO auth_users (id, email, name, email_verified) VALUES ($1,$2,$3,now())", [u.id, u.email, u.name]);
    await client.query("INSERT INTO users (id, username, display_name, bio, avatar_url, role, onboarding_complete, onboarding_step) VALUES ($1,$2,$3,$4,$5,'student',true,3)", [u.id, u.username, u.name, "Fictional local demo account for testing getpidief.", seedAvatarUrl(i)]);
    await client.query("INSERT INTO auth_accounts (user_id, type, provider, provider_account_id) VALUES ($1,'credentials','credentials',$2)", [u.id, hash]);
  }
}

async function seedTags(client: PoolClient) {
  const ids: string[] = [];
  for (const name of tagNames) {
    const slug = name.toLowerCase();
    await client.query("INSERT INTO tags (name, slug, is_system_tag) VALUES ($1,$2,true) ON CONFLICT DO NOTHING", [name, slug]);
    const result = await client.query("SELECT id FROM tags WHERE slug=$1 AND is_active=true", [slug]);
    if (result.rowCount !== 1) throw new Error(`Active tag ${slug} is unavailable or conflicts with existing data.`);
    ids.push(result.rows[0].id);
  }
  return ids;
}

async function seedActivity(client: PoolClient, tagIds: string[], sizes: number[]) {
  for (let i = 0; i < USER_COUNT; i++) {
    const id = account(i).id;
    for (const tagId of [tagIds[i % tagIds.length], tagIds[(i + 3) % tagIds.length]]) {
      await client.query("INSERT INTO user_interests (user_id, tag_id) SELECT $1,$2 WHERE NOT EXISTS (SELECT 1 FROM user_interests WHERE user_id=$1 AND tag_id=$2)", [id, tagId]);
    }
    // Only demo-to-demo follows, with no changes to real users.
    for (const offset of [1, 4, 11]) await client.query("INSERT INTO follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, account((i + offset) % USER_COUNT).id]);
  }
  for (let i = 0; i < 120; i++) {
    const topic = topics[i % topics.length]; const variation = Math.floor(i / topics.length);
    const bodies = [
      `${topic.question}\n\nI would love to hear different approaches.`,
      `${topic.angle}\n\nWhat would you add to that?`,
      `A useful starting point for ${topic.name.toLowerCase()}: ${topic.source}\n\n${topic.angle}`,
      `For people learning about ${topic.name.toLowerCase()}, what resource would you recommend to someone starting out, and why?`,
      `How would you explain ${topic.name.toLowerCase()} to someone encountering it for the first time?\n\nOne reference to explore: ${topic.source}`,
    ];
    const postId = fixtureId("post", i); const author = i % USER_COUNT;
    const existingPost = await client.query("SELECT author_id FROM posts WHERE id = $1", [postId]);
    if (existingPost.rows.some(row => row.author_id !== account(author).id)) throw new Error(`Post ID collision: ${postId}.`);
    await client.query("INSERT INTO posts (id, author_id, kind, body, created_at) VALUES ($1,$2,$3,$4,now() - (($5 * 37 + 10) * interval '1 minute')) ON CONFLICT (id) DO NOTHING", [postId, account(author).id, variation === 0 || variation === 3 ? "question" : "thought", bodies[variation], i]);
    const reply = ["That is a helpful question. I would start with a concrete example and then check the assumptions.", "I like this framing. Comparing more than one perspective can make the limits clearer.", "Writing down what is still uncertain helps me figure out what to look up next."][i % 3];
    const replyId = fixtureId("reply", i);
    const existingReply = await client.query("SELECT post_id, author_id FROM post_replies WHERE id = $1", [replyId]);
    if (existingReply.rows.some(row => row.post_id !== postId || row.author_id !== account((author + 7) % USER_COUNT).id)) throw new Error(`Reply ID collision: ${replyId}.`);
    await client.query("INSERT INTO post_replies (id, post_id, author_id, body, created_at) VALUES ($1,$2,$3,$4,now() - ($5 * interval '37 minutes')) ON CONFLICT (id) DO NOTHING", [replyId, postId, account((author + 7) % USER_COUNT).id, reply, i]);
    if (i % 3 !== 0) await client.query("INSERT INTO post_likes (post_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [postId, account((author + 3) % USER_COUNT).id]);
    if (i % 5 === 0) await client.query("INSERT INTO post_saves (post_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [postId, account((author + 9) % USER_COUNT).id]);
  }
  for (let i = 0; i < guides.length; i++) {
    const g = guides[i]; const id = fixtureId("document", i); const slug = `local-demo-guide-${String(i + 1).padStart(2, "0")}`;
    const collision = await client.query("SELECT id FROM documents WHERE (slug = $1 AND id <> $2) OR (id = $2 AND (slug <> $1 OR author_id <> $3))", [slug, id, account(i).id]);
    if (collision.rowCount) throw new Error(`Document slug collision: ${slug}.`);
    await client.query(`INSERT INTO documents (id, slug, title, description, author_id, resource_type, file_url, file_size, mime_type, preview_status, page_count, visibility, license, status, published_at, search_vector)
      VALUES ($1,$2,$3::text,$4::text,$5,'other',$6,$7,'application/pdf','ready',1,'public','academic_use_only','approved',now(), setweight(to_tsvector('english', $3::text), 'A') || setweight(to_tsvector('english', $4::text), 'B')) ON CONFLICT (id) DO NOTHING`,
      [id, slug, g.title, `Original local demo guide, not a verified publication. Further reading: ${g.source}`, account(i).id, `/seed-assets/guide-${String(i + 1).padStart(2, "0")}.pdf`, sizes[i]]);
    const tagId = tagIds[[3, 4, 4, 7, 1, 6, 2, 1][i]];
    await client.query("INSERT INTO document_tags (document_id,tag_id) SELECT $1,$2 WHERE NOT EXISTS (SELECT 1 FROM document_tags WHERE document_id=$1 AND tag_id=$2)", [id, tagId]);
  }
}

async function main() {
  const connectionString = assertLocalSeedTarget(process.env.DATABASE_URL, process.env.NODE_ENV);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(734325190)");
      console.log("Creating or checking 50 local demo accounts. This can take a little while...");
      await writeAvatars(USER_COUNT);
      await seedUsers(client);
      const tagIds = await seedTags(client);
      const sizes = await writeGuides();
      await seedActivity(client, tagIds, sizes);
      // Refresh only demo profiles' derived counters from actual related rows.
      await client.query(`UPDATE users u SET
        following_count = (SELECT count(*) FROM follows f WHERE f.follower_id = u.id),
        follower_count = (SELECT count(*) FROM follows f WHERE f.following_id = u.id),
        document_count = (SELECT count(*) FROM documents d WHERE d.author_id = u.id AND d.status = 'approved' AND d.deleted_at IS NULL)
        WHERE u.id = ANY($1::uuid[])`, [Array.from({ length: USER_COUNT }, (_, i) => account(i).id)]);
      await client.query("COMMIT");
      console.log("Done: 50 fictional accounts, 120 discussion posts, 120 replies, and 8 original PDF guides.");
      console.log("Sign in with learner01@example.test through learner50@example.test. Password: Password123!");
      console.log("Local demo only. Existing records were not deleted. See docs/LOCAL-SEED.md.");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } finally { await pool.end(); }
}
main().catch(error => { console.error("Seed failed:", error instanceof Error ? error.message : "Unknown error"); process.exitCode = 1; });
