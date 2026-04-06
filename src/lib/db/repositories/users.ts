import { db } from "@/lib/db/client";
import { users, follows, userBadges, badges, userInterests, tags } from "@/lib/db/schema";
import { eq, and, desc, sql, not, inArray } from "drizzle-orm";
import { redis, KEYS, TTL, getCache, setCache, invalidateCache } from "@/lib/redis/client";

// ─────────────────────────────────────────────────────────────────────────────
// USERS REPOSITORY
// ─────────────────────────────────────────────────────────────────────────────

export const usersRepository = {

  // ── Get public profile by username ────────────────────────────────────────

  async getPublicProfile(username: string, requestingUserId?: string) {
    const cacheKey = KEYS.userProfile(username);
    const cached = await getCache(cacheKey);
    if (cached) return cached;

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
    await setCache(cacheKey, result, TTL.userProfile);
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
        .orderBy(desc(follows.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(follows)
        .where(eq(follows.followingId, userId)),
    ]);

    return {
      followers: rows,
      total: countResult[0]?.count ?? 0,
      page,
      totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
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
        .orderBy(desc(follows.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(follows)
        .where(eq(follows.followerId, userId)),
    ]);

    return {
      following: rows,
      total: countResult[0]?.count ?? 0,
      page,
      totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
    };
  },

  // ── Follow a user ─────────────────────────────────────────────────────────

  async follow(followerId: string, followingId: string): Promise<void> {
    await db
      .insert(follows)
      .values({ followerId, followingId })
      .onConflictDoNothing();

    // Update denormalized counts
    await Promise.all([
      db.execute(
        sql`UPDATE users SET following_count = following_count + 1 WHERE id = ${followerId}`
      ),
      db.execute(
        sql`UPDATE users SET follower_count = follower_count + 1 WHERE id = ${followingId}`
      ),
    ]);

    await invalidateCache(
      KEYS.userProfile(followerId),
      KEYS.userProfile(followingId),
      KEYS.followerCount(followingId),
      KEYS.userFollowingList(followerId)
    );
  },

  // ── Unfollow a user ───────────────────────────────────────────────────────

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );

    await Promise.all([
      db.execute(
        sql`UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = ${followerId}`
      ),
      db.execute(
        sql`UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = ${followingId}`
      ),
    ]);

    await invalidateCache(
      KEYS.userProfile(followerId),
      KEYS.userProfile(followingId),
      KEYS.followerCount(followingId),
      KEYS.userFollowingList(followerId)
    );
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
