import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users";
import { notificationTypeEnum, notificationEntityTypeEnum } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOWS
// ─────────────────────────────────────────────────────────────────────────────

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One follow per pair
    followerFollowingIdx: uniqueIndex("follows_follower_following_idx").on(
      table.followerId,
      table.followingId
    ),
    followerIdx: index("follows_follower_idx").on(table.followerId),
    followingIdx: index("follows_following_idx").on(table.followingId),
    createdAtIdx: index("follows_created_at_idx").on(table.createdAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),

    type: notificationTypeEnum("type").notNull(),
    entityType: notificationEntityTypeEnum("entity_type"),
    entityId: uuid("entity_id"),           // document, comment, user, badge id

    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    // Extra data for rich notification rendering
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    // e.g. { documentTitle, documentSlug, commentExcerpt, badgeName, badgeIcon }

    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),

    // Delivery tracking
    emailSent: boolean("email_sent").notNull().default(false),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    pushSent: boolean("push_sent").notNull().default(false),
    pushSentAt: timestamp("push_sent_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    recipientIdx: index("notifications_recipient_idx").on(table.recipientId),
    recipientUnreadIdx: index("notifications_recipient_unread_idx").on(
      table.recipientId,
      table.isRead
    ),
    senderIdx: index("notifications_sender_idx").on(table.senderId),
    typeIdx: index("notifications_type_idx").on(table.type),
    entityIdx: index("notifications_entity_idx").on(table.entityType, table.entityId),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
    // For fetching unread count
    recipientUnreadCountIdx: index("notifications_unread_count_idx").on(
      table.recipientId,
      table.isRead,
      table.createdAt
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH HISTORY  (per user — for personalized autocomplete)
// ─────────────────────────────────────────────────────────────────────────────

export const searchHistory = pgTable(
  "search_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    resultCount: integer("result_count"),
    clickedDocumentId: uuid("clicked_document_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("search_history_user_idx").on(table.userId),
    createdAtIdx: index("search_history_created_at_idx").on(table.createdAt),
    userCreatedAtIdx: index("search_history_user_created_at_idx").on(
      table.userId,
      table.createdAt
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "user_followers",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "user_following",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: "user_notifications",
  }),
  sender: one(users, {
    fields: [notifications.senderId],
    references: [users.id],
    relationName: "user_sent_notifications",
  }),
}));