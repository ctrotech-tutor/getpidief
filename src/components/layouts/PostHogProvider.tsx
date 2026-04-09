"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// POSTHOG PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY &&
  process.env.NODE_ENV === "production"
) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host:              process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    person_profiles:       "identified_only",
    capture_pageview:      false, // We capture manually
    capture_pageleave:     true,
    autocapture:           false,
    disable_session_recording: process.env.NODE_ENV !== "production",
  });
}

function PageviewTracker() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const ph           = usePostHog();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) url += `?${searchParams.toString()}`;
      ph.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
