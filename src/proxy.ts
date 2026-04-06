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

export default auth((req: any) => {
  const { nextUrl, auth: session } = req;
  const { pathname } = nextUrl;
  const user = session?.user as any;

  // Onboarding redirect guard
  if (
    user &&
    !user.onboardingComplete &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.includes(".") &&
    !["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"].includes(pathname)
  ) {
    return Response.redirect(new URL("/onboarding/step-1", req.url));
  }

  // Redirect logged-in users away from auth pages
  if (user?.onboardingComplete && ["/login", "/register"].includes(pathname)) {
    return Response.redirect(new URL("/explore", req.url));
  }

  // Redirect completed users away from onboarding
  if (user?.onboardingComplete && pathname.startsWith("/onboarding")) {
    return Response.redirect(new URL("/explore", req.url));
  }

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
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)).*)",
  ],
};