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

type AuthSessionUser = {
  id?: string;
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  // ── Database adapter ─────────────────────────────────────────────────────
  adapter: DrizzleAdapter(db, {
    usersTable:              authUsers,
    // @ts-expect-error -- project auth_accounts schema intentionally differs from Auth.js default account columns
    accountsTable:           authAccounts,
    sessionsTable:           authSessions,
    verificationTokensTable: authVerificationTokens,
  }),

  // ── Override session strategy to "database" for server contexts ──────────
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt:        "consent",
          access_type:   "offline",
          response_type: "code",
        },
      },
    }),

    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email:    z.string().email(),
            password: z.string().min(8),
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

        const passwordMatch = await bcrypt.compare(
          password,
          account.providerAccountId
        );
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
        if (profile?.status === "deleted")   return null;

        return {
          id:                  authUser.id,
          email:               authUser.email,
          name:                authUser.name,
          image:               authUser.image,
          // Extended profile fields attached to user object
          role:                profile?.role ?? "student",
          status:              profile?.status ?? "active",
          username:            profile?.username ?? "",
          displayName:         profile?.displayName ?? authUser.name ?? "",
          avatarUrl:           profile?.avatarUrl ?? authUser.image ?? null,
          onboardingComplete:  profile?.onboardingComplete ?? false,
          institutionId:       profile?.institutionId ?? null,
          verificationStatus:  profile?.verificationStatus ?? "unverified",
          reputationScore:     profile?.reputationScore ?? 0,
          reputationLevel:     profile?.reputationLevel ?? "scholar",
        } as AuthSessionUser;
      },
    }),
  ],

  callbacks: {
    // Extend the edge-safe callbacks with DB-aware sign-in check
    async signIn({ user }) {
      if (!user.id) return true;

      // Check auth user for email verification
      const authUser = await db.query.authUsers.findFirst({
        where: eq(authUsers.id, user.id),
        columns: { emailVerified: true },
      });

      if (!authUser?.emailVerified) {
        // User needs to verify email first
        return "/verify-email";
      }

      const profile = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { status: true },
      });

      if (profile?.status === "suspended") return false;
      if (profile?.status === "deleted")   return false;
      return true;
    },

    // Inherit jwt + session from authConfig
    ...authConfig.callbacks,

    // Override jwt to enrich with fresh DB profile data
    async jwt({ token, user, trigger, session: updateSession }) {
      // On sign-in: attach profile fields from user object
      if (user) {
        const u = user as AuthSessionUser;
        token.id                  = user.id!;
        token.role                = u.role                ?? "student";
        token.status              = u.status              ?? "active";
        token.username            = u.username            ?? "";
        token.displayName         = u.displayName         ?? user.name ?? "";
        token.avatarUrl           = u.avatarUrl           ?? null;
        token.onboardingComplete  = u.onboardingComplete  ?? false;
        token.institutionId       = u.institutionId       ?? null;
        token.verificationStatus  = u.verificationStatus  ?? "unverified";
        token.reputationScore     = u.reputationScore     ?? 0;
        token.reputationLevel     = u.reputationLevel     ?? "scholar";
      }

      // On update trigger (e.g. after onboarding completes)
      if (trigger === "update" && updateSession) {
        Object.assign(token, updateSession);
      }

      return token;
    },
  },

  events: {
    // ── New user created ────────────────────────────────────────────────────
    async createUser({ user }) {
      const username = await generateUsername(
        user.name ?? user.email!.split("@")[0]
      );

      await db.insert(users).values({
        id:           user.id!,
        username,
        displayName:  user.name ?? username,
        avatarUrl:    user.image ?? null,
        onboardingComplete: false,
        onboardingStep:     1,
      }).onConflictDoNothing();

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
          lastSeenAt:   new Date(),
          loginCount:   sql`login_count + 1`,
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generate unique username from name/email
// ─────────────────────────────────────────────────────────────────────────────

async function generateUsername(base: string): Promise<string> {
  const clean = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20) || "scholar";

  const existing = await db.query.users.findFirst({
    where: sql`username LIKE ${clean + "%"}`,
    columns: { username: true },
  });

  if (!existing) return clean;
  return `${clean}_${Math.floor(Math.random() * 9000) + 1000}`;
}