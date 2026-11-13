import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { usersRepository } from "@/lib/db/repositories/users";
import { documentsRepository } from "@/lib/db/repositories/documents";
import { formatNumber, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import Image from "next/image";
import { ResourceCard } from "@/components/features/documents/ResourceCard";
import { FollowButton } from "@/components/features/profile/FollowButton";
import { ProfileActions } from "@/components/features/profile/ProfileActions";
import { ShareModal } from "@/components/features/documents/ShareModal";
import { ReportModal } from "@/components/features/documents/ReportModal";
import type { PublicProfile } from "@/lib/db/repositories/users";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ username: string }> }
type BadgeRow = Awaited<ReturnType<typeof usersRepository.getBadges>>[number];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const session = await auth();
  const profile = await usersRepository.getPublicProfile(username, session?.user?.id);
  if (!profile) return { title: "User not found" };
  return {
    title:       `${(profile as PublicProfile).displayName} (@${(profile as PublicProfile).username}) - getpidief`,
    description: (profile as PublicProfile).bio ?? `${(profile as PublicProfile).displayName} on getpidief`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const session = await auth();

  const profile = await usersRepository.getPublicProfile(username, session?.user?.id);

  if (!profile) notFound();
  
  const typedProfile = profile as PublicProfile;
  const badges = await usersRepository.getBadges(typedProfile.id).catch(() => [] as BadgeRow[]);

  // Fetch user's approved documents
  const { documents: docs } = await documentsRepository.getByAuthor(
    typedProfile.id,
    { status: "approved", page: 1, limit: 6, publicOnly: true }
  );

  const isOwnProfile = session?.user?.id === typedProfile.id;
  const initials = (typedProfile.displayName ?? "?").split(" ").slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "").join("");

  const levelLabel = (typedProfile.reputationLevel ?? "scholar").replace(/_/g, " ");

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
      <div className="flex gap-8 flex-col lg:flex-row">

        {/* ── Left column - profile card ────────────────────────────────── */}
        <aside className="lg:w-72 shrink-0 space-y-4">
          {/* Avatar + name */}
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
            {/* Cover strip */}
            {typedProfile.coverUrl && (
              <div className="absolute inset-x-0 top-0 h-24 rounded-t-2xl overflow-hidden">
                <Image
                  src={typedProfile.coverUrl}
                  alt={`${typedProfile.displayName} cover`}
                  fill
                  className="w-full h-full object-cover opacity-30"
                  unoptimized
                />
              </div>
            )}

            {/* Avatar */}
            <div className="relative z-10">
              {typedProfile.avatarUrl ? (
                <Image
                  src={typedProfile.avatarUrl}
                  alt={`${typedProfile.displayName} avatar`}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover border-4 border-background"
                  unoptimized
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted border-4 border-background flex items-center justify-center text-2xl font-bold">
                  {initials}
                </div>
              )}
            </div>

            {/* Name + verification */}
            <div className="space-y-1">
              <h1 className="font-heading font-bold text-foreground text-xl">{typedProfile.displayName}</h1>
              <p className="text-sm text-muted-foreground">@{typedProfile.username}</p>
              {typedProfile.verificationStatus === "verified" && (
                <span className="text-(--gold) text-xs font-medium">Verified Scholar</span>
              )}
            </div>

            {typedProfile.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed">{typedProfile.bio}</p>
            )}

            {/* Reputation */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                            bg-(--gold-subtle) border border-(--gold)/20">
              <span className="text-(--gold)"> Reputation: {formatNumber(typedProfile.reputationScore)}</span>
              <span className="text-xs text-muted-foreground capitalize">· {levelLabel}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
              {[
                { label: "Docs",       value: formatNumber(typedProfile.documentCount) },
                { label: "Followers",  value: formatNumber(typedProfile.followerCount) },
                { label: "Downloads",  value: formatNumber(typedProfile.totalDownloads) },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-base font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            {isOwnProfile ? (
              <Link
                href="/settings"
                className="w-full flex items-center justify-center py-2 rounded-xl
                           border border-border text-sm font-medium text-foreground
                           hover:bg-secondary transition-colors"
              >
                Edit Profile
              </Link>
            ) : (
              <FollowButton followingId={typedProfile.id} isFollowing={typedProfile.isFollowing ?? false} />
            )}

            {/* Profile Actions */}
            {!isOwnProfile && (
              <ProfileActions
                profileId={typedProfile.id}
                username={typedProfile.username}
                displayName={typedProfile.displayName}
                isFollowing={typedProfile.isFollowing ?? false}
                followerCount={typedProfile.followerCount || 0}
                documentCount={typedProfile.documentCount || 0}
              />
            )}
          </div>

          {/* Institution */}
          {typedProfile.institution && (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Institution</p>
              <p className="text-sm font-medium text-foreground">{typedProfile.institution?.name}</p>
              {typedProfile.faculty && (
                <p className="text-xs text-muted-foreground">{typedProfile.faculty}</p>
              )}
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Badges</p>
              <div className="flex flex-wrap gap-2">
                {badges.slice(0, 8).map((b: BadgeRow) => (
                  <div
                    key={b.badge.id}
                    title={b.badge.description}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: `${b.badge.color}18`,
                      color:       b.badge.color,
                      border:      `1px solid ${b.badge.color}30`,
                    }}
                  >
                    {b.badge.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External links */}
          {typedProfile.externalLinks && Object.values(typedProfile.externalLinks as Record<string, string | null>).some(Boolean) && (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Links</p>
              {Object.entries(typedProfile.externalLinks as Record<string, string>).map(([key, val]) =>
                val ? (
                  <a
                    key={key}
                    href={val}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 capitalize"
                  >
                    <span>Link {key}</span>
                  </a>
                ) : null
              )}
            </div>
          )}

          {/* Join date */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Joined</p>
            <p className="text-sm text-muted-foreground">
              Joined {formatDate(typedProfile.createdAt)}
            </p>
          </div>
        </aside>

        {/* ── Right column - documents ────────────────────────────────── */}
        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-foreground text-lg tracking-tight">
              Contributions
            </h2>
            <Link
              href={`/search?author=${typedProfile.id}`}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              View all →
            </Link>
          </div>

          {docs.length === 0 ? (
            <div className="text-center py-12 bg-secondary/30 rounded-2xl border border-border space-y-2">
              <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {docs.map((doc) => (
                <ResourceCard
                  key={doc.id}
                  document={doc}
                  variant="grid"
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <ShareModal />
      <ReportModal />
    </div>
  );
}