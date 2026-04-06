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
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { institutionTypeEnum } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const institutions = pgTable(
  "institutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    shortName: varchar("short_name", { length: 100 }),
    country: varchar("country", { length: 100 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    city: varchar("city", { length: 100 }),
    type: institutionTypeEnum("type").notNull().default("university"),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    websiteUrl: text("website_url"),
    // Email domains for auto-verification, stored as array
    emailDomains: text("email_domains")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    isActive: boolean("is_active").notNull().default(true),
    isVerified: boolean("is_verified").notNull().default(false),
    // Denormalized counts — updated by Inngest workers
    documentCount: integer("document_count").notNull().default(0),
    userCount: integer("user_count").notNull().default(0),
    contributorCount: integer("contributor_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("institutions_slug_idx").on(table.slug),
    countryIdx: index("institutions_country_idx").on(table.country),
    countryCodeIdx: index("institutions_country_code_idx").on(table.countryCode),
    typeIdx: index("institutions_type_idx").on(table.type),
    isActiveIdx: index("institutions_is_active_idx").on(table.isActive),
    documentCountIdx: index("institutions_document_count_idx").on(table.documentCount),
    // Full-text search on institution name
    nameSearchIdx: index("institutions_name_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.name} || ' ' || coalesce(${table.shortName}, ''))`
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTION REQUESTS  (user-submitted, pending admin approval)
// ─────────────────────────────────────────────────────────────────────────────

export const institutionRequests = pgTable(
  "institution_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestedByUserId: uuid("requested_by_user_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    websiteUrl: text("website_url"),
    additionalInfo: text("additional_info"),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    // "pending" | "approved" | "rejected"
    resolvedByAdminId: uuid("resolved_by_admin_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdInstitutionId: uuid("created_institution_id").references(
      () => institutions.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("institution_requests_status_idx").on(table.status),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES  (hierarchical — supports one level of sub-categories)
// ─────────────────────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 150 }).notNull().unique(),
    description: text("description"),
    icon: varchar("icon", { length: 100 }),    // Lucide icon name
    color: varchar("color", { length: 7 }).notNull().default("#2563EB"),
    parentId: uuid("parent_id"),               // Self-ref: set for sub-categories
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    // Denormalized
    documentCount: integer("document_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("categories_slug_idx").on(table.slug),
    parentIdx: index("categories_parent_idx").on(table.parentId),
    isActiveIdx: index("categories_is_active_idx").on(table.isActive),
    isFeaturedIdx: index("categories_is_featured_idx").on(table.isFeatured),
    sortOrderIdx: index("categories_sort_order_idx").on(table.sortOrder),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// TAGS  (free-form, user-generated, normalized)
// ─────────────────────────────────────────────────────────────────────────────

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    isSystemTag: boolean("is_system_tag").notNull().default(false),
    // Denormalized — updated by worker
    usageCount: integer("usage_count").notNull().default(0),
    // Merge support: when tags are merged, old tag points to canonical
    mergedIntoTagId: uuid("merged_into_tag_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("tags_slug_idx").on(table.slug),
    nameIdx: uniqueIndex("tags_name_idx").on(table.name),
    isActiveIdx: index("tags_is_active_idx").on(table.isActive),
    usageCountIdx: index("tags_usage_count_idx").on(table.usageCount),
    // Trigram index for fuzzy tag search
    nameTrgmIdx: index("tags_name_trgm_idx").using(
      "gin",
      sql`${table.name} gin_trgm_ops`
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// COURSE CODES  (per institution)
// ─────────────────────────────────────────────────────────────────────────────

export const courseCodes = pgTable(
  "course_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }),
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "cascade",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    documentCount: integer("document_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Unique per institution
    codeInstIdx: uniqueIndex("course_codes_code_inst_idx").on(
      table.code,
      table.institutionId
    ),
    institutionIdx: index("course_codes_institution_idx").on(table.institutionId),
    categoryIdx: index("course_codes_category_idx").on(table.categoryId),
    codeSearchIdx: index("course_codes_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.code} || ' ' || coalesce(${table.name}, ''))`
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const institutionsRelations = relations(institutions, ({ many }) => ({
  users: many(users_placeholder),
  courseCodes: many(courseCodes),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_hierarchy",
  }),
  children: many(categories, { relationName: "category_hierarchy" }),
  courseCodes: many(courseCodes),
}));

export const tagsRelations = relations(tags, ({ one }) => ({
  mergedInto: one(tags, {
    fields: [tags.mergedIntoTagId],
    references: [tags.id],
    relationName: "tag_merge",
  }),
}));

export const courseCodesRelations = relations(courseCodes, ({ one }) => ({
  institution: one(institutions, {
    fields: [courseCodes.institutionId],
    references: [institutions.id],
  }),
  category: one(categories, {
    fields: [courseCodes.categoryId],
    references: [categories.id],
  }),
}));

// placeholder to avoid circular import — actual import in index.ts
const users_placeholder = {} as any;