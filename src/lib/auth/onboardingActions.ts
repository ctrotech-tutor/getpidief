"use server";
import { db, withTransaction } from "@/lib/db/client";
import { users, institutions, authUsers } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/auth";
import { redis, redisRateLimit, rateLimiters, KEYS } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import { getRor, searchRor } from "@/lib/institutions/ror";
import { parseInterestForm, replaceInterests } from "@/lib/interests/server";
import { revalidatePath } from "next/cache";
import { actionSuccess, actionError, type ActionResult } from "@/lib/utils/api";
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
} from "@/lib/validations/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Save institution selection
// ─────────────────────────────────────────────────────────────────────────────

export async function saveOnboardingStep1(
  _: unknown,
  formData: FormData
): Promise<ActionResult<{ next: string }>> {
  const userId = await requireAuth();
  await ensureUserProfile(userId);

  const skipped = formData.get("skip") === "yes";
  const rawId = formData.get("institutionId");
  const rorId = typeof rawId === "string" && rawId.startsWith("ror:") ? rawId.slice(4) : null;
  const parsed = onboardingStep1Schema.safeParse({ institutionId: rawId });
  if (!skipped && !rorId && !parsed.success) return actionError("Please select an institution or continue without one.");
  let institutionId = !skipped && parsed.success ? parsed.data.institutionId : null;
  if (!skipped && rorId) {
    // Fail closed in production if shared rate limiting is not configured.
    if (process.env.NODE_ENV === "production" && !redisRateLimit) return actionError("The institution directory is temporarily unavailable. You can continue without one.");
    if (!(await rateLimiters.search.limit(`onboarding:${userId}`)).success) return actionError("Too many searches. Please try again shortly.");
    const profile = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { onboardingComplete: true } });
    if (!profile || profile.onboardingComplete) return actionError("Setup has already been completed.");
    let record;
    try { record = await getRor(rorId); } catch { return actionError("The institution directory is unavailable. Please try again or continue without one."); }
    if (!record) return actionError("That institution is no longer available. Please choose another.");
    const slug = `ror-${record.id}`;
    // Match an existing curated record first. A directory match is never affiliation verification.
    const existing = await db.query.institutions.findFirst({ where: sql`${institutions.slug} = ${slug} OR (lower(${institutions.name}) = lower(${record.name}) AND ${institutions.countryCode} = ${record.countryCode})`, columns: { id: true, isActive: true } });
    if (existing) {
      if (!existing.isActive) return actionError("That institution is not currently available.");
      institutionId = existing.id;
    } else {
      const inserted = await db.insert(institutions).values({ name: record.name, slug, country: record.country, countryCode: record.countryCode, type: "other", isVerified: false, emailDomains: [] }).onConflictDoNothing({ target: institutions.slug }).returning({ id: institutions.id });
      const resolved = inserted[0] ?? await db.query.institutions.findFirst({ where: eq(institutions.slug, slug), columns: { id: true, isActive: true } });
      if (!resolved || ("isActive" in resolved && !resolved.isActive)) return actionError("That institution is not currently available.");
      institutionId = resolved.id;
    }
  } else if (institutionId) {
    const institution = await db.query.institutions.findFirst({
      where: and(eq(institutions.id, institutionId), eq(institutions.isActive, true)),
      columns: { id: true },
    });
    if (!institution) return actionError("That institution is no longer available. Please choose another.");
  }

  await db.update(users).set({
    institutionId,
    onboardingStep: sql`greatest(${users.onboardingStep}, 2)`,
    updatedAt: new Date(),
  }).where(and(eq(users.id, userId), eq(users.onboardingComplete, false)));

  return actionSuccess({ next: "/onboarding/step-2" });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Save academic focus
// ─────────────────────────────────────────────────────────────────────────────

