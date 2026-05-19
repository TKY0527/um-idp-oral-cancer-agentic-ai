"use client";

import { useEffect, useState } from "react";
import type { ScreeningSession } from "@/lib/types/screening";
import { sessionStore } from "./sessionStore";

/**
 * React hook that subscribes a component to the session store.
 * Re-renders whenever sessions are added, removed, or reviewed.
 */
export function useSessionStore(): ScreeningSession[] {
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  useEffect(() => {
    setSessions(sessionStore.getAll());
    const unsub = sessionStore.subscribe(() => {
      setSessions(sessionStore.getAll());
    });
    return unsub;
  }, []);
  return sessions;
}

export function useSession(id: string): ScreeningSession | undefined {
  const [s, setS] = useState<ScreeningSession | undefined>();
  useEffect(() => {
    const refresh = () => setS(sessionStore.getById(id));
    refresh();
    return sessionStore.subscribe(refresh);
  }, [id]);
  return s;
}
