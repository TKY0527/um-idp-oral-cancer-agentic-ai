import type { ProviderStatus, VisionProviderId } from "@/lib/types/screening";

interface Props {
  status: ProviderStatus;
}

const PROVIDER_LABEL: Record<VisionProviderId, string> = {
  mock: "Mock (offline)",
  gemini: "Gemini Vision",
  claude: "Claude Vision",
  openai: "ChatGPT Vision",
  local: "Future Local Model",
};

export function ProviderStatusBadge({ status }: Props) {
  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-4 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-lavender-700">
        Vision provider
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span className="rounded-full bg-lavender-200 px-2 py-0.5 text-xs font-medium text-lavender-900">
          {PROVIDER_LABEL[status.used]}
        </span>
        {status.fellBack && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            fallback
          </span>
        )}
      </div>
      {status.fellBack ? (
        <p className="mt-2 text-xs text-amber-800">
          Requested <span className="font-semibold">{PROVIDER_LABEL[status.requested]}</span>{" "}
          but fell back. Reason: {status.reason}
        </p>
      ) : status.reason ? (
        <p className="mt-2 text-xs text-lavender-900/70">{status.reason}</p>
      ) : (
        <p className="mt-2 text-xs text-lavender-900/70">
          Requested provider was used successfully.
        </p>
      )}
    </div>
  );
}
