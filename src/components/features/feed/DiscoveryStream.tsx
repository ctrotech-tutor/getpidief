"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FeedItem } from "@/lib/feed/read";
import { arrangeDiscovery, type DiscoveryCandidate } from "@/lib/feed/discovery-ranking";
import { clearSeen, readSeen, recordSeen } from "@/lib/feed/seen-posts";
import { FeedCard } from "./FeedStream";
import styles from "./feed.module.css";

type Page = { items: FeedItem[] };
async function fetchEvents(ids: string[], signal: AbortSignal): Promise<FeedItem[]> {
  if (!ids.length) return [];
  const query = new URLSearchParams({ view: "latest", events: ids.map(id => `post:${id}`).join(",") });
  const response = await fetch(`/api/feed?${query}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("Unable to load posts.");
  const page = await response.json() as Page;
  const byId = new Map(page.items.filter(item => item.eventKind === "post").map(item => [item.id, item]));
  return ids.flatMap(id => { const item = byId.get(id); return item ? [item] : []; });
}
export function DiscoveryStream({ userId, now, seed }: { userId: string; now: string; seed: { candidates: DiscoveryCandidate[]; items: FeedItem[] } }) {
  const [items, setItems] = useState<FeedItem[]>(seed.items);
  const [hasMore, setHasMore] = useState(seed.candidates.length > 20);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [automatic, setAutomatic] = useState(true);
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(0);
  const candidates = useRef<DiscoveryCandidate[]>(seed.candidates);
  const offset = useRef(Math.min(20, seed.candidates.length));
  const pendingOwn = useRef<DiscoveryCandidate[]>([]);
  const autoCount = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const previousNow = useRef(now);
  const sentinel = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<string | null>(null);
  const restart = useCallback(() => { controller.current?.abort(); busy.current = false; setVersion(value => value + 1); }, []);
  useEffect(() => {
    const active = new AbortController(); controller.current = active; busy.current = true;
    offset.current = 0; autoCount.current = 0; setRefreshing(false); setError(""); setMessage("");
    void (async () => {
      try {
        let pool = seed.candidates;
        if (version > 0) {
          setLoading(true);
          const response = await fetch("/api/feed/discovery", { cache: "no-store", signal: active.signal });
          if (!response.ok) throw new Error("Unable to load discovery.");
          pool = ((await response.json()) as { candidates: DiscoveryCandidate[] }).candidates;
        }
        const seen = new Set(readSeen(userId).map(entry => entry.id));
        const ordered = arrangeDiscovery(pool, seen);
        const sameFirst = version === 0 && ordered.slice(0, 20).every((item, index) => item.id === seed.candidates[index]?.id);
        if (!sameFirst) setLoading(true);
        const first = sameFirst ? seed.items : await fetchEvents(ordered.slice(0, 20).map(item => item.id), active.signal);
        if (active.signal.aborted) return;
        candidates.current = ordered; pendingOwn.current = []; offset.current = Math.min(20, ordered.length);
        setItems(first); setHasMore(offset.current < ordered.length);
      } catch { if (!active.signal.aborted) setError("Couldn’t load discovery. Please try again."); }
      finally { if (controller.current === active) { busy.current = false; controller.current = null; if (!active.signal.aborted) setLoading(false); } }
    })();
    return () => { active.abort(); };
  // A snapshot is intentionally stable across server refreshes; refresh only on explicit restart.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, version]);
  useEffect(() => {
    if (previousNow.current === now) return;
    previousNow.current = now;
    const old = itemsRef.current;
    const existing = new Set(candidates.current.map(item => item.id));
    const addedOwn = seed.candidates.filter(item => item.authorId === userId && !existing.has(item.id)).slice(0, 5);
    if (addedOwn.length) {
      candidates.current = [...addedOwn, ...candidates.current];
      pendingOwn.current = [...addedOwn, ...pendingOwn.current].slice(0, 5);
      offset.current += addedOwn.length;
    }
    const newOwn = pendingOwn.current.filter(item => !old.some(post => post.id === item.id));
    if (!old.length && !newOwn.length) return;
    controller.current?.abort();
    const active = new AbortController(); controller.current = active; busy.current = true; setRefreshing(true); setLoading(false);
    void (async () => {
      try {
        const updated = await fetchEvents([...newOwn.map(item => item.id), ...old.map(item => item.id)], active.signal);
        if (!active.signal.aborted) { pendingOwn.current = []; setItems(updated); }
      } catch { if (!active.signal.aborted) { setItems([]); setHasMore(false); setError("Couldn’t refresh posts. Please try again."); } }
      finally { if (controller.current === active) { controller.current = null; busy.current = false; if (!active.signal.aborted) setRefreshing(false); } }
    })();
  // Keep a browsing snapshot, but insert a newly published own post on refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { const network = navigator as Navigator & { connection?: { saveData?: boolean } }; if (network.connection?.saveData) setAutomatic(false); }, []);
  const load = useCallback(async (isAuto: boolean) => {
    if (busy.current || offset.current >= candidates.current.length) return;
    busy.current = true; setLoading(true); setError("");
    if (isAuto && ++autoCount.current >= 3) setAutomatic(false);
    const active = new AbortController(); controller.current = active;
    try {
      const next = Math.min(offset.current + 20, candidates.current.length);
      const more = await fetchEvents(candidates.current.slice(offset.current, next).map(item => item.id), active.signal);
      if (active.signal.aborted) return;
      offset.current = next;
      if (!isAuto && more.length) focusAfter.current = `feed-post-${more[0].id}`;
      setItems(existing => [...existing, ...more]); setHasMore(next < candidates.current.length);
      setMessage(more.length ? `${more.length} more ${more.length === 1 ? "post" : "posts"} loaded.` : "No more posts in this batch.");
    } catch { if (!active.signal.aborted) { setError("Couldn’t load posts. Please try again."); setAutomatic(false); } }
    finally { if (controller.current === active) { controller.current = null; busy.current = false; if (!active.signal.aborted) setLoading(false); } }
  }, []);
  useEffect(() => { if (focusAfter.current) { document.getElementById(focusAfter.current)?.focus(); focusAfter.current = null; } }, [items]);
  useEffect(() => {
    if (!automatic || !hasMore || loading || refreshing || error || !sentinel.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) void load(true); }, { rootMargin: "400px 0px" });
    observer.observe(sentinel.current); return () => observer.disconnect();
  }, [automatic, hasMore, loading, refreshing, error, load]);
  useEffect(() => {
    if (refreshing || !("IntersectionObserver" in window)) return;
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const clear = () => { for (const timer of timers.values()) clearTimeout(timer); timers.clear(); };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === "visible") {
          if (!timers.has(entry.target)) timers.set(entry.target, setTimeout(() => {
            const id = entry.target.id.replace(/^feed-post-/, ""); recordSeen(userId, id); timers.delete(entry.target); observer.unobserve(entry.target);
          }, 1500));
        } else { const timer = timers.get(entry.target); if (timer) clearTimeout(timer); timers.delete(entry.target); }
      }
    }, { threshold: [0, 0.5] });
    for (const item of items) { const el = document.getElementById(`feed-post-${item.id}`); if (el) observer.observe(el); }
    document.addEventListener("visibilitychange", clear);
    return () => { clear(); observer.disconnect(); document.removeEventListener("visibilitychange", clear); };
  }, [items, userId, refreshing]);
  return <>
    <div className={styles.discoveryControls}>
      <span>Based on recent posts, follows and discussion. Viewed posts on this device are used for up to 7 days.</span>
      <button type="button" onClick={() => { clearSeen(userId); restart(); }}>Clear viewed history</button>
    </div>
    <noscript><p>For more posts, <Link href="/?view=latest">view the latest feed</Link>.</p></noscript>
    <div className={styles.posts}>{items.map(item => <FeedCard key={item.id} post={item} userId={userId} now={now} refreshing={refreshing} />)}</div>
    <div ref={sentinel} className={styles.feedPagination}>
      <span role="status" aria-live="polite">{refreshing ? "Refreshing posts…" : loading ? "Loading posts…" : error || message}</span>
      {error ? <button type="button" className={styles.more} onClick={restart}>Try again</button> : hasMore ? <button type="button" className={styles.more} disabled={loading || refreshing} onClick={() => void load(false)}>Load more</button> : !loading && <p>{items.length ? "You’ve reached the end of this discovery batch." : "No posts to discover yet."} {items.length > 0 && <Link href="/?view=latest">Browse latest posts</Link>}</p>}
      {hasMore && <button type="button" className={styles.autoToggle} onClick={() => { autoCount.current = 0; setAutomatic(value => !value); }}>{automatic ? "Pause automatic loading" : "Resume automatic loading"}</button>}
      {items.length > 0 && <button type="button" className={styles.autoToggle} onClick={restart}>Refresh discovery</button>}
    </div>
  </>;
}
