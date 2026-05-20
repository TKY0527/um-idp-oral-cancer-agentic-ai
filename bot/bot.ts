/**
 * OralScan AI — Telegram Bot
 *
 * Polling-mode Telegram bot that reuses the project's agentic-AI pipeline
 * (orchestratorAgent + 9 sub-agents) for screening, with a bilingual
 * (English / Bahasa Malaysia) conversation driven by inline-keyboard
 * buttons.
 *
 * Run:
 *   npm run bot
 *
 * Env vars (in .env.local — gitignored):
 *   TELEGRAM_BOT_TOKEN     (required)
 *   TELEGRAM_BOT_PROVIDER  (mock | gemini | claude | local, default mock)
 *   GEMINI_API_KEY         (optional — only if provider is gemini)
 */

import TelegramBot, { type InlineKeyboardMarkup } from "node-telegram-bot-api";
import { runOrchestratorAgent } from "../lib/agents/orchestratorAgent";
import { loadEnvLocal } from "../lib/utils/loadEnvLocal";
import type {
  Questionnaire,
  ScreeningSession,
  VisionProviderId,
} from "../lib/types/screening";
import { t, type Lang } from "./translations";
import { formatAgentTrace, formatResult } from "./formatResults";

loadEnvLocal();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error(
    "TELEGRAM_BOT_TOKEN is missing. Add it to .env.local — get one from @BotFather."
  );
  process.exit(1);
}

const PROVIDER: VisionProviderId =
  ((process.env.TELEGRAM_BOT_PROVIDER ?? "mock").toLowerCase() as VisionProviderId);

const bot = new TelegramBot(TOKEN, { polling: true });

// ─── Per-chat conversation state ─────────────────────────────────────────────

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
  photo?: { base64: string; mimeType: string; fileName: string };
  q: Partial<Questionnaire>;
  progressMessageId?: number; // to edit "Running pipeline..." in place
}

const convs = new Map<number, Conv>();

function getConv(chatId: number): Conv {
  let c = convs.get(chatId);
  if (!c) {
    c = { state: "await_language", lang: "en", q: {} };
    convs.set(chatId, c);
  }
  return c;
}

function resetConv(chatId: number, keepLang = true): Conv {
  const old = convs.get(chatId);
  const fresh: Conv = {
    state: "idle",
    lang: keepLang && old ? old.lang : "en",
    q: {},
  };
  convs.set(chatId, fresh);
  return fresh;
}

// ─── Keyboard helpers ────────────────────────────────────────────────────────

function ikb(
  rows: { text: string; data: string }[][]
): InlineKeyboardMarkup {
  return {
    inline_keyboard: rows.map((row) =>
      row.map((b) => ({ text: b.text, callback_data: b.data }))
    ),
  };
}

function yesNoKb(lang: Lang, prefix: string): InlineKeyboardMarkup {
  return ikb([
    [
      { text: t("yes", lang), data: `${prefix}:y` },
      { text: t("no", lang), data: `${prefix}:n` },
    ],
  ]);
}

function bandsKb(
  bandsStr: string,
  prefix: string
): InlineKeyboardMarkup {
  const bands = bandsStr.split("|");
  return ikb(
    bands.map((label, i) => [{ text: label, data: `${prefix}:${i}` }])
  );
}

// ─── Conversation steps ──────────────────────────────────────────────────────

async function sendWelcome(chatId: number, lang: Lang) {
  await bot.sendMessage(chatId, t("welcome", lang), {
    parse_mode: "Markdown",
    reply_markup: ikb([
      [{ text: t("startScreening", lang), data: "begin" }],
      [
        { text: t("about", lang), data: "about" },
        { text: t("changeLanguage", lang), data: "lang" },
      ],
    ]),
  });
}

async function sendLanguagePicker(chatId: number) {
  await bot.sendMessage(chatId, t("pickLanguage", "en"), {
    reply_markup: ikb([
      [
        { text: "🇬🇧 English", data: "lang:en" },
        { text: "🇲🇾 Bahasa Malaysia", data: "lang:bm" },
      ],
    ]),
  });
}

