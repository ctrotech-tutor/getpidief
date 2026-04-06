import { Metadata } from "next";
import { InstitutionSearchStep } from "@/components/features/auth/Institutionsearchstep";
import { db } from "@/lib/db/client";
import { institutions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Step 1 — Your Institution" };

export default async function OnboardingStep1Page() {
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
      documentCount: institutions.documentCount,
    })
    .from(institutions)
    .where(eq(institutions.isActive, true))
    .orderBy(desc(institutions.documentCount))
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
          We'll personalize your archive based on your institution.
        </p>
      </div>

      <InstitutionSearchStep popularInstitutions={popular} />
    </div>
  );
}