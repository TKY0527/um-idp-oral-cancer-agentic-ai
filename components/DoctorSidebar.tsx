"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT } from "@/lib/i18n/I18nProvider";
import type { DictKey } from "@/lib/i18n/dictionary";

const NAV: { href: string; key: DictKey; icon: string }[] = [
  { href: "/doctor", key: "nav.triage", icon: "📥" },
  { href: "/doctor/patients", key: "nav.patients", icon: "👥" },
  { href: "/doctor/analytics", key: "nav.analytics", icon: "📊" },
];

export function DoctorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const [name, setName] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setName(d.user?.displayName ?? ""))
      .catch(() => undefined);
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

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-lavender-200 bg-gradient-to-b from-lavender-950 to-lavender-900 p-4 text-white lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          🩺
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Clinician Console</p>
          <p className="text-[10px] uppercase tracking-wider text-lavender-200">
            {t("common.doctor")}
          </p>
        </div>
        <div className="ml-auto">
          <LanguageToggle tone="dark" />
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active =
            n.href === "/doctor"
              ? pathname === "/doctor"
              : pathname?.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/20 text-white"
                  : "text-lavender-100 hover:bg-white/10"
              }`}
            >
              <span aria-hidden>{n.icon}</span>
              <span>{t(n.key)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/20 bg-white/10 p-3">
        {name && (
          <p className="mb-2 truncate text-sm font-semibold text-white">
            {name}
          </p>
        )}
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="w-full rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-center text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50"
        >
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
