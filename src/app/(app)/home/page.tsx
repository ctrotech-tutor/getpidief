import Link from "next/link";
import { BookOpen, BookmarkSimple as Bookmark, Compass, Heart, House as HomeIcon, ChatCircle as MessageCircle, MagnifyingGlass as Search, BookOpenText as Sparkles, Bell, GearSix, SquaresFour, UploadSimple, ShieldCheck, UserCircle, ArrowUpRight, FileText } from "@phosphor-icons/react/ssr";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users, posts, documents, categories } from "@/lib/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { toggleLike, toggleSave, deletePost } from "./actions";
import { Composer } from "@/components/features/feed/Composer";
import { Brand, BrandMark } from "@/components/brand/Brand";
import styles from "@/components/features/feed/feed.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home | getpidief" };
type View = "latest" | "following" | "saved";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string; before?: string }> }) {
  const session = await auth(); const userId = session!.user!.id!;
  const params = await searchParams;
  const view: View = params.view === "saved" || params.view === "following" ? params.view : "latest";
  const before = params.before && uuid.test(params.before) ? params.before : undefined;
  const [profile] = await db.select({ name: users.displayName, username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
  // Only publicly visible, approved resources appear here; this is not a recommendation ranking.
  const recentResources = await db.select({ id: documents.id, title: documents.title, slug: documents.slug, category: categories.name })
    .from(documents).leftJoin(categories, eq(documents.categoryId, categories.id))
    .where(and(eq(documents.status, "approved"), eq(documents.visibility, "public"), isNull(documents.deletedAt)))
    .orderBy(sql`${documents.publishedAt} desc nulls last`, desc(documents.createdAt), desc(documents.id)).limit(4);
  // The cursor is resolved by PostgreSQL to preserve timestamp precision.
  const rows = await db.select({ id: posts.id, authorId: posts.authorId, body: posts.body, kind: posts.kind, createdAt: posts.createdAt, name: users.displayName, username: users.username,
    likeCount: sql<number>`(select count(*)::int from post_likes where post_id = ${posts.id})`,
    liked: sql<boolean>`exists (select 1 from post_likes where post_id = ${posts.id} and user_id = ${userId}::uuid)`,
    saved: sql<boolean>`exists (select 1 from post_saves where post_id = ${posts.id} and user_id = ${userId}::uuid)`,
    replyCount: sql<number>`(select count(*)::int from post_replies r join users u on u.id = r.author_id where r.post_id = ${posts.id} and r.deleted_at is null and u.status = 'active' and u.deleted_at is null)`,
  }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(isNull(posts.deletedAt), eq(users.status, "active"), isNull(users.deletedAt),
    view === "saved" ? sql`exists (select 1 from post_saves where post_id = ${posts.id} and user_id = ${userId}::uuid)` : undefined,
    view === "following" ? sql`exists (select 1 from follows where follower_id = ${userId}::uuid and following_id = ${posts.authorId})` : undefined,
    before ? sql`(${posts.createdAt}, ${posts.id}) < (select created_at, id from posts where id = ${before}::uuid)` : undefined,
  )).orderBy(desc(posts.createdAt), desc(posts.id)).limit(21);
  const visible = rows.slice(0, 20); const ids = visible.map(x => x.id);
  const replies = ids.length ? await db.execute<{ id: string; post_id: string; body: string; name: string; username: string }>(sql`
    select r.id, p.id as post_id, r.body, r.name, r.username from posts p
    cross join lateral (
      select r.id, r.body, u.display_name as name, u.username, r.created_at
      from post_replies r join users u on u.id = r.author_id
      where r.post_id = p.id and r.deleted_at is null and u.status = 'active' and u.deleted_at is null
      order by r.created_at desc, r.id desc limit 2
    ) r where p.id in (${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)})
    order by p.id, r.created_at, r.id
  `) : { rows: [] };
  const tabs: { view: View; label: string; href: string }[] = [{ view: "latest", label: "Latest", href: "/" }, { view: "following", label: "Following", href: "/?view=following" }];
  return <div className={styles.shell}><div className={styles.layout}>
    <aside className={styles.left} aria-label="Main navigation">
      <div className={styles.sidebarBrand}><BrandMark /></div>
      <nav className={styles.sideNav} aria-label="Main navigation">
        <Link className={`${styles.sideLink} ${view !== "saved" ? styles.sideActive : ""}`} href="/" aria-current={view !== "saved" ? "page" : undefined}><HomeIcon size={21} weight={view !== "saved" ? "fill" : "regular"} aria-hidden="true" /> Home</Link>
        <Link className={styles.sideLink} href="/search"><Search size={21} aria-hidden="true" /> Search</Link>
        <Link className={styles.sideLink} href="/explore"><Compass size={21} aria-hidden="true" /> Explore</Link>
        <Link className={styles.sideLink} href="/notifications"><Bell size={21} aria-hidden="true" /> Notifications</Link>
        <Link className={`${styles.sideLink} ${view === "saved" ? styles.sideActive : ""}`} href="/?view=saved" aria-current={view === "saved" ? "page" : undefined}><Bookmark size={21} weight={view === "saved" ? "fill" : "regular"} aria-hidden="true" /> Saved posts</Link>
        <Link className={styles.sideLink} href="/dashboard/library"><BookOpen size={21} aria-hidden="true" /> Library</Link>
        <Link className={styles.sideLink} href="/dashboard/uploads"><UploadSimple size={21} aria-hidden="true" /> Uploads</Link>
        <Link className={styles.sideLink} href="/dashboard"><SquaresFour size={21} aria-hidden="true" /> Dashboard</Link>
        {profile?.username && <Link className={styles.sideLink} href={`/u/${profile.username}`}><UserCircle size={21} aria-hidden="true" /> Profile</Link>}
        <Link className={styles.sideLink} href="/settings"><GearSix size={21} aria-hidden="true" /> Settings</Link>
        {["admin", "super_admin", "moderator"].includes(session?.user?.role ?? "") && <Link className={styles.sideLink} href="/admin"><ShieldCheck size={21} aria-hidden="true" /> Moderation</Link>}
      </nav>
    </aside>
    <section aria-labelledby="feed-title" className={styles.feedColumn}>
      <div className={styles.mobileHeader}><Brand /><div className={styles.mobileHeaderActions}><Link href="/?view=saved" className={styles.mobileSettings} aria-label="Saved posts" aria-current={view === "saved" ? "page" : undefined}><Bookmark size={22} weight={view === "saved" ? "fill" : "regular"} aria-hidden="true" /></Link><Link href="/settings" className={styles.mobileSettings} aria-label="Settings"><GearSix size={22} aria-hidden="true" /></Link></div></div>
      <header className={styles.header}><h1 id="feed-title">{view === "saved" ? "Saved posts" : "Home"}</h1></header>
      <Composer name={profile?.name ?? "You"} />
      <nav aria-label="Feed views" className={styles.tabs}>{tabs.map(tab => <Link key={tab.view} href={tab.href} aria-current={view === tab.view ? "page" : undefined} className={`${styles.tab} ${view === tab.view ? styles.activeTab : ""}`}>{tab.label}</Link>)}</nav>
      <div className={styles.feedIntro}><strong>{view === "following" ? "From people you follow" : view === "saved" ? "Your saved posts" : "The latest conversations"}</strong><span>Newest first</span></div>
      {visible.length === 0 ? <div className={styles.empty}><span className={styles.emptyIcon}><Sparkles size={22} aria-hidden="true" /></span><h2>{view === "saved" ? "Keep the good ideas close." : view === "following" ? "Your circle starts here." : "Every conversation starts somewhere."}</h2><p>{view === "saved" ? "When a post is worth coming back to, save it and you’ll find it here." : view === "following" ? "Posts from people you follow will show up here, newest first." : "Be the first to share a thought or ask a question. Someone else might be wondering the same thing."}</p>{view !== "latest" && <Link href="/">See the latest posts</Link>}</div> : <div className={styles.posts}>{visible.map(post => <article key={post.id} className={styles.post}>
        <div className={styles.postTop}><span className={styles.avatar} aria-hidden="true">{post.name.trim().charAt(0).toUpperCase() || "?"}</span><div className={styles.author}><Link href={`/u/${post.username}`}>{post.name}</Link><p className={styles.meta}>@{post.username} · <time dateTime={post.createdAt.toISOString()}>{post.createdAt.toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" })}</time></p></div>{post.kind === "question" && <span className={styles.postType}>Question</span>}</div>
        <p className={styles.postBody}>{post.body}</p>
        <div className={styles.actions}><form action={toggleLike}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="active" value={String(post.liked)}/><button className={`${styles.action} ${post.liked ? styles.actionActive : ""}`} aria-pressed={post.liked} aria-label={`${post.liked ? "Unlike" : "Like"} post by ${post.name}`}><Heart size={17} aria-hidden="true" fill={post.liked ? "currentColor" : "none"}/><span>{post.likeCount}</span></button></form>
          <Link className={styles.action} href={`/home/post/${post.id}`} aria-label={`Open discussion on post by ${post.name}, ${post.replyCount} replies`}><MessageCircle size={17} aria-hidden="true" />{post.replyCount}</Link>
          <form action={toggleSave}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="active" value={String(post.saved)}/><button className={`${styles.action} ${post.saved ? styles.actionActive : ""}`} aria-pressed={post.saved} aria-label={`${post.saved ? "Remove saved" : "Save"} post by ${post.name}`}><Bookmark size={17} aria-hidden="true" fill={post.saved ? "currentColor" : "none"}/>{post.saved ? "Saved" : "Save"}</button></form>
          {post.authorId === userId && <form action={deletePost} className={styles.delete}><input type="hidden" name="postId" value={post.id}/><button>Delete</button></form>}</div>
        {replies.rows.some(r => r.post_id === post.id) && <div className={styles.replies}>{replies.rows.filter(r => r.post_id === post.id).map(r => <p key={r.id} className={styles.reply}><Link href={`/u/${r.username}`}><strong>{r.name}</strong></Link> {r.body}</p>)}<Link className={styles.action} href={`/home/post/${post.id}`}>{post.replyCount > 2 ? `View all ${post.replyCount} replies` : "Join the conversation"}</Link></div>}
      </article>)}</div>}
      {rows.length > 20 && <Link className={styles.more} href={`/?${view !== "latest" ? `view=${view}&` : ""}before=${visible[visible.length - 1].id}`}>Older posts</Link>}
    </section>
    <aside className={styles.right} aria-label="Discover resources">
      <form action="/search" className={styles.resourceSearch} role="search">
        <Search size={20} aria-hidden="true" />
        <label htmlFor="feed-resource-search" className="sr-only">Search resources</label>
        <input id="feed-resource-search" name="q" type="search" placeholder="Search resources" />
        <button type="submit" className="sr-only">Search</button>
      </form>
      <section className={styles.discoveryCard} aria-labelledby="recent-resources-title">
        <div className={styles.discoveryHeading}><div><span className={styles.discoveryEyebrow}>THE LIBRARY</span><h2 id="recent-resources-title">Recently added</h2></div><Link href="/explore">Explore <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        {recentResources.length ? <ul className={styles.resourceList}>{recentResources.map(resource => <li key={resource.id}><Link href={`/d/${resource.slug}`} className={styles.resourceItem}><span className={styles.resourceIcon}><FileText size={19} aria-hidden="true" /></span><span className={styles.resourceDetails}><strong>{resource.title}</strong><small>{resource.category ?? "Resource"}</small></span><ArrowUpRight className={styles.resourceArrow} size={16} aria-hidden="true" /></Link></li>)}</ul> : <div className={styles.resourceEmpty}><p>No public resources yet.</p><Link href="/dashboard/uploads">Share a resource <ArrowUpRight size={15} aria-hidden="true" /></Link></div>}
      </section>
    </aside>
  </div></div>;
}
