import type {
  Questionnaire,
  RetrievalSnippet,
  VisionResult,
} from "@/lib/types/screening";
import { searchKnowledge } from "@/lib/retrieval/engine";

export interface RetrievalInput {
  vision: VisionResult;
  questionnaire: Questionnaire;
  topK?: number;
}

/** Human-word expansions of the enum values so BM25 has real terms to match. */
const FINDING_WORDS: Record<VisionResult["visualFinding"], string> = {
  normal: "normal healthy tissue routine screening",
  ulcer_like: "ulcer sore non-healing mouth ulcer",
  white_patch_like: "white patch leukoplakia",
  red_patch_like: "red patch erythroplakia",
  mixed_white_red_patch_like: "mixed red white patch erythroleukoplakia",
  unclear: "unclear image quality limitation",
};

/**
 * Retrieval Agent (RAG v2)
 *
 * Grounds BOTH functions of the screening in the knowledge base using the
 * BM25 engine (bilingual synonyms, CJK-aware). The query is assembled from
 * everything the pipeline has observed: the cancer-side finding/region,
 * the tooth-health signs read from the same picture, and the
 * questionnaire risk factors — so the citations explain the WHOLE result,
 * not just the cancer half.
 */
export async function runRetrievalAgent(
  input: RetrievalInput
): Promise<RetrievalSnippet[]> {
  const { vision, questionnaire: q, topK = 4 } = input;

  const parts: string[] = [FINDING_WORDS[vision.visualFinding]];
  if (vision.suspectedRegion !== "none" && vision.suspectedRegion !== "unknown") {
    parts.push(vision.suspectedRegion);
  }

  // Function 2 — tooth-health signs from the same picture.
  const signs = vision.dentalSigns;
  if (signs) {
    if (signs.cavitySigns !== "none") parts.push("cavity caries decay 蛀牙");
    if (signs.gumRedness !== "none") parts.push("gum gingivitis bleeding 牙龈");
    if (signs.plaqueOrTartar !== "low") parts.push("plaque tartar scaling 洗牙");
    if (signs.toothStaining !== "none") parts.push("staining stain");
  }

  // Questionnaire risk factors.
  if (q.tobacco) parts.push("tobacco smoking");
  if (q.alcohol) parts.push("alcohol");
  if (q.betelQuid) parts.push("betel quid areca 槟榔");
  if (q.ulcer || q.lesionDurationWeeks > 0) parts.push("ulcer duration weeks");
  if (q.pain) parts.push("pain");
  if (q.bleeding) parts.push("bleeding gum");
  if (q.age >= 40) parts.push("age incidence");
  if (vision.imageQuality === "poor") parts.push("image quality limitation disclaimer");
  parts.push("screening early detection");

  const hits = searchKnowledge(parts.join(" "), topK);
  return hits.map((h) => ({
    id: h.entry.id,
    title: h.entry.title,
    source: h.entry.source,
    excerpt: h.entry.text,
    relevance: h.normalized,
  }));
}
