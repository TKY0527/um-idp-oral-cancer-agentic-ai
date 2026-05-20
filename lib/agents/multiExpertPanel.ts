import type {
  PanelDiscussion,
  Questionnaire,
  RiskLevel,
  VisionResult,
} from "@/lib/types/screening";
import { runOralPathologistExpert } from "./experts/oralPathologistExpert";
import { runEpidemiologistExpert } from "./experts/epidemiologistExpert";
import { runGeneralDentistExpert } from "./experts/generalDentistExpert";
import { runModeratorAgent } from "./moderatorAgent";

export interface PanelInput {
  vision: VisionResult;
  questionnaire: Questionnaire;
  ruleBasedRiskLevel: RiskLevel;
  triggerReason: string;
}

/**
 * Multi-Expert Panel orchestrator.
 *
 * Runs the three role-prompted experts IN PARALLEL (Promise.all) so the
 * wall-clock cost is approximately one LLM call rather than three. Each
 * expert independently falls back to its deterministic mock on failure,
 * so the moderator always receives three opinions.
 *
 * Returns a fully-populated PanelDiscussion ready to attach to the
 * ScreeningSession.
 */
export async function runMultiExpertPanel(
  input: PanelInput
): Promise<PanelDiscussion> {
  const expertInput = {
    vision: input.vision,
    questionnaire: input.questionnaire,
  };

  const [pathologist, epidemiologist, dentist] = await Promise.all([
    runOralPathologistExpert(expertInput),
    runEpidemiologistExpert(expertInput),
    runGeneralDentistExpert(expertInput),
  ]);

  return await runModeratorAgent({
    opinions: [pathologist, epidemiologist, dentist],
    triggerReason: input.triggerReason,
    ruleBasedRiskLevel: input.ruleBasedRiskLevel,
  });
}
