"use client";

import { useEffect, useRef } from "react";
import { useSession } from "./useSession";
import { useNotificationStore } from "@/stores/index";
import { getPusherClient } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";
import type { Channel } from "pusher-js";

/**
 * Subscribes to the private user channel and updates the notification store
 * with real-time in-app notifications via Pusher.
 *
 * Mount this ONCE in the app layout.
 */
export function useNotifications() {
  const { user, isAuthenticated } = useSession();
  const setUnreadCount   = useNotificationStore((s) => s.setUnreadCount);
  const channelRef = useRef<Channel | null>(null);


  // Fetch initial unread count on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/notifications?count=true")
      .then((r) => r.json())
      .then((json) => {
        if (typeof json.data?.unreadCount === "number") {
          setUnreadCount(json.data.unreadCount);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, setUnreadCount]);

  // Subscribe to private channel
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let pusher: ReturnType<typeof getPusherClient> | null = null;

    try {
      pusher     = getPusherClient();
      const channel = pusher.subscribe(CHANNELS.privateUser(user.id));
      channelRef.current = channel;

      channel.bind(EVENTS.NOTIFICATION, () => {
        // Re-read authorized data instead of trusting content in a queued event.
        fetch("/api/notifications?count=true", { cache: "no-store" })
          .then((r) => r.json())
          .then((json) => {
            if (typeof json.data?.unreadCount === "number") setUnreadCount(json.data.unreadCount);
          })
          .catch(() => {});
      });

    } catch {
      // Pusher unavailable — silent fail
    }

    return () => {
      try {
        pusher?.unsubscribe(CHANNELS.privateUser(user?.id ?? ""));
      } catch {}
    };
  }, [isAuthenticated, user?.id, setUnreadCount]);
}