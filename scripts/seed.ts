#!/usr/bin/env tsx
/**
 * getpidief — Database Seed Script
 * Run: pnpm db:seed
 *
 * Seeds: institutions, categories, tags, badges, system settings, + 3 test users
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { inArray, sql } from "drizzle-orm";
import {
  institutions, categories, tags, badges, systemSettings,
  authUsers, authAccounts, users,
  documents, documentTags, documentViews, documentDownloads,
  userInterests, follows, comments,
  documentReactions, bookmarkCollections, documentBookmarks,
} from "../src/lib/db/schema";
import bcrypt from "bcryptjs";

// Seeding writes demo accounts and content. Only use an explicitly chosen database.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");
const pool = new Pool({ connectionString });
const seedDb = drizzle(pool);

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const error = err as { cause?: { code?: string }; code?: string };
      const code = error?.cause?.code ?? error?.code;
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

    // ── Demo Content (dev only) ──────────────────────────────────────────────
    console.log("\n  → Seeding demo documents + interactions (dev only)...");
    const existingDemo = await seedDb.execute<{ count: string }>(
      sql`SELECT COUNT(*)::text AS count FROM documents WHERE slug LIKE 'seed-%'`
    );
    const demoCount = Number(existingDemo.rows[0]?.count ?? "0");

    if (demoCount > 0) {
      await seedDb.execute(
        sql`UPDATE documents
            SET thumbnail_url = NULL
            WHERE slug LIKE 'seed-%'
              AND thumbnail_url LIKE 'https://picsum.photos/%'`
      );
      console.log(`     ✓ demo content already exists (${demoCount} docs), skipping`);
      console.log("     ✓ normalized seeded thumbnails to local-safe values");
      console.log("\n✅  Seed complete!\n");
      return;
    }

    const [allInstitutions, allCategories, allTags, testUserRows] = await Promise.all([
      seedDb.select({ id: institutions.id }).from(institutions),
      seedDb.select({ id: categories.id }).from(categories),
      seedDb.select({ id: tags.id }).from(tags),
      seedDb
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(inArray(users.username, ["admin_dev", "mod_dev", "test_student"])),
    ]);

    if (!allInstitutions.length || !allCategories.length || !allTags.length || !testUserRows.length) {
      throw new Error("Cannot seed demo content: base entities (institutions/categories/tags/users) missing.");
    }

    const userIds = testUserRows.map((u) => u.id);
    const now = Date.now();
    const docCount = 30;
    const resourceTypes = [
      "past_exam",
      "lecture_notes",
      "research_paper",
      "textbook_summary",
      "assignment",
      "tutorial_sheet",
      "course_guide",
      "lab_report",
      "thesis",
      "dissertation",
      "other",
    ] as const;
    const titles = [
      "Advanced Algorithms Revision Pack",
      "Database Systems Lecture Notes",
      "Public Health Biostatistics Handbook",
      "Contract Law Case Digest",
      "Signals and Systems Tutorial Set",
      "Thermodynamics Lab Report Template",
      "Machine Learning Practical Workbook",
      "Software Engineering Course Guide",
      "Financial Modelling Past Questions",
      "Quantum Physics Problem Sheet",
    ];

    const docsPayload = Array.from({ length: docCount }).map((_, i) => {
      const title = `${titles[i % titles.length]} ${i + 1}`;
      const authorId = userIds[i % userIds.length];
      const categoryId = allCategories[i % allCategories.length]?.id ?? null;
      const institutionId = allInstitutions[i % allInstitutions.length]?.id ?? null;
      const publishedAt = new Date(now - i * 86400000);
      return {
        slug: `seed-doc-${i + 1}`,
        title,
        description: `Seeded demo resource for development/testing (${title}).`,
        language: "en",
        categoryId,
        resourceType: resourceTypes[i % resourceTypes.length],
        semester: i % 2 === 0 ? ("semester_1" as const) : ("semester_2" as const),
        academicYear: 2021 + (i % 5),
        institutionId,
        authorId,
        fileUrl: `https://3rvj5ig9j4.ufs.sh/f/jpsC6qlv32e86z4607Guiv1KTYp4mO2cCtWknXIPJhd98Dfa`,
        fileSize: 150000 + i * 2500,
        mimeType: "application/pdf",
        thumbnailUrl: null,
        previewStatus: "ready" as const,
        pageCount: 12 + (i % 40),
        visibility: "public" as const,
        license: "academic_use_only" as const,
        allowDownload: true,
        allowPrint: true,
        status: "approved" as const,
        publishedAt,
        viewCount: 100 + i * 17,
        uniqueViewCount: 80 + i * 11,
        downloadCount: 20 + i * 7,
        likeCount: 8 + (i % 13),
        dislikeCount: i % 4,
        bookmarkCount: 5 + (i % 8),
        commentCount: 2 + (i % 5),
        shareCount: 1 + (i % 6),
        trendingScore: 20 + i * 1.5,
      };
    });

    await seedDb.insert(documents).values(docsPayload).onConflictDoNothing();
    const seededSlugs = docsPayload.map((d) => d.slug);
    const seededDocs = await seedDb
      .select({ id: documents.id, slug: documents.slug, authorId: documents.authorId })
      .from(documents)
      .where(inArray(documents.slug, seededSlugs));

    // Document tags (3 tags per doc)
    const docTagRows = seededDocs.flatMap((d, i) => {
      const t1 = allTags[i % allTags.length]!;
      const t2 = allTags[(i + 7) % allTags.length]!;
      const t3 = allTags[(i + 13) % allTags.length]!;
      return [
        { documentId: d.id, tagId: t1.id },
        { documentId: d.id, tagId: t2.id },
        { documentId: d.id, tagId: t3.id },
      ];
    });
    await seedDb.insert(documentTags).values(docTagRows).onConflictDoNothing();

    // User interests (for recommendations)
    const interestRows = userIds.flatMap((userId, idx) => [
      { userId, tagId: allTags[idx % allTags.length]!.id },
      { userId, tagId: allTags[(idx + 3) % allTags.length]!.id },
      { userId, tagId: allTags[(idx + 9) % allTags.length]!.id },
    ]);
    await seedDb.insert(userInterests).values(interestRows).onConflictDoNothing();

    // Follows
    const followRows = userIds.flatMap((followerId) =>
      userIds
        .filter((u) => u !== followerId)
        .slice(0, 2)
        .map((followingId) => ({ followerId, followingId }))
    );
    await seedDb.insert(follows).values(followRows).onConflictDoNothing();

    // Reactions (1-2 per doc, unique per user-doc)
    const reactionRows = seededDocs.flatMap((d, idx) => {
      const u1 = userIds[idx % userIds.length];
      const u2 = userIds[(idx + 1) % userIds.length];
      return [
        { documentId: d.id, userId: u1, type: "like" as const },
        ...(idx % 4 === 0 ? [{ documentId: d.id, userId: u2, type: "dislike" as const }] : []),
      ];
    });
    await seedDb.insert(documentReactions).values(reactionRows).onConflictDoNothing();

    // Bookmark collections + bookmarks
    const collectionRows = userIds.map((userId) => ({
      userId,
      name: "Saved",
      description: "Default seeded collection",
      visibility: "private" as const,
      isDefault: true,
    }));
    await seedDb.insert(bookmarkCollections).values(collectionRows).onConflictDoNothing();
    const collections = await seedDb
      .select({ id: bookmarkCollections.id, userId: bookmarkCollections.userId })
      .from(bookmarkCollections)
      .where(inArray(bookmarkCollections.userId, userIds));
    const collectionByUser = new Map(collections.map((c) => [c.userId, c.id]));

    const bookmarkRows = seededDocs.slice(0, 18).map((d, idx) => {
      const userId = userIds[idx % userIds.length];
      return {
        userId,
        documentId: d.id,
        collectionId: collectionByUser.get(userId) ?? null,
      };
    });
    await seedDb.insert(documentBookmarks).values(bookmarkRows).onConflictDoNothing();

    // Comments (+ replies)
    const topComments = await seedDb
      .insert(comments)
      .values(
        seededDocs.slice(0, 12).map((d, idx) => ({
          documentId: d.id,
          userId: userIds[idx % userIds.length],
          content: `This is a seeded top-level comment on ${d.slug}.`,
          contentHtml: `<p>This is a seeded top-level comment on ${d.slug}.</p>`,
        }))
      )
      .returning({ id: comments.id, documentId: comments.documentId });

    await seedDb.insert(comments).values(
      topComments.slice(0, 8).map((c, idx) => ({
        documentId: c.documentId,
        userId: userIds[(idx + 1) % userIds.length],
        parentId: c.id,
        rootId: c.id,
        content: "Seeded reply for development.",
        contentHtml: "<p>Seeded reply for development.</p>",
      }))
    );

    // View + download logs
    await seedDb.insert(documentViews).values(
      seededDocs.slice(0, 20).map((d, idx) => ({
        documentId: d.id,
        userId: userIds[idx % userIds.length],
        sessionId: `seed-session-${idx + 1}`,
        ipHash: `seed-ip-${(idx % 6) + 1}`,
        userAgent: "SeedScript/1.0",
        durationSeconds: 30 + idx * 3,
        pagesViewed: 2 + (idx % 8),
      }))
    );

    await seedDb.insert(documentDownloads).values(
      seededDocs.slice(0, 16).map((d, idx) => ({
        documentId: d.id,
        userId: userIds[idx % userIds.length],
        ipHash: `seed-ip-${(idx % 6) + 1}`,
      }))
    );

    console.log(`     ✓ ${seededDocs.length} demo documents seeded`);
    console.log("     ✓ document tags seeded");
    console.log("     ✓ follows + interests seeded");
    console.log("     ✓ reactions + bookmarks seeded");
    console.log("     ✓ comments + view/download logs seeded");
  }

  console.log("\n✅  Seed complete!\n");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exitCode = 1;
}).finally(() => pool.end());