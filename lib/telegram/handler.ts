import {
  TelegramClient,
  type TgInlineKeyboard,
  type TgUpdate,
} from "@/lib/telegram/client";
import { t, type Lang } from "@/bot/translations";
import { formatResult, formatAgentTrace } from "@/bot/formatResults";
import { runOrchestratorAgent } from "@/lib/agents/orchestratorAgent";
import { saveSession, getTelegramPatientId } from "@/lib/server/repository";
import { kvGet, kvSet } from "@/lib/server/kv";
import type {
  Questionnaire,
  VisionProviderId,
} from "@/lib/types/screening";

type ConvState =
  | "await_language"
  | "idle"
  | "await_photo"
  | "await_age"
  | "await_tobacco"
  | "await_alcohol"
  | "await_betel"
  | "await_family"
  | "await_lesion"
  | "await_pain"
  | "await_bleeding"
  | "await_ulcer"
  | "processing"
  | "done";

interface Conv {
  state: ConvState;
  lang: Lang;
  photoFileId?: string;
  firstName?: string;
  q: Partial<Questionnaire>;
}

const AGE_VALUES = [22, 35, 50, 60, 70];
const LESION_VALUES = [0, 1, 3, 6];

function provider(): VisionProviderId {
  return (process.env.TELEGRAM_BOT_PROVIDER ?? "mock").toLowerCase() as VisionProviderId;
}

// ── KV conversation state ────────────────────────────────────────────────────
async function getConv(chatId: number): Promise<Conv> {
  const c = await kvGet<Conv>(`tgstate:${chatId}`);
  return c ?? { state: "await_language", lang: "en", q: {} };
}
async function setConv(chatId: number, conv: Conv): Promise<void> {
  await kvSet(`tgstate:${chatId}`, conv);
}

// ── Keyboards ────────────────────────────────────────────────────────────────
function ikb(rows: { text: string; data: string }[][]): TgInlineKeyboard {
  return { inline_keyboard: rows.map((r) => r.map((b) => ({ text: b.text, callback_data: b.data }))) };
}
function yesNo(lang: Lang, prefix: string): TgInlineKeyboard {
  return ikb([[{ text: t("yes", lang), data: `${prefix}:y` }, { text: t("no", lang), data: `${prefix}:n` }]]);
}
function bands(bandStr: string, prefix: string): TgInlineKeyboard {
  return ikb(bandStr.split("|").map((label, i) => [{ text: label, data: `${prefix}:${i}` }]));
}

// ── Step prompts ─────────────────────────────────────────────────────────────
async function sendLanguagePicker(c: TelegramClient, chatId: number) {
  await c.sendMessage(chatId, t("pickLanguage", "en"), {
    replyMarkup: ikb([[
      { text: "🇬🇧 English", data: "lang:en" },
      { text: "🇲🇾 Bahasa Malaysia", data: "lang:bm" },
    ]]),
  });
}
async function sendWelcome(c: TelegramClient, chatId: number, lang: Lang) {
  await c.sendMessage(chatId, t("welcome", lang), {
    parseMode: "Markdown",
    replyMarkup: ikb([
      [{ text: t("startScreening", lang), data: "begin" }],
      [{ text: t("about", lang), data: "about" }, { text: t("changeLanguage", lang), data: "lang" }],
    ]),
  });
}

const QUESTION_FLOW: {
  state: ConvState;
  ask: (c: TelegramClient, chatId: number, lang: Lang) => Promise<void>;
}[] = [
  { state: "await_age", ask: (c, id, l) => c.sendMessage(id, t("qAge", l), { replyMarkup: bands(t("ageBands", l), "age") }).then(() => undefined) },
  { state: "await_tobacco", ask: (c, id, l) => c.sendMessage(id, t("qTobacco", l), { parseMode: "Markdown", replyMarkup: yesNo(l, "tobacco") }).then(() => undefined) },
  { state: "await_alcohol", ask: (c, id, l) => c.sendMessage(id, t("qAlcohol", l), { replyMarkup: yesNo(l, "alcohol") }).then(() => undefined) },
  { state: "await_betel", ask: (c, id, l) => c.sendMessage(id, t("qBetel", l), { parseMode: "Markdown", replyMarkup: yesNo(l, "betel") }).then(() => undefined) },
  { state: "await_family", ask: (c, id, l) => c.sendMessage(id, t("qFamily", l), { parseMode: "Markdown", replyMarkup: yesNo(l, "family") }).then(() => undefined) },
  { state: "await_lesion", ask: (c, id, l) => c.sendMessage(id, t("qLesion", l), { replyMarkup: bands(t("lesionBands", l), "lesion") }).then(() => undefined) },
  { state: "await_pain", ask: (c, id, l) => c.sendMessage(id, t("qPain", l), { replyMarkup: yesNo(l, "pain") }).then(() => undefined) },
  { state: "await_bleeding", ask: (c, id, l) => c.sendMessage(id, t("qBleeding", l), { replyMarkup: yesNo(l, "bleeding") }).then(() => undefined) },
  { state: "await_ulcer", ask: (c, id, l) => c.sendMessage(id, t("qUlcer", l), { replyMarkup: yesNo(l, "ulcer") }).then(() => undefined) },
];

