"use client";

import { useEffect, useState } from "react";
import type { ProviderKeys } from "@/lib/types/screening";
import { clearByokKeys, loadByokKeys, saveByokKeys } from "@/lib/utils/byok";

interface BackendStatus {
  gemini: boolean;
  claude: boolean;
  openai: boolean;
  local: boolean;
}

interface Props {
  disabled?: boolean;
  /** Called whenever the saved keys change so the parent can re-read them. */
  onKeysChange?: (keys: ProviderKeys) => void;
}

const FIELDS: {
  id: keyof ProviderKeys;
  label: string;
  placeholder: string;
  statusKey: keyof BackendStatus;
  helpUrl: string;
}[] = [
  {
    id: "openai",
    label: "ChatGPT (OpenAI) API key",
    placeholder: "sk-…",
    statusKey: "openai",
    helpUrl: "platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    label: "Gemini (Google) API key",
    placeholder: "AIza…",
    statusKey: "gemini",
    helpUrl: "aistudio.google.com/apikey",
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic) API key",
    placeholder: "sk-ant-…",
    statusKey: "claude",
    helpUrl: "console.anthropic.com",
  },
];

/**
 * Demo BYOK panel: paste any of the 3 provider keys and the screening/chat
 * calls use YOUR key directly instead of the hidden backend key. Keys stay
 * in this browser's localStorage and travel only inside your own requests.
 */
export function ApiKeysPanel({ disabled, onKeysChange }: Props) {
  const [open, setOpen] = useState(false);
  // Draft input vs. what is actually persisted — requests only ever read
  // the SAVED keys (localStorage), so all status chips derive from
  // `savedKeys`, never from the draft.
  const [keys, setKeys] = useState<ProviderKeys>({});
  const [savedKeys, setSavedKeys] = useState<ProviderKeys>({});
  const [backend, setBackend] = useState<BackendStatus | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const stored = loadByokKeys();
    setKeys(stored);
    setSavedKeys(stored);
    fetch("/api/providers/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBackend(d?.backendConfigured ?? null))
      .catch(() => setBackend(null));
  }, []);

  const pastedCount = FIELDS.filter((f) => savedKeys[f.id]?.trim()).length;
  const hasUnsavedChanges = FIELDS.some(
    (f) => (keys[f.id]?.trim() ?? "") !== (savedKeys[f.id]?.trim() ?? "")
  );

  function update(id: keyof ProviderKeys, value: string) {
    setKeys((prev) => ({ ...prev, [id]: value }));
  }

  function save() {
    saveByokKeys(keys);
    const clean = loadByokKeys();
    setKeys(clean);
    setSavedKeys(clean);
    onKeysChange?.(clean);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  function clearAll() {
    clearByokKeys();
    setKeys({});
    setSavedKeys({});
    onKeysChange?.({});
  }

  function statusChip(f: (typeof FIELDS)[number]) {
    const pasted = Boolean(savedKeys[f.id]?.trim());
    if (pasted) {
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          your key will be used
        </span>
      );
    }
    if (backend?.[f.statusKey]) {
      return (
        <span className="rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-bold text-lavender-800">
          backend key available
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
        no key → mock fallback
      </span>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-lavender-300 bg-lavender-50/60 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        disabled={disabled}
      >
        <div>
          <p className="text-sm font-semibold text-lavender-950">
            🔑 Plug in your own API key (demo)
            {pastedCount > 0 && (
              <span className="ml-2 rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                {pastedCount} key{pastedCount > 1 ? "s" : ""} active
              </span>
            )}
          </p>
          <p className="text-xs text-lavender-900/70">
            Paste a ChatGPT, Gemini, or Claude key — it is used directly for
            this demo instead of the hidden backend key. Stored only in this
            browser.
          </p>
        </div>
        <span className="text-lavender-600">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {FIELDS.map((f) => (
            <div key={f.id}>
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`byok-${f.id}`}
                  className="text-xs font-semibold text-lavender-950"
                >
                  {f.label}
                </label>
                {statusChip(f)}
              </div>
              <input
                id={`byok-${f.id}`}
                type="password"
                autoComplete="off"
                value={keys[f.id] ?? ""}
                onChange={(e) => update(f.id, e.target.value)}
                placeholder={f.placeholder}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border border-lavender-300 bg-white px-3 py-2 font-mono text-xs focus:border-lavender-500 focus:outline-none"
              />
              <p className="mt-0.5 text-[10px] text-lavender-900/60">
                Get one at {f.helpUrl}
              </p>
            </div>
          ))}

          {hasUnsavedChanges && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
              ✏️ Unsaved changes — click <b>Save keys</b> or your screenings
              will still use the previously saved keys.
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={disabled}
              className="rounded-lg bg-lavender-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-lavender-800 disabled:bg-lavender-300"
            >
              {savedFlash ? "✓ Saved" : "Save keys"}
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={disabled}
              className="rounded-lg border border-lavender-300 bg-white px-4 py-1.5 text-xs font-semibold text-lavender-800 hover:bg-lavender-100"
            >
              Clear
            </button>
            <p className="text-[10px] text-lavender-900/60">
              Keys are sent only with your own screening/chat requests and are
              never stored on the server.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