async function askPhoto(chatId: number, conv: Conv) {
  conv.state = "await_photo";
  await bot.sendMessage(chatId, t("askPhoto", conv.lang), {
    parse_mode: "Markdown",
  });
}

async function askAge(chatId: number, conv: Conv) {
  conv.state = "await_age";
  await bot.sendMessage(chatId, t("qAge", conv.lang), {
    reply_markup: bandsKb(t("ageBands", conv.lang), "age"),
  });
}

async function askTobacco(chatId: number, conv: Conv) {
  conv.state = "await_tobacco";
  await bot.sendMessage(chatId, t("qTobacco", conv.lang), {
    parse_mode: "Markdown",
    reply_markup: yesNoKb(conv.lang, "tobacco"),
  });
}

async function askAlcohol(chatId: number, conv: Conv) {
  conv.state = "await_alcohol";
  await bot.sendMessage(chatId, t("qAlcohol", conv.lang), {
    reply_markup: yesNoKb(conv.lang, "alcohol"),
  });
}

async function askBetel(chatId: number, conv: Conv) {
  conv.state = "await_betel";
  await bot.sendMessage(chatId, t("qBetel", conv.lang), {
    parse_mode: "Markdown",
    reply_markup: yesNoKb(conv.lang, "betel"),
  });
}

async function askFamily(chatId: number, conv: Conv) {
  conv.state = "await_family";
  await bot.sendMessage(chatId, t("qFamily", conv.lang), {
    parse_mode: "Markdown",
    reply_markup: yesNoKb(conv.lang, "family"),
  });
}

async function askLesion(chatId: number, conv: Conv) {
  conv.state = "await_lesion";
  await bot.sendMessage(chatId, t("qLesion", conv.lang), {
    reply_markup: bandsKb(t("lesionBands", conv.lang), "lesion"),
  });
}

async function askPain(chatId: number, conv: Conv) {
  conv.state = "await_pain";
  await bot.sendMessage(chatId, t("qPain", conv.lang), {
    reply_markup: yesNoKb(conv.lang, "pain"),
  });
}

async function askBleeding(chatId: number, conv: Conv) {
  conv.state = "await_bleeding";
  await bot.sendMessage(chatId, t("qBleeding", conv.lang), {
    reply_markup: yesNoKb(conv.lang, "bleeding"),
  });
}

async function askUlcer(chatId: number, conv: Conv) {
  conv.state = "await_ulcer";
  await bot.sendMessage(chatId, t("qUlcer", conv.lang), {
    reply_markup: yesNoKb(conv.lang, "ulcer"),
  });
}

// Age and lesion-duration mapping from band indices to representative numbers.
const AGE_VALUES = [22, 35, 50, 60, 70];
const LESION_VALUES = [0, 1, 3, 6];

// ─── Run the pipeline ────────────────────────────────────────────────────────

