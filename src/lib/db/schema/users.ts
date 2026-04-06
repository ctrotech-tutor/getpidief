import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
  real,
  pgView,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { authUsers } from "./auth";
import { institutions } from "./institutions";
import {
  userRoleEnum,
  userStatusEnum,
  academicLevelEnum,
  verificationStatusEnum,
  reputationLevelEnum,
} from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// USERS  (Extended profile — 1:1 with auth_users)
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    // Links to auth_users.id (same UUID)
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    // ── Identity ─────────────────────────────────────────────────────────────
    username: varchar("username", { length: 50 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    coverUrl: text("cover_url"),

    // ── Role & Status ─────────────────────────────────────────────────────────
    role: userRoleEnum("role").notNull().default("student"),
    status: userStatusEnum("status").notNull().default("active"),
    suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // ── Academic Profile ──────────────────────────────────────────────────────
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "set null",
    }),
    faculty: varchar("faculty", { length: 150 }),
    major: varchar("major", { length: 150 }),
    department: varchar("department", { length: 150 }),
    academicLevel: academicLevelEnum("academic_level").default("undergraduate"),
    academicYear: integer("academic_year"),           // e.g. 2 (Year 2)
    semester: varchar("semester", { length: 50 }),
    graduationYear: integer("graduation_year"),

    // ── Verification ──────────────────────────────────────────────────────────
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("unverified"),
    verificationRequestedAt: timestamp("verification_requested_at", {
      withTimezone: true,
    }),
    verificationDocumentUrl: text("verification_document_url"),
    verificationNotes: text("verification_notes"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedByAdminId: uuid("verified_by_admin_id"),

    // ── Onboarding ────────────────────────────────────────────────────────────
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    onboardingStep: integer("onboarding_step").notNull().default(1),

    // ── Reputation ────────────────────────────────────────────────────────────
    reputationScore: integer("reputation_score").notNull().default(0),
    reputationLevel: reputationLevelEnum("reputation_level")
      .notNull()
      .default("scholar"),

    // ── Denormalized social counts (updated by workers) ───────────────────────
    followerCount: integer("follower_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    documentCount: integer("document_count").notNull().default(0),   // approved docs
    totalDownloads: integer("total_downloads").notNull().default(0), // received
    totalLikes: integer("total_likes").notNull().default(0),         // received

    // ── External Links ────────────────────────────────────────────────────────
    // JSON: { linkedin, researchgate, orcid, twitter, website, institutional }
    externalLinks: jsonb("external_links").default(sql`'{}'::jsonb`),

    // ── Notification Preferences ──────────────────────────────────────────────
    // JSON: { like_inapp, like_email, like_push, comment_inapp, ... }
    notificationPreferences: jsonb("notification_preferences")
      .notNull()
      .default(sql`'{
        "like_inapp": true,      "like_email": false,  "like_push": false,
        "comment_inapp": true,   "comment_email": true,"comment_push": true,
        "follow_inapp": true,    "follow_email": false,"follow_push": false,
        "approved_inapp": true,  "approved_email": true,"approved_push": true,
        "rejected_inapp": true,  "rejected_email": true,"rejected_push": false,
        "new_upload_inapp": true,"new_upload_email": false,"new_upload_push": true,
        "badge_inapp": true,     "badge_email": true,  "badge_push": true,
        "weekly_digest": true,   "system_inapp": true, "system_email": true
      }'::jsonb`),

    // ── Privacy Settings ──────────────────────────────────────────────────────
    // JSON: { show_institution, show_library, show_activity_in_pulse, profile_visibility }
    privacySettings: jsonb("privacy_settings")
      .notNull()
      .default(sql`'{
        "profile_visibility": "public",
        "show_institution": true,
        "show_library": false,
        "show_activity_in_pulse": true,
        "allow_messages": true
      }'::jsonb`),

    // ── 2FA ───────────────────────────────────────────────────────────────────
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    twoFactorSecret: text("two_factor_secret"),          // encrypted TOTP secret
    twoFactorBackupCodes: text("two_factor_backup_codes").array(), // hashed

    // ── Activity Tracking ─────────────────────────────────────────────────────
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    loginCount: integer("login_count").notNull().default(0),
    currentStreakDays: integer("current_streak_days").notNull().default(0),
    longestStreakDays: integer("longest_streak_days").notNull().default(0),
    lastStreakDate: timestamp("last_streak_date", { withTimezone: true }),

    // ── PWA / Push ────────────────────────────────────────────────────────────
    pushEnabled: boolean("push_enabled").notNull().default(false),

    // ── Timestamps ───────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    usernameIdx: uniqueIndex("users_username_idx").on(table.username),
    institutionIdx: index("users_institution_idx").on(table.institutionId),
    roleIdx: index("users_role_idx").on(table.role),
    statusIdx: index("users_status_idx").on(table.status),
    reputationIdx: index("users_reputation_score_idx").on(table.reputationScore),
    onboardingIdx: index("users_onboarding_complete_idx").on(table.onboardingComplete),
    verificationIdx: index("users_verification_status_idx").on(table.verificationStatus),
    lastActiveIdx: index("users_last_active_idx").on(table.lastActiveAt),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
    // Full-text search on username + displayName
    searchIdx: index("users_search_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(${table.displayName}, '') || ' ' || coalesce(${table.username}, ''))`
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// USER INTERESTS  (onboarding tag selection, used for recommendations)
// ─────────────────────────────────────────────────────────────────────────────

export const userInterests = pgTable(
  "user_interests",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull(), // FK defined in interactions.ts to avoid circular
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: { columns: [table.userId, table.tagId] },
    userIdIdx: index("user_interests_user_id_idx").on(table.userId),
    tagIdIdx: index("user_interests_tag_id_idx").on(table.tagId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// USER ACTIVITY LOG  (granular, high-write — partitioned by month in prod)
// ─────────────────────────────────────────────────────────────────────────────

export const userActivityLog = pgTable(
  "user_activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 100 }).notNull(),
    // e.g. "document_viewed", "document_downloaded", "comment_posted", "search_performed"
    entityType: varchar("entity_type", { length: 50 }),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    ipHash: varchar("ip_hash", { length: 64 }),        // SHA-256 of IP for analytics
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_activity_log_user_id_idx").on(table.userId),
    actionIdx: index("user_activity_log_action_idx").on(table.action),
    createdAtIdx: index("user_activity_log_created_at_idx").on(table.createdAt),
    entityIdx: index("user_activity_log_entity_idx").on(
      table.entityType,
      table.entityId
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE VIEW: public_user_profiles  (safe fields for public display)
// ─────────────────────────────────────────────────────────────────────────────

export const publicUserProfiles = pgView("public_user_profiles").as((qb) =>
  qb
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      coverUrl: users.coverUrl,
      role: users.role,
      verificationStatus: users.verificationStatus,
      institutionId: users.institutionId,
      faculty: users.faculty,
      major: users.major,
      reputationScore: users.reputationScore,
      reputationLevel: users.reputationLevel,
      followerCount: users.followerCount,
      followingCount: users.followingCount,
      documentCount: users.documentCount,
      totalDownloads: users.totalDownloads,
      externalLinks: users.externalLinks,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`${users.status} = 'active' AND ${users.deletedAt} IS NULL`)
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  authUser: one(authUsers, {
    fields: [users.id],
    references: [authUsers.id],
  }),
  institution: one(institutions, {
    fields: [users.institutionId],
    references: [institutions.id],
  }),
  interests: many(userInterests),
  activityLog: many(userActivityLog),
}));