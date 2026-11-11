"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useAtom } from "jotai";
import {
  currentPageAtom, totalPagesAtom, zoomLevelAtom, isFullscreenAtom,
  thumbnailStripOpenAtom, documentLoadedAtom, documentErrorAtom,
  canGoNextAtom, canGoPrevAtom, fitModeAtom,
} from "@/stores/pdfViewerStore";
import { PDFControls } from "./PDFControls";
import { PDFThumbnailStrip } from "./PDFThumbnailStrip";
import { PDFLoading, PDFPageLoading, PDFError } from "./PDFLoadingState";
import { cn } from "@/lib/utils/cn";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
if (typeof window !== "undefined") {
  // Keep worker version in lockstep with the runtime API version.
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
  documentId: string;
  fileUrl:   string;
  title:     string;
  className?: string;
}

export default function PDFViewer({ documentId, fileUrl, title, className }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const [totalPages, setTotalPages] = useAtom(totalPagesAtom);
  const [zoom, setZoom] = useAtom(zoomLevelAtom);
  const [isFullscreen, setIsFullscreen] = useAtom(isFullscreenAtom);
  const [thumbOpen, setThumbOpen] = useAtom(thumbnailStripOpenAtom);
  const [loaded, setLoaded] = useAtom(documentLoadedAtom);
  const [error, setError] = useAtom(documentErrorAtom);
  const [fitMode, setFitMode] = useAtom(fitModeAtom);
  const [canGoNext] = useAtom(canGoNextAtom);
  const [canGoPrev] = useAtom(canGoPrevAtom);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [containerW, setContainerW] = useState(600);

  // Track one view event when the document viewer mounts.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/documents/${documentId}/view`, {
      method: "POST",
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [documentId]);

  // Observe container width for fit-to-width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 600;
      setContainerW(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Handle modifier keys
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      
      switch (e.key) {
        // Navigation
        case "ArrowRight":
        case "ArrowDown":
          if (!shift && canGoNext) setCurrentPage((p) => p + 1);
          else if (shift && totalPages) setCurrentPage(totalPages); // Jump to last page
          break;
        case "ArrowLeft":
        case "ArrowUp":
          if (!shift && canGoPrev) setCurrentPage((p) => p - 1);
          else if (shift) setCurrentPage(1); // Jump to first page
          break;
        case "Home":
          setCurrentPage(1);
          break;
        case "End":
          if (totalPages) setCurrentPage(totalPages);
          break;
        case "PageDown":
          if (canGoNext) setCurrentPage((p) => p + 1);
          break;
        case "PageUp":
          if (canGoPrev) setCurrentPage((p) => p - 1);
          break;
          
        // Zoom controls
        case "+":
        case "=":
          if (!ctrl) {
            e.preventDefault();
            setZoom((z) => Math.min(z + 0.25, 3.0));
          }
          break;
        case "-":
          if (!ctrl) {
            e.preventDefault();
            setZoom((z) => Math.max(z - 0.25, 0.25));
          }
          break;
        case "0":
          if (!ctrl) {
            e.preventDefault();
            setZoom(1.0); // Reset to 100%
          }
          break;
          
        // View modes
        case "w":
        case "W":
          setFitMode("width");
          setZoom(1.0);
          break;
        case "p":
        case "P":
          if (!ctrl) {
            setFitMode("page");
            setZoom(1.0);
          }
          break;
          
        // UI toggles
        case "t":
        case "T":
          setThumbOpen((v) => !v);
          break;
        case "f":
        case "F":
          setIsFullscreen((v) => !v);
          break;
        case "Escape":
          if (isFullscreen) {
            setIsFullscreen(false);
          }
          break;
          
        // Page jump
        case "j":
        case "J":
          if (!ctrl) {
            e.preventDefault();
            // Trigger page jump (could be enhanced with a modal)
            const page = prompt("Jump to page:", String(currentPage));
            if (page) {
              const pageNum = parseInt(page, 10);
              if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                setCurrentPage(pageNum);
              }
            }
          }
          break;
          
        // Zoom presets with number keys
        case "1":
          if (!ctrl && !e.altKey) {
            e.preventDefault();
            setZoom(1.0); // 100%
          }
          break;
        case "2":
          if (!ctrl && !e.altKey) {
            e.preventDefault();
            setZoom(2.0); // 200%
          }
          break;
        case "5":
          if (!ctrl && !e.altKey) {
            e.preventDefault();
            setZoom(0.5); // 50%
          }
          break;
      }
      
      // Ctrl+key combinations
      if (ctrl) {
        switch (e.key) {
          case "p":
          case "P":
            e.preventDefault();
            // Print functionality (handled in controls)
            break;
          case "s":
          case "S":
            e.preventDefault();
            // Download functionality (handled in controls)
            break;
          case "0":
            e.preventDefault();
            setZoom(1.0); // Reset zoom
            break;
          case "Equal":
          case "+":
            e.preventDefault();
            setZoom((z) => Math.min(z + 0.25, 3.0));
            break;
          case "-":
            e.preventDefault();
            setZoom((z) => Math.max(z - 0.25, 0.25));
            break;
        }
      }
    }
    
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canGoNext, canGoPrev, isFullscreen, totalPages, setZoom, setCurrentPage, setFitMode, setThumbOpen, setIsFullscreen]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setTotalPages(numPages);
    setLoaded(true);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    setError(err.message);
    setLoaded(false);
  }

  const pageWidth = fitMode === "width"
    ? Math.max(containerW - (thumbOpen ? 140 : 0) - 48, 300) * zoom
    : undefined;

  return (
    <div
      className={cn(
        "flex flex-col bg-[#0a0f1e] relative",
        isFullscreen && "fixed inset-0 z-900",
        className
      )}
      ref={containerRef}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <PDFControls fileUrl={fileUrl} documentTitle={title} />

      {/* ── Document area ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Thumbnail strip */}
        {thumbOpen && <PDFThumbnailStrip />}

        {/* Main PDF canvas */}
        <div className="flex-1 overflow-auto flex justify-center py-4 px-2">
          {error ? (
            <PDFError onDownload={() => window.open(fileUrl, "_blank")} />
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<PDFLoading />}
              error={null}
            >
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={true}
                loading={<PDFPageLoading />}
                className="shadow-2xl rounded-sm overflow-hidden"
              />
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}
