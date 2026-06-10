import type { ScreeningSession } from "@/lib/types/screening";
import {
  getDemoPatientByPatientId,
  type DemoPatientProfile,
} from "@/lib/data/demoPatients";
import {
  getPatientMeta,
  listAllSessions,
  listSessionsForPatient,
} from "@/lib/server/repository";
import { searchKnowledge } from "@/lib/retrieval/engine";
import { getSkill, listSkills } from "@/lib/skills";

/**
 * Doctor-agent tool registry — the Hermes-harness pattern:
 * a central registry where each tool self-describes (name, description,
 * parameters) and a single dispatcher handles lookup + error wrapping.
 * The agent loop in doctorAssistantAgent.ts calls the LLM, the LLM picks
 * a tool, the dispatcher runs it, the observation is appended, repeat.
 */

export interface DoctorToolContext {
  /** The patient currently selected in the UI ("*" = whole cohort). */
  patientId: string;
}

export interface DoctorTool {
  name: string;
  description: string;
  /** Parameter name → plain-language description (kept simple on purpose). */
  parameters: Record<string, string>;
  run(args: Record<string, unknown>, ctx: DoctorToolContext): Promise<unknown>;
}

/** Compact per-session view — full sessions are far too big for a prompt. */
export function condenseSessions(sessions: ScreeningSession[]) {
  return [...sessions]
    .sort(
      (a, b) =>
        new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
    )
    .map((s) => ({
      date: s.finishedAt.slice(0, 10),
      channel: s.channel ?? "web",
      riskScore: s.risk.score,
      riskLevel: s.risk.riskLevel,
      visualFinding: s.vision.visualFinding,
      region: s.vision.suspectedRegion,
      cancerLikeProbability: s.vision.oralCancerLikeProbability,
      topRiskDrivers: s.risk.topRiskDrivers.slice(0, 3),
      toothHealth: s.dentalWellness
        ? {
            hygieneScore: s.dentalWellness.hygieneScore,
            cavityRisk: s.dentalWellness.cavityRisk,
            gumCondition: s.dentalWellness.gumCondition,
            plaque: s.dentalWellness.plaqueLevel,
            scalingAdvice: s.dentalWellness.scalingAdvice?.level,
          }
        : undefined,
      questionnaire: {
        tobacco: s.questionnaire.tobacco,
        alcohol: s.questionnaire.alcohol,
        betelQuid: s.questionnaire.betelQuid,
        familyHistory: s.questionnaire.familyHistory,
        lesionDurationWeeks: s.questionnaire.lesionDurationWeeks,
        pain: s.questionnaire.pain,
        ulcer: s.questionnaire.ulcer,
      },
      clinicianReview: s.clinicianReview
        ? { decision: s.clinicianReview.decision, notes: s.clinicianReview.notes }
        : undefined,
      panelVerdict: s.panelDiscussion?.triggered
        ? {
            consensus: s.panelDiscussion.consensus,
            escalation: s.panelDiscussion.escalation,
          }
        : undefined,
    }));
}

export function condenseProfile(profile: DemoPatientProfile) {
  return {
    name: profile.name,
    age: profile.age,
    sex: profile.sex,
    race: profile.race,
    occupation: profile.occupation,
    habits: profile.habits,
    brushing: profile.brushing,
    dentalCare: {
      lastScalingDaysAgo: profile.dentalCare.lastScalingDaysAgo,
      lastScalingMonthsAgo: Math.floor(
        profile.dentalCare.lastScalingDaysAgo / 30
      ),
      checkupHabit: profile.dentalCare.checkupHabit,
    },
    toothCondition: profile.toothCondition,
    knownDentalIssues: profile.knownDentalIssues,
    priorReport: {
      title: profile.priorReport.title,
      summary: profile.priorReport.summary,
      findings: profile.priorReport.findings,
    },
  };
}

