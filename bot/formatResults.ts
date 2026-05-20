import type { ScreeningSession } from "../lib/types/screening";
import { VISUAL_FINDING_LABEL } from "../lib/utils/riskUtils";
import { t, type Lang } from "./translations";

/**
 * Escape Telegram MarkdownV2 reserved characters.
 * Telegram MarkdownV2 requires `_*[]()~\`>#+-=|{}.!` to be escaped.
 */
function mdEsc(s: string): string {
  return s.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function stripCitation(driver: string): string {
  return driver.replace(/\s*\(\+\d+[^)]*\)\s*$/, "");
}

/**
 * Build the patient-friendly screening report message.
 * Uses MarkdownV2 so we can bold + italic + escape safely.
 */
export function formatResult(
  session: ScreeningSession,
  lang: Lang
): string {
  const lines: string[] = [];
  lines.push(mdEsc(t("resultHeader", lang)));
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

  // Vision finding + region
  const findingLabel = VISUAL_FINDING_LABEL[session.vision.visualFinding];
  lines.push(mdEsc(t("findingLine", lang, { finding: findingLabel })));
  if (
    session.vision.suspectedRegion !== "none" &&
    session.vision.suspectedRegion !== "unknown"
  ) {
    lines.push(
      mdEsc(t("regionLine", lang, { region: session.vision.suspectedRegion }))
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

  // Multi-Expert Panel verdict (only when triggered)
  if (session.panelDiscussion && session.panelDiscussion.triggered) {
    const p = session.panelDiscussion;
    lines.push("");
    lines.push(mdEsc(t("panelHeader", lang)));
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
  lines.push(mdEsc(t("disclaimer", lang)));

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
