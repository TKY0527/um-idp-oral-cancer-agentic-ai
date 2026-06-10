import {
  TelegramClient,
  type TgInlineKeyboard,
  type TgUpdate,
} from "@/lib/telegram/client";
import { t, type Lang } from "@/bot/translations";
import {
  formatAgentTrace,
  formatPatientCard,
  formatResult,
} from "@/bot/formatResults";
import { runOrchestratorAgent } from "@/lib/agents/orchestratorAgent";
import { saveSession } from "@/lib/server/repository";
import { ensureDemoDataSeeded } from "@/lib/server/demoSeed";
import {
  DEFAULT_DEMO_PATIENT_KEY,
  getDemoPatient,
  nextDemoPatientKey,
  type DemoPatientProfile,
} from "@/lib/data/demoPatients";
import { kvGet, kvSet } from "@/lib/server/kv";
import type { VisionProviderId } from "@/lib/types/screening";

/**
 * Zero-press Telegram flow:
 *
 *   photo → the full agentic AI pipeline runs IMMEDIATELY using the active
 *   demo patient's data (questionnaire, habits, history). No buttons, no
 *   questions. The reply contains BOTH functions from the same picture:
 *   function 1 (oral-cancer cues) and function 2 (tooth health).
 *
 * The only commands:
 *   /anotherpatient — cycle to the next demo patient
 *   /language       — switch EN ↔ BM
 *   /start, /help   — explain the flow
 */

interface Conv {
  lang: Lang;
  /** Active demo patient key ("aisyah" | "tan" | "muthu"). */
  patientKey: string;
  firstName?: string;
}

function provider(): VisionProviderId {
  return (process.env.TELEGRAM_BOT_PROVIDER ?? "mock").toLowerCase() as VisionProviderId;
}

// ── KV conversation state ────────────────────────────────────────────────────
async function getConv(chatId: number): Promise<Conv> {
  const c = await kvGet<Partial<Conv>>(`tgstate:${chatId}`);
  return {
    lang: c?.lang === "bm" ? "bm" : "en",
    patientKey: c?.patientKey ?? DEFAULT_DEMO_PATIENT_KEY,
    firstName: c?.firstName,
  };
}
async function setConv(chatId: number, conv: Conv): Promise<void> {
  await kvSet(`tgstate:${chatId}`, conv);
}

function activePatient(conv: Conv): DemoPatientProfile {
  return (
    getDemoPatient(conv.patientKey) ??
    (getDemoPatient(DEFAULT_DEMO_PATIENT_KEY) as DemoPatientProfile)
  );
}

// ── Keyboards ────────────────────────────────────────────────────────────────
function ikb(rows: { text: string; data: string }[][]): TgInlineKeyboard {
  return {
    inline_keyboard: rows.map((r) =>
      r.map((b) => ({ text: b.text, callback_data: b.data }))
    ),
  };
}

async function sendLanguagePicker(c: TelegramClient, chatId: number) {
  await c.sendMessage(chatId, t("pickLanguage", "en"), {
    replyMarkup: ikb([[
      { text: "🇬🇧 English", data: "lang:en" },
      { text: "🇲🇾 Bahasa Malaysia", data: "lang:bm" },
    ]]),
  });
}

async function sendWelcome(c: TelegramClient, chatId: number, conv: Conv) {
  const card = formatPatientCard(activePatient(conv), conv.lang);
  await c.sendMessage(
    chatId,
    t("welcome", conv.lang, { patient: card }),
    { parseMode: "Markdown" }
  );
}

