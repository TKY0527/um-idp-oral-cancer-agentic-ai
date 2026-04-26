import type {
  AuditLogEntry,
  ClinicianReferral,
  Questionnaire,
  ScreeningSession,
  VisionProviderId,
  VisionResult,
} from "@/lib/types/screening";
import { newSessionId, nowISO } from "@/lib/utils/riskUtils";
import { runToothbrushIoTAgent } from "@/lib/agents/toothbrushIoTAgent";
import { runVisionScreeningAgent } from "@/lib/agents/visionScreeningAgent";
import { runCancerRiskScoringAgent } from "@/lib/agents/cancerRiskScoringAgent";
import { runPatientCommunicationAgent } from "@/lib/agents/patientCommunicationAgent";
import { runClinicianReferralAgent } from "@/lib/agents/clinicianReferralAgent";

export interface OrchestratorInput {
  source: "sample" | "upload";
  sampleId?: string;
  imageBase64?: string;
  imageMimeType?: string;
  fileName?: string;
  preset?: VisionResult;
  questionnaire: Questionnaire;
  preferredProvider: VisionProviderId;
}

/**
 * Orchestrator Agent
 *
 * The only agent that knows the full pipeline. It is responsible for:
 *   1. Creating a session id and audit log
 *   2. Calling Toothbrush IoT Agent
 *   3. Calling Vision Screening Agent
 *   4. Calling Cancer Risk Scoring Agent
 *   5. Calling Patient Communication Agent
 *   6. Calling Clinician Referral Agent only when risk is High
 *   7. Producing the full screening session record
 */
export async function runOrchestratorAgent(
  input: OrchestratorInput
): Promise<ScreeningSession> {
  const sessionId = newSessionId();
  const startedAt = nowISO();
  const log: AuditLogEntry[] = [];
  const logEvent = (agent: string, event: string, detail?: string) => {
    log.push({ timestamp: nowISO(), agent, event, detail });
  };

  logEvent("Orchestrator", "session_started", `Session id: ${sessionId}`);
  logEvent(
    "Orchestrator",
    "inputs_received",
    `Source: ${input.source}${input.sampleId ? ` (${input.sampleId})` : ""}, provider: ${input.preferredProvider}`
  );

  // 1. Toothbrush IoT Agent
  logEvent("ToothbrushIoTAgent", "called", "Simulating smart toothbrush telemetry");
  const toothbrush = await runToothbrushIoTAgent({
    seed: sessionId,
    qualityHint: input.preset?.imageQuality,
  });
  logEvent(
    "ToothbrushIoTAgent",
    "completed",
    `sessionValid=${toothbrush.sessionValid}, imageQualityScore=${toothbrush.imageQualityScore}`
  );

  // 2. Vision Screening Agent
  logEvent(
    "VisionScreeningAgent",
    "called",
    `Preferred provider: ${input.preferredProvider}${input.preset ? " (sample preset)" : ""}`
  );
  const visionRes = await runVisionScreeningAgent({
    preferredProvider: input.preferredProvider,
    imageBase64: input.imageBase64,
    imageMimeType: input.imageMimeType,
    preset: input.preset,
  });
  if (visionRes.providerStatus.fellBack) {
    logEvent(
      "VisionScreeningAgent",
      "fallback",
      visionRes.providerStatus.reason ?? "Fell back to mock provider"
    );
  }
  logEvent(
    "VisionScreeningAgent",
    "completed",
    `finding=${visionRes.vision.visualFinding}, prob=${visionRes.vision.oralCancerLikeProbability.toFixed(2)}, used=${visionRes.providerStatus.used}`
  );

  // 3. Cancer Risk Scoring Agent
  logEvent("CancerRiskScoringAgent", "called", "Combining vision + questionnaire + telemetry");
  const risk = await runCancerRiskScoringAgent({
    vision: visionRes.vision,
    questionnaire: input.questionnaire,
    toothbrush,
  });
  logEvent(
    "CancerRiskScoringAgent",
    "completed",
    `score=${risk.score}, level=${risk.riskLevel}, confidence=${risk.confidenceLevel}`
  );

  // 4. Patient Communication Agent
  logEvent("PatientCommunicationAgent", "called", "Generating patient-friendly report");
  const patientReport = await runPatientCommunicationAgent({
    vision: visionRes.vision,
    risk,
    toothbrush,
  });
  logEvent("PatientCommunicationAgent", "completed", `headline="${patientReport.headline}"`);

  // 5. Clinician Referral Agent (only when high risk)
  let clinicianReferral: ClinicianReferral | null = null;
  if (risk.riskLevel === "High") {
    logEvent("ClinicianReferralAgent", "called", "High risk → generating referral packet");
    clinicianReferral = await runClinicianReferralAgent({
      vision: visionRes.vision,
      risk,
      toothbrush,
      questionnaire: input.questionnaire,
    });
    logEvent("ClinicianReferralAgent", "completed", "Referral packet ready");
  } else {
    logEvent(
      "ClinicianReferralAgent",
      "skipped",
      `Risk level is ${risk.riskLevel} — referral not required.`
    );
  }

  const finishedAt = nowISO();
  logEvent("Orchestrator", "session_completed", `Finished at ${finishedAt}`);

  return {
    sessionId,
    startedAt,
    finishedAt,
    providerStatus: visionRes.providerStatus,
    toothbrush,
    vision: visionRes.vision,
    risk,
    patientReport,
    clinicianReferral,
    auditLog: log,
    questionnaire: input.questionnaire,
    imageMeta: {
      source: input.source,
      sampleId: input.sampleId,
      fileName: input.fileName,
      sizeBytes: input.imageBase64
        ? Math.floor((input.imageBase64.length * 3) / 4)
        : undefined,
    },
  };
}
