"use client";

import { useEffect, useState } from "react";
import type { ScreeningSession } from "@/lib/types/screening";
import { sessionStore } from "./sessionStore";

/**
 * React hook that subscribes a component to the session store.
 * Re-renders whenever sessions are added, removed, or reviewed, and pulls the
 * authoritative list from the server on mount.
 *
 * @param pollMs  optional auto-refresh interval (used by the live doctor queue)
 */
export function useSessionStore(pollMs?: number): ScreeningSession[] {
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  useEffect(() => {
    setSessions(sessionStore.getAll());
    const unsub = sessionStore.subscribe(() => {
      setSessions(sessionStore.getAll());
    });
    void sessionStore.hydrate(true);
    let timer: ReturnType<typeof setInterval> | undefined;
    if (pollMs && pollMs > 0) {
      timer = setInterval(() => void sessionStore.hydrate(true), pollMs);
    }
    return () => {
      unsub();
      if (timer) clearInterval(timer);
    };
  }, [pollMs]);
  return sessions;
}

export function useSession(id: string): ScreeningSession | undefined {
  const [s, setS] = useState<ScreeningSession | undefined>();
  useEffect(() => {
    const refresh = () => setS(sessionStore.getById(id));
    refresh();
    const unsub = sessionStore.subscribe(refresh);
    void sessionStore.hydrate(true);
    return unsub;
  }, [id]);
  return s;
}
