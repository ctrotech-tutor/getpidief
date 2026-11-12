import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { isPrivatePdfReference } from "@/lib/storage/private-pdf";
import { auth } from "@/lib/auth/auth";
import { documentsRepository } from "@/lib/db/repositories/documents";
import { CommentStream } from "@/components/features/comments/CommentStream";
import { WorkstationActions } from "@/components/features/documents/WorkstationActions";
import { RelatedMaterials } from "@/components/features/documents/RelatedMaterials";
import { PDFViewerWrapper } from "@/components/features/pdf/PDFViewerWrapper";
import { ShareModal } from "@/components/features/documents/ShareModal";
import { ReportModal } from "@/components/features/documents/ReportModal";
import { formatNumber, formatFileSize, formatDate } from "@/lib/utils/format";
import { RESOURCE_TYPE_LABELS } from "@/types/index";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Dynamic OG image per document
export async function generateMetadata(
  { params }: PageProps,
  // Parent metadata merge - reserved by Next.js API
  _parent: ResolvingMetadata
): Promise<Metadata> {
  void _parent;
  const { slug } = await params;
  const doc      = await documentsRepository.getBySlug(slug);

  if (!doc) return { title: "Document not found" };

  return {
    title:       `${doc.title} - getpidief`,
    description: doc.description ?? `${doc.title} - ${doc.institution?.name ?? ""}`,
    openGraph: {
      title:  doc.title,
      description: doc.description ?? undefined,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(doc.title)}&institution=${encodeURIComponent(doc.institution?.name ?? "")}&category=${encodeURIComponent(doc.category?.name ?? "")}&type=${encodeURIComponent(doc.resourceType)}`,
          width:  1200,
          height: 630,
        },
      ],
    },
  };
}

// This page includes the current user's bookmark and reaction state.
export const dynamic = "force-dynamic";

export default async function DocumentWorkspacePage({ params }: PageProps) {
  const { slug } = await params;

  const session = await auth();
  const userId  = session?.user?.id;

  const doc = await documentsRepository.getBySlug(slug, userId);
  if (!doc || doc.status !== "approved") notFound();

  const typeLabel = RESOURCE_TYPE_LABELS[doc.resourceType as keyof typeof RESOURCE_TYPE_LABELS] ?? "Document";

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col">
      {/* ── Workstation top bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background shrink-0">
        <Link
          href="/search"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Archive
        </Link>

        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground/40 shrink-0" aria-hidden>
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

        {doc.category && (
          <>
            <Link
              href={`/search?category=${doc.categoryId}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-30"
            >
              {doc.category.name}
            </Link>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground/40 shrink-0" aria-hidden>
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </>
        )}

        <span className="text-sm text-foreground font-medium truncate flex-1 min-w-0">
          {doc.title}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {doc.allowDownload && (
            <a
              href={`/api/documents/${doc.id}/download`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground
                         text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
              aria-label="Download document"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M6 1v7M3 5.5L6 9l3-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Download
            </a>
          )}
        </div>
      </div>

      {/* ── Split panels ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT - PDF Viewer */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Suspense fallback={<PDFLoadingPlaceholder />}>
            <PDFViewerWrapper
              documentId={doc.id}
              fileUrl={isPrivatePdfReference(doc.fileUrl) ? `/api/documents/${doc.id}/file` : doc.fileUrl}
              title={doc.title}
              className="h-full"
            />
          </Suspense>
        </div>

        {/* RIGHT - Metadata + Interactions */}
        <aside className="w-95 shrink-0 border-l border-border overflow-y-auto bg-background">
          <div className="p-5 space-y-6">
            {/* Title + badges */}
            <div className="space-y-3">
              <h1 className="font-heading font-bold text-foreground text-xl tracking-tight leading-snug">
                {doc.title}
              </h1>

              <div className="flex items-center gap-2 flex-wrap">
                {doc.institution && (
                  <Link
                    href={`/search?institution=${doc.institutionId}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {doc.institution.name}
                  </Link>
                )}
                {doc.category && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: `${doc.category.color}1a`,
                      color:      doc.category.color,
                    }}
                  >
                    {doc.category.name}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                  {typeLabel}
                </span>
                {doc.academicYear && (
                  <span className="text-xs text-muted-foreground">{doc.academicYear}</span>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Downloads", value: formatNumber(doc.downloadCount) },
                { label: "Likes",     value: formatNumber(doc.likeCount) },
                { label: "Pages",     value: doc.pageCount ? String(doc.pageCount) : "—" },
                { label: "Comments",  value: formatNumber(doc.commentCount) },
              ].map((stat) => (
                <div key={stat.label} className="bg-secondary rounded-xl p-2.5 text-center">
                  <p className="text-base font-semibold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <WorkstationActions
              documentId={doc.id}
              initialLikeCount={doc.likeCount}
              initialDislikeCount={doc.dislikeCount}
              initialBookmarked={doc.isBookmarked ?? false}
              userReaction={doc.userReaction}
            />

            {/* Description */}
            {doc.description && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  About this resource
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{doc.description}</p>
              </div>
            )}

            {/* Metadata grid */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Details
              </p>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Uploaded",     value: formatDate(doc.publishedAt ?? doc.createdAt) },
                  { label: "Language",     value: doc.language.toUpperCase() },
                  { label: "License",      value: doc.license.replace(/_/g, " ") },
                  { label: "File size",    value: doc.fileSize ? formatFileSize(doc.fileSize) : "—" },
                  ...(doc.allowDownload ? [] : [{ label: "Download", value: "Not allowed" }]),
                ].map((item) => (
                  <div key={item.label} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {doc.documentTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {doc.documentTags.map((dt) => (
                    <Link
                      key={dt.tag.id}
                      href={`/search?q=${encodeURIComponent(dt.tag.name)}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border
                                 text-muted-foreground hover:border-ring/40 hover:text-foreground transition-colors"
                    >
                      {dt.tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contributor card */}
            <ContributorCard author={doc.author} />

            {/* Comments */}
            <div className="border-t border-border pt-5">
              <CommentStream documentId={doc.id} initialCount={doc.commentCount} />
            </div>

            {/* Related materials */}
            <div className="border-t border-border pt-5">
              <Suspense fallback={null}>
                <RelatedMaterials documentId={doc.id} categoryId={doc.categoryId} />
              </Suspense>
            </div>
          </div>
        </aside>
      </div>

      {/* Global Modals */}
      <ShareModal />
      <ReportModal />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type ContributorAuthor = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verificationStatus: string;
  reputationScore?: number;
};

function ContributorCard({ author }: { author: ContributorAuthor }) {
  const initials = (author.displayName ?? "?").split(" ").slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="bg-secondary rounded-xl p-4 space-y-3">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Contributed by
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          {author.avatarUrl ? (
            <Image
              src={author.avatarUrl}
              alt={`${author.displayName} avatar`}
              width={40}
              height={40}
              className="w-full h-full rounded-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-sm font-bold text-primary">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/u/${author.username}`}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {author.displayName}
          </Link>
          {author.verificationStatus === "verified" && (
            <span className="ml-1.5 text-[10px] text-(--gold) font-medium">✓ Verified</span>
          )}
          <p className="text-xs text-muted-foreground">
            Reputation: {author.reputationScore ?? 0}
          </p>
        </div>
        <Link
          href={`/u/${author.username}`}
          className="text-xs text-primary hover:text-primary/80 transition-colors shrink-0"
        >
          View Profile →
        </Link>
      </div>
    </div>
  );
}

function PDFLoadingPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center bg-[#080d1c]">
      <div className="flex flex-col items-center gap-3 text-white/30">
        <svg className="animate-spin w-10 h-10" viewBox="0 0 32 32" fill="none" aria-hidden>
          <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
          <path d="M16 4a12 12 0 0112 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <p className="text-sm">Loading document…</p>
      </div>
    </div>
  );
}
