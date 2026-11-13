import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db/client";
import {
  authUsers,
  authAccounts,
  authSessions,
  authVerificationTokens,
  users,
} from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { rateLimiters, redisRateLimit } from "@/lib/redis/client";

type AuthSessionUser = {
  id?: string;
  sessionVersion?: number;
  role?: string;
  status?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  onboardingComplete?: boolean;
  institutionId?: string | null;
  verificationStatus?: string;
  reputationScore?: number;
  reputationLevel?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// FULL SERVER AUTH CONFIG
//
// ⚠️  Server-only — imports DB, bcrypt, inngest.
//     NEVER import this file in middleware.ts.
//     Use auth.config.ts in middleware instead.
// ─────────────────────────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,

  // ── Database adapter ─────────────────────────────────────────────────────
  adapter: {
    ...DrizzleAdapter(db, {
      usersTable: authUsers,
      // @ts-expect-error -- tokens are intentionally not stored for sign-in-only OAuth
      accountsTable: authAccounts,
      sessionsTable: authSessions,
      verificationTokensTable: authVerificationTokens,
    }),
    // Create the identity and application profile atomically. Auth.js events are
    // best-effort and must not be responsible for essential database records.
    async createUser(data) {
      return db.transaction(async (tx) => {
        const [identity] = await tx
          .insert(authUsers)
          .values({
            name: data.name,
            email: data.email,
            emailVerified: data.emailVerified,
            image: data.image,
          })
          .returning();
        const username = `learner_${identity.id.replaceAll("-", "").slice(0, 24)}`;
        await tx.insert(users).values({
          id: identity.id,
          username,
          displayName: (data.name?.trim() || username).slice(0, 100),
          avatarUrl: data.image ?? null,
          onboardingComplete: false,
          onboardingStep: 1,
        });
        return identity;
      });
    },
  },

  // ── Signed JWT sessions, checked against the database version ──────────
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Sign-in does not need Google API access or refresh tokens.
      account: () => ({}),
    }),

    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        // The client calls Auth.js directly, so limiting only a server action is insufficient.
        if (process.env.NODE_ENV === "production" && !redisRateLimit) return null;
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        try {
          if (!(await rateLimiters.login.limit(ip)).success) return null;
        } catch {
          return null;
        }
        const parsed = z
          .object({
            email: z.string().email(),
            password: z
              .string()
              .min(8)
              .max(72)
              .refine((value) => new TextEncoder().encode(value).length <= 72),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Fetch auth user by email
        const authUser = await db.query.authUsers.findFirst({
          where: eq(authUsers.email, email.toLowerCase()),
        });
        if (!authUser) return null;

        // Check credentials account (password stored in providerAccountId field)
        const account = await db.query.authAccounts.findFirst({
          where: and(
            eq(authAccounts.userId, authUser.id),
            eq(authAccounts.provider, "credentials")
          ),
        });
        if (!account?.providerAccountId) return null;

        const passwordMatch = await bcrypt.compare(password, account.providerAccountId);
        if (!passwordMatch) return null;

        // Check profile status
        const profile = await db.query.users.findFirst({
          where: eq(users.id, authUser.id),
          columns: {
            status: true,
            onboardingComplete: true,
            role: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            institutionId: true,
            verificationStatus: true,
            reputationScore: true,
            reputationLevel: true,
          },
        });

        if (profile?.status === "suspended") return null;
        if (profile?.status === "deleted") return null;

        return {
          id: authUser.id,
          sessionVersion: authUser.sessionVersion,
          email: authUser.email,
          name: authUser.name,
          image: authUser.image,
          // Extended profile fields attached to user object
          role: profile?.role ?? "student",
          status: profile?.status ?? "active",
          username: profile?.username ?? "",
          displayName: profile?.displayName ?? authUser.name ?? "",
          avatarUrl: profile?.avatarUrl ?? authUser.image ?? null,
          onboardingComplete: profile?.onboardingComplete ?? false,
          institutionId: profile?.institutionId ?? null,
          verificationStatus: profile?.verificationStatus ?? "unverified",
          reputationScore: profile?.reputationScore ?? 0,
          reputationLevel: profile?.reputationLevel ?? "scholar",
        } as AuthSessionUser;
      },
    }),
  ],

  callbacks: {
    // Extend the edge-safe callbacks with DB-aware sign-in check
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Auth.js runs this callback before creating a first-time OAuth user.
        // Only a Google-verified email is accepted. Do not auto-link by email.
        if (profile?.email_verified !== true || typeof profile.email !== "string" || !profile.email)
          return false;
        if (!user.id) return false;
        const existing = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: { status: true, deletedAt: true },
        });
        return !existing || (existing.status === "active" && !existing.deletedAt);
      }
      if (!user.id) return false;
      const authUser = await db.query.authUsers.findFirst({
        where: eq(authUsers.id, user.id),
        columns: { emailVerified: true },
      });
      if (!authUser?.emailVerified) return "/verify-email";
      const profileRow = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { status: true, deletedAt: true },
      });
      return !!profileRow && profileRow.status === "active" && !profileRow.deletedAt;
    },

    // Inherit jwt + session from authConfig
    ...authConfig.callbacks,

    // Override jwt to enrich with fresh DB profile data
    async jwt({ token, user, trigger }) {
      // Every server-side session check consults the current version. Edge proxy
      // checks are only a routing convenience, never authorization.
      const id = user?.id ?? (typeof token.id === "string" ? token.id : undefined);
      if (!id) return null;
      const account = await db.query.authUsers.findFirst({
        where: eq(authUsers.id, id),
        columns: { sessionVersion: true },
      });
      if (!account) return null;
      if (user) {
        const version = (user as AuthSessionUser).sessionVersion;
        // Credentials were verified against this version. Reject a concurrent reset.
        if (version !== undefined && version !== account.sessionVersion) return null;
        token.sessionVersion = account.sessionVersion;
      } else if (
        typeof token.sessionVersion !== "number" ||
        token.sessionVersion !== account.sessionVersion
      ) {
        return null;
      }
      if (user) token.id = user.id!;
      // OAuth users returned by the adapter contain identity, not our profile.
      // Refresh from DB on sign-in and update; never trust client update fields.
      if ((user || trigger === "update") && typeof token.id === "string") {
        const profile = await db.query.users.findFirst({
          where: eq(users.id, token.id),
          columns: {
            role: true,
            status: true,
            deletedAt: true,
            onboardingComplete: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            institutionId: true,
            verificationStatus: true,
            reputationScore: true,
            reputationLevel: true,
          },
        });
        if (!profile || profile.status !== "active" || profile.deletedAt) return null;
        token.role = profile.role;
        token.status = profile.status;
        token.onboardingComplete = profile.onboardingComplete;
        token.username = profile.username;
        token.displayName = profile.displayName;
        token.avatarUrl = profile.avatarUrl;
        token.institutionId = profile.institutionId;
        token.verificationStatus = profile.verificationStatus;
        token.reputationScore = profile.reputationScore;
        token.reputationLevel = profile.reputationLevel;
      }

      return token;
    },
  },

  events: {
    // ── New user created ────────────────────────────────────────────────────
    async createUser({ user }) {
      if (!user.id) return;
      const username = `learner_${user.id.replaceAll("-", "").slice(0, 24)}`;
      void dispatchInngestEvent("user/registered", {
        userId: user.id!,
        email: user.email!,
        name: user.name ?? username,
        provider: "google",
      });
    },

    // ── User signed in ──────────────────────────────────────────────────────
    async signIn({ user }) {
      if (!user.id) return;

      await db
        .update(users)
        .set({
          lastActiveAt: new Date(),
          lastSeenAt: new Date(),
          loginCount: sql`login_count + 1`,
        })
        .where(eq(users.id, user.id));

      void dispatchInngestEvent("user/streak-update", { userId: user.id });
    },
  },
});

/**
 * Auth events should never fail user login/signup flow.
 * If Inngest is unavailable (e.g. local dev server down), log and continue.
 */
async function dispatchInngestEvent(name: string, data: Record<string, unknown>) {
  try {
    await inngest.send({ name, data } as never);
  } catch (error) {
    console.warn(`[Auth] Failed to dispatch Inngest event "${name}"`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const session = await auth();
  return (session?.user as AuthSessionUser) ?? null;
}

export async function requireAuth(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("UNAUTHORIZED");
  return user.id as string;
}

export async function requireRole(...roles: string[]): Promise<{ id: string; role: string }> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("UNAUTHORIZED");
  if (!roles.includes(user.role as string)) throw new Error("FORBIDDEN");
  return { id: user.id as string, role: user.role as string };
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return ["admin", "super_admin"].includes((user?.role as string) ?? "");
}
