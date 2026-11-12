"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, ChatCircle, Repeat } from "@phosphor-icons/react";
import type { FeedItem, FeedView } from "@/lib/feed/read";
import { formatPostTime } from "@/lib/feed/post-time";
import { deletePost, toggleLike } from "@/app/(app)/home/actions";
import { ClickablePost } from "./ClickablePost";
import { FeedProfileAvatar } from "./FeedProfileAvatar";
import { PostOptions } from "./PostOptions";
import { PostShare } from "./PostShare";
import { RepostButton } from "./RepostButton";
import styles from "./feed.module.css";

type Page = { items: FeedItem[]; hasMore: boolean };
function cursorUrl(view: FeedView, item: FeedItem, endpoint: string) {
  const params = new URLSearchParams({ view, before: item.eventId, beforeKind: item.eventKind, beforeAt: item.eventAt });
  return `${endpoint}?${params}`;
}
export function FeedCard({ post, userId, now, refreshing }: { post: FeedItem; userId: string; now: string; refreshing: boolean }) {
  const date = new Date(post.createdAt);
  return <ClickablePost postId={post.id} id={`feed-${post.eventKind}-${post.eventId}`} refreshing={refreshing}>
    {post.eventKind === "repost" && <div className={styles.repostAttribution}><Repeat size={15} aria-hidden="true" /><Link href={`/u/${post.reposterUsername}`}>{post.reposterName}</Link> reposted</div>}
    <div className={styles.postTop}><FeedProfileAvatar name={post.name} avatarUrl={post.avatarUrl} post /><div className={styles.author}><Link href={`/u/${post.username}`}>{post.name}</Link><time className={styles.postTime} dateTime={date.toISOString()} title={date.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}>{formatPostTime(date, new Date(now))}</time></div><PostOptions postId={post.id} authorId={post.authorId} author={post.name} ownPost={post.authorId === userId} initiallyFollowing={post.following} initiallySaved={post.saved} /></div>
    <p className={styles.postBody}><Link href={`/home/post/${post.id}`} className={styles.postBodyLink} aria-label={`Open post by ${post.name}`}>{post.body}</Link></p>
    <div className={styles.actions}><form action={toggleLike}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="active" value={String(post.liked)}/><button className={`${styles.action} ${post.liked ? styles.actionActive : ""}`} aria-pressed={post.liked} aria-label={`${post.liked ? "Unlike" : "Like"} post by ${post.name}`}><Heart size={19} aria-hidden="true" weight={post.liked ? "fill" : "regular"}/><span>{post.likeCount}</span></button></form>
      <Link className={styles.action} href={`/home/post/${post.id}`} aria-label={`Open discussion on post by ${post.name}, ${post.replyCount} replies`}><ChatCircle size={17} aria-hidden="true" />{post.replyCount}</Link>
      <RepostButton postId={post.id} author={post.name} initiallyReposted={post.reposted} count={post.repostCount} /><PostShare postId={post.id} author={post.name} />
      {post.authorId === userId && <form action={deletePost} className={styles.delete}><input type="hidden" name="postId" value={post.id}/><button>Delete</button></form>}
    </div>
    {post.replies.length > 0 && <div className={styles.replies}>{post.replies.map(r => <p key={r.id} className={styles.reply}><Link href={`/u/${r.username}`}><strong>{r.name}</strong></Link> {r.body}</p>)}<Link className={styles.action} href={`/home/post/${post.id}`}>{post.replyCount > 2 ? `View all ${post.replyCount} replies` : "Join the conversation"}</Link></div>}
  </ClickablePost>;
}

