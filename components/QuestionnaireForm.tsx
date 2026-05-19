"use client";

import type { Questionnaire } from "@/lib/types/screening";

interface Props {
  value: Questionnaire;
  onChange: (q: Questionnaire) => void;
  disabled?: boolean;
}

export function QuestionnaireForm({ value, onChange, disabled }: Props) {
  const set = <K extends keyof Questionnaire>(k: K, v: Questionnaire[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-lavender-700">
        Risk questionnaire
      </h3>
      <p className="mt-1 text-xs text-lavender-900/70">
        These answers feed the Cancer Risk Scoring Agent alongside the vision finding.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Age"
          value={value.age}
          min={1}
          max={120}
          onChange={(v) => set("age", v)}
          disabled={disabled}
        />
        <NumberField
          label="Lesion duration (weeks)"
          value={value.lesionDurationWeeks}
          min={0}
          max={104}
          onChange={(v) => set("lesionDurationWeeks", v)}
          disabled={disabled}
        />

        <CheckboxField
          label="Tobacco use"
          hint="Includes cigarettes, cigars, pipes, and chewing tobacco"
          checked={value.tobacco}
          onChange={(v) => set("tobacco", v)}
          disabled={disabled}
        />
        <CheckboxField
          label="Alcohol use"
          hint="Regular drinking — beer, wine, or spirits"
          checked={value.alcohol}
          onChange={(v) => set("alcohol", v)}
          disabled={disabled}
        />
        <CheckboxField
          label="Betel quid / areca nut use"
          hint="Sirih / pinang / paan — common in South & SE Asia. Includes daily, occasional, or past use."
          checked={value.betelQuid}
          onChange={(v) => set("betelQuid", v)}
          disabled={disabled}
        />
        <CheckboxField
          label="Family history of oral cancer"
          hint="Parent, sibling, or child diagnosed with oral cancer"
          checked={value.familyHistory}
          onChange={(v) => set("familyHistory", v)}
          disabled={disabled}
        />
        <CheckboxField
          label="Pain"
          hint="Pain in your mouth that doesn't go away"
          checked={value.pain}
          onChange={(v) => set("pain", v)}
          disabled={disabled}
        />
        <CheckboxField
          label="Bleeding"
          hint="Spontaneous bleeding from a sore or lesion in your mouth"
          checked={value.bleeding}
          onChange={(v) => set("bleeding", v)}
          disabled={disabled}
        />
        <CheckboxField
          label="Ulcer present"
          hint="A sore, blister, or open wound inside your mouth"
          checked={value.ulcer}
          onChange={(v) => set("ulcer", v)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-lavender-900">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        disabled={disabled}
        className="rounded-lg border border-lavender-300 bg-white px-3 py-2 text-sm text-lavender-950 shadow-sm focus:border-lavender-500 focus:outline-none focus:ring-1 focus:ring-lavender-500 disabled:opacity-50"
      />
    </label>
  );
}

function CheckboxField({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
        checked
          ? "border-lavender-500 bg-lavender-50 text-lavender-900"
          : "border-lavender-200 bg-white text-lavender-900 hover:border-lavender-400"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-lavender-400 text-lavender-600 focus:ring-lavender-500"
      />
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11px] leading-snug text-lavender-700">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
