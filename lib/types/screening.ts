// Shared TypeScript types for the agentic oral cancer screening prototype.

export type VisualFinding =
  | "normal"
  | "ulcer_like"
  | "white_patch_like"
  | "red_patch_like"
  | "mixed_white_red_patch_like"
  | "unclear";

export type SuspectedRegion =
  | "none"
  | "tongue"
  | "lateral tongue"
  | "inner cheek"
  | "floor of mouth"
  | "gum"
  | "palate"
  | "unknown";

export type ImageQuality = "good" | "moderate" | "poor";

export type RiskLevel = "Low" | "Medium" | "High";

export type ConfidenceLevel = "Low" | "Moderate" | "High";

export type VisionProviderId = "mock" | "gemini" | "claude" | "local";

export interface Questionnaire {
  age: number;
  tobacco: boolean;
  alcohol: boolean;
  betelQuid: boolean;
  familyHistory: boolean;
  lesionDurationWeeks: number;
  pain: boolean;
  bleeding: boolean;
  ulcer: boolean;
}

export interface ToothbrushTelemetry {
  brushingDurationSec: number;
  pressureLevel: "low" | "normal" | "high";
  motionBlurScore: number;
  imageQualityScore: number;
  coveragePercent: number;
  sessionValid: boolean;
  note: string;
}

export interface VisionResult {
  visualFinding: VisualFinding;
  suspectedRegion: SuspectedRegion;
  oralCancerLikeProbability: number;
  confidence: number;
  imageQuality: ImageQuality;
  observationSummary: string;
  disclaimer: string;
}

export interface RiskScore {
  score: number;
  riskLevel: RiskLevel;
  topRiskDrivers: string[];
  confidenceLevel: ConfidenceLevel;
  scoringExplanation: string;
}

export interface PatientReport {
  headline: string;
  message: string;
  whatWasObserved: string;
  whyThisLevel: string;
  nextStep: string;
  disclaimer: string;
}

export interface ClinicianReferral {
  referralRequired: boolean;
  summary: string;
  riskScore: number;
  riskDrivers: string[];
  visualFinding: string;
  suspectedRegion: string;
  questionnaireSummary: string;
  toothbrushSessionQuality: string;
  suggestedClinicianAction: string;
  disclaimer: string;
}

export interface AuditLogEntry {
  timestamp: string;
  agent: string;
  event: string;
  detail?: string;
}

export interface ProviderStatus {
  requested: VisionProviderId;
  used: VisionProviderId;
  fellBack: boolean;
  reason?: string;
}

export interface ScreeningSession {
  sessionId: string;
  startedAt: string;
  finishedAt: string;
  providerStatus: ProviderStatus;
  toothbrush: ToothbrushTelemetry;
  vision: VisionResult;
  risk: RiskScore;
  patientReport: PatientReport;
  clinicianReferral: ClinicianReferral | null;
  auditLog: AuditLogEntry[];
  questionnaire: Questionnaire;
  imageMeta: {
    source: "sample" | "upload";
    sampleId?: string;
    fileName?: string;
    sizeBytes?: number;
  };
}

export interface ScreeningRequestBody {
  source: "sample" | "upload";
  sampleId?: string;
  imageBase64?: string;
  imageMimeType?: string;
  fileName?: string;
  questionnaire: Questionnaire;
  preferredProvider?: VisionProviderId;
}
