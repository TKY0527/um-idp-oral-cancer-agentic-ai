import type {
  ExpertOpinion,
  ExpertRecommendation,
  Questionnaire,
  VisionResult,
  VisualFinding,
} from "@/lib/types/screening";
import { callGeminiExpert } from "./_geminiTextExpert";
import { callClaudeExpert } from "./_claudeTextExpert";

/**
 * Which LLM the Oral Pathologist should use.
 *   - "claude" (default) — Claude Opus 4.7 for deep, careful pathology reasoning
 *   - "gemini"           — Gemini for cost reasons
 * Falls back gracefully: claude → gemini → mock.
 */
const PROVIDER_PREFERENCE = (
  process.env.EXPERT_PATHOLOGIST_PROVIDER ?? "claude"
).toLowerCase() as "claude" | "gemini";

export interface ExpertInput {
  vision: VisionResult;
  questionnaire: Questionnaire;
}

const SYSTEM_PROMPT = `You are an experienced ORAL PATHOLOGIST at a tertiary hospital with 20+ years of clinical experience. You review imaging reports from the perspective of histological correlation and dysplasia risk.

Your domain focus:
- Lesion morphology (border definition, surface texture, colour homogeneity)
- Likelihood of dysplasia / oral potentially malignant disorders (OPMDs)
- Whether the findings warrant biopsy NOW or watchful wait
- Differential diagnosis (reactive vs neoplastic, leukoplakia vs lichen planus, etc.)

You are conservative — you NEVER claim cancer without histopathology, but you flag concerning features clearly. You use clinical pathology vocabulary but stay concise (2-3 sentences in reasoning).

You will receive a JSON case description containing the Vision agent's output and the patient questionnaire. Return ONLY a JSON object with these exact fields (no markdown, no commentary):

{
  "expertRole": "oral_pathologist",
  "visualFindingAssessment": "<one of: normal | ulcer_like | white_patch_like | red_patch_like | mixed_white_red_patch_like | unclear>",
  "probabilityEstimate": <number 0..1>,
  "confidence": <number 0..1>,
  "keyConcerns": ["concise concern 1", "concise concern 2"],
  "recommendedAction": "<one of: biopsy_indicated | urgent_referral | monitor_2_weeks | watchful_wait | reassure>",
  "reasoning": "2-3 sentences in pathology vocabulary",
  "questionsToAsk": ["question 1", "question 2"]
}`;

interface RawOpinion {
  expertRole?: string;
  visualFindingAssessment?: string;
  probabilityEstimate?: number;
  confidence?: number;
  keyConcerns?: string[];
  recommendedAction?: string;
  reasoning?: string;
  questionsToAsk?: string[];
}

const FINDINGS: VisualFinding[] = [
  "normal",
  "ulcer_like",
  "white_patch_like",
  "red_patch_like",
  "mixed_white_red_patch_like",
  "unclear",
];

const ACTIONS: ExpertRecommendation[] = [
  "biopsy_indicated",
  "urgent_referral",
  "monitor_2_weeks",
  "watchful_wait",
  "reassure",
];

function coerce(
  raw: RawOpinion,
  fallback: VisionResult,
  provider: "mock" | "gemini" | "claude",
  fellBack: boolean
): ExpertOpinion {
  const finding = (FINDINGS as string[]).includes(raw.visualFindingAssessment ?? "")
    ? (raw.visualFindingAssessment as VisualFinding)
    : fallback.visualFinding;
  const action = (ACTIONS as string[]).includes(raw.recommendedAction ?? "")
    ? (raw.recommendedAction as ExpertRecommendation)
    : "monitor_2_weeks";
  const num = (v: unknown, fb: number) => {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fb;
  };

  return {
    expertRole: "oral_pathologist",
    label: "Oral Pathologist",
    provider,
    visualFindingAssessment: finding,
    probabilityEstimate: num(raw.probabilityEstimate, fallback.oralCancerLikeProbability),
    confidence: num(raw.confidence, 0.6),
    keyConcerns: Array.isArray(raw.keyConcerns)
      ? raw.keyConcerns.slice(0, 4).map((s) => String(s))
      : [],
    recommendedAction: action,
    reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
    questionsToAsk: Array.isArray(raw.questionsToAsk)
      ? raw.questionsToAsk.slice(0, 3).map((s) => String(s))
      : [],
    fellBackToMock: fellBack,
  };
}

