"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT } from "@/lib/i18n/I18nProvider";
import type { DictKey } from "@/lib/i18n/dictionary";

const NAV: { href: string; key: DictKey; icon: string }[] = [
  { href: "/patient", key: "nav.overview", icon: "🏠" },
  { href: "/patient/screening", key: "nav.newScreening", icon: "🔬" },
  { href: "/patient/history", key: "nav.history", icon: "📅" },
  { href: "/patient/chat", key: "nav.assistant", icon: "💬" },
  { href: "/patient/messages", key: "nav.messageDoctor", icon: "✉️" },
  { href: "/patient/documents", key: "nav.documents", icon: "📎" },
];

export function PatientSidebar() {
  const pathname = usePathname();
  const { t } = useT();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-lavender-200 bg-white/70 p-4 backdrop-blur lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lavender-400 to-lavender-700 text-white shadow">
          🦷
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-lavender-950">
            OralScan AI
          </p>
          <p className="text-[10px] uppercase tracking-wider text-lavender-700">
            {t("common.patient")}
          </p>
        </div>
        <div className="ml-auto">
          <LanguageToggle />
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active =
            n.href === "/patient"
              ? pathname === "/patient"
              : pathname?.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-lavender-100 text-lavender-900"
                  : "text-lavender-800 hover:bg-lavender-50"
              }`}
            >
              <span aria-hidden>{n.icon}</span>
              <span>{t(n.key)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <UserMenu />
      </div>
    </aside>
  );
}
