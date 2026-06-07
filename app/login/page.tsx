"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";

const QUICK = [
  { username: "patient1", password: "patient1", label: "Patient One", emoji: "🧑", role: "patient" },
  { username: "patient2", password: "patient2", label: "Patient Two", emoji: "👩", role: "patient" },
  { username: "test1", password: "test1", label: "Test User", emoji: "🧪", role: "patient" },
  { username: "doctor", password: "doctor", label: "Dr. Lim", emoji: "🩺", role: "doctor" },
];

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useT();
  const next = params.get("next") ?? "";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doLogin(u: string, p: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      const dest = next || data.redirect || "/patient";
      router.push(dest);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lavender-400 to-lavender-700 text-2xl text-white shadow-card">
            🦷
          </div>
          <h1 className="text-2xl font-bold text-lavender-950">OralScan AI</h1>
          <p className="text-sm text-lavender-700">{t("login.subtitle")}</p>
          <div className="mt-3 flex justify-center">
            <LanguageToggle />
          </div>
        </div>

        {/* Quick demo logins */}
        <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-lavender-700">
            {t("login.quick")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK.map((q) => (
              <button
                key={q.username}
                type="button"
                disabled={busy}
                onClick={() => doLogin(q.username, q.password)}
                className="flex flex-col items-center gap-1 rounded-xl border border-lavender-200 bg-lavender-50 px-2 py-3 text-center transition-colors hover:border-lavender-400 hover:bg-lavender-100 disabled:opacity-50"
              >
                <span className="text-2xl">{q.emoji}</span>
                <span className="text-xs font-semibold text-lavender-950">
                  {q.label}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[9px] uppercase tracking-wider text-lavender-700">
                  {q.role}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-lavender-500">
            One tap to sign in — demo credentials are pre-filled.
          </p>
        </div>

        {/* Manual login */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            doLogin(username, password);
          }}
          className="mt-4 rounded-2xl border border-lavender-200 bg-white p-5 shadow-card"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-lavender-700">
            {t("login.manual")}
          </p>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("login.username")}
            autoComplete="username"
            className="mt-3 w-full rounded-lg border border-lavender-300 bg-white px-3 py-2 text-sm focus:border-lavender-500 focus:outline-none focus:ring-1 focus:ring-lavender-500"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("login.password")}
            type="password"
            autoComplete="current-password"
            className="mt-2 w-full rounded-lg border border-lavender-300 bg-white px-3 py-2 text-sm focus:border-lavender-500 focus:outline-none focus:ring-1 focus:ring-lavender-500"
          />
          {error && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full rounded-xl bg-lavender-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-lavender-800 disabled:opacity-50"
          >
            {busy ? "…" : t("common.signIn")}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-lavender-500">
          Educational prototype — not a medical device. No real patient data.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
