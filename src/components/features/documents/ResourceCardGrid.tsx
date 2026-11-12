"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS } from "@/types/index";
import { useUIStore } from "@/stores/index";
import { useBookmark } from "@/hooks/useBookmark";
import type { DocumentCard } from "@/lib/db/repositories/documents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookmarkSimple as Bookmark, ShareNetwork as Share2, Eye, DownloadSimple as Download, CalendarBlank as Calendar, FileText } from "@phosphor-icons/react";
import { motion } from "framer-motion";

interface ResourceCardGridProps {
  doc: DocumentCard;
  className?: string;
  onBookmark?: (id: string) => void;
}

export function ResourceCardGrid({
  doc,
  className,
  onBookmark,
}: ResourceCardGridProps) {
  const setShareModal = useUIStore((s) => s.setShareModalDocumentId);
  const { isBookmarked, toggle: toggleBookmark, isPending } = useBookmark({ 
    documentId: doc.id, 
    initialState: doc.isBookmarked 
  });

  const typeLabel = RESOURCE_TYPE_LABELS[doc.resourceType as keyof typeof RESOURCE_TYPE_LABELS];
  const typeColor = RESOURCE_TYPE_COLORS[doc.resourceType as keyof typeof RESOURCE_TYPE_COLORS];

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;
    
    toggleBookmark();
    onBookmark?.(doc.id);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className={cn(
        "group overflow-hidden border-border/50 bg-background",
        "transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        className
      )}>
        <Link href={`/d/${doc.slug}`} className="block">
          {/* Thumbnail */}
          <div className="relative aspect-4/3 bg-secondary overflow-hidden">
            {doc.thumbnailUrl ? (
              <Image
                src={doc.thumbnailUrl}
                alt={`Preview of ${doc.title}`}
                fill
                sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <ThumbnailPlaceholder color={typeColor} resourceType={doc.resourceType} />
            )}

            {/* Page count badge */}
            {doc.pageCount && (
              <Badge 
                variant="secondary" 
                className="absolute top-2 right-2 bg-black/60 text-white border-0 text-xs"
              >
                {doc.pageCount}p
              </Badge>
            )}

            {/* Resource type badge */}
            <Badge
              variant="outline"
              className="absolute top-2 left-2 bg-background text-xs font-semibold uppercase tracking-wide"
              style={{
                borderColor: typeColor,
                color: typeColor,
              }}
            >
              {typeLabel}
            </Badge>

            {/* Hover quick-actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-background"
                  onClick={handleBookmark}
                >
                  <Bookmark className={cn("h-4 w-4", isBookmarked ? "fill-current" : "")} />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-background"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareModal(doc.id); }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <CardContent className="p-4">
            {/* Title */}
            <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-2">
              {doc.title}
            </h3>

            {/* Institution + Category */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {doc.institution && (
                <Badge variant="outline" className="text-xs">
                  {doc.institution.name}
                </Badge>
              )}
              {doc.category && (
                <Badge variant="secondary" className="text-xs">
                  {doc.category.name}
                </Badge>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatNumber(doc.viewCount)}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {formatNumber(doc.downloadCount)}
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(doc.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Link>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THUMBNAIL PLACEHOLDER
// ─────────────────────────────────────────────────────────────────────────────

function ThumbnailPlaceholder({ color, resourceType }: { color: string; resourceType: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
      <div className="text-center">
        <div 
          className="w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <FileText className="w-6 h-6" style={{ color }} />
        </div>
        <p className="text-xs text-muted-foreground">{resourceType}</p>
      </div>
    </div>
  );
}
