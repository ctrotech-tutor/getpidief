// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA INDEX  — single import point for all schema + relations
// Usage: import { users, documents, ... } from "@/lib/db/schema"
// ─────────────────────────────────────────────────────────────────────────────

export * from "./enums";
export * from "./auth";
export * from "./users";
export * from "./institutions";
export * from "./documents";
export * from "./interactions";
export * from "./social";
export * from "./reputation";

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-TABLE RELATIONS  (defined here to avoid circular imports)
// ─────────────────────────────────────────────────────────────────────────────

import { relations } from "drizzle-orm";

import { authUsers } from "./auth";
import { users, userInterests } from "./users";
import { institutions, categories, tags, courseCodes } from "./institutions";
import {
  documents,
  documentTags,
  documentViews,
  documentDownloads,
  documentCourseCodes,
} from "./documents";
import {
  documentReactions,
  documentBookmarks,
  bookmarkCollections,
  comments,
  commentHelpfulVotes,
  documentReports,
  documentShares,
} from "./interactions";
import { follows, notifications, searchHistory } from "./social";
import {
  reputationEvents,
  badges,
  userBadges,
  auditLogs,
} from "./reputation";

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersFullRelations = relations(users, ({ one, many }) => ({
  authUser: one(authUsers, { fields: [users.id], references: [authUsers.id] }),
  institution: one(institutions, {
    fields: [users.institutionId],
    references: [institutions.id],
  }),
  interests: many(userInterests),
  documents: many(documents),
  reactions: many(documentReactions),
  bookmarks: many(documentBookmarks),
  bookmarkCollections: many(bookmarkCollections),
  comments: many(comments),
  reports: many(documentReports),
  followers: many(follows, { relationName: "user_following" }),
  following: many(follows, { relationName: "user_followers" }),
  notifications: many(notifications, { relationName: "user_notifications" }),
  sentNotifications: many(notifications, { relationName: "user_sent_notifications" }),
  reputationEvents: many(reputationEvents),
  badges: many(userBadges),
  searchHistory: many(searchHistory),
}));

// ── Institutions ──────────────────────────────────────────────────────────────

export const institutionsFullRelations = relations(institutions, ({ many }) => ({
  users: many(users),
  documents: many(documents),
  courseCodes: many(courseCodes),
}));

// ── Tags ──────────────────────────────────────────────────────────────────────

export const tagsFullRelations = relations(tags, ({ one, many }) => ({
  mergedInto: one(tags, {
    fields: [tags.mergedIntoTagId],
    references: [tags.id],
    relationName: "tag_merge",
  }),
  documentTags: many(documentTags),
  userInterests: many(userInterests),
}));

// ── User Interests ────────────────────────────────────────────────────────────

export const userInterestsFullRelations = relations(userInterests, ({ one }) => ({
  user: one(users, { fields: [userInterests.userId], references: [users.id] }),
  tag: one(tags, { fields: [userInterests.tagId], references: [tags.id] }),
}));

// ── Documents (full) ──────────────────────────────────────────────────────────

export const documentsFullRelations = relations(documents, ({ one, many }) => ({
  author: one(users, { fields: [documents.authorId], references: [users.id] }),
  institution: one(institutions, {
    fields: [documents.institutionId],
    references: [institutions.id],
  }),
  category: one(categories, {
    fields: [documents.categoryId],
    references: [categories.id],
  }),
  duplicateOf: one(documents, {
    fields: [documents.duplicateOfId],
    references: [documents.id],
    relationName: "duplicate",
  }),
  documentTags: many(documentTags),
  documentCourseCodes: many(documentCourseCodes),
  views: many(documentViews),
  downloads: many(documentDownloads),
  reactions: many(documentReactions),
  bookmarks: many(documentBookmarks),
  comments: many(comments),
  reports: many(documentReports),
  shares: many(documentShares),
}));