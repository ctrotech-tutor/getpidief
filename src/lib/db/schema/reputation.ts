import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  real,
  timestamp,
  date,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users";
import { reputationEventTypeEnum, auditActionEnum, analyticsMetricEnum } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// REPUTATION EVENTS  (immutable ledger — never update, only insert)
// ─────────────────────────────────────────────────────────────────────────────

export const reputationEvents = pgTable(
  "reputation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: reputationEventTypeEnum("type").notNull(),
    pointsDelta: integer("points_delta").notNull(),    // positive or negative
    scoreAfter: integer("score_after").notNull(),      // denormalized post-event score
    referenceType: varchar("reference_type", { length: 50 }),
    // "document" | "comment" | "follow" | "badge" etc.
    referenceId: uuid("reference_id"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("reputation_events_user_idx").on(table.userId),
    typeIdx: index("reputation_events_type_idx").on(table.type),
    createdAtIdx: index("reputation_events_created_at_idx").on(table.createdAt),
    userCreatedAtIdx: index("reputation_events_user_created_at_idx").on(
      table.userId,
      table.createdAt
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// BADGES  (system-defined achievement definitions)
// ─────────────────────────────────────────────────────────────────────────────

export const badges = pgTable(
  "badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description").notNull(),
    icon: varchar("icon", { length: 100 }).notNull(),     // Lucide icon name or emoji
    color: varchar("color", { length: 7 }).notNull(),     // hex
    reputationBonus: integer("reputation_bonus").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isSecret: boolean("is_secret").notNull().default(false), // hidden until earned
    sortOrder: integer("sort_order").notNull().default(0),
    // Criteria for auto-award (evaluated by Inngest worker)
    criteriaType: varchar("criteria_type", { length: 100 }).notNull(),
    // e.g. "document_count" | "download_count" | "follower_count" |
    //      "like_count" | "streak_days" | "reputation_score" | "manual"
    criteriaValue: integer("criteria_value"),             // threshold value
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("badges_slug_idx").on(table.slug),
    isActiveIdx: index("badges_is_active_idx").on(table.isActive),
    criteriaTypeIdx: index("badges_criteria_type_idx").on(table.criteriaType),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// USER BADGES  (awarded instances)
// ─────────────────────────────────────────────────────────────────────────────

export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    awardedByAdminId: uuid("awarded_by_admin_id"), // null = auto-awarded by system
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
    notificationSent: boolean("notification_sent").notNull().default(false),
  },
  (table) => ({
    // One award per badge per user
    userBadgeIdx: uniqueIndex("user_badges_user_badge_idx").on(
      table.userId,
      table.badgeId
    ),
    userIdx: index("user_badges_user_idx").on(table.userId),
    badgeIdx: index("user_badges_badge_idx").on(table.badgeId),
    awardedAtIdx: index("user_badges_awarded_at_idx").on(table.awardedAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS  (admin action log — immutable)
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: auditActionEnum("action").notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    // Snapshot before/after for rollback audit trails
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    reason: text("reason"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    adminIdx: index("audit_logs_admin_idx").on(table.adminId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DAILY ANALYTICS SNAPSHOTS  (pre-aggregated by Inngest — never query raw logs)
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsSnapshots = pgTable(
  "analytics_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    metric: analyticsMetricEnum("metric").notNull(),
    // Breakdown dimension (optional) — e.g. { institutionId, categoryId }
    dimensionType: varchar("dimension_type", { length: 50 }),
    dimensionId: uuid("dimension_id"),
    value: bigint("value", { mode: "number" }).notNull().default(0),
    // Cumulative total (running total from day 0)
    cumulativeValue: bigint("cumulative_value", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One snapshot per metric per dimension per date
    dateDimIdx: uniqueIndex("analytics_snapshots_date_dim_idx").on(
      table.date,
      table.metric,
      table.dimensionType,
      table.dimensionId
    ),
    dateIdx: index("analytics_snapshots_date_idx").on(table.date),
    metricIdx: index("analytics_snapshots_metric_idx").on(table.metric),
    dimensionIdx: index("analytics_snapshots_dimension_idx").on(
      table.dimensionType,
      table.dimensionId
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM SETTINGS  (key-value store for admin-configurable settings)
// ─────────────────────────────────────────────────────────────────────────────

export const systemSettings = pgTable(
  "system_settings",
  {
    key: varchar("key", { length: 100 }).primaryKey(),
    value: jsonb("value").notNull(),
    description: text("description"),
    updatedByAdminId: uuid("updated_by_admin_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const reputationEventsRelations = relations(reputationEvents, ({ one }) => ({
  user: one(users, {
    fields: [reputationEvents.userId],
    references: [users.id],
  }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, { fields: [userBadges.userId], references: [users.id] }),
  badge: one(badges, { fields: [userBadges.badgeId], references: [badges.id] }),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(users, { fields: [auditLogs.adminId], references: [users.id] }),
}));