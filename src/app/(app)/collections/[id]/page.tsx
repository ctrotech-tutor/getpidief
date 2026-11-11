import { auth } from "@/lib/auth/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { bookmarkCollections, documentBookmarks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ResourceCard } from "@/components/features/documents/ResourceCard";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: PageProps) {
  const { id }  = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const collection = await db.query.bookmarkCollections.findFirst({
    where: eq(bookmarkCollections.id, id),
  });

  if (!collection) notFound();

  // Only owner can see private collections
  if (collection.visibility !== "public" && collection.userId !== session.user.id) {
    redirect("/dashboard/library");
  }

  const isOwner = collection.userId === session.user.id;

  const bookmarks = await db.query.documentBookmarks.findMany({
    where: and(
      eq(documentBookmarks.userId, collection.userId),
      eq(documentBookmarks.collectionId, id)
    ),
    orderBy: (bm, { desc }) => [desc(bm.createdAt)],
    limit: 50,
    with: {
      document: {
        with: {
          author:      { columns: { id: true, username: true, displayName: true, avatarUrl: true, verificationStatus: true } },
          institution: { columns: { id: true, name: true, logoUrl: true } },
          category:    { columns: { id: true, name: true, color: true } },
          documentTags:{ with: { tag: { columns: { id: true, name: true, slug: true } } } },
        },
      },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/library"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Back to Library"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{collection.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span>{bookmarks.length} document{bookmarks.length !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>{collection.visibility === "public" ? "🌐 Public" : "🔒 Private"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Documents */}
      {bookmarks.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary border border-border
                          flex items-center justify-center text-2xl">
            🔖
          </div>
          <p className="font-medium text-foreground">This collection is empty.</p>
          {isOwner && (
            <p className="text-sm text-muted-foreground">
              Browse the archive and save documents to this collection.
            </p>
          )}
          <Link
            href="/explore"
            className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            Browse Archive
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarks.map((bm) => {
            const doc = bm.document as any;
            return (
              <ResourceCard
                key={bm.id}
                document={{
                  ...doc,
                  isBookmarked: true,
                  tags: (doc.documentTags ?? []).map((dt: any) => dt.tag),
                  trendingScore: 0,
                }}
                variant="grid"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
