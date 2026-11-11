import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db/client";
import { tags, userInterests } from "@/lib/db/schema";
import { z } from "zod";
import { STARTER_TOPICS, type TopicChoice } from "./catalog";

const inputSchema = z.object({
  tagIds: z.array(z.string().uuid()).max(20),
  starterSlugs: z.array(z.string().max(100)).max(20),
}).refine(x => x.tagIds.length + x.starterSlugs.length <= 20);
export function parseInterestForm(data: FormData) {
  const parsed = inputSchema.safeParse({ tagIds: data.getAll("tagIds"), starterSlugs: data.getAll("starterSlugs") });
  if (!parsed.success) return null;
  const tagIds = [...new Set(parsed.data.tagIds)];
  const starterSlugs = [...new Set(parsed.data.starterSlugs)];
  if (tagIds.length !== parsed.data.tagIds.length || starterSlugs.length !== parsed.data.starterSlugs.length) return null;
  if (starterSlugs.some(slug => !STARTER_TOPICS.some(topic => topic.slug === slug))) return null;
  return { tagIds, starterSlugs };
}
type Selection = NonNullable<ReturnType<typeof parseInterestForm>>;
type Tx = Parameters<Parameters<typeof withTransaction>[0]>[0];

/** Caller must hold the profile row lock. New starter rows and interests commit together. */
export async function replaceInterests(tx: Tx, userId: string, selection: Selection): Promise<string[]> {
  const found = selection.tagIds.length ? await tx.select({ id: tags.id }).from(tags)
    .where(and(inArray(tags.id, selection.tagIds), eq(tags.isActive, true))) : [];
  if (found.length !== selection.tagIds.length) throw new Error("TOPICS_UNAVAILABLE");
  const ids = new Set(found.map(row => row.id));
  for (const slug of [...selection.starterSlugs].sort()) {
    const topic = STARTER_TOPICS.find(item => item.slug === slug)!;
    // Concurrent requests may create the same starter; either unique key can conflict.
    await tx.insert(tags).values({ name: topic.name, slug: topic.slug, isSystemTag: true }).onConflictDoNothing();
    const rows = await tx.select({ id: tags.id, isActive: tags.isActive, slug: tags.slug, name: tags.name }).from(tags)
      .where(or(eq(tags.slug, topic.slug), eq(tags.name, topic.name))).limit(2);
    // Ambiguous collisions or deactivated records require administrative resolution.
    if (rows.length !== 1 || !rows[0].isActive) throw new Error("TOPICS_UNAVAILABLE");
    ids.add(rows[0].id);
  }
  await tx.delete(userInterests).where(eq(userInterests.userId, userId));
  if (ids.size) await tx.insert(userInterests).values([...ids].map(tagId => ({ userId, tagId }))).onConflictDoNothing();
  return [...ids];
}

export async function getInterestChoices(userId: string): Promise<{ choices: TopicChoice[]; selected: string[] }> {
  const starterRecords = await db.select({ id: tags.id, name: tags.name, slug: tags.slug, isActive: tags.isActive }).from(tags)
    .where(or(inArray(tags.slug, STARTER_TOPICS.map(t => t.slug)), inArray(tags.name, STARTER_TOPICS.map(t => t.name))));
  const active = await db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags)
    .where(eq(tags.isActive, true)).orderBy(desc(tags.usageCount), asc(tags.name)).limit(100);
  const saved = await db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(userInterests)
    .innerJoin(tags, eq(tags.id, userInterests.tagId)).where(and(eq(userInterests.userId, userId), eq(tags.isActive, true)));
  const choices: TopicChoice[] = [];
  for (const topic of STARTER_TOPICS) {
    const matches = starterRecords.filter(record => record.slug === topic.slug || record.name === topic.name);
    if (matches.length === 0) choices.push({ id: `starter:${topic.slug}`, name: topic.name, slug: topic.slug });
    else if (matches.length === 1 && matches[0].isActive) choices.push(matches[0]);
  }
  const seen = new Set(choices.map(item => item.id));
  for (const item of [...saved, ...active]) if (!seen.has(item.id)) { choices.push(item); seen.add(item.id); }
  return { choices, selected: saved.map(item => item.id) };
}
