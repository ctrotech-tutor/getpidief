"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkSimple, DotsThree, Flag, LinkSimple, UserMinus, UserPlus } from "@phosphor-icons/react";
import { toggleSave } from "@/app/(app)/home/actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import styles from "./feed.module.css";

type Props = { postId: string; authorId: string; author: string; ownPost: boolean; initiallyFollowing: boolean; initiallySaved: boolean };
export function PostOptions({ postId, authorId, author, ownPost, initiallyFollowing, initiallySaved }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);
  function clearCopiedTimer() { if (copiedTimer.current) clearTimeout(copiedTimer.current); copiedTimer.current = null; }

  useEffect(() => setFollowing(initiallyFollowing), [initiallyFollowing]);
  useEffect(() => setSaved(initiallySaved), [initiallySaved]);

  async function updateFollow() {
    if (pending) return;
    clearCopiedTimer(); setPending(true); setMessage("");
    try {
      const response = await fetch("/api/follows", { method: following ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followingId: authorId }) });
      if (!response.ok) throw new Error("Follow request failed");
      setFollowing(!following); router.refresh();
    } catch { setMessage("Could not update follow. Please try again."); }
    finally { setPending(false); }
  }
  async function updateSave() {
    if (pending) return;
    clearCopiedTimer(); setPending(true); setMessage("");
    try {
      const form = new FormData(); form.set("postId", postId); form.set("active", String(saved));
      await toggleSave(form); setSaved(!saved); router.refresh();
      setMessage(saved ? "Removed from saved posts" : "Post saved");
    } catch { setMessage("Could not update saved post. Please try again."); }
    finally { setPending(false); }
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
        <DropdownMenuItem className={styles.menuItem} disabled={pending} onSelect={() => void updateSave()}><BookmarkSimple weight={saved ? "fill" : "regular"} aria-hidden="true" />{saved ? "Remove from saved posts" : "Save post"}</DropdownMenuItem>
        {!ownPost && <DropdownMenuItem asChild className={styles.menuItem}><Link href={`/home/post/${postId}#report-post`}><Flag aria-hidden="true" />Report post</Link></DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    <span role="status" className={styles.optionStatus}>{message}</span>
    {manualUrl && <input aria-label="Post link to copy" className={styles.optionInput} readOnly value={manualUrl} onFocus={event => event.currentTarget.select()} />}
  </div>;
}
