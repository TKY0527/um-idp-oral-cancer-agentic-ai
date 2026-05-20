import type {
  ExpertOpinion,
  ExpertRecommendation,
  Questionnaire,
  VisionResult,
  VisualFinding,
} from "@/lib/types/screening";
import { callGeminiExpert } from "./_geminiTextExpert";

export interface ExpertInput {
  vision: VisionResult;
  questionnaire: Questionnaire;
}

const SYSTEM_PROMPT = `You are an ORAL CANCER EPIDEMIOLOGIST working with WHO / IARC. You assess every case from a population-risk perspective grounded in published odds ratios.

Your knowledge:
- IARC Monograph Vol 85: betel quid Group 1, OR ~7-20x
- IARC Monograph Vol 100E: tobacco + alcohol Group 1
- INHANCE consortium (Hashibe 2007, 2009): tobacco x alcohol supra-additive, combined OR up to ~35x
- Warnakulasuriya 2009: incidence doubles per decade after age 40
- South / SE Asia: betel-quid burden is the dominant attributable risk

You assess this case from a population-attributable-risk standpoint. You use epidemiology vocabulary (OR, RR, attributable risk, synergy). Be data-driven, cite the magnitude of each contributing factor.

You will receive a JSON case description. Return ONLY a JSON object:

{
  "expertRole": "epidemiologist",
  "visualFindingAssessment": "<one of: normal | ulcer_like | white_patch_like | red_patch_like | mixed_white_red_patch_like | unclear>",
  "probabilityEstimate": <number 0..1>,
  "confidence": <number 0..1>,
  "keyConcerns": ["risk factor with OR magnitude", "..."],
  "recommendedAction": "<one of: biopsy_indicated | urgent_referral | monitor_2_weeks | watchful_wait | reassure>",
  "reasoning": "2-3 sentences using OR / population-risk language",
  "questionsToAsk": ["question that clarifies an exposure", "..."]
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
  provider: "mock" | "gemini",
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
    expertRole: "epidemiologist",
    label: "Epidemiologist (WHO/IARC)",
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

function mockOpinion(input: ExpertInput): ExpertOpinion {
  const q = input.questionnaire;
  const v = input.vision;
  const concerns: string[] = [];
  let probAdj = v.oralCancerLikeProbability;

  if (q.betelQuid) {
    concerns.push("Betel quid use — IARC Group 1, OR ≈ 7–20× (largest modifiable factor)");
    probAdj += 0.05;
  }
  if (q.tobacco && q.alcohol) {
    concerns.push("Tobacco × alcohol synergy — INHANCE combined OR up to ≈ 35×");
    probAdj += 0.08;
  } else if (q.tobacco) {
    concerns.push("Tobacco use — IARC Group 1, OR ≈ 3–5×");
    probAdj += 0.04;
  } else if (q.alcohol) {
    concerns.push("Heavy alcohol use — OR ≈ 2–3×");
    probAdj += 0.02;
  }
  if (q.tobacco && q.betelQuid) {
    concerns.push("Tobacco × betel quid — region-dominant phenotype");
    probAdj += 0.04;
  }
  if (q.age >= 65) {
    concerns.push(`Age ${q.age} — incidence ~4× the population mean`);
    probAdj += 0.03;
  } else if (q.age >= 55) {
    concerns.push(`Age ${q.age} — incidence ~2× the population mean`);
    probAdj += 0.02;
  }
  if (q.familyHistory) {
    concerns.push("First-degree family history — OR ≈ 2×");
    probAdj += 0.02;
  }
  if (concerns.length === 0) {
    concerns.push("No major modifiable risk factors reported");
  }

  let action: ExpertRecommendation;
  if (probAdj >= 0.6 || (q.betelQuid && q.tobacco)) {
    action = "urgent_referral";
  } else if (probAdj >= 0.4) {
    action = "monitor_2_weeks";
  } else if (probAdj >= 0.2) {
    action = "watchful_wait";
  } else {
    action = "reassure";
  }

  return {
    expertRole: "epidemiologist",
    label: "Epidemiologist (WHO/IARC)",
    provider: "mock",
    visualFindingAssessment: v.visualFinding,
    probabilityEstimate: Math.min(0.95, probAdj),
    confidence: 0.72,
    keyConcerns: concerns.slice(0, 4),
    recommendedAction: action,
    reasoning:
      `Population-attributable risk in this case is dominated by ${
        q.betelQuid
          ? "betel-quid exposure (largest single modifiable OR in our region)"
          : q.tobacco
            ? "tobacco use"
            : "non-behavioural factors"
      }. ${
        q.tobacco && q.alcohol
          ? "The supra-additive tobacco × alcohol effect (INHANCE) further elevates risk beyond the simple sum of the two."
          : "Modifiable factors should be addressed regardless of imaging outcome."
      }`,
    questionsToAsk: [
      "Duration and frequency of betel-quid or tobacco use?",
      "Daily alcohol units? Concurrent with tobacco?",
      "Any prior diagnosis of OPMD or head-and-neck malignancy?",
    ],
    fellBackToMock: true,
  };
}

export async function runEpidemiologistExpert(
  input: ExpertInput
): Promise<ExpertOpinion> {
  const userPayload = JSON.stringify({
    visionAgent: input.vision,
    questionnaire: input.questionnaire,
  });
  try {
    const raw = await callGeminiExpert<RawOpinion>({
      systemPrompt: SYSTEM_PROMPT,
      userPayload,
      temperature: 0.3, // data-driven
    });
    return coerce(raw, input.vision, "gemini", false);
  } catch (err) {
    console.warn(
      "[epidemiologistExpert] Gemini failed, falling back to mock:",
      err instanceof Error ? err.message : err
    );
    return mockOpinion(input);
  }
}
