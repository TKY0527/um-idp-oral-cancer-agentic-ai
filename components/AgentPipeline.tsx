import type { ScreeningSession } from "@/lib/types/screening";

interface Props {
  session?: ScreeningSession | null;
}

interface Step {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
}

const STEPS: Step[] = [
  {
    key: "input",
    title: "Image / Smart Toothbrush Input",
    subtitle: "Sample case or uploaded oral cavity photo",
    icon: "📥",
  },
  {
    key: "iot",
    title: "Toothbrush IoT Agent",
    subtitle: "Brushing telemetry + image quality",
    icon: "🪥",
  },
  {
    key: "vision",
    title: "Vision Screening Agent",
    subtitle: "Mock / Gemini / Claude / Local model",
    icon: "👁️",
  },
  {
    key: "scoring",
    title: "Cancer Risk Scoring Agent",
    subtitle: "Vision + questionnaire → risk score",
    icon: "📊",
  },
  {
    key: "patient",
    title: "Patient Communication Agent",
    subtitle: "Plain-language patient report",
    icon: "💬",
  },
  {
    key: "referral",
    title: "Clinician Referral Agent",
    subtitle: "Generated only when risk is High",
    icon: "🩺",
  },
];

export function AgentPipeline({ session }: Props) {
  function statusFor(key: string): "idle" | "ok" | "skipped" {
    if (!session) return "idle";
    if (key === "referral") {
      return session.clinicianReferral ? "ok" : "skipped";
    }
    return "ok";
  }

  return (
    <section className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <h2 className="text-base font-semibold text-lavender-950">Agent pipeline</h2>
      <p className="mt-1 text-xs text-lavender-900/70">
        The Orchestrator Agent is the only agent that knows the full workflow. Each downstream
        agent is called sequentially and its output feeds the next.
      </p>

      <ol className="mt-4 grid gap-3 lg:grid-cols-3">
        {STEPS.map((step, idx) => {
          const status = statusFor(step.key);
          return (
            <li
              key={step.key}
              className={`relative flex flex-col rounded-xl border p-3 transition-colors ${
                status === "ok"
                  ? "border-lavender-400 bg-lavender-50"
                  : status === "skipped"
                    ? "border-dashed border-lavender-300 bg-white text-lavender-900/60"
                    : "border-lavender-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  {step.icon}
                </span>
                <span className="rounded-full bg-lavender-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lavender-900">
                  Step {idx + 1}
                </span>
                {status === "ok" && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> done
                  </span>
                )}
                {status === "skipped" && (
                  <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-medium text-lavender-700">
                    skipped
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-lavender-950">{step.title}</p>
              <p className="text-xs text-lavender-900/70">{step.subtitle}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
