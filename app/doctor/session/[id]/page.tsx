"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/store/useSessionStore";
import { sessionStore } from "@/lib/store/sessionStore";
import { showToast } from "@/components/Toast";
import { ToothbrushTelemetryCard } from "@/components/ToothbrushTelemetryCard";
import { VisionResultCard } from "@/components/VisionResultCard";
import { RiskScoreCard } from "@/components/RiskScoreCard";
import { ClinicianReferralCard } from "@/components/ClinicianReferralCard";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { ProviderStatusBadge } from "@/components/ProviderStatusBadge";
import { HeatmapOverlay } from "@/components/HeatmapOverlay";
import { ConsensusPanel } from "@/components/ConsensusPanel";
import { RetrievalPanel } from "@/components/RetrievalPanel";
import { ExpertPanelCard } from "@/components/ExpertPanelCard";
import { ModeratorVerdictCard } from "@/components/ModeratorVerdictCard";
import { CareChat } from "@/components/CareChat";
import { DoctorAssistantPanel } from "@/components/DoctorAssistantPanel";
import { DentalWellnessCard } from "@/components/DentalWellnessCard";
import {
  riskLevelColorClass,
  summarizeQuestionnaire,
} from "@/lib/utils/riskUtils";
import type { ClinicianReview } from "@/lib/types/screening";

