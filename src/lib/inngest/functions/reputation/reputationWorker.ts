import { inngest } from "../../client";
import { db } from "@/lib/db/client";
import { users, reputationEvents, badges, userBadges } from "@/lib/db/schema";
import { eq, and, not, inArray, sql } from "drizzle-orm";
import { redis, KEYS, invalidateCache } from "@/lib/redis/client";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher/server";

// ─────────────────────────────────────────────────────────────────────────────
// REPUTATION POINT MAP
// Single source of truth for all reputation point values
// ─────────────────────────────────────────────────────────────────────────────

export const REPUTATION_POINTS = {
  document_uploaded:           2,   // on upload (before approval)
  document_approved:          10,   // when approved by moderator
  document_rejected_penalty:  -2,   // when rejected
  document_downloaded:         1,   // per unique download
  document_liked_received:     2,   // when someone likes your document
  comment_posted:              1,   // per comment
  comment_helpful_received:    3,   // when comment voted helpful
  follower_gained:             1,   // per new follower
  badge_earned:                0,   // variable (defined on badge.reputationBonus)
  penalty_flagged_content:    -5,   // when content is flagged and action taken
  streak_bonus:                5,   // daily activity streak
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// REPUTATION LEVEL THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

export const REPUTATION_LEVELS = [
  { level: "scholar",               min: 0,     max: 99    },
  { level: "analyst",               min: 100,   max: 499   },
  { level: "archivist",             min: 500,   max: 1999  },
  { level: "senior_contributor",    min: 2000,  max: 4999  },
  { level: "distinguished_scholar", min: 5000,  max: Infinity },
] as const;

export function getReputationLevel(score: number) {
  return (
    REPUTATION_LEVELS.find((l) => score >= l.min && score <= l.max)?.level ??
    "scholar"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Update reputation
// ─────────────────────────────────────────────────────────────────────────────

export const updateReputation = inngest.createFunction(
  {
    id: "update-reputation",
    name: "Update User Reputation",
    retries: 3,
    triggers: [{ event: "reputation/update" }],
  },
  async ({ event, step }) => {
    const { userId, eventType, pointsDelta, referenceType, referenceId } = event.data;

    // ── Step 1: Fetch current score ───────────────────────────────────────────
    const currentScore = await step.run("get-current-score", async () => {
      const user = await db
        .select({ score: users.reputationScore })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return user[0]?.score ?? 0;
    });

    const newScore = Math.max(0, currentScore + pointsDelta); // floor at 0
    const newLevel = getReputationLevel(newScore);

    // ── Step 2: Insert reputation event (immutable ledger) ────────────────────
    await step.run("insert-reputation-event", async () => {
      await db.insert(reputationEvents).values({
        userId,
        type: eventType as any,
        pointsDelta,
        scoreAfter: newScore,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
      });
    });

    // ── Step 3: Update user score + level ─────────────────────────────────────
    await step.run("update-user-score", async () => {
      await db
        .update(users)
        .set({
          reputationScore: newScore,
          reputationLevel: newLevel,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    });

    // ── Step 4: Update Redis leaderboard ─────────────────────────────────────
    await step.run("update-redis-leaderboard", async () => {
      await redis.zadd(KEYS.topContributors(), { score: newScore, member: userId });
      await invalidateCache(KEYS.followerCount(userId));
    });

    // ── Step 5: Check for level-up milestone ─────────────────────────────────
    const oldLevel = getReputationLevel(currentScore);
    if (oldLevel !== newLevel) {
      await step.sendEvent("level-up-notification", {
        name: "notification/send",
        data: {
          recipientId: userId,
          senderId: null,
          type: "reputation_milestone",
          entityType: "user",
          entityId: userId,
          title: `You reached ${newLevel.replace(/_/g, " ")}! 🎓`,
          message: `Your reputation score is now ${newScore}. Keep contributing!`,
          metadata: { newLevel, oldLevel, score: newScore },
        },
      });
    }

    // ── Step 6: Trigger badge check ───────────────────────────────────────────
    await step.sendEvent("check-badges", {
      name: "reputation/check-badges",
      data: { userId, triggerType: eventType },
    });

    return { userId, oldScore: currentScore, newScore, newLevel };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// BADGE CRITERIA EVALUATORS
// ─────────────────────────────────────────────────────────────────────────────

type BadgeCriteriaEvaluator = (userId: string) => Promise<boolean>;

const criteriaEvaluators: Record<string, BadgeCriteriaEvaluator> = {
  document_count: async (userId) => {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(require("@/lib/db/schema").documents)
      .where(
        and(
          eq(require("@/lib/db/schema").documents.authorId, userId),
          eq(require("@/lib/db/schema").documents.status, "approved")
        )
      );
    return (result[0]?.count ?? 0) >= 1;
  },

  reputation_score: async (userId) => {
    const user = await db
      .select({ score: users.reputationScore })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return (user[0]?.score ?? 0) >= 100;
  },

  follower_count: async (userId) => {
    const { follows } = require("@/lib/db/schema");
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, userId));
    return (result[0]?.count ?? 0) >= 50;
  },

  streak_days: async (userId) => {
    const user = await db
      .select({ streak: users.currentStreakDays })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return (user[0]?.streak ?? 0) >= 7;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Check and award badges
// ─────────────────────────────────────────────────────────────────────────────

export const checkAndAwardBadges = inngest.createFunction(
  {
    id: "check-and-award-badges",
    name: "Check and Award Badges",
    retries: 3,
    debounce: { period: "10s", key: "event.data.userId" }, // debounce per user
    triggers: [{ event: "reputation/check-badges" }],
  },
  async ({ event, step }) => {
    const { userId } = event.data;

    // ── Fetch badges user hasn't earned yet ───────────────────────────────────
    const eligibleBadges = await step.run("get-eligible-badges", async () => {
      const earned = await db
        .select({ badgeId: userBadges.badgeId })
        .from(userBadges)
        .where(eq(userBadges.userId, userId));

      const earnedIds = earned.map((e) => e.badgeId);

      const query = db
        .select()
        .from(badges)
        .where(
          and(
            eq(badges.isActive, true),
            earnedIds.length > 0 ? not(inArray(badges.id, earnedIds)) : sql`TRUE`
          )
        );

      return query;
    });

    const awarded: string[] = [];

    for (const badge of eligibleBadges) {
      if (badge.criteriaType === "manual") continue;

      const evaluator = criteriaEvaluators[badge.criteriaType];
      if (!evaluator) continue;

      const earned = await step.run(`check-badge-${badge.id}`, async () => {
        try {
          return await evaluator(userId);
        } catch {
          return false;
        }
      });

      if (!earned) continue;

      // Award the badge
      await step.run(`award-badge-${badge.id}`, async () => {
        await db.insert(userBadges).values({
          userId,
          badgeId: badge.id,
          notificationSent: false,
        });
      });

      // Reputation bonus for badge
      if (badge.reputationBonus > 0) {
        await step.sendEvent(`badge-reputation-${badge.id}`, {
          name: "reputation/update",
          data: {
            userId,
            eventType: "badge_earned",
            pointsDelta: badge.reputationBonus,
            referenceType: "badge",
            referenceId: badge.id,
          },
        });
      }

      // Notify user
      await step.sendEvent(`badge-notification-${badge.id}`, {
        name: "notification/send",
        data: {
          recipientId: userId,
          senderId: null,
          type: "badge_earned",
          entityType: "badge",
          entityId: badge.id,
          title: `Badge earned: ${badge.name}! 🏆`,
          message: badge.description,
          metadata: {
            badgeName: badge.name,
            badgeIcon: badge.icon,
            badgeColor: badge.color,
          },
        },
      });

      awarded.push(badge.name);
    }

    return { userId, badgesAwarded: awarded };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Update daily login streak
// ─────────────────────────────────────────────────────────────────────────────

export const updateUserStreak = inngest.createFunction(
  {
    id: "update-user-streak",
    name: "Update User Activity Streak",
    retries: 2,
    debounce: { period: "1h", key: "event.data.userId" }, // once per hour max
    triggers: [{ event: "user/streak-update" }],
  },
  async ({ event, step }) => {
    const { userId } = event.data;

    await step.run("update-streak", async () => {
      const user = await db
        .select({
          streak: users.currentStreakDays,
          longestStreak: users.longestStreakDays,
          lastStreakDate: users.lastStreakDate,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user[0]) return;

      const now = new Date();
      const lastDate = user[0].lastStreakDate;
      const diffDays = lastDate
        ? Math.floor(
            (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999;

      let newStreak = user[0].streak;

      if (diffDays === 0) return; // Already updated today
      if (diffDays === 1) {
        newStreak += 1; // Consecutive day
      } else {
        newStreak = 1; // Streak broken
      }

      const newLongest = Math.max(newStreak, user[0].longestStreak);

      await db
        .update(users)
        .set({
          currentStreakDays: newStreak,
          longestStreakDays: newLongest,
          lastStreakDate: now,
          lastActiveAt: now,
        })
        .where(eq(users.id, userId));

      // Bonus points for 7-day streaks
      if (newStreak > 0 && newStreak % 7 === 0) {
        await inngest.send({
          name: "reputation/update",
          data: {
            userId,
            eventType: "streak_bonus",
            pointsDelta: REPUTATION_POINTS.streak_bonus,
            referenceType: null,
            referenceId: null,
          },
        });
      }
    });
  }
);