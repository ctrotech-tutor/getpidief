"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import styles from "./feed.module.css";

/** Non-interactive areas open the post; links and controls retain their native behavior. */
export function ClickablePost({ postId, children, id, refreshing = false }: { postId: string; children: ReactNode; id?: string; refreshing?: boolean }) {
  const router = useRouter();
  function openPost(event: MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target.closest("a, button, input, textarea, select, label, [role='button'], [role='menuitem'], [contenteditable='true']")) return;
    if (window.getSelection()?.toString()) return;
    router.push(`/home/post/${postId}`);
  }
  return <article id={id} tabIndex={id && !refreshing ? -1 : undefined} aria-hidden={refreshing || undefined} inert={refreshing || undefined} className={`${styles.post} ${styles.clickablePost} ${refreshing ? styles.refreshingPost : ""}`} onClick={openPost}>{children}</article>;
}
