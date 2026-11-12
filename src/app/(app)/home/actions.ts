"use server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users, posts, postReplies, postLikes, postSaves, postReposts } from "@/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { POST_MAX_LENGTH, postLength } from "@/lib/feed/post-length";
import { createFeedReport } from "@/lib/feed/report-transaction";
import { withPostInteraction } from "@/lib/feed/interaction-transaction";
import { rateLimiters, redisRateLimit } from "@/lib/redis/client";

async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Please sign in again.");
  const user = await db.query.users.findFirst({ where: and(eq(users.id, id), isNull(users.deletedAt)), columns: { status: true, onboardingComplete: true } });
  if (!user || user.status !== "active" || !user.onboardingComplete) throw new Error("Account unavailable.");
  return id;
}
async function limit(userId: string, kind: "feedPost" | "comment" | "report") {
  // Never silently disable abuse limits in production.
  if (process.env.NODE_ENV === "production" && !redisRateLimit) throw new Error("Posting is temporarily unavailable.");
  try {
    if (!(await rateLimiters[kind].limit(userId)).success) throw new Error("Too many requests. Please try again later.");
  } catch (error) {
    if (error instanceof Error && error.message === "Too many requests. Please try again later.") throw error;
    throw new Error("Posting is temporarily unavailable.");
  }
}
function body(form: FormData, limit: number, length = (text: string) => text.length) {
  const value = form.get("body");
  if (typeof value !== "string" || !value.trim() || length(value.trim()) > limit) throw new Error(`Please enter between 1 and ${limit} characters.`);
  return value.trim();
}
async function postId(form: FormData, viewerId: string) {
  const id = form.get("postId");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid post.");
  const [post] = await db.select({ id: posts.id }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(eq(posts.id, id), isNull(posts.deletedAt), eq(users.status, "active"), isNull(users.deletedAt), sql`not exists (select 1 from user_blocks b where (b.blocker_id = ${viewerId}::uuid and b.blocked_id = ${users.id}) or (b.blocked_id = ${viewerId}::uuid and b.blocker_id = ${users.id}))`)).limit(1);
  if (!post) throw new Error("Post unavailable.");
  return id;
}
export async function createPost(form: FormData) {
  const userId = await currentUser();
  const kind = form.get("kind");
  if (kind !== "thought" && kind !== "question") throw new Error("Invalid post type.");
  const text = body(form, POST_MAX_LENGTH, postLength);
  await limit(userId, "feedPost");
  await db.insert(posts).values({ authorId: userId, kind, body: text });
  revalidatePath("/");
  revalidatePath("/home");
}
export async function reply(form: FormData) {
  const userId = await currentUser();
  const text = body(form, 1000);
  const id = await postId(form, userId);
  await limit(userId, "comment");
  await withPostInteraction(userId, id, async tx => {
    await tx.insert(postReplies).values({ postId: id, authorId: userId, body: text });
  });
  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath(`/home/post/${id}`);
}
export async function toggleLike(form: FormData) {
  const userId = await currentUser(); const id = await postId(form, userId);
  await withPostInteraction(userId, id, async tx => {
    if (form.get("active") === "true") await tx.delete(postLikes).where(and(eq(postLikes.postId, id), eq(postLikes.userId, userId)));
    else await tx.insert(postLikes).values({ postId: id, userId }).onConflictDoNothing();
  });
  revalidatePath("/");
  revalidatePath("/home");
}
export async function toggleSave(form: FormData) {
  const userId = await currentUser(); const id = await postId(form, userId);
  await withPostInteraction(userId, id, async tx => {
    if (form.get("active") === "true") await tx.delete(postSaves).where(and(eq(postSaves.postId, id), eq(postSaves.userId, userId)));
    else await tx.insert(postSaves).values({ postId: id, userId }).onConflictDoNothing();
  });
  revalidatePath("/");
  revalidatePath("/home");
}
export async function deletePost(form: FormData) {
  const userId = await currentUser(); const id = await postId(form, userId);
  await db.update(posts).set({ deletedAt: new Date() }).where(and(eq(posts.id, id), eq(posts.authorId, userId)));
  revalidatePath("/");
  revalidatePath("/home");
}

export async function reportFeedContent(form: FormData) {
  const userId = await currentUser();
  const reason = form.get("reason");
  if (typeof reason !== "string" || !["spam", "harassment", "misinformation", "other"].includes(reason)) throw new Error("Choose a report reason.");
  const id = await postId(form, userId);
  const replyId = form.get("replyId");
  if (replyId !== null && (typeof replyId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(replyId))) throw new Error("Invalid reply.");
  await limit(userId, "report");
  await createFeedReport(userId, id, typeof replyId === "string" ? replyId : null, reason);
  revalidatePath("/admin/feed-reports");
  redirect(`/home/post/${id}?reported=1`);
}

export async function deleteReply(form: FormData) {
  const userId = await currentUser();
  const id = await postId(form, userId);
  const replyId = form.get("replyId");
  if (typeof replyId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(replyId)) throw new Error("Invalid reply.");
  await db.update(postReplies).set({ deletedAt: new Date() }).where(and(eq(postReplies.id, replyId), eq(postReplies.postId, id), eq(postReplies.authorId, userId), isNull(postReplies.deletedAt)));
  revalidatePath("/"); revalidatePath("/home"); revalidatePath(`/home/post/${id}`);
}

/** Idempotent desired-state repost; post lock serializes against soft deletion. */
export async function setRepost(form: FormData) {
  const userId = await currentUser();
  const id = await postId(form, userId);
  const desired = form.get("repost");
  if (desired !== "true" && desired !== "false") throw new Error("Invalid repost request.");
  if (desired === "true") await limit(userId, "feedPost");
  await withPostInteraction(userId, id, async tx => {
    if (desired === "true") await tx.insert(postReposts).values({ postId: id, userId }).onConflictDoNothing();
    else await tx.delete(postReposts).where(and(eq(postReposts.postId, id), eq(postReposts.userId, userId)));
  });
  revalidatePath("/"); revalidatePath("/home");
}
