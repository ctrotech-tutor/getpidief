"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore:    () => void;
  hasMore:       boolean;
  isLoading:     boolean;
  rootMargin?:   string;
  threshold?:    number;
}

/**
 * Attaches an IntersectionObserver to a sentinel element.
 * Calls onLoadMore when the sentinel enters the viewport.
 *
 * @example
 * const { sentinelRef } = useInfiniteScroll({ onLoadMore, hasMore, isLoading });
 * return <div ref={sentinelRef} />;
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = "200px",
  threshold  = 0,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry?.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersection, rootMargin, threshold]);

  return { sentinelRef };
}
