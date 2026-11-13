"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { FeedProfileAvatar } from "./FeedProfileAvatar";
import { FollowSuggestion } from "./FollowSuggestion";
import { subscribeFollow } from "./follow-updates";
import styles from "./feed.module.css";

type Person = { id: string; username: string | null; displayName: string; avatarUrl: string | null };
type Suggestion = { id: string; username: string | null; display_name: string; avatar_url: string | null };
export type People = { following: { total: number; following: Person[] }; suggestions: Suggestion[] };
export function PeopleRail({ initial }: { initial: People }) {
  const [people, setPeople] = useState(initial);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => { setPeople(initial); }, [initial]);
  useEffect(() => {
    const unsubscribe = subscribeFollow(update => {
      if (update.pending || update.failed) return;
      abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
      void fetch("/api/feed/people", { cache: "no-store", signal: controller.signal }).then(response => { if (!response.ok) throw new Error("Unable to load people"); return response.json() as Promise<People>; }).then(data => { if (!controller.signal.aborted) setPeople(data); }).catch(() => { /* Keep the last rail until navigation or the next successful update. */ });
    });
    return () => { unsubscribe(); abort.current?.abort(); };
  }, []);
  return <>
    <section className={styles.discoveryCard} aria-labelledby="following-accounts-title">
      <div className={styles.discoveryHeading}><h2 id="following-accounts-title">Following</h2>{people.following.total > 0 && <Link href="/dashboard/following">See all <ArrowUpRight size={15} aria-hidden="true" /></Link>}</div>
      {people.following.following.length ? <ul className={styles.followingList}>{people.following.following.map(account => <li key={account.id}><Link className={styles.followingItem} href={`/u/${account.username}`}><FeedProfileAvatar name={account.displayName} avatarUrl={account.avatarUrl} post /><span className={styles.followingDetails}><strong>{account.displayName}</strong><small>@{account.username}</small></span></Link></li>)}</ul> : <div className={styles.resourceEmpty}><p>You’re not following anyone yet.</p><Link href="/explore">Explore <ArrowUpRight size={15} aria-hidden="true" /></Link></div>}
    </section>
    <section className={styles.discoveryCard} aria-labelledby="follow-suggestions-title">
      <div className={styles.discoveryHeading}><h2 id="follow-suggestions-title">Who to follow</h2><Link href="/who-to-follow">See all <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      {people.suggestions.length ? <ul className={styles.followingList}>{people.suggestions.map(account => <li key={account.id} className={styles.suggestionRow}><Link className={styles.followingItem} href={`/u/${account.username}`}><FeedProfileAvatar name={account.display_name} avatarUrl={account.avatar_url} post /><span className={styles.followingDetails}><strong>{account.display_name}</strong><small>@{account.username}</small></span></Link><FollowSuggestion id={account.id} name={account.display_name} /></li>)}</ul> : <div className={styles.resourceEmpty}><p>No suggestions right now.</p></div>}
    </section>
  </>;
}
