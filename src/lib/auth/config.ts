import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db/client";
import { authUsers, authAccounts, authSessions, authVerificationTokens, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH.JS v5 CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts as any,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
  }),

  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,    // 30 days
    updateAge: 24 * 60 * 60,       // Update session once per day
  },

  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
    newUser: "/onboarding/step-1",
  },

  providers: [
    // ── Google OAuth ────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // ── Email + Password ────────────────────────────────────────────────────
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }).safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Fetch auth user
        const authUser = await db.query.authUsers.findFirst({
          where: eq(authUsers.email, email.toLowerCase()),
        });

        if (!authUser) return null;

        // Fetch credentials account (has password hash)
        const account = await db.query.authAccounts.findFirst({
          where: and(
            eq(authAccounts.userId, authUser.id),
            eq(authAccounts.provider, "credentials")
          ),
        });

        if (!account?.providerAccountId) return null;

        // providerAccountId stores the hashed password for credentials provider
        const passwordMatch = await bcrypt.compare(
          password,
          account.providerAccountId
        );

        if (!passwordMatch) return null;

        // Check user status
        const userProfile = await db.query.users.findFirst({
          where: eq(users.id, authUser.id),
          columns: { status: true, onboardingComplete: true },
        });

        if (userProfile?.status === "suspended") return null;
        if (userProfile?.status === "deleted") return null;

        return {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          image: authUser.image,
        };
      },
    }),
  ],

  callbacks: {
    // ── JWT is not used (database strategy) but needed for session shape ────
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;

        // Enrich session with user profile data
        const profile = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: {
            role: true,
            status: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            onboardingComplete: true,
            verificationStatus: true,
            reputationScore: true,
            reputationLevel: true,
            institutionId: true,
          },
        });

        if (profile) {
          (session.user as any).role = profile.role;
          (session.user as any).status = profile.status;
          (session.user as any).username = profile.username;
          (session.user as any).displayName = profile.displayName;
          (session.user as any).avatarUrl = profile.avatarUrl;
          (session.user as any).onboardingComplete = profile.onboardingComplete;
          (session.user as any).verificationStatus = profile.verificationStatus;
          (session.user as any).reputationScore = profile.reputationScore;
          (session.user as any).reputationLevel = profile.reputationLevel;
          (session.user as any).institutionId = profile.institutionId;
        }
      }

      return session;
    },

    async signIn({ user, account, profile }) {
      // Block suspended/deleted users
      if (user.id) {
        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: { status: true },
        });

        if (userRecord?.status === "suspended") return false;
        if (userRecord?.status === "deleted") return false;
      }

      return true;
    },
  },

  events: {
    // ── New user registered ───────────────────────────────────────────────
    async createUser({ user }) {
      // Create extended user profile record
      const username = await generateUsername(user.name ?? user.email!.split("@")[0]);

      await db.insert(users).values({
        id: user.id!,
        username,
        displayName: user.name ?? username,
        avatarUrl: user.image ?? null,
        onboardingComplete: false,
        onboardingStep: 1,
      });

      // Trigger welcome email + post-registration setup
      await inngest.send({
        name: "user/registered",
        data: {
          userId: user.id!,
          email: user.email!,
          name: user.name ?? username,
          provider: "google",
        },
      });
    },

    // ── User signed in — update last active + streak ──────────────────────
    async signIn({ user }) {
      if (!user.id) return;

      await Promise.all([
        db
          .update(users)
          .set({
            lastActiveAt: new Date(),
            lastSeenAt: new Date(),
            loginCount: sql`login_count + 1`,
          })
          .where(eq(users.id, user.id)),

        inngest.send({
          name: "user/streak-update",
          data: { userId: user.id },
        }),
      ]);
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function generateUsername(base: string): Promise<string> {
  // Sanitize: lowercase, replace non-alphanumeric with underscore
  const clean = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);

  const candidate = clean || "scholar";

  // Check availability
  const existing = await db.query.users.findFirst({
    where: sql`username LIKE ${candidate + "%"}`,
    columns: { username: true },
  });

  if (!existing) return candidate;

  // Append random suffix
  return `${candidate}_${Math.floor(Math.random() * 9000) + 1000}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE AUTH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Get current session (Server Component / Route Handler safe) */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Get current user ID (throws if not authenticated) */
export async function requireAuth(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return user.id;
}

/** Require specific role(s) */
export async function requireRole(
  ...roles: string[]
): Promise<{ id: string; role: string }> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("UNAUTHORIZED");

  const userRole = (user as any).role as string;
  if (!roles.includes(userRole)) throw new Error("FORBIDDEN");

  return { id: user.id, role: userRole };
}

/** Check if current user is admin or higher */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  const role = (user as any)?.role as string | undefined;
  return ["admin", "super_admin"].includes(role ?? "");
}
