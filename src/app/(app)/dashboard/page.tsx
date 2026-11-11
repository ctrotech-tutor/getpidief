import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { users, documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatNumber } from "@/lib/utils/format";
import type { SessionUser } from "@/hooks/useSession";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const user = session.user as SessionUser;

  // Fetch user stats
  const profile = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      documentCount:   true,
      totalDownloads:  true,
      totalLikes:      true,
      followerCount:   true,
      reputationScore: true,
      reputationLevel: true,
    },
  });

  // Recent uploads
  const recentUploads = await db.query.documents.findMany({
    where: eq(documents.authorId, userId),
    orderBy: [desc(documents.createdAt)],
    limit: 3,
    columns: {
      id: true, slug: true, title: true,
      status: true, downloadCount: true, likeCount: true, createdAt: true,
    },
  });

  const stats = [
    { label: "Documents",   value: formatNumber(profile?.documentCount  ?? 0), href: "/dashboard/uploads" },
    { label: "Downloads",   value: formatNumber(profile?.totalDownloads ?? 0), href: null },
    { label: "Likes",       value: formatNumber(profile?.totalLikes     ?? 0), href: null },
    { label: "Followers",   value: formatNumber(profile?.followerCount  ?? 0), href: "/dashboard/following" },
  ];

  const STATUS_BADGE: Record<string, { label: string; color: string }> = {
    approved: { label: "Live",    color: "text-[var(--emerald)] bg-[var(--emerald-subtle)]" },
    pending:  { label: "Pending", color: "text-[var(--amber)]   bg-[var(--amber-subtle)]"   },
    rejected: { label: "Rejected",color: "text-destructive bg-destructive/10"                },
    draft:    { label: "Draft",   color: "text-muted-foreground bg-secondary"                },
  };

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">
          Welcome back, {user.displayName?.split(" ")[0] ?? "Scholar"}.
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s what&apos;s happening with your archive.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-secondary rounded-2xl p-4 space-y-1"
          >
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            {stat.href && (
              <Link href={stat.href} className="text-[10px] text-primary hover:underline">
                View all →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-heading font-semibold text-foreground text-base mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: "/dashboard/uploads", label: "Upload Document",  desc: "Add a new resource",      emoji: "📄" },
            { href: "/dashboard/library", label: "My Library",        desc: "View saved resources",    emoji: "🔖" },
            { href: "/explore",            label: "Explore Archive",   desc: "Discover new materials",  emoji: "🔍" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-start gap-3 p-4 bg-card border border-border rounded-2xl
                         hover:border-ring/40 hover:bg-secondary/50 transition-all duration-150"
            >
              <span className="text-xl">{action.emoji}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent uploads */}
      {recentUploads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-foreground text-base">Recent Uploads</h2>
            <Link href="/dashboard/uploads" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              See all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentUploads.map((doc) => {
              const badge = STATUS_BADGE[doc.status] ?? STATUS_BADGE.draft!;
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={doc.status === "approved" ? `/d/${doc.slug}` : `/dashboard/uploads`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {doc.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      ↓ {doc.downloadCount} · ♥ {doc.likeCount}
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}