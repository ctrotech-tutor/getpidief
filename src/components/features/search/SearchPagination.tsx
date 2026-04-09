"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface SearchPaginationProps {
  currentPage: number;
  totalPages:  number;
  total:       number;
  limit:       number;
}

export function SearchPagination({
  currentPage,
  totalPages,
  total,
  limit,
}: SearchPaginationProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`/search?${params.toString()}`);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router, searchParams]
  );

  // Build page number array with ellipsis
  const pages = buildPageArray(currentPage, totalPages);

  const start = (currentPage - 1) * limit + 1;
  const end   = Math.min(currentPage * limit, total);

  return (
    <nav
      aria-label="Search results pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border"
    >
      {/* Count */}
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{start.toLocaleString()}–{end.toLocaleString()}</span>
        {" "}of{" "}
        <span className="font-medium text-foreground">{total.toLocaleString()}</span>
        {" "}results
      </p>

      {/* Pages */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            currentPage <= 1
              ? "text-muted-foreground cursor-not-allowed opacity-40"
              : "text-foreground hover:bg-secondary border border-border"
          )}
          aria-label="Previous page"
        >
          ← Prev
        </button>

        {/* Page pills */}
        {pages.map((page, idx) =>
          page === "…" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => goToPage(page as number)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
              className={cn(
                "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary border border-border"
              )}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            currentPage >= totalPages
              ? "text-muted-foreground cursor-not-allowed opacity-40"
              : "text-foreground hover:bg-secondary border border-border"
          )}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </nav>
  );
}

/** Build page array with ellipsis logic: [1, …, 4, 5, 6, …, 20] */
function buildPageArray(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];

  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("…");

  pages.push(total);

  return pages;
}