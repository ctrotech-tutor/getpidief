"use client";

import { useEffect, useRef } from "react";
import { useSession } from "./useSession";
import { useNotificationStore } from "@/stores/index";
import { getPusherClient } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/server";

/**
 * Subscribes to the private user channel and updates the notification store
 * with real-time in-app notifications via Pusher.
 *
 * Mount this ONCE in the app layout.
 */
export function useNotifications() {
  const { user, isAuthenticated } = useSession();
  const addNotification  = useNotificationStore((s) => s.addRealtimeNotification);
  const setUnreadCount   = useNotificationStore((s) => s.setUnreadCount);
  const channelRef = useRef<any>(null);

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

      channel.bind(EVENTS.NOTIFICATION, (data: any) => {
        addNotification({
          id:        data.id,
          type:      data.type,
          title:     data.title,
          message:   data.message,
          metadata:  data.metadata,
          isRead:    false,
          createdAt: data.createdAt,
        });
      });

    } catch {
      // Pusher unavailable — silent fail
    }

    return () => {
      try {
        pusher?.unsubscribe(CHANNELS.privateUser(user?.id ?? ""));
      } catch {}
    };
  }, [isAuthenticated, user?.id, addNotification]);
}