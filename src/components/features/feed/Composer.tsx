"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/app/(app)/home/actions";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FeedProfileAvatar } from "./FeedProfileAvatar";
import styles from "./feed.module.css";

export function Composer({ name, avatarUrl = null }: { name: string; avatarUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function changeOpen(next: boolean) {
    if (pending) return;
    if (next) { setError(""); setPublished(false); }
    setOpen(next);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !text.trim()) return;
    const data = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        await createPost(data);
        setText(""); setOpen(false); setPublished(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not publish your post. Please try again.");
      }
    });
  }
  return <section className={styles.composerSection} aria-label="Create a post">
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <button type="button" className={styles.composerPrompt}>
          <FeedProfileAvatar name={name} avatarUrl={avatarUrl} post />
          <span>What’s on your mind?</span>
        </button>
      </DialogTrigger>
      <DialogContent className={styles.composerDialog} overlayClassName={styles.composerOverlay} showCloseButton={false} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onInteractOutside={event => { if (pending) event.preventDefault(); }}>
        <DialogTitle className="sr-only">Create a post</DialogTitle>
        <DialogDescription className="sr-only">Write a post to share with the community.</DialogDescription>
        <form onSubmit={submit} className={styles.composerForm}>
          <div className={styles.composeIdentity}>
            <FeedProfileAvatar name={name} avatarUrl={avatarUrl} post />
            <div className={styles.composeWriting}>
              <strong>{name}</strong>
              <label className="sr-only" htmlFor="feed-body">Your post</label>
              <textarea id="feed-body" name="body" disabled={pending} required maxLength={3000} placeholder="What’s on your mind?" value={text} onChange={event => setText(event.target.value)} className={styles.composeTextarea} autoFocus />
              <input type="hidden" name="kind" value="thought" />
            </div>
          </div>
          {error && <p role="alert" className={styles.composeError}>{error}</p>}
          <div className={styles.composeFooter}>
            <button type="button" className={styles.composeCancel} disabled={pending} onClick={() => changeOpen(false)}>Cancel</button>
            <button type="submit" className={styles.composePublish} disabled={pending || !text.trim()}>{pending ? "Posting…" : "Post"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {published && <p role="status" className={styles.composePublished}>Your post is published.</p>}
  </section>;
}
