"use client";

import { useEffect, useState } from "react";
import { SafetyBanner } from "@/components/SafetyBanner";
import { SampleCaseSelector } from "@/components/SampleCaseSelector";
import { ImageUpload, type UploadedImage } from "@/components/ImageUpload";
import { CameraCapture } from "@/components/CameraCapture";
import { QuestionnaireForm } from "@/components/QuestionnaireForm";
import { AgentPipeline } from "@/components/AgentPipeline";
import { ToothbrushTelemetryCard } from "@/components/ToothbrushTelemetryCard";
import { VisionResultCard } from "@/components/VisionResultCard";
import { RiskScoreCard } from "@/components/RiskScoreCard";
import { PatientReportCard } from "@/components/PatientReportCard";
import { ClinicianReferralCard } from "@/components/ClinicianReferralCard";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";
import { AgentFlowOverlay } from "@/components/AgentFlowOverlay";
import { HeatmapOverlay } from "@/components/HeatmapOverlay";
import { ConsensusPanel } from "@/components/ConsensusPanel";
import { RetrievalPanel } from "@/components/RetrievalPanel";
import { getSampleCase } from "@/lib/data/sampleCases";
import { sessionStore } from "@/lib/store/sessionStore";
import type {
  Questionnaire,
  ScreeningSession,
  VisionProviderId,
} from "@/lib/types/screening";

const DEFAULT_QUESTIONNAIRE: Questionnaire = {
  age: 30,
  tobacco: false,
  alcohol: false,
  betelQuid: false,
  familyHistory: false,
  lesionDurationWeeks: 0,
  pain: false,
  bleeding: false,
  ulcer: false,
};

const PROVIDER_OPTIONS: { id: VisionProviderId; label: string; help: string }[] = [
  { id: "mock", label: "Mock", help: "Offline. Works with zero API keys." },
  { id: "gemini", label: "Gemini Vision", help: "Structured JSON + region boxes." },
  { id: "claude", label: "Claude Vision", help: "Needs ANTHROPIC_API_KEY." },
  { id: "local", label: "Local Model", help: "Custom FastAPI (future)." },
];

