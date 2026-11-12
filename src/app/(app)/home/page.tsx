import { ClickablePost } from "@/components/features/feed/ClickablePost";
import Link from "next/link";
import { BookOpen, Compass, Heart, House as HomeIcon, ChatCircle as MessageCircle, MagnifyingGlass as Search, BookOpenText as Sparkles, Bell, GearSix, SquaresFour, UploadSimple, ArrowUpRight, Repeat } from "@phosphor-icons/react/ssr";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { usersRepository } from "@/lib/db/repositories/users";
import { users, posts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { toggleLike, deletePost } from "./actions";
import { formatPostTime } from "@/lib/feed/post-time";
import { Composer } from "@/components/features/feed/Composer";
import { RepostButton } from "@/components/features/feed/RepostButton";
import { PostOptions } from "@/components/features/feed/PostOptions";
import { PostShare } from "@/components/features/feed/PostShare";
import { FeedMoreMenu } from "@/components/features/feed/FeedMoreMenu";
import { FollowSuggestion } from "@/components/features/feed/FollowSuggestion";
import { FeedProfileAvatar } from "@/components/features/feed/FeedProfileAvatar";
import { Brand, BrandMark } from "@/components/brand/Brand";
import styles from "@/components/features/feed/feed.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home | getpidief" };
type View = "latest" | "following" | "saved";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string; before?: string; beforeKind?: string }> }) {
  const session = await auth(); const userId = session!.user!.id!;
  const params = await searchParams;
  const view: View = params.view === "saved" || params.view === "following" ? params.view : "latest";
  const before = params.before && uuid.test(params.before) ? params.before : undefined;
  const [profile] = await db.select({ name: users.displayName, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, userId)).limit(1);
  const following = await usersRepository.getFollowing(userId, { viewerId: userId, limit: 3 });
  const suggestions = await usersRepository.getFollowSuggestions(userId, 3);
  // Event cursors are resolved in PostgreSQL, preserving microsecond precision.
  // Saved is a collection of originals; Following includes posts and reposts by followed people.
  type FeedEvent = { eventId: string; eventKind: "post" | "repost"; id: string; authorId: string; body: string; kind: string; createdAt: string; name: string; username: string; avatarUrl: string | null; likeCount: number; liked: boolean; saved: boolean; following: boolean; replyCount: number; reposted: boolean; repostCount: number; reposterName: string | null; reposterUsername: string | null };
  const cursorKind = params.beforeKind === "repost" ? "repost" : "post";
  const events = await db.execute<FeedEvent>(sql`
    WITH feed_events AS (
      SELECT p.id AS event_id, 'post'::text AS event_kind, p.created_at AS event_at, p.id AS post_id, p.author_id AS actor_id
      FROM posts p WHERE p.deleted_at IS NULL
      UNION ALL
      SELECT r.id, 'repost'::text, r.created_at, r.post_id, r.user_id
      FROM post_reposts r WHERE ${view !== "saved"}
    ), cursor_event AS (
      SELECT event_at, event_kind, event_id FROM feed_events
      WHERE event_id = ${before ?? null}::uuid AND event_kind = ${cursorKind}
    )
    SELECT e.event_id AS "eventId", e.event_kind AS "eventKind", p.id, p.author_id AS "authorId", p.body, p.kind,
      p.created_at AS "createdAt", u.display_name AS name, u.username, u.avatar_url AS "avatarUrl",
      (SELECT count(*)::int FROM post_likes l WHERE l.post_id = p.id) AS "likeCount",
      EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ${userId}::uuid) AS liked,
      EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${userId}::uuid) AS saved,
      EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${userId}::uuid AND f.following_id = p.author_id) AS following,
      (SELECT count(*)::int FROM post_replies r JOIN users ru ON ru.id = r.author_id WHERE r.post_id = p.id AND r.deleted_at IS NULL AND ru.status = 'active' AND ru.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${userId}::uuid AND b.blocked_id = ru.id) OR (b.blocked_id = ${userId}::uuid AND b.blocker_id = ru.id))) AS "replyCount",
      EXISTS (SELECT 1 FROM post_reposts r WHERE r.post_id = p.id AND r.user_id = ${userId}::uuid) AS reposted,
      (SELECT count(*)::int FROM post_reposts r JOIN users x ON x.id = r.user_id WHERE r.post_id = p.id AND x.status = 'active' AND x.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${userId}::uuid AND b.blocked_id = x.id) OR (b.blocked_id = ${userId}::uuid AND b.blocker_id = x.id))) AS "repostCount",
      CASE WHEN e.event_kind = 'repost' THEN actor.display_name END AS "reposterName",
      CASE WHEN e.event_kind = 'repost' THEN actor.username END AS "reposterUsername"
    FROM feed_events e JOIN posts p ON p.id = e.post_id
    JOIN users u ON u.id = p.author_id JOIN users actor ON actor.id = e.actor_id
    WHERE p.deleted_at IS NULL AND u.status = 'active' AND u.deleted_at IS NULL AND actor.status = 'active' AND actor.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id = ${userId}::uuid AND b.blocked_id IN (u.id, actor.id)) OR (b.blocked_id = ${userId}::uuid AND b.blocker_id IN (u.id, actor.id)))
      AND (${view !== "saved"} OR EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${userId}::uuid))
      AND (${view !== "following"} OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${userId}::uuid AND f.following_id = e.actor_id))
      AND (${before === undefined} OR (e.event_at, e.event_kind, e.event_id) < (SELECT event_at, event_kind, event_id FROM cursor_event))
    ORDER BY e.event_at DESC, e.event_kind DESC, e.event_id DESC LIMIT 21
  `);
  const rows = events.rows.map(event => ({ ...event, createdAt: new Date(event.createdAt) }));
  const visible = rows.slice(0, 20); const ids = [...new Set(visible.map(x => x.id))];
  const now = new Date();
  const replies = ids.length ? await db.execute<{ id: string; post_id: string; body: string; name: string; username: string }>(sql`
    select r.id, p.id as post_id, r.body, r.name, r.username from posts p
    cross join lateral (
      select r.id, r.body, u.display_name as name, u.username, r.created_at
      from post_replies r join users u on u.id = r.author_id
      where r.post_id = p.id and r.deleted_at is null and u.status = 'active' and u.deleted_at is null
        and not exists (select 1 from user_blocks b where (b.blocker_id = ${userId}::uuid and b.blocked_id = u.id) or (b.blocked_id = ${userId}::uuid and b.blocker_id = u.id))
      order by r.created_at desc, r.id desc limit 2
    ) r where p.id in (${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)})
    order by p.id, r.created_at, r.id
  `) : { rows: [] };
  const tabs: { view: View; label: string; href: string }[] = [{ view: "latest", label: "Latest", href: "/" }, { view: "following", label: "Following", href: "/?view=following" }];
  return <div className={styles.shell} data-feed-shell><div className={styles.layout}>
    <aside className={styles.left} aria-label="Main navigation">
      <div className={styles.sidebarBrand}><BrandMark /></div>
      <nav className={styles.sideNav} aria-label="Main navigation">
        <Link className={`${styles.sideLink} ${view !== "saved" ? styles.sideActive : ""}`} href="/" aria-current={view !== "saved" ? "page" : undefined}><HomeIcon size={24} weight={view !== "saved" ? "fill" : "regular"} aria-hidden="true" /> Home</Link>
        <Link className={`${styles.sideLink} ${styles.tabletSearch}`} href="/search"><Search size={24} aria-hidden="true" /> Search</Link>
        <Link className={styles.sideLink} href="/explore"><Compass size={24} aria-hidden="true" /> Explore</Link>
        <Link className={styles.sideLink} href="/notifications"><Bell size={24} aria-hidden="true" /> Notifications</Link>
        <Link className={styles.sideLink} href="/dashboard/library"><BookOpen size={24} aria-hidden="true" /> Library</Link>
        <Link className={styles.sideLink} href="/dashboard"><SquaresFour size={24} aria-hidden="true" /> Dashboard</Link>
        {profile?.username && <Link className={styles.sideLink} href={`/u/${profile.username}`}><FeedProfileAvatar name={profile.name} avatarUrl={profile.avatarUrl} /> Profile</Link>}
      </nav>
      <Link className={styles.uploadCta} href="/dashboard/uploads/new"><UploadSimple size={19} aria-hidden="true" /> Upload a resource</Link>
      <div className={styles.sidebarMore}><FeedMoreMenu /></div>
    </aside>
    <section aria-labelledby="feed-title" className={styles.feedColumn}>
      <div className={styles.mobileHeader}><Brand /><Link href="/settings" className={styles.mobileSettings} aria-label="Settings"><GearSix size={22} aria-hidden="true" /></Link></div>
      <h1 id="feed-title" className="sr-only">{view === "saved" ? "Saved posts" : "Home"}</h1>
      <Composer name={profile?.name ?? "You"} avatarUrl={profile?.avatarUrl ?? null} />
      <nav aria-label="Feed views" className={styles.tabs}>{tabs.map(tab => <Link key={tab.view} href={tab.href} aria-current={view === tab.view ? "page" : undefined} className={`${styles.tab} ${view === tab.view ? styles.activeTab : ""}`}>{tab.label}</Link>)}</nav>
      {visible.length === 0 ? <div className={styles.empty}><span className={styles.emptyIcon}><Sparkles size={22} aria-hidden="true" /></span><h2>{view === "saved" ? "Keep the good ideas close." : view === "following" ? "Your circle starts here." : "Every conversation starts somewhere."}</h2><p>{view === "saved" ? "When a post is worth coming back to, save it and you’ll find it here." : view === "following" ? "Posts from people you follow will show up here, newest first." : "Be the first to share a thought or ask a question. Someone else might be wondering the same thing."}</p>{view !== "latest" && <Link href="/">See the latest posts</Link>}</div> : <div className={styles.posts}>{visible.map(post => <ClickablePost key={`${post.eventKind}:${post.eventId}`} postId={post.id}>
        {post.eventKind === "repost" && <div className={styles.repostAttribution}><Repeat size={15} aria-hidden="true" /><Link href={`/u/${post.reposterUsername}`}>{post.reposterName}</Link> reposted</div>}
        <div className={styles.postTop}><FeedProfileAvatar name={post.name} avatarUrl={post.avatarUrl} post /><div className={styles.author}><Link href={`/u/${post.username}`}>{post.name}</Link><time className={styles.postTime} dateTime={post.createdAt.toISOString()} title={post.createdAt.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}>{formatPostTime(post.createdAt, now)}</time></div><PostOptions postId={post.id} authorId={post.authorId} author={post.name} ownPost={post.authorId === userId} initiallyFollowing={post.following} initiallySaved={post.saved} /></div>
        <p className={styles.postBody}><Link href={`/home/post/${post.id}`} className={styles.postBodyLink} aria-label={`Open post by ${post.name}`}>{post.body}</Link></p>
        <div className={styles.actions}><form action={toggleLike}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="active" value={String(post.liked)}/><button className={`${styles.action} ${post.liked ? styles.actionActive : ""}`} aria-pressed={post.liked} aria-label={`${post.liked ? "Unlike" : "Like"} post by ${post.name}`}><Heart size={19} aria-hidden="true" weight={post.liked ? "fill" : "regular"}/><span>{post.likeCount}</span></button></form>
          <Link className={styles.action} href={`/home/post/${post.id}`} aria-label={`Open discussion on post by ${post.name}, ${post.replyCount} replies`}><MessageCircle size={17} aria-hidden="true" />{post.replyCount}</Link>
          <RepostButton postId={post.id} author={post.name} initiallyReposted={post.reposted} count={post.repostCount} />
          <PostShare postId={post.id} author={post.name} />
          {post.authorId === userId && <form action={deletePost} className={styles.delete}><input type="hidden" name="postId" value={post.id}/><button>Delete</button></form>}</div>
        {replies.rows.some(r => r.post_id === post.id) && <div className={styles.replies}>{replies.rows.filter(r => r.post_id === post.id).map(r => <p key={r.id} className={styles.reply}><Link href={`/u/${r.username}`}><strong>{r.name}</strong></Link> {r.body}</p>)}<Link className={styles.action} href={`/home/post/${post.id}`}>{post.replyCount > 2 ? `View all ${post.replyCount} replies` : "Join the conversation"}</Link></div>}
      </ClickablePost>)}</div>}
      {rows.length > 20 && <Link className={styles.more} href={`/?${view !== "latest" ? `view=${view}&` : ""}before=${visible[visible.length - 1].eventId}${visible[visible.length - 1].eventKind === "repost" ? "&beforeKind=repost" : ""}`}>Older posts</Link>}
    </section>
    <aside className={styles.right} aria-label="Discover people and resources" tabIndex={0}>
      <form action="/search" className={styles.resourceSearch} role="search">
        <Search size={20} aria-hidden="true" />
        <label htmlFor="feed-resource-search" className="sr-only">Search resources</label>
        <input id="feed-resource-search" name="q" type="search" placeholder="Search resources" />
        <button type="submit" className="sr-only">Search</button>
      </form>
      <section className={styles.discoveryCard} aria-labelledby="following-accounts-title">
        <div className={styles.discoveryHeading}><h2 id="following-accounts-title">Following</h2>{following.total > 0 && <Link href="/dashboard/following">See all <ArrowUpRight size={15} aria-hidden="true" /></Link>}</div>
        {following.following.length ? <ul className={styles.followingList}>{following.following.map(account => <li key={account.id}><Link className={styles.followingItem} href={`/u/${account.username}`}><FeedProfileAvatar name={account.displayName} avatarUrl={account.avatarUrl} post /><span className={styles.followingDetails}><strong>{account.displayName}</strong><small>@{account.username}</small></span></Link></li>)}</ul> : <div className={styles.resourceEmpty}><p>You’re not following anyone yet.</p><Link href="/explore">Explore <ArrowUpRight size={15} aria-hidden="true" /></Link></div>}
      </section>
      <section className={styles.discoveryCard} aria-labelledby="follow-suggestions-title">
        <div className={styles.discoveryHeading}><h2 id="follow-suggestions-title">Who to follow</h2><Link href="/who-to-follow">See all <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        {suggestions.rows.length ? <ul className={styles.followingList}>{suggestions.rows.map(account => <li key={account.id} className={styles.suggestionRow}><Link className={styles.followingItem} href={`/u/${account.username}`}><FeedProfileAvatar name={account.display_name} avatarUrl={account.avatar_url} post /><span className={styles.followingDetails}><strong>{account.display_name}</strong><small>@{account.username}</small></span></Link><FollowSuggestion id={account.id} name={account.display_name} /></li>)}</ul> : <div className={styles.resourceEmpty}><p>No suggestions right now.</p></div>}
      </section>
    </aside>
  </div></div>;
}