async function runPipeline(chatId: number, conv: Conv) {
  conv.state = "processing";

  const startMsg = await bot.sendMessage(
    chatId,
    `${t("processingHeader", conv.lang)}\n\n` +
      `${conv.lang === "en" ? "🟡 Orchestrator..." : "🟡 Orchestrator..."}`,
    { parse_mode: "Markdown" }
  );
  conv.progressMessageId = startMsg.message_id;

  // Streaming progress: edit the same message as agents tick through.
  const ticks: string[] = [];
  const renderProgress = async (line: string) => {
    ticks.push(line);
    try {
      await bot.editMessageText(
        `${t("processingHeader", conv.lang)}\n\n${ticks.join("\n")}`,
        {
          chat_id: chatId,
          message_id: conv.progressMessageId!,
          parse_mode: "Markdown",
        }
      );
    } catch {
      // Telegram edit can fail if the message content is identical or rate-limited
    }
  };

  try {
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

    const session: ScreeningSession = await runOrchestratorAgent({
      source: "upload",
      imageBase64: conv.photo!.base64,
      imageMimeType: conv.photo!.mimeType,
      fileName: conv.photo!.fileName,
      questionnaire,
      preferredProvider: PROVIDER,
      onStep: (e) => {
        if (e.status === "completed") {
          renderProgress(`✓ ${e.agent}${e.detail ? ` — ${e.detail}` : ""}`);
        } else if (e.status === "skipped") {
          renderProgress(`— ${e.agent} (skipped)`);
        }
      },
    });

    // Finalize the progress message into "all done", then send the report.
    await bot.editMessageText(
      `${t("processingDone", conv.lang)}\n\n${ticks.join("\n")}`,
      {
        chat_id: chatId,
        message_id: conv.progressMessageId!,
        parse_mode: "Markdown",
      }
    ).catch(() => undefined);

    // Patient-facing result
    await bot.sendMessage(chatId, formatResult(session, conv.lang), {
      parse_mode: "MarkdownV2",
    });

    // Agent trace (technical view) for the IDP demo
    await bot.sendMessage(chatId, formatAgentTrace(session, conv.lang), {
      parse_mode: "Markdown",
    });

    // Action buttons
    await bot.sendMessage(
      chatId,
      conv.lang === "en"
        ? "What next?"
        : "Apa seterusnya?",
      {
        reply_markup: ikb([
          [{ text: t("newScreening", conv.lang), data: "restart" }],
          [{ text: t("changeLanguage", conv.lang), data: "lang" }],
        ]),
      }
    );

    conv.state = "done";
  } catch (err) {
    console.error("Pipeline error:", err);
    await bot.sendMessage(chatId, t("processingFailed", conv.lang));
    resetConv(chatId);
  }
}

// ─── Photo download helper ───────────────────────────────────────────────────

