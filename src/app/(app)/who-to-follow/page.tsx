import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { auth } from "@/lib/auth/auth";
import { usersRepository } from "@/lib/db/repositories/users";
import { FeedProfileAvatar } from "@/components/features/feed/FeedProfileAvatar";
import { FollowSuggestion } from "@/components/features/feed/FollowSuggestion";
import styles from "@/components/features/feed/feed.module.css";
import pageStyles from "./who-to-follow.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Who to follow | getpidief" };
const pageSize = 24;

export default async function WhoToFollowPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const params = await searchParams;
  const rawPage = params.page ?? "1";
  const page = /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) && Number(rawPage) <= 100000 ? Number(rawPage) : 1;
  const result = await usersRepository.getFollowSuggestions(session.user.id, pageSize + 1, (page - 1) * pageSize);
  const accounts = result.rows.slice(0, pageSize);
  const hasMore = page < 100000 && result.rows.length > pageSize;
  return <main className={pageStyles.page}>
    <Link href="/" className={pageStyles.back}><ArrowLeft size={17} aria-hidden="true" /> Back to feed</Link>
    <h1>Who to follow</h1>
    <p className={pageStyles.intro}>Discover people in the community.</p>
    {accounts.length ? <ul className={pageStyles.list}>{accounts.map(account => <li className={`${styles.suggestionRow} ${pageStyles.row}`} key={account.id}>
      <Link className={styles.followingItem} href={`/u/${account.username}`}>
        <FeedProfileAvatar name={account.display_name} avatarUrl={account.avatar_url} post />
        <span className={styles.followingDetails}><strong>{account.display_name}</strong><small>@{account.username}</small></span>
      </Link>
      <FollowSuggestion id={account.id} name={account.display_name} />
    </li>)}</ul> : <p className={pageStyles.empty}>{page === 1 ? "No suggestions right now." : "No more suggestions on this page."}</p>}
    {(page > 1 || hasMore) && <nav className={pageStyles.pagination} aria-label="Suggestion pages">
      {page > 1 && <Link href={page === 2 ? "/who-to-follow" : `/who-to-follow?page=${page - 1}`}>Previous</Link>}
      <span>Page {page}</span>
      {hasMore && <Link href={`/who-to-follow?page=${page + 1}`}>Next</Link>}
    </nav>}
  </main>;
}
