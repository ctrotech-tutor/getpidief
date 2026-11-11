"use client";

import { useState, useTransition, useCallback } from "react";
import { useUIStore } from "@/stores/index";

interface UseBookmarkOptions {
  documentId:    string;
  initialState?: boolean;
}

export function useBookmark({ documentId, initialState = false }: UseBookmarkOptions) {
  const [isBookmarked, setIsBookmarked] = useState(initialState);
  const [isPending, startTransition]    = useTransition();
  const addToast = useUIStore((s) => s.addToast);

  const toggle = useCallback(() => {
    const previousState = isBookmarked;
    setIsBookmarked(!previousState); // optimistic

    startTransition(async () => {
      try {
        const res = await fetch("/api/bookmarks", {
          method:  previousState ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ documentId }),
        });

        if (!res.ok) {
          setIsBookmarked(previousState); // revert
          addToast({ type: "error", title: "Failed to update bookmark" });
          return;
        }

        addToast({
          type:  "success",
          title: previousState ? "Removed from library" : "Saved to library",
        });
      } catch {
        setIsBookmarked(previousState);
        addToast({ type: "error", title: "Failed to update bookmark" });
      }
    });
  }, [documentId, isBookmarked, addToast]);

  return { isBookmarked, toggle, isPending };
}
