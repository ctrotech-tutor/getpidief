"use client";

import { useAtom } from "jotai";
import { currentPageAtom, totalPagesAtom } from "@/stores/pdfViewerStore";
import { cn } from "@/lib/utils/cn";

interface PDFThumbnailStripProps {
  className?: string;
}

export function PDFThumbnailStrip({ className }: PDFThumbnailStripProps) {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const [totalPages] = useAtom(totalPagesAtom);

  return (
    <div className={cn(
      "w-30 shrink-0 bg-[#06091a] border-r border-white/5 overflow-y-auto py-2 px-1.5 flex flex-col gap-2",
      className
    )}>
      {totalPages > 0 && Array.from({ length: Math.min(totalPages, 50) }, (_, i) => (
        <button
          key={i + 1}
          onClick={() => setCurrentPage(i + 1)}
          className={cn(
            "relative rounded-md overflow-hidden border transition-all",
            currentPage === i + 1
              ? "border-primary shadow-[0_0_0_2px] shadow-primary/30"
              : "border-white/10 hover:border-white/25"
          )}
          aria-label={`Go to page ${i + 1}`}
        >
          <div className="h-32.5 bg-white/4 flex items-center justify-center text-white/35 text-xs font-mono">
            Page {i + 1}
          </div>
          <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-white/50">
            {i + 1}
          </span>
        </button>
      ))}
    </div>
  );
}
