import { Metadata } from "next";
import { InstitutionSearchStep } from "@/components/features/auth/Institutionsearchstep";
import { db } from "@/lib/db/client";
import { institutions, documents, users } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { resolveOnboardingStep } from "@/lib/auth/onboardingResume";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import styles from "../../onboarding.module.css";

export const metadata: Metadata = { title: "Step 1 | Your Institution" };

export default async function OnboardingStep1Page() {
  const step = await resolveOnboardingStep();
  if (step < 1) redirect(`/onboarding/step-${step}`);

  const session = await auth();
  const profile = session?.user?.id ? await db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { institutionId: true } }) : null;
  const initialInstitution = profile?.institutionId ? await db.query.institutions.findFirst({ where: eq(institutions.id, profile.institutionId), columns: { id: true, name: true, country: true } }) : null;

  // Popular institutions for quick-pick chips
  const popular = await db
    .select({
      id:          institutions.id,
      name:        institutions.name,
      slug:        institutions.slug,
      country:     institutions.country,
      countryCode: institutions.countryCode,
      type:        institutions.type,
      logoUrl:     institutions.logoUrl,
      documentCount: sql<number>`
        coalesce((
          select count(*)::int
          from ${documents} d
          where d.institution_id = ${institutions.id}
            and d.status = 'approved'
            and d.visibility = 'public'
            and d.deleted_at is null
        ), 0)
      `,
    })
    .from(institutions)
    .where(eq(institutions.isActive, true))
    .orderBy(desc(sql<number>`
      coalesce((
        select count(*)::int
        from ${documents} d
        where d.institution_id = ${institutions.id}
          and d.status = 'approved'
          and d.visibility = 'public'
          and d.deleted_at is null
      ), 0)
    `))
    .limit(6);

  return <>
    <p className={styles.eyebrow}>01 / YOUR PLACE</p>
    <h2 className={styles.heading}>Where do you learn?</h2>
    <p className={styles.intro}>Connect your profile to a place, if you have one. There is room here for independent learners too.</p>
    <InstitutionSearchStep popularInstitutions={popular} initialInstitution={initialInstitution ?? null} />
  </>;
}
