/**
 * Bilingual string table for the Telegram bot (English + Bahasa Malaysia).
 *
 * Each key is referenced by `t(key, lang, vars?)` in bot.ts. Variables are
 * substituted by simple `{name}` placeholders.
 */
export type Lang = "en" | "bm";

type Strings = Record<string, { en: string; bm: string }>;

export const STRINGS: Strings = {
  // ── Onboarding ──────────────────────────────────────────────────────
  pickLanguage: {
    en: "Please choose your language / Sila pilih bahasa anda:",
    bm: "Please choose your language / Sila pilih bahasa anda:",
  },
  welcome: {
    en:
      "👋 Hi! I'm the *OralScan AI Bot* 🦷\n\n" +
      "I run a hierarchical multi-agent AI pipeline to screen an oral cavity " +
      "photo for signs that may need a dentist visit.\n\n" +
      "⚠️ *This is an educational university project — NOT a medical diagnosis.* " +
      "Always consult a qualified dentist for proper diagnosis.\n\n" +
      "Ready to start?",
    bm:
      "👋 Hai! Saya *OralScan AI Bot* 🦷\n\n" +
      "Saya menggunakan AI pelbagai-agen untuk menyaring gambar rongga mulut " +
      "bagi tanda-tanda yang mungkin memerlukan lawatan ke doktor gigi.\n\n" +
      "⚠️ *Ini adalah projek pendidikan universiti — BUKAN diagnosis perubatan.* " +
      "Sila berjumpa doktor gigi bertauliah untuk diagnosis sebenar.\n\n" +
      "Mula sekarang?",
  },
  startScreening: { en: "▶ Start screening", bm: "▶ Mula saringan" },
  about: { en: "📚 About this bot", bm: "📚 Tentang bot ini" },
  changeLanguage: { en: "🌐 Change language", bm: "🌐 Tukar bahasa" },

  aboutMessage: {
    en:
      "*OralScan AI* is a university IDP prototype:\n\n" +
      "• 10 specialised AI agents (Orchestrator + Toothbrush IoT + Vision + Risk Scoring + Patient + Clinician + Consensus + RAG + Triage + Chat)\n" +
      "• Risk weights calibrated from IARC monographs, INHANCE consortium, NCCN guidelines (see GitHub for full methodology)\n" +
      "• Uses Gemini Vision API for image analysis\n" +
      "• All sessions are local — nothing is stored on a server\n\n" +
      "GitHub: github.com/TKY0527/um-idp-oral-cancer-agentic-ai",
    bm:
      "*OralScan AI* ialah prototaip IDP universiti:\n\n" +
      "• 10 ejen AI khusus (Orchestrator + Toothbrush IoT + Vision + Risk Scoring + Patient + Clinician + Consensus + RAG + Triage + Chat)\n" +
      "• Pemberat risiko ditentukur dari monograf IARC, konsortium INHANCE, garis panduan NCCN (lihat GitHub untuk metodologi penuh)\n" +
      "• Menggunakan Gemini Vision API untuk analisis imej\n" +
      "• Semua sesi disimpan secara setempat — tiada apa-apa disimpan di pelayan\n\n" +
      "GitHub: github.com/TKY0527/um-idp-oral-cancer-agentic-ai",
  },

  // ── Photo step ──────────────────────────────────────────────────────
  askPhoto: {
    en:
      "📸 *Send a photo of inside your mouth*\n\n" +
      "Tips:\n" +
      "• Open your mouth wide\n" +
      "• Use good lighting (turn on flash if needed)\n" +
      "• Centre the area you want checked\n\n" +
      "Or send /cancel to stop.",
    bm:
      "📸 *Hantar gambar bahagian dalam mulut anda*\n\n" +
      "Petua:\n" +
      "• Buka mulut luas\n" +
      "• Gunakan pencahayaan yang cukup (hidupkan lampu jika perlu)\n" +
      "• Letak kawasan yang ingin diperiksa di tengah\n\n" +
      "Atau hantar /cancel untuk berhenti.",
  },
  photoReceived: {
    en: "✅ Photo received. Now a few quick questions (about 1 minute).",
    bm: "✅ Gambar diterima. Sekarang beberapa soalan ringkas (~1 minit).",
  },
  notPhoto: {
    en: "Please send a *photo*, not text. Or send /cancel.",
    bm: "Sila hantar *gambar*, bukan teks. Atau hantar /cancel.",
  },

  // ── Questionnaire ───────────────────────────────────────────────────
  qAge: { en: "1️⃣ What is your age group?", bm: "1️⃣ Apakah kumpulan umur anda?" },
  ageBands: {
    en: "Under 25|25–44|45–54|55–64|65+",
    bm: "Bawah 25|25–44|45–54|55–64|65+",
  },
  qTobacco: {
    en: "2️⃣ Do you use tobacco?\n_(cigarettes, cigars, pipe, chewing tobacco)_",
    bm: "2️⃣ Adakah anda menggunakan tembakau?\n_(rokok, cerut, paip, tembakau kunyah)_",
  },
  qAlcohol: {
    en: "3️⃣ Do you drink alcohol regularly?",
    bm: "3️⃣ Adakah anda kerap minum alkohol?",
  },
  qBetel: {
    en: "4️⃣ Do you chew betel quid / areca nut?\n_(sirih, pinang, paan)_",
    bm: "4️⃣ Adakah anda mengunyah sirih / pinang?\n_(betel quid, paan)_",
  },
  qFamily: {
    en: "5️⃣ Family history of oral cancer?\n_(parent, sibling, or child)_",
    bm: "5️⃣ Sejarah keluarga kanser mulut?\n_(ibu bapa, adik-beradik, atau anak)_",
  },
  qLesion: {
    en: "6️⃣ How long has the lesion / sore been present?",
    bm: "6️⃣ Berapa lama lesi / luka telah hadir?",
  },
  lesionBands: {
    en: "None|< 2 weeks|2–4 weeks|> 4 weeks",
    bm: "Tiada|< 2 minggu|2–4 minggu|> 4 minggu",
  },
  qPain: { en: "7️⃣ Any pain in your mouth?", bm: "7️⃣ Sakit di mulut?" },
  qBleeding: {
    en: "8️⃣ Any bleeding from a sore or lesion?",
    bm: "8️⃣ Pendarahan dari luka atau lesi?",
  },
  qUlcer: {
    en: "9️⃣ Is there an ulcer / open sore in your mouth right now?",
    bm: "9️⃣ Adakah terdapat ulser / luka terbuka di dalam mulut sekarang?",
  },
  yes: { en: "✅ Yes", bm: "✅ Ya" },
  no: { en: "❌ No", bm: "❌ Tidak" },

  // ── Processing ──────────────────────────────────────────────────────
  processingHeader: {
    en: "⏳ Running agentic AI pipeline…",
    bm: "⏳ Memproses pipeline AI ejen…",
  },
  processingDone: {
    en: "✅ All agents finished. Preparing your report…",
    bm: "✅ Semua ejen selesai. Menyediakan laporan anda…",
  },
  processingFailed: {
    en: "❌ Something went wrong. Please try /start again, or use the website fallback.",
    bm: "❌ Ada masalah. Sila /start semula, atau gunakan laman web sebagai alternatif.",
  },

  // ── Result ──────────────────────────────────────────────────────────
  resultHeader: { en: "📋 *Screening result*", bm: "📋 *Keputusan saringan*" },
  riskLow: { en: "🟢 Low risk", bm: "🟢 Risiko rendah" },
  riskMedium: { en: "🟡 Medium risk", bm: "🟡 Risiko sederhana" },
  riskHigh: { en: "🔴 High risk", bm: "🔴 Risiko tinggi" },
  scoreLine: { en: "Score: *{score}/100*", bm: "Skor: *{score}/100*" },
  findingLine: { en: "👁️ Visual finding: *{finding}*", bm: "👁️ Penemuan visual: *{finding}*" },
  regionLine: { en: "📍 Region: *{region}*", bm: "📍 Kawasan: *{region}*" },
  driversHeader: { en: "Top risk drivers:", bm: "Pemacu risiko utama:" },
  patientHeadlineLabel: { en: "💬 What this means:", bm: "💬 Maksudnya:" },
  nextStepLabel: { en: "▶ Recommended next step:", bm: "▶ Langkah seterusnya:" },
  disclaimer: {
    en:
      "⚠️ *This prototype is not a medical diagnosis.* It is an educational " +
      "oral cancer screening demonstration. Please consult a qualified " +
      "dentist or doctor for proper diagnosis.",
    bm:
      "⚠️ *Prototaip ini bukan diagnosis perubatan.* Ia adalah demonstrasi " +
      "saringan kanser mulut untuk tujuan pendidikan sahaja. Sila berjumpa " +
      "doktor gigi bertauliah untuk diagnosis sebenar.",
  },
  newScreening: { en: "🔄 New screening", bm: "🔄 Saringan baru" },

  // ── Multi-Expert Panel ───────────────────────────────────────────────
  panelHeader: {
    en: "🧑‍⚕️ *Multi-Expert Panel Verdict*",
    bm: "🧑‍⚕️ *Keputusan Panel Pakar*",
  },
  panelConsensusAgreement: {
    en: "Strong agreement",
    bm: "Persetujuan kuat",
  },
  panelConsensusMajority: { en: "Majority view", bm: "Pandangan majoriti" },
  panelConsensusSplit: { en: "Panel split", bm: "Panel berbelah bahagi" },
  panelEscalate: {
    en: "⬆️ Escalation suggested — panel calls for urgent specialist review",
    bm: "⬆️ Naik taraf disyorkan — panel mahukan semakan pakar segera",
  },
  panelKeep: {
    en: "≈ Panel aligned with the rule-based risk band",
    bm: "≈ Panel sejajar dengan band risiko",
  },
  panelDowngrade: {
    en: "⬇️ Panel suggests the risk band may be over-stated",
    bm: "⬇️ Panel mencadangkan band risiko mungkin terlalu tinggi",
  },

  // ── Cancel / errors ─────────────────────────────────────────────────
  cancelled: {
    en: "Cancelled. Send /start to begin again.",
    bm: "Dibatalkan. Hantar /start untuk mula semula.",
  },
  unexpected: {
    en: "I didn't understand that. Use the buttons or send /start.",
    bm: "Saya tidak faham itu. Gunakan butang atau hantar /start.",
  },
};

export function t(
  key: keyof typeof STRINGS,
  lang: Lang,
  vars?: Record<string, string | number>
): string {
  const entry = STRINGS[key];
  let s = entry[lang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}
