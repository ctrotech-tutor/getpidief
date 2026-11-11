"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import Image from "next/image";
import { useSession } from "@/hooks/useSession";
import type { SessionUser } from "@/hooks/useSession";
import { getPusherClient } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Channel } from "pusher-js";

interface Comment {
  id:          string;
  userId:      string;
  content:     string;
  contentHtml?: string | null;
  createdAt:   string | Date;
  isEdited:    boolean;
  helpfulCount:number;
  replyCount:  number;
  parentId:    string | null;
  user: {
    id:                string;
    username:          string;
    displayName:       string;
    avatarUrl:         string | null;
    verificationStatus?:string;
  };
  replies?: Comment[];
}

type CommentRealtimePayload = {
  commentId: string;
  userId: string;
  content: string;
  contentHtml?: string | null;
  createdAt: string;
  parentId?: string | null;
  username: string;
  avatarUrl?: string | null;
};

interface CommentStreamProps {
  documentId:    string;
  initialCount?: number;
}

export function CommentStream({ documentId, initialCount = 0 }: CommentStreamProps) {
  const { user, isAuthenticated } = useSession();
  const [comments,    setComments]    = useState<Comment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [hasMore,     setHasMore]     = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalCount,  setTotalCount]  = useState(initialCount);
  const channelRef = useRef<Channel | null>(null);

  const loadComments = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/comments?documentId=${documentId}&page=${p}&limit=20`);
      const json = await res.json();
      const data = json.data?.comments ?? [];
      if (p === 1) setComments(data);
      else setComments((prev) => [...prev, ...data]);
      setHasMore(json.data?.hasMore ?? false);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  // Load initial comments
  useEffect(() => {
    loadComments(1);
  }, [documentId, loadComments]);

  // Subscribe to real-time comments via Pusher
  useEffect(() => {
    let pusher: ReturnType<typeof getPusherClient> | null = null;
    try {
      pusher    = getPusherClient();
      const ch  = pusher.subscribe(CHANNELS.privateDocument(documentId));
      channelRef.current = ch;

      ch.bind(EVENTS.COMMENT_POSTED, (data: CommentRealtimePayload) => {
        const newComment: Comment = {
          id:          data.commentId,
          userId:      data.userId,
          content:     data.content,
          contentHtml: data.contentHtml,
          createdAt:   data.createdAt,
          isEdited:    false,
          helpfulCount:0,
          replyCount:  0,
          parentId:    data.parentId ?? null,
          user: {
            id:          data.userId,
            username:    data.username,
            displayName: data.username,
            avatarUrl:   data.avatarUrl ?? null,
          },
          replies: [],
        };

        if (!data.parentId) {
          setComments((prev) => [newComment, ...prev]);
          setTotalCount((c) => c + 1);
        } else {
          // Add to parent's replies
          setComments((prev) =>
            prev.map((c) =>
              c.id === data.parentId
                ? { ...c, replies: [...(c.replies ?? []), newComment], replyCount: c.replyCount + 1 }
                : c
            )
          );
        }
      });
    } catch {}

    return () => {
      try { pusher?.unsubscribe(CHANNELS.privateDocument(documentId)); } catch {}
    };
  }, [documentId]);

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-semibold text-foreground text-base">
          Discussion
        </h3>
        {totalCount > 0 && (
          <span className="text-xs bg-secondary border border-border rounded-full px-2 py-0.5 text-muted-foreground">
            {totalCount}
          </span>
        )}
      </div>

      {/* Composer */}
      {isAuthenticated && user && (
        <CommentComposer
          documentId={documentId}
          user={user}
          onPosted={() => loadComments(1)}
        />
      )}

      {/* Comments list */}
      {loading && comments.length === 0 ? (
        <CommentSkeletons />
      ) : comments.length === 0 ? (
        <EmptyComments />
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              documentId={documentId}
              currentUserId={user?.id}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => loadComments(page + 1)}
              disabled={loading}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground
                         border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              {loading ? "Loading…" : "Load more comments"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── Comment Composer ──────────────────────────────────────────────────────────

function CommentComposer({
  documentId,
  parentId,
  user,
  onPosted,
  onCancel,
  placeholder = "Ask a question or share insights…",
}: {
  documentId: string;
  parentId?:  string;
  user:       SessionUser;
  onPosted:   () => void;
  onCancel?:  () => void;
  placeholder?:string;
}) {
  const [content, setContent]   = useState("");
  const [isPending, start]      = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    if (!content.trim()) return;
    start(async () => {
      try {
        await fetch("/api/comments", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ documentId, content: content.trim(), parentId }),
        });
        setContent("");
        onPosted();
      } catch {}
    });
  }

  return (
    <div className="flex gap-3">
      <CommentAvatar user={user} size={32} />
      <div className="flex-1 space-y-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl
                     text-sm text-foreground placeholder:text-muted-foreground
                     resize-none outline-none
                     focus:border-ring focus:ring-2 focus:ring-ring/20
                     transition-all duration-150"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            ⌘↵ to post · Markdown supported
          </span>
          <div className="flex gap-2">
            {onCancel && (
              <button onClick={onCancel} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            )}
            <button
              onClick={submit}
              disabled={!content.trim() || isPending}
              className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium
                         rounded-lg hover:bg-primary/90 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comment Item ──────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  documentId,
  currentUserId,
  isReply = false,
}: {
  comment:       Comment;
  documentId:    string;
  currentUserId?:string;
  isReply?:      boolean;
}) {
  const { user, isAuthenticated } = useSession();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(comment.helpfulCount);
  const [voted,        setVoted]        = useState(false);

  async function voteHelpful() {
    if (voted || !isAuthenticated) return;
    setVoted(true);
    setHelpfulCount((c) => c + 1);
    await fetch(`/api/comments/${comment.id}/helpful`, { method: "POST" }).catch(() => {});
  }

  return (
    <div className={cn("flex gap-3", isReply && "ml-10")}>
      <CommentAvatar user={comment.user} size={isReply ? 24 : 32} />

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/u/${comment.user.username}`}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {comment.user.displayName}
          </a>
          {comment.user.verificationStatus === "verified" && (
            <span title="Verified" className="text-[var(--gold)]">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-label="Verified">
                <circle cx="5" cy="5" r="4.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.8"/>
                <path d="M3 5l1.5 1.5L7 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          {comment.isEdited && <span className="text-xs text-muted-foreground">(edited)</span>}
        </div>

        {/* Content */}
        {comment.contentHtml ? (
          <div
            className="text-sm text-foreground leading-relaxed prose prose-sm prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
          />
        ) : (
          <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            onClick={voteHelpful}
            disabled={voted || !isAuthenticated}
            className={cn(
              "flex items-center gap-1 hover:text-foreground transition-colors",
              voted && "text-[var(--emerald)]"
            )}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z"
                    stroke="currentColor" strokeWidth="1" strokeLinejoin="round"
                    fill={voted ? "currentColor" : "none"}/>
            </svg>
            Helpful {helpfulCount > 0 && `(${helpfulCount})`}
          </button>

          {!isReply && isAuthenticated && (
            <button
              onClick={() => setShowReplyBox((v) => !v)}
              className="hover:text-foreground transition-colors"
            >
              Reply
            </button>
          )}

          {comment.replyCount > 0 && !isReply && (
            <span className="text-muted-foreground/60">
              {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>

        {/* Reply box */}
        {showReplyBox && user && (
          <div className="mt-3">
            <CommentComposer
              documentId={documentId}
              parentId={comment.id}
              user={user}
              onPosted={() => setShowReplyBox(false)}
              onCancel={() => setShowReplyBox(false)}
              placeholder={`Reply to ${comment.user.displayName}…`}
            />
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 mt-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                documentId={documentId}
                currentUserId={currentUserId}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CommentAvatar({ user, size }: { user: Pick<SessionUser, "displayName" | "avatarUrl"> | Comment["user"]; size: number }) {
  const initials = (user?.displayName ?? "?").split(" ").slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "").join("");

  if (user?.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={`${user.displayName} avatar`}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0 border border-border"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary/20 flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      <span className="text-primary font-semibold">{initials}</span>
    </div>
  );
}

function EmptyComments() {
  return (
    <div className="text-center py-10 space-y-2">
      <p className="text-muted-foreground text-sm">No discussion yet.</p>
      <p className="text-muted-foreground/60 text-xs">Be the first to ask a question.</p>
    </div>
  );
}

function CommentSkeletons() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="skeleton w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}