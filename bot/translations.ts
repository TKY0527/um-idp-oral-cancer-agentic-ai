/**
 * Bilingual string table for the Telegram bot (English + Bahasa Malaysia).
 *
 * Each key is referenced by `t(key, lang, vars?)` in the handler. Variables
 * are substituted by simple `{name}` placeholders.
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
      "📸 *Just send a photo of the inside of a mouth — that's it.*\n" +
      "No questions, no buttons. I instantly run the full agentic AI pipeline " +
      "doing TWO things on the same picture:\n" +
      "1️⃣ Oral cancer screening cues\n" +
      "2️⃣ Tooth health (cavities, gums, plaque, staining)\n\n" +
      "🧪 The screening uses the *active demo patient's* profile (history, " +
      "habits, toothbrush data):\n{patient}\n\n" +
      "Commands:\n" +
      "• /changepatient (or /anotherpatient) — switch to the next demo patient\n" +
      "• /language — change language\n" +
      "• /help — show this message\n\n" +
      "⚠️ *This is an educational university project — NOT a medical diagnosis.*",
    bm:
      "👋 Hai! Saya *OralScan AI Bot* 🦷\n\n" +
      "📸 *Hantar sahaja gambar bahagian dalam mulut — itu sahaja.*\n" +
      "Tiada soalan, tiada butang. Saya terus menjalankan pipeline AI ejen " +
      "penuh yang membuat DUA perkara pada gambar yang sama:\n" +
      "1️⃣ Tanda saringan kanser mulut\n" +
      "2️⃣ Kesihatan gigi (gigi berlubang, gusi, plak, kotoran)\n\n" +
      "🧪 Saringan menggunakan profil *pesakit demo aktif* (sejarah, tabiat, " +
      "data berus gigi):\n{patient}\n\n" +
      "Arahan:\n" +
      "• /changepatient (atau /anotherpatient) — tukar pesakit demo\n" +
      "• /language — tukar bahasa\n" +
      "• /help — papar mesej ini\n\n" +
      "⚠️ *Ini projek pendidikan universiti — BUKAN diagnosis perubatan.*",
  },
  about: { en: "📚 About this bot", bm: "📚 Tentang bot ini" },
  changeLanguage: { en: "🌐 Change language", bm: "🌐 Tukar bahasa" },

  aboutMessage: {
    en:
      "*OralScan AI* is a university IDP prototype:\n\n" +
      "• Hierarchical multi-agent AI pipeline (Orchestrator + Toothbrush IoT + Vision + Risk Scoring + Dental Wellness + Patient + Clinician + Consensus + RAG + Triage + Chat)\n" +
      "• ONE photo → TWO functions: oral-cancer cues AND tooth health\n" +
      "• Works with Gemini, Claude, or ChatGPT vision APIs\n" +
      "• Risk weights calibrated from IARC monographs, INHANCE consortium, NCCN guidelines\n" +
      "• Your screening is shared with the reviewing clinician's dashboard\n\n" +
      "GitHub: github.com/TKY0527/um-idp-oral-cancer-agentic-ai",
    bm:
      "*OralScan AI* ialah prototaip IDP universiti:\n\n" +
      "• Pipeline AI pelbagai-agen berhierarki (Orchestrator + Toothbrush IoT + Vision + Risk Scoring + Dental Wellness + Patient + Clinician + Consensus + RAG + Triage + Chat)\n" +
      "• SATU gambar → DUA fungsi: tanda kanser mulut DAN kesihatan gigi\n" +
      "• Berfungsi dengan API Gemini, Claude, atau ChatGPT\n" +
      "• Pemberat risiko ditentukur dari monograf IARC, konsortium INHANCE, garis panduan NCCN\n" +
      "• Saringan anda dikongsi dengan papan pemuka doktor yang menyemak\n\n" +
      "GitHub: github.com/TKY0527/um-idp-oral-cancer-agentic-ai",
  },

  // ── Demo patient ────────────────────────────────────────────────────
  activePatientHeader: {
    en: "👤 *Active demo patient*",
    bm: "👤 *Pesakit demo aktif*",
  },
  switchedPatient: {
    en: "🔄 Switched! Now screening as:\n\n{card}",
    bm: "🔄 Ditukar! Kini menyaring sebagai:\n\n{card}",
  },
  patientCard: {
    en:
      "{avatar} *{name}*\n" +
      "Age {age} · {race} · {sex}\n" +
      "Habits: {habits}\n" +
      "🪥 Brushes {times}×/day at {brushTimes} (avg {duration}s)\n" +
      "🧾 Last scaling: {scalingMonths} month(s) ago · {checkup}\n" +
      "🦷 {condition}",
    bm:
      "{avatar} *{name}*\n" +
      "Umur {age} · {race} · {sex}\n" +
      "Tabiat: {habits}\n" +
      "🪥 Berus {times}×/sehari pada {brushTimes} (purata {duration}s)\n" +
      "🧾 Cuci gigi terakhir: {scalingMonths} bulan lalu · {checkup}\n" +
      "🦷 {condition}",
  },
  usingPatientLine: {
    en: "👤 Demo patient: {name} — send /anotherpatient to switch",
    bm: "👤 Pesakit demo: {name} — hantar /anotherpatient untuk tukar",
  },
  noHabits: { en: "no major risk habits", bm: "tiada tabiat risiko utama" },

  // ── Photo / flow ────────────────────────────────────────────────────
  notPhoto: {
    en:
      "📸 Just send a *photo* of the inside of a mouth and I'll analyse it " +
      "instantly — no questions asked.\n\n/anotherpatient switches the demo " +
      "patient, /help shows more.",
    bm:
      "📸 Hantar sahaja *gambar* bahagian dalam mulut dan saya akan analisis " +
      "serta-merta — tiada soalan.\n\n/anotherpatient untuk tukar pesakit demo, " +
      "/help untuk maklumat lanjut.",
  },

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
    en: "❌ Something went wrong. Please send the photo again, or use the website fallback.",
    bm: "❌ Ada masalah. Sila hantar gambar semula, atau gunakan laman web sebagai alternatif.",
  },

  // ── Result: function 1 (oral cancer screening) ──────────────────────
  resultHeader: {
    en: "📋 *Screening result — Function 1: oral cancer cues*",
    bm: "📋 *Keputusan saringan — Fungsi 1: tanda kanser mulut*",
  },
  riskLow: { en: "🟢 Low risk", bm: "🟢 Risiko rendah" },
  riskMedium: { en: "🟡 Medium risk", bm: "🟡 Risiko sederhana" },
  riskHigh: { en: "🔴 High risk", bm: "🔴 Risiko tinggi" },
  scoreLine: { en: "Score: *{score}/100*", bm: "Skor: *{score}/100*" },
  findingLine: { en: "👁️ Visual finding: *{finding}*", bm: "👁️ Penemuan visual: *{finding}*" },
  regionLine: { en: "📍 Region: *{region}*", bm: "📍 Kawasan: *{region}*" },
  driversHeader: { en: "Top risk drivers:", bm: "Pemacu risiko utama:" },
  patientHeadlineLabel: { en: "💬 What this means:", bm: "💬 Maksudnya:" },
  nextStepLabel: { en: "▶ Recommended next step:", bm: "▶ Langkah seterusnya:" },

  // ── Result: function 2 (tooth health, same picture) ─────────────────
  dentalHeader: {
    en: "🦷 *Function 2: tooth health (same picture)*",
    bm: "🦷 *Fungsi 2: kesihatan gigi (gambar yang sama)*",
  },
  hygieneLine: {
    en: "🧼 Hygiene score: *{score}/100*",
    bm: "🧼 Skor kebersihan: *{score}/100*",
  },
  cavityLine: { en: "🕳️ Cavity risk: *{value}*", bm: "🕳️ Risiko gigi berlubang: *{value}*" },
  gumLine: { en: "🌸 Gums: *{value}*", bm: "🌸 Gusi: *{value}*" },
  plaqueLine: { en: "🧫 Plaque: *{value}*", bm: "🧫 Plak: *{value}*" },
  stainingLine: { en: "☕ Staining: *{value}*", bm: "☕ Kotoran/warna: *{value}*" },
  scalingNeedLine: {
    en: "🪥 Scaling (cleaning)? *{value}*",
    bm: "🪥 Perlu cuci gigi? *{value}*",
  },
  scalingSoon: { en: "yes — book soon", bm: "ya — tempah segera" },
  scalingRoutine: { en: "routine cleaning due", bm: "cucian rutin perlu" },
  scalingNotNeeded: { en: "not needed yet", bm: "belum perlu" },
  dentalTipsHeader: { en: "Tips:", bm: "Petua:" },

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
  sendAnotherHint: {
    en: "📷 Send another photo anytime · /anotherpatient to switch demo patient",
    bm: "📷 Hantar gambar lain bila-bila masa · /anotherpatient untuk tukar pesakit demo",
  },

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

  // ── Misc ─────────────────────────────────────────────────────────────
  unexpected: {
    en: "Just send a photo to screen, or /help for the commands.",
    bm: "Hantar sahaja gambar untuk saringan, atau /help untuk arahan.",
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
