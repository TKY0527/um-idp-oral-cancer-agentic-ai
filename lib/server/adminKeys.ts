import type { ProviderKeys } from "@/lib/types/screening";
import { kvDel, kvGet, kvSet } from "@/lib/server/kv";

/**
 * Server-wide provider API keys managed by the admin at /admin.
 *
 * Key resolution order everywhere in the app:
 *   1. user-pasted demo key (sent with the request, lives in their browser)
 *   2. ADMIN key (this module — stored in KV, applies to ALL users + Telegram)
 *   3. backend env key (.env.local / Vercel env vars)
 *
 * Demo-grade storage: keys live as one KV record. Good enough for a
 * university prototype; use a secret manager for anything real.
 */

const KV_KEY = "admin:apikeys:v1";

export async function getAdminKeys(): Promise<ProviderKeys> {
  const stored = await kvGet<ProviderKeys>(KV_KEY).catch(() => null);
  if (!stored) return {};
  return {
    openai: stored.openai?.trim() || undefined,
    gemini: stored.gemini?.trim() || undefined,
    anthropic: stored.anthropic?.trim() || undefined,
  };
}

/**
 * Set the provided keys. Only non-empty fields overwrite; existing keys
 * for fields that are missing/empty are kept (so the admin can update one
 * key without re-pasting the others).
 */
export async function setAdminKeys(
  update: ProviderKeys
): Promise<ProviderKeys> {
  const current = await getAdminKeys();
  const next: ProviderKeys = {
    openai: update.openai?.trim() || current.openai,
    gemini: update.gemini?.trim() || current.gemini,
    anthropic: update.anthropic?.trim() || current.anthropic,
  };
  await kvSet(KV_KEY, next);
  return next;
}

export async function clearAdminKeys(): Promise<void> {
  await kvDel(KV_KEY);
}

/**
 * Merge request-level user keys over the admin keys: the user's own pasted
 * key wins for a provider; the admin key fills the gaps. (Env keys remain
 * the final fallback inside each provider/agent.)
 */
export function mergeProviderKeys(
  userKeys: ProviderKeys | undefined,
  adminKeys: ProviderKeys
): ProviderKeys | undefined {
  const merged: ProviderKeys = {
    openai: userKeys?.openai?.trim() || adminKeys.openai,
    gemini: userKeys?.gemini?.trim() || adminKeys.gemini,
    anthropic: userKeys?.anthropic?.trim() || adminKeys.anthropic,
  };
  return merged.openai || merged.gemini || merged.anthropic
    ? merged
    : undefined;
}

/** Safe preview for the admin UI — never returns full key material. */
export function maskKey(key: string | undefined): string | null {
  if (!key) return null;
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