// ── Pipeline (photo → instant screening with demo patient data) ─────────────
async function runPipeline(
  c: TelegramClient,
  chatId: number,
  conv: Conv,
  photoFileId: string
) {
  const patient = activePatient(conv);
  // Plain text on purpose: tick details contain raw enum strings like
  // "ulcer_like" whose underscores would break Markdown parsing and make
  // Telegram silently reject the whole progress edit.
  const progressHeader = `${t("processingHeader", conv.lang)}\n${t(
    "usingPatientLine",
    conv.lang,
    { name: patient.name }
  )}`;
  const progress = await c.sendMessage(chatId, progressHeader);
  const ticks: string[] = [];
  const onTick = async (line: string) => {
    ticks.push(line);
    await c.editMessageText(
      chatId,
      progress.message_id,
      `${progressHeader}\n\n${ticks.join("\n")}`
    );
  };

  try {
    // Make sure the demo history exists so the doctor dashboard shows the
    // patient's trend the first time anyone screens via Telegram.
    await ensureDemoDataSeeded().catch(() => undefined);

    const photo = await c.getFileBase64(photoFileId);
    if (!photo) {
      await c.sendMessage(chatId, t("notPhoto", conv.lang), {
        parseMode: "Markdown",
      });
      return;
    }

    const pending: string[] = [];
    let session;
    try {
      session = await runOrchestratorAgent({
        source: "upload",
        imageBase64: photo.base64,
        imageMimeType: photo.mimeType,
        fileName: `tg_${patient.key}_${chatId}.jpg`,
        questionnaire: patient.baselineQuestionnaire,
        preferredProvider: provider(),
        lastScalingDaysAgo: patient.dentalCare.lastScalingDaysAgo,
        onStep: (e) => {
          if (e.status === "completed")
            pending.push(`✓ ${e.agent}${e.detail ? ` — ${e.detail}` : ""}`);
          else if (e.status === "skipped") pending.push(`— ${e.agent} (skipped)`);
        },
      });
    } finally {
      // Always flush collected progress, even if the pipeline threw.
      if (pending.length) await onTick(pending.join("\n"));
    }

    // Persist under the demo patient so the doctor dashboard groups this
    // screening with the patient's seeded history.
    await saveSession(session, {
      patientId: patient.patientId,
      label: patient.name,
      channel: "telegram",
    });

    // Patient-facing report (function 1 + function 2) + agent trace.
    await c.sendMessage(chatId, formatResult(session, conv.lang, patient), {
      parseMode: "MarkdownV2",
    });
    await c.sendMessage(chatId, formatAgentTrace(session, conv.lang), {
      parseMode: "Markdown",
    });
    await c.sendMessage(chatId, t("sendAnotherHint", conv.lang));
  } catch (err) {
    console.error("[telegram] pipeline error:", err);
    await c.sendMessage(chatId, t("processingFailed", conv.lang));
  }
}

// ── Main dispatch ────────────────────────────────────────────────────────────
export async function handleTelegramUpdate(
  client: TelegramClient,
  update: TgUpdate
): Promise<void> {
  // ---- Callback (language buttons only) ----
  if (update.callback_query) {
    const q = update.callback_query;
    const chatId = q.message?.chat.id;
    const data = q.data;
    await client.answerCallbackQuery(q.id);
    if (!chatId || !data) return;
    const conv = await getConv(chatId);

    if (data.startsWith("lang:")) {
      conv.lang = data.endsWith(":bm") ? "bm" : "en";
      await setConv(chatId, conv);
      await sendWelcome(client, chatId, conv);
    }
    return;
  }

  // ---- Message ----
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const conv = await getConv(chatId);
  conv.firstName = msg.from?.first_name ?? conv.firstName;
  await setConv(chatId, conv);

  // Commands
  if (msg.text?.startsWith("/start") || msg.text?.startsWith("/help")) {
    return sendWelcome(client, chatId, conv);
  }
  if (msg.text?.startsWith("/language")) {
    return sendLanguagePicker(client, chatId);
  }
  if (
    msg.text?.startsWith("/anotherpatient") ||
    msg.text?.startsWith("/changepatient")
  ) {
    conv.patientKey = nextDemoPatientKey(conv.patientKey);
    await setConv(chatId, conv);
    const card = formatPatientCard(activePatient(conv), conv.lang);
    await client.sendMessage(
      chatId,
      t("switchedPatient", conv.lang, { card }),
      { parseMode: "Markdown" }
    );
    return;
  }
  if (msg.text?.startsWith("/about")) {
    await client.sendMessage(chatId, t("aboutMessage", conv.lang), {
      parseMode: "Markdown",
    });
    return;
  }

  // Photo → run immediately. No state machine, no questions, no buttons.
  if (msg.photo && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1];
    await runPipeline(client, chatId, conv, largest.file_id);
    return;
  }

  // Documents that are actually images (sent as file) also work.
  if (msg.document?.mime_type?.startsWith("image/") && msg.document.file_id) {
    await runPipeline(client, chatId, conv, msg.document.file_id);
    return;
  }

  // Anything else → one-line nudge.
  await client.sendMessage(chatId, t("notPhoto", conv.lang), {
    parseMode: "Markdown",
  });
}
