import type { ProviderKeys } from "@/lib/types/screening";

/**
 * Demo BYOK (bring-your-own-key) helpers — client side only.
 *
 * Keys the user pastes live in localStorage on their device and are sent
 * only inside the API request that needs them. The server uses them for
 * the direct provider call and never stores or logs them. When a key is
 * missing, the server's hidden backend env key is the separate fallback.
 */

const STORAGE_KEY = "oralscan_byok_v1";

export function loadByokKeys(): ProviderKeys {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProviderKeys;
    return {
      openai: parsed.openai?.trim() || undefined,
      gemini: parsed.gemini?.trim() || undefined,
      anthropic: parsed.anthropic?.trim() || undefined,
    };
  } catch {
    return {};
  }
}

export function saveByokKeys(keys: ProviderKeys): void {
  if (typeof window === "undefined") return;
  const clean: ProviderKeys = {
    openai: keys.openai?.trim() || undefined,
    gemini: keys.gemini?.trim() || undefined,
    anthropic: keys.anthropic?.trim() || undefined,
  };
  if (!clean.openai && !clean.gemini && !clean.anthropic) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export function clearByokKeys(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Returns the keys object only if at least one key is present. */
export function byokKeysOrUndefined(): ProviderKeys | undefined {
  const keys = loadByokKeys();
  return keys.openai || keys.gemini || keys.anthropic ? keys : undefined;
}