export default function PatientScreeningPage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadedImage | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>(DEFAULT_QUESTIONNAIRE);
  const [provider, setProvider] = useState<VisionProviderId>("mock");
  const [enableConsensus, setEnableConsensus] = useState(false);
  const [consensusProvider, setConsensusProvider] = useState<VisionProviderId>("mock");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ScreeningSession | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState<ScreeningSession | null>(null);
  const [overlayDone, setOverlayDone] = useState(false);

  function pickSample(id: string | null) {
    setSelectedSampleId(id);
    if (id) {
      setUpload(null);
      const sample = getSampleCase(id);
      if (sample) setQuestionnaire(sample.questionnaire);
    }
  }

  function pickUpload(img: UploadedImage | null) {
    setUpload(img);
    if (img) setSelectedSampleId(null);
  }

  async function runScreening() {
    setError(null);
    if (!selectedSampleId && !upload) {
      setError("Please pick a sample case, upload, or capture an image first.");
      return;
    }
    setRunning(true);
    setSession(null);
    setPendingSession(null);
    setOverlayDone(false);
    setOverlayOpen(true);
    try {
      const body =
        selectedSampleId !== null
          ? {
              source: "sample" as const,
              sampleId: selectedSampleId,
              questionnaire,
              preferredProvider: provider,
              consensusProvider:
                enableConsensus && upload ? consensusProvider : undefined,
            }
          : {
              source: "upload" as const,
              imageBase64: upload!.base64,
              imageMimeType: upload!.mimeType,
              fileName: upload!.fileName,
              questionnaire,
              preferredProvider: provider,
              consensusProvider: enableConsensus ? consensusProvider : undefined,
            };

      const res = await fetch("/api/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ScreeningSession;

      // Attach a preview data URL so the doctor view can show what was screened.
      if (upload) {
        data.imageMeta.previewDataUrl = upload.previewUrl;
      } else if (selectedSampleId) {
        const sample = getSampleCase(selectedSampleId);
        if (sample) data.imageMeta.previewDataUrl = sample.thumbnail;
      }

      setPendingSession(data);
      sessionStore.add(data);
    } catch (err) {
      // Patient-friendly translation — never show raw stack traces or
      // provider error messages to a patient.
      const raw = err instanceof Error ? err.message : "Unknown error";
      let friendly: string;
      if (raw.includes("network") || raw.includes("fetch")) {
        friendly =
          "We couldn't reach the screening service. Please check your internet connection and try again.";
      } else if (raw.includes("API key") || raw.includes("INVALID_ARGUMENT")) {
        friendly =
          "The AI provider isn't configured properly on this device. The screening can still run in offline mock mode — switch the Vision provider to 'Mock' under Step 3 and try again.";
      } else if (raw.toLowerCase().includes("image")) {
        friendly =
          "We couldn't process this image. Try a clearer, well-lit photo with your mouth filling most of the frame.";
      } else {
        friendly =
          "Something went wrong. Please try again, or pick the 'Mock' provider under Step 3 for an offline run.";
      }
      setError(friendly);
      setOverlayOpen(false);
      setRunning(false);
    }
  }

  useEffect(() => {
    if (overlayDone && pendingSession) {
      setSession(pendingSession);
      setOverlayOpen(false);
      setRunning(false);
      setOverlayDone(false);
      setPendingSession(null);
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [overlayDone, pendingSession]);

  function handleOverlaySkip() {
    if (pendingSession) {
      setSession(pendingSession);
      setPendingSession(null);
    }
    setOverlayOpen(false);
    setRunning(false);
    setOverlayDone(false);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  const inputReady = selectedSampleId !== null || upload !== null;

  return (
    <div>
      <AgentFlowOverlay
        open={overlayOpen}
        session={pendingSession}
        onSkip={handleOverlaySkip}
        onComplete={() => setOverlayDone(true)}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-lavender-950">New Screening</h1>
        <p className="text-sm text-lavender-900/70">
          Capture or upload an oral cavity image, fill the questionnaire, and run the
          agentic AI pipeline.
        </p>
      </header>

      <SafetyBanner />

      {/* Step 1 — image */}
      <section className="mt-6 rounded-3xl border border-lavender-200 bg-white/70 p-6 shadow-card backdrop-blur">
        <StepHeader n={1} title="Provide an oral cavity image" />
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <SampleCaseSelector
            selectedId={selectedSampleId}
            onSelect={pickSample}
            disabled={running}
          />
          <ImageUpload value={upload} onChange={pickUpload} disabled={running} />
          <CameraCapture
            onCapture={(img) => pickUpload({ ...img })}
            disabled={running}
          />
        </div>
      </section>

      {/* Step 2 — questionnaire */}
      <section className="mt-6">
        <StepHeader n={2} title="Risk questionnaire" />
        <div className="mt-3">
          <QuestionnaireForm
            value={questionnaire}
            onChange={setQuestionnaire}
            disabled={running}
          />
        </div>
      </section>

      {/* Step 3 — provider + run */}
      <section className="mt-6 rounded-3xl border border-lavender-200 bg-white/70 p-6 shadow-card backdrop-blur">
        <StepHeader n={3} title="Configure vision provider" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROVIDER_OPTIONS.map((p) => (
            <label
              key={p.id}
              className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                provider === p.id
                  ? "border-lavender-500 bg-lavender-50"
                  : "border-lavender-200 bg-white hover:border-lavender-400"
              } ${running ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="provider"
                  checked={provider === p.id}
                  onChange={() => setProvider(p.id)}
                  disabled={running}
                  className="text-lavender-600 focus:ring-lavender-500"
                />
                <span className="text-sm font-semibold text-lavender-950">{p.label}</span>
              </div>
              <p className="mt-1 text-[11px] text-lavender-900/70">{p.help}</p>
            </label>
          ))}
        </div>

        {/* Multi-LLM consensus toggle */}
        <div className="mt-5 rounded-2xl border border-dashed border-lavender-300 bg-lavender-50/60 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={enableConsensus}
              onChange={(e) => setEnableConsensus(e.target.checked)}
              disabled={running || !upload}
              className="mt-1 h-4 w-4 rounded border-lavender-400 text-lavender-600"
            />
            <div>
              <p className="text-sm font-semibold text-lavender-950">
                🤝 Enable multi-LLM consensus
              </p>
              <p className="text-xs text-lavender-900/70">
                Run a second provider in parallel and compute an agreement score.
                Only available when uploading a real image (not sample cases).
              </p>
            </div>
          </label>
          {enableConsensus && (
            <div className="mt-3 flex items-center gap-2 pl-7">
              <span className="text-xs text-lavender-900/70">Second provider:</span>
              <select
                value={consensusProvider}
                onChange={(e) =>
                  setConsensusProvider(e.target.value as VisionProviderId)
                }
                disabled={running}
                className="rounded-lg border border-lavender-300 bg-white px-2 py-1 text-xs"
              >
                {PROVIDER_OPTIONS.filter((p) => p.id !== provider).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={runScreening}
            disabled={running || !inputReady}
            className="inline-flex items-center gap-2 rounded-xl bg-lavender-700 px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-lavender-800 disabled:cursor-not-allowed disabled:bg-lavender-300"
          >
            {running ? "Running pipeline…" : "▶ Run Agentic AI Screening"}
          </button>
          {!inputReady && !running && (
            <p className="text-xs text-lavender-900/70">
              Pick a sample, upload, or capture an image to enable.
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* Results */}
      {session && (
        <section id="results" className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
              Results
            </span>
            <h2 className="text-lg font-semibold text-lavender-950">
              Screening session report
            </h2>
            <span className="ml-auto rounded-full bg-lavender-100 px-2 py-0.5 font-mono text-[10px] text-lavender-800">
              {session.sessionId}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AgentPipeline session={session} />
            </div>
            <ProviderStatusBadge status={session.providerStatus} />
          </div>

          {/* Heatmap on the captured image */}
          {session.imageMeta.previewDataUrl && (
            <div className="mt-4">
              <HeatmapOverlay
                imageSrc={session.imageMeta.previewDataUrl}
                detections={session.vision.detections}
                caption={`Regions of interest detected by ${session.providerStatus.used}. Coordinates are normalized.`}
              />
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <ToothbrushTelemetryCard telemetry={session.toothbrush} />
            <VisionResultCard vision={session.vision} />
            <RiskScoreCard risk={session.risk} patientMode />
          </div>

          {session.consensus && (
            <div className="mt-4">
              <ConsensusPanel consensus={session.consensus} />
            </div>
          )}

          <div className="mt-4">
            <PatientReportCard
              report={session.patientReport}
              riskLevel={session.risk.riskLevel}
            />
          </div>

          {session.retrieval && session.retrieval.length > 0 && (
            <div className="mt-4">
              <RetrievalPanel snippets={session.retrieval} />
            </div>
          )}

          {session.clinicianReferral && (
            <div className="mt-4">
              <ClinicianReferralCard referral={session.clinicianReferral} />
            </div>
          )}

          <div className="mt-4">
            <AuditLogPanel
              entries={session.auditLog}
              sessionId={session.sessionId}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-lavender-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lavender-900">
        Step {n}
      </span>
      <h2 className="text-lg font-semibold text-lavender-950">{title}</h2>
    </div>
  );
}
