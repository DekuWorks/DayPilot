"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api";

/**
 * Subscribes to real-time event updates (created/updated/deleted) and calls onSync when any occur.
 * Use from the calendar (or any events list) to refetch when another tab or device changes events.
 */
export function useEventsSocket(onSync: () => void) {
  const onSyncRef = useRef(onSync);
  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket: Socket = io(getApiUrl(), {
      path: "/ws",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const handleSync = () => {
      onSyncRef.current();
    };

    socket.on("event:created", handleSync);
    socket.on("event:updated", handleSync);
    socket.on("event:deleted", handleSync);

    return () => {
      socket.off("event:created", handleSync);
      socket.off("event:updated", handleSync);
      socket.off("event:deleted", handleSync);
      socket.disconnect();
    };
  }, []);
}
