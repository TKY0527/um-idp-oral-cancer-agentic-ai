"use client";

import type { ScreeningSession, ClinicianReview } from "@/lib/types/screening";

/**
 * Server-backed session store with a synchronous in-memory cache.
 *
 * - When the user is logged in, the source of truth is the server
 *   (GET /api/sessions, scoped by role: patient → own, doctor → all).
 * - localStorage is kept as an offline fallback + fast first paint.
 * - The public API stays SYNCHRONOUS (getAll/getById/add/...) so existing
 *   page components need zero changes; `hydrate()` refreshes from the server
 *   and notifies subscribers when data arrives.
 */

const STORAGE_KEY = "oralscan_sessions_v2";
const MAX_BYTES = 3 * 1024 * 1024;
const PREVIEW_RETAIN_MS = 7 * 24 * 60 * 60 * 1000;

type Listener = () => void;
const listeners = new Set<Listener>();

let cache: ScreeningSession[] | null = null;
let serverBacked = false;
let lastHydrate = 0;
/**
 * Session ids that were added optimistically on this client and may not yet be
 * persisted on the server. We preserve these across a hydrate() replace so a
 * server response that lands before our POST does not erase the just-added
 * session.
 */
const pendingLocal = new Set<string>();

function notify() {
  for (const l of listeners) l();
}

function readLocal(): ScreeningSession[] {
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

function trimToFit(sessions: ScreeningSession[]): ScreeningSession[] {
  const now = Date.now();
  let working = sessions.map((s) => {
    if (
      s.imageMeta?.previewDataUrl &&
      now - new Date(s.finishedAt).getTime() > PREVIEW_RETAIN_MS
    ) {
      return { ...s, imageMeta: { ...s.imageMeta, previewDataUrl: undefined } };
    }
    return s;
  });
  working = [...working].sort(
    (a, b) =>
      new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
  );
  let serialized = JSON.stringify(working);
  for (let i = working.length - 1; i >= 0 && serialized.length > MAX_BYTES; i--) {
    if (working[i].imageMeta?.previewDataUrl) {
      working[i] = {
        ...working[i],
        imageMeta: { ...working[i].imageMeta, previewDataUrl: undefined },
      };
      serialized = JSON.stringify(working);
    }
  }
  while (working.length > 0 && serialized.length > MAX_BYTES) {
    working.pop();
    serialized = JSON.stringify(working);
  }
  return working;
}

function writeLocal(sessions: ScreeningSession[]): void {
  if (typeof window === "undefined") return;
  const trimmed = trimToFit(sessions);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    try {
      const noPreviews = trimmed.map((s) => ({
        ...s,
        imageMeta: { ...s.imageMeta, previewDataUrl: undefined },
      }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(noPreviews));
    } catch {
      /* give up */
    }
  }
}

function ensureCache(): ScreeningSession[] {
  if (cache === null) cache = readLocal();
  return cache;
}

/** Replace cache, persist locally, notify subscribers. */
function commit(next: ScreeningSession[]): void {
  cache = next;
  writeLocal(next);
  notify();
}

export const sessionStore = {
  /** Pull the authoritative list from the server (no-op if not logged in). */
  async hydrate(force = false): Promise<void> {
    if (typeof window === "undefined") return;
    if (!force && Date.now() - lastHydrate < 1500) return; // debounce
    lastHydrate = Date.now();
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" });
      if (res.status === 401) {
        // Anonymous — keep whatever is local.
        serverBacked = false;
        if (cache === null) {
          cache = readLocal();
          notify();
        }
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { sessions?: ScreeningSession[] };
      if (Array.isArray(data.sessions)) {
        serverBacked = true;
        const serverIds = new Set(data.sessions.map((s) => s.sessionId));
        // Any pending local add that the server already has → no longer pending.
        for (const id of pendingLocal) {
          if (serverIds.has(id)) pendingLocal.delete(id);
        }
        // Preserve optimistic local adds the server hasn't caught up on yet.
        const localOnly = (cache ?? []).filter(
          (s) => pendingLocal.has(s.sessionId) && !serverIds.has(s.sessionId)
        );
        commit([...localOnly, ...data.sessions]);
      }
    } catch {
      // Offline — fall back to local cache.
      if (cache === null) {
        cache = readLocal();
        notify();
      }
    }
  },

  isServerBacked(): boolean {
    return serverBacked;
  },

  getAll(): ScreeningSession[] {
    return ensureCache()
      .slice()
      .sort(
        (a, b) =>
          new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
      );
  },

  getById(id: string): ScreeningSession | undefined {
    return ensureCache().find((s) => s.sessionId === id);
  },

  add(session: ScreeningSession): void {
    const all = ensureCache();
    const without = all.filter((s) => s.sessionId !== session.sessionId);
    commit([session, ...without]);
    // Mark as pending until the server confirms it (protects against a
    // concurrent hydrate() replacing the cache before the POST lands).
    pendingLocal.add(session.sessionId);
    void fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
    })
      .then((r) => {
        if (r.ok) {
          // Give the server a beat, then re-pull so doctor/other views sync.
          setTimeout(() => void sessionStore.hydrate(true), 400);
        }
      })
      .catch(() => undefined);
  },

  remove(id: string): void {
    commit(ensureCache().filter((s) => s.sessionId !== id));
  },

  clear(): void {
    commit([]);
  },

  setClinicianReview(id: string, review: ClinicianReview): void {
    const next = ensureCache().map((s) =>
      s.sessionId === id ? { ...s, clinicianReview: review } : s
    );
    commit(next);
    void fetch(`/api/sessions/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review }),
    }).catch(() => undefined);
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
