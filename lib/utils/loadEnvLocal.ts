import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

let loaded = false;

/**
 * Force-loads `.env.local` and overrides process.env, **even if the variable
 * is already set at the OS level**.
 *
 * Why this exists:
 *   Next.js (and Node) keep OS-level environment variables in priority over
 *   `.env.local`. If a developer has an old/expired key in their Windows /
 *   shell environment, the app silently uses that instead of the value in
 *   `.env.local` — leading to "API key expired" errors that look like an
 *   `.env.local` problem but aren't.
 *
 *   This loader sidesteps that: it reads `.env.local` at runtime (server-side
 *   only) and forcefully overrides every key it finds. Idempotent — safe to
 *   call from every API request.
 *
 * Limitation: only runs in the Node runtime. Edge runtime cannot read files,
 * but our `/api/screening` route uses `runtime = "nodejs"`.
 */
export function loadEnvLocal(): void {
  if (loaded) return;
  try {
    const path = join(process.cwd(), ".env.local");
    if (!existsSync(path)) {
      loaded = true;
      return;
    }
    const raw = readFileSync(path, "utf8");
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      // Strip surrounding quotes if present.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key) {
        process.env[key] = value;
      }
    }
  } catch {
    // Silent: if we can't read .env.local, fall back to whatever was in
    // process.env. The vision agent already handles missing keys gracefully.
  } finally {
    loaded = true;
  }
}
