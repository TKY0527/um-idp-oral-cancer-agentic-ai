"use client";

import { useT } from "@/lib/i18n/I18nProvider";

export function SafetyBanner() {
  const { t } = useT();
  return (
    <div className="rounded-2xl border border-lavender-300 bg-gradient-to-br from-lavender-50 to-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-lavender-200 text-lavender-800">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.519 13.025c1.155 2-.29 4.5-2.599 4.5H4.48c-2.309 0-3.753-2.5-2.599-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-lavender-900">
            {t("common.notDevice")}
          </p>
          <p className="mt-1 text-sm text-lavender-900/80">
            {t("common.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
