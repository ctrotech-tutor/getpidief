import type { Metadata } from "next";
import { InterestTagsStep } from "@/components/features/auth/InterestTagsStep";
import { db } from "@/lib/db/client";
import { tags } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { resolveOnboardingStep } from "@/lib/auth/onboardingResume";
import { redirect } from "next/navigation";
import styles from "../../onboarding.module.css";

export const metadata: Metadata = { title: "Your interests | getpidief" };
export default async function OnboardingStep3Page() {
  const step = await resolveOnboardingStep();
  if (step < 3) redirect(`/onboarding/step-${step}`);
  const allTags = await db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags)
    .where(eq(tags.isActive, true)).orderBy(desc(tags.usageCount), asc(tags.name));
  return <>
    <p className={styles.eyebrow}>03 / YOUR INTERESTS</p>
    <h2 className={styles.heading}>Follow your curiosity.</h2>
    <p className={styles.intro}>Choose a few topics you care about, or head straight in. This is just a starting point.</p>
    <InterestTagsStep allTags={allTags} />
  </>;
}