/** Deterministic urgency score used for the cohort comparison/fallback. */
export function cohortUrgency(
  sessions: ScreeningSession[],
  profile?: DemoPatientProfile
): { score: number; reasons: string[] } {
  const ordered = [...sessions].sort(
    (a, b) =>
      new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
  );
  const last = ordered[ordered.length - 1];
  if (!last) return { score: 0, reasons: ["No screenings on record"] };

  let score = last.risk.score;
  const reasons: string[] = [
    `Latest risk ${last.risk.score}/100 (${last.risk.riskLevel})`,
  ];
  const first = ordered[0];
  if (ordered.length > 1 && last.risk.score - first.risk.score > 5) {
    score += 10;
    reasons.push(`Risk rising (+${last.risk.score - first.risk.score} points)`);
  }
  if (last.questionnaire.lesionDurationWeeks > 2) {
    score += 10;
    reasons.push(
      `Lesion present ${last.questionnaire.lesionDurationWeeks} weeks (>2-week threshold)`
    );
  }
  if (
    last.vision.suspectedRegion === "lateral tongue" ||
    last.vision.suspectedRegion === "floor of mouth"
  ) {
    score += 10;
    reasons.push(`High-risk site: ${last.vision.suspectedRegion}`);
  }
  if (profile && profile.dentalCare.lastScalingDaysAgo > 180) {
    score += 5;
    reasons.push(
      `Scaling overdue (${Math.floor(profile.dentalCare.lastScalingDaysAgo / 30)} months)`
    );
  }
  if (!last.clinicianReview) {
    reasons.push("Not yet reviewed by a clinician");
  }
  return { score, reasons };
}

async function resolvePatientId(
  args: Record<string, unknown>,
  ctx: DoctorToolContext
): Promise<string> {
  const fromArgs = typeof args.patientId === "string" ? args.patientId : "";
  return fromArgs || ctx.patientId;
}

const getPatientProfileTool: DoctorTool = {
  name: "get_patient_profile",
  description:
    "Get a patient's profile: identity (name, age, race), habits, toothbrush usage, dental-care record (last scaling), tooth condition, known issues, prior dental report.",
  parameters: {
    patientId: "optional — defaults to the currently selected patient",
  },
  async run(args, ctx) {
    const patientId = await resolvePatientId(args, ctx);
    const profile = getDemoPatientByPatientId(patientId);
    if (profile) return condenseProfile(profile);
    const meta = await getPatientMeta(patientId);
    return meta
      ? { name: meta.label, channel: meta.channel, note: "No rich profile on record (not a demo patient)." }
      : { error: `No profile found for ${patientId}` };
  },
};

const listPatientSessionsTool: DoctorTool = {
  name: "list_patient_sessions",
  description:
    "List a patient's screening history, oldest first: per-session risk score/level, visual finding, region, tooth health (hygiene, cavity, gums, scaling advice), questionnaire flags, clinician reviews.",
  parameters: {
    patientId: "optional — defaults to the currently selected patient",
  },
  async run(args, ctx) {
    const patientId = await resolvePatientId(args, ctx);
    const sessions = await listSessionsForPatient(patientId);
    return {
      patientId,
      screeningCount: sessions.length,
      screenings: condenseSessions(sessions),
    };
  },
};

