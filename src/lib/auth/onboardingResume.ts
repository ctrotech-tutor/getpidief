"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Resolve the current onboarding step from persisted DB progress.
 * - Redirects unauthenticated users to /login
 * - Redirects completed users to the home feed
 * - Returns persisted progress for incomplete users
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

  // Progress is persisted explicitly, including steps deliberately skipped.
  return Math.min(Math.max(user?.onboardingStep ?? 1, 1), 3) as 1 | 2 | 3;
}
