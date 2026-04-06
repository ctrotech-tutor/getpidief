"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-amber-subtle border border-amber/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4L28 26H4L16 4Z" stroke="#FB923C" strokeWidth="2" strokeLinejoin="round"/>
            <line x1="16" y1="13" x2="16" y2="19" stroke="#FB923C" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="16" cy="22" r="1" fill="#FB923C"/>
          </svg>
        </div>

        <h1 className="font-display text-2xl font-bold text-primary mb-3">
          Something went wrong.
        </h1>
        <p className="text-secondary mb-2">
          An unexpected error occurred. Our team has been notified.
        </p>

        {error.digest && (
          <p className="font-mono text-xs text-muted mb-8">
            Error ref: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn btn-primary">
            Try Again
          </button>
          <a href="/explore" className="btn btn-secondary">
            Go to Homepage
          </a>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-8 text-left bg-surface rounded-lg p-4 border border-border">
            <summary className="text-sm text-muted cursor-pointer">Technical Details</summary>
            <pre className="mt-3 text-xs text-rose overflow-auto">{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
