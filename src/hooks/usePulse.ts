"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getPusherClient } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";
import type { PusherPayloads } from "@/lib/pusher/server";

export type PulseActivity = PusherPayloads[typeof EVENTS.PULSE_ACTIVITY];
export type PulseDocument  = PusherPayloads[typeof EVENTS.DOCUMENT_PUBLISHED];

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
  const [memberCount,setMemberCount]= useState(0);
  const channelRef = useRef<ReturnType<typeof getPusherClient>["subscribe"] extends (ch: string) => infer C ? C : never | null>(null);

  useEffect(() => {
    let mounted = true;
    let pusher: ReturnType<typeof getPusherClient> | null = null;

    try {
      pusher = getPusherClient();
      const channel = pusher.subscribe(CHANNELS.EXPLORE);
      channelRef.current = channel as any;

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
        setItems((prev) => [item, ...prev].slice(0, maxItems));
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
        setItems((prev) => [item, ...prev].slice(0, maxItems));
        onNewItem?.(item);
      });

    } catch (err) {
      // Pusher not available (SSR, missing keys) — fall back gracefully
      console.warn("[usePulse] Pusher unavailable:", err);
      setConnected(false);
    }

    return () => {
      mounted = false;
      try {
        pusher?.unsubscribe(CHANNELS.EXPLORE);
      } catch {}
    };
  }, [maxItems]);

  const clearItems = useCallback(() => setItems([]), []);

  return { items, connected, memberCount, clearItems };
}