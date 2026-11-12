import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

/** Do not use proxy JWT claims: sessions and account status may have changed. */
export async function redirectSignedInFromAuth() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const profile = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { status: true, deletedAt: true, onboardingComplete: true, onboardingStep: true },
  });
  // Invalid, suspended and deleted users must be able to reach sign-in and its
  // error state; redirecting them into the app would cause a redirect loop.
  if (!profile || profile.status !== "active" || profile.deletedAt) return;
  if (profile.onboardingComplete) redirect("/");
  const step = Math.min(Math.max(profile.onboardingStep ?? 1, 1), 3);
  redirect(`/onboarding/step-${step}`);
}