export default function DoctorSessionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params?.id ?? "");
  const session = useSession(id);
  const router = useRouter();

  const [reviewerName, setReviewerName] = useState(
    session?.clinicianReview?.reviewerName ?? "Dr. Demo"
  );
  const [decision, setDecision] = useState<ClinicianReview["decision"]>(
    session?.clinicianReview?.decision ?? "agree"
  );
  const [notes, setNotes] = useState(session?.clinicianReview?.notes ?? "");

  if (!session) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <p className="text-sm text-lavender-900/70">Session not found.</p>
        <Link
          href="/doctor"
          className="mt-3 inline-block rounded-lg bg-lavender-700 px-3 py-1.5 text-xs font-semibold text-white"
        >
          ← Back to queue
        </Link>
      </div>
    );
  }

  function saveReview() {
    const review: ClinicianReview = {
      reviewedAt: new Date().toISOString(),
      reviewerName: reviewerName.trim() || "Anonymous",
      decision,
      notes: notes.trim(),
    };
    sessionStore.setClinicianReview(id, review);
    showToast("Review saved. Returning to queue…", "success");
    setTimeout(() => router.push("/doctor"), 500);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/doctor"
          className="rounded-lg border border-lavender-300 bg-white px-3 py-1.5 text-xs font-medium text-lavender-800 hover:bg-lavender-100"
        >
          ← Queue
        </Link>
        <h1 className="text-xl font-bold text-lavender-950">Session review</h1>
        <span className="rounded-full bg-lavender-100 px-2 py-0.5 font-mono text-[10px] text-lavender-800">
          {session.sessionId}
        </span>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskLevelColorClass(
            session.risk.riskLevel
          )}`}
        >
          {session.risk.riskLevel} · {session.risk.score}/100
        </span>
        {session.triage && (
          <span className="rounded-full bg-lavender-900 px-2.5 py-0.5 text-xs font-semibold text-white">
            urgency {session.triage.urgencyScore}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {session.imageMeta.previewDataUrl && (
            <HeatmapOverlay
              imageSrc={session.imageMeta.previewDataUrl}
              detections={session.vision.detections}
              caption={`Regions of interest detected by ${session.providerStatus.used}.`}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <ToothbrushTelemetryCard telemetry={session.toothbrush} />
            <VisionResultCard vision={session.vision} />
            <RiskScoreCard risk={session.risk} />
          </div>

          {session.dentalWellness && (
            <DentalWellnessCard dental={session.dentalWellness} />
          )}
          {session.consensus && <ConsensusPanel consensus={session.consensus} />}
          {session.panelDiscussion && session.panelDiscussion.triggered && (
            <>
              <ModeratorVerdictCard panel={session.panelDiscussion} />
              <ExpertPanelCard panel={session.panelDiscussion} />
            </>
          )}
          {session.retrieval && session.retrieval.length > 0 && (
            <RetrievalPanel snippets={session.retrieval} />
          )}
          {session.clinicianReferral && (
            <ClinicianReferralCard referral={session.clinicianReferral} />
          )}

          <AuditLogPanel
            entries={session.auditLog}
            sessionId={session.sessionId}
          />
        </div>

        <aside className="space-y-4">
          {/* Triage card */}
          {session.triage && (
            <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>🚦</span>
                <h3 className="text-sm font-semibold text-lavender-950">
                  Triage prioritization
                </h3>
              </div>
              <p className="mt-3 text-3xl font-bold text-lavender-900">
                {session.triage.urgencyScore}
                <span className="text-sm font-normal text-lavender-700">/100</span>
              </p>
              <p className="text-xs text-lavender-700">
                Recommended SLA:{" "}
                <span className="font-semibold">
                  {session.triage.recommendedSlaHours}h
                </span>
              </p>
              <ul className="mt-3 space-y-1 text-xs text-lavender-900">
                {session.triage.reasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Patient questionnaire */}
          <div className="rounded-2xl border border-lavender-200 bg-white p-5 shadow-card">
            <h3 className="text-sm font-semibold text-lavender-950">
              Patient questionnaire
            </h3>
            <p className="mt-2 text-xs text-lavender-900">
              {summarizeQuestionnaire(session.questionnaire)}
            </p>
          </div>

          <ProviderStatusBadge status={session.providerStatus} />

          {/* Clinician review form */}
          <div className="rounded-2xl border-2 border-lavender-500 bg-lavender-50 p-5 shadow-card">
            <h3 className="text-sm font-semibold text-lavender-950">
              ✍️ Your clinical review
            </h3>
            <p className="mt-1 text-xs text-lavender-700">
              Capture your decision. Stored locally on this device.
            </p>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wider text-lavender-700">
                  Reviewer name
                </span>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-lavender-300 bg-white px-3 py-2 text-sm focus:border-lavender-500 focus:outline-none focus:ring-1 focus:ring-lavender-500"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wider text-lavender-700">
                  Decision
                </span>
                <select
                  value={decision}
                  onChange={(e) =>
                    setDecision(e.target.value as ClinicianReview["decision"])
                  }
                  className="mt-1 w-full rounded-lg border border-lavender-300 bg-white px-3 py-2 text-sm focus:border-lavender-500 focus:outline-none focus:ring-1 focus:ring-lavender-500"
                >
                  <option value="agree">Agree with AI risk band</option>
                  <option value="downgrade">Downgrade risk</option>
                  <option value="upgrade">Upgrade risk</option>
                  <option value="refer_specialist">Refer to specialist</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wider text-lavender-700">
                  Clinical notes
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-lavender-300 bg-white px-3 py-2 text-sm focus:border-lavender-500 focus:outline-none focus:ring-1 focus:ring-lavender-500"
                  placeholder="Observations, plan, follow-up timeline…"
                />
              </label>
              <button
                type="button"
                onClick={saveReview}
                className="w-full rounded-lg bg-lavender-700 px-4 py-2 text-sm font-semibold text-white hover:bg-lavender-800"
              >
                Save review
              </button>
              {session.clinicianReview && (
                <p className="text-[11px] text-lavender-700">
                  Last reviewed by{" "}
                  <b>{session.clinicianReview.reviewerName}</b>{" "}
                  on{" "}
                  {new Date(session.clinicianReview.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>

            {/* Patient identity + direct messaging */}
            <div className="rounded-2xl border border-lavender-200 bg-white p-4 shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-widest text-lavender-700">
                Patient
              </p>
              <p className="mt-1 text-sm font-semibold text-lavender-950">
                {session.channel === "telegram" ? "📲 " : "🧑 "}
                {session.ownerLabel ?? "Unknown"}
              </p>
              <p className="text-[11px] text-lavender-600">
                via {session.channel ?? "web"}
              </p>
            </div>

            {/* The doctor's AI agent: screen this patient's history */}
            {session.ownerId && (
              <DoctorAssistantPanel
                key={session.ownerId}
                patientId={session.ownerId}
                patientLabel={session.ownerLabel ?? "patient"}
                heightClass="h-64"
              />
            )}

            {session.ownerId && (
              <CareChat
                viewerRole="doctor"
                patientId={session.ownerId}
                title={`Message ${session.ownerLabel ?? "patient"}`}
                heightClass="h-64"
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
