"use client";

import { useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { SafetyBanner } from "@/components/SafetyBanner";
import { SampleCaseSelector } from "@/components/SampleCaseSelector";
import { ImageUpload, type UploadedImage } from "@/components/ImageUpload";
import { QuestionnaireForm } from "@/components/QuestionnaireForm";
import { AgentPipeline } from "@/components/AgentPipeline";
import { ToothbrushTelemetryCard } from "@/components/ToothbrushTelemetryCard";
import { VisionResultCard } from "@/components/VisionResultCard";
import { RiskScoreCard } from "@/components/RiskScoreCard";
import { PatientReportCard } from "@/components/PatientReportCard";
import { ClinicianReferralCard } from "@/components/ClinicianReferralCard";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";
import { ArchitectureExplainer } from "@/components/ArchitectureExplainer";
import { getSampleCase } from "@/lib/data/sampleCases";
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
  { id: "mock", label: "Mock (offline)", help: "Works without any API key — best for demos." },
  { id: "gemini", label: "Gemini Vision", help: "Calls Google Gemini if GEMINI_API_KEY is set." },
  { id: "claude", label: "Claude Vision", help: "Calls Anthropic Claude if ANTHROPIC_API_KEY is set." },
  { id: "local", label: "Future Local Model", help: "FastAPI endpoint for the custom model (coming later)." },
];

export default function HomePage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadedImage | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>(DEFAULT_QUESTIONNAIRE);
  const [provider, setProvider] = useState<VisionProviderId>("mock");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ScreeningSession | null>(null);

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
      setError("Please pick a sample case or upload an image first.");
      return;
    }
    setRunning(true);
    setSession(null);
    try {
      const body =
        selectedSampleId !== null
          ? {
              source: "sample" as const,
              sampleId: selectedSampleId,
              questionnaire,
              preferredProvider: provider,
            }
          : {
              source: "upload" as const,
              imageBase64: upload!.base64,
              imageMimeType: upload!.mimeType,
              fileName: upload!.fileName,
              questionnaire,
              preferredProvider: provider,
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
      setSession(data);
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  const inputReady = selectedSampleId !== null || upload !== null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <HeroSection />

      <div className="mt-6">
        <SafetyBanner />
      </div>

      {/* Step 1 — pick input */}
      <section className="mt-8 rounded-3xl border border-lavender-200 bg-white/70 p-6 shadow-card backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-lavender-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lavender-900">
            Step 1
          </span>
          <h2 className="text-lg font-semibold text-lavender-950">
            Provide an oral cavity image
          </h2>
        </div>
        <p className="mt-1 text-sm text-lavender-900/70">
          Choose one of the four built-in sample cases <i>or</i> upload your own photo.
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <SampleCaseSelector
            selectedId={selectedSampleId}
            onSelect={pickSample}
            disabled={running}
          />
          <div className="hidden self-stretch lg:flex lg:items-center">
            <div className="h-full w-px bg-lavender-200" />
          </div>
          <ImageUpload value={upload} onChange={pickUpload} disabled={running} />
        </div>
      </section>

      {/* Step 2 — questionnaire */}
      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-lavender-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lavender-900">
            Step 2
          </span>
          <h2 className="text-lg font-semibold text-lavender-950">
            Risk questionnaire
          </h2>
        </div>
        <QuestionnaireForm
          value={questionnaire}
          onChange={setQuestionnaire}
          disabled={running}
        />
      </section>

      {/* Step 3 — provider + run */}
      <section className="mt-6 rounded-3xl border border-lavender-200 bg-white/70 p-6 shadow-card backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-lavender-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lavender-900">
            Step 3
          </span>
          <h2 className="text-lg font-semibold text-lavender-950">
            Run agentic AI screening
          </h2>
        </div>
        <p className="mt-1 text-sm text-lavender-900/70">
          Pick a Vision provider. If credentials are missing the system falls back to mock mode automatically.
        </p>

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
                  value={p.id}
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

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={runScreening}
            disabled={running || !inputReady}
            className="inline-flex items-center gap-2 rounded-xl bg-lavender-700 px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-lavender-800 disabled:cursor-not-allowed disabled:bg-lavender-300"
          >
            {running ? (
              <>
                <Spinner /> Running pipeline…
              </>
            ) : (
              <>▶ Run Agentic AI Screening</>
            )}
          </button>
          {!inputReady && !running && (
            <p className="text-xs text-lavender-900/70">
              Pick a sample case or upload an image to enable.
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* Architecture explainer is always visible */}
      <section className="mt-8">
        <ArchitectureExplainer />
      </section>

      {/* Results */}
      {session && (
        <section id="results" className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full bg-lavender-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lavender-900">
              Results
            </span>
            <h2 className="text-lg font-semibold text-lavender-950">
              Screening session report
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AgentPipeline session={session} />
            </div>
            <ProviderStatusBadge status={session.providerStatus} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <ToothbrushTelemetryCard telemetry={session.toothbrush} />
            <VisionResultCard vision={session.vision} />
            <RiskScoreCard risk={session.risk} />
          </div>

          <div className="mt-4">
            <PatientReportCard
              report={session.patientReport}
              riskLevel={session.risk.riskLevel}
            />
          </div>

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

      <footer className="mt-12 border-t border-lavender-200 pt-6 text-center text-xs text-lavender-900/70">
        <p>
          University IDP prototype · Educational use only · Not a medical device
        </p>
        <p className="mt-1">
          Vision providers: Mock · Gemini · Claude · Future Local Model
        </p>
      </footer>
    </main>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
