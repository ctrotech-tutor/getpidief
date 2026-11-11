"use server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users, posts, postReplies, postLikes, postSaves, feedReports } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
function body(form: FormData, limit: number) {
  const value = form.get("body");
  if (typeof value !== "string" || !value.trim() || value.trim().length > limit) throw new Error(`Please enter between 1 and ${limit} characters.`);
  return value.trim();
}
async function postId(form: FormData) {
  const id = form.get("postId");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid post.");
  const [post] = await db.select({ id: posts.id }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(eq(posts.id, id), isNull(posts.deletedAt), eq(users.status, "active"), isNull(users.deletedAt))).limit(1);
  if (!post) throw new Error("Post unavailable.");
  return id;
}
export async function createPost(form: FormData) {
  const userId = await currentUser();
  const kind = form.get("kind");
  if (kind !== "thought" && kind !== "question") throw new Error("Invalid post type.");
  const text = body(form, 3000);
  await limit(userId, "feedPost");
  await db.insert(posts).values({ authorId: userId, kind, body: text });
  revalidatePath("/");
  revalidatePath("/home");
}
export async function reply(form: FormData) {
  const userId = await currentUser();
  const text = body(form, 1000);
  const id = await postId(form);
  await limit(userId, "comment");
  await db.transaction(async tx => {
    const [post] = await tx.select({ id: posts.id }).from(posts).where(and(eq(posts.id, id), isNull(posts.deletedAt))).for("update");
    if (!post) throw new Error("Post unavailable.");
    await tx.insert(postReplies).values({ postId: id, authorId: userId, body: text });
  });
  revalidatePath("/");
  revalidatePath("/home");
  revalidatePath(`/home/post/${id}`);
}
export async function toggleLike(form: FormData) {
  const userId = await currentUser(); const id = await postId(form);
  if (form.get("active") === "true") await db.delete(postLikes).where(and(eq(postLikes.postId, id), eq(postLikes.userId, userId)));
  else await db.insert(postLikes).values({ postId: id, userId }).onConflictDoNothing();
  revalidatePath("/");
  revalidatePath("/home");
}
export async function toggleSave(form: FormData) {
  const userId = await currentUser(); const id = await postId(form);
  if (form.get("active") === "true") await db.delete(postSaves).where(and(eq(postSaves.postId, id), eq(postSaves.userId, userId)));
  else await db.insert(postSaves).values({ postId: id, userId }).onConflictDoNothing();
  revalidatePath("/");
  revalidatePath("/home");
}
export async function deletePost(form: FormData) {
  const userId = await currentUser(); const id = await postId(form);
  await db.update(posts).set({ deletedAt: new Date() }).where(and(eq(posts.id, id), eq(posts.authorId, userId)));
  revalidatePath("/");
  revalidatePath("/home");
}

export async function reportFeedContent(form: FormData) {
  const userId = await currentUser();
  const reason = form.get("reason");
  if (typeof reason !== "string" || !["spam", "harassment", "misinformation", "other"].includes(reason)) throw new Error("Choose a report reason.");
  const id = await postId(form);
  const replyId = form.get("replyId");
  if (replyId !== null && (typeof replyId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(replyId))) throw new Error("Invalid reply.");
  await limit(userId, "report");
  await db.transaction(async tx => {
    const [post] = await tx.select({ authorId: posts.authorId }).from(posts).where(and(eq(posts.id, id), isNull(posts.deletedAt))).for("update");
    if (!post) throw new Error("Post unavailable.");
    let authorId = post.authorId;
    if (typeof replyId === "string") {
      const [target] = await tx.select({ authorId: postReplies.authorId }).from(postReplies).where(and(eq(postReplies.id, replyId), eq(postReplies.postId, id), isNull(postReplies.deletedAt))).for("update");
      if (!target) throw new Error("Reply unavailable.");
      authorId = target.authorId;
    }
    if (authorId === userId) throw new Error("You cannot report your own content.");
    await tx.insert(feedReports).values({ reporterId: userId, postId: id, replyId: typeof replyId === "string" ? replyId : null, reason }).onConflictDoNothing();
  });
  revalidatePath("/admin/feed-reports");
  redirect(`/home/post/${id}?reported=1`);
}

export async function deleteReply(form: FormData) {
  const userId = await currentUser();
  const id = await postId(form);
  const replyId = form.get("replyId");
  if (typeof replyId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(replyId)) throw new Error("Invalid reply.");
  await db.update(postReplies).set({ deletedAt: new Date() }).where(and(eq(postReplies.id, replyId), eq(postReplies.postId, id), eq(postReplies.authorId, userId), isNull(postReplies.deletedAt)));
  revalidatePath("/"); revalidatePath("/home"); revalidatePath(`/home/post/${id}`);
}