async function downloadTelegramPhoto(
  fileId: string
): Promise<{ base64: string; mimeType: string }> {
  const link = await bot.getFileLink(fileId);
  const res = await fetch(link);
  if (!res.ok) throw new Error(`Failed to fetch photo: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Telegram photos are JPEG by default
  return { base64: buf.toString("base64"), mimeType: "image/jpeg" };
}

// ─── Event handlers ──────────────────────────────────────────────────────────

bot.onText(/^\/start/, async (msg) => {
  const chatId = msg.chat.id;
  resetConv(chatId, false);
  const conv = getConv(chatId);
  conv.state = "await_language";
  await sendLanguagePicker(chatId);
});

bot.onText(/^\/cancel/, async (msg) => {
  const chatId = msg.chat.id;
  const conv = getConv(chatId);
  await bot.sendMessage(chatId, t("cancelled", conv.lang));
  resetConv(chatId);
});

bot.onText(/^\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const conv = getConv(chatId);
  await sendWelcome(chatId, conv.lang);
});

// Photo handler
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const conv = getConv(chatId);
  if (conv.state !== "await_photo") {
    await bot.sendMessage(
      chatId,
      conv.lang === "en"
        ? "Thanks for the photo, but I wasn't expecting one right now. Send /start to begin."
        : "Terima kasih, tetapi saya tidak menjangkakan gambar sekarang. Hantar /start untuk mula."
    );
    return;
  }
  const photo = msg.photo?.[msg.photo.length - 1]; // largest size
  if (!photo) {
    await bot.sendMessage(chatId, t("notPhoto", conv.lang), {
      parse_mode: "Markdown",
    });
    return;
  }
  try {
    const dl = await downloadTelegramPhoto(photo.file_id);
    conv.photo = {
      base64: dl.base64,
      mimeType: dl.mimeType,
      fileName: `tg_${photo.file_unique_id}.jpg`,
    };
    await bot.sendMessage(chatId, t("photoReceived", conv.lang));
    await askAge(chatId, conv);
  } catch (err) {
    console.error("Photo download failed:", err);
    await bot.sendMessage(
      chatId,
      conv.lang === "en"
        ? "Couldn't download the photo. Please try again."
        : "Tidak dapat memuat turun gambar. Sila cuba lagi."
    );
  }
});

// Any non-command, non-photo text
bot.on("message", async (msg) => {
  if (msg.photo) return; // handled by 'photo' listener
  if (msg.text?.startsWith("/")) return; // handled by command listeners
  const chatId = msg.chat.id;
  const conv = getConv(chatId);
  if (conv.state === "await_photo") {
    await bot.sendMessage(chatId, t("notPhoto", conv.lang), {
      parse_mode: "Markdown",
    });
    return;
  }
  if (conv.state === "await_language" || conv.state === "idle") {
    await sendLanguagePicker(chatId);
    return;
  }
  await bot.sendMessage(chatId, t("unexpected", conv.lang));
});

// Inline keyboard callbacks
bot.on("callback_query", async (q) => {
  const chatId = q.message?.chat.id;
  const data = q.data;
  if (!chatId || !data) return;
  const conv = getConv(chatId);

  // Acknowledge callback immediately (removes the spinner on the button).
  bot.answerCallbackQuery(q.id).catch(() => undefined);

  // Language selection
  if (data.startsWith("lang:")) {
    const newLang = data.split(":")[1] as Lang;
    conv.lang = newLang === "bm" ? "bm" : "en";
    conv.state = "idle";
    await sendWelcome(chatId, conv.lang);
    return;
  }
  if (data === "lang") {
    await sendLanguagePicker(chatId);
    return;
  }

  if (data === "about") {
    await bot.sendMessage(chatId, t("aboutMessage", conv.lang), {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
    return;
  }

  if (data === "begin") {
    conv.q = {};
    conv.photo = undefined;
    await askPhoto(chatId, conv);
    return;
  }

  if (data === "restart") {
    resetConv(chatId, true);
    const fresh = getConv(chatId);
    fresh.q = {};
    fresh.photo = undefined;
    await askPhoto(chatId, fresh);
    return;
  }

  // Questionnaire answers
  if (data.startsWith("age:")) {
    const idx = parseInt(data.split(":")[1], 10);
    conv.q.age = AGE_VALUES[idx] ?? 30;
    await askTobacco(chatId, conv);
    return;
  }
  if (data.startsWith("tobacco:")) {
    conv.q.tobacco = data.endsWith(":y");
    await askAlcohol(chatId, conv);
    return;
  }
  if (data.startsWith("alcohol:")) {
    conv.q.alcohol = data.endsWith(":y");
    await askBetel(chatId, conv);
    return;
  }
  if (data.startsWith("betel:")) {
    conv.q.betelQuid = data.endsWith(":y");
    await askFamily(chatId, conv);
    return;
  }
  if (data.startsWith("family:")) {
    conv.q.familyHistory = data.endsWith(":y");
    await askLesion(chatId, conv);
    return;
  }
  if (data.startsWith("lesion:")) {
    const idx = parseInt(data.split(":")[1], 10);
    conv.q.lesionDurationWeeks = LESION_VALUES[idx] ?? 0;
    await askPain(chatId, conv);
    return;
  }
  if (data.startsWith("pain:")) {
    conv.q.pain = data.endsWith(":y");
    await askBleeding(chatId, conv);
    return;
  }
  if (data.startsWith("bleeding:")) {
    conv.q.bleeding = data.endsWith(":y");
    await askUlcer(chatId, conv);
    return;
  }
  if (data.startsWith("ulcer:")) {
    conv.q.ulcer = data.endsWith(":y");
    await runPipeline(chatId, conv);
    return;
  }
});

bot.on("polling_error", (err) => {
  console.error("Polling error:", err.message);
});

console.log(
  `🤖 OralScan AI Telegram bot started in polling mode. Provider: ${PROVIDER}.`
);
console.log(`   Open Telegram and message @Idporalbot — try /start.`);
