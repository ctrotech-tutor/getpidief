import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { TopNav } from "@/components/layouts/TopNav";
import { MobileBottomTabs } from "@/components/layouts/MobileBottomTabs";

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED APP SHELL LAYOUT
//
// Wraps all authenticated routes: /explore, /search, /d/*, /u/*, /dashboard, etc.
// Server-side auth check — redirects unauthenticated users to /login.
// Renders the top navigation and mobile bottom tabs.
// ─────────────────────────────────────────────────────────────────────────────

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // ── Not authenticated → redirect to login ─────────────────────────────────
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;

  // ── Onboarding incomplete → redirect to step-1 ───────────────────────────
  // (Middleware handles this too, but this is the server-side safety net)
  if (!user.onboardingComplete) {
    redirect("/onboarding/step-1");
  }

  // ── Suspended / deleted account ───────────────────────────────────────────
  if (user.status === "suspended" || user.status === "deleted") {
    redirect("/login?error=account_suspended");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed top navigation */}
      <TopNav />

      {/* Main content — offset for top nav height */}
      <main className="pt-[60px] pb-[60px] lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom tab bar — hidden on desktop */}
      <MobileBottomTabs />
    </div>
  );
}
