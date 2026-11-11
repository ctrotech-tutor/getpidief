"use client";

import { useState, useTransition } from "react";
import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function FollowButton({
  followingId,
  isFollowing: initial,
}: {
  followingId: string;
  isFollowing: boolean;
}) {
  const { isAuthenticated } = useSession();
  const router = useRouter();
  const [error, setError] = useState("");
  const [following, setFollowing] = useState(initial);
  const [isPending, start]        = useTransition();

  async function toggle() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (isPending) return;
    setError("");
    const prev = following;
    setFollowing((v) => !v);
    start(async () => {
      try {
        const response = await fetch("/api/follows", {
          method:  prev ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ followingId }),
        });
        if (!response.ok) throw new Error("Follow request failed");
        router.refresh();
      } catch {
        setFollowing(prev);
        setError("Could not update following. Please try again.");
      }
    });
  }

  return (
    <div>
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={following}
      className={cn(
        "w-full py-2 rounded-xl text-sm font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        following
          ? "bg-secondary border border-border text-foreground hover:border-destructive hover:text-destructive"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        "disabled:opacity-60 disabled:cursor-not-allowed"
      )}
    >
      {following ? "Following" : "Follow"}
    </button>
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}