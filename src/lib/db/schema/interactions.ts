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
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users";
import { documents } from "./documents";
import { visibilityEnum, reactionTypeEnum } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT REACTIONS  (likes / dislikes — unique per user+document)
// ─────────────────────────────────────────────────────────────────────────────

export const documentReactions = pgTable(
  "document_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: reactionTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One reaction per user per document
    userDocIdx: uniqueIndex("document_reactions_user_doc_idx").on(
      table.userId,
      table.documentId
    ),
    documentIdx: index("document_reactions_document_idx").on(table.documentId),
    userIdx: index("document_reactions_user_idx").on(table.userId),
    typeIdx: index("document_reactions_type_idx").on(table.type),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// BOOKMARK COLLECTIONS  (user-created folders)
// ─────────────────────────────────────────────────────────────────────────────

export const bookmarkCollections = pgTable(
  "bookmark_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    // Cover image: derived from first 4 document thumbnails in worker
    coverUrls: text("cover_urls").array().default(sql`ARRAY[]::text[]`),
    documentCount: integer("document_count").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false), // "Saved" default collection
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("bookmark_collections_user_idx").on(table.userId),
    visibilityIdx: index("bookmark_collections_visibility_idx").on(table.visibility),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT BOOKMARKS
// ─────────────────────────────────────────────────────────────────────────────

export const documentBookmarks = pgTable(
  "document_bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").references(() => bookmarkCollections.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One bookmark per user per document
    userDocIdx: uniqueIndex("document_bookmarks_user_doc_idx").on(
      table.userId,
      table.documentId
    ),
    userIdx: index("document_bookmarks_user_idx").on(table.userId),
    documentIdx: index("document_bookmarks_document_idx").on(table.documentId),
    collectionIdx: index("document_bookmarks_collection_idx").on(table.collectionId),
    createdAtIdx: index("document_bookmarks_created_at_idx").on(table.createdAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// COMMENTS  (nested — max 2 levels enforced in application layer)
// ─────────────────────────────────────────────────────────────────────────────

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Self-referential: null = top-level, set = reply
    parentId: uuid("parent_id"),
    // Root comment id (for efficient "get all replies for root" queries)
    rootId: uuid("root_id"),

    content: text("content").notNull(),
    // Rendered HTML cached from Markdown — updated on edit
    contentHtml: text("content_html"),

    // ── State ─────────────────────────────────────────────────────────────────
    isEdited: boolean("is_edited").notNull().default(false),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    isFlagged: boolean("is_flagged").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false), // moderator pin

    // ── Denormalized ──────────────────────────────────────────────────────────
    replyCount: integer("reply_count").notNull().default(0),
    helpfulCount: integer("helpful_count").notNull().default(0),

    // ── Mentions ──────────────────────────────────────────────────────────────
    mentionedUserIds: uuid("mentioned_user_ids").array().default(sql`ARRAY[]::uuid[]`),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdx: index("comments_document_idx").on(table.documentId),
    userIdx: index("comments_user_idx").on(table.userId),
    parentIdx: index("comments_parent_idx").on(table.parentId),
    rootIdx: index("comments_root_idx").on(table.rootId),
    createdAtIdx: index("comments_created_at_idx").on(table.createdAt),
    // Compound: "get all active top-level comments for a document sorted by date"
    docActiveTopLevelIdx: index("comments_doc_active_top_level_idx").on(
      table.documentId,
      table.parentId,
      table.isDeleted,
      table.createdAt
    ),
    isFlaggedIdx: index("comments_is_flagged_idx").on(table.isFlagged),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// COMMENT HELPFUL VOTES
// ─────────────────────────────────────────────────────────────────────────────

export const commentHelpfulVotes = pgTable(
  "comment_helpful_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One vote per user per comment
    userCommentIdx: uniqueIndex("comment_helpful_votes_user_comment_idx").on(
      table.userId,
      table.commentId
    ),
    commentIdx: index("comment_helpful_votes_comment_idx").on(table.commentId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT REPORTS  (user-submitted flags)
// ─────────────────────────────────────────────────────────────────────────────

export const documentReports = pgTable(
  "document_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    reportedByUserId: uuid("reported_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reasons: text("reasons").array().notNull(), // reportReasonEnum values
    additionalInfo: text("additional_info"),
    status: varchar("status", { length: 50 }).notNull().default("open"),
    // "open" | "under_review" | "resolved_actioned" | "resolved_dismissed"
    resolvedByAdminId: uuid("resolved_by_admin_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdx: index("document_reports_document_idx").on(table.documentId),
    reporterIdx: index("document_reports_reporter_idx").on(table.reportedByUserId),
    statusIdx: index("document_reports_status_idx").on(table.status),
    // Prevent duplicate reports from same user
    userDocIdx: uniqueIndex("document_reports_user_doc_idx").on(
      table.reportedByUserId,
      table.documentId
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT SHARES  (track share events for analytics)
// ─────────────────────────────────────────────────────────────────────────────

export const documentShares = pgTable(
  "document_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    platform: varchar("platform", { length: 50 }),
    // "copy_link" | "whatsapp" | "telegram" | "twitter" | "linkedin" | "email"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdx: index("document_shares_document_idx").on(table.documentId),
    createdAtIdx: index("document_shares_created_at_idx").on(table.createdAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const documentReactionsRelations = relations(documentReactions, ({ one }) => ({
  document: one(documents, {
    fields: [documentReactions.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentReactions.userId],
    references: [users.id],
  }),
}));

export const bookmarkCollectionsRelations = relations(
  bookmarkCollections,
  ({ one, many }) => ({
    user: one(users, {
      fields: [bookmarkCollections.userId],
      references: [users.id],
    }),
    bookmarks: many(documentBookmarks),
  })
);

export const documentBookmarksRelations = relations(documentBookmarks, ({ one }) => ({
  user: one(users, { fields: [documentBookmarks.userId], references: [users.id] }),
  document: one(documents, {
    fields: [documentBookmarks.documentId],
    references: [documents.id],
  }),
  collection: one(bookmarkCollections, {
    fields: [documentBookmarks.collectionId],
    references: [bookmarkCollections.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  document: one(documents, {
    fields: [comments.documentId],
    references: [documents.id],
  }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_replies",
  }),
  replies: many(comments, { relationName: "comment_replies" }),
  helpfulVotes: many(commentHelpfulVotes),
}));