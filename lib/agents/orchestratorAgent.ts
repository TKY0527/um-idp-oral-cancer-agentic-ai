import type {
  AuditLogEntry,
  ClinicianReferral,
  ProviderKeys,
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
import { runTriagePrioritizationAgent } from "@/lib/agents/triagePrioritizationAgent";
import { runRetrievalAgent } from "@/lib/agents/retrievalAgent";
import { runConsensusAgent } from "@/lib/agents/consensusAgent";
import { runMultiExpertPanel } from "@/lib/agents/multiExpertPanel";
import { runDentalWellnessAgent } from "@/lib/agents/dentalWellnessAgent";

export interface OrchestratorInput {
  source: "sample" | "upload";
  sampleId?: string;
  imageBase64?: string;
  imageMimeType?: string;
  fileName?: string;
  preset?: VisionResult;
  questionnaire: Questionnaire;
  preferredProvider: VisionProviderId;
  consensusProvider?: VisionProviderId;
  /**
   * Demo BYOK: user-pasted API keys. Used for the direct provider calls in
   * this run only — never logged, never persisted.
   */
  apiKeys?: ProviderKeys;
  /** Days since the patient's last professional scaling (from their record). */
  lastScalingDaysAgo?: number;
  /**
   * Controls the multi-expert panel:
   *   - "auto"  (default) — runs only when risk is Medium or High
   *   - "always" — runs on every session
   *   - "never" — never runs
   */
  expertPanelMode?: "auto" | "always" | "never";
  /** Optional per-step progress callback for SSE streaming. */
  onStep?: (event: { agent: string; status: "started" | "completed" | "skipped"; detail?: string }) => void;
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

  const emit = input.onStep ?? (() => {});

  logEvent("Orchestrator", "session_started", `Session id: ${sessionId}`);
  emit({ agent: "Orchestrator", status: "started", detail: sessionId });
  const imageSizeBytes = input.imageBase64
    ? Math.floor((input.imageBase64.length * 3) / 4)
    : 0;
  logEvent(
    "Orchestrator",
    "inputs_received",
    `Source: ${input.source}${input.sampleId ? ` (${input.sampleId})` : ""}, ` +
      `provider: ${input.preferredProvider}` +
      (imageSizeBytes > 0
        ? `, image: ${(imageSizeBytes / 1024).toFixed(1)} KB`
        : "") +
      (input.consensusProvider
        ? `, consensus: ${input.consensusProvider}`
        : "")
  );

  // 1. Toothbrush IoT Agent
  emit({ agent: "ToothbrushIoTAgent", status: "started" });
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
  emit({ agent: "ToothbrushIoTAgent", status: "completed", detail: `quality=${toothbrush.imageQualityScore}` });

  // 2. Vision Screening Agent
  emit({ agent: "VisionScreeningAgent", status: "started", detail: input.preferredProvider });
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
    apiKeys: input.apiKeys,
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
  emit({ agent: "VisionScreeningAgent", status: "completed", detail: visionRes.vision.visualFinding });

  // 2b. Optional Consensus Agent (run a second LLM in parallel for cross-check)
  let consensus = undefined as ScreeningSession["consensus"];
  if (
    input.consensusProvider &&
    input.consensusProvider !== input.preferredProvider &&
    input.imageBase64
  ) {
    emit({ agent: "ConsensusAgent", status: "started", detail: input.consensusProvider });
    logEvent(
      "ConsensusAgent",
      "called",
      `Cross-checking ${input.preferredProvider} vs ${input.consensusProvider}`
    );
    try {
      consensus = await runConsensusAgent({
        primaryProvider: input.preferredProvider,
        secondaryProvider: input.consensusProvider,
        imageBase64: input.imageBase64,
        imageMimeType: input.imageMimeType ?? "image/jpeg",
        apiKeys: input.apiKeys,
      });
      logEvent(
        "ConsensusAgent",
        "completed",
        `agreement=${consensus.agreement} (${consensus.agreementScore})`
      );
      emit({ agent: "ConsensusAgent", status: "completed", detail: consensus.agreement });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      logEvent("ConsensusAgent", "failed", msg);
      emit({ agent: "ConsensusAgent", status: "skipped", detail: msg });
    }
  } else {
    emit({ agent: "ConsensusAgent", status: "skipped" });
  }

  // 3. Cancer Risk Scoring Agent
  emit({ agent: "CancerRiskScoringAgent", status: "started" });
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
  emit({ agent: "CancerRiskScoringAgent", status: "completed", detail: `${risk.score}/${risk.riskLevel}` });

  // 3b. Retrieval Agent (RAG over oral-cancer knowledge base)
  emit({ agent: "RetrievalAgent", status: "started" });
  logEvent("RetrievalAgent", "called", "Grounding result in oral-cancer knowledge base");
  const retrieval = await runRetrievalAgent({
    vision: visionRes.vision,
    questionnaire: input.questionnaire,
    topK: 3,
  });
  logEvent(
    "RetrievalAgent",
    "completed",
    `top hit: ${retrieval[0]?.title ?? "(none)"}`
  );
  emit({ agent: "RetrievalAgent", status: "completed", detail: retrieval[0]?.title });

  // 3c. Multi-Expert Panel (auto-trigger on Medium/High risk by default).
  // Three role-prompted experts (Oral Pathologist, Epidemiologist, General
  // Dentist) deliberate in parallel; a deterministic Moderator synthesises
  // the verdict and surfaces inter-expert disagreement.
  const panelMode = input.expertPanelMode ?? "auto";
  const shouldRunPanel =
    panelMode === "always" ||
    (panelMode === "auto" &&
      (risk.riskLevel === "Medium" || risk.riskLevel === "High"));

  let panelDiscussion: ScreeningSession["panelDiscussion"] = undefined;
  if (shouldRunPanel) {
    const triggerReason =
      panelMode === "always"
        ? "Panel mode forced to 'always'."
        : `Auto-triggered because risk band is ${risk.riskLevel} (panel runs on Medium/High).`;
    emit({ agent: "MultiExpertPanel", status: "started", detail: triggerReason });
    logEvent("MultiExpertPanel", "called", triggerReason);
    try {
      panelDiscussion = await runMultiExpertPanel({
        vision: visionRes.vision,
        questionnaire: input.questionnaire,
        ruleBasedRiskLevel: risk.riskLevel,
        triggerReason,
        apiKeys: input.apiKeys,
      });
      logEvent(
        "MultiExpertPanel",
        "completed",
        `consensus=${panelDiscussion.consensus} (${(panelDiscussion.agreementScore * 100).toFixed(0)}%), escalation=${panelDiscussion.escalation}`
      );
      emit({
        agent: "MultiExpertPanel",
        status: "completed",
        detail: `${panelDiscussion.consensus} · ${panelDiscussion.escalation}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      logEvent("MultiExpertPanel", "failed", msg);
      emit({ agent: "MultiExpertPanel", status: "skipped", detail: msg });
    }
  } else {
    emit({
      agent: "MultiExpertPanel",
      status: "skipped",
      detail: `Risk band is ${risk.riskLevel} — panel not required under 'auto' mode`,
    });
    logEvent(
      "MultiExpertPanel",
      "skipped",
      `Risk band is ${risk.riskLevel} under mode=${panelMode}`
    );
  }

  // 4. Patient Communication Agent
  emit({ agent: "PatientCommunicationAgent", status: "started" });
  logEvent("PatientCommunicationAgent", "called", "Generating patient-friendly report");
  const patientReport = await runPatientCommunicationAgent({
    vision: visionRes.vision,
    risk,
    toothbrush,
  });
  logEvent("PatientCommunicationAgent", "completed", `headline="${patientReport.headline}"`);
  emit({ agent: "PatientCommunicationAgent", status: "completed", detail: patientReport.headline });

  // 5. Clinician Referral Agent (only when high risk)
  let clinicianReferral: ClinicianReferral | null = null;
  if (risk.riskLevel === "High") {
    emit({ agent: "ClinicianReferralAgent", status: "started" });
    logEvent("ClinicianReferralAgent", "called", "High risk → generating referral packet");
    clinicianReferral = await runClinicianReferralAgent({
      vision: visionRes.vision,
      risk,
      toothbrush,
      questionnaire: input.questionnaire,
    });
    logEvent("ClinicianReferralAgent", "completed", "Referral packet ready");
    emit({ agent: "ClinicianReferralAgent", status: "completed" });
  } else {
    logEvent(
      "ClinicianReferralAgent",
      "skipped",
      `Risk level is ${risk.riskLevel} — referral not required.`
    );
    emit({ agent: "ClinicianReferralAgent", status: "skipped", detail: risk.riskLevel });
  }

  // 6. Triage Prioritization Agent — used by the doctor queue
  emit({ agent: "TriagePrioritizationAgent", status: "started" });
  logEvent(
    "TriagePrioritizationAgent",
    "called",
    "Computing urgency rank for doctor queue"
  );
  const triage = await runTriagePrioritizationAgent({
    risk,
    vision: visionRes.vision,
    questionnaire: input.questionnaire,
  });
  logEvent(
    "TriagePrioritizationAgent",
    "completed",
    `urgency=${triage.urgencyScore}, SLA=${triage.recommendedSlaHours}h`
  );
  emit({ agent: "TriagePrioritizationAgent", status: "completed", detail: `urgency=${triage.urgencyScore}` });

  // Dental Wellness Agent — multi-condition educational assessment (cavities,
  // gum, hygiene) that runs alongside the cancer screening.
  emit({ agent: "DentalWellnessAgent", status: "started" });
  logEvent("DentalWellnessAgent", "called", "Estimating cavity / gum / hygiene");
  const dentalWellness = await runDentalWellnessAgent({
    vision: visionRes.vision,
    questionnaire: input.questionnaire,
    toothbrush,
    lastScalingDaysAgo: input.lastScalingDaysAgo,
  });
  logEvent(
    "DentalWellnessAgent",
    "completed",
    `hygiene=${dentalWellness.hygieneScore}, cavity=${dentalWellness.cavityRisk}, gum=${dentalWellness.gumCondition}`
  );
  emit({
    agent: "DentalWellnessAgent",
    status: "completed",
    detail: `hygiene ${dentalWellness.hygieneScore}/100`,
  });

  const finishedAt = nowISO();
  logEvent("Orchestrator", "session_completed", `Finished at ${finishedAt}`);
  emit({ agent: "Orchestrator", status: "completed", detail: finishedAt });

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
    consensus,
    triage,
    retrieval,
    panelDiscussion,
    dentalWellness,
  };
}
