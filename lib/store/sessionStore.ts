"use client";

import type { ScreeningSession, ClinicianReview } from "@/lib/types/screening";

/**
 * Local-first session store.
 *
 * Persists every screening session to localStorage so:
 *  - Patient can see longitudinal history across reloads
 *  - Doctor queue survives page refreshes
 *  - No backend / database needed for the prototype
 *
 * Wraps the raw storage with a pub-sub so React components can re-render
 * when sessions are added or reviewed.
 */

const STORAGE_KEY = "oralscan_sessions_v2";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

function safeRead(): ScreeningSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(sessions: ScreeningSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Quota exceeded — drop oldest images to make room.
    try {
      const trimmed = sessions.map((s) =>
        s.imageMeta.previewDataUrl
          ? { ...s, imageMeta: { ...s.imageMeta, previewDataUrl: undefined } }
          : s
      );
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // give up
    }
  }
  notify();
}

export const sessionStore = {
  getAll(): ScreeningSession[] {
    return safeRead().sort(
      (a, b) =>
        new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
    );
  },

  getById(id: string): ScreeningSession | undefined {
    return safeRead().find((s) => s.sessionId === id);
  },

  add(session: ScreeningSession): void {
    const all = safeRead();
    const without = all.filter((s) => s.sessionId !== session.sessionId);
    safeWrite([session, ...without]);
  },

  remove(id: string): void {
    safeWrite(safeRead().filter((s) => s.sessionId !== id));
  },

  clear(): void {
    safeWrite([]);
  },

  setClinicianReview(id: string, review: ClinicianReview): void {
    const all = safeRead();
    const next = all.map((s) =>
      s.sessionId === id ? { ...s, clinicianReview: review } : s
    );
    safeWrite(next);
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
