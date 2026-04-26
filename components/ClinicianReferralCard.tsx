import type { ClinicianReferral } from "@/lib/types/screening";

interface Props {
  referral: ClinicianReferral;
}

export function ClinicianReferralCard({ referral }: Props) {
  return (
    <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          🩺
        </span>
        <h3 className="text-sm font-semibold text-red-900">
          Clinician Referral Packet
        </h3>
        <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
          High risk
        </span>
      </div>
      <p className="mt-2 text-sm text-red-900">{referral.summary}</p>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <Field label="Risk score">{referral.riskScore} / 100</Field>
        <Field label="Visual finding">{referral.visualFinding}</Field>
        <Field label="Suspected region">
          <span className="capitalize">{referral.suspectedRegion}</span>
        </Field>
        <Field label="Toothbrush session quality">
          {referral.toothbrushSessionQuality}
        </Field>
        <Field label="Questionnaire summary" full>
          {referral.questionnaireSummary || "(no notable risk factors reported)"}
        </Field>
        <Field label="Risk drivers" full>
          {referral.riskDrivers.length === 0 ? (
            <span>none</span>
          ) : (
            <ul className="space-y-0.5">
              {referral.riskDrivers.map((d, i) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
          )}
        </Field>
        <Field label="Suggested clinician action" full accent>
          {referral.suggestedClinicianAction}
        </Field>
      </dl>

      <p className="mt-4 rounded-lg border border-red-200 bg-white p-3 text-[11px] italic text-red-700">
        {referral.disclaimer}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  full,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${full ? "sm:col-span-2" : ""} ${
        accent
          ? "border-red-300 bg-red-100 text-red-950"
          : "border-red-100 bg-white/80 text-red-900"
      }`}
    >
      <dt className="text-[10px] font-bold uppercase tracking-wider text-red-800">
        {label}
      </dt>
      <dd className="mt-1 text-xs leading-snug">{children}</dd>
    </div>
  );
}
