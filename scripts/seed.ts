#!/usr/bin/env tsx
/**
 * getpidief — Database Seed Script
 * Run: pnpm db:seed
 *
 * Seeds: institutions, categories, tags, badges, system settings, + 3 test users
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  institutions, categories, tags, badges, systemSettings,
  authUsers, users,
} from "../src/lib/db/schema";
import bcrypt from "bcryptjs";

// Use Neon HTTP driver for scripts to avoid flaky TCP/pool timeouts.
// Works well locally and in CI because it's stateless per query.
const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!;
const sql = neon(connectionString);
const seedDb = drizzle(sql);

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const code = err?.cause?.code ?? err?.code;
      // Retry only for transient network failures.
      if (code !== "ECONNRESET" && code !== "ETIMEDOUT" && code !== "ECONNREFUSED") {
        throw err;
      }
      const delayMs = 400 * Math.pow(2, i);
      console.warn(`     ! ${label} failed (${code}); retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function seed() {
  console.log("🌱  Starting seed...\n");

  // ── Institutions ──────────────────────────────────────────────────────────
  console.log("  → Seeding institutions...");
  const institutionRows = await withRetry("institutions insert", async () => {
    return seedDb
      .insert(institutions)
      .values([
        {
          name: "University of Cape Town", slug: "uct",
          shortName: "UCT", country: "South Africa", countryCode: "ZA",
          city: "Cape Town", type: "university",
          emailDomains: ["uct.ac.za", "myuct.ac.za"], isActive: true, isVerified: true,
        },
        {
          name: "University of Lagos", slug: "unilag",
          shortName: "UNILAG", country: "Nigeria", countryCode: "NG",
          city: "Lagos", type: "university",
          emailDomains: ["unilag.edu.ng"], isActive: true, isVerified: true,
        },
        {
          name: "University of Ghana", slug: "ug",
          shortName: "UG", country: "Ghana", countryCode: "GH",
          city: "Accra", type: "university",
          emailDomains: ["ug.edu.gh", "st.ug.edu.gh"], isActive: true, isVerified: true,
        },
        {
          name: "Makerere University", slug: "makerere",
          shortName: "MAK", country: "Uganda", countryCode: "UG",
          city: "Kampala", type: "university",
          emailDomains: ["mak.ac.ug"], isActive: true, isVerified: true,
        },
        {
          name: "University of Nairobi", slug: "uon",
          shortName: "UoN", country: "Kenya", countryCode: "KE",
          city: "Nairobi", type: "university",
          emailDomains: ["uonbi.ac.ke", "students.uonbi.ac.ke"], isActive: true, isVerified: true,
        },
        {
          name: "MIT", slug: "mit",
          shortName: "MIT", country: "United States", countryCode: "US",
          city: "Cambridge", type: "university",
          emailDomains: ["mit.edu"], isActive: true, isVerified: true,
        },
        {
          name: "University of Oxford", slug: "oxford",
          shortName: "Oxford", country: "United Kingdom", countryCode: "GB",
          city: "Oxford", type: "university",
          emailDomains: ["ox.ac.uk", "oxon.ac.uk"], isActive: true, isVerified: true,
        },
      ])
      .onConflictDoNothing()
      .returning({ id: institutions.id, slug: institutions.slug });
  });

  console.log(`     ✓ ${institutionRows.length} institutions seeded`);

  // ── Categories ────────────────────────────────────────────────────────────
  console.log("  → Seeding categories...");
  const categoryRows = await seedDb
    .insert(categories)
    .values([
      { name: "Computer Science",    slug: "computer-science",    icon: "code",           color: "#2563EB", sortOrder: 1,  isActive: true, isFeatured: true  },
      { name: "Law",                  slug: "law",                 icon: "scale",          color: "#7C3AED", sortOrder: 2,  isActive: true, isFeatured: true  },
      { name: "Medicine & Health",    slug: "medicine-health",     icon: "heart-pulse",    color: "#DC2626", sortOrder: 3,  isActive: true, isFeatured: true  },
      { name: "Engineering",          slug: "engineering",         icon: "cog",            color: "#D97706", sortOrder: 4,  isActive: true, isFeatured: true  },
      { name: "Business & Economics", slug: "business-economics",  icon: "trending-up",    color: "#059669", sortOrder: 5,  isActive: true, isFeatured: true  },
      { name: "Sciences",             slug: "sciences",            icon: "flask-conical",  color: "#0891B2", sortOrder: 6,  isActive: true, isFeatured: true  },
      { name: "Humanities",           slug: "humanities",          icon: "book-open",      color: "#9333EA", sortOrder: 7,  isActive: true, isFeatured: false },
      { name: "Architecture",         slug: "architecture-design", icon: "building-2",     color: "#EA580C", sortOrder: 8,  isActive: true, isFeatured: false },
      { name: "Education",            slug: "education",           icon: "graduation-cap", color: "#16A34A", sortOrder: 9,  isActive: true, isFeatured: false },
      { name: "Social Sciences",      slug: "social-sciences",     icon: "users",          color: "#0D9488", sortOrder: 10, isActive: true, isFeatured: false },
      { name: "Agriculture",          slug: "agriculture",         icon: "leaf",           color: "#65A30D", sortOrder: 11, isActive: true, isFeatured: false },
      { name: "Pharmacy",             slug: "pharmacy",            icon: "pill",           color: "#BE185D", sortOrder: 12, isActive: true, isFeatured: false },
    ])
    .onConflictDoNothing()
    .returning({ id: categories.id, slug: categories.slug });

  console.log(`     ✓ ${categoryRows.length} categories seeded`);

  // ── Tags ──────────────────────────────────────────────────────────────────
  console.log("  → Seeding system tags...");
  const tagList = [
    "Machine Learning", "Data Structures", "Algorithms", "Constitutional Law",
    "Contract Law", "Biochemistry", "Clinical Medicine", "Financial Modelling",
    "Corporate Finance", "Organic Chemistry", "Thermodynamics", "Quantum Physics",
    "Public Health", "Econometrics", "Human-Computer Interaction", "Database Systems",
    "Network Security", "Operating Systems", "Calculus", "Linear Algebra",
    "Statistics", "Urban Planning", "Medical Ethics", "Game Theory",
    "Software Engineering", "Artificial Intelligence", "Computer Networks",
    "Data Science", "Cybersecurity", "Cloud Computing", "Digital Marketing",
    "International Law", "Criminal Law", "Property Law", "Tort Law",
    "Microbiology", "Anatomy", "Physiology", "Pharmacology",
    "Structural Engineering", "Civil Engineering", "Electrical Engineering",
    "Mechanical Engineering", "Chemical Engineering", "Environmental Science",
    "Philosophy", "Psychology", "Sociology", "Economics", "Accounting",
  ];

  const tagRows = await seedDb
    .insert(tags)
    .values(
      tagList.map((name) => ({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        isActive: true,
        isSystemTag: true,
      }))
    )
    .onConflictDoNothing()
    .returning({ id: tags.id });

  console.log(`     ✓ ${tagRows.length} tags seeded`);

  // ── Badges ────────────────────────────────────────────────────────────────
  console.log("  → Seeding badges...");
  await seedDb
    .insert(badges)
    .values([
      { name: "First Upload",         slug: "first-upload",         description: "Uploaded your first document",           icon: "upload",        color: "#2563EB", reputationBonus: 5,  criteriaType: "document_count",   criteriaValue: 1,    sortOrder: 1  },
      { name: "Active Scholar",       slug: "active-scholar",       description: "Uploaded 10 approved documents",         icon: "star",          color: "#F59E0B", reputationBonus: 15, criteriaType: "document_count",   criteriaValue: 10,   sortOrder: 2  },
      { name: "Prolific Contributor", slug: "prolific-contributor", description: "Uploaded 50 approved documents",         icon: "award",         color: "#10B981", reputationBonus: 30, criteriaType: "document_count",   criteriaValue: 50,   sortOrder: 3  },
      { name: "Rising Scholar",       slug: "rising-scholar",       description: "Reached a reputation score of 100",      icon: "trending-up",   color: "#8B5CF6", reputationBonus: 10, criteriaType: "reputation_score", criteriaValue: 100,  sortOrder: 4  },
      { name: "Community Builder",    slug: "community-builder",    description: "Gained 50 followers",                    icon: "users",         color: "#EC4899", reputationBonus: 20, criteriaType: "follower_count",   criteriaValue: 50,   sortOrder: 5  },
      { name: "Streak Scholar",       slug: "streak-scholar",       description: "Maintained a 7-day activity streak",     icon: "flame",         color: "#EF4444", reputationBonus: 10, criteriaType: "streak_days",      criteriaValue: 7,    sortOrder: 6  },
      { name: "Verified Contributor", slug: "verified-contributor", description: "Institutional affiliation verified",     icon: "shield-check",  color: "#F59E0B", reputationBonus: 25, criteriaType: "manual",           criteriaValue: null, sortOrder: 7  },
      { name: "Top of the Month",     slug: "top-of-month",         description: "Top contributor this month",             icon: "trophy",        color: "#F59E0B", reputationBonus: 50, criteriaType: "manual",           criteriaValue: null, sortOrder: 8  },
    ])
    .onConflictDoNothing();

  console.log("     ✓ badges seeded");

  // ── System Settings ───────────────────────────────────────────────────────
  console.log("  → Seeding system settings...");
  await seedDb
    .insert(systemSettings)
    .values([
      { key: "maintenance_mode",               value: false,     description: "Enable maintenance page" },
      { key: "max_upload_size_mb",             value: 50,        description: "Max PDF upload size in MB" },
      { key: "default_visibility",             value: "public",  description: "Default document visibility" },
      { key: "require_email_verification",     value: true,      description: "Require email verification" },
      { key: "allow_registration",             value: true,      description: "Allow new registrations" },
      { key: "trending_recalc_interval_mins",  value: 15,        description: "Trending recalculation interval" },
      { key: "digest_day_of_week",             value: "monday",  description: "Weekly digest day" },
      { key: "max_tags_per_document",          value: 10,        description: "Max tags per document" },
    ])
    .onConflictDoNothing();

  console.log("     ✓ system settings seeded");

  // ── Test Users (dev only) ─────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    console.log("  → Seeding test users (dev only)...");

    const testUsers = [
      { email: "admin@getpidief.dev",  name: "Admin User",     username: "admin_dev",     role: "admin"       as const },
      { email: "mod@getpidief.dev",    name: "Moderator User", username: "mod_dev",       role: "moderator"   as const },
      { email: "student@getpidief.dev",name: "Test Student",   username: "test_student",  role: "student"     as const },
    ];

    for (const u of testUsers) {
      const passwordHash = await bcrypt.hash("Password123!", 10);

      const [authRow] = await seedDb
        .insert(authUsers)
        .values({ name: u.name, email: u.email, emailVerified: new Date() })
        .onConflictDoNothing()
        .returning({ id: authUsers.id });

      if (!authRow) continue;

      await seedDb
        .insert(users)
        .values({
          id: authRow.id, username: u.username,
          displayName: u.name, role: u.role,
          status: "active", onboardingComplete: true,
          verificationStatus: "verified",
          reputationScore: u.role === "admin" ? 999 : 0,
        })
        .onConflictDoNothing();

      // Store password hash in credentials account
      const { authAccounts } = await import("../src/lib/db/schema");
      await seedDb
        .insert(authAccounts)
        .values({
          userId: authRow.id,
          type: "credentials",
          provider: "credentials",
          providerAccountId: passwordHash,
        })
        .onConflictDoNothing();
    }

    console.log("     ✓ 3 test users seeded");
    console.log("       admin@getpidief.dev  / Password123!");
    console.log("       mod@getpidief.dev    / Password123!");
    console.log("       student@getpidief.dev/ Password123!");
  }

  console.log("\n✅  Seed complete!\n");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});