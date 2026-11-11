import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { documentBookmarks } from "@/lib/db/schema";
import { publicBookmarksFor } from "@/lib/db/public-bookmarks";
import { desc } from "drizzle-orm";
import { ResourceCard } from "@/components/features/documents/ResourceCard";
import type { DocumentCard } from "@/lib/db/repositories/documents";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const pageValue = params.page ?? "1";
  const page = /^[1-9]\d*$/.test(pageValue) && Number.isSafeInteger(Number(pageValue)) && Number(pageValue) <= 100000 ? Number(pageValue) : 1;
  const limit  = 12;
  const offset = (page - 1) * limit;

  const saved = await db.query.documentBookmarks.findMany({
    where: publicBookmarksFor(session.user.id),
    orderBy: [desc(documentBookmarks.createdAt), desc(documentBookmarks.id)],
    limit: limit + 1,
    offset,
    with: {
      document: {
        columns: { id: true, slug: true, title: true, description: true, thumbnailUrl: true,
          resourceType: true, academicYear: true, pageCount: true, downloadCount: true,
          likeCount: true, commentCount: true, viewCount: true, publishedAt: true,
          createdAt: true, status: true },
        with: {
          author:      { columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true } },
          institution: { columns: { id: true, name: true, logoUrl: true } },
          category:    { columns: { id: true, name: true, color: true } },
          documentTags:{ with: { tag: { columns: { id: true, name: true, slug: true } } } },
        },
      },
    },
  });

  const hasMore = saved.length > limit;
  const items   = saved.slice(0, limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-foreground text-xl tracking-tight">My Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length > 0 ? `${items.length}${hasMore ? "+" : ""} saved resource${items.length !== 1 ? "s" : ""}` : "Nothing saved yet"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-muted-foreground" aria-hidden>
              <path d="M5 3a2 2 0 012-2h14a2 2 0 012 2v22l-9-5-9 5V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-medium text-foreground">Your library is empty</p>
          <p className="text-sm text-muted-foreground">Bookmark documents to save them here.</p>
          <a href="/explore" className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
            Browse the archive
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((bm) => {
              const raw = bm.document;
              const { documentTags, ...rest } = raw;
              const tags = (documentTags ?? []).map((dt) => dt.tag);
              const doc: DocumentCard = {
                ...(rest as Omit<DocumentCard, "tags" | "isBookmarked" | "trendingScore">),
                tags,
                isBookmarked: true,
                trendingScore: 0,
              };
              return <ResourceCard key={bm.id} document={doc} variant="grid" />;
            })}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2">
            {page > 1 && (
              <a href={`/dashboard/library?page=${page - 1}`}
                 className="px-4 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground hover:bg-secondary/80">
                ← Previous
              </a>
            )}
            {hasMore && (
              <a href={`/dashboard/library?page=${page + 1}`}
                 className="px-4 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground hover:bg-secondary/80">
                Next →
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
