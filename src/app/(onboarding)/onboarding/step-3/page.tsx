import type { Metadata } from "next";
import { InterestTagsStep } from "@/components/features/auth/InterestTagsStep";
import { auth } from "@/lib/auth/auth";
import { getInterestChoices } from "@/lib/interests/server";
import { resolveOnboardingStep } from "@/lib/auth/onboardingResume";
import { redirect } from "next/navigation";
import styles from "../../onboarding.module.css";

export const metadata: Metadata = { title: "Your interests | getpidief" };
export default async function OnboardingStep3Page() {
  const step = await resolveOnboardingStep();
  if (step < 3) redirect(`/onboarding/step-${step}`);
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { choices, selected } = await getInterestChoices(session.user.id);
  return <>
    <p className={styles.eyebrow}>03 / YOUR INTERESTS</p>
    <h2 className={styles.heading}>Follow your curiosity.</h2>
    <p className={styles.intro}>Choose a few topics you care about, or head straight in. This is just a starting point.</p>
    <InterestTagsStep allTags={choices} initialSelected={selected} />
  </>;
}
