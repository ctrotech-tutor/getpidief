import { FEED_UUID, validFeedTime } from "@/lib/feed/cursor";
import { readFeed, type FeedView } from "@/lib/feed/read";
import { FeedStream } from "@/components/features/feed/FeedStream";
import Link from "next/link";
import { BookOpen, Compass, House as HomeIcon, MagnifyingGlass as Search, BookOpenText as Sparkles, Bell, GearSix, SquaresFour, UploadSimple, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { usersRepository } from "@/lib/db/repositories/users";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Composer } from "@/components/features/feed/Composer";
import { FeedMoreMenu } from "@/components/features/feed/FeedMoreMenu";
import { FollowSuggestion } from "@/components/features/feed/FollowSuggestion";
import { FeedProfileAvatar } from "@/components/features/feed/FeedProfileAvatar";
import { Brand, BrandMark } from "@/components/brand/Brand";
import styles from "@/components/features/feed/feed.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home | getpidief" };
type View = FeedView;

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string; before?: string; beforeKind?: string; beforeAt?: string }> }) {
  const session = await auth(); const userId = session!.user!.id!;
  const params = await searchParams;
  const view: View = params.view === "saved" || params.view === "following" ? params.view : "latest";
  const before = params.before && FEED_UUID.test(params.before) ? params.before : undefined;
  const beforeAt = params.beforeAt && validFeedTime(params.beforeAt) ? params.beforeAt : undefined;
  const [profile] = await db.select({ name: users.displayName, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, userId)).limit(1);
  const following = await usersRepository.getFollowing(userId, { viewerId: userId, limit: 3 });
  const suggestions = await usersRepository.getFollowSuggestions(userId, 3);
  const page = await readFeed(userId, view, before, params.beforeKind, beforeAt);
  const visible = page.items;
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
      {visible.length === 0 ? <div className={styles.empty}><span className={styles.emptyIcon}><Sparkles size={22} aria-hidden="true" /></span><h2>{view === "saved" ? "Keep the good ideas close." : view === "following" ? "Your circle starts here." : "Every conversation starts somewhere."}</h2><p>{view === "saved" ? "When a post is worth coming back to, save it and you’ll find it here." : view === "following" ? "Posts from people you follow will show up here, newest first." : "Be the first to share a thought or ask a question. Someone else might be wondering the same thing."}</p>{view !== "latest" && <Link href="/">See the latest posts</Link>}</div> : <FeedStream key={`${userId}:${view}:${before ?? ""}`} initial={page} userId={userId} view={view} now={new Date().toISOString()} />}

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
