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

export interface DetectionBox {
  /** Normalized 0..1 coordinates relative to image width/height. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Label of the detected region, e.g. "white_patch_like". */
  label: string;
  /** 0..1 confidence in this specific box. */
  score: number;
}

export interface VisionResult {
  visualFinding: VisualFinding;
  suspectedRegion: SuspectedRegion;
  oralCancerLikeProbability: number;
  confidence: number;
  imageQuality: ImageQuality;
  observationSummary: string;
  disclaimer: string;
  /** Optional: regions of interest for heatmap overlay. */
  detections?: DetectionBox[];
  /** Optional: chain-of-thought reasoning extracted from the model. */
  reasoning?: string;
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

export interface TriagePriority {
  /** 0..100, higher = more urgent */
  urgencyScore: number;
  /** Rank position in the doctor queue (assigned client-side). */
  rank?: number;
  reasons: string[];
  recommendedSlaHours: number;
}

export interface RetrievalSnippet {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  relevance: number;
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
    /** Stored as data URL for replay in /doctor — only kept client-side. */
    previewDataUrl?: string;
  };
  /** Optional: multi-LLM consensus output. */
  consensus?: ConsensusReport;
  /** Optional: triage prioritization (set when queued for doctor). */
  triage?: TriagePriority;
  /** Optional: RAG snippets supporting the assessment. */
  retrieval?: RetrievalSnippet[];
  /** Optional: doctor's notes/actions (set in /doctor). */
  clinicianReview?: ClinicianReview;
}

export interface ClinicianReview {
  reviewedAt: string;
  reviewerName: string;
  decision: "agree" | "downgrade" | "upgrade" | "refer_specialist";
  notes: string;
}

export interface ScreeningRequestBody {
  source: "sample" | "upload";
  sampleId?: string;
  imageBase64?: string;
  imageMimeType?: string;
  fileName?: string;
  questionnaire: Questionnaire;
  preferredProvider?: VisionProviderId;
  /** Run a second provider in parallel for cross-checking. */
  consensusProvider?: VisionProviderId;
}

export interface ConsensusReport {
  primaryProvider: VisionProviderId;
  secondaryProvider: VisionProviderId;
  agreement: "strong" | "partial" | "weak" | "conflict";
  agreementScore: number;
  primary: VisionResult;
  secondary: VisionResult;
  note: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface ChatRequestBody {
  messages: { role: ChatRole; content: string }[];
  patientContext?: {
    latestRiskLevel?: RiskLevel;
    latestScore?: number;
    latestFinding?: string;
  };
}
