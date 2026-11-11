import { pgTable, uuid, text, timestamp, index, primaryKey, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, table => ({ feedIdx: index("posts_feed_idx").on(table.createdAt, table.id) }));
export const postReplies = pgTable("post_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, table => ({ postIdx: index("post_replies_post_idx").on(table.postId, table.createdAt, table.id) }));
export const postLikes = pgTable("post_likes", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, table => ({ pk: primaryKey({ columns: [table.postId, table.userId] }) }));
export const postSaves = pgTable("post_saves", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => ({ pk: primaryKey({ columns: [table.postId, table.userId] }), userIdx: index("post_saves_user_idx").on(table.userId, table.createdAt) }));

// One report per reporter and target. Reports remain available to reviewers after removal.
export const feedReports = pgTable("feed_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  replyId: uuid("reply_id").references(() => postReplies.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
}, table => ({
  postUnique: uniqueIndex("feed_reports_post_reporter_idx").on(table.reporterId, table.postId).where(sql`${table.replyId} is null`),
  replyUnique: uniqueIndex("feed_reports_reply_reporter_idx").on(table.reporterId, table.replyId).where(sql`${table.replyId} is not null`),
  queueIdx: index("feed_reports_queue_idx").on(table.status, table.createdAt, table.id),
  reasonCheck: check("feed_reports_reason_check", sql`${table.reason} in ('spam', 'harassment', 'misinformation', 'other')`),
  statusCheck: check("feed_reports_status_check", sql`${table.status} in ('open', 'dismissed', 'removed')`),
}));
