"use client";

import { useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import styles from "./feed.module.css";

export function PostShare({ postId, author }: { postId: string; author: string }) {
  const [message, setMessage] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  async function share() {
    const url = new URL(`/home/post/${postId}`, window.location.origin).href;
    setMessage(""); setManualUrl("");
    if (navigator.share) {
      try { await navigator.share({ title: `Post by ${author}`, url }); return; }
      catch (error) { if (error instanceof Error && error.name === "AbortError") return; }
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch {
      setManualUrl(url);
      setMessage("Copy the link below");
    }
  }
  return <span className={styles.shareWrap}>
    <button type="button" className={styles.action} onClick={share} aria-label={`Share post by ${author}`}><ArrowSquareOut size={19} aria-hidden="true" /><span>Share</span></button>
    <span role="status" className={styles.shareStatus}>{message}</span>
    {manualUrl && <input className={styles.shareInput} aria-label="Post link to copy" readOnly value={manualUrl} onFocus={event => event.currentTarget.select()} />}
  </span>;
}
