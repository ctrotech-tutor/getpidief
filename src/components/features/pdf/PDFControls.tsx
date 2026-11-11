"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import {
  currentPageAtom, totalPagesAtom, zoomLevelAtom, isFullscreenAtom,
  thumbnailStripOpenAtom, canGoNextAtom, canGoPrevAtom, fitModeAtom,
} from "@/stores/pdfViewerStore";
import { cn } from "@/lib/utils/cn";

interface PDFControlsProps {
  className?: string;
  fileUrl?: string;
  documentTitle?: string;
}

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const VIEW_MODES = ["single", "continuous", "fit"] as const;

export function PDFControls({ className, fileUrl, documentTitle }: PDFControlsProps) {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const [totalPages] = useAtom(totalPagesAtom);
  const [zoom, setZoom] = useAtom(zoomLevelAtom);
  const [isFullscreen, setIsFullscreen] = useAtom(isFullscreenAtom);
  const [thumbOpen, setThumbOpen] = useAtom(thumbnailStripOpenAtom);
  const [canGoNext] = useAtom(canGoNextAtom);
  const [canGoPrev] = useAtom(canGoPrevAtom);
  const [fitMode, setFitMode] = useAtom(fitModeAtom);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [showZoomPresets, setShowZoomPresets] = useState(false);
  const [showPageJump, setShowPageJump] = useState(false);
  const [jumpPage, setJumpPage] = useState("");
  const [viewMode, setViewMode] = useState<"single" | "continuous" | "fit">("single");
  
  // Refs for click outside handling
  const pageJumpRef = useRef<HTMLDivElement>(null);
  const zoomPresetsRef = useRef<HTMLDivElement>(null);

  // Sync page input with current page
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pageJumpRef.current && !pageJumpRef.current.contains(event.target as Node)) {
        setShowPageJump(false);
      }
      if (zoomPresetsRef.current && !zoomPresetsRef.current.contains(event.target as Node)) {
        setShowZoomPresets(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enhanced page navigation
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [setCurrentPage, totalPages]);

  const handlePageJump = useCallback(() => {
    const page = parseInt(jumpPage, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      goToPage(page);
      setShowPageJump(false);
      setJumpPage("");
    }
  }, [jumpPage, totalPages, goToPage]);

  // Enhanced zoom controls
  const setZoomLevel = useCallback((level: number) => {
    setZoom(Math.max(0.25, Math.min(3.0, level)));
  }, [setZoom]);

  const fitToWidth = useCallback(() => {
    setFitMode("width");
    setZoom(1.0);
  }, [setFitMode, setZoom]);

  const fitToPage = useCallback(() => {
    setFitMode("page");
    setZoom(1.0);
  }, [setFitMode, setZoom]);

  // Print functionality
  const handlePrint = useCallback(() => {
    if (fileUrl) {
      const printWindow = window.open(fileUrl, "_blank");
      printWindow?.print();
    }
  }, [fileUrl]);

  // Download functionality
  const handleDownload = useCallback(() => {
    if (fileUrl) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = documentTitle || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [fileUrl, documentTitle]);

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 bg-[#080d1c] border-b border-white/6 shrink-0 flex-wrap",
      className
    )}>
      {/* Thumbnail toggle */}
      <button
        onClick={() => setThumbOpen((v) => !v)}
        title="Toggle thumbnails (T)"
        className={cn(
          "p-1.5 rounded-lg text-xs transition-all duration-200 hover:scale-105",
          thumbOpen ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white/70"
        )}
        aria-label="Toggle thumbnail panel"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <rect x="1" y="1" width="4" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="1" y="8" width="4" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="7" y1="3" x2="13" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="7" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="7" y1="11" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="w-px h-4 bg-white/10" />

      {/* Enhanced page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => canGoPrev && goToPage(currentPage - 1)}
          disabled={!canGoPrev}
          className="p-1 text-white/50 disabled:opacity-30 hover:text-white transition-all duration-200 hover:scale-110"
          aria-label="Previous page (Left Arrow)"
          title="Previous page (Left Arrow)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="relative" ref={pageJumpRef}>
          <button
            onClick={() => setShowPageJump(!showPageJump)}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
            title="Jump to page (J)"
          >
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => {
                const n = parseInt(pageInput, 10);
                if (n >= 1 && n <= totalPages) goToPage(n);
                else setPageInput(String(currentPage));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = parseInt(pageInput, 10);
                  if (n >= 1 && n <= totalPages) goToPage(n);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-8 text-center bg-transparent border-none text-white text-xs outline-none"
              aria-label="Current page"
            />
            <span className="text-white/40">/ {totalPages || "-"}</span>
          </button>

          {/* Page jump dropdown */}
          {showPageJump && (
            <div className="absolute top-full left-0 mt-1 bg-[#080d1c] border border-white/10 rounded-lg p-3 shadow-xl z-50 min-w-50">
              <p className="text-xs text-white/60 mb-2">Jump to page:</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePageJump()}
                  placeholder="Page #"
                  className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs outline-none focus:border-white/40"
                  min="1"
                  max={totalPages}
                />
                <button
                  onClick={handlePageJump}
                  className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
                >
                  Go
                </button>
              </div>
              <div className="mt-2 flex gap-1">
                <button
                  onClick={() => { goToPage(1); setShowPageJump(false); }}
                  className="text-xs text-white/40 hover:text-white px-2 py-1 rounded hover:bg-white/5"
                >
                  First
                </button>
                <button
                  onClick={() => { goToPage(Math.floor(totalPages / 2)); setShowPageJump(false); }}
                  className="text-xs text-white/40 hover:text-white px-2 py-1 rounded hover:bg-white/5"
                >
                  Middle
                </button>
                <button
                  onClick={() => { goToPage(totalPages); setShowPageJump(false); }}
                  className="text-xs text-white/40 hover:text-white px-2 py-1 rounded hover:bg-white/5"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => canGoNext && goToPage(currentPage + 1)}
          disabled={!canGoNext}
          className="p-1 text-white/50 disabled:opacity-30 hover:text-white transition-all duration-200 hover:scale-110"
          aria-label="Next page (Right Arrow)"
          title="Next page (Right Arrow)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M5 2l4 5-4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Enhanced zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoomLevel(zoom - 0.25)}
          className="p-1 text-white/50 hover:text-white transition-all duration-200 hover:scale-110"
          aria-label="Zoom out (-)"
          title="Zoom out (-)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>

        <div className="relative" ref={zoomPresetsRef}>
          <button
            onClick={() => setShowZoomPresets(!showZoomPresets)}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5 min-w-15 justify-center"
            title="Zoom presets (Z)"
          >
            <span className="font-mono">{Math.round(zoom * 100)}%</span>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
              <path d="M2 2l4 4M2 6l4-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Zoom presets dropdown */}
          {showZoomPresets && (
            <div className="absolute top-full left-0 mt-1 bg-[#080d1c] border border-white/10 rounded-lg p-2 shadow-xl z-50">
              <div className="grid grid-cols-2 gap-1">
                {ZOOM_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { setZoomLevel(preset); setShowZoomPresets(false); }}
                    className={cn(
                      "text-xs px-3 py-1 rounded transition-colors",
                      Math.abs(zoom - preset) < 0.01
                        ? "bg-primary text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {Math.round(preset * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setZoomLevel(zoom + 0.25)}
          className="p-1 text-white/50 hover:text-white transition-all duration-200 hover:scale-110"
          aria-label="Zoom in (+)"
          title="Zoom in (+)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="7" y1="4" x2="7" y2="10" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* View modes */}
      <div className="flex items-center gap-1">
        <button
          onClick={fitToWidth}
          title="Fit to width (W)"
          className={cn(
            "p-1.5 rounded text-xs transition-all duration-200 hover:scale-105",
            fitMode === "width" ? "text-primary bg-white/10" : "text-white/40 hover:text-white/70"
          )}
          aria-label="Fit to width"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M1 7h12M3 4l-2 3 2 3M11 4l2 3-2 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button
          onClick={fitToPage}
          title="Fit to page (P)"
          className={cn(
            "p-1.5 rounded text-xs transition-all duration-200 hover:scale-105",
            fitMode === "page" ? "text-primary bg-white/10" : "text-white/40 hover:text-white/70"
          )}
          aria-label="Fit to page"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="2" y="3" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 5h6M4 7h4M4 9h5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="flex-1" />

      {/* Additional actions */}
      <div className="flex items-center gap-1">
        {/* Print button */}
        {fileUrl && (
          <button
            onClick={handlePrint}
            title="Print (Ctrl+P)"
            className="p-1.5 text-white/40 hover:text-white transition-all duration-200 hover:scale-105"
            aria-label="Print document"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <rect x="3" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <rect x="3" y="8" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="5" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>
        )}

        {/* Download button */}
        {fileUrl && (
          <button
            onClick={handleDownload}
            title="Download (Ctrl+S)"
            className="p-1.5 text-white/40 hover:text-white transition-all duration-200 hover:scale-105"
            aria-label="Download document"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 2v7M3 5.5L7 9l4-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {/* Fullscreen */}
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
          className={cn(
            "p-1.5 transition-all duration-200 hover:scale-105",
            isFullscreen ? "text-primary" : "text-white/40 hover:text-white"
          )}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      </div>
    </div>
  );
}

// Icon components
function FullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M4 1v3H1M13 4h-3V1M10 13v-3h3M1 10h3v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
