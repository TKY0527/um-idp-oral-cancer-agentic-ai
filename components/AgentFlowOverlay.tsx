"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScreeningSession } from "@/lib/types/screening";
import { VISUAL_FINDING_LABEL } from "@/lib/utils/riskUtils";

interface Props {
  open: boolean;
  session: ScreeningSession | null;
  onSkip: () => void;
  onComplete: () => void;
}

type AgentId =
  | "orchestrator"
  | "iot"
  | "vision"
  | "scoring"
  | "patient"
  | "referral";

interface AgentSpec {
  id: AgentId;
  label: string;
  icon: string;
  /** Angle in degrees; 0 = right, 90 = bottom (SVG convention here) */
  angle: number;
}

// Pentagon layout, top-clockwise. Center is the Orchestrator.
const NODES: AgentSpec[] = [
  { id: "iot",      label: "Toothbrush IoT",       icon: "🪥", angle: -90 },  // top
  { id: "vision",   label: "Vision Screening",     icon: "👁️", angle: -18 },  // top-right
  { id: "scoring",  label: "Cancer Risk Scoring",  icon: "📊", angle:  54 },  // bottom-right
  { id: "patient",  label: "Patient Communication", icon: "💬", angle: 126 }, // bottom-left
  { id: "referral", label: "Clinician Referral",   icon: "🩺", angle: -162 },// top-left
];

type Phase =
  | "boot"
  | "iot"
  | "vision"
  | "consensus"
  | "scoring"
  | "retrieval"
  | "patient"
  | "referral"
  | "triage"
  | "done";

// Medium-speed choreography (~9s total now that 3 meta-agents are shown).
const PHASE_MS: Record<Phase, number> = {
  boot:       500,
  iot:       1000,
  vision:    1400,
  consensus:  700,
  scoring:    900,
  retrieval:  800,
  patient:    900,
  referral:   900,
  triage:     800,
  done:       400,
};

const PHASE_ORDER: Phase[] = [
  "boot",
  "iot",
  "vision",
  "consensus",
  "scoring",
  "retrieval",
  "patient",
  "referral",
  "triage",
  "done",
];

const PHASE_TO_AGENT: Partial<Record<Phase, AgentId>> = {
  iot: "iot",
  vision: "vision",
  scoring: "scoring",
  patient: "patient",
  referral: "referral",
};

// Meta-agents that appear in the strip below the hub rather than as spokes.
type MetaAgentId = "consensus" | "retrieval" | "triage";

const META_AGENTS: { id: MetaAgentId; label: string; icon: string; phase: Phase }[] = [
  { id: "consensus", label: "Consensus",  icon: "🤝", phase: "consensus" },
  { id: "retrieval", label: "RAG Retrieval", icon: "📚", phase: "retrieval" },
  { id: "triage",    label: "Triage",     icon: "🚦", phase: "triage" },
];

const RADIUS = 230; // distance from center to each spoke
const CONTAINER = 620; // square container size in px (also used as viewBox for SVG)

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CONTAINER / 2 + Math.cos(rad) * r,
    y: CONTAINER / 2 + Math.sin(rad) * r,
  };
}

