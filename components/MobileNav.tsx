"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface Props {
  role: "patient" | "doctor";
  items: NavItem[];
}

/**
 * Compact top bar shown ONLY on mobile (< lg). Provides:
 *  - Brand badge + current role
 *  - Slide-down menu with the same nav items as the sidebar
 *  - Quick "Switch role" link
 */
export function MobileNav({ role, items }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const otherRole = role === "patient" ? "doctor" : "patient";
  const otherEmoji = role === "patient" ? "🩺" : "🦷";

  return (
    <div className="sticky top-0 z-30 border-b border-lavender-200 bg-white/85 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href="/"
          aria-label="Go to landing page"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lavender-400 to-lavender-700 text-lg text-white shadow"
        >
          🦷
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-lavender-950">
            OralScan AI
          </p>
          <p className="text-[10px] uppercase tracking-wider text-lavender-700">
            {role === "patient" ? "Patient" : "Clinician"}
          </p>
        </div>
        <Link
          href={`/${otherRole}`}
          className="rounded-lg border border-lavender-300 bg-white px-2 py-1.5 text-xs font-medium text-lavender-800 hover:bg-lavender-100"
          aria-label={`Switch to ${otherRole} role`}
        >
          {otherEmoji}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="rounded-lg border border-lavender-300 bg-white p-2 text-lavender-800 hover:bg-lavender-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden
          >
            {open ? (
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-lavender-200 bg-white px-3 py-3">
          <ul className="space-y-1">
            {items.map((it) => {
              const active =
                it.href === `/${role}`
                  ? pathname === it.href
                  : pathname?.startsWith(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      active
                        ? "bg-lavender-100 text-lavender-900"
                        : "text-lavender-800 hover:bg-lavender-50"
                    }`}
                  >
                    <span aria-hidden>{it.icon}</span>
                    <span>{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