export async function saveOnboardingStep2(
  _: unknown,
  formData: FormData
): Promise<ActionResult<{ next: string }>> {
  const userId = await requireAuth();
  await ensureUserProfile(userId);

  const skipped = formData.get("skip") === "yes";
  if (skipped) {
    await db.update(users).set({ onboardingStep: sql`greatest(${users.onboardingStep}, 3)`, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.onboardingComplete, false)));
    return actionSuccess({ next: "/onboarding/step-3" });
  }
  const parsed = onboardingStep2Schema.safeParse({
    faculty: formData.get("faculty"),
    major: formData.get("major"),
    academicLevel: formData.get("academicLevel"),
    academicYear: formData.get("academicYear") ? Number(formData.get("academicYear")) : undefined,
    isContributor: formData.get("isContributor") === "on",
  });
  if (!parsed.success) return actionError(Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Please check your details.");
  await db.update(users).set({
    faculty: parsed.data.faculty,
    major: parsed.data.major,
    academicLevel: parsed.data.academicLevel,
    academicYear: parsed.data.academicYear ?? null,
    onboardingStep: sql`greatest(${users.onboardingStep}, 3)`,
    updatedAt: new Date(),
  }).where(and(eq(users.id, userId), eq(users.onboardingComplete, false)));

  return actionSuccess({ next: "/onboarding/step-3" });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Save interest tags + complete onboarding
// ─────────────────────────────────────────────────────────────────────────────

export async function saveOnboardingStep3(
  _: unknown,
  formData: FormData
): Promise<ActionResult<{ next: string }>> {
  const userId = await requireAuth();
  await ensureUserProfile(userId);

  const skipped = formData.get("skip") === "yes";
  const selection = skipped ? { tagIds: [], starterSlugs: [] } : parseInterestForm(formData);
  if (!selection) return actionError("Please choose up to 20 available topics.");

  let completed: { institutionId: string | null; tagIds: string[] } | null;
  try {
    completed = await withTransaction(async (tx) => {
      // Claim completion once, so retries cannot overwrite interests or send duplicate events.
      const claimed = await tx.update(users).set({ onboardingComplete: true, onboardingStep: 3, updatedAt: new Date() })
        .where(and(eq(users.id, userId), eq(users.onboardingComplete, false)))
        .returning({ institutionId: users.institutionId });
      if (!claimed.length) return null;
      const tagIds = await replaceInterests(tx, userId, selection);
      return { ...claimed[0], tagIds };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TOPICS_UNAVAILABLE") return actionError("Some topics are no longer available. Please refresh and choose again.");
    throw error;
  }

  if (completed) {
    if (redis) {
      try { await redis.del(KEYS.onboardingState(userId), KEYS.recommended(userId)); }
      catch (error) { console.warn("[Onboarding] Cache cleanup failed:", error); }
    }
    try {
      await inngest.send({ name: "user/onboarding-completed", data: { userId, institutionId: completed.institutionId ?? "", tagIds: completed.tagIds } });
    } catch (error) { console.warn("[Onboarding] Completion event failed:", error); }
  }

  return actionSuccess({ next: "/" });
}

/** Update explicit interests after onboarding without completing onboarding again. */
export async function saveInterestSettings(_: unknown, formData: FormData): Promise<ActionResult<{ message: string }>> {
  const userId = await requireAuth();
  const selection = parseInterestForm(formData);
  if (!selection) return actionError("Please choose up to 20 available topics.");
  try {
    await withTransaction(async tx => {
      const [profile] = await tx.select({ id: users.id, status: users.status, complete: users.onboardingComplete }).from(users).where(eq(users.id, userId)).for("update");
      if (!profile || profile.status !== "active" || !profile.complete) throw new Error("UNAVAILABLE");
      await replaceInterests(tx, userId, selection);
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TOPICS_UNAVAILABLE") return actionError("Some topics are no longer available. Please refresh and choose again.");
    if (error instanceof Error && error.message === "UNAVAILABLE") return actionError("Your account is unavailable.");
    throw error;
  }
  if (redis) { try { await redis.del(KEYS.recommended(userId)); } catch { console.warn("[Interests] Cache cleanup failed"); } }
  revalidatePath("/"); revalidatePath("/settings/interests");
  return actionSuccess({ message: "Your interests have been saved." });
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTION SEARCH API helper (called from onboarding step 1 UI)
// ─────────────────────────────────────────────────────────────────────────────

export async function searchInstitutions(query: string) {
  const userId = await requireAuth();
  if (typeof query !== "string") return { items: [], directoryAvailable: false };
  const trimmed = query.trim().slice(0, 100);
  if (trimmed.length < 2) return { items: [], directoryAvailable: true };
  const pattern = `%${trimmed.replace(/[\\%_]/g, "\\$&")}%`;
  const local = await db.select({ id: institutions.id, name: institutions.name,
    country: institutions.country, countryCode: institutions.countryCode })
    .from(institutions)
    .where(and(eq(institutions.isActive, true), sql`${institutions.name} ILIKE ${pattern} ESCAPE '\\'`))
    .orderBy(institutions.name).limit(10);
  const localItems = local.map(item => ({ ...item, source: "local" as const }));
  if (trimmed.length < 3) return { items: localItems, directoryAvailable: true };
  if (process.env.NODE_ENV === "production" && !redisRateLimit) return { items: localItems, directoryAvailable: false };
  try {
    if (!(await rateLimiters.search.limit(`onboarding:${userId}`)).success) return { items: localItems, directoryAvailable: false };
    const remote = await searchRor(trimmed);
    const keys = new Set(local.map(item => `${item.name.toLocaleLowerCase()}|${item.countryCode}`));
    return { items: [...localItems, ...remote.filter(item => !keys.has(`${item.name.toLocaleLowerCase()}|${item.countryCode}`)).map(item => ({ ...item, id: `ror:${item.id}`, source: "ror" as const }))].slice(0, 12), directoryAvailable: true };
  } catch {
    return { items: localItems, directoryAvailable: false };
  }
}

async function ensureUserProfile(userId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  });
  if (existing) return;

  const authUser = await db.query.authUsers.findFirst({
    where: eq(authUsers.id, userId),
    columns: { email: true, name: true },
  });
  if (!authUser?.email) {
    throw new Error("Unable to initialize profile for authenticated user.");
  }

  const baseFromEmail = authUser.email.split("@")[0] ?? "scholar";
  const normalized = baseFromEmail.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  const baseUsername = (normalized || "scholar").slice(0, 40);
  const displayName = authUser.name?.trim() || "Scholar";

  for (let i = 0; i < 6; i++) {
    const suffix = i === 0 ? "" : `_${Math.floor(1000 + Math.random() * 9000)}`;
    const candidate = `${baseUsername}${suffix}`.slice(0, 50);
    try {
      await db.insert(users).values({
        id: userId,
        username: candidate,
        displayName,
      });
      return;
    } catch {
      // Retry on username collisions or race conditions.
    }
  }

  throw new Error("Could not create user profile record. Please retry.");
}