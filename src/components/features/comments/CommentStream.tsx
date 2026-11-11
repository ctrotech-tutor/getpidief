"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import Image from "next/image";
import { useSession } from "@/hooks/useSession";
import type { SessionUser } from "@/hooks/useSession";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface Comment {
  id:          string;
  userId:      string | null;
  content:     string;
  contentHtml?: string | null;
  createdAt:   string | Date;
  isEdited:    boolean;
  isDeleted?:  boolean;
  helpfulCount:number;
  replyCount:  number;
  parentId:    string | null;
  user: {
    id:                string;
    username:          string;
    displayName:       string;
    avatarUrl:         string | null;
    verificationStatus?:string;
  } | null;
  replies?: Comment[];
}

interface CommentStreamProps {
  documentId:    string;
  initialCount?: number;
}

export function CommentStream({ documentId }: CommentStreamProps) {
  const { user, isAuthenticated } = useSession();
  const [comments,    setComments]    = useState<Comment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [hasMore,     setHasMore]     = useState(false);
  const [page,        setPage]        = useState(1);
  const [error, setError] = useState("");

  const loadComments = useCallback(async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/comments?documentId=${documentId}&page=${p}&limit=20`);
      if (!res.ok) throw new Error("Could not load discussion");
      const json = await res.json();
      const data = json.data?.comments ?? [];
      if (p === 1) setComments(data);
      else setComments((prev) => [...prev, ...data]);
      setHasMore(json.data?.hasMore ?? false);
      setPage(p);
    } catch {
      setError("Could not load the discussion. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  // Load initial comments
  useEffect(() => {
    loadComments(1);
  }, [documentId, loadComments]);

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-semibold text-foreground text-base">
          Discussion
        </h3>
        <button type="button" onClick={() => loadComments(1)} disabled={loading} className="ml-auto text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">Refresh</button>
      </div>

      {/* Composer */}
      {isAuthenticated && user && (
        <CommentComposer
          documentId={documentId}
          user={user}
          onPosted={() => loadComments(1)}
        />
      )}

      {!isAuthenticated && <p className="text-sm text-muted-foreground"><a href="/login" className="underline">Sign in</a> to join the discussion.</p>}
      {error && <div role="alert" className="text-sm text-destructive">{error} <button className="underline" onClick={() => loadComments(page)}>Try again</button></div>}
      {/* Comments list */}
      {loading && comments.length === 0 ? (
        <CommentSkeletons />
      ) : !error && comments.length === 0 ? (
        <EmptyComments />
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              documentId={documentId}
              onReplyPosted={() => loadComments(1)}
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
  const [error, setError] = useState("");
  const [isPending, start]      = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    if (!content.trim() || isPending) return;
    setError("");
    start(async () => {
      try {
        const response = await fetch("/api/comments", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ documentId, content: content.trim(), parentId }),
        });
        if (!response.ok) throw new Error("Comment could not be posted");
        setContent("");
        onPosted();
      } catch { setError("Could not post your comment. Your text is still here, so you can try again."); }
    });
  }

  return (
    <div className="flex gap-3">
      <CommentAvatar user={user} size={32} />
      <div className="flex-1 space-y-2">
        <textarea
          ref={textareaRef}
          aria-label={parentId ? "Write a reply" : "Write a comment"}
          maxLength={2000}
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
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Ctrl or ⌘ + Enter to post
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
              {isPending ? "Posting…" : parentId ? "Post reply" : "Post"}
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
  onReplyPosted,
  isReply = false,
}: {
  comment:       Comment;
  documentId:    string;
  onReplyPosted: () => void;
  isReply?:      boolean;
}) {
  const { user, isAuthenticated } = useSession();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replies, setReplies] = useState<Comment[] | null>(null);
  const [replyPage, setReplyPage] = useState(0);
  const [moreReplies, setMoreReplies] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const [voted, setVoted] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(comment.helpfulCount);
  async function updateComment(kind: "edit" | "delete" | "vote") {
    if (pending) return;
    if (kind === "delete" && !window.confirm("Delete this comment? Replies will remain visible.")) return;
    setPending(true); setActionError("");
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: kind === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(kind === "delete" ? {} : { body: JSON.stringify(kind === "vote" ? { action: "helpful" } : { content: draft }) }),
      });
      if (!response.ok) throw new Error("Update failed");
      const data = await response.json();
      if (kind === "vote") { setVoted(true); setHelpfulCount(data.data.helpfulCount); }
      else { setEditing(false); onReplyPosted(); }
    } catch { setActionError("Could not update this comment. Please try again."); }
    finally { setPending(false); }
  }
  async function loadReplies(page: number) {
    setReplyLoading(true); setReplyError("");
    try {
      const res = await fetch(`/api/comments?documentId=${documentId}&parentId=${comment.id}&page=${page}&limit=20`);
      if (!res.ok) throw new Error("Could not load replies");
      const json = await res.json();
      setReplies((current) => page === 1 ? json.data.comments : [...(current ?? []), ...json.data.comments]);
      setReplyPage(page); setMoreReplies(json.data.hasMore);
    } catch { setReplyError("Could not load replies. Try again."); }
    finally { setReplyLoading(false); }
  }

  return (
    <div className={cn("flex gap-3", isReply && "ml-10")}>
      <CommentAvatar user={comment.user} size={isReply ? 24 : 32} />

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          {comment.user ? <a
            href={`/u/${comment.user.username}`}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {comment.user.displayName}
          </a> : <span className="text-sm text-muted-foreground">Deleted comment</span>}
          {comment.user?.verificationStatus === "verified" && (
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
        {editing ? <div className="space-y-2">
          <textarea aria-label="Edit comment" maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm" />
          <div className="flex gap-3 text-xs">
            <button type="button" disabled={pending || !draft.trim()} onClick={() => updateComment("edit")}>Save</button>
            <button type="button" disabled={pending} onClick={() => { setEditing(false); setDraft(comment.content); }}>Cancel</button>
          </div>
        </div> : <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>}
        {actionError && <p role="alert" className="text-xs text-destructive">{actionError}</p>}

        {/* Actions */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {isAuthenticated && !comment.isDeleted && <button type="button" disabled={pending || voted} onClick={() => updateComment("vote")} className="hover:text-foreground disabled:opacity-60">{voted ? "Marked helpful" : "Helpful"} ({helpfulCount})</button>}
          {isAuthenticated && user?.id === comment.userId && !comment.isDeleted && !editing && <>
            <button type="button" disabled={pending} onClick={() => setEditing(true)} className="hover:text-foreground">Edit</button>
            <button type="button" disabled={pending} onClick={() => updateComment("delete")} className="hover:text-foreground">Delete</button>
          </>}
          {!isReply && isAuthenticated && !comment.isDeleted && (
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
              onPosted={() => { setShowReplyBox(false); setReplies(null); onReplyPosted(); }}
              onCancel={() => setShowReplyBox(false)}
              placeholder={`Reply to ${comment.user?.displayName ?? "this comment"}…`}
            />
          </div>
        )}

        {/* Nested replies */}
        {(replies ?? comment.replies ?? []).length > 0 && (
          <div className="space-y-3 mt-3">
            {(replies ?? comment.replies ?? []).map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                documentId={documentId}
                onReplyPosted={() => { setReplies(null); onReplyPosted(); }}
                isReply
              />
            ))}
          </div>
        )}
        {!isReply && ((replies === null && comment.replyCount > (comment.replies?.length ?? 0)) || (replies !== null && moreReplies)) && <button type="button" disabled={replyLoading} onClick={() => loadReplies(replies === null ? 1 : replyPage + 1)} className="text-xs text-primary underline disabled:opacity-50">{replyLoading ? "Loading replies…" : replies === null ? "View all replies" : "Load more replies"}</button>}
        {replyError && <p role="alert" className="text-xs text-destructive">{replyError} <button className="underline" onClick={() => loadReplies(replies === null ? 1 : replyPage + 1)}>Retry</button></p>}
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