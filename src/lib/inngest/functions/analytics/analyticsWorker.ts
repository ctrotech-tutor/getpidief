import { inngest } from "../../client";
import { db } from "@/lib/db/client";
import { analyticsSnapshots } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { redis, KEYS, zincrby } from "@/lib/redis/client";

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Take daily analytics snapshot
// Cron: runs at midnight UTC every day
// ─────────────────────────────────────────────────────────────────────────────

export const takeDailySnapshot = (inngest.createFunction as any)(
  {
    id: "take-daily-analytics-snapshot",
    name: "Take Daily Analytics Snapshot",
    retries: 3,
    concurrency: { limit: 1 },
  },
  { cron: "0 0 * * *" }, // Midnight UTC
  async ({ step }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

    // ── Snapshot: New user registrations ─────────────────────────────────────
    await step.run("snapshot-user-registrations", async () => {
      const result = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM auth_users
        WHERE DATE(created_at) = ${dateStr}::date
      `);
      await insertSnapshot(dateStr, "user_registrations", Number(result.rows[0]?.count ?? 0));
    });

    // ── Snapshot: Document uploads ────────────────────────────────────────────
    await step.run("snapshot-document-uploads", async () => {
      const result = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM documents
        WHERE DATE(created_at) = ${dateStr}::date
          AND status != 'deleted'
      `);
      await insertSnapshot(dateStr, "documents_uploaded", Number(result.rows[0]?.count ?? 0));
    });

    // ── Snapshot: Document approvals ──────────────────────────────────────────
    await step.run("snapshot-document-approvals", async () => {
      const result = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM documents
        WHERE DATE(published_at) = ${dateStr}::date
          AND status = 'approved'
      `);
      await insertSnapshot(dateStr, "documents_approved", Number(result.rows[0]?.count ?? 0));
    });

    // ── Snapshot: Total document views ────────────────────────────────────────
    await step.run("snapshot-document-views", async () => {
      const result = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM document_views
        WHERE DATE(created_at) = ${dateStr}::date
      `);
      await insertSnapshot(dateStr, "document_views", Number(result.rows[0]?.count ?? 0));
    });

    // ── Snapshot: Document downloads ──────────────────────────────────────────
    await step.run("snapshot-document-downloads", async () => {
      const result = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM document_downloads
        WHERE DATE(created_at) = ${dateStr}::date
      `);
      await insertSnapshot(dateStr, "document_downloads", Number(result.rows[0]?.count ?? 0));
    });

    // ── Snapshot: Active users (visited in last 24h) ───────────────────────────
    await step.run("snapshot-active-users", async () => {
      const result = await db.execute<{ count: string }>(sql`
        SELECT COUNT(DISTINCT user_id) as count FROM document_views
        WHERE DATE(created_at) = ${dateStr}::date
          AND user_id IS NOT NULL
      `);
      await insertSnapshot(dateStr, "active_users", Number(result.rows[0]?.count ?? 0));
    });

    // ── Snapshot: New follows ────────────────────────────────────────────────
    await step.run("snapshot-new-follows", async () => {
      const result = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM follows
        WHERE DATE(created_at) = ${dateStr}::date
      `);
      await insertSnapshot(dateStr, "new_follows", Number(result.rows[0]?.count ?? 0));
    });

    // ── Snapshot: Per-category breakdowns ─────────────────────────────────────
    await step.run("snapshot-by-category", async () => {
      const result = await db.execute<{
        category_id: string;
        upload_count: string;
      }>(sql`
        SELECT category_id, COUNT(*) as upload_count
        FROM documents
        WHERE DATE(created_at) = ${dateStr}::date
          AND category_id IS NOT NULL
          AND status != 'deleted'
        GROUP BY category_id
      `);

      for (const row of result.rows) {
        await insertSnapshot(
          dateStr,
          "documents_uploaded",
          Number(row.upload_count),
          "category",
          row.category_id
        );
      }
    });

    await redis.set(KEYS.lastAnalyticsSnapshot(), dateStr);

    return { date: dateStr, status: "completed" };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Aggregate popular searches (runs every hour)
// Reads from user_activity_log search events, updates Redis sorted set
// ─────────────────────────────────────────────────────────────────────────────

