import Link from "next/link";

export default function DocumentNotFound() {
  return (
    <div className="h-[calc(100vh-60px)] flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        {/* Illustration */}
        <div className="mx-auto w-24 h-24 rounded-2xl bg-secondary border border-border
                        flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-muted-foreground" aria-hidden>
            <rect x="8" y="4" width="24" height="30" rx="3" stroke="currentColor" strokeWidth="1.8"
                  strokeDasharray="4 3"/>
            <circle cx="28" cy="28" r="8" fill="currentColor" fillOpacity="0.1"
                    stroke="currentColor" strokeWidth="1.8"/>
            <path d="M25 25l6 6M31 25l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">
            Document not found.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This document may have been removed, is pending review, or the link is incorrect.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/explore"
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                       hover:bg-primary/90 transition-colors"
          >
            Browse Archive
          </Link>
          <Link
            href="/search"
            className="px-5 py-2.5 bg-secondary border border-border text-foreground rounded-xl text-sm font-medium
                       hover:bg-secondary/80 transition-colors"
          >
            Search Documents
          </Link>
        </div>
      </div>
    </div>
  );
}