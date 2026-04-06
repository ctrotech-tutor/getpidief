"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        {/* Large 404 */}
        <p
          className="font-display font-bold text-accent"
          style={{ fontSize: "clamp(80px, 15vw, 140px)", letterSpacing: "-0.06em", lineHeight: 1 }}
        >
          404
        </p>

        {/* Illustration placeholder */}
        <div className="my-8 mx-auto w-48 h-48 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="12" y="8" width="32" height="40" rx="4" stroke="#2563EB" strokeWidth="2" strokeDasharray="4 2"/>
            <line x1="20" y1="20" x2="36" y2="20" stroke="#4A5880" strokeWidth="2" strokeLinecap="round"/>
            <line x1="20" y1="28" x2="30" y2="28" stroke="#4A5880" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="44" cy="44" r="10" stroke="#F43F5E" strokeWidth="2"/>
            <line x1="40" y1="40" x2="48" y2="48" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="40" x2="40" y2="48" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="font-display text-2xl font-bold text-primary mb-3">
          Page not found, Scholar.
        </h1>
        <p className="text-secondary mb-8">
          The resource you're looking for may have been removed, renamed, or doesn't exist.
        </p>

        <div className="flex gap-3 justify-center">
          <BackButton />
          <Link href="/explore" className="btn btn-primary">
            Return to Archive
          </Link>
        </div>

        <p className="text-muted text-sm mt-8">
          Lost? Try searching for what you need.
        </p>
      </div>
    </div>
  );
}

function BackButton() {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className="btn btn-secondary">
      ← Go Back
    </button>
  );
}
