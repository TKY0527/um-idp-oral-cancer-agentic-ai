import type {
  Questionnaire,
  RetrievalSnippet,
  VisionResult,
} from "@/lib/types/screening";
import { ORAL_CANCER_KB } from "@/lib/knowledge/oralCancerFacts";

export interface RetrievalInput {
  vision: VisionResult;
  questionnaire: Questionnaire;
  topK?: number;
}

/**
 * Retrieval Agent (RAG)
 *
 * Naive keyword-based retriever that grounds the screening output in a
 * small curated oral-cancer knowledge base. Returns the top-K most
 * relevant snippets so the patient and the doctor can see *why* the
 * system reacted the way it did.
 *
 * The "naive" keyword scorer is deliberate: it keeps the prototype
 * dependency-free. Swap this for vector embeddings (e.g. Gemini
 * `text-embedding-004`) in a future phase without changing the
 * agent contract.
 */
export async function runRetrievalAgent(
  input: RetrievalInput
): Promise<RetrievalSnippet[]> {
  const { vision, questionnaire: q, topK = 3 } = input;

  // Build a tag bag of the salient features.
  const tagBag = new Set<string>();
  tagBag.add(vision.visualFinding);
  tagBag.add(vision.suspectedRegion);
  if (q.tobacco) tagBag.add("tobacco");
  if (q.alcohol) tagBag.add("alcohol");
  if (q.betelQuid) tagBag.add("betelQuid");
  if (q.ulcer) tagBag.add("ulcer");
  if (q.pain) tagBag.add("pain");
  if (vision.imageQuality === "poor") tagBag.add("disclaimer");

  const scored = ORAL_CANCER_KB.map((entry) => {
    let relevance = 0;
    for (const tag of entry.tags) {
      if (tagBag.has(tag)) relevance += 1;
    }
    // Mild boost for partial matches between tags and the suspected region.
    if (
      vision.suspectedRegion &&
      entry.tags.some((t) => t.includes(vision.suspectedRegion))
    ) {
      relevance += 0.5;
    }
    // Default 0.1 so we don't return totally empty result.
    if (relevance === 0) relevance = 0.1;
    return {
      id: entry.id,
      title: entry.title,
      source: entry.source,
      excerpt: entry.text,
      relevance,
    } satisfies RetrievalSnippet;
  });

  scored.sort((a, b) => b.relevance - a.relevance);
  // Normalize to 0..1 relative to the top hit.
  const top = scored[0]?.relevance ?? 1;
  return scored
    .slice(0, topK)
    .map((s) => ({ ...s, relevance: Math.min(1, s.relevance / top) }));
}
