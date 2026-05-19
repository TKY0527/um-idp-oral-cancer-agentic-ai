"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/doctor", label: "Triage Queue", icon: "📥" },
  { href: "/doctor/analytics", label: "Analytics", icon: "📊" },
];

export function DoctorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-lavender-200 bg-gradient-to-b from-lavender-950 to-lavender-900 p-4 text-white lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          🩺
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Clinician Console</p>
          <p className="text-[10px] uppercase tracking-wider text-lavender-200">
            Doctor
          </p>
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
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/20 bg-white/10 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-200">
          Switch role
        </p>
        <div className="mt-2 flex gap-2">
          <Link
            href="/patient"
            className="flex-1 rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-center text-xs font-medium text-white hover:bg-white/20"
          >
            🦷 Patient
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-center text-xs font-medium text-white hover:bg-white/20"
          >
            🏠
          </Link>
        </div>
      </div>
    </aside>
  );
}
