import { db } from "@/lib/db/client";
import { users, follows, userBadges, badges, userInterests, tags } from "@/lib/db/schema";
import { eq, and, desc, sql, not } from "drizzle-orm";
import { KEYS, invalidateCache } from "@/lib/redis/client";

// ─────────────────────────────────────────────────────────────────────────────
// USERS REPOSITORY
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  role: string;
  verificationStatus: string;
  institutionId: string | null;
  faculty: string | null;
  major: string | null;
  academicLevel: string | null;
  reputationScore: number;
  reputationLevel: string;
  followerCount: number;
  followingCount: number;
  documentCount: number;
  totalDownloads: number;
  totalLikes: number;
  externalLinks: Record<string, string | null>;
  createdAt: Date;
  currentStreakDays: number;
  longestStreakDays: number;
  privacySettings: Record<string, any>;
  isFollowing: boolean;
  isFollowedBy: boolean;
  institution?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    country: string | null;
  } | null;
}

export const usersRepository = {

  // ── Get public profile by username ────────────────────────────────────────

  async getPublicProfile(username: string, requestingUserId?: string) {
    // Relationship state is viewer-specific and must not enter a shared cache.
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.username, username),
        eq(users.status, "active"),
        sql`${users.deletedAt} IS NULL`
      ),
      columns: {
        id: true, username: true, displayName: true, bio: true,
        avatarUrl: true, coverUrl: true, role: true, verificationStatus: true,
        institutionId: true, faculty: true, major: true, academicLevel: true,
        reputationScore: true, reputationLevel: true,
        followerCount: true, followingCount: true,
        documentCount: true, totalDownloads: true, totalLikes: true,
        externalLinks: true, createdAt: true,
        currentStreakDays: true, longestStreakDays: true,
        privacySettings: true,
      },
      with: {
        institution: {
          columns: { id: true, name: true, slug: true, logoUrl: true, country: true },
        },
      },
    });

    if (!user) return null;

    // Check if requesting user follows this user
    let isFollowing = false;
    let isFollowedBy = false;

    if (requestingUserId && requestingUserId !== user.id) {
      const [following, followedBy] = await Promise.all([
        db
          .select({ id: follows.id })
          .from(follows)
          .where(
            and(
              eq(follows.followerId, requestingUserId),
              eq(follows.followingId, user.id)
            )
          )
          .limit(1),
        db
          .select({ id: follows.id })
          .from(follows)
          .where(
            and(
              eq(follows.followerId, user.id),
              eq(follows.followingId, requestingUserId)
            )
          )
          .limit(1),
      ]);
      isFollowing = following.length > 0;
      isFollowedBy = followedBy.length > 0;
    }

    const result = { ...user, isFollowing, isFollowedBy };
    return result;
  },

  // ── Get user's badges ────────────────────────────────────────────────────

  async getBadges(userId: string) {
    return db
      .select({
        badge: badges,
        awardedAt: userBadges.awardedAt,
      })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.awardedAt));
  },

  // ── Get followers list ────────────────────────────────────────────────────

  async getFollowers(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 24 } = options;
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          verificationStatus: users.verificationStatus,
          reputationScore: users.reputationScore,
          institutionId: users.institutionId,
          followerCount: users.followerCount,
          documentCount: users.documentCount,
          followedAt: follows.createdAt,
        })
        .from(follows)
        .innerJoin(users, eq(users.id, follows.followerId))
        .where(
          and(
            eq(follows.followingId, userId),
            eq(users.status, "active"),
            sql`${users.deletedAt} IS NULL`
          )
        )
        .orderBy(desc(follows.createdAt), desc(follows.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(follows)
        .innerJoin(users, eq(users.id, follows.followerId))
        .where(and(eq(follows.followingId, userId), eq(users.status, "active"), sql`${users.deletedAt} IS NULL`)),
    ]);

    return {
      followers: rows,
      total: Number(countResult[0]?.count ?? 0),
      page,
      totalPages: Math.ceil((Number(countResult[0]?.count ?? 0)) / limit),
    };
  },

  // ── Get following list ────────────────────────────────────────────────────

  async getFollowing(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 24 } = options;
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          verificationStatus: users.verificationStatus,
          reputationScore: users.reputationScore,
          institutionId: users.institutionId,
          followerCount: users.followerCount,
          documentCount: users.documentCount,
          followedAt: follows.createdAt,
        })
        .from(follows)
        .innerJoin(users, eq(users.id, follows.followingId))
        .where(
          and(
            eq(follows.followerId, userId),
            eq(users.status, "active"),
            sql`${users.deletedAt} IS NULL`
          )
        )
        .orderBy(desc(follows.createdAt), desc(follows.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(follows)
        .innerJoin(users, eq(users.id, follows.followingId))
        .where(and(eq(follows.followerId, userId), eq(users.status, "active"), sql`${users.deletedAt} IS NULL`)),
    ]);

    return {
      following: rows,
      total: Number(countResult[0]?.count ?? 0),
      page,
      totalPages: Math.ceil((Number(countResult[0]?.count ?? 0)) / limit),
    };
  },

  // ── Follow a user ─────────────────────────────────────────────────────────

  async follow(followerId: string, followingId: string): Promise<{ changed: boolean }> {
    if (followerId === followingId) throw new Error("INVALID_FOLLOW");
    // Pair locks are acquired in the same order as blocking. Check blocks in a
    // separate statement after the locks: a pre-lock statement snapshot can be stale.
    const outcome = await db.transaction(async tx => {
      const locked = await tx.execute<{ id: string; status: string; deleted_at: string | null }>(sql`
        SELECT id, status, deleted_at FROM users
        WHERE id IN (${followerId}::uuid, ${followingId}::uuid) ORDER BY id FOR UPDATE
      `);
      if (locked.rows.length !== 2 || locked.rows.some(u => u.status !== "active" || u.deleted_at !== null)) throw new Error("NOT_FOUND");
      const blocked = await tx.execute<{ blocked: boolean }>(sql`
        SELECT EXISTS (SELECT 1 FROM user_blocks WHERE
          (blocker_id = ${followerId}::uuid AND blocked_id = ${followingId}::uuid) OR
          (blocker_id = ${followingId}::uuid AND blocked_id = ${followerId}::uuid)) AS blocked
      `);
      if (blocked.rows[0]?.blocked) throw new Error("NOT_FOUND");
      const inserted = await tx.execute<{ changed: boolean }>(sql`
        WITH inserted AS (
          INSERT INTO follows (follower_id, following_id) VALUES (${followerId}::uuid, ${followingId}::uuid)
          ON CONFLICT (follower_id, following_id) DO NOTHING RETURNING id
        ), updated AS (
          UPDATE users SET
            following_count = following_count + CASE WHEN id = ${followerId}::uuid THEN 1 ELSE 0 END,
            follower_count = follower_count + CASE WHEN id = ${followingId}::uuid THEN 1 ELSE 0 END
          WHERE id IN (${followerId}::uuid, ${followingId}::uuid) AND EXISTS (SELECT 1 FROM inserted) RETURNING id
        ) SELECT EXISTS(SELECT 1 FROM updated) AS changed
      `);
      return { changed: inserted.rows[0]?.changed === true };
    });
    if (outcome.changed) await invalidateCache(KEYS.followerCount(followingId), KEYS.userFollowingList(followerId)).catch(() => {});
    return { changed: outcome.changed };
  },

  // Removal remains possible for relationships with inactive accounts.
  async unfollow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) throw new Error("INVALID_FOLLOW");
    await db.execute(sql`
      WITH locked AS MATERIALIZED (
        SELECT id FROM users WHERE id IN (${followerId}::uuid, ${followingId}::uuid) ORDER BY id FOR UPDATE
      ), removed AS (
        DELETE FROM follows WHERE follower_id = ${followerId}::uuid AND following_id = ${followingId}::uuid
          AND (SELECT count(*) FROM locked) = 2 RETURNING id
      )
      UPDATE users SET
        following_count = GREATEST(0, following_count - CASE WHEN id = ${followerId}::uuid THEN 1 ELSE 0 END),
        follower_count = GREATEST(0, follower_count - CASE WHEN id = ${followingId}::uuid THEN 1 ELSE 0 END)
      WHERE id IN (SELECT id FROM locked) AND EXISTS (SELECT 1 FROM removed)
    `);
    await invalidateCache(KEYS.followerCount(followingId), KEYS.userFollowingList(followerId)).catch(() => {});
  },

  // ── Get follow suggestions for a user ─────────────────────────────────────

  async getFollowSuggestions(userId: string, limit: number = 6) {
    return db.execute<{
      id: string; username: string; display_name: string;
      avatar_url: string | null; verification_status: string;
      follower_count: number; document_count: number;
      institution_name: string | null;
    }>(sql`
      SELECT
        u.id, u.username, u.display_name, u.avatar_url,
        u.verification_status, u.follower_count, u.document_count,
        i.name AS institution_name
      FROM users u
      LEFT JOIN institutions i ON i.id = u.institution_id
      WHERE u.status = 'active'
        AND u.deleted_at IS NULL
        AND u.id != ${userId}
        -- Same institution
        AND u.institution_id = (SELECT institution_id FROM users WHERE id = ${userId})
        -- Not already following
        AND u.id NOT IN (
          SELECT following_id FROM follows WHERE follower_id = ${userId}
        )
        -- Has at least 1 document
        AND u.document_count > 0
      ORDER BY u.reputation_score DESC
      LIMIT ${limit}
    `);
  },

  // ── Check username availability ───────────────────────────────────────────

  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const conditions = [eq(users.username, username)];
    if (excludeUserId) conditions.push(not(eq(users.id, excludeUserId)));

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .limit(1);

    return existing.length === 0;
  },

  // ── Get user interests (tags) ─────────────────────────────────────────────

  async getInterests(userId: string) {
    return db
      .select({ tag: tags })
      .from(userInterests)
      .innerJoin(tags, eq(tags.id, userInterests.tagId))
      .where(eq(userInterests.userId, userId));
  },

  // ── Update user interests ─────────────────────────────────────────────────

  async updateInterests(userId: string, tagIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete all existing interests
      await tx.delete(userInterests).where(eq(userInterests.userId, userId));

      // Insert new interests
      if (tagIds.length > 0) {
        await tx.insert(userInterests).values(
          tagIds.map((tagId) => ({ userId, tagId }))
        );
      }
    });

    await invalidateCache(KEYS.recommended(userId));
  },

  // ── Invalidate user profile cache ─────────────────────────────────────────

  async invalidateCache(username: string) {
    await invalidateCache(KEYS.userProfile(username));
  },
};
