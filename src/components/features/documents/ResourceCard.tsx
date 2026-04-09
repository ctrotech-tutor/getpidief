"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatDate, timeAgo } from "@/lib/utils/format";
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS } from "@/types/index";
import { useUIStore } from "@/stores/index";
import type { DocumentCard } from "@/lib/db/repositories/documents";

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE CARD — GRID VARIANT (default)
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
  if (variant === "compact") return <ResourceCardCompact doc={doc} className={className} />;
  return <ResourceCardGrid doc={doc} className={className} onBookmark={onBookmark} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRID CARD
// ─────────────────────────────────────────────────────────────────────────────

function ResourceCardGrid({
  doc,
  className,
  onBookmark,
}: {
  doc: DocumentCard;
  className?: string;
  onBookmark?: (id: string) => void;
}) {
  const setShareModal    = useUIStore((s) => s.setShareModalDocumentId);
  const [bookmarked, setBookmarked] = useState(doc.isBookmarked ?? false);
  const [isPending, startTransition] = useTransition();

  const typeColor = RESOURCE_TYPE_COLORS[doc.resourceType as keyof typeof RESOURCE_TYPE_COLORS] ?? "#6B7280";
  const typeLabel = RESOURCE_TYPE_LABELS[doc.resourceType as keyof typeof RESOURCE_TYPE_LABELS] ?? "Other";

  function handleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    setBookmarked((v) => !v); // optimistic
    startTransition(async () => {
      try {
        const res = await fetch("/api/bookmarks", {
          method:  bookmarked ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ documentId: doc.id }),
        });
        if (!res.ok) setBookmarked(bookmarked); // revert on error
        else onBookmark?.(doc.id);
      } catch {
        setBookmarked(bookmarked);
      }
    });
  }

  return (
    <Link
      href={`/d/${doc.slug}`}
      className={cn(
        "group flex flex-col bg-card border border-border rounded-xl overflow-hidden",
        "transition-all duration-200",
        "hover:-translate-y-1 hover:border-border/80 hover:shadow-lg hover:shadow-black/20",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
        {doc.thumbnailUrl ? (
          <Image
            src={doc.thumbnailUrl}
            alt={`Preview of ${doc.title}`}
            fill
            sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ThumbnailPlaceholder color={typeColor} resourceType={doc.resourceType} />
        )}

        {/* Page count badge */}
        {doc.pageCount && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md
                           bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium">
            {doc.pageCount}p
          </span>
        )}

        {/* Resource type badge */}
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full
                     text-[10px] font-semibold uppercase tracking-wide"
          style={{
            background: `${typeColor}22`,
            color:      typeColor,
            border:     `1px solid ${typeColor}44`,
          }}
        >
          {typeLabel}
        </span>

        {/* Hover quick-actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100
                          transition-opacity duration-200">
            <QuickActionButton
              label={bookmarked ? "Remove bookmark" : "Bookmark"}
              onClick={handleBookmark}
              active={bookmarked}
            >
              <BookmarkIcon filled={bookmarked} />
            </QuickActionButton>
            <QuickActionButton
              label="Share"
              onClick={(e) => { e.preventDefault(); setShareModal(doc.id); }}
            >
              <ShareIcon />
            </QuickActionButton>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3.5 gap-2">
        {/* Title */}
        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
          {doc.title}
        </h3>

        {/* Institution + Category */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {doc.institution && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {doc.institution.name}
            </span>
          )}
          {doc.category && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                background: `${doc.category.color}1a`,
                color:      doc.category.color,
              }}
            >
              {doc.category.name}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
          {/* Contributor */}
          <div className="flex items-center gap-1.5 min-w-0">
            <AuthorAvatar name={doc.author.displayName} size={20} />
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {doc.author.displayName}
            </span>
            {doc.author.verificationStatus === "verified" && (
              <VerifiedIcon />
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span>↓ {formatNumber(doc.downloadCount)}</span>
            <span>♥ {formatNumber(doc.likeCount)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST CARD (horizontal)
// ─────────────────────────────────────────────────────────────────────────────

function ResourceCardList({
  doc,
  className,
  onBookmark,
}: {
  doc: DocumentCard;
  className?: string;
  onBookmark?: (id: string) => void;
}) {
  const setShareModal = useUIStore((s) => s.setShareModalDocumentId);
  const [bookmarked, setBookmarked] = useState(doc.isBookmarked ?? false);
  const typeColor = RESOURCE_TYPE_COLORS[doc.resourceType as keyof typeof RESOURCE_TYPE_COLORS] ?? "#6B7280";
  const typeLabel = RESOURCE_TYPE_LABELS[doc.resourceType as keyof typeof RESOURCE_TYPE_LABELS] ?? "Other";

  return (
    <Link
      href={`/d/${doc.slug}`}
      className={cn(
        "group flex items-start gap-4 p-4 bg-card border border-border rounded-xl",
        "transition-all duration-200 hover:border-border/80 hover:bg-secondary/30",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-[72px] h-[96px] rounded-lg overflow-hidden bg-secondary shrink-0">
        {doc.thumbnailUrl ? (
          <Image src={doc.thumbnailUrl} alt="" fill className="object-cover" sizes="72px" />
        ) : (
          <ThumbnailPlaceholder color={typeColor} resourceType={doc.resourceType} compact />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Title + type badge */}
        <div className="flex items-start gap-2 justify-between">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug flex-1">
            {doc.title}
          </h3>
          <span
            className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44` }}
          >
            {typeLabel}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {doc.institution && (
            <span className="text-xs text-muted-foreground">{doc.institution.name}</span>
          )}
          {doc.category && (
            <span className="text-xs text-muted-foreground">· {doc.category.name}</span>
          )}
          {doc.academicYear && (
            <span className="text-xs text-muted-foreground">· {doc.academicYear}</span>
          )}
        </div>

        {/* Author + stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AuthorAvatar name={doc.author.displayName} size={18} />
            <span className="text-xs text-muted-foreground">{doc.author.displayName}</span>
            {doc.author.verificationStatus === "verified" && <VerifiedIcon />}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>↓ {formatNumber(doc.downloadCount)}</span>
            <span>♥ {formatNumber(doc.likeCount)}</span>
            {doc.commentCount > 0 && <span>💬 {formatNumber(doc.commentCount)}</span>}
            {doc.pageCount && <span>📄 {doc.pageCount}p</span>}
          </div>
        </div>
      </div>

      {/* Actions column */}
      <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <QuickActionButton
          label={bookmarked ? "Remove bookmark" : "Bookmark"}
          onClick={(e) => { e.preventDefault(); setBookmarked((v) => !v); }}
          active={bookmarked}
        >
          <BookmarkIcon filled={bookmarked} />
        </QuickActionButton>
        <QuickActionButton
          label="Share"
          onClick={(e) => { e.preventDefault(); setShareModal(doc.id); }}
        >
          <ShareIcon />
        </QuickActionButton>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT CARD (for carousels, related materials)
// ─────────────────────────────────────────────────────────────────────────────

function ResourceCardCompact({ doc, className }: { doc: DocumentCard; className?: string }) {
  const typeColor = RESOURCE_TYPE_COLORS[doc.resourceType as keyof typeof RESOURCE_TYPE_COLORS] ?? "#6B7280";

  return (
    <Link
      href={`/d/${doc.slug}`}
      className={cn(
        "group flex items-center gap-3 p-3 bg-card border border-border rounded-xl",
        "hover:bg-secondary/50 transition-colors duration-150 min-w-[200px]",
        className
      )}
    >
      <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-secondary shrink-0">
        {doc.thumbnailUrl ? (
          <Image src={doc.thumbnailUrl} alt="" fill className="object-cover" sizes="40px" />
        ) : (
          <ThumbnailPlaceholder color={typeColor} resourceType={doc.resourceType} compact />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{doc.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">↓ {formatNumber(doc.downloadCount)}</p>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD — exact-shape shimmer while loading
// ─────────────────────────────────────────────────────────────────────────────

export function ResourceCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
        <div className="skeleton w-[72px] h-[96px] rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
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

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function ThumbnailPlaceholder({
  color,
  resourceType,
  compact = false,
}: {
  color: string;
  resourceType: string;
  compact?: boolean;
}) {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `${color}12` }}
    >
      <svg
        width={compact ? 16 : 28}
        height={compact ? 20 : 36}
        viewBox="0 0 28 36"
        fill="none"
        aria-hidden
        style={{ color }}
      >
        <rect x="1" y="1" width="26" height="34" rx="3" stroke="currentColor" strokeWidth="1.5" strokeOpacity={0.5}/>
        <line x1="7" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity={0.4} strokeLinecap="round"/>
        <line x1="7" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity={0.4} strokeLinecap="round"/>
        <line x1="7" y1="20" x2="15" y2="20" stroke="currentColor" strokeWidth="1.5" strokeOpacity={0.4} strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function AuthorAvatar({ name, size }: { name: string; size: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div
      className="rounded-full bg-primary/20 flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      <span className="text-primary font-semibold leading-none">{initials}</span>
    </div>
  );
}

function VerifiedIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[var(--gold)] shrink-0" aria-label="Verified">
      <circle cx="5" cy="5" r="4.5" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth="0.8"/>
      <path d="M3 5l1.5 1.5L7 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function QuickActionButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label:    string;
  onClick:  (e: React.MouseEvent) => void;
  active?:  boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center",
        "bg-background/80 backdrop-blur-sm border border-border",
        "transition-all duration-150 hover:bg-background hover:border-ring/40",
        active && "text-primary border-primary/30 bg-primary/10"
      )}
    >
      {children}
    </button>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 2a1 1 0 011-1h6a1 1 0 011 1v9L6 8.5 2 11V2z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="9.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="9.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="2.5" cy="6"   r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 5.3L8 3.2M4 6.7l4 2.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}