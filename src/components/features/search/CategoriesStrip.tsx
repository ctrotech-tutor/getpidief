"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Category {
  id:           string;
  name:         string;
  slug:         string;
  color:        string;
  icon?:        string | null;
  documentCount:number;
  isFeatured:   boolean;
}

interface CategoriesStripProps {
  categories:      Category[];
  selectedCategory?:string;
  onSelect?:       (categoryId: string | null) => void;
  className?:      string;
}

export function CategoriesStrip({
  categories,
  selectedCategory,
  onSelect,
  className,
}: CategoriesStripProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const activeCat    = selectedCategory ?? searchParams.get("category") ?? null;

  function handleSelect(categoryId: string | null) {
    if (onSelect) {
      onSelect(categoryId);
      return;
    }
    // URL-driven: update search params
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) params.set("category", categoryId);
    else params.delete("category");
    router.push(`/search?${params.toString()}`);
  }

  const featured = categories.filter((c) => c.isFeatured || c.documentCount > 0).slice(0, 12);

  return (
    <div className={cn("relative", className)}>
      {/* Scrollable row */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1
                   scrollbar-none [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Filter by category"
      >
        {/* All chip */}
        <CategoryChip
          label="All"
          color="#2563EB"
          isActive={!activeCat}
          count={categories.reduce((s, c) => s + c.documentCount, 0)}
          onSelect={() => handleSelect(null)}
        />

        {featured.map((cat) => (
          <CategoryChip
            key={cat.id}
            label={cat.name}
            color={cat.color}
            isActive={activeCat === cat.id}
            count={cat.documentCount}
            onSelect={() => handleSelect(cat.id)}
          />
        ))}
      </div>

      {/* Right fade gradient */}
      <div
        className="absolute right-0 top-0 bottom-1 w-8 pointer-events-none
                   bg-linear-to-l from-background to-transparent"
        aria-hidden
      />
    </div>
  );
}

function CategoryChip({
  label,
  color,
  isActive,
  count,
  onSelect,
}: {
  label:    string;
  color:    string;
  isActive: boolean;
  count:    number;
  onSelect: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Badge
        variant={isActive ? "default" : "secondary"}
        className={cn(
          "cursor-pointer px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200",
          "hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isActive 
            ? "text-white border-0 shadow-lg" 
            : "bg-background border-border/50 hover:bg-background hover:border-primary/30"
        )}
        style={isActive ? { backgroundColor: color } : undefined}
        onClick={onSelect}
        role="option"
        aria-selected={isActive}
      >
        {label}
        {count > 0 && (
          <span className="ml-1.5 text-xs opacity-75">
            ({new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 0 }).format(count)})
          </span>
        )}
      </Badge>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function CategoriesStripSkeleton() {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      {[80, 120, 90, 110, 70, 100, 85].map((w, i) => (
        <div key={i} className="skeleton h-8 rounded-full shrink-0" style={{ width: w }} />
      ))}
    </div>
  );
}