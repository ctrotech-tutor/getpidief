"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePulse } from "@/hooks/usePulse";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function PulseFeed() {
  const { items, connected } = usePulse({ maxItems: 12 });
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Academic Pulse
          </span>
          {/* Live indicator */}
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                connected ? "bg-(--emerald) animate-pulse" : "bg-muted-foreground"
              )}
            />
            <span className="text-[10px] text-muted-foreground">
              {connected ? "Live" : "Connecting…"}
            </span>
          </span>
        </div>
        <Link
          href="/search?sort=recent"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          See all activity →
        </Link>
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2
                   scrollbar-none [&::-webkit-scrollbar]:hidden"
        aria-label="Recent activity feed"
      >
        {items.length === 0 ? (
          // Skeleton placeholders while waiting for events
          <>
            {[1, 2, 3, 4].map((i) => (
              <PulseCardSkeleton key={i} />
            ))}
          </>
        ) : (
          items.map((item) => (
            <PulseCard key={item.id} item={item} />
          ))
        )}
      </div>
    </section>
  );
}

// ── Pulse card ─────────────────────────────────────────────────────────────

function PulseCard({ item }: { item: ReturnType<typeof usePulse>["items"][0] }) {
  const doc      = item.document;
  const activity = item.activity;

  if (item.type === "published" && doc) {
    return (
      <Link
        href={`/d/${doc.slug}`}
        className="shrink-0 w-64 p-3.5 rounded-xl bg-card border border-border
                   hover:border-border/80 hover:bg-secondary/30 transition-all duration-150
                   animate-in slide-in-from-right-4 duration-150"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M5 1v4M5 5l2 1.5" stroke="var(--color-primary)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-xs text-muted-foreground">New document</span>
          <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(item.timestamp)}</span>
        </div>

        <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
          {doc.title}
        </p>
      </Link>
    );
  }

  if (item.type === "activity" && activity) {
    return (
      <div
        className="shrink-0 w-64 p-3.5 rounded-xl bg-card border border-border
                   animate-in slide-in-from-right-4 duration-300"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <span className="text-[10px]">
              {activity.type === "upload" ? "📄" : activity.type === "follow" ? "👤" : "⭐"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground line-clamp-1 flex-1">
            {activity.description}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(item.timestamp)}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{activity.actorName}</p>
      </div>
    );
  }

  return null;
}

function PulseCardSkeleton() {
  return (
    <div className="shrink-0 w-64 p-3.5 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className="skeleton w-5 h-5 rounded-full" />
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-12 rounded ml-auto" />
      </div>
      <div className="skeleton h-3 w-full rounded mb-1" />
      <div className="skeleton h-3 w-2/3 rounded" />
    </div>
  );
}