import type { Metadata } from "next";
import { db } from "@/lib/db/client";
import { institutions, documents, users } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ResourceTypes } from "@/components/landing/ResourceTypes";
import { LiveMetrics } from "@/components/landing/LiveMetrics";
import { ContributorProgram } from "@/components/landing/ContributorProgram";
import { InstitutionsMap } from "@/components/landing/InstitutionsMap";
import { Pricing } from "@/components/landing/Pricing";
import { FinalCTA } from "@/components/landing/FinalCTA";

export const metadata: Metadata = {
  title: "getpidief — The Academic Resource Network",
  description:
    "Discover millions of verified past exams, lecture notes, and research papers from universities across Africa and beyond. The Archive That Thinks.",
  keywords: [
    "academic resources",
    "past exams",
    "lecture notes",
    "study materials",
    "university",
    "students",
    "research papers",
    "getpidief",
    "scholar archive",
    "academic network"
  ],
  openGraph: {
    title: "getpidief — The Academic Resource Network",
    description: "The Archive That Thinks. Discover, share, and excel with millions of verified academic resources.",
    type: "website",
    url: "https://getpidief.me",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "getpidief — The Academic Resource Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@getpidief",
    creator: "@getpidief",
  },
};

export const revalidate = 3600; // 1hr ISR

async function getLandingStats() {
  try {
    const [docCount, userCount, instCount] = await Promise.all([
      db.select({ count: count() }).from(documents).where(eq(documents.status, "approved")),
      db.select({ count: count() }).from(users).where(eq(users.status, "active")),
      db.select({ count: count() }).from(institutions).where(eq(institutions.isActive, true)),
    ]);
    return {
      documents:    docCount[0]?.count ?? 0,
      users:        userCount[0]?.count ?? 0,
      institutions: instCount[0]?.count ?? 0,
    };
  } catch {
    return { documents: 50000, users: 12000, institutions: 280 };
  }
}

export default async function LandingPage() {
  const stats = await getLandingStats();

  return (
    <>
      {/* Hero Section */}
      <Hero stats={stats} />
      
      {/* Social Proof */}
      <SocialProof />
      
      {/* Features Bento Grid */}
      <Features />
      
      {/* How It Works */}
      <HowItWorks />
      
      {/* Resource Types */}
      <ResourceTypes />
      
      {/* Live Metrics & Testimonials */}
      <LiveMetrics />
      
      {/* Contributor Program */}
      <ContributorProgram />
      
      {/* Institutions Coverage */}
      <InstitutionsMap />
      
      {/* Pricing */}
      <Pricing />
      
      {/* Final CTA */}
      <FinalCTA stats={stats} />

    </>
  );
}
