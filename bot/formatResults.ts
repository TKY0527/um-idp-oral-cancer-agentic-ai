import type { ScreeningSession } from "../lib/types/screening";
import type { DemoPatientProfile } from "../lib/data/demoPatients";
import { VISUAL_FINDING_LABEL } from "../lib/utils/riskUtils";
import { t, type Lang } from "./translations";

/**
 * Escape Telegram MarkdownV2 reserved characters.
 * Telegram MarkdownV2 requires `_*[]()~\`>#+-=|{}.!` to be escaped.
 */
function mdEsc(s: string): string {
  return s.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Escape MarkdownV2 reserved chars but KEEP `*` so translated strings that
 * carry intentional bold markers (e.g. "🦷 *Function 2: …*") render bold.
 * Only use on trusted translation strings with balanced asterisks.
 */
function mdEscKeepBold(s: string): string {
  return s.replace(/([_[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function stripCitation(driver: string): string {
  return driver.replace(/\s*\(\+\d+[^)]*\)\s*$/, "");
}

/**
 * Plain-Markdown demo patient card (used in /start, /anotherpatient).
 */
export function formatPatientCard(
  profile: DemoPatientProfile,
  lang: Lang
): string {
  const habitBits = [
    profile.habits.tobacco ? (lang === "en" ? "tobacco" : "tembakau") : null,
    profile.habits.alcohol ? (lang === "en" ? "alcohol" : "alkohol") : null,
    profile.habits.betelQuid ? (lang === "en" ? "betel quid" : "sirih/pinang") : null,
    profile.habits.familyHistory
      ? lang === "en"
        ? "family history"
        : "sejarah keluarga"
      : null,
  ].filter(Boolean) as string[];
  return t("patientCard", lang, {
    avatar: profile.avatar,
    name: profile.name,
    age: profile.age,
    race: profile.race,
    sex:
      lang === "en"
        ? profile.sex
        : profile.sex === "male"
          ? "lelaki"
          : "perempuan",
    habits: habitBits.length ? habitBits.join(", ") : t("noHabits", lang),
    times: profile.brushing.timesPerDay,
    brushTimes: profile.brushing.usualTimes.join(" & "),
    duration: profile.brushing.avgDurationSec,
    scalingMonths: Math.floor(profile.dentalCare.lastScalingDaysAgo / 30),
    checkup: profile.dentalCare.checkupHabit,
    condition: profile.toothCondition,
  });
}

/**
 * Build the patient-friendly screening report message.
 * Uses MarkdownV2 so we can bold + italic + escape safely.
 *
 * Function 1 (oral cancer cues) + Function 2 (tooth health) — both from
 * the SAME picture, in one message.
 */
export function formatResult(
  session: ScreeningSession,
  lang: Lang,
  demoPatient?: DemoPatientProfile
): string {
  const lines: string[] = [];
  if (demoPatient) {
    lines.push(
      mdEsc(t("usingPatientLine", lang, { name: demoPatient.name }))
    );
    lines.push("");
  }
  lines.push(mdEscKeepBold(t("resultHeader", lang)));
  lines.push("");

  // Risk band line — emoji + label + score
  const riskKey =
    session.risk.riskLevel === "Low"
      ? "riskLow"
      : session.risk.riskLevel === "Medium"
        ? "riskMedium"
        : "riskHigh";
  lines.push(`*${mdEsc(t(riskKey, lang))}*  \\(${session.risk.score}/100\\)`);
  lines.push("");

  // Vision finding + region (labels are static/enum-clamped — no `*` risk)
  const findingLabel = VISUAL_FINDING_LABEL[session.vision.visualFinding];
  lines.push(mdEscKeepBold(t("findingLine", lang, { finding: findingLabel })));
  if (
    session.vision.suspectedRegion !== "none" &&
    session.vision.suspectedRegion !== "unknown"
  ) {
    lines.push(
      mdEscKeepBold(
        t("regionLine", lang, { region: session.vision.suspectedRegion })
      )
    );
  }
  lines.push("");

  // Top drivers (patient-friendly: strip citation tags)
  if (session.risk.topRiskDrivers.length > 0) {
    lines.push(`*${mdEsc(t("driversHeader", lang))}*`);
    for (const d of session.risk.topRiskDrivers.slice(0, 4)) {
      lines.push(`• ${mdEsc(stripCitation(d))}`);
    }
    lines.push("");
  }

  // Patient report
  lines.push(`*${mdEsc(t("patientHeadlineLabel", lang))}*`);
  lines.push(mdEsc(session.patientReport.headline));
  lines.push("");
  lines.push(mdEsc(session.patientReport.message));
  lines.push("");

  // Recommended next step
  lines.push(`*${mdEsc(t("nextStepLabel", lang))}*`);
  lines.push(mdEsc(session.patientReport.nextStep));
  lines.push("");

  // ── Function 2: tooth health from the SAME picture ──
  if (session.dentalWellness) {
    const d = session.dentalWellness;
    const nice = (v: string) => v.replace(/_/g, " ");
    lines.push(mdEscKeepBold(t("dentalHeader", lang)));
    lines.push(
      mdEscKeepBold(t("hygieneLine", lang, { score: d.hygieneScore }))
    );
    lines.push(
      mdEscKeepBold(t("cavityLine", lang, { value: nice(d.cavityRisk) }))
    );
    lines.push(
      mdEscKeepBold(t("gumLine", lang, { value: nice(d.gumCondition) }))
    );
    lines.push(
      mdEscKeepBold(t("plaqueLine", lang, { value: nice(d.plaqueLevel) }))
    );
    lines.push(
      mdEscKeepBold(t("stainingLine", lang, { value: nice(d.staining) }))
    );
    if (d.scalingAdvice) {
      const levelKey =
        d.scalingAdvice.level === "soon"
          ? "scalingSoon"
          : d.scalingAdvice.level === "routine"
            ? "scalingRoutine"
            : "scalingNotNeeded";
      lines.push(
        mdEscKeepBold(
          t("scalingNeedLine", lang, { value: t(levelKey, lang) })
        )
      );
      lines.push(mdEsc(d.scalingAdvice.reason));
    }
    if (d.imageObservations) {
      lines.push(mdEsc(d.imageObservations));
    }
    if (d.suggestions.length > 0) {
      lines.push(`*${mdEsc(t("dentalTipsHeader", lang))}*`);
      for (const s of d.suggestions.slice(0, 3)) {
        lines.push(`• ${mdEsc(s)}`);
      }
    }
    lines.push("");
  }

  // Multi-Expert Panel verdict (only when triggered)
  if (session.panelDiscussion && session.panelDiscussion.triggered) {
    const p = session.panelDiscussion;
    lines.push("");
    lines.push(mdEscKeepBold(t("panelHeader", lang)));
    const consensusKey =
      p.consensus === "agreement"
        ? "panelConsensusAgreement"
        : p.consensus === "majority"
          ? "panelConsensusMajority"
          : "panelConsensusSplit";
    lines.push(
      mdEsc(
        `${t(consensusKey, lang)} · ${(p.agreementScore * 100).toFixed(0)}%`
      )
    );
    for (const o of p.opinions) {
      const action = o.recommendedAction.replace(/_/g, " ");
      lines.push(`• *${mdEsc(o.label)}*: ${mdEsc(action)}`);
    }
    const escKey =
      p.escalation === "escalate"
        ? "panelEscalate"
        : p.escalation === "downgrade"
          ? "panelDowngrade"
          : "panelKeep";
    lines.push("");
    lines.push(mdEsc(t(escKey, lang)));
    lines.push("");
  }

  // Disclaimer
  lines.push(mdEscKeepBold(t("disclaimer", lang)));

  return lines.join("\n");
}

/**
 * Compact "pipeline trace" message shown after the result, listing every
 * agent invocation with its outcome. Helps demo the agentic-AI angle.
 */
export function formatAgentTrace(
  session: ScreeningSession,
  lang: Lang
): string {
  const header =
    lang === "en" ? "🧠 *Agent pipeline trace*" : "🧠 *Jejak pipeline ejen*";
  const lines: string[] = [header, "```"];
  for (const e of session.auditLog) {
    if (e.event === "called") continue; // condensed view
    const ts = new Date(e.timestamp).toISOString().slice(11, 19);
    const tag =
      e.event === "completed"
        ? "✓"
        : e.event === "skipped"
          ? "—"
          : e.event === "failed"
            ? "✗"
            : "•";
    lines.push(`${ts} ${tag} ${e.agent}`);
  }
  lines.push("```");
  lines.push(
    lang === "en"
      ? `_Session id: ${session.sessionId}_`
      : `_ID sesi: ${session.sessionId}_`
  );
  return lines.join("\n");
}
