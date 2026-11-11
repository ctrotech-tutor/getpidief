"use client";

import type { DocumentCard } from "@/lib/db/repositories/documents";
import { ResourceCardGrid } from "./ResourceCardGrid";
import { ResourceCardList } from "./ResourceCardList";

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE CARD — MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface ResourceCardProps {
  document:    DocumentCard;
  variant?:    "grid" | "list" | "compact";
  className?:  string;
  onBookmark?: (id: string) => void;
}

export function ResourceCard({
  document: doc,
  variant = "grid",
  className,
  onBookmark,
}: ResourceCardProps) {
  if (variant === "list")    return <ResourceCardList    doc={doc} className={className} onBookmark={onBookmark} />;
  // Note: compact variant can be added later
  return <ResourceCardGrid doc={doc} className={className} onBookmark={onBookmark} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD — exact-shape shimmer while loading
// ─────────────────────────────────────────────────────────────────────────────

export function ResourceCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
        <div className="w-18 h-24 bg-secondary rounded-lg animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-secondary rounded animate-pulse w-3/4" />
          <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
          <div className="flex gap-2">
            <div className="h-6 bg-secondary rounded-full animate-pulse w-16" />
            <div className="h-6 bg-secondary rounded-full animate-pulse w-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden">
      <div className="skeleton aspect-[4/3]" />
      <div className="p-3.5 space-y-2">
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="flex justify-between mt-3 pt-2 border-t border-border">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}
