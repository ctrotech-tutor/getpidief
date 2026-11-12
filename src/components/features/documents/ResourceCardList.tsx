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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { BookmarkSimple as Bookmark, ShareNetwork as Share2, Eye, DownloadSimple as Download, CalendarBlank as Calendar, User, FileText } from "@phosphor-icons/react";
import { motion } from "framer-motion";

interface ResourceCardListProps {
  doc: DocumentCard;
  className?: string;
  onBookmark?: (id: string) => void;
}

export function ResourceCardList({
  doc,
  className,
  onBookmark,
}: ResourceCardListProps) {
  const setShareModal = useUIStore((s) => s.setShareModalDocumentId);
  const { isBookmarked, toggle: toggleBookmark, isPending } = useBookmark({ 
    documentId: doc.id, 
    initialState: doc.isBookmarked 
  });

  const typeLabel = RESOURCE_TYPE_LABELS[doc.resourceType as keyof typeof RESOURCE_TYPE_LABELS];
  const typeColor = RESOURCE_TYPE_COLORS[doc.resourceType as keyof typeof RESOURCE_TYPE_COLORS];
  const authorName = doc?.author?.displayName ?? "Anonymous";

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;
    
    toggleBookmark();
    onBookmark?.(doc.id);
  };

  return (
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className={cn(
        "group overflow-hidden border-border/50 bg-background",
        "transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 py-0",
        className
      )}>
        <Link href={`/d/${doc.slug}`} className="block">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="relative w-18 h-24 bg-secondary rounded-lg overflow-hidden shrink-0">
                {doc.thumbnailUrl ? (
                  <Image
                    src={doc.thumbnailUrl}
                    alt={`Preview of ${doc.title}`}
                    fill
                    sizes="72px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <ThumbnailPlaceholder color={typeColor} resourceType={doc.resourceType} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Title */}
                <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                  {doc.title}
                </h3>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{
                      borderColor: typeColor,
                      color: typeColor,
                    }}
                  >
                    {typeLabel}
                  </Badge>
                  {doc.pageCount && (
                    <span>{doc.pageCount} pages</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatNumber(doc.viewCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {formatNumber(doc.downloadCount)}
                  </span>
                </div>

                {/* Institution + Category */}
                <div className="flex items-center gap-2">
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

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  {/* Contributor */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {authorName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate">
                      {authorName}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={handleBookmark}
                    >
                      <Bookmark className={cn("h-3 w-3", isBookmarked ? "fill-current" : "")} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareModal(doc.id); }}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
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
          className="w-8 h-8 mx-auto rounded flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <FileText className="w-4 h-4" style={{ color }} />
        </div>
      </div>
    </div>
  );
}
