"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkSimple, DotsThree, Flag, LinkSimple, UserMinus, UserPlus } from "@phosphor-icons/react";
import { toggleSave } from "@/app/(app)/home/actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import styles from "./feed.module.css";
import { finishFollow, pendingFollow, startFollow, subscribeFollow } from "./follow-updates";

type SaveUpdate = { postId: string; saved: boolean; pending: boolean; failed?: boolean };
const saveListeners = new Set<(update: SaveUpdate) => void>();
const pendingSaves = new Map<string, boolean>();
function broadcastSave(update: SaveUpdate) { for (const listener of saveListeners) listener(update); }

type Props = { postId: string; authorId: string; author: string; ownPost: boolean; initiallyFollowing: boolean; initiallySaved: boolean; savedView?: boolean };
export function PostOptions({ postId, authorId, author, ownPost, initiallyFollowing, initiallySaved, savedView = false }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(() => pendingFollow(authorId) ?? initiallyFollowing);
  const [saved, setSaved] = useState(() => pendingSaves.get(postId) ?? initiallySaved);
  const [savePending, setSavePending] = useState(() => pendingSaves.has(postId));
  const [pending, setPending] = useState(() => pendingFollow(authorId) !== undefined);
  const [message, setMessage] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);
  function clearCopiedTimer() { if (copiedTimer.current) clearTimeout(copiedTimer.current); copiedTimer.current = null; }

  useEffect(() => { if (pendingFollow(authorId) === undefined) setFollowing(initiallyFollowing); }, [authorId, initiallyFollowing]);
  useEffect(() => subscribeFollow(update => {
    if (update.id !== authorId) return;
    setFollowing(update.following); setPending(update.pending);
    if (update.failed) setMessage("Could not update follow. Please try again.");
  }), [authorId]);
  useEffect(() => { if (!pendingSaves.has(postId)) setSaved(initiallySaved); }, [postId, initiallySaved]);
  useEffect(() => {
    const listener = (update: SaveUpdate) => {
      if (update.postId !== postId) return;
      setSaved(update.saved); setSavePending(update.pending);
      if (update.failed) setMessage("Could not update saved post. Please try again.");
    };
    saveListeners.add(listener); return () => { saveListeners.delete(listener); };
  }, [postId]);

  async function updateFollow() {
    if (pending) return;
    const next = !following;
    if (!startFollow(authorId, next)) return;
    clearCopiedTimer(); setMessage("");
    try {
      const response = await fetch("/api/follows", { method: following ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followingId: authorId }) });
      if (!response.ok) throw new Error("Follow request failed");
      finishFollow(authorId, next);
    } catch { finishFollow(authorId, following, true); }
  }
  async function updateSave() {
    if (pending || pendingSaves.has(postId)) return;
    clearCopiedTimer(); setMessage("");
    const next = !saved;
    pendingSaves.set(postId, next);
    broadcastSave({ postId, saved: next, pending: true });
    try {
      const form = new FormData(); form.set("postId", postId); form.set("active", String(saved));
      await toggleSave(form);
      pendingSaves.delete(postId); broadcastSave({ postId, saved: next, pending: false });
      setMessage(next ? "Post saved" : "Removed from saved posts");
      // Saved is a filtered view; refresh it after a successful removal.
      if (savedView && !next) router.refresh();
    } catch {
      pendingSaves.delete(postId); broadcastSave({ postId, saved, pending: false, failed: true });
    }
  }
  async function copyLink() {
    const url = new URL(`/home/post/${postId}`, window.location.origin).href;
    clearCopiedTimer(); setMessage(""); setManualUrl("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url); setMessage("Link copied");
      copiedTimer.current = setTimeout(() => { setMessage(""); copiedTimer.current = null; }, 3000);
    } catch { setManualUrl(url); setMessage("Copy the link below"); }
  }
  return <div className={styles.postOptions}>
    {!ownPost && !following && <button type="button" className={styles.followPost} disabled={pending} onClick={updateFollow} aria-label={`Follow ${author}`}>Follow</button>}
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" className={styles.postMenuTrigger} aria-label={`More options for post by ${author}`}><DotsThree size={24} weight="bold" aria-hidden="true" /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className={styles.postMenu}>
        <DropdownMenuItem className={styles.menuItem} onSelect={() => void copyLink()}><LinkSimple aria-hidden="true" />Copy link</DropdownMenuItem>
        {!ownPost && <DropdownMenuItem className={styles.menuItem} disabled={pending} onSelect={() => void updateFollow()}>{following ? <UserMinus aria-hidden="true" /> : <UserPlus aria-hidden="true" />}{following ? "Unfollow" : "Follow"}</DropdownMenuItem>}
        <DropdownMenuItem className={styles.menuItem} disabled={pending || savePending} onSelect={() => void updateSave()}><BookmarkSimple weight={saved ? "fill" : "regular"} aria-hidden="true" />{saved ? "Remove from saved posts" : "Save post"}</DropdownMenuItem>
        {!ownPost && <DropdownMenuItem asChild className={styles.menuItem}><Link href={`/home/post/${postId}#report-post`}><Flag aria-hidden="true" />Report post</Link></DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    <span role="status" className={styles.optionStatus}>{message}</span>
    {manualUrl && <input aria-label="Post link to copy" className={styles.optionInput} readOnly value={manualUrl} onFocus={event => event.currentTarget.select()} />}
  </div>;
}
