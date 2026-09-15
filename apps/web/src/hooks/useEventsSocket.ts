"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api";
import {
  getNestAccessToken,
  subscribeNestSession,
} from "@/lib/nest-session";

/**
 * Subscribes to real-time event updates (created/updated/deleted) and calls onSync when any occur.
 * Reconnects when the Nest session appears or rotates after background enrich.
 */
export function useEventsSocket(onSync: () => void) {
  const onSyncRef = useRef(onSync);
  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  const [tokenEpoch, setTokenEpoch] = useState(0);
  useEffect(() => {
    return subscribeNestSession(() => {
      setTokenEpoch((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getNestAccessToken();
    if (!token) return;

    const socket: Socket = io(getApiUrl(), {
      path: "/ws",
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    const handleSync = () => {
      onSyncRef.current();
    };

    socket.on("event:created", handleSync);
    socket.on("event:updated", handleSync);
    socket.on("event:deleted", handleSync);
    socket.on("calendar:synced", handleSync);
    socket.on("connect_error", () => {
      // Auth may still be refreshing; calendar refetch on next successful connect.
    });

    return () => {
      socket.off("event:created", handleSync);
      socket.off("event:updated", handleSync);
      socket.off("event:deleted", handleSync);
      socket.off("calendar:synced", handleSync);
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [tokenEpoch]);
}
