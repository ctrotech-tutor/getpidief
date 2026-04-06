import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
  real,
  customType,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./users";
import { institutions, categories, tags, courseCodes } from "./institutions";
import {
  documentStatusEnum,
  resourceTypeEnum,
  visibilityEnum,
  licenseEnum,
  previewStatusEnum,
  semesterEnum,
} from "./enums";

// ─── Custom tsvector type for Drizzle ─────────────────────────────────────────

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS  (core table — the heart of getpidief)
// ─────────────────────────────────────────────────────────────────────────────

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 300 }).notNull().unique(),

    // ── Core Metadata ─────────────────────────────────────────────────────────
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    language: varchar("language", { length: 10 }).notNull().default("en"),

    // ── Classification ────────────────────────────────────────────────────────
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    resourceType: resourceTypeEnum("resource_type").notNull().default("other"),
    semester: semesterEnum("semester"),
    academicYear: integer("academic_year"),          // e.g. 2023

    // ── Institutional Context ─────────────────────────────────────────────────
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "set null",
    }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // ── File Storage ──────────────────────────────────────────────────────────
    fileUrl: text("file_url").notNull(),             // R2 object key / full URL
    fileSize: bigint("file_size", { mode: "number" }), // bytes
    fileHash: varchar("file_hash", { length: 64 }),  // SHA-256 for dedup
    mimeType: varchar("mime_type", { length: 100 }).notNull().default("application/pdf"),

    // ── Preview / Thumbnail ───────────────────────────────────────────────────
    thumbnailUrl: text("thumbnail_url"),
    previewStatus: previewStatusEnum("preview_status").notNull().default("pending"),
    previewError: text("preview_error"),
    pageCount: integer("page_count"),

    // ── Visibility & License ──────────────────────────────────────────────────
    visibility: visibilityEnum("visibility").notNull().default("public"),
    license: licenseEnum("license").notNull().default("academic_use_only"),
    allowDownload: boolean("allow_download").notNull().default(true),
    allowPrint: boolean("allow_print").notNull().default(true),

    // ── Moderation ────────────────────────────────────────────────────────────
    status: documentStatusEnum("status").notNull().default("pending"),
    rejectionReasons: text("rejection_reasons").array(),
    rejectionNote: text("rejection_note"),           // admin note to contributor
    moderatedByAdminId: uuid("moderated_by_admin_id"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    flaggedAt: timestamp("flagged_at", { withTimezone: true }),
    flagCount: integer("flag_count").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),

    // ── Denormalized Engagement Counters (updated by workers) ─────────────────
    viewCount: integer("view_count").notNull().default(0),
    uniqueViewCount: integer("unique_view_count").notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    dislikeCount: integer("dislike_count").notNull().default(0),
    bookmarkCount: integer("bookmark_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),

    // ── Trending Score (composite, updated by worker every 15min) ─────────────
    trendingScore: real("trending_score").notNull().default(0),

    // ── Full-Text Search Vector ───────────────────────────────────────────────
    // Weighted: title (A), description (B), category (C), tags (C), course code (D)
    searchVector: tsvector("search_vector"),

    // ── Duplicate Detection ───────────────────────────────────────────────────
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    duplicateOfId: uuid("duplicate_of_id"),

    // ── Timestamps ───────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    // ── Unique ────────────────────────────────────────────────────────────────
    slugIdx: uniqueIndex("documents_slug_idx").on(table.slug),
    fileHashIdx: index("documents_file_hash_idx").on(table.fileHash),

    // ── Foreign Keys ──────────────────────────────────────────────────────────
    authorIdx: index("documents_author_id_idx").on(table.authorId),
    institutionIdx: index("documents_institution_id_idx").on(table.institutionId),
    categoryIdx: index("documents_category_id_idx").on(table.categoryId),

    // ── Status & Visibility (most common query filters) ────────────────────────
    statusIdx: index("documents_status_idx").on(table.status),
    visibilityIdx: index("documents_visibility_idx").on(table.visibility),
    statusVisibilityIdx: index("documents_status_visibility_idx").on(
      table.status,
      table.visibility
    ),

    // ── Classification ────────────────────────────────────────────────────────
    resourceTypeIdx: index("documents_resource_type_idx").on(table.resourceType),
    academicYearIdx: index("documents_academic_year_idx").on(table.academicYear),
    languageIdx: index("documents_language_idx").on(table.language),

    // ── Sorting & Trending ────────────────────────────────────────────────────
    trendingScoreIdx: index("documents_trending_score_idx").on(table.trendingScore),
    downloadCountIdx: index("documents_download_count_idx").on(table.downloadCount),
    likeCountIdx: index("documents_like_count_idx").on(table.likeCount),
    publishedAtIdx: index("documents_published_at_idx").on(table.publishedAt),
    createdAtIdx: index("documents_created_at_idx").on(table.createdAt),

    // ── Compound indexes for common queries ───────────────────────────────────
    // "Get approved public docs for institution, sorted by date"
    instStatusPubIdx: index("documents_inst_status_pub_idx").on(
      table.institutionId,
      table.status,
      table.visibility,
      table.publishedAt
    ),
    // "Get approved public docs for category"
    catStatusPubIdx: index("documents_cat_status_pub_idx").on(
      table.categoryId,
      table.status,
      table.visibility
    ),
    // "Author's docs"
    authorStatusIdx: index("documents_author_status_idx").on(
      table.authorId,
      table.status
    ),

    // ── GIN index for full-text search ────────────────────────────────────────
    searchVectorIdx: index("documents_search_vector_idx").using(
      "gin",
      table.searchVector
    ),

    // ── Soft delete ───────────────────────────────────────────────────────────
    deletedAtIdx: index("documents_deleted_at_idx").on(table.deletedAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TAGS  (M:M junction)
// ─────────────────────────────────────────────────────────────────────────────

export const documentTags = pgTable(
  "document_tags",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: { columns: [table.documentId, table.tagId] },
    documentIdx: index("document_tags_document_idx").on(table.documentId),
    tagIdx: index("document_tags_tag_idx").on(table.tagId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT COURSE CODES  (M:M — a doc can cover multiple courses)
// ─────────────────────────────────────────────────────────────────────────────

export const documentCourseCodes = pgTable(
  "document_course_codes",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    courseCodeId: uuid("course_code_id")
      .notNull()
      .references(() => courseCodes.id, { onDelete: "cascade" }),
    // Raw code string for when the exact code doesn't exist yet in courseCodes
    rawCode: varchar("raw_code", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: { columns: [table.documentId, table.courseCodeId] },
    documentIdx: index("doc_course_codes_document_idx").on(table.documentId),
    courseCodeIdx: index("doc_course_codes_course_code_idx").on(table.courseCodeId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT VIEWS  (high-write, partitioned by month in production)
// Kept separate from documents table to avoid hot-row updates
// ─────────────────────────────────────────────────────────────────────────────

export const documentViews = pgTable(
  "document_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: varchar("session_id", { length: 64 }),   // anonymous session tracking
    ipHash: varchar("ip_hash", { length: 64 }),         // SHA-256 of IP
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    durationSeconds: integer("duration_seconds"),       // time spent viewing
    pagesViewed: integer("pages_viewed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdx: index("document_views_document_idx").on(table.documentId),
    userIdx: index("document_views_user_idx").on(table.userId),
    createdAtIdx: index("document_views_created_at_idx").on(table.createdAt),
    // For unique view counting
    docSessionIdx: index("document_views_doc_session_idx").on(
      table.documentId,
      table.sessionId
    ),
    docUserIdx: index("document_views_doc_user_idx").on(
      table.documentId,
      table.userId
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT DOWNLOADS  (separate log for download events)
// ─────────────────────────────────────────────────────────────────────────────

export const documentDownloads = pgTable(
  "document_downloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdx: index("document_downloads_document_idx").on(table.documentId),
    userIdx: index("document_downloads_user_idx").on(table.userId),
    createdAtIdx: index("document_downloads_created_at_idx").on(table.createdAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// SQL TRIGGER FUNCTION: auto-update search_vector on insert/update
// Run this in your initial migration
// ─────────────────────────────────────────────────────────────────────────────

export const SEARCH_VECTOR_TRIGGER_SQL = sql`
  -- Function to rebuild the tsvector for a document
  CREATE OR REPLACE FUNCTION documents_search_vector_update()
  RETURNS trigger AS $$
  BEGIN
    NEW.search_vector :=
      setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Trigger: fires on INSERT and UPDATE of title/description
  DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents;
  CREATE TRIGGER documents_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title, description
    ON documents
    FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();
`;

// After inserting document_tags, we need to also update the vector with tags
// This is handled in the Inngest worker after tag insertion

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const documentsRelations = relations(documents, ({ one, many }) => ({
  author: one(users, {
    fields: [documents.authorId],
    references: [users.id],
  }),
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
}));

export const documentTagsRelations = relations(documentTags, ({ one }) => ({
  document: one(documents, {
    fields: [documentTags.documentId],
    references: [documents.id],
  }),
  tag: one(tags, {
    fields: [documentTags.tagId],
    references: [tags.id],
  }),
}));