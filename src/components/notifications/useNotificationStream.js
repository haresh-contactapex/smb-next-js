"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, CHANGED_EVENT, RECEIVED_EVENT } from "./helpers";

const TOPBAR_LIMIT = 15;
const POLL_DISCONNECTED_MS = 10_000;
const POLL_CONNECTED_MS = 120_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * Topbar state: latest notifications + server-calculated unread count, kept
 * fresh by a WebSocket when NOTIFICATIONS_WS_URL is configured. Anything the
 * socket might have missed (disconnects, sleeping laptop, WS not deployed) is
 * recovered by refetching on every (re)connect, tab focus and a poll timer.
 */
export default function useNotificationStream() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const connectedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api(`/api/notifications?pageSize=${TOPBAR_LIMIT}`);
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Keep whatever is showing; the next tick retries.
    } finally {
      setLoaded(true);
    }
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const data = await api("/api/notifications/unread-count");
      setUnreadCount(data.unreadCount);
    } catch {
      // Next refresh corrects it.
    }
  }, []);

  // Edits made from the bell or the full page.
  useEffect(() => {
    window.addEventListener(CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHANGED_EVENT, refresh);
  }, [refresh]);

  // Instant feedback for the admin's own actions: after any successful write
  // to another /api route (product saved, order updated, ...), pull the fresh
  // list shortly after the server has logged the activity.
  useEffect(() => {
    const originalFetch = window.fetch;
    let timer;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const [input, init] = args;
        const url = typeof input === "string" ? input : input?.url || "";
        const method = (init?.method || input?.method || "GET").toUpperCase();
        if (method !== "GET" && response.ok && /\/api\//.test(url) && !/\/api\/notifications/.test(url)) {
          clearTimeout(timer);
          timer = setTimeout(refresh, 600);
        }
      } catch {
        // Never let bookkeeping break the caller's request.
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
      clearTimeout(timer);
    };
  }, [refresh]);

  useEffect(() => {
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useEffect(() => {
    let timer;
    const tick = () => {
      refresh();
      timer = setTimeout(tick, connectedRef.current ? POLL_CONNECTED_MS : POLL_DISCONNECTED_MS);
    };
    timer = setTimeout(tick, POLL_DISCONNECTED_MS);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    let socket;
    let retryTimer;
    let countTimer;
    let attempt = 0;
    let stopped = false;

    const scheduleRetry = () => {
      if (stopped) return;
      const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS) + Math.random() * 500;
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
    };

    async function connect() {
      if (stopped) return;
      let config;
      try {
        config = await api("/api/notifications/ws-token");
      } catch {
        return scheduleRetry();
      }
      if (!config.enabled || stopped) return; // polling only

      socket = new WebSocket(config.url);
      socket.onopen = () => socket.send(JSON.stringify({ type: "auth", ticket: config.ticket }));
      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === "ready") {
          attempt = 0;
          connectedRef.current = true;
          refresh(); // catch up on anything missed while disconnected
        } else if (message.type === "notification") {
          const n = message.notification;
          setItems((current) => [n, ...current.filter((item) => item.id !== n.id)].slice(0, TOPBAR_LIMIT));
          clearTimeout(countTimer);
          countTimer = setTimeout(refreshCount, 250); // authoritative count from the server
          window.dispatchEvent(new CustomEvent(RECEIVED_EVENT, { detail: n }));
        }
      };
      socket.onclose = () => {
        connectedRef.current = false;
        scheduleRetry();
      };
      socket.onerror = () => socket.close();
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(countTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [refresh, refreshCount]);

  return { items, unreadCount, loaded, refresh, setItems, setUnreadCount };
}
