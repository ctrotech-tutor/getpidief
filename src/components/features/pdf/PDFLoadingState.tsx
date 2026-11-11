"use client";

export function PDFLoading() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-white/40">
      <svg className="animate-spin w-8 h-8" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
        <path d="M16 4a12 12 0 0112 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <p className="text-sm">Loading document…</p>
    </div>
  );
}

export function PDFPageLoading() {
  return <div className="w-150 h-200 bg-white/5 animate-pulse rounded" />;
}

export function PDFError({ onDownload }: { onDownload: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-white/50">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2"/>
        <path d="M24 16v10M24 30v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <p className="text-sm">Unable to render document</p>
      <button
        onClick={onDownload}
        className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
      >
        Download instead
      </button>
    </div>
  );
}
