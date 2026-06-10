import type { KnowledgeEntry } from "@/lib/knowledge/oralCancerFacts";
import { ORAL_CANCER_KB } from "@/lib/knowledge/oralCancerFacts";
import { DENTAL_HEALTH_KB } from "@/lib/knowledge/dentalHealthFacts";

/**
 * Strong lexical RAG engine — BM25 over the full knowledge base with:
 *   - English tokenization + light stemming
 *   - CJK support (unigrams + bigrams, so 蛀牙 / 洗牙 / 牙菌斑 match)
 *   - Bilingual synonym expansion (蛀牙→caries, 洗牙→scaling, …)
 *   - Field boosts (tags > title > body)
 *
 * Dependency-free and deterministic: same query → same ranking, no API
 * key needed, works offline. The index is built once at module load
 * (~23 documents — instant).
 */

export const FULL_KB: KnowledgeEntry[] = [...ORAL_CANCER_KB, ...DENTAL_HEALTH_KB];

export interface SearchHit {
  entry: KnowledgeEntry;
  /** Raw BM25 score (use normalized for display). */
  score: number;
  /** 0..1 relative to the best hit in this result set. */
  normalized: number;
  /** Query terms that actually matched this document. */
  matchedTerms: string[];
}

// ── Bilingual synonym map (term → expansion terms, weight 0.7) ───────────────
const SYNONYMS: Record<string, string[]> = {
  // Chinese → English
  蛀牙: ["cavity", "caries", "decay"],
  龋齿: ["cavity", "caries", "decay"],
  洗牙: ["scaling", "cleaning", "tartar"],
  牙结石: ["tartar", "calculus", "scaling"],
  牙菌斑: ["plaque"],
  牙龈: ["gum", "gingivitis"],
  牙周: ["periodontitis", "gum"],
  牙线: ["floss", "flossing"],
  刷牙: ["brushing", "brush"],
  槟榔: ["betel", "areca", "betelquid"],
  吸烟: ["smoking", "tobacco"],
  抽烟: ["smoking", "tobacco"],
  喝酒: ["alcohol"],
  溃疡: ["ulcer", "sore"],
  白斑: ["leukoplakia", "white", "patch"],
  红斑: ["erythroplakia", "red", "patch"],
  染色: ["staining", "stain"],
  敏感: ["sensitivity", "sensitive"],
  舌头: ["tongue"],
  口腔癌: ["oral", "cancer"],
  筛查: ["screening"],
  复诊: ["check-up", "recall", "dentist"],
  // English → English/Chinese
  cavity: ["caries", "decay", "蛀牙"],
  cavities: ["caries", "decay", "蛀牙"],
  caries: ["cavity", "decay"],
  decay: ["caries", "cavity"],
  scaling: ["cleaning", "tartar", "洗牙"],
  cleaning: ["scaling", "洗牙"],
  tartar: ["calculus", "scaling", "牙结石"],
  calculus: ["tartar"],
  plaque: ["tartar", "牙菌斑"],
  gum: ["gingivitis", "gingival", "periodontal", "牙龈"],
  gums: ["gingivitis", "gingival", "periodontal", "牙龈"],
  gingivitis: ["gum", "bleeding"],
  bleeding: ["gingivitis", "gum"],
  floss: ["flossing", "interdental"],
  smoking: ["tobacco", "cigarette", "吸烟"],
  tobacco: ["smoking", "cigarette"],
  cigarette: ["smoking", "tobacco"],
  betel: ["areca", "betelquid", "槟榔"],
  areca: ["betel", "betelquid"],
  ulcer: ["sore", "溃疡"],
  sore: ["ulcer"],
  white: ["leukoplakia"],
  leukoplakia: ["white", "patch", "白斑"],
  erythroplakia: ["red", "patch", "红斑"],
  stain: ["staining", "染色"],
  staining: ["stain", "染色"],
  sensitive: ["sensitivity", "敏感"],
  sugar: ["sugary", "sweet", "diet"],
  sweet: ["sugar", "sugary"],
  brush: ["brushing", "刷牙"],
  brushing: ["brush", "technique", "刷牙"],
  dentist: ["check-up", "recall"],
  checkup: ["check-up", "recall", "dentist"],
};

