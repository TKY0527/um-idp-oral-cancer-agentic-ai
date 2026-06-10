"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface KeyStatus {
  configured: boolean;
  preview: string | null;
}

interface StatusResponse {
  adminKeys: { openai: KeyStatus; gemini: KeyStatus; anthropic: KeyStatus };
  envKeys: { openai: boolean; gemini: boolean; anthropic: boolean };
}

const FIELDS: {
  id: "openai" | "gemini" | "anthropic";
  label: string;
  provider: string;
  placeholder: string;
  helpUrl: string;
}[] = [
  {
    id: "openai",
    label: "ChatGPT (OpenAI) API key",
    provider: "Used by: ChatGPT Vision · chat · doctor agent",
    placeholder: "sk-…",
    helpUrl: "platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    label: "Gemini (Google) API key",
    provider: "Used by: Gemini Vision · experts · chat · doctor agent",
    placeholder: "AIza…",
    helpUrl: "aistudio.google.com/apikey",
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic) API key",
    provider: "Used by: Claude Vision · pathologist expert · chat · doctor agent",
    placeholder: "sk-ant-…",
    helpUrl: "console.anthropic.com",
  },
];

/**
 * Admin console — control the 3 server-wide provider API keys.
 *
 * Keys pasted here are stored server-side (KV) and apply to EVERYONE:
 * the web app AND the Telegram bot, instantly, no redeploy. Precedence:
 * a user's own pasted demo key > these admin keys > backend env keys.
 */
export default function AdminPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/keys", { cache: "no-store" });
    if (res.ok) setStatus((await res.json()) as StatusResponse);
    else setError("Couldn't load key status — are you logged in as admin?");
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function save() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const body: Record<string, string> = {};
      for (const f of FIELDS) {
        const v = drafts[f.id]?.trim();
        if (v) body[f.id] = v;
      }
      if (Object.keys(body).length === 0) {
        setError("Paste at least one key first.");
        return;
      }
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setDrafts({});
      setMessage("✓ Saved — active immediately for all users (web + Telegram).");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/keys", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDrafts({});
      setMessage("✓ All admin keys cleared — backend env keys (if any) are the fallback.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  function chip(f: (typeof FIELDS)[number]) {
    if (!status) return null;
    const admin = status.adminKeys[f.id];
    const env = status.envKeys[f.id];
    if (admin.configured) {
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          admin key set ({admin.preview})
        </span>
      );
    }
    if (env) {
      return (
        <span className="rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-bold text-lavender-800">
          env key present
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
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-lavender-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-lavender-200/50 blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lavender-400 to-lavender-700 text-2xl text-white shadow-lg">
            🔐
          </div>
          <div>
            <p className="text-sm font-bold text-lavender-950">OralScan AI</p>
            <p className="text-[10px] uppercase tracking-widest text-lavender-700">
              Admin Console · API Keys
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Link
              href="/introduction"
              className="rounded-xl border border-lavender-300 bg-white/80 px-3 py-2 text-xs font-semibold text-lavender-800 hover:bg-lavender-100"
            >
              📖 Introduction
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-lavender-300 bg-white/80 px-3 py-2 text-xs font-semibold text-lavender-800 hover:bg-lavender-100"
            >
              Log out
            </button>
          </div>
        </div>

        <header className="mt-8">
          <h1 className="text-2xl font-bold text-lavender-950">
            🔑 Server-wide API keys
          </h1>
          <p className="mt-1 text-sm text-lavender-900/75">
            Copy &amp; paste the 3 provider keys here. They are stored
            server-side and apply to <b>every user instantly</b> — the web
            app AND the Telegram bot — no redeploy needed.
          </p>
        </header>

        <div className="mt-4 rounded-2xl border border-lavender-200 bg-lavender-50/70 p-3 text-xs text-lavender-900/80">
          <b>Key precedence:</b> a user&apos;s own pasted demo key →{" "}
          <b>these admin keys</b> → backend env keys → offline mock fallback.
        </div>

        {/* Key fields */}
        <section className="mt-6 space-y-5 rounded-3xl border border-lavender-200 bg-white/80 p-6 shadow-card backdrop-blur">
          {FIELDS.map((f) => (
            <div key={f.id}>
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`admin-${f.id}`}
                  className="text-sm font-semibold text-lavender-950"
                >
                  {f.label}
                </label>
                {chip(f)}
              </div>
              <p className="text-[11px] text-lavender-900/60">{f.provider}</p>
              <input
                id={`admin-${f.id}`}
                type="password"
                autoComplete="off"
                value={drafts[f.id] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [f.id]: e.target.value }))
                }
                placeholder={
                  status?.adminKeys[f.id].configured
                    ? `saved (${status.adminKeys[f.id].preview}) — paste to replace`
                    : f.placeholder
                }
                disabled={busy}
                className="mt-1.5 w-full rounded-xl border border-lavender-300 bg-white px-3 py-2.5 font-mono text-sm focus:border-lavender-500 focus:outline-none"
              />
              <p className="mt-0.5 text-[10px] text-lavender-900/50">
                Get one at {f.helpUrl}
              </p>
            </div>
          ))}

          {message && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-xl bg-lavender-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-lavender-800 disabled:bg-lavender-300"
            >
              {busy ? "Working…" : "Save keys"}
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={busy}
              className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Clear all admin keys
            </button>
          </div>

          <ul className="space-y-1 border-t border-lavender-100 pt-3 text-[11px] text-lavender-900/60">
            <li>• Only non-empty fields overwrite — update one key without re-pasting the others.</li>
            <li>• Keys are never shown again in full, only a masked preview.</li>
            <li>• Educational prototype: keys are stored in the app&apos;s KV store, not a secret manager.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
