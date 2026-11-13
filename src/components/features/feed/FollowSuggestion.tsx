"use client";

import { useEffect, useState } from "react";
import styles from "./feed.module.css";
import { finishFollow, pendingFollow, startFollow, subscribeFollow } from "./follow-updates";

export function FollowSuggestion({ id, name }: { id: string; name: string }) {
  const [pending, setPending] = useState(() => pendingFollow(id) !== undefined);
  const [following, setFollowing] = useState(() => pendingFollow(id) ?? false);
  const [error, setError] = useState("");
  useEffect(() => subscribeFollow(update => {
    if (update.id !== id) return;
    setFollowing(update.following); setPending(update.pending);
    if (update.failed) setError("Could not follow. Try again.");
  }), [id]);
  async function follow() {
    if (pending || following) return;
    if (!startFollow(id, true)) return;
    setError("");
    try {
      const response = await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followingId: id }) });
      if (!response.ok) throw new Error("Follow failed");
      finishFollow(id, true);
    } catch { finishFollow(id, false, true); }
  }
  return <div className={styles.suggestionAction}>
    <button type="button" className={styles.suggestionFollow} disabled={pending || following} onClick={follow} aria-label={`${following ? "Following" : "Follow"} ${name}`}>
      {pending ? "Following…" : following ? "Following" : "Follow"}
    </button>
    {error && <span role="alert" className={styles.suggestionError}>{error}</span>}
  </div>;
}