async function askState(c: TelegramClient, chatId: number, lang: Lang, state: ConvState) {
  const step = QUESTION_FLOW.find((s) => s.state === state);
  if (step) await step.ask(c, chatId, lang);
}

// ── Pipeline ─────────────────────────────────────────────────────────────────
async function runPipeline(c: TelegramClient, chatId: number, conv: Conv) {
  const progress = await c.sendMessage(chatId, t("processingHeader", conv.lang), {
    parseMode: "Markdown",
  });
  const ticks: string[] = [];
  const onTick = async (line: string) => {
    ticks.push(line);
    await c.editMessageText(
      chatId,
      progress.message_id,
      `${t("processingHeader", conv.lang)}\n\n${ticks.join("\n")}`,
      { parseMode: "Markdown" }
    );
  };

  try {
    const photo = conv.photoFileId
      ? await c.getFileBase64(conv.photoFileId)
      : null;
    if (!photo) {
      await c.sendMessage(chatId, t("notPhoto", conv.lang), { parseMode: "Markdown" });
      conv.state = "await_photo";
      await setConv(chatId, conv);
      return;
    }

    const questionnaire: Questionnaire = {
      age: conv.q.age ?? 30,
      tobacco: conv.q.tobacco ?? false,
      alcohol: conv.q.alcohol ?? false,
      betelQuid: conv.q.betelQuid ?? false,
      familyHistory: conv.q.familyHistory ?? false,
      lesionDurationWeeks: conv.q.lesionDurationWeeks ?? 0,
      pain: conv.q.pain ?? false,
      bleeding: conv.q.bleeding ?? false,
      ulcer: conv.q.ulcer ?? false,
    };

    const pending: string[] = [];
    let session;
    try {
      session = await runOrchestratorAgent({
        source: "upload",
        imageBase64: photo.base64,
        imageMimeType: photo.mimeType,
        fileName: `tg_${chatId}.jpg`,
        questionnaire,
        preferredProvider: provider(),
        onStep: (e) => {
          if (e.status === "completed") pending.push(`✓ ${e.agent}${e.detail ? ` — ${e.detail}` : ""}`);
          else if (e.status === "skipped") pending.push(`— ${e.agent} (skipped)`);
        },
      });
    } finally {
      // Always flush collected progress, even if the pipeline threw.
      if (pending.length) await onTick(pending.join("\n"));
    }

    // Persist for the doctor dashboard (linked tg patient).
    const linked = await getTelegramPatientId(chatId);
    const patientId = linked ?? `tg:${chatId}`;
    await saveSession(session, {
      patientId,
      label: linked ? `${conv.firstName ?? "Patient"} (linked)` : `Telegram: ${conv.firstName ?? chatId}`,
      channel: "telegram",
    });

    // Patient-facing report + agent trace.
    await c.sendMessage(chatId, formatResult(session, conv.lang), {
      parseMode: "MarkdownV2",
    });
    await c.sendMessage(chatId, formatAgentTrace(session, conv.lang), {
      parseMode: "Markdown",
    });
    await c.sendMessage(chatId, conv.lang === "en" ? "What next?" : "Apa seterusnya?", {
      replyMarkup: ikb([
        [{ text: t("newScreening", conv.lang), data: "restart" }],
        [{ text: t("changeLanguage", conv.lang), data: "lang" }],
      ]),
    });

    conv.state = "done";
    await setConv(chatId, conv);
  } catch (err) {
    console.error("[telegram] pipeline error:", err);
    await c.sendMessage(chatId, t("processingFailed", conv.lang));
    conv.state = "idle";
    await setConv(chatId, conv);
  }
}

