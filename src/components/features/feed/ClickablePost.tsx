"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import styles from "./feed.module.css";

/** Non-interactive areas open the post; links and controls retain their native behavior. */
export function ClickablePost({ postId, children }: { postId: string; children: ReactNode }) {
  const router = useRouter();
  function openPost(event: MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target.closest("a, button, input, textarea, select, label, [role='button'], [role='menuitem'], [contenteditable='true']")) return;
    if (window.getSelection()?.toString()) return;
    router.push(`/home/post/${postId}`);
  }
  return <article className={`${styles.post} ${styles.clickablePost}`} onClick={openPost}>{children}</article>;
}
