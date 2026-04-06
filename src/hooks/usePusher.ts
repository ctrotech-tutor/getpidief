// ─────────────────────────────────────────────────────────────────────────────
// usePusher — subscribe to a Pusher channel with automatic cleanup
// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/usePusher.ts

import { useEffect, useRef } from "react";
import type { Channel } from "pusher-js";
import { getPusherClient } from "@/lib/pusher/server";

export function usePusherChannel(channelName: string) {
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    return () => {
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [channelName]);

  function bind<T>(event: string, callback: (data: T) => void) {
    useEffect(() => {
      const channel = channelRef.current;
      if (!channel) return;
      channel.bind(event, callback);
      return () => { channel.unbind(event, callback); };
    }, [event, callback]);
  }

  return { channel: channelRef, bind };
}
