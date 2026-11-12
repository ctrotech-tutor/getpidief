import { Suspense } from "react";
import { PostSkeleton } from "@/components/features/feed/PostSkeleton";
import { FEED_UUID, validFeedTime } from "@/lib/feed/cursor";
import { readFeed, type FeedView } from "@/lib/feed/read";
import { discoveryCandidates } from "@/lib/feed/discovery";
import { arrangeDiscovery } from "@/lib/feed/discovery-ranking";
import { DiscoveryStream } from "@/components/features/feed/DiscoveryStream";
import { FeedStream } from "@/components/features/feed/FeedStream";
import Link from "next/link";
import { BookOpen, Compass, House as HomeIcon, MagnifyingGlass as Search, BookOpenText as Sparkles, Bell, GearSix, SquaresFour, UploadSimple } from "@phosphor-icons/react/ssr";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { usersRepository } from "@/lib/db/repositories/users";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Composer } from "@/components/features/feed/Composer";
import { FeedMoreMenu } from "@/components/features/feed/FeedMoreMenu";
import { PeopleRail } from "@/components/features/feed/PeopleRail";
import { FeedProfileAvatar } from "@/components/features/feed/FeedProfileAvatar";
import { Brand, BrandMark } from "@/components/brand/Brand";
import styles from "@/components/features/feed/feed.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home | getpidief" };
type View = FeedView | "discover";

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string; before?: string; beforeKind?: string; beforeAt?: string }> }) {
  const session = await auth(); const userId = session!.user!.id!;
  const params = await searchParams;
  const view: View = params.view === "saved" || params.view === "following" || params.view === "latest" ? params.view : params.before ? "latest" : "discover";
  const before = params.before && FEED_UUID.test(params.before) ? params.before : undefined;
  const beforeAt = params.beforeAt && validFeedTime(params.beforeAt) ? params.beforeAt : undefined;
  const [profile] = await db.select({ name: users.displayName, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, userId)).limit(1);
  const tabs: { view: View; label: string; href: string }[] = [{ view: "discover", label: "For you", href: "/" }, { view: "following", label: "Following", href: "/?view=following" }];
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
      <Suspense fallback={<div role="status" aria-label="Loading posts"><span className="sr-only">Loading posts…</span><PostSkeleton count={3} /></div>}>
        <HomePosts userId={userId} view={view} before={before} beforeKind={params.beforeKind} beforeAt={beforeAt} />
      </Suspense>

    </section>
    <aside className={styles.right} aria-label="Discover people and resources" tabIndex={0}>
      <form action="/search" className={styles.resourceSearch} role="search">
        <Search size={20} aria-hidden="true" />
        <label htmlFor="feed-resource-search" className="sr-only">Search resources</label>
        <input id="feed-resource-search" name="q" type="search" placeholder="Search resources" />
        <button type="submit" className="sr-only">Search</button>
      </form>
      <Suspense fallback={<div role="status" className="sr-only">Loading people…</div>}><HomePeople userId={userId} /></Suspense>
    </aside>
  </div></div>;
}

async function HomePosts({ userId, view, before, beforeKind, beforeAt }: { userId: string; view: View; before?: string; beforeKind?: string; beforeAt?: string }) {
  const candidates = view === "discover" ? arrangeDiscovery(await discoveryCandidates(userId), new Set()) : [];
  const page = view === "discover" ? candidates.length ? await readFeed(userId, "latest", undefined, undefined, undefined, candidates.slice(0, 20).map(item => ({ id: item.id, kind: "post" as const }))) : { items: [], hasMore: false } : await readFeed(userId, view, before, beforeKind, beforeAt);
  const byId = new Map(page.items.map(item => [item.id, item]));
  const visible = view === "discover" ? candidates.slice(0, 20).flatMap(item => { const post = byId.get(item.id); return post ? [post] : []; }) : page.items;
  return view === "discover" ? <DiscoveryStream key={`${userId}:discover`} userId={userId} now={new Date().toISOString()} seed={{ candidates, items: visible }} /> : visible.length === 0 ? <div className={styles.empty}><span className={styles.emptyIcon}><Sparkles size={22} aria-hidden="true" /></span><h2>{view === "saved" ? "Keep the good ideas close." : view === "following" ? "Your circle starts here." : "Every conversation starts somewhere."}</h2><p>{view === "saved" ? "When a post is worth coming back to, save it and you’ll find it here." : view === "following" ? "Posts from people you follow will show up here, newest first." : "Be the first to share a thought or ask a question. Someone else might be wondering the same thing."}</p>{view !== "latest" && <Link href="/">Explore posts</Link>}</div> : <FeedStream key={`${userId}:${view}:${before ?? ""}`} initial={page} userId={userId} view={view} now={new Date().toISOString()} />;
}

async function HomePeople({ userId }: { userId: string }) {
  const [following, suggestions] = await Promise.all([
    usersRepository.getFollowing(userId, { viewerId: userId, limit: 3 }),
    usersRepository.getFollowSuggestions(userId, 3),
  ]);
  return <PeopleRail initial={{ following: { total: following.total, following: following.following.map(({ id, username, displayName, avatarUrl }) => ({ id, username, displayName, avatarUrl })) }, suggestions: suggestions.rows.map(({ id, username, display_name, avatar_url }) => ({ id, username, display_name, avatar_url })) }} />;
}
