"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Me {
  username: string;
  role: "patient" | "doctor";
  displayName: string;
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive) setMe(d.user ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (!me) {
    return compact ? null : (
      <div className="rounded-xl border border-lavender-200 bg-lavender-50/70 p-3 text-xs text-lavender-600">
        Not signed in
      </div>
    );
  }

  const initials = me.displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (compact) {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        title={`${me.displayName} — tap to sign out`}
        className="flex items-center gap-2 rounded-lg border border-lavender-300 bg-white px-2 py-1.5 text-xs font-medium text-lavender-800 hover:bg-lavender-100"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lavender-600 text-[10px] font-bold text-white">
          {initials}
        </span>
        <span className="max-w-[80px] truncate">{me.displayName}</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-lavender-200 bg-lavender-50/70 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lavender-600 text-xs font-bold text-white">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-lavender-950">
            {me.displayName}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-lavender-700">
            {me.role}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className="mt-2 w-full rounded-lg border border-lavender-300 bg-white px-2 py-1.5 text-xs font-medium text-lavender-800 hover:bg-lavender-100 disabled:opacity-50"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
