"use server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users, posts, postReplies, postLikes, postSaves } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Please sign in again.");
  const user = await db.query.users.findFirst({ where: eq(users.id, id), columns: { status: true, onboardingComplete: true } });
  if (!user || user.status !== "active" || !user.onboardingComplete) throw new Error("Account unavailable.");
  return id;
}
function body(form: FormData, limit: number) {
  const value = form.get("body");
  if (typeof value !== "string" || !value.trim() || value.trim().length > limit) throw new Error(`Please enter between 1 and ${limit} characters.`);
  return value.trim();
}
async function postId(form: FormData) {
  const id = form.get("postId");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid post.");
  const [post] = await db.select({ id: posts.id }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(eq(posts.id, id), isNull(posts.deletedAt), eq(users.status, "active"))).limit(1);
  if (!post) throw new Error("Post unavailable.");
  return id;
}
export async function createPost(form: FormData) {
  const userId = await currentUser();
  const kind = form.get("kind");
  if (kind !== "thought" && kind !== "question") throw new Error("Invalid post type.");
  await db.insert(posts).values({ authorId: userId, kind, body: body(form, 3000) });
  revalidatePath("/home");
}
export async function reply(form: FormData) {
  const userId = await currentUser();
  await db.insert(postReplies).values({ postId: await postId(form), authorId: userId, body: body(form, 1000) });
  revalidatePath("/home");
}
export async function toggleLike(form: FormData) {
  const userId = await currentUser(); const id = await postId(form);
  if (form.get("active") === "true") await db.delete(postLikes).where(and(eq(postLikes.postId, id), eq(postLikes.userId, userId)));
  else await db.insert(postLikes).values({ postId: id, userId }).onConflictDoNothing();
  revalidatePath("/home");
}
export async function toggleSave(form: FormData) {
  const userId = await currentUser(); const id = await postId(form);
  if (form.get("active") === "true") await db.delete(postSaves).where(and(eq(postSaves.postId, id), eq(postSaves.userId, userId)));
  else await db.insert(postSaves).values({ postId: id, userId }).onConflictDoNothing();
  revalidatePath("/home");
}
export async function deletePost(form: FormData) {
  const userId = await currentUser(); const id = await postId(form);
  await db.update(posts).set({ deletedAt: new Date() }).where(and(eq(posts.id, id), eq(posts.authorId, userId)));
  revalidatePath("/home");
}