export function AgentFlowOverlay({ open, session, onSkip, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [agentMs, setAgentMs] = useState<Record<AgentId, number>>({
    orchestrator: 0,
    iot: 0,
    vision: 0,
    scoring: 0,
    patient: 0,
    referral: 0,
  });
  const startRef = useRef<number | null>(null);
  const agentStartRef = useRef<Partial<Record<AgentId, number>>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Drive the phase machine + master timer when opened.
  useEffect(() => {
    if (!open) return;
    setPhase("boot");
    setElapsedMs(0);
    setAgentMs({
      orchestrator: 0,
      iot: 0,
      vision: 0,
      scoring: 0,
      patient: 0,
      referral: 0,
    });
    agentStartRef.current = {};

    const start = performance.now();
    startRef.current = start;
    agentStartRef.current.orchestrator = start;

    // Master tick — updates the elapsed timer and per-agent timers ~20fps.
    const tick = setInterval(() => {
      const now = performance.now();
      setElapsedMs(now - start);
      setAgentMs((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(agentStartRef.current) as AgentId[]) {
          const s = agentStartRef.current[id];
          if (s !== undefined) next[id] = now - s;
        }
        return next;
      });
    }, 50);

    // Schedule the phase transitions.
    let cumulative = 0;
    for (let i = 0; i < PHASE_ORDER.length; i++) {
      const next = PHASE_ORDER[i];
      cumulative += i === 0 ? 0 : PHASE_MS[PHASE_ORDER[i - 1]];
      const t = setTimeout(() => {
        setPhase(next);
        const agent = PHASE_TO_AGENT[next];
        if (agent) {
          agentStartRef.current[agent] = performance.now();
        }
      }, cumulative);
      timersRef.current.push(t);
    }

    // After the final phase, finish.
    const total =
      PHASE_ORDER.reduce((sum, p) => sum + PHASE_MS[p], 0);
    const closeT = setTimeout(() => {
      onCompleteRef.current();
    }, total);
    timersRef.current.push(closeT);

    return () => {
      clearInterval(tick);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [open]);

  // ESC key to skip.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onSkip]);

  const currentIdx = PHASE_ORDER.indexOf(phase);

  // Status of each agent based on current phase.
  function statusOf(id: AgentId): "pending" | "active" | "done" | "skipped" {
    if (id === "orchestrator") {
      return phase === "done" ? "done" : "active";
    }
    const phaseForAgent = (Object.keys(PHASE_TO_AGENT) as Phase[]).find(
      (p) => PHASE_TO_AGENT[p] === id
    );
    if (!phaseForAgent) return "pending";
    const idx = PHASE_ORDER.indexOf(phaseForAgent);
    if (id === "referral" && session && session.clinicianReferral === null) {
      // Will be skipped — but only after we've reached its phase.
      if (currentIdx > idx) return "skipped";
      if (currentIdx === idx) return "active";
      return "pending";
    }
    if (currentIdx > idx) return "done";
    if (currentIdx === idx) return "active";
    return "pending";
  }

  // Preview text per agent (typed character-by-character while active).
  const previewText = useMemo(() => {
    const m: Record<AgentId, string> = {
      orchestrator: session
        ? `Session ${session.sessionId} — orchestrating 5 sub-agents`
        : "Boot sequence · creating session id · audit log open",
      iot: session
        ? `Telemetry captured · quality ${session.toothbrush.imageQualityScore.toFixed(2)} · coverage ${session.toothbrush.coveragePercent}%`
        : "Capturing brushing telemetry...",
      vision: session
        ? `${VISUAL_FINDING_LABEL[session.vision.visualFinding]} · prob ${(session.vision.oralCancerLikeProbability * 100).toFixed(0)}%`
        : "Calling vision provider...",
      scoring: session
        ? `Risk ${session.risk.score}/100 → ${session.risk.riskLevel}`
        : "Combining vision + questionnaire...",
      patient: session
        ? session.patientReport.headline
        : "Drafting patient-friendly explanation...",
      referral: session
        ? session.clinicianReferral
          ? "Referral packet generated for High-risk session"
          : `Skipped — risk level is ${session.risk.riskLevel}`
        : "Awaiting risk decision...",
    };
    return m;
  }, [session]);

  if (!open) return null;

  const center = polarToXY(0, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agentic AI screening pipeline"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(circle at 50% 40%, rgba(74,45,130,0.65) 0%, rgba(46,26,85,0.9) 60%, rgba(20,10,40,0.95) 100%)",
        backdropFilter: "blur(8px)",
      }}
    >
      <button
        type="button"
        onClick={onSkip}
        className="absolute right-6 top-6 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
        aria-label="Skip animation"
      >
        Skip animation →
      </button>

      <div className="absolute left-6 top-6 flex items-center gap-3 text-white/90">
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur">
          Agentic AI · live
        </span>
        <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono text-sm tabular-nums backdrop-blur">
          {(elapsedMs / 1000).toFixed(2)}s
        </span>
      </div>

      <div
        className="relative"
        style={{ width: CONTAINER, height: CONTAINER }}
      >
        {/* SVG: connecting lines + traveling data-flow dots */}
        <svg
          className="absolute inset-0"
          width={CONTAINER}
          height={CONTAINER}
          viewBox={`0 0 ${CONTAINER} ${CONTAINER}`}
          aria-hidden
        >
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#bd96ff" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#8b54e6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4a2d82" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Hub aura */}
          <circle
            cx={center.x}
            cy={center.y}
            r={170}
            fill="url(#hubGlow)"
            className="origin-center animate-[hubpulse_2.4s_ease-in-out_infinite]"
          />

          {NODES.map((node) => {
            const pos = polarToXY(node.angle, RADIUS);
            const status = statusOf(node.id);
            const stroke =
              status === "done"
                ? "#bd96ff"
                : status === "active"
                  ? "#ffffff"
                  : status === "skipped"
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,255,255,0.18)";
            return (
              <g key={node.id}>
                <line
                  x1={center.x}
                  y1={center.y}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={stroke}
                  strokeWidth={status === "active" ? 2.5 : 1.5}
                  strokeDasharray={status === "skipped" ? "4 6" : undefined}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke 300ms ease, stroke-width 300ms ease",
                    filter:
                      status === "active"
                        ? "drop-shadow(0 0 6px rgba(189,150,255,0.9))"
                        : status === "done"
                          ? "drop-shadow(0 0 3px rgba(189,150,255,0.5))"
                          : undefined,
                  }}
                />

                {/* Traveling data-flow dot when this agent is active */}
                {status === "active" && (
                  <circle r="6" fill="#ffffff" filter="url(#dotGlow)">
                    <animateMotion
                      dur="1.2s"
                      repeatCount="indefinite"
                      keyPoints="0;1"
                      keyTimes="0;1"
                      path={`M ${center.x} ${center.y} L ${pos.x} ${pos.y}`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      keyTimes="0;0.1;0.85;1"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </svg>

        {/* Orchestrator hub */}
        <HubNode
          elapsedMs={agentMs.orchestrator}
          phase={phase}
        />

        {/* Spoke agents */}
        {NODES.map((node) => {
          const pos = polarToXY(node.angle, RADIUS);
          return (
            <SpokeNode
              key={node.id}
              x={pos.x}
              y={pos.y}
              spec={node}
              status={statusOf(node.id)}
              elapsedMs={agentMs[node.id]}
              text={previewText[node.id]}
            />
          );
        })}
      </div>

      {/* Meta-agents strip — Consensus / RAG / Triage */}
      <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
        <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
          Meta-agents
        </span>
        {META_AGENTS.map((m) => {
          const phaseIdx = PHASE_ORDER.indexOf(m.phase);
          const meta =
            currentIdx > phaseIdx
              ? "done"
              : currentIdx === phaseIdx
                ? "active"
                : "pending";
          return (
            <span
              key={m.id}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                meta === "active"
                  ? "bg-white text-lavender-900 shadow-[0_0_18px_rgba(189,150,255,0.85)]"
                  : meta === "done"
                    ? "bg-lavender-300/60 text-lavender-950"
                    : "bg-white/10 text-white/60"
              }`}
            >
              <span aria-hidden>{m.icon}</span>
              <span>{m.label}</span>
              {meta === "active" && (
                <span className="ml-1 inline-block h-1.5 w-1.5 animate-ping rounded-full bg-lavender-600" />
              )}
              {meta === "done" && (
                <span className="ml-1 text-emerald-700">✓</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Bottom legend */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/85 backdrop-blur">
        Hierarchical multi-agent system · Orchestrator + 5 sub-agents + 3 meta-agents · ESC to skip
      </div>

      <style jsx global>{`
        @keyframes hubpulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50%      { transform: scale(1.06); opacity: 1; }
        }
        @keyframes ringspin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function HubNode({
  elapsedMs,
  phase,
}: {
  elapsedMs: number;
  phase: Phase;
}) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center"
      style={{
        left: CONTAINER / 2,
        top: CONTAINER / 2,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative h-32 w-32">
        <div
          className="absolute inset-0 rounded-full border-2 border-lavender-300/70"
          style={{
            animation: phase !== "done" ? "ringspin 4s linear infinite" : undefined,
            borderStyle: "dashed",
          }}
        />
        <div
          className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-lavender-500 to-lavender-800 text-white shadow-2xl"
          style={{
            boxShadow:
              "0 0 30px rgba(189,150,255,0.7), 0 0 60px rgba(139,84,230,0.4)",
          }}
        >
          <span className="text-2xl">🧠</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-widest">
            Orchestrator
          </span>
          <span className="font-mono text-[10px] tabular-nums text-white/80">
            {(elapsedMs / 1000).toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  );
}

function SpokeNode({
  x,
  y,
  spec,
  status,
  elapsedMs,
  text,
}: {
  x: number;
  y: number;
  spec: AgentSpec;
  status: "pending" | "active" | "done" | "skipped";
  elapsedMs: number;
  text: string;
}) {
  const typed = useTypewriter(text, status === "active");

  const wrapperStyle =
    status === "active"
      ? "border-white bg-white/95 text-lavender-950 shadow-[0_0_30px_rgba(189,150,255,0.85)]"
      : status === "done"
        ? "border-lavender-300/70 bg-lavender-50/95 text-lavender-950"
        : status === "skipped"
          ? "border-dashed border-white/30 bg-white/10 text-white/60"
          : "border-white/20 bg-white/10 text-white/70";

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className={`flex w-44 flex-col rounded-2xl border px-3 py-2 backdrop-blur-md transition-all duration-300 ${wrapperStyle}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none" aria-hidden>
            {spec.icon}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {spec.label}
          </span>
          {status === "active" && <ActiveDot />}
          {status === "done" && <DoneCheck />}
          {status === "skipped" && (
            <span className="ml-auto text-[10px]">skipped</span>
          )}
        </div>
        {(status === "active" || status === "done") && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-tight">
            {status === "active" ? typed : text}
            {status === "active" && (
              <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-current align-middle" />
            )}
          </p>
        )}
        {status === "active" && (
          <p className="mt-1 font-mono text-[10px] tabular-nums opacity-70">
            {(elapsedMs / 1000).toFixed(2)}s
          </p>
        )}
      </div>
    </div>
  );
}

function ActiveDot() {
  return (
    <span className="ml-auto flex h-2.5 w-2.5 items-center justify-center">
      <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-lavender-500 opacity-75" />
      <span className="relative h-2 w-2 rounded-full bg-lavender-600" />
    </span>
  );
}

function DoneCheck() {
  return (
    <svg
      className="ml-auto h-4 w-4 text-emerald-600"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.572a1 1 0 0 1-1.42.005L3.29 9.79a1 1 0 0 1 1.42-1.41l3.79 3.815 6.79-6.857a1 1 0 0 1 1.414-.05Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function useTypewriter(target: string, run: boolean): string {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!run) {
      setOut("");
      return;
    }
    setOut("");
    let i = 0;
    const total = target.length;
    // ~22ms per char so a 60-char string finishes in ~1.3s.
    const id = setInterval(() => {
      i += 1;
      setOut(target.slice(0, i));
      if (i >= total) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [target, run]);
  return out;
}