export function FeedStream({ initial, userId, view, now }: { initial: Page; userId: string; view: FeedView; now: string }) {
  const [extra, setExtra] = useState<FeedItem[]>([]);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [tail, setTail] = useState<FeedItem | undefined>(initial.items.at(-1));
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [automatic, setAutomatic] = useState(true);
  const [autoPaused, setAutoPaused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const initialRef = useRef(initial);
  const extraRef = useRef(extra);
  const pendingRefresh = useRef<FeedItem[]>([]);
  extraRef.current = extra;
  const focusAfterLoad = useRef<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const inflight = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const autoCount = useRef(0);
  const items = [...initial.items, ...extra.filter(item => !initial.items.some(x => x.eventId === item.eventId && x.eventKind === item.eventKind))];
  const last = tail;
  const atCapacity = extra.length >= 100;
  useEffect(() => {
    if (initialRef.current === initial) return;
    const oldInitial = initialRef.current;
    initialRef.current = initial;
    abort.current?.abort(); inflight.current = false;
    setLoading(false); setError(""); setAnnouncement(""); autoCount.current = 0; setAutoPaused(false);
    const currentKeys = new Set(initial.items.map(item => `${item.eventKind}:${item.eventId}`));
    const previousByKey = new Map<string, FeedItem>();
    for (const item of [...oldInitial.items, ...pendingRefresh.current, ...extraRef.current]) {
      const key = `${item.eventKind}:${item.eventId}`;
      if (!currentKeys.has(key) && !previousByKey.has(key)) previousByKey.set(key, item);
    }
    const allPrevious = [...previousByKey.values()];
    const previous = allPrevious.slice(0, 140);
    if (allPrevious.length > previous.length) { setTail(previous.at(-1)); setHasMore(true); }
    pendingRefresh.current = previous;
    setHasMore(value => value || initial.hasMore);
    if (!previous.length) { pendingRefresh.current = []; setHasMore(initial.hasMore); setTail(initial.items.at(-1)); setRefreshing(false); return; }
    const controller = new AbortController(); abort.current = controller;
    inflight.current = true; setRefreshing(true);
    const params = new URLSearchParams({ view, events: previous.map(item => `${item.eventKind}:${item.eventId}`).join(",") });
    void (async () => {
      try {
        const response = await fetch(`/api/feed?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unable to refresh posts.");
        const page = await response.json() as Page;
        if (controller.signal.aborted) return;
        const byKey = new Map(page.items.map(item => [`${item.eventKind}:${item.eventId}`, item]));
        const updatedItems = previous.flatMap(item => { const updated = byKey.get(`${item.eventKind}:${item.eventId}`); return updated ? [updated] : []; });
        // Retain a bounded DOM; if there are too many, continue from the last retained event.
        if (updatedItems.length > 120) { setTail(updatedItems[119]); setHasMore(true); }
        setExtra(updatedItems.slice(0, 120));
      } catch {
        if (!controller.signal.aborted) { setExtra([]); setTail(initial.items.at(-1)); setHasMore(initial.hasMore); setError("Couldn’t refresh older posts. Load them again."); setAutomatic(false); }
      } finally {
        if (abort.current === controller) { abort.current = null; inflight.current = false; pendingRefresh.current = []; if (!controller.signal.aborted) setRefreshing(false); }
      }
    })();
  }, [initial, view]);
  useEffect(() => {
    if (!focusAfterLoad.current) return;
    document.getElementById(focusAfterLoad.current)?.focus();
    focusAfterLoad.current = null;
  }, [extra]);
  useEffect(() => { const network = navigator as Navigator & { connection?: { saveData?: boolean } }; if (network.connection?.saveData) setAutomatic(false); return () => abort.current?.abort(); }, []);
  const load = useCallback(async (isAuto = false) => {
    if (!last || !hasMore || inflight.current) return;
    inflight.current = true; setLoading(true); setError("");
    if (isAuto && ++autoCount.current >= 3) setAutoPaused(true);
    const controller = new AbortController(); abort.current = controller;
    try {
      const response = await fetch(cursorUrl(view, last, "/api/feed"), { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unable to load posts.");
      const page = await response.json() as Page;
      if (controller.signal.aborted) return;
      if (!isAuto && page.items.length) focusAfterLoad.current = `feed-${page.items[0].eventKind}-${page.items[0].eventId}`;
      setExtra(existing => { const seen = new Set([...initial.items, ...existing].map(item => `${item.eventKind}:${item.eventId}`)); return [...existing, ...page.items.filter(item => !seen.has(`${item.eventKind}:${item.eventId}`))]; });
      if (page.items.length) setTail(page.items.at(-1));
      setHasMore(page.hasMore); setAnnouncement(page.items.length ? `${page.items.length} more ${page.items.length === 1 ? "post" : "posts"} loaded.` : "No more posts.");
    } catch {
      if (!controller.signal.aborted) { setError("Couldn’t load posts. Please try again."); setAutomatic(false); }
    } finally { if (abort.current === controller) { abort.current = null; inflight.current = false; if (!controller.signal.aborted) setLoading(false); } }
  }, [last, hasMore, view, initial.items]);
  useEffect(() => {
    if (!automatic || autoPaused || atCapacity || refreshing || !hasMore || loading || error || !sentinel.current || !("IntersectionObserver" in window) || autoCount.current >= 3) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) void load(true); }, { rootMargin: "400px 0px" });
    observer.observe(sentinel.current); return () => observer.disconnect();
  }, [automatic, autoPaused, atCapacity, refreshing, hasMore, loading, error, load]);
  return <>
    <div className={styles.posts}>{items.map(post => <FeedCard key={`${post.eventKind}:${post.eventId}`} post={post} userId={userId} now={now} refreshing={refreshing && extra.some(item => item.eventId === post.eventId && item.eventKind === post.eventKind) && !initial.items.some(item => item.eventId === post.eventId && item.eventKind === post.eventKind)} />)}</div>
    <div ref={sentinel} className={styles.feedPagination}>
      <span role="status" aria-live="polite">{refreshing ? "Refreshing posts…" : loading ? "Loading posts…" : error || announcement}</span>
      {hasMore && last && <a href={cursorUrl(view, last, "/")} className={styles.more} aria-disabled={loading || refreshing} onClick={event => { if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; if (atCapacity && !loading && !refreshing) return; event.preventDefault(); if (!loading && !refreshing) { autoCount.current = 0; void load(); } }}>{atCapacity ? "Continue browsing" : error ? "Try again" : "Load more"}</a>}
      {hasMore && !atCapacity && <button type="button" className={styles.autoToggle} onClick={() => { autoCount.current = 0; if (autoPaused) { setAutoPaused(false); setAutomatic(true); } else setAutomatic(value => !value); }}>{automatic && !autoPaused ? "Pause automatic loading" : "Resume automatic loading"}</button>}
      {!hasMore && extra.length > 0 && <p>You’re all caught up.</p>}
    </div>
  </>;
}
