import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { posts, postReplies, users } from "@/lib/db/schema";
import { reply, reportFeedContent, deleteReply } from "../../actions";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function Discussion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ before?: string; reported?: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const [post] = await db.select({ body: posts.body, authorId: posts.authorId, name: users.displayName, username: users.username, kind: posts.kind }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(eq(posts.id, id), isNull(posts.deletedAt), eq(users.status, "active"), isNull(users.deletedAt), sql`not exists (select 1 from user_blocks b where (b.blocker_id = ${userId}::uuid and b.blocked_id = ${users.id}) or (b.blocked_id = ${userId}::uuid and b.blocker_id = ${users.id}))`)).limit(1);
  if (!post) notFound();
  const query = await searchParams;
  const before = query.before;
  const cursor = before && uuid.test(before) ? before : undefined;
  const replies = await db.select({ id: postReplies.id, authorId: postReplies.authorId, body: postReplies.body, createdAt: postReplies.createdAt, name: users.displayName, username: users.username }).from(postReplies).innerJoin(users, eq(postReplies.authorId, users.id)).where(and(eq(postReplies.postId, id), isNull(postReplies.deletedAt), eq(users.status, "active"), isNull(users.deletedAt), sql`not exists (select 1 from user_blocks b where (b.blocker_id = ${userId}::uuid and b.blocked_id = ${users.id}) or (b.blocked_id = ${userId}::uuid and b.blocker_id = ${users.id}))`, cursor ? sql`(${postReplies.createdAt}, ${postReplies.id}) < (select created_at, id from post_replies where id = ${cursor}::uuid and post_id = ${id}::uuid)` : undefined)).orderBy(desc(postReplies.createdAt), desc(postReplies.id)).limit(31);
  const visible = replies.slice(0, 30);
  return <main className="min-h-screen bg-[#f5f7f1] px-4 py-8 text-[#17362d]"><div className="mx-auto max-w-2xl"><Link href="/" className="text-sm font-semibold underline">Back to home</Link>{query.reported === "1" && <p role="status" className="mt-4 rounded-2xl bg-[#dfeddf] p-4 text-sm">Report received, or already submitted. Thank you.</p>}<article className="mt-5 rounded-3xl border border-[#dce7dc] bg-white p-6"><Link href={`/u/${post.username}`} className="font-semibold">{post.name}</Link><p className="text-xs text-[#82958a]">@{post.username} {post.kind === "question" && "· Question"}</p><p className="mt-5 whitespace-pre-wrap break-words leading-relaxed">{post.body}</p>{post.authorId !== userId && <ReportForm postId={id} />}</article><h1 className="mt-8 text-2xl font-semibold">Discussion</h1><form action={reply} className="mt-4 flex gap-2"><input type="hidden" name="postId" value={id}/><input name="body" required maxLength={1000} aria-label="Write a reply" placeholder="Add to the conversation" className="min-w-0 flex-1 rounded-full border border-[#dce7dc] px-4 py-3 text-sm"/><button className="rounded-full bg-[#1d674b] px-5 py-2 text-sm font-semibold text-white">Reply</button></form><div className="mt-5 space-y-3">{visible.length === 0 && <p className="text-[#657b6f]">No replies here yet.</p>}{visible.map(item => <article key={item.id} className="rounded-2xl border border-[#dce7dc] bg-white p-4"><Link href={`/u/${item.username}`} className="font-semibold">{item.name}</Link><span className="ml-2 text-xs text-[#82958a]">{item.createdAt.toLocaleDateString("en", {dateStyle: "medium", timeZone: "UTC"})}</span><p className="mt-2 whitespace-pre-wrap break-words">{item.body}</p>{item.authorId === userId ? <form action={deleteReply} className="mt-3"><input type="hidden" name="postId" value={id}/><input type="hidden" name="replyId" value={item.id}/><button className="text-sm text-[#657b6f] underline">Delete your reply</button></form> : <ReportForm postId={id} replyId={item.id} />}</article>)}</div>{replies.length > 30 && <Link className="mt-5 inline-block rounded-full border border-[#cbdcca] bg-white px-5 py-2 text-sm font-semibold" href={`/home/post/${id}?before=${visible[visible.length - 1].id}`}>Older replies</Link>}</div></main>;
}

function ReportForm({ postId, replyId }: { postId: string; replyId?: string }) {
  return <details id={replyId ? `report-reply-${replyId}` : "report-post"} className="mt-4 text-sm"><summary className="cursor-pointer text-[#657b6f]">Report {replyId ? "reply" : "post"}</summary><form action={reportFeedContent} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="postId" value={postId}/>{replyId && <input type="hidden" name="replyId" value={replyId}/>}<label className="sr-only" htmlFor={`reason-${replyId ?? postId}`}>Reason for reporting</label><select id={`reason-${replyId ?? postId}`} name="reason" className="rounded-full border border-[#dce7dc] bg-white px-3 py-2"><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="misinformation">Misinformation</option><option value="other">Other</option></select><button className="rounded-full border border-[#dce7dc] px-4 py-2 font-semibold">Submit report</button></form></details>;
}
