"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getPusherClient } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";

export type PulseActivity = {
  type: "upload" | "follow" | "milestone"; actorId: string; actorName: string;
  actorAvatarUrl: string | null; institutionId: string | null; description: string;
  entityId: string; createdAt: string;
};
export type PulseDocument = {
  documentId: string; slug: string; title: string; authorId: string;
  thumbnailUrl: string | null; categoryId: string | null; institutionId: string | null; publishedAt: string;
};
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

  const requestVersion = useRef(0);
  const knownIds = useRef<Set<string> | null>(null);
  const onNewItemRef = useRef(onNewItem);
  useEffect(() => { onNewItemRef.current = onNewItem; }, [onNewItem]);

  const refreshFromApi = useCallback(async () => {
    const version = ++requestVersion.current;
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
      if (version !== requestVersion.current) return;
      if (knownIds.current) {
        for (const item of parsed) if (!knownIds.current.has(item.id)) onNewItemRef.current?.(item);
      }
      knownIds.current = new Set(parsed.map(item => item.id));
      // Replace rather than merge: accounts blocked since the previous response
      // must not remain visible in client state.
      setItems(parsed.slice(0, maxItems));
    } catch {
      // silent fallback
    }
  }, [maxItems]);

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

      // Shared public events never contain account data; refresh through the
      // viewer-aware API. Ignore payloads from older deployed workers too.
      channel.bind(EVENTS.DOCUMENT_PUBLISHED, () => { if (mounted) void refreshFromApi(); });
      channel.bind(EVENTS.PULSE_ACTIVITY, () => { if (mounted) void refreshFromApi(); });

    } catch (err) {
      // Pusher not available (SSR, missing keys) — fall back gracefully
      console.warn("[usePulse] Pusher unavailable:", err);
    }

    return () => {
      mounted = false;
      requestVersion.current++;
      clearTimeout(initialTimer);
      clearInterval(interval);
      try {
        pusher?.unsubscribe(CHANNELS.EXPLORE);
      } catch {}
    };
  }, [refreshFromApi]);

  const clearItems = useCallback(() => setItems([]), []);

  return { items, connected, memberCount, clearItems };
}