export const aggregatePopularSearches = (inngest.createFunction as any)(
  {
    id: "aggregate-popular-searches",
    name: "Aggregate Popular Searches",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "0 * * * *" }, // Every hour
  async ({ step }) => {
    await step.run("aggregate-searches", async () => {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await db.execute<{
        query: string;
        search_count: string;
        institution_id: string | null;
      }>(sql`
        SELECT
          metadata->>'query' as query,
          COUNT(*) as search_count,
          NULL as institution_id
        FROM user_activity_log
        WHERE action = 'search_performed'
          AND created_at >= ${last24h}
          AND metadata->>'query' IS NOT NULL
          AND LENGTH(metadata->>'query') > 2
        GROUP BY metadata->>'query'
        HAVING COUNT(*) >= 2
        ORDER BY search_count DESC
        LIMIT 100
      `);

      // Update global popular searches sorted set
      await redis.del(KEYS.popularSearches());
      for (const row of result.rows) {
        await redis.zadd(KEYS.popularSearches(), {
          score: Number(row.search_count),
          member: row.query,
        });
      }
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Institution leaderboard (top institutions by weekly activity)
// ─────────────────────────────────────────────────────────────────────────────

export const updateInstitutionLeaderboard = (inngest.createFunction as any)(
  {
    id: "update-institution-leaderboard",
    name: "Update Institution Leaderboard",
    retries: 2,
  },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    await step.run("update-leaderboard", async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await db.execute<{
        institution_id: string;
        activity_score: string;
      }>(sql`
        SELECT
          d.institution_id,
          (COUNT(DISTINCT d.id) * 5 +
           SUM(d.view_count) * 0.1 +
           SUM(d.download_count) * 0.5) AS activity_score
        FROM documents d
        WHERE d.status = 'approved'
          AND d.institution_id IS NOT NULL
          AND d.published_at >= ${weekAgo}
        GROUP BY d.institution_id
        ORDER BY activity_score DESC
        LIMIT 20
      `);

      await redis.del(KEYS.institutionLeaderboard());
      for (const row of result.rows) {
        await redis.zadd(KEYS.institutionLeaderboard(), {
          score: Number(row.activity_score),
          member: row.institution_id,
        });
      }
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Cleanup expired tokens and soft-deleted data
// ─────────────────────────────────────────────────────────────────────────────

export const cleanupExpiredData = (inngest.createFunction as any)(
  {
    id: "cleanup-expired-data",
    name: "Cleanup Expired Tokens and Deleted Data",
    retries: 2,
  },
  { cron: "0 3 * * *" }, // 3 AM daily (low traffic time)
  async ({ step }) => {
    // ── Delete expired password reset tokens ─────────────────────────────────
    await step.run("cleanup-reset-tokens", async () => {
      await db.execute(sql`
        DELETE FROM password_reset_tokens WHERE expires_at < NOW()
      `);
    });

    // ── Delete expired auth verification tokens ───────────────────────────────
    await step.run("cleanup-auth-tokens", async () => {
      await db.execute(sql`
        DELETE FROM auth_verification_tokens WHERE expires < NOW()
      `);
    });

    // ── Delete soft-deleted documents older than 30 days ──────────────────────
    await step.run("cleanup-deleted-documents", async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const toDelete = await db.execute<{ id: string; file_url: string }>(sql`
        SELECT id, file_url FROM documents
        WHERE deleted_at < ${thirtyDaysAgo}
          AND status = 'deleted'
      `);

      if (toDelete.rows.length > 0) {
        // Queue file deletion in R2
        await inngest.send({
          name: "system/cleanup-deleted-files",
          data: { fileUrls: toDelete.rows.map((r) => r.file_url) },
        });

        // Hard delete from DB
        await db.execute(sql`
          DELETE FROM documents
          WHERE deleted_at < ${thirtyDaysAgo}
            AND status = 'deleted'
        `);
      }
    });

    // ── Prune user activity log older than 90 days ────────────────────────────
    await step.run("prune-activity-log", async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await db.execute(sql`
        DELETE FROM user_activity_log WHERE created_at < ${ninetyDaysAgo}
      `);
    });

    // ── Prune document views older than 90 days ───────────────────────────────
    await step.run("prune-document-views", async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await db.execute(sql`
        DELETE FROM document_views WHERE created_at < ${ninetyDaysAgo}
      `);
    });

    // ── Prune notification log older than 60 days ────────────────────────────
    await step.run("prune-notifications", async () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      await db.execute(sql`
        DELETE FROM notifications WHERE created_at < ${sixtyDaysAgo} AND is_read = true
      `);
    });

    return { status: "cleanup-completed" };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function insertSnapshot(
  date: string,
  metric: string,
  value: number,
  dimensionType?: string,
  dimensionId?: string
) {
  await db
    .insert(analyticsSnapshots)
    .values({
      date,
      metric: metric as any,
      dimensionType: dimensionType ?? null,
      dimensionId: dimensionId ?? null,
      value,
    })
    .onConflictDoUpdate({
      target: [
        analyticsSnapshots.date,
        analyticsSnapshots.metric,
        analyticsSnapshots.dimensionType,
        analyticsSnapshots.dimensionId,
      ],
      set: { value },
    });
}