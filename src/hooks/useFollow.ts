"use client";

import { useState, useTransition, useCallback } from "react";
import { useUIStore } from "@/stores/index";

interface UseFollowOptions {
  followingId:      string;
  initialState?:    boolean;
  initialCount?:    number;
}

export function useFollow({
  followingId,
  initialState = false,
  initialCount = 0,
}: UseFollowOptions) {
  const [isFollowing, setIsFollowing]   = useState(initialState);
  const [followerCount, setFollowerCount] = useState(initialCount);
  const [isPending, startTransition]    = useTransition();
  const addToast = useUIStore((s) => s.addToast);

  const toggle = useCallback(() => {
    const prev = { isFollowing, followerCount };

    // Optimistic update
    setIsFollowing(!prev.isFollowing);
    setFollowerCount((c) => prev.isFollowing ? Math.max(0, c - 1) : c + 1);

    startTransition(async () => {
      try {
        const res = await fetch("/api/follows", {
          method:  prev.isFollowing ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ followingId }),
        });

        if (!res.ok) {
          setIsFollowing(prev.isFollowing);
          setFollowerCount(prev.followerCount);
          addToast({ type: "error", title: "Failed to update follow status" });
        }
      } catch {
        setIsFollowing(prev.isFollowing);
        setFollowerCount(prev.followerCount);
        addToast({ type: "error", title: "Failed to update follow status" });
      }
    });
  }, [followingId, isFollowing, followerCount, addToast]);

  return { isFollowing, followerCount, toggle, isPending };
}
