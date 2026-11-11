import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { usersRepository } from "@/lib/db/repositories/users";
import Link from "next/link";
import Image from "next/image";
import { FollowButton } from "@/components/features/profile/FollowButton";
import { formatNumber } from "@/lib/utils/format";

type FollowingUser = Awaited<
  ReturnType<typeof usersRepository.getFollowing>
>["following"][number] & {
  display_name?: string;
  avatar_url?: string;
  document_count?: number;
  follower_count?: number;
};

export const dynamic = "force-dynamic";

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const tab    = params.tab === "followers" ? "followers" : "following";
  const pageValue = params.page ?? "1";
  const page = /^[1-9]\d*$/.test(pageValue) && Number.isSafeInteger(Number(pageValue)) && Number(pageValue) <= 100000 ? Number(pageValue) : 1;

  const [followingData, followersData] = await Promise.all([
    usersRepository.getFollowing(session.user.id, { page, limit: 20 }),
    usersRepository.getFollowers(session.user.id, { page, limit: 20 }),
  ]);

  const data   = tab === "followers" ? followersData.followers : followingData.following;
  const totals = { following: followingData.total, followers: followersData.total };

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-foreground text-xl tracking-tight">Social</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["following", "followers"] as const).map((t) => (
          <Link
            key={t}
            href={`/dashboard/following?tab=${t}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}{" "}
            <span className="text-xs ml-1">({formatNumber(totals[t])})</span>
          </Link>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-muted-foreground text-sm">
            {tab === "following"
              ? "You're not following anyone yet."
              : "No followers yet."}
          </p>
          {tab === "following" && (
            <Link href="/explore" className="text-xs text-primary hover:underline">
              Discover contributors →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.map((u: FollowingUser) => {
            const initials = (u.display_name ?? u.displayName ?? "?")
              .split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("");
            const name  = u.display_name ?? u.displayName;
            const uname = u.username;

            return (
              <div key={u.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {u.avatar_url ?? u.avatarUrl ? (
                    <Image
                      src={u.avatar_url ?? u.avatarUrl ?? ""}
                      alt={`${name} avatar`}
                      width={40}
                      height={40}
                      className="w-full h-full rounded-full object-cover"
                      unoptimized
                    />
                  ) : initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/u/${uname}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(u.document_count ?? u.documentCount ?? 0)} docs
                    {" · "}
                    {formatNumber(u.follower_count ?? u.followerCount ?? 0)} followers
                  </p>
                </div>

                {tab === "following" && (
                  <div className="min-w-24"><FollowButton followingId={u.id} isFollowing /></div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <nav className="flex gap-3 justify-center" aria-label="People pages">
        {page > 1 && <Link href={`/dashboard/following?tab=${tab}&page=${page - 1}`} className="text-sm underline">Previous</Link>}
        {page < (tab === "followers" ? followersData.totalPages : followingData.totalPages) && <Link href={`/dashboard/following?tab=${tab}&page=${page + 1}`} className="text-sm underline">Next</Link>}
      </nav>
    </div>
  );
}
