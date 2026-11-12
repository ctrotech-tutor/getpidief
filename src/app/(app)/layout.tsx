import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TopNav } from "@/components/layouts/TopNav";
import { MobileBottomTabs } from "@/components/layouts/MobileBottomTabs";
import { CommandPalette } from "@/components/layouts/CommandPalette";

type AppSessionUser = {
  onboardingComplete?: boolean;
  status?: "active" | "suspended" | "deleted" | string;
};

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

  const user = session.user as AppSessionUser & { id?: string };

  const profile = user.id
    ? await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { onboardingComplete: true, onboardingStep: true, status: true },
      })
    : null;

  // ── Onboarding incomplete → redirect to step-1 ───────────────────────────
  // Use DB as source of truth to avoid stale JWT redirect loops.
  if (!profile?.onboardingComplete) {
    redirect(`/onboarding/step-${Math.min(Math.max(profile?.onboardingStep ?? 1, 1), 3)}`);
  }

  // ── Suspended / deleted account ───────────────────────────────────────────
  if (profile.status === "suspended" || profile.status === "deleted") {
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
      <CommandPalette />
    </div>
  );
}
