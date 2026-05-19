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
/** Hard cap on persisted size — roughly 60 % of typical 5 MB quota. */
const MAX_BYTES = 3 * 1024 * 1024;
/** Max age (ms) for keeping the full data URL preview — older sessions drop the image. */
const PREVIEW_RETAIN_MS = 7 * 24 * 60 * 60 * 1000;

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

/**
 * Image-aware trimming strategy:
 *  1. Drop preview images on sessions older than PREVIEW_RETAIN_MS.
 *  2. Drop preview images from oldest sessions first.
 *  3. If still too big, drop the oldest sessions entirely.
 */
function trimToFit(sessions: ScreeningSession[]): ScreeningSession[] {
  const now = Date.now();
  let working = sessions.map((s) => {
    if (
      s.imageMeta.previewDataUrl &&
      now - new Date(s.finishedAt).getTime() > PREVIEW_RETAIN_MS
    ) {
      return { ...s, imageMeta: { ...s.imageMeta, previewDataUrl: undefined } };
    }
    return s;
  });

  // newest first for prioritization
  working = [...working].sort(
    (a, b) =>
      new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
  );

  // Step 2: progressively strip previews from oldest until under cap.
  let serialized = JSON.stringify(working);
  for (let i = working.length - 1; i >= 0 && serialized.length > MAX_BYTES; i--) {
    if (working[i].imageMeta.previewDataUrl) {
      working[i] = {
        ...working[i],
        imageMeta: { ...working[i].imageMeta, previewDataUrl: undefined },
      };
      serialized = JSON.stringify(working);
    }
  }

  // Step 3: drop oldest sessions entirely if still too big.
  while (working.length > 0 && serialized.length > MAX_BYTES) {
    working.pop();
    serialized = JSON.stringify(working);
  }

  return working;
}

function safeWrite(sessions: ScreeningSession[]): void {
  if (typeof window === "undefined") return;
  const trimmed = trimToFit(sessions);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Last-resort: drop ALL previews and try again.
    try {
      const noPreviews = trimmed.map((s) => ({
        ...s,
        imageMeta: { ...s.imageMeta, previewDataUrl: undefined },
      }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(noPreviews));
    } catch {
      // give up — but at least notify subscribers so UI updates.
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