// ── Main dispatch ────────────────────────────────────────────────────────────
export async function handleTelegramUpdate(
  client: TelegramClient,
  update: TgUpdate
): Promise<void> {
  // ---- Callback (button) ----
  if (update.callback_query) {
    const q = update.callback_query;
    const chatId = q.message?.chat.id;
    const data = q.data;
    await client.answerCallbackQuery(q.id);
    if (!chatId || !data) return;
    const conv = await getConv(chatId);

    if (data.startsWith("lang:")) {
      conv.lang = data.endsWith(":bm") ? "bm" : "en";
      conv.state = "idle";
      await setConv(chatId, conv);
      await sendWelcome(client, chatId, conv.lang);
      return;
    }
    if (data === "lang") return sendLanguagePicker(client, chatId);
    if (data === "about") {
      await client.sendMessage(chatId, t("aboutMessage", conv.lang), { parseMode: "Markdown" });
      return;
    }
    if (data === "begin" || data === "restart") {
      conv.q = {};
      conv.photoFileId = undefined;
      conv.state = "await_photo";
      await setConv(chatId, conv);
      await client.sendMessage(chatId, t("askPhoto", conv.lang), { parseMode: "Markdown" });
      return;
    }

    // Questionnaire answers
    const apply: Record<string, () => void> = {
      age: () => { conv.q.age = AGE_VALUES[parseInt(data.split(":")[1], 10)] ?? 30; conv.state = "await_tobacco"; },
      tobacco: () => { conv.q.tobacco = data.endsWith(":y"); conv.state = "await_alcohol"; },
      alcohol: () => { conv.q.alcohol = data.endsWith(":y"); conv.state = "await_betel"; },
      betel: () => { conv.q.betelQuid = data.endsWith(":y"); conv.state = "await_family"; },
      family: () => { conv.q.familyHistory = data.endsWith(":y"); conv.state = "await_lesion"; },
      lesion: () => { conv.q.lesionDurationWeeks = LESION_VALUES[parseInt(data.split(":")[1], 10)] ?? 0; conv.state = "await_pain"; },
      pain: () => { conv.q.pain = data.endsWith(":y"); conv.state = "await_bleeding"; },
      bleeding: () => { conv.q.bleeding = data.endsWith(":y"); conv.state = "await_ulcer"; },
      ulcer: () => { conv.q.ulcer = data.endsWith(":y"); conv.state = "processing"; },
    };
    const key = data.split(":")[0];
    if (apply[key]) {
      apply[key]();
      await setConv(chatId, conv);
      if (conv.state === "processing") {
        await runPipeline(client, chatId, conv);
      } else {
        await askState(client, chatId, conv.lang, conv.state);
      }
    }
    return;
  }

  // ---- Message ----
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const conv = await getConv(chatId);
  conv.firstName = msg.from?.first_name ?? conv.firstName;

  // Commands
  if (msg.text?.startsWith("/start")) {
    conv.state = "await_language";
    conv.q = {};
    conv.photoFileId = undefined;
    await setConv(chatId, conv);
    return sendLanguagePicker(client, chatId);
  }
  if (msg.text?.startsWith("/cancel")) {
    conv.state = "idle";
    conv.q = {};
    conv.photoFileId = undefined;
    await setConv(chatId, conv);
    await client.sendMessage(chatId, t("cancelled", conv.lang));
    return;
  }
  if (msg.text?.startsWith("/help")) {
    return sendWelcome(client, chatId, conv.lang);
  }

  // Photo
  if (msg.photo && msg.photo.length > 0) {
    if (conv.state !== "await_photo") {
      await client.sendMessage(
        chatId,
        conv.lang === "en"
          ? "Thanks! Send /start to begin a screening."
          : "Terima kasih! Hantar /start untuk mula saringan."
      );
      return;
    }
    const largest = msg.photo[msg.photo.length - 1];
    conv.photoFileId = largest.file_id;
    conv.state = "await_age";
    await setConv(chatId, conv);
    await client.sendMessage(chatId, t("photoReceived", conv.lang));
    await askState(client, chatId, conv.lang, "await_age");
    return;
  }

  // Fallback text
  if (conv.state === "await_photo") {
    await client.sendMessage(chatId, t("notPhoto", conv.lang), { parseMode: "Markdown" });
    return;
  }
  if (conv.state === "await_language" || conv.state === "idle") {
    return sendLanguagePicker(client, chatId);
  }
  await client.sendMessage(chatId, t("unexpected", conv.lang));
}
