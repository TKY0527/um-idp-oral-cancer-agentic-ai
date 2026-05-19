import type {
  ConsensusReport,
  VisionProviderId,
  VisionResult,
} from "@/lib/types/screening";
import type {
  VisionProvider,
  VisionProviderInput,
} from "@/lib/visionProviders/mockVisionProvider";
import { mockVisionProvider } from "@/lib/visionProviders/mockVisionProvider";
import { geminiVisionProvider } from "@/lib/visionProviders/geminiVisionProvider";
import { claudeVisionProvider } from "@/lib/visionProviders/claudeVisionProvider";
import { localModelProvider } from "@/lib/visionProviders/localModelProvider";

const PROVIDERS: Record<VisionProviderId, VisionProvider> = {
  mock: mockVisionProvider,
  gemini: geminiVisionProvider,
  claude: claudeVisionProvider,
  local: localModelProvider,
};

export interface ConsensusInput {
  primaryProvider: VisionProviderId;
  secondaryProvider: VisionProviderId;
  imageBase64: string;
  imageMimeType: string;
}

function categorize(p: number): "low" | "medium" | "high" {
  if (p >= 0.6) return "high";
  if (p >= 0.3) return "medium";
  return "low";
}

function scoreAgreement(a: VisionResult, b: VisionResult): {
  agreement: ConsensusReport["agreement"];
  agreementScore: number;
} {
  // Compare visual finding (exact match worth 0.5).
  const findingMatch = a.visualFinding === b.visualFinding ? 0.5 : 0;
  // Compare probability bucket (worth 0.3).
  const bucketMatch = categorize(a.oralCancerLikeProbability) ===
    categorize(b.oralCancerLikeProbability)
    ? 0.3
    : 0;
  // Compare suspected region (worth 0.2).
  const regionMatch = a.suspectedRegion === b.suspectedRegion ? 0.2 : 0;

  const score = findingMatch + bucketMatch + regionMatch;

  let agreement: ConsensusReport["agreement"];
  if (score >= 0.85) agreement = "strong";
  else if (score >= 0.5) agreement = "partial";
  else if (score >= 0.25) agreement = "weak";
  else agreement = "conflict";

  return { agreement, agreementScore: Number(score.toFixed(2)) };
}

/**
 * Consensus Agent
 *
 * Runs two vision providers in parallel and computes an agreement
 * score across visual finding, probability bucket, and suspected
 * region. Useful for showing "Gemini says X, Claude says Y, they
 * agree strongly" in the UI.
 *
 * If one provider lacks credentials it silently falls back to mock —
 * the consensus is still computed but the "note" makes it clear.
 */
export async function runConsensusAgent(
  input: ConsensusInput
): Promise<ConsensusReport> {
  const primary = PROVIDERS[input.primaryProvider] ?? mockVisionProvider;
  const secondary = PROVIDERS[input.secondaryProvider] ?? mockVisionProvider;

  const payload: VisionProviderInput = {
    imageBase64: input.imageBase64,
    imageMimeType: input.imageMimeType,
  };

  const [primaryRes, secondaryRes] = await Promise.allSettled([
    primary.analyze(payload),
    secondary.analyze(payload),
  ]);

  const primaryOut: VisionResult =
    primaryRes.status === "fulfilled"
      ? primaryRes.value
      : await mockVisionProvider.analyze(payload);
  const secondaryOut: VisionResult =
    secondaryRes.status === "fulfilled"
      ? secondaryRes.value
      : await mockVisionProvider.analyze(payload);

  const { agreement, agreementScore } = scoreAgreement(primaryOut, secondaryOut);

  const notes: string[] = [];
  if (primaryRes.status === "rejected") {
    notes.push(`Primary (${input.primaryProvider}) fell back to mock.`);
  }
  if (secondaryRes.status === "rejected") {
    notes.push(`Secondary (${input.secondaryProvider}) fell back to mock.`);
  }
  if (notes.length === 0) {
    notes.push(`Both providers returned. Agreement: ${agreement}.`);
  }

  return {
    primaryProvider: input.primaryProvider,
    secondaryProvider: input.secondaryProvider,
    agreement,
    agreementScore,
    primary: primaryOut,
    secondary: secondaryOut,
    note: notes.join(" "),
  };
}
