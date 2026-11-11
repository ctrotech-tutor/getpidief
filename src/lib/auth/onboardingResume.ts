"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Resolve the current onboarding step from persisted DB progress.
 * - Redirects unauthenticated users to /login
 * - Redirects completed users to /explore
 * - Returns the next required step for incomplete users
 */
export async function resolveOnboardingStep(): Promise<1 | 2 | 3> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      onboardingComplete: true,
      onboardingStep: true,
      institutionId: true,
      faculty: true,
    },
  });

  if (user?.onboardingComplete) redirect("/");

  // Graceful fallback when profile row is missing/out-of-sync.
  if (!user) return 1;
  if (!user.institutionId) return 1;
  if (!user.faculty) return 2;

  const clamped = Math.min(Math.max(user.onboardingStep ?? 3, 1), 3) as 1 | 2 | 3;
  return clamped;
}
