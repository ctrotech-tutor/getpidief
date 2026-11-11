"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getPusherClient } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";
import type { PusherPayloads } from "@/lib/pusher/server";

export type PulseActivity = PusherPayloads[typeof EVENTS.PULSE_ACTIVITY];
export type PulseDocument  = PusherPayloads[typeof EVENTS.DOCUMENT_PUBLISHED];
type PulseApiItem = {
  id: string;
  type: "activity" | "published";
  timestamp?: string;
  publishedAt?: string;
  activity?: PulseActivity;
  documentId?: string;
  slug?: string;
  title?: string;
  authorId?: string;
  thumbnailUrl?: string | null;
  categoryId?: string | null;
  institutionId?: string | null;
};

interface PulseItem {
  id:          string;
  type:        "activity" | "published";
  timestamp:   Date;
  activity?:   PulseActivity;
  document?:   PulseDocument;
}

interface UsePulseOptions {
  maxItems?:   number;
  onNewItem?:  (item: PulseItem) => void;
}

export function usePulse({ maxItems = 20, onNewItem }: UsePulseOptions = {}) {
  const [items,      setItems]      = useState<PulseItem[]>([]);
  const [connected,  setConnected]  = useState(false);
  const [memberCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof getPusherClient>["subscribe"] extends (ch: string) => infer C ? C : never | null>(null);

  const mergeItems = useCallback((incoming: PulseItem[]) => {
    setItems((prev) => {
      const merged = [...incoming, ...prev];
      const unique = new Map<string, PulseItem>();
      for (const item of merged) {
        if (!unique.has(item.id)) unique.set(item.id, item);
      }
      return [...unique.values()]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, maxItems);
    });
  }, [maxItems]);

  const refreshFromApi = useCallback(async () => {
    try {
      const res = await fetch(`/api/pulse?limit=${Math.min(maxItems, 20)}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const payload = (json?.data?.items ?? []) as PulseApiItem[];
      const parsed: PulseItem[] = payload.map((it) => ({
        id: it.id,
        type: it.type,
        timestamp: new Date(it.timestamp ?? it.publishedAt ?? Date.now()),
        activity: it.activity,
        document: it.type === "published"
          ? {
              documentId: it.documentId ?? "",
              slug: it.slug ?? "",
              title: it.title ?? "",
              authorId: it.authorId ?? "",
              thumbnailUrl: it.thumbnailUrl ?? null,
              categoryId: it.categoryId ?? null,
              institutionId: it.institutionId ?? null,
              publishedAt: it.publishedAt ?? new Date().toISOString(),
            }
          : undefined,
      }));
      mergeItems(parsed);
    } catch {
      // silent fallback
    }
  }, [maxItems, mergeItems]);

  useEffect(() => {
    let mounted = true;
    let pusher: ReturnType<typeof getPusherClient> | null = null;

    const initialTimer = setTimeout(() => {
      void refreshFromApi();
    }, 0);
    const interval = setInterval(() => {
      void refreshFromApi();
    }, 30000);

    try {
      pusher = getPusherClient();
      const channel = pusher.subscribe(CHANNELS.EXPLORE);
      channelRef.current = channel;

      channel.bind("pusher:subscription_succeeded", () => {
        if (mounted) setConnected(true);
      });

      channel.bind("pusher:subscription_error", () => {
        if (mounted) setConnected(false);
      });

      channel.bind(EVENTS.DOCUMENT_PUBLISHED, (data: PulseDocument) => {
        if (!mounted) return;
        const item: PulseItem = {
          id:        `pub-${data.documentId}-${Date.now()}`,
          type:      "published",
          timestamp: new Date(),
          document:  data,
        };
        mergeItems([item]);
        onNewItem?.(item);
      });

      channel.bind(EVENTS.PULSE_ACTIVITY, (data: PulseActivity) => {
        if (!mounted) return;
        const item: PulseItem = {
          id:        `act-${data.actorId}-${Date.now()}`,
          type:      "activity",
          timestamp: new Date(),
          activity:  data,
        };
        mergeItems([item]);
        onNewItem?.(item);
      });

    } catch (err) {
      // Pusher not available (SSR, missing keys) — fall back gracefully
      console.warn("[usePulse] Pusher unavailable:", err);
    }

    return () => {
      mounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      try {
        pusher?.unsubscribe(CHANNELS.EXPLORE);
      } catch {}
    };
  }, [maxItems, mergeItems, onNewItem, refreshFromApi]);

  const clearItems = useCallback(() => setItems([]), []);

  return { items, connected, memberCount, clearItems };
}