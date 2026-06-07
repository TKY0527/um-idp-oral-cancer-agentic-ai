/**
 * Tiny KV storage adapter.
 *
 * On Vercel, add the "KV" / Upstash Redis integration — it injects either
 *   KV_REST_API_URL + KV_REST_API_TOKEN            (Vercel KV naming)
 * or
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Upstash naming)
 *
 * This module speaks the Upstash REST protocol directly with `fetch` (no SDK
 * dependency, edge + node compatible). When no credentials are present it
 * falls back to an in-process Map so local `npm run dev` works without any
 * setup (data is NOT shared across serverless invocations in that mode — it
 * is purely a dev convenience).
 */

function restConfig(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    "";
  if (url && token) return { url: url.replace(/\/$/, ""), token };
  return null;
}

export function kvIsRemote(): boolean {
  return restConfig() !== null;
}

// ── In-memory fallback (dev only) ───────────────────────────────────────────
type MemValue = string | string[];
const mem = new Map<string, MemValue>();

let warnedOnce = false;
function warnMem() {
  if (!warnedOnce) {
    warnedOnce = true;
    console.warn(
      "[kv] No KV_REST_API_URL / UPSTASH_REDIS_REST_URL configured — using in-memory store (data will NOT persist or be shared). Add the Vercel KV integration for production."
    );
  }
}

// ── Upstash REST command runner ─────────────────────────────────────────────
async function cmd<T = unknown>(args: (string | number)[]): Promise<T> {
  const cfg = restConfig();
  if (!cfg) {
    warnMem();
    return runMem(args) as T;
  }
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    // KV reads/writes must never be cached.
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`KV command failed ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { result?: T; error?: string };
  if (json.error) throw new Error(`KV error: ${json.error}`);
  return json.result as T;
}

// Minimal in-memory implementation of the commands we use.
function runMem(args: (string | number)[]): unknown {
  const op = String(args[0]).toUpperCase();
  switch (op) {
    case "GET":
      return (mem.get(String(args[1])) as string) ?? null;
    case "SET": {
      const key = String(args[1]);
      const rest = args.slice(3).map((a) => String(a).toUpperCase());
      // Support SET key val NX [EX n]
      if (rest.includes("NX") && mem.has(key)) return null;
      mem.set(key, String(args[2]));
      return "OK";
    }
    case "EVAL": {
      // We only ever run the atomic dedupe-then-prepend script:
      //   LREM key 0 value ; LPUSH key value
      // args = ["EVAL", script, 1, key, value]
      const key = String(args[3]);
      const value = String(args[4]);
      const list = (mem.get(key) as string[]) ?? [];
      const filtered = list.filter((x) => x !== value);
      filtered.unshift(value);
      mem.set(key, filtered);
      return filtered.length;
    }
    case "DEL": {
      let n = 0;
      for (let i = 1; i < args.length; i++)
        if (mem.delete(String(args[i]))) n++;
      return n;
    }
    case "LPUSH": {
      const key = String(args[1]);
      const list = (mem.get(key) as string[]) ?? [];
      for (let i = 2; i < args.length; i++) list.unshift(String(args[i]));
      mem.set(key, list);
      return list.length;
    }
    case "LREM": {
      const key = String(args[1]);
      const val = String(args[3]);
      const list = (mem.get(key) as string[]) ?? [];
      const filtered = list.filter((x) => x !== val);
      mem.set(key, filtered);
      return list.length - filtered.length;
    }
    case "LRANGE": {
      const key = String(args[1]);
      const start = Number(args[2]);
      const stop = Number(args[3]);
      const list = (mem.get(key) as string[]) ?? [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    }
    case "EXISTS":
      return mem.has(String(args[1])) ? 1 : 0;
    default:
      throw new Error(`In-memory KV does not implement ${op}`);
  }
}

// ── Typed helpers ───────────────────────────────────────────────────────────
export async function kvGet<T>(key: string): Promise<T | null> {
  const raw = await cmd<string | null>(["GET", key]);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await cmd(["SET", key, JSON.stringify(value)]);
}

export async function kvDel(key: string): Promise<void> {
  await cmd(["DEL", key]);
}

export async function kvExists(key: string): Promise<boolean> {
  return (await cmd<number>(["EXISTS", key])) === 1;
}

/**
 * Atomically set a key only if it does not already exist (SET NX).
 * Returns true if the key was newly set, false if it already existed.
 * Used for idempotency guards (e.g. Telegram update dedupe).
 */
export async function kvSetNx(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<boolean> {
  const args: (string | number)[] = ["SET", key, JSON.stringify(value), "NX"];
  if (ttlSeconds && ttlSeconds > 0) args.push("EX", ttlSeconds);
  const res = await cmd<string | null>(args);
  return res === "OK";
}

/**
 * Push an id onto the front of a list (newest first), de-duped — ATOMICALLY.
 * Uses a single Lua EVAL so the LREM+LPUSH cannot interleave with a concurrent
 * writer (which the previous two-call version allowed).
 */
const PUSH_UNIQUE_LUA =
  "redis.call('LREM', KEYS[1], 0, ARGV[1]); return redis.call('LPUSH', KEYS[1], ARGV[1])";

export async function kvListPushUnique(
  key: string,
  value: string
): Promise<void> {
  await cmd(["EVAL", PUSH_UNIQUE_LUA, 1, key, value]);
}

export async function kvListRange(
  key: string,
  start = 0,
  stop = -1
): Promise<string[]> {
  return (await cmd<string[]>(["LRANGE", key, start, stop])) ?? [];
}