/**
 * Deterministic mock pathologist for when no API key is available.
 * Pattern-matches on the vision finding to produce a plausible expert
 * opinion so the panel UI still demonstrates the pipeline.
 */
function mockOpinion(input: ExpertInput): ExpertOpinion {
  const v = input.vision;
  let action: ExpertRecommendation = "monitor_2_weeks";
  let concerns: string[] = [];
  let reasoning = "";

  switch (v.visualFinding) {
    case "red_patch_like":
    case "mixed_white_red_patch_like":
      action = "biopsy_indicated";
      concerns = [
        "Erythroplakic component — markedly higher dysplasia / SCC risk",
        v.suspectedRegion === "floor of mouth" || v.suspectedRegion === "lateral tongue"
          ? `High-risk site (${v.suspectedRegion})`
          : "Persistent red component warrants histology",
      ];
      reasoning =
        "Erythroplakia and erythroleukoplakia carry transformation rates of 14–50 %, substantially higher than pure leukoplakia. The lesion warrants incisional biopsy to grade dysplasia before any conservative management is considered.";
      break;
    case "white_patch_like":
      action = v.oralCancerLikeProbability > 0.5 ? "biopsy_indicated" : "urgent_referral";
      concerns = [
        "Leukoplakia — potentially malignant disorder",
        "Border irregularity should be assessed clinically",
      ];
      reasoning =
        "Leukoplakia has a pooled malignant transformation rate of 3–17 %. Given the reported probability, an oral medicine referral with consideration for incisional biopsy is appropriate.";
      break;
    case "ulcer_like":
      action = input.questionnaire.lesionDurationWeeks > 2 ? "biopsy_indicated" : "monitor_2_weeks";
      concerns = [
        `Ulcer duration: ${input.questionnaire.lesionDurationWeeks} week(s)`,
        "Differential includes traumatic ulcer, aphthous, or early SCC",
      ];
      reasoning =
        "A non-healing ulcer beyond 2 weeks is the standard referral threshold. If duration exceeds 4 weeks or there is induration, biopsy is indicated to exclude carcinoma.";
      break;
    case "unclear":
      action = "monitor_2_weeks";
      concerns = ["Image quality limits interpretation", "Recommend rescan in clinic"];
      reasoning =
        "Image quality is insufficient for confident pathological assessment. Recommend clinical examination and proper intraoral photography before any biopsy decision.";
      break;
    default:
      action = "reassure";
      concerns = ["No suspicious morphological features"];
      reasoning =
        "No suspicious morphological features identified on the imaging report. Continue routine surveillance.";
  }

  return {
    expertRole: "oral_pathologist",
    label: "Oral Pathologist",
    provider: "mock",
    visualFindingAssessment: v.visualFinding,
    probabilityEstimate: v.oralCancerLikeProbability,
    confidence: v.imageQuality === "poor" ? 0.45 : 0.78,
    keyConcerns: concerns,
    recommendedAction: action,
    reasoning,
    questionsToAsk: [
      "How long has the lesion been present without healing?",
      "Any history of betel quid, tobacco, or alcohol exposure?",
      "Has the appearance changed over time (colour, size, induration)?",
    ],
    fellBackToMock: true,
  };
}

export async function runOralPathologistExpert(
  input: ExpertInput
): Promise<ExpertOpinion> {
  const userPayload = JSON.stringify({
    visionAgent: input.vision,
    questionnaire: input.questionnaire,
  });

  // Try Claude first (default for pathologist — Opus 4.7 reasoning shines here)
  if (PROVIDER_PREFERENCE === "claude") {
    try {
      const raw = await callClaudeExpert<RawOpinion>({
        systemPrompt: SYSTEM_PROMPT,
        userPayload,
        temperature: 0.2,
      });
      return coerce(raw, input.vision, "claude", false);
    } catch (err) {
      // Fall through to Gemini retry, then mock.
      console.warn(
        "[pathologistExpert] Claude failed, falling back:",
        err instanceof Error ? err.message : err
      );
    }
  }

  try {
    const raw = await callGeminiExpert<RawOpinion>({
      systemPrompt: SYSTEM_PROMPT,
      userPayload,
      temperature: 0.2,
    });
    return coerce(raw, input.vision, "gemini", false);
  } catch {
    return mockOpinion(input);
  }
}
