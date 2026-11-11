"use client";

import { useState, useTransition, useCallback } from "react";

interface UseReactionOptions {
  documentId:       string;
  initialLikes?:    number;
  initialDislikes?: number;
  initialReaction?: "like" | "dislike" | null;
}

export function useReaction({
  documentId,
  initialLikes    = 0,
  initialDislikes = 0,
  initialReaction = null,
}: UseReactionOptions) {
  const [likeCount,    setLikeCount]    = useState(initialLikes);
  const [dislikeCount, setDislikeCount] = useState(initialDislikes);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(initialReaction);
  const [isPending, startTransition]    = useTransition();

  const react = useCallback(
    (type: "like" | "dislike") => {
      if (isPending) return;
      const desired = userReaction === type ? null : type;
      // Optimistic update
      const prev = { likeCount, dislikeCount, userReaction };

      if (userReaction === type) {
        // Toggle off
        setUserReaction(null);
        if (type === "like")    setLikeCount((c) => Math.max(0, c - 1));
        if (type === "dislike") setDislikeCount((c) => Math.max(0, c - 1));
      } else {
        // Switch or set
        if (userReaction === "like")    setLikeCount((c) => Math.max(0, c - 1));
        if (userReaction === "dislike") setDislikeCount((c) => Math.max(0, c - 1));
        setUserReaction(type);
        if (type === "like")    setLikeCount((c) => c + 1);
        if (type === "dislike") setDislikeCount((c) => c + 1);
      }

      startTransition(async () => {
        try {
          const res = await fetch(`/api/documents/${documentId}/react`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ reaction: desired }),
          });

          if (!res.ok) {
            // Revert on error
            setLikeCount(prev.likeCount);
            setDislikeCount(prev.dislikeCount);
            setUserReaction(prev.userReaction);
            return;
          }

          const json = await res.json();
          // Sync with server truth
          setLikeCount(json.data.likeCount);
          setDislikeCount(json.data.dislikeCount);
          setUserReaction(json.data.userReaction);
        } catch {
          setLikeCount(prev.likeCount);
          setDislikeCount(prev.dislikeCount);
          setUserReaction(prev.userReaction);
        }
      });
    },
    [documentId, likeCount, dislikeCount, userReaction, isPending]
  );

  return { likeCount, dislikeCount, userReaction, react, isPending };
}