const compareAllPatientsTool: DoctorTool = {
  name: "compare_all_patients",
  description:
    "Compare EVERY patient in the clinic: latest risk, trend, red flags, scaling status — with a deterministic urgency ranking. Use this to decide which patient the doctor should see first.",
  parameters: {},
  async run() {
    const all = await listAllSessions();
    const byPatient = new Map<string, ScreeningSession[]>();
    for (const s of all) {
      const key = s.ownerId ?? "unknown";
      byPatient.set(key, [...(byPatient.get(key) ?? []), s]);
    }
    const rows = [...byPatient.entries()].map(([patientId, sessions]) => {
      const profile = getDemoPatientByPatientId(patientId);
      const { score, reasons } = cohortUrgency(sessions, profile);
      const latest = [...sessions].sort(
        (a, b) =>
          new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
      )[0];
      return {
        patientId,
        name: profile?.name ?? latest?.ownerLabel ?? patientId,
        age: profile?.age,
        screeningCount: sessions.length,
        latestRisk: latest ? `${latest.risk.score}/100 (${latest.risk.riskLevel})` : "n/a",
        latestFinding: latest?.vision.visualFinding,
        lastScalingMonthsAgo: profile
          ? Math.floor(profile.dentalCare.lastScalingDaysAgo / 30)
          : undefined,
        urgencyScore: score,
        urgencyReasons: reasons,
      };
    });
    rows.sort((a, b) => b.urgencyScore - a.urgencyScore);
    return { patients: rows, ranking: rows.map((r) => r.name) };
  },
};

const searchKnowledgeTool: DoctorTool = {
  name: "search_knowledge",
  description:
    "BM25 search over the curated oral-cancer + dental-health knowledge base (bilingual: English + 中文 terms like 蛀牙/洗牙). Use it to ground statistics, thresholds, and recommendations in citable sources.",
  parameters: {
    query: "what to look up, e.g. 'leukoplakia transformation rate' or '洗牙 frequency'",
  },
  async run(args) {
    const query = typeof args.query === "string" ? args.query : "";
    if (!query.trim()) return { error: "query is required" };
    return {
      results: searchKnowledge(query, 5).map((h) => ({
        title: h.entry.title,
        source: h.entry.source,
        relevance: Number(h.normalized.toFixed(2)),
        matchedTerms: h.matchedTerms,
        text: h.entry.text,
      })),
    };
  },
};

const listSkillsTool: DoctorTool = {
  name: "list_skills",
  description:
    "List the care-protocol skills available (scaling advice, cessation, post-screening care, brushing coaching, referral letter). Call get_skill before giving suggestions in these areas.",
  parameters: {},
  async run() {
    return {
      skills: listSkills().map((s) => ({
        name: s.name,
        description: s.description,
        audience: s.audience,
      })),
    };
  },
};

const getSkillTool: DoctorTool = {
  name: "get_skill",
  description:
    "Fetch a skill's full protocol (markdown steps) by name and FOLLOW it when formulating suggestions.",
  parameters: { name: "skill name from list_skills, e.g. 'scaling-advice'" },
  async run(args) {
    const name = typeof args.name === "string" ? args.name : "";
    const skill = getSkill(name);
    return skill
      ? { name: skill.name, audience: skill.audience, protocol: skill.content }
      : { error: `Unknown skill "${name}". Use list_skills first.` };
  },
};

/** The registry — add a tool here and the agent (and MCP server) can use it. */
export const DOCTOR_TOOLS: DoctorTool[] = [
  getPatientProfileTool,
  listPatientSessionsTool,
  compareAllPatientsTool,
  searchKnowledgeTool,
  listSkillsTool,
  getSkillTool,
];

/** Tool catalog rendered into the system prompt. */
export function toolCatalogForPrompt(): string {
  return DOCTOR_TOOLS.map((t) => {
    const params = Object.entries(t.parameters)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    return `- ${t.name}(${params || "no parameters"}): ${t.description}`;
  }).join("\n");
}

/** Single dispatcher: lookup + execution + error wrapping (never throws). */
export async function dispatchDoctorTool(
  name: string,
  args: Record<string, unknown>,
  ctx: DoctorToolContext
): Promise<unknown> {
  const tool = DOCTOR_TOOLS.find((t) => t.name === name);
  if (!tool) {
    return { error: `Unknown tool "${name}". Available: ${DOCTOR_TOOLS.map((t) => t.name).join(", ")}` };
  }
  try {
    return await tool.run(args ?? {}, ctx);
  } catch (err) {
    return { error: `Tool ${name} failed: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}
