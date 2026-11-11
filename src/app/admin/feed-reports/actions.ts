"use server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { auditLogs, feedReports, postReplies, posts, users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function reviewFeedReport(form: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in again.");
  const reportId = form.get("reportId"); const decision = form.get("decision"); const value = form.get("note");
  if (typeof reportId !== "string" || !uuid.test(reportId) || (decision !== "dismissed" && decision !== "removed") || typeof value !== "string" || value.trim().length < 3 || value.trim().length > 500) throw new Error("Invalid review.");
  const note = value.trim();
  await db.transaction(async tx => {
    const [actor] = await tx.select({ role: users.role }).from(users).where(and(eq(users.id, session.user.id!), eq(users.status, "active"), isNull(users.deletedAt))).for("update");
    if (!actor || !["moderator", "admin", "super_admin"].includes(actor.role)) throw new Error("Not authorized.");
    const [target] = await tx.select({ postId: feedReports.postId, replyId: feedReports.replyId }).from(feedReports).where(eq(feedReports.id, reportId));
    if (!target) throw new Error("Report unavailable.");
    // Lock in the same order as report creation: post, reply, then report.
    const [post] = await tx.select({ id: posts.id }).from(posts).where(eq(posts.id, target.postId)).for("update");
    if (!post) throw new Error("Post unavailable.");
    if (target.replyId) {
      const [reply] = await tx.select({ id: postReplies.id }).from(postReplies).where(and(eq(postReplies.id, target.replyId), eq(postReplies.postId, target.postId))).for("update");
      if (!reply) throw new Error("Reply unavailable.");
    }
    const [report] = await tx.select({ status: feedReports.status }).from(feedReports).where(eq(feedReports.id, reportId)).for("update");
    if (!report || report.status !== "open") throw new Error("This report has already been reviewed.");
    const now = new Date();
    if (decision === "removed") {
      if (target.replyId) await tx.update(postReplies).set({ deletedAt: now }).where(and(eq(postReplies.id, target.replyId), isNull(postReplies.deletedAt)));
      else await tx.update(posts).set({ deletedAt: now }).where(and(eq(posts.id, target.postId), isNull(posts.deletedAt)));
    }
    await tx.update(feedReports).set({ status: decision, reviewerId: session.user.id!, reviewedAt: now, note }).where(eq(feedReports.id, reportId));
    await tx.insert(auditLogs).values({ adminId: session.user.id!, action: "report_resolved", entityType: "feed_report", entityId: reportId, beforeState: { status: "open" }, afterState: { status: decision, postId: target.postId, replyId: target.replyId }, reason: note });
  });
  revalidatePath("/"); revalidatePath("/home"); revalidatePath("/admin/feed-reports");
}
