"use client";

import { useEffect, useState } from "react";
import { Heart, Repeat } from "@phosphor-icons/react";
import { setRepost, toggleLike } from "@/app/(app)/home/actions";
import styles from "./feed.module.css";

type Kind = "like" | "repost";
type ReactionEvent = { key: string; active: boolean; delta: number; pending: boolean; error?: boolean };
const listeners = new Set<(event: ReactionEvent) => void>();
const pendingKeys = new Map<string, { active: boolean; delta: number }>();
function publish(event: ReactionEvent) { for (const listener of listeners) listener(event); }

/** Synchronize repeated appearances of a post without refreshing the feed. */
export function InstantReaction({ kind, postId, author, initialActive, count }: { kind: Kind; postId: string; author: string; initialActive: boolean; count: number }) {
  const key = `${kind}:${postId}`;
  const [active, setActive] = useState(() => pendingKeys.get(key)?.active ?? initialActive);
  const [total, setTotal] = useState(() => Math.max(0, count + (pendingKeys.get(key)?.delta ?? 0)));
  const [pending, setPending] = useState(() => pendingKeys.has(key));
  const [error, setError] = useState(false);
  useEffect(() => { if (!pendingKeys.has(key)) { setActive(initialActive); setTotal(count); } }, [key, initialActive, count]);
  useEffect(() => {
    const listener = (event: ReactionEvent) => {
      if (event.key !== key) return;
      setActive(event.active); setTotal(value => Math.max(0, value + event.delta)); setPending(event.pending); setError(!!event.error);
    };
    listeners.add(listener); return () => { listeners.delete(listener); };
  }, [key]);
  async function toggle() {
    if (pendingKeys.has(key)) return;
    const next = !active;
    const delta = next ? 1 : -1;
    pendingKeys.set(key, { active: next, delta });
    publish({ key, active: next, delta, pending: true });
    try {
      const form = new FormData(); form.set("postId", postId);
      if (kind === "like") { form.set("active", String(active)); await toggleLike(form); }
      else { form.set("repost", String(next)); await setRepost(form); }
      pendingKeys.delete(key); publish({ key, active: next, delta: 0, pending: false });
    } catch {
      pendingKeys.delete(key); publish({ key, active, delta: -delta, pending: false, error: true });
    }
  }
  const label = kind === "like" ? `${active ? "Unlike" : "Like"} post by ${author}` : `${active ? "Undo repost of" : "Repost"} post by ${author}`;
  return <span className={styles.repostControl}><button type="button" className={`${styles.action} ${active ? styles.actionActive : ""}`} aria-disabled={pending} aria-pressed={active} aria-label={label} onClick={toggle}>{kind === "like" ? <Heart size={19} aria-hidden="true" weight={active ? "fill" : "regular"} /> : <Repeat size={19} aria-hidden="true" />}<span>{total}</span></button>{error && <span role="alert" className={styles.repostError}>Could not update {kind}. Please try again.</span>}</span>;
}
