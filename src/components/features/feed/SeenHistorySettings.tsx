"use client";

import { useState } from "react";
import { clearSeen } from "@/lib/feed/seen-posts";

export function SeenHistorySettings({ userId }: { userId: string }) {
  const [message, setMessage] = useState("");
  return <section className="space-y-3 border-t border-border pt-6" aria-labelledby="feed-history-title">
    <div>
      <h3 id="feed-history-title" className="text-sm font-semibold text-foreground">Feed history on this device</h3>
      <p className="mt-1 text-sm text-muted-foreground">For you uses recently viewed post IDs stored in this browser to reduce repetition. They are used for up to seven days and are not synced to other devices. Clearing also removes the saved return position for this feed. You can also use your browser’s site data settings.</p>
    </div>
    <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setMessage(clearSeen(userId) ? "Feed history cleared on this device." : "Could not clear feed history. Check your browser’s site data settings.")}>Clear feed history</button>
    <p role="status" className="text-sm text-muted-foreground">{message}</p>
  </section>;
}
