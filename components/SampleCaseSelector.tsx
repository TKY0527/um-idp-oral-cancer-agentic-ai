"use client";

import Image from "next/image";
import { SAMPLE_CASES, type SampleCase } from "@/lib/data/sampleCases";

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}

export function SampleCaseSelector({ selectedId, onSelect, disabled }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-lavender-700">
        Built-in sample cases
      </h3>
      <p className="mt-1 text-xs text-lavender-900/70">
        Pick one to demo the pipeline without uploading anything. Each case has a pre-defined
        vision finding so the agents run deterministically.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SAMPLE_CASES.map((c) => (
          <SampleCard
            key={c.id}
            sample={c}
            selected={selectedId === c.id}
            onSelect={() => onSelect(selectedId === c.id ? null : c.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function SampleCard({
  sample,
  selected,
  onSelect,
  disabled,
}: {
  sample: SampleCase;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`group overflow-hidden rounded-2xl border text-left transition-all disabled:opacity-50 ${
        selected
          ? "border-lavender-500 bg-lavender-50 shadow-card-hover ring-2 ring-lavender-400"
          : "border-lavender-200 bg-white hover:border-lavender-400 hover:shadow-card-hover"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-lavender-100">
        <Image
          src={sample.thumbnail}
          alt={sample.name}
          fill
          sizes="(max-width: 640px) 100vw, 25vw"
          className="object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-lavender-950">{sample.name}</p>
        <p className="mt-1 text-xs text-lavender-900/70">{sample.description}</p>
      </div>
    </button>
  );
}
