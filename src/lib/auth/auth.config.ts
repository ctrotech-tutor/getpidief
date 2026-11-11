import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

type AuthTokenExtras = {
  id?: string;
  role?: string;
  onboardingComplete?: boolean;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  status?: string;
  institutionId?: string | null;
  verificationStatus?: string;
  reputationScore?: number;
  reputationLevel?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// EDGE-SAFE AUTH CONFIG
//
// ⚠️  This file MUST NOT import anything that depends on:
//      - Node.js APIs (pg, bcrypt, fs, crypto)
//      - Drizzle ORM / database client
//      - Any lib that uses Node.js native modules
//
// This config is used ONLY by middleware.ts (Edge Runtime).
// The full auth config (with DB adapter) lives in auth.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const authConfig: NextAuthConfig = {
  // In development, Next.js/Turbopack and local proxies can cause host/URL
  // mismatches that make cookies/session validation flaky unless we trust host.
  trustHost: true,
  // Ensure cookies work on http://localhost in dev.
  useSecureCookies: process.env.NODE_ENV === "production",

  pages: {
    signIn:      "/login",
    signOut:     "/login",
    error:       "/login",
    verifyRequest: "/verify-email",
    newUser:     "/onboarding/step-1",
  },

  providers: [
    // Providers listed here are only used in middleware for session shape.
    // The real authorize() logic lives in the full auth.ts.
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      // authorize() NOT defined here — defined in full auth.ts
      // Middleware only checks token presence, not credentials
      async authorize() { return null; },
    }),
  ],

  // ── Session & JWT strategy ────────────────────────────────────────────────
  // We use "database" strategy for the full server auth,
  // but middleware reads JWT tokens for edge-compatible session checks.
  session: { strategy: "jwt" },

  callbacks: {
    // ── authorized() runs on EVERY request in middleware ─────────────────────
    // Keep this FAST and SIMPLE — no DB calls, only token inspection.
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const user = (auth?.user ?? null) as (AuthTokenExtras & { role?: string }) | null;
      const isLoggedIn = !!user;

      // ── Public routes: always allow ───────────────────────────────────────
      const publicPrefixes = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/d/",
        "/u/",
        "/search",
        "/explore",
        "/feed-preview",
        "/offline",
        "/maintenance",
        "/api/auth",
        "/api/search",
        "/api/og",
        "/api/webhooks/inngest",
        "/api/pusher/auth",
        "/_next",
        "/favicon",
        "/icons",
        "/images",
      ];

      const isPublic =
        pathname === "/" ||
        publicPrefixes.some(
          (p) => pathname === p || pathname.startsWith(p + "/")
        );

      if (isPublic) return true;

      // ── Not logged in → redirect to login ────────────────────────────────
      if (!isLoggedIn) return false; // Next.js redirects to pages.signIn

      // ── Admin routes: check role from JWT token ──────────────────────────
      if (pathname.startsWith("/admin")) {
        const adminRoles = ["moderator", "admin", "super_admin"];
        return adminRoles.includes(user?.role ?? "");
      }

      // ── All other authenticated routes: allow ────────────────────────────
      return true;
    },

    // ── jwt() — attach profile data to token on sign-in ──────────────────
    async jwt({ token, user }) {
      if (user) {
        const u = user as AuthTokenExtras & { id?: string; name?: string | null };
        // Minimal data only — this is edge-safe
        token.id = u.id;
        token.role = u.role ?? "student";
        token.onboardingComplete = u.onboardingComplete ?? false;
        token.username = u.username ?? "";
        token.avatarUrl = u.avatarUrl ?? null;
        token.status = u.status ?? "active";
        token.institutionId = u.institutionId ?? null;
        token.verificationStatus = u.verificationStatus ?? "unverified";
        token.reputationScore = u.reputationScore ?? 0;
        token.reputationLevel = u.reputationLevel ?? "scholar";
        token.displayName = u.displayName ?? u.name ?? "";
      }
      return token;
    },

    // ── session() — shape the session object from the JWT token ──────────
    async session({ session, token }) {
      if (token && session.user) {
        const target = session.user as AuthTokenExtras;
        target.id = token.id as string;
        target.role = token.role as string;
        target.onboardingComplete = token.onboardingComplete as boolean;
        target.username = token.username as string;
        target.displayName = token.displayName as string;
        target.avatarUrl = token.avatarUrl as string | null;
        target.status = token.status as string;
        target.institutionId = token.institutionId as string | null;
        target.verificationStatus = token.verificationStatus as string;
        target.reputationScore = token.reputationScore as number;
        target.reputationLevel = token.reputationLevel as string;
      }
      return session;
    },
  },
};