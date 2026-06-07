import type { DentalWellness } from "@/lib/types/screening";

interface Props {
  dental: DentalWellness;
}

const RISK_TONE = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warn: "bg-amber-100 text-amber-800 border-amber-200",
  bad: "bg-red-100 text-red-800 border-red-200",
};

function cavityTone(v: DentalWellness["cavityRisk"]) {
  return v === "low" ? RISK_TONE.good : v === "early_signs" ? RISK_TONE.warn : RISK_TONE.bad;
}
function gumTone(v: DentalWellness["gumCondition"]) {
  return v === "healthy" ? RISK_TONE.good : v === "mild_inflammation" ? RISK_TONE.warn : RISK_TONE.bad;
}
function plaqueTone(v: DentalWellness["plaqueLevel"]) {
  return v === "low" ? RISK_TONE.good : v === "moderate" ? RISK_TONE.warn : RISK_TONE.bad;
}

const LABEL: Record<string, string> = {
  low: "Low",
  early_signs: "Early signs",
  likely: "Likely",
  healthy: "Healthy",
  mild_inflammation: "Mild inflammation",
  likely_disease: "Needs attention",
  moderate: "Moderate",
  heavy: "Heavy",
  none: "None",
  mild: "Mild",
  notable: "Notable",
};

export function DentalWellnessCard({ dental }: Props) {
  const hygieneColor =
    dental.hygieneScore >= 75
      ? "stroke-emerald-500"
      : dental.hygieneScore >= 50
        ? "stroke-amber-500"
        : "stroke-red-500";
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (dental.hygieneScore / 100) * circ;

  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          🪥
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Dental Wellness — beyond cancer
        </h3>
        <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-medium text-lavender-700">
          cavities · gums · hygiene
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        {/* Hygiene ring */}
        <div className="relative h-20 w-20 flex-shrink-0">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
            <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-lavender-100" />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              className={hygieneColor}
              strokeDasharray={`${dash} ${circ}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-lavender-950">
              {dental.hygieneScore}
            </span>
            <span className="text-[9px] text-lavender-600">hygiene</span>
          </div>
        </div>

        {/* Condition chips */}
        <div className="grid flex-1 grid-cols-2 gap-2">
          <Chip label="🦷 Cavity (蛀牙)" value={LABEL[dental.cavityRisk]} tone={cavityTone(dental.cavityRisk)} />
          <Chip label="🩸 Gums" value={LABEL[dental.gumCondition]} tone={gumTone(dental.gumCondition)} />
          <Chip label="🧫 Plaque" value={LABEL[dental.plaqueLevel]} tone={plaqueTone(dental.plaqueLevel)} />
          <Chip label="🎨 Staining" value={LABEL[dental.staining]} tone={dental.staining === "none" ? RISK_TONE.good : RISK_TONE.warn} />
        </div>
      </div>

      {dental.suggestions.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-700">
            Tips for you
          </p>
          <ul className="mt-1 space-y-0.5">
            {dental.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-lavender-900">
                • {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 rounded-lg bg-lavender-50 p-2 text-[11px] italic text-lavender-700">
        {dental.disclaimer}
      </p>
    </div>
  );
}

function Chip({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${tone}`}>
      <p className="text-[10px] font-medium opacity-80">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
