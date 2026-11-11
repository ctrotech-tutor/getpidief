import { Metadata } from "next";
import { InstitutionSearchStep } from "@/components/features/auth/Institutionsearchstep";
import { db } from "@/lib/db/client";
import { institutions, documents } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { resolveOnboardingStep } from "@/lib/auth/onboardingResume";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Step 1 — Your Institution" };

export default async function OnboardingStep1Page() {
  const step = await resolveOnboardingStep();
  if (step !== 1) redirect(`/onboarding/step-${step}`);

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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Step 1 of 3
        </p>
        <h2 className="font-heading font-bold text-foreground text-2xl tracking-tight">
          Where do you study?
        </h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll personalize your archive based on your institution.
        </p>
      </div>

      <InstitutionSearchStep popularInstitutions={popular} />
    </div>
  );
}