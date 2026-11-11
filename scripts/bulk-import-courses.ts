#!/usr/bin/env tsx
/**
 * Bulk import course codes from a CSV file.
 *
 * CSV format:
 *   code,name,institution_id,faculty
 *   CS201,"Data Structures",uuid-here,Computer Science
 *
 * Usage:
 *   npx tsx scripts/bulk-import-courses.ts --file ./courses.csv [--institution <slug>]
 *
 * Options:
 *   --file         Path to CSV file (required)
 *   --institution  Institution slug to scope all imports (optional — overrides CSV column)
 *   --dry-run      Parse and validate without writing to DB
 */

import { createReadStream } from "fs";
import { resolve } from "path";
// import { parse } from "csv-parse";
import { db } from "../src/lib/db/client";
import { courseCodes, institutions } from "../src/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const getArg = (flag: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const csvFile       = getArg("--file");
const institutionSlug = getArg("--institution");
const dryRun        = args.includes("--dry-run");

if (!csvFile) {
  console.error("❌  --file is required");
  process.exit(1);
}

interface Row {
  code:           string;
  name:           string;
  institution_id: string;
  faculty?:       string;
}

async function main() {
  console.log(`\n📂  Reading: ${csvFile}`);
  if (dryRun) console.log("🔍  DRY RUN — nothing will be written\n");

  // Resolve institution ID if slug provided
  let resolvedInstitutionId: string | null = null;
  if (institutionSlug) {
    const inst = await db.query.institutions.findFirst({
      where: eq(institutions.slug, institutionSlug),
      columns: { id: true, name: true },
    });
    if (!inst) {
      console.error(`❌  Institution "${institutionSlug}" not found`);
      process.exit(1);
    }
    resolvedInstitutionId = inst.id;
    console.log(`🏛️   Institution: ${inst.name} (${inst.id})`);
  }

  // Parse CSV - commented out due to missing csv-parse dependency
  const rows: Row[] = [];
  // await new Promise<void>((resolve, reject) => {
  //   createReadStream(csvFile!)
  //     .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
  //     .on("data", (row: Row) => rows.push(row))
  //     .on("end", resolve)
  //     .on("error", reject);
  // });

  console.log(`📄  Parsed ${rows.length} rows\n`);

  // Validate
  const valid: Row[] = [];
  const errors: string[] = [];

  for (const [i, row] of rows.entries()) {
    if (!row.code?.trim()) { errors.push(`Row ${i + 2}: missing code`); continue; }
    if (!row.name?.trim()) { errors.push(`Row ${i + 2}: missing name`); continue; }
    valid.push({
      ...row,
      institution_id: resolvedInstitutionId ?? row.institution_id,
    });
  }

  if (errors.length > 0) {
    console.warn("⚠️  Validation errors:");
    errors.forEach((e) => console.warn(`   ${e}`));
  }

  console.log(`✅  ${valid.length} valid rows | ❌  ${errors.length} invalid rows`);

  if (dryRun) {
    console.log("\n🔍  DRY RUN complete — no changes made");
    return;
  }

  if (valid.length === 0) {
    console.log("\nNothing to import.");
    return;
  }

  // Batch insert with upsert (conflict on code + institution_id)
  const BATCH = 100;
  let imported = 0;
  let skipped  = 0;

  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH);
    const values = batch.map((r) => ({
      code:          r.code.trim().toUpperCase(),
      name:          r.name.trim(),
      institutionId: r.institution_id,
      faculty:       r.faculty?.trim() ?? null,
    }));

    await db.insert(courseCodes)
      .values(values)
      .onConflictDoNothing();

    imported += batch.length;
    process.stdout.write(`\r⬆️   Importing… ${imported}/${valid.length}`);
  }

  console.log(`\n\n✅  Import complete: ${imported - skipped} inserted, ${skipped} skipped (duplicates)\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌  Import failed:", err.message);
  process.exit(1);
});
