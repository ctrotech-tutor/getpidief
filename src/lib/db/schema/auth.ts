import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH.JS v5 TABLES  (Neon adapter schema — do not rename columns)
// ─────────────────────────────────────────────────────────────────────────────

export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("auth_users_email_idx").on(table.email),
  })
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull(),                    // "oauth" | "email" | "credentials"
    provider: text("provider").notNull(),            // "google" | "credentials"
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
    userIdIdx: index("auth_accounts_user_id_idx").on(table.userId),
  })
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
    // Extra: track device info for security
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("auth_sessions_user_id_idx").on(table.userId),
    expiresIdx: index("auth_sessions_expires_idx").on(table.expires),
  })
);

export const authVerificationTokens = pgTable(
  "auth_verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
    tokenIdx: uniqueIndex("auth_verification_tokens_token_idx").on(table.token),
  })
);

// ─── Password reset tokens (separate from NextAuth verification tokens) ───────

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(), // bcrypt hash of raw token
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("password_reset_tokens_hash_idx").on(table.tokenHash),
    userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
    expiresAtIdx: index("password_reset_tokens_expires_idx").on(table.expiresAt),
  })
);

// ─── Push notification subscriptions ─────────────────────────────────────────

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("push_subscriptions_user_id_idx").on(table.userId),
    endpointIdx: uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint),
  })
);

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const authUsersRelations = relations(authUsers, ({ many }) => ({
  accounts: many(authAccounts),
  sessions: many(authSessions),
  passwordResets: many(passwordResetTokens),
  pushSubscriptions: many(pushSubscriptions),
}));

export const authAccountsRelations = relations(authAccounts, ({ one }) => ({
  user: one(authUsers, {
    fields: [authAccounts.userId],
    references: [authUsers.id],
  }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(authUsers, {
    fields: [authSessions.userId],
    references: [authUsers.id],
  }),
}));