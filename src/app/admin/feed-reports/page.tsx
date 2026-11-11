import { redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { feedReports, postReplies, posts, users } from "@/lib/db/schema";
import { reviewFeedReport } from "./actions";

export const dynamic = "force-dynamic";
export default async function FeedReports() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const actor = await db.query.users.findFirst({ where: and(eq(users.id, session.user.id), eq(users.status, "active"), isNull(users.deletedAt)), columns: { role: true } });
  if (!actor || !["moderator", "admin", "super_admin"].includes(actor.role)) redirect("/");
  const reports = await db.select({ id: feedReports.id, reason: feedReports.reason, createdAt: feedReports.createdAt, postId: feedReports.postId, replyId: feedReports.replyId, postBody: posts.body, postDeleted: posts.deletedAt, replyBody: postReplies.body, replyDeleted: postReplies.deletedAt }).from(feedReports).innerJoin(posts, eq(feedReports.postId, posts.id)).leftJoin(postReplies, eq(feedReports.replyId, postReplies.id)).where(eq(feedReports.status, "open")).orderBy(asc(feedReports.createdAt), asc(feedReports.id)).limit(50);
  return <div className="mx-auto max-w-4xl"><h1 className="text-3xl font-semibold">Feed reports</h1><p className="mt-2 text-muted-foreground">Oldest open reports first. Removing content hides it from the feed; decisions are recorded in the audit log.</p><div className="mt-6 space-y-4">{reports.length === 0 && <p>No open feed reports.</p>}{reports.map(report => <article key={report.id} className="rounded-2xl border bg-card p-5"><div className="flex flex-wrap gap-3 text-sm font-semibold"><span>{report.replyId ? "Reply" : "Post"}</span><span>Reason: {report.reason}</span><span>{report.createdAt.toLocaleDateString("en", {dateStyle:"medium", timeZone:"UTC"})}</span></div><p className="mt-3 whitespace-pre-wrap break-words">{report.replyId ? report.replyBody : report.postBody}</p>{(report.postDeleted || report.replyDeleted) && <p className="mt-2 text-sm text-muted-foreground">This content is already hidden.</p>}<form action={reviewFeedReport} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="reportId" value={report.id}/><label className="sr-only" htmlFor={`note-${report.id}`}>Review note</label><input id={`note-${report.id}`} name="note" required minLength={3} maxLength={500} placeholder="Review note" className="min-w-48 flex-1 rounded-lg border bg-background px-3 py-2"/><button name="decision" value="dismissed" className="rounded-lg border px-3 py-2">Dismiss report</button><button name="decision" value="removed" className="rounded-lg bg-red-800 px-3 py-2 text-white">Remove content</button></form></article>)}</div>{reports.length === 50 && <p className="mt-4 text-sm text-muted-foreground">Showing the oldest 50. Review reports to see the next items.</p>}</div>;
}
