"use client";

import { useState } from "react";
import { ResourceCard, ResourceCardSkeleton } from "@/components/features/documents/ResourceCard";
import { cn } from "@/lib/utils/cn";
import type { SearchResult } from "@/lib/search/search";

interface SearchResultsProps {
  results: SearchResult[];
  total:   number;
  query:   string;
}

export function SearchResults({ results, total, query }: SearchResultsProps) {
  const [view, setView] = useState<"list" | "grid">("list");

  if (total === 0) {
    return <NoResults query={query} />;
  }

  // Map SearchResult to DocumentCard shape expected by ResourceCard
  const docs = results.map((r) => ({
    id:           r.id,
    slug:         r.slug,
    title:        r.title,
    description:  r.description,
    thumbnailUrl: r.thumbnailUrl,
    resourceType: r.resourceType,
    academicYear: r.academicYear,
    pageCount:    r.pageCount,
    downloadCount:r.downloadCount,
    likeCount:    r.likeCount,
    commentCount: r.commentCount,
    viewCount:    r.viewCount,
    publishedAt:  r.publishedAt,
    trendingScore:0,
    institution:  r.institutionId ? { id: r.institutionId, name: r.institutionName ?? "", logoUrl: null } : null,
    category:     r.categoryId    ? { id: r.categoryId,    name: r.categoryName    ?? "", color: "#2563EB" } : null,
    author: {
      id:                 r.authorId,
      username:           r.authorName,
      displayName:        r.authorName,
      avatarUrl:          r.authorAvatarUrl,
      verificationStatus: r.authorVerified ? "verified" : "unverified",
    },
    tags:         [],
    isBookmarked: false,
  }));

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => setView("list")}
          aria-label="List view"
          aria-pressed={view === "list"}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            view === "list"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          onClick={() => setView("grid")}
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            view === "grid"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </button>
      </div>

      {/* Results */}
      {view === "list" ? (
        <div className="space-y-3">
          {docs.map((doc) => (
            <ResourceCard key={doc.id} document={doc as any} variant="list" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <ResourceCard key={doc.id} document={doc as any} variant="grid" />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function SearchResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ResourceCardSkeleton key={i} variant="list" />
      ))}
    </div>
  );
}

// ── No results state ──────────────────────────────────────────────────────────

function NoResults({ query }: { query: string }) {
  return (
    <div className="text-center py-20 space-y-4">
      {/* Illustration */}
      <div className="mx-auto w-20 h-20 rounded-2xl bg-secondary border border-border
                      flex items-center justify-center">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-muted-foreground" aria-hidden>
          <circle cx="15" cy="15" r="11" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M24 24L32 32" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M11 15h8M15 11v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.4"/>
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="font-heading font-semibold text-foreground text-lg">
          No results found{query ? ` for "${query}"` : ""}.
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Try broader keywords, check your spelling, or remove some filters.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <a
          href="/search"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground
                     text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Clear all filters
        </a>
        <a
          href="/explore"
          className="px-4 py-2 rounded-xl bg-secondary border border-border
                     text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
        >
          Browse archive
        </a>
      </div>
    </div>
  );
}