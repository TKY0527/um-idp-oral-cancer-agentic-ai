import type { RetrievalSnippet } from "@/lib/types/screening";

interface Props {
  snippets: RetrievalSnippet[];
}

/**
 * Displays the RAG snippets returned by the Retrieval Agent so the patient
 * can see *why* the system reacted the way it did, grounded in the
 * oral-cancer knowledge base.
 */
export function RetrievalPanel({ snippets }: Props) {
  return (
    <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          📚
        </span>
        <h3 className="text-sm font-semibold text-lavender-950">
          Knowledge grounding (RAG)
        </h3>
        <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 text-[10px] font-medium text-lavender-700">
          {snippets.length} sources
        </span>
      </div>
      <p className="mt-1 text-xs text-lavender-900/70">
        Snippets retrieved from the oral-cancer knowledge base most relevant to
        your screening. Educational paraphrase only — not clinical guidelines.
      </p>

      <ul className="mt-4 space-y-3">
        {snippets.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-lavender-100 bg-lavender-50/50 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-lavender-950">{s.title}</p>
              <span className="rounded-full bg-lavender-200 px-2 py-0.5 font-mono text-[10px] text-lavender-900">
                relevance {(s.relevance * 100).toFixed(0)}%
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-lavender-900/85">
              {s.excerpt}
            </p>
            <p className="mt-1 text-[10px] italic text-lavender-700/80">
              Source: {s.source}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
