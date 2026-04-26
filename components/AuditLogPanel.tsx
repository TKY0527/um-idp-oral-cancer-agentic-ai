import type { AuditLogEntry } from "@/lib/types/screening";

interface Props {
  entries: AuditLogEntry[];
  sessionId: string;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour12: false });
  } catch {
    return iso;
  }
}

const AGENT_COLOR: Record<string, string> = {
  Orchestrator: "bg-lavender-200 text-lavender-900",
  ToothbrushIoTAgent: "bg-sky-100 text-sky-800",
  VisionScreeningAgent: "bg-fuchsia-100 text-fuchsia-800",
  CancerRiskScoringAgent: "bg-amber-100 text-amber-800",
  PatientCommunicationAgent: "bg-emerald-100 text-emerald-800",
  ClinicianReferralAgent: "bg-red-100 text-red-800",
};

export function AuditLogPanel({ entries, sessionId }: Props) {
  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          📜
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">Audit log</h3>
        <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 font-mono text-[10px] text-lavender-800">
          {sessionId}
        </span>
      </div>
      <p className="mt-1 text-xs text-lavender-900/70">
        Every agent invocation, fallback, and result is recorded for transparency.
      </p>

      <ol className="mt-4 space-y-2">
        {entries.map((e, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-lavender-100 bg-lavender-50/40 p-2 text-xs"
          >
            <span className="font-mono text-[10px] text-lavender-700">
              {formatTime(e.timestamp)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                AGENT_COLOR[e.agent] ?? "bg-lavender-100 text-lavender-800"
              }`}
            >
              {e.agent}
            </span>
            <span className="font-mono text-[11px] text-lavender-900">{e.event}</span>
            {e.detail && (
              <span className="ml-auto text-[11px] text-lavender-900/70">
                {e.detail}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
