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

const SYSTEM_PROMPT = `You are a COMMUNITY GENERAL DENTIST with 10 years of clinical practice. You see this patient face-to-face every 6 months and your job is clinical pragmatics: what to TELL the patient, when to REFER, and what FOLLOW-UP timeline to set.

Your domain focus:
- Patient-centred communication: don't scare the patient, don't dismiss them
- Clear referral threshold (when to send to oral medicine / oral surgeon)
- Practical follow-up interval
- Risk-stratified messaging tailored to literacy

You use plain language (no jargon). You focus on actions and timelines, not deep biology. You think about real-world barriers (cost, distance to specialist, patient anxiety).

Return ONLY a JSON object:

{
  "expertRole": "general_dentist",
  "visualFindingAssessment": "<one of: normal | ulcer_like | white_patch_like | red_patch_like | mixed_white_red_patch_like | unclear>",
  "probabilityEstimate": <number 0..1>,
  "confidence": <number 0..1>,
  "keyConcerns": ["practical concern", "..."],
  "recommendedAction": "<one of: biopsy_indicated | urgent_referral | monitor_2_weeks | watchful_wait | reassure>",
  "reasoning": "2-3 sentences in plain English",
  "questionsToAsk": ["practical patient question", "..."]
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
    expertRole: "general_dentist",
    label: "General Dentist",
    provider,
    visualFindingAssessment: finding,
    probabilityEstimate: num(raw.probabilityEstimate, fallback.oralCancerLikeProbability),
    confidence: num(raw.confidence, 0.65),
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
  const v = input.vision;
  const q = input.questionnaire;
  let action: ExpertRecommendation;
  let concerns: string[] = [];
  let reasoning = "";

  // Dentists are pragmatic — they balance imaging severity with patient context.
  if (
    v.visualFinding === "mixed_white_red_patch_like" ||
    v.visualFinding === "red_patch_like"
  ) {
    action = "urgent_referral";
    concerns = [
      "Visible red component is the most urgent feature on photo",
      "Refer to oral medicine within 2 weeks",
    ];
    reasoning =
      "Red and mixed red/white patches always need a specialist look, even if the patient feels nothing. I'd phone the oral medicine clinic today and write a referral letter the same day.";
  } else if (v.visualFinding === "white_patch_like" || v.visualFinding === "ulcer_like") {
    if (q.lesionDurationWeeks > 4 || q.bleeding) {
      action = "urgent_referral";
      concerns = ["Persistent lesion > 4 weeks or bleeding", "Don't wait for the next 6-month check-up"];
      reasoning =
        "Anything in the mouth that hasn't healed in 4 weeks, or that bleeds, needs a specialist within 2 weeks. I'd explain to the patient calmly that this is a precaution, not a diagnosis.";
    } else {
      action = "monitor_2_weeks";
      concerns = ["Re-examine in 2 weeks before deciding referral"];
      reasoning =
        "I'd ask the patient to come back in 2 weeks for a re-look. If the lesion is still there or has grown, I refer. If it's gone, we continue routine care.";
    }
  } else if (v.visualFinding === "unclear") {
    action = "monitor_2_weeks";
    concerns = ["Photo quality is too poor to decide", "Recommend in-chair examination"];
    reasoning =
      "I can't make a clinical decision from this photo alone. I'd book a chair appointment within the week for a proper look with good lighting.";
  } else {
    action = "reassure";
    concerns = ["No visible suspicious lesion"];
    reasoning =
      "Nothing concerning on the photo. I'd reassure the patient, reinforce oral-hygiene habits, and re-check at the next routine appointment.";
  }

  // Practical question list — what a dentist would actually ask
  const questionsToAsk: string[] = [];
  if (q.lesionDurationWeeks > 0) {
    questionsToAsk.push(`Has the ${q.ulcer ? "ulcer" : "patch"} changed in size or shape?`);
  }
  if (!q.tobacco && !q.alcohol && !q.betelQuid) {
    questionsToAsk.push("Any other tobacco / alcohol / betel exposure you didn't mention?");
  }
  questionsToAsk.push("Does it hurt to eat or drink certain things?");
  if (questionsToAsk.length < 3) {
    questionsToAsk.push("When did you last have a dental check-up?");
  }

  return {
    expertRole: "general_dentist",
    label: "General Dentist",
    provider: "mock",
    visualFindingAssessment: v.visualFinding,
    probabilityEstimate: v.oralCancerLikeProbability,
    confidence: 0.7,
    keyConcerns: concerns,
    recommendedAction: action,
    reasoning,
    questionsToAsk: questionsToAsk.slice(0, 3),
    fellBackToMock: true,
  };
}

export async function runGeneralDentistExpert(
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
      temperature: 0.4, // a bit more conversational
    });
    return coerce(raw, input.vision, "gemini", false);
  } catch {
    return mockOpinion(input);
  }
}
