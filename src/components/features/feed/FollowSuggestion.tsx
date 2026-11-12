"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./feed.module.css";

export function FollowSuggestion({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState("");
  async function follow() {
    if (pending || following) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followingId: id }) });
      if (!response.ok) throw new Error("Follow failed");
      setFollowing(true);
      router.refresh();
    } catch { setError("Could not follow. Try again."); }
    finally { setPending(false); }
  }
  return <div className={styles.suggestionAction}>
    <button type="button" className={styles.suggestionFollow} disabled={pending || following} onClick={follow} aria-label={`${following ? "Following" : "Follow"} ${name}`}>
      {pending ? "Following…" : following ? "Following" : "Follow"}
    </button>
    {error && <span role="alert" className={styles.suggestionError}>{error}</span>}
  </div>;
}
