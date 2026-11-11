import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users, posts } from "@/lib/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { createPost, reply, toggleLike, toggleSave, deletePost } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home | getpidief" };
export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string; before?: string }> }) {
  const session = await auth(); const userId = session!.user!.id!;
  const params = await searchParams;
  const saved = params.view === "saved";
  const before = params.before && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.before) ? params.before : undefined;
  // The cursor is looked up in PostgreSQL so sub-millisecond precision is retained.
  const rows = await db.select({ id: posts.id, authorId: posts.authorId, body: posts.body, kind: posts.kind, createdAt: posts.createdAt, name: users.displayName, username: users.username,
    likeCount: sql<number>`(select count(*)::int from post_likes where post_id = ${posts.id})`,
    liked: sql<boolean>`exists (select 1 from post_likes where post_id = ${posts.id} and user_id = ${userId}::uuid)`,
    saved: sql<boolean>`exists (select 1 from post_saves where post_id = ${posts.id} and user_id = ${userId}::uuid)`,
    replyCount: sql<number>`(select count(*)::int from post_replies r join users u on u.id = r.author_id where r.post_id = ${posts.id} and r.deleted_at is null and u.status = 'active' and u.deleted_at is null)`,
  }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(isNull(posts.deletedAt), eq(users.status, "active"), isNull(users.deletedAt),
    saved ? sql`exists (select 1 from post_saves where post_id = ${posts.id} and user_id = ${userId}::uuid)` : undefined,
    before ? sql`(${posts.createdAt}, ${posts.id}) < (select created_at, id from posts where id = ${before}::uuid)` : undefined,
  )).orderBy(desc(posts.createdAt), desc(posts.id)).limit(21);
  const hasMore = rows.length > 20;
  const visible = rows.slice(0, 20);
  const ids = visible.map(x => x.id);
  // At most three recent replies per post, not 500 shared across the feed.
  const replies = ids.length ? await db.execute<{ id: string; post_id: string; body: string; name: string }>(sql`
    select r.id, p.id as post_id, r.body, r.name from posts p
    cross join lateral (
      select r.id, r.body, u.display_name as name, r.created_at
      from post_replies r join users u on u.id = r.author_id
      where r.post_id = p.id and r.deleted_at is null and u.status = 'active' and u.deleted_at is null
      order by r.created_at desc, r.id desc limit 3
    ) r where p.id in (${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)})
    order by p.id, r.created_at, r.id
  `) : { rows: [] };
  return <div className="min-h-screen bg-[#f5f7f1] text-[#17362d]"><div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[220px_minmax(0,650px)_220px]">
    <aside className="hidden lg:block"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#748b7e]">Your space</p><nav className="mt-5 grid gap-3 font-semibold"><Link href="/">Home</Link><Link href="/?view=saved">Saved posts</Link><Link href="/explore">Explore resources</Link></nav></aside>
    <section><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#748b7e]">The learning network</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">A place to think together.</h1><p className="mt-2 text-[#657b6f]">Share what you’re learning, or bring a question to the table.</p></div>
      <form action={createPost} className="rounded-3xl border border-[#dce7dc] bg-white p-5 shadow-sm"><label htmlFor="post-body" className="font-semibold">Start a conversation</label><textarea id="post-body" name="body" required maxLength={3000} rows={3} placeholder="What are you learning?" className="mt-3 w-full resize-y rounded-2xl bg-[#f5f8f3] p-4 outline-[#31845e]"/><div className="mt-3 flex items-center justify-between gap-3"><select name="kind" aria-label="Post type" className="rounded-full border border-[#dce7dc] bg-white px-4 py-2 text-sm"><option value="thought">Share a thought</option><option value="question">Ask a question</option></select><button className="rounded-full bg-[#1d674b] px-5 py-2 text-sm font-semibold text-white">Post</button></div></form>
      <div className="my-6 flex gap-5 border-b border-[#dce7dc] pb-3 text-sm font-semibold"><Link href="/" className={!saved ? "text-[#1d674b]" : "text-[#82958a]"}>Latest</Link><Link href="/?view=saved" className={saved ? "text-[#1d674b]" : "text-[#82958a]"}>Saved</Link></div>
      <div className="space-y-4">{rows.length === 0 && <div className="rounded-3xl border border-[#dce7dc] bg-white p-8 text-[#657b6f]">{saved ? "No saved posts yet. Save a conversation to find it here." : "The conversation starts here. Share a thought or ask the first question."}</div>}{visible.map(post => { const liked = post.liked; const isSaved = post.saved; return <article key={post.id} className="rounded-3xl border border-[#dce7dc] bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><Link href={`/u/${post.username}`} className="font-semibold">{post.name}</Link><p className="text-xs text-[#82958a]">@{post.username} · {post.createdAt.toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" })} {post.kind === "question" && "· Question"}</p></div>{post.authorId === userId && <form action={deletePost}><input type="hidden" name="postId" value={post.id}/><button className="text-xs text-[#82958a]">Delete</button></form>}</div><p className="my-5 whitespace-pre-wrap break-words leading-relaxed">{post.body}</p><div className="flex gap-5 border-t border-[#edf2eb] pt-3 text-sm font-semibold text-[#657b6f]"><form action={toggleLike}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="active" value={String(liked)}/><button aria-pressed={liked}>{liked ? "Liked" : "Like"} · {post.likeCount}</button></form><form action={toggleSave}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="active" value={String(isSaved)}/><button aria-pressed={isSaved}>{isSaved ? "Saved" : "Save"}</button></form></div><div className="mt-4 space-y-3">{replies.rows.filter(x => x.post_id === post.id).map(r => <p key={r.id} className="break-words rounded-2xl bg-[#f5f8f3] px-4 py-3 text-sm"><strong>{r.name}</strong> <span className="whitespace-pre-wrap">{r.body}</span></p>)}</div><Link href={`/home/post/${post.id}`} className="mt-3 inline-block text-sm font-semibold underline">{post.replyCount > 3 ? `View all ${post.replyCount} replies` : "Open discussion"}</Link><form action={reply} className="mt-4 flex gap-2"><input type="hidden" name="postId" value={post.id}/><input name="body" required maxLength={1000} aria-label="Write a reply" placeholder="Add to the conversation" className="min-w-0 flex-1 rounded-full border border-[#dce7dc] px-4 py-2 text-sm"/><button className="rounded-full bg-[#e5f1e6] px-4 py-2 text-sm font-semibold">Reply</button></form></article>})}</div>
    {hasMore && <Link className="mt-5 inline-block rounded-full border border-[#cbdcca] bg-white px-5 py-2 text-sm font-semibold" href={`/?${saved ? "view=saved&" : ""}before=${visible[visible.length - 1].id}`}>Older posts</Link>}
    </section><aside className="hidden lg:block"><div className="rounded-3xl bg-[#dfeddf] p-5"><p className="text-xs font-bold uppercase tracking-widest">Good to know</p><h2 className="mt-3 text-xl font-semibold">Learning is better together.</h2><p className="mt-2 text-sm leading-relaxed text-[#567566]">Ask thoughtful questions and share ideas that help someone else move forward.</p><Link className="mt-4 inline-block text-sm font-semibold underline" href="/explore">Find resources</Link></div></aside></div></div>;
}
