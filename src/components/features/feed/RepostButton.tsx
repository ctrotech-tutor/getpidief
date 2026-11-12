"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "@phosphor-icons/react";
import { setRepost } from "@/app/(app)/home/actions";
import styles from "./feed.module.css";

export function RepostButton({ postId, author, initiallyReposted, count }: { postId: string; author: string; initiallyReposted: boolean; count: number }) {
  const [reposted, setReposted] = useState(initiallyReposted);
  const [total, setTotal] = useState(count);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => { setReposted(initiallyReposted); setTotal(count); }, [initiallyReposted, count]);
  async function toggle() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const form = new FormData(); form.set("postId", postId); form.set("repost", String(!reposted));
      await setRepost(form); setReposted(!reposted); setTotal(Math.max(0, total + (reposted ? -1 : 1))); router.refresh();
    } catch { setError("Could not update repost. Please try again."); }
    finally { setPending(false); }
  }
  return <span className={styles.repostControl}><button type="button" className={`${styles.action} ${reposted ? styles.actionActive : ""}`} disabled={pending} aria-pressed={reposted} aria-label={`${reposted ? "Undo repost of" : "Repost"} post by ${author}`} onClick={toggle}><Repeat size={19} aria-hidden="true" /><span>{total}</span></button>{error && <span role="alert" className={styles.repostError}>{error}</span>}</span>;
}
