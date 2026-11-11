"use client";

import { useState, useTransition } from "react";
import { useSession } from "@/hooks/useSession";
import { useUIStore } from "@/stores/index";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface WorkstationActionsProps {
  documentId:        string;
  initialLikeCount:  number;
  initialDislikeCount:number;
  initialBookmarked: boolean;
  userReaction:      "like" | "dislike" | null | undefined;
}

export function WorkstationActions({
  documentId,
  initialLikeCount,
  initialDislikeCount,
  initialBookmarked,
  userReaction: initialReaction,
}: WorkstationActionsProps) {
  const { isAuthenticated }     = useSession();
  const setShareModal           = useUIStore((s) => s.setShareModalDocumentId);
  const setReportModal          = useUIStore((s) => s.setReportModalDocumentId);
  const addToast                = useUIStore((s) => s.addToast);
  const [isPending, start]      = useTransition();
  const [reaction,  setReaction]= useState<"like" | "dislike" | null>(initialReaction ?? null);
  const [likes,     setLikes]   = useState(initialLikeCount);
  const [dislikes,  setDislikes]= useState(initialDislikeCount);
  const [bookmarked,setBookmarked]= useState(initialBookmarked);

  async function handleReaction(type: "like" | "dislike") {
    if (!isAuthenticated) { addToast({ type: "info", title: "Sign in to react to documents" }); return; }
    // Optimistic update
    const prev = reaction;
    if (type === "like") {
      setLikes((l) => reaction === "like" ? l - 1 : l + 1);
      if (reaction === "dislike") setDislikes((d) => Math.max(0, d - 1));
    } else {
      setDislikes((d) => reaction === "dislike" ? d - 1 : d + 1);
      if (reaction === "like") setLikes((l) => Math.max(0, l - 1));
    }
    setReaction(reaction === type ? null : type);

    start(async () => {
      try {
        const res  = await fetch(`/api/documents/${documentId}/react`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ type }),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setLikes(json.data.likeCount);
        setDislikes(json.data.dislikeCount);
      } catch {
        // Revert
        setReaction(prev);
        setLikes(initialLikeCount);
        setDislikes(initialDislikeCount);
      }
    });
  }

  async function handleBookmark() {
    if (!isAuthenticated) { addToast({ type: "info", title: "Sign in to save documents" }); return; }
    const prev = bookmarked;
    setBookmarked((v) => !v);
    start(async () => {
      try {
        await fetch("/api/bookmarks", {
          method:  prev ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ documentId }),
        });
        addToast({
          type:  "success",
          title: prev ? "Removed from library" : "Saved to library",
        });
      } catch {
        setBookmarked(prev);
      }
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Like */}
      <ActionButton
        onClick={() => handleReaction("like")}
        active={reaction === "like"}
        activeColor="text-primary"
        disabled={isPending}
        aria-label={`Like document (${likes})`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M2 6.5h1.5L5 3l2 8 1.5-4.5H12"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
                fill={reaction === "like" ? "currentColor" : "none"} fillOpacity={reaction === "like" ? 0.2 : 0}/>
        </svg>
        {formatNumber(likes)}
      </ActionButton>

      {/* Dislike */}
      <ActionButton
        onClick={() => handleReaction("dislike")}
        active={reaction === "dislike"}
        activeColor="text-destructive"
        disabled={isPending}
        aria-label="Dislike"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M7 2L5.5 5 2 5.5l2.5 2-.7 3.5L7 9.5l3.2 1.5-.7-3.5L12 5.5 8.5 5z"
                stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
                fill={reaction === "dislike" ? "currentColor" : "none"} fillOpacity={reaction === "dislike" ? 0.15 : 0}/>
        </svg>
      </ActionButton>

      {/* Bookmark */}
      <ActionButton
        onClick={handleBookmark}
        active={bookmarked}
        activeColor="text-[var(--gold)]"
        disabled={isPending}
        aria-label={bookmarked ? "Remove from library" : "Save to library"}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M2 2a1 1 0 011-1h8a1 1 0 011 1v11L7 10 2 13V2z"
                stroke="currentColor" strokeWidth="1.3"
                fill={bookmarked ? "currentColor" : "none"} fillOpacity={bookmarked ? 0.2 : 0}/>
        </svg>
        {bookmarked ? "Saved" : "Save"}
      </ActionButton>

      {/* Share */}
      <ActionButton
        onClick={() => setShareModal(documentId)}
        aria-label="Share document"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="11" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="3"  cy="7"  r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4.4 6.3L9.6 3.7M4.4 7.7l5.2 2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Share
      </ActionButton>

      {/* Report */}
      <ActionButton
        onClick={() => setReportModal(documentId)}
        aria-label="Report document"
        className="text-muted-foreground/60 hover:text-destructive"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M6 1l5 10H1L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M6 5v2.5M6 9v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Report
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  active     = false,
  activeColor= "text-primary",
  disabled   = false,
  className,
  "aria-label": ariaLabel,
}: {
  children:   React.ReactNode;
  onClick:    () => void;
  active?:    boolean;
  activeColor?:string;
  disabled?:  boolean;
  className?: string;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
        "border transition-all duration-150",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        active
          ? `${activeColor} bg-current/10 border-current/20`
          : "text-muted-foreground border-border hover:text-foreground hover:bg-secondary hover:border-ring/30",
        className
      )}
    >
      {children}
    </button>
  );
}
