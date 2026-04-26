import type { PatientReport, RiskLevel } from "@/lib/types/screening";
import { riskLevelColorClass } from "@/lib/utils/riskUtils";

interface Props {
  report: PatientReport;
  riskLevel: RiskLevel;
}

export function PatientReportCard({ report, riskLevel }: Props) {
  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          💬
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Patient-friendly Report
        </h3>
        <span
          className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] font-medium ${riskLevelColorClass(
            riskLevel
          )}`}
        >
          {riskLevel} risk
        </span>
      </div>

      <p className="mt-3 text-base font-semibold text-lavender-950">
        {report.headline}
      </p>
      <p className="mt-2 text-sm text-lavender-900">{report.message}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Block title="What was observed" body={report.whatWasObserved} />
        <Block title="Why this risk level" body={report.whyThisLevel} />
        <Block title="Recommended next step" body={report.nextStep} accent />
      </div>

      <p className="mt-4 rounded-lg border border-lavender-200 bg-lavender-50 p-3 text-[11px] italic text-lavender-800">
        {report.disclaimer}
      </p>
    </div>
  );
}

function Block({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-xs ${
        accent
          ? "border-lavender-400 bg-lavender-100/70 text-lavender-950"
          : "border-lavender-200 bg-white text-lavender-900"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-lavender-700">
        {title}
      </p>
      <p className="mt-1 leading-snug">{body}</p>
    </div>
  );
}
