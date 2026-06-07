"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/UserMenu";

const NAV = [
  { href: "/patient", label: "Overview", icon: "🏠" },
  { href: "/patient/screening", label: "New Screening", icon: "🔬" },
  { href: "/patient/history", label: "History", icon: "📅" },
  { href: "/patient/chat", label: "AI Assistant", icon: "💬" },
  { href: "/patient/messages", label: "Message Doctor", icon: "✉️" },
];

export function PatientSidebar() {
  const pathname = usePathname();

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
            Patient
          </p>
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
              <span>{n.label}</span>
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
