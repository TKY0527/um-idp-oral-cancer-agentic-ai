"use client";

import { useT } from "@/lib/i18n/I18nProvider";

/** Compact EN | BM switch. `tone="dark"` for the doctor's dark sidebar. */
export function LanguageToggle({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { lang, setLang } = useT();
  const base =
    "px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors";
  const activeLight = "bg-lavender-600 text-white";
  const idleLight = "text-lavender-700 hover:bg-lavender-100";
  const activeDark = "bg-white text-lavender-900";
  const idleDark = "text-lavender-100 hover:bg-white/10";
  const active = tone === "dark" ? activeDark : activeLight;
  const idle = tone === "dark" ? idleDark : idleLight;
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg p-0.5 ${
        tone === "dark" ? "bg-white/10" : "bg-lavender-50 ring-1 ring-lavender-200"
      }`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`${base} ${lang === "en" ? active : idle}`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("bm")}
        className={`${base} ${lang === "bm" ? active : idle}`}
        aria-pressed={lang === "bm"}
      >
        BM
      </button>
    </div>
  );
}
