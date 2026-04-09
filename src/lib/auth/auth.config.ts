import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

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
      const user = auth?.user as any;
      const isLoggedIn = !!user;

      // ── Public routes: always allow ───────────────────────────────────────
      const publicPrefixes = [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/d/",
        "/u/",
        "/search",
        "/explore",
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
          (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)
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
    async jwt({ token, user, trigger }) {
      if (user) {
        // Minimal data only — this is edge-safe
        token.id   = user.id;
        token.role = (user as any).role ?? "student";
        token.onboardingComplete = (user as any).onboardingComplete ?? false;
        token.username   = (user as any).username ?? "";
        token.avatarUrl  = (user as any).avatarUrl ?? null;
        token.status     = (user as any).status ?? "active";
        token.institutionId = (user as any).institutionId ?? null;
        token.verificationStatus = (user as any).verificationStatus ?? "unverified";
        token.reputationScore = (user as any).reputationScore ?? 0;
        token.reputationLevel = (user as any).reputationLevel ?? "scholar";
        token.displayName     = (user as any).displayName ?? user.name ?? "";
      }
      return token;
    },

    // ── session() — shape the session object from the JWT token ──────────
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id           = token.id as string;
        (session.user as any).role         = token.role as string;
        (session.user as any).onboardingComplete = token.onboardingComplete as boolean;
        (session.user as any).username     = token.username as string;
        (session.user as any).displayName  = token.displayName as string;
        (session.user as any).avatarUrl    = token.avatarUrl as string | null;
        (session.user as any).status       = token.status as string;
        (session.user as any).institutionId = token.institutionId as string | null;
        (session.user as any).verificationStatus = token.verificationStatus as string;
        (session.user as any).reputationScore    = token.reputationScore as number;
        (session.user as any).reputationLevel    = token.reputationLevel as string;
      }
      return session;
    },
  },
};