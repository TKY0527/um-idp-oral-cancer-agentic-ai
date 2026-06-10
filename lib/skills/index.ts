import { tokenize } from "@/lib/retrieval/engine";

/**
 * Skills library — the OpenClaw / Claude Code "SKILL.md" pattern applied
 * to oral health: each skill is a small, versioned instruction file the
 * agents read AT RUNTIME when its trigger matches, instead of baking
 * every protocol into every prompt.
 *
 * Consumers:
 *   - Doctor Assistant agent: list_skills / get_skill tools — it pulls a
 *     protocol before giving suggestions.
 *   - Patient Chat agent: the best-matching patient-facing skill is
 *     auto-injected into the system context.
 *   - MCP server: skills are discoverable/callable by external AI clients.
 *
 * Stored as TypeScript modules (not loose .md files) so they survive
 * serverless bundling — same idea, deploy-safe.
 */

export interface Skill {
  name: string;
  description: string;
  /** Trigger hints — matched against the user's question. */
  whenToUse: string;
  audience: "patient" | "doctor" | "both";
  /** Markdown protocol the agent should follow. */
  content: string;
}

export const SKILLS: Skill[] = [
  {
    name: "scaling-advice",
    description:
      "Decide whether professional scaling (洗牙) is needed and explain it to the patient.",
    whenToUse:
      "scaling cleaning 洗牙 tartar 牙结石 plaque staining how often when should I clean",
    audience: "both",
    content: `# Scaling (洗牙) advice protocol
1. Check the evidence in this order: visible tartar/heavy plaque in the picture → staining level → gum condition → months since last scaling (from the record).
2. Recommend by band:
   - HEAVY plaque/tartar OR notable staining → "book scaling soon" (within 2–4 weeks).
   - Moderate plaque, gum inflammation, OR ≥6 months since last scaling → "routine cleaning due".
   - Clean teeth AND <6 months since scaling → "not needed yet — keep the routine".
3. High-risk groups (smokers, betel users, diabetics, gum disease) → suggest a 3–4 month cycle instead of 6.
4. Always say WHY, citing the concrete sign (e.g. "heavy tartar visible on lower molars").
5. Reassure: ultrasonic scaling does not damage enamel; brief sensitivity afterwards is normal.
6. End with the disclaimer that this is a prototype suggestion, not a treatment plan.`,
  },
  {
    name: "quit-betel-tobacco",
    description:
      "Cessation suggestions for betel quid, tobacco, or alcohol users — the biggest modifiable risks.",
    whenToUse:
      "quit stop betel 槟榔 tobacco smoking 吸烟 alcohol cessation reduce habit how to stop",
    audience: "both",
    content: `# Betel / tobacco / alcohol cessation protocol
1. Lead with the personal, concrete benefit: oral-cancer odds drop substantially after quitting (betel OR ~7–20×, tobacco×alcohol up to ~35× combined); gum health improves within months.
2. Suggest ONE small first step, not total abstinence on day one:
   - Betel: cut to half the daily quids this week; never sleep with a quid in the cheek.
   - Tobacco: pick a quit date within 2 weeks; consider nicotine replacement from a pharmacy.
   - Alcohol: alcohol-free days ≥3 per week.
3. Point to Malaysia support: Klinik Berhenti Merokok at government clinics (free), or ask the dentist.
4. Schedule the feedback loop: re-screen monthly in the app — the trend chart makes progress visible.
5. Never shame. Frame as "your mouth heals fast once the habit stops".
6. If a lesion is already present (ulcer >2 weeks, white/red patch), cessation does NOT replace seeing a dentist — both.`,
  },
  {
    name: "post-screening-care",
    description:
      "What to do after a Low / Medium / High screening result — next steps and follow-up windows.",
    whenToUse:
      "result what now next step follow up low medium high risk after screening 接下来 怎么办",
    audience: "both",
    content: `# Post-screening care protocol
- LOW: routine care. Re-screen monthly in the app; dentist check-up every 6 months; keep brushing 2×2min + floss.
- MEDIUM: watch actively. Photograph the area weekly; if ANY lesion persists >2 weeks total, book a dentist within 1–2 weeks; avoid tobacco/betel/alcohol meanwhile; re-screen in app weekly.
- HIGH: act now. Book a dentist or oral-medicine clinic within days (the referral packet in the app summarises the findings — show it); do not wait to "see if it heals"; bring the screening history printout/trend.
- Always: a result here is a screening hint, not a diagnosis. The 2-week non-healing rule overrides everything — persistent means examined.
- For the doctor: Medium+rising trend, high-risk site (lateral tongue / floor of mouth), or lesion >4 weeks supports escalating one band.`,
  },
  {
    name: "brushing-coaching",
    description:
      "Improve brushing habits using the smart-toothbrush telemetry and zone heatmap.",
    whenToUse:
      "brushing brush 刷牙 technique coverage heatmap zone missed duration pressure floss improve hygiene score",
    audience: "patient",
    content: `# Brushing coaching protocol
1. Read the data first: duration vs the 2-minute target, pressure flag, and the WEAKEST zone on the coverage heatmap.
2. Give ONE focus per week, in priority order:
   a. Duration <120s → "add 30 seconds this week" (use the brush timer / a song).
   b. High pressure → "let the bristles do the work — grip the brush like a pen".
   c. Weakest zone <70% → name it concretely ("lower-left inner surfaces") and suggest starting there each session, since people rush the end.
3. Then add flossing: once daily, before the night brush; expect minor bleeding for ~1 week if gums are inflamed.
4. Tie to the score: "each fix typically lifts your hygiene score 5–10 points by next screening".
5. Praise streaks from the 14-day log before pointing at gaps.`,
  },
  {
    name: "referral-letter",
    description:
      "Doctor-only: structure a concise oral-medicine referral from the screening data.",
    whenToUse:
      "referral letter refer specialist biopsy write summary clinic 转诊",
    audience: "doctor",
    content: `# Referral letter protocol (doctor)
Structure (≤200 words):
1. One-line ask: "Assessment ± biopsy of <finding> at <site>".
2. Lesion: type, site, size if known, DURATION in weeks, change over time (use the risk-trend data).
3. Risk profile: age, tobacco/alcohol/betel (duration), family history, last scaling.
4. Screening evidence: latest AI risk score + band, expert-panel verdict if it ran, image availability.
5. Patient context: language, contact, mobility/work constraints.
6. Urgency: HIGH band or >4-week lesion → request appointment within 2 weeks.
Never state a diagnosis — describe findings. Attach the app's clinician referral packet.`,
  },
];

export function listSkills(audience?: Skill["audience"]): Skill[] {
  if (!audience) return SKILLS;
  return SKILLS.filter((s) => s.audience === audience || s.audience === "both");
}

export function getSkill(name: string): Skill | undefined {
  return SKILLS.find((s) => s.name === name.trim().toLowerCase());
}

/**
 * Match the best skill(s) for a free-text query — token overlap against
 * name + description + whenToUse. Returns [] when nothing clears the bar,
 * so callers can skip injection entirely.
 */
export function matchSkills(
  query: string,
  audience?: Skill["audience"],
  topK = 1
): Skill[] {
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return [];
  const scored = listSkills(audience)
    .map((skill) => {
      const sTokens = tokenize(
        `${skill.name} ${skill.description} ${skill.whenToUse}`
      );
      let score = 0;
      for (const t of sTokens) if (qTokens.has(t)) score += 1;
      return { skill, score };
    })
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.skill);
}
