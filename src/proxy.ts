import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE  — runs on Vercel Edge Runtime
//
// ✅  Only imports `authConfig` (edge-safe: no pg, no drizzle, no bcrypt)
// ✅  Route protection logic inside authConfig.callbacks.authorized()
// ✅  No database calls — only JWT token inspection
// ─────────────────────────────────────────────────────────────────────────────

const { auth } = NextAuth(authConfig);

type ProxyUser = {
  onboardingComplete?: boolean;
  status?: string;
};

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth as { user?: ProxyUser } | null | undefined;
  const { pathname } = nextUrl;
  const user = session?.user;

  // Do not redirect away from sign-in using edge-only token claims. A token
  // may have been revoked in the database since this proxy last saw it.

  // Block suspended/deleted accounts
  if (
    user &&
    (user.status === "suspended" || user.status === "deleted") &&
    pathname !== "/login"
  ) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "account_suspended");
    return Response.redirect(url);
  }
});

export const config = {
  matcher: [
    // Never run proxy on NextAuth endpoints; it can interfere with auth callbacks.
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)).*)",
  ],
};