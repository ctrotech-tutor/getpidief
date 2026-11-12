import type { Metadata } from "next";
import { AcademicFocusStep } from "@/components/features/auth/AcademicFocusStep";
import { resolveOnboardingStep } from "@/lib/auth/onboardingResume";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import styles from "../../onboarding.module.css";
import { STUDY_AREAS } from "@/lib/onboarding/study-areas";

export const metadata: Metadata = { title: "Step 2 | Academic Focus" };

const LEVELS = [
  { value: "undergraduate",  label: "Undergraduate" },
  { value: "postgraduate",   label: "Postgraduate"  },
  { value: "doctorate",      label: "Doctorate"     },
  { value: "professional",   label: "Professional"  },
  { value: "other", label: "Other / independent" },
] as const;

export default async function OnboardingStep2Page() {
  const step = await resolveOnboardingStep();
  if (step < 2) redirect(`/onboarding/step-${step}`);

  const session = await auth();
  const profile = session?.user?.id ? await db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { faculty: true, major: true, academicLevel: true, academicYear: true } }) : null;
  return <>
    <p className={styles.eyebrow}>02 / YOUR PATH</p>
    <h2 className={styles.heading}>What brings you here?</h2>
    <p className={styles.intro}>Tell us a little about what you study. Your path doesn’t have to look like anyone else’s.</p>
    <AcademicFocusStep faculties={STUDY_AREAS} levels={LEVELS} profile={profile ?? null} />
  </>;
}