// ── Tokenizer: latin words + CJK unigrams/bigrams ────────────────────────────
const CJK_RE = /[一-鿿]/;

function lightStem(w: string): string {
  // Tiny English stemmer: plural/verb endings only — enough for this corpus.
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  return w;
}

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();
  // Latin / numeric words
  for (const m of lower.matchAll(/[a-z0-9][a-z0-9'-]*/g)) {
    const w = m[0].replace(/'/g, "");
    if (w.length > 1) tokens.push(lightStem(w));
  }
  // CJK runs → unigrams + bigrams
  for (const m of lower.matchAll(/[一-鿿]+/g)) {
    const run = m[0];
    for (let i = 0; i < run.length; i++) {
      tokens.push(run[i]);
      if (i + 1 < run.length) tokens.push(run.slice(i, i + 2));
    }
  }
  return tokens;
}

/** Expand query tokens with synonyms (each synonym carries weight 0.7). */
function expandQuery(tokens: string[]): Map<string, number> {
  const weights = new Map<string, number>();
  const bump = (t: string, w: number) => {
    weights.set(t, Math.max(weights.get(t) ?? 0, w));
  };
  for (const t of tokens) {
    bump(t, 1);
    const syns = SYNONYMS[t];
    if (syns) {
      for (const s of syns) {
        for (const st of tokenize(s)) bump(st, 0.7);
      }
    }
  }
  return weights;
}

// ── BM25 index (built once at module load) ───────────────────────────────────
const K1 = 1.4;
const B = 0.75;
const TAG_BOOST = 4;
const TITLE_BOOST = 3;

interface DocIndex {
  entry: KnowledgeEntry;
  tf: Map<string, number>;
  len: number;
}

function buildIndex(entries: KnowledgeEntry[]): {
  docs: DocIndex[];
  df: Map<string, number>;
  avgLen: number;
} {
  const docs: DocIndex[] = [];
  const df = new Map<string, number>();
  let totalLen = 0;

  for (const entry of entries) {
    const tf = new Map<string, number>();
    const add = (tokens: string[], weight: number) => {
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + weight);
    };
    add(tokenize(entry.text), 1);
    add(tokenize(entry.title), TITLE_BOOST);
    add(tokenize(entry.tags.join(" ")), TAG_BOOST);

    let len = 0;
    for (const v of tf.values()) len += v;
    totalLen += len;
    for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
    docs.push({ entry, tf, len });
  }
  return { docs, df, avgLen: totalLen / Math.max(1, docs.length) };
}

const INDEX = buildIndex(FULL_KB);

function idf(term: string): number {
  const n = INDEX.docs.length;
  const d = INDEX.df.get(term) ?? 0;
  return Math.log(1 + (n - d + 0.5) / (d + 0.5));
}

/**
 * BM25 search over the full knowledge base. Returns topK hits with raw +
 * normalized scores and the terms that matched (for explainability).
 */
export function searchKnowledge(query: string, topK = 5): SearchHit[] {
  const weights = expandQuery(tokenize(query));
  if (weights.size === 0) return [];

  const hits: SearchHit[] = [];
  for (const doc of INDEX.docs) {
    let score = 0;
    const matched: string[] = [];
    for (const [term, w] of weights) {
      const tf = doc.tf.get(term);
      if (!tf) continue;
      const denom = tf + K1 * (1 - B + (B * doc.len) / INDEX.avgLen);
      score += idf(term) * ((tf * (K1 + 1)) / denom) * w;
      if (w >= 1) matched.push(term);
    }
    if (score > 0) {
      hits.push({ entry: doc.entry, score, normalized: 0, matchedTerms: matched.slice(0, 8) });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  const top = hits[0]?.score ?? 1;
  return hits.slice(0, topK).map((h) => ({
    ...h,
    normalized: Math.max(0.05, Math.min(1, h.score / top)),
  }));
}

/** Compact context block for prompt grounding, with inline source titles. */
export function knowledgeContextBlock(query: string, topK = 3): string {
  const hits = searchKnowledge(query, topK);
  if (hits.length === 0) return "";
  return hits
    .map(
      (h, i) =>
        `[${i + 1}] ${h.entry.title} — ${h.entry.text} (Source: ${h.entry.source})`
    )
    .join("\n");
}
