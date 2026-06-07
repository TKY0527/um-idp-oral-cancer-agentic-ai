// Web UI bilingual dictionary (English + Bahasa Malaysia).
// Keep keys grouped by surface. Missing BM falls back to EN at runtime.

export type Lang = "en" | "bm";

export const DICT = {
  // ── Common ──
  "common.signIn": { en: "Sign in", bm: "Log masuk" },
  "common.signOut": { en: "Sign out", bm: "Log keluar" },
  "common.language": { en: "Language", bm: "Bahasa" },
  "common.patient": { en: "Patient", bm: "Pesakit" },
  "common.doctor": { en: "Doctor", bm: "Doktor" },
  "common.clinician": { en: "Clinician", bm: "Klinikal" },
  "common.disclaimer": {
    en: "This prototype is not a medical diagnosis. It is an educational oral health screening demonstration. Please consult a qualified dentist or doctor for proper diagnosis.",
    bm: "Prototaip ini bukan diagnosis perubatan. Ia adalah demonstrasi saringan kesihatan mulut untuk tujuan pendidikan. Sila berjumpa doktor gigi atau doktor bertauliah untuk diagnosis sebenar.",
  },
  "common.notDevice": {
    en: "Educational prototype — not a medical device",
    bm: "Prototaip pendidikan — bukan peranti perubatan",
  },

  // ── Nav (patient) ──
  "nav.overview": { en: "Overview", bm: "Ringkasan" },
  "nav.newScreening": { en: "New Screening", bm: "Saringan Baru" },
  "nav.history": { en: "History", bm: "Sejarah" },
  "nav.assistant": { en: "AI Assistant", bm: "Pembantu AI" },
  "nav.messageDoctor": { en: "Message Doctor", bm: "Mesej Doktor" },
  "nav.documents": { en: "My Reports", bm: "Laporan Saya" },
  // ── Nav (doctor) ──
  "nav.triage": { en: "Triage Queue", bm: "Giliran Triage" },
  "nav.patients": { en: "Patients", bm: "Pesakit" },
  "nav.analytics": { en: "Analytics", bm: "Analitik" },

  // ── Landing ──
  "landing.tagline": {
    en: "Smart Toothbrush IoT · Hierarchical Multi-Agent System",
    bm: "IoT Berus Gigi Pintar · Sistem Pelbagai-Ejen Berhierarki",
  },
  "landing.h1a": { en: "Agentic AI for", bm: "AI Ejen untuk" },
  "landing.h1b": { en: "oral health screening", bm: "saringan kesihatan mulut" },
  "landing.sub": {
    en: "Specialised agents collaborate on every screening — Vision, Toothbrush IoT telemetry, Risk Scoring, Multi-Expert Panel, RAG-grounded explanation, and Triage. Patient and clinician each get their own dashboard.",
    bm: "Ejen khusus bekerjasama dalam setiap saringan — Penglihatan, telemetri IoT Berus Gigi, Pemarkahan Risiko, Panel Pelbagai-Pakar, penjelasan berasaskan RAG, dan Triage. Pesakit dan klinik masing-masing mempunyai papan pemuka sendiri.",
  },
  "landing.patientCardDesc": {
    en: "Run a screening with your camera or a sample case. View your risk trend over time. Chat with the AI assistant about what your result means.",
    bm: "Jalankan saringan dengan kamera atau kes contoh. Lihat trend risiko anda dari masa ke masa. Berbual dengan pembantu AI tentang maksud keputusan anda.",
  },
  "landing.doctorCardDesc": {
    en: "Review every patient's screenings in a triage queue, see the full agent reasoning, message patients, and track cohort analytics.",
    bm: "Semak saringan setiap pesakit dalam giliran triage, lihat penaakulan ejen penuh, mesej pesakit, dan jejak analitik kohort.",
  },

  // ── Login ──
  "login.subtitle": {
    en: "Agentic oral health screening · sign in to continue",
    bm: "Saringan kesihatan mulut berasaskan ejen · log masuk untuk teruskan",
  },
  "login.quick": { en: "Quick demo accounts", bm: "Akaun demo pantas" },
  "login.manual": { en: "Or sign in manually", bm: "Atau log masuk secara manual" },
  "login.username": { en: "Username", bm: "Nama pengguna" },
  "login.password": { en: "Password", bm: "Kata laluan" },

  // ── Patient overview ──
  "patient.welcome": { en: "Welcome back 👋", bm: "Selamat kembali 👋" },
  "patient.welcomeNew": { en: "Welcome! 👋", bm: "Selamat datang! 👋" },
  "patient.trackLine": {
    en: "Track your oral health over time. Your data is saved to your account.",
    bm: "Jejak kesihatan mulut anda dari masa ke masa. Data anda disimpan ke akaun anda.",
  },
  "patient.startFirst": { en: "Start your first screening →", bm: "Mula saringan pertama anda →" },
  "patient.totalScreenings": { en: "Total screenings", bm: "Jumlah saringan" },
  "patient.lowRisk": { en: "Low risk", bm: "Risiko rendah" },
  "patient.mediumRisk": { en: "Medium risk", bm: "Risiko sederhana" },
  "patient.highRisk": { en: "High risk", bm: "Risiko tinggi" },

  // ── Screening steps ──
  "scr.step1": { en: "Provide an oral cavity image", bm: "Sediakan imej rongga mulut" },
  "scr.step2": { en: "Health questionnaire", bm: "Soal selidik kesihatan" },
  "scr.step3": { en: "Run agentic AI screening", bm: "Jalankan saringan AI ejen" },
  "scr.run": { en: "Run Agentic AI Screening", bm: "Jalankan Saringan AI Ejen" },
  "scr.running": { en: "Running pipeline…", bm: "Memproses pipeline…" },

  // ── Doctor queue ──
  "doc.queueTitle": { en: "Oral health triage queue", bm: "Giliran triage kesihatan mulut" },
  "doc.queueSub": {
    en: "Sessions prioritized by the Triage Agent. Highest urgency at top by default.",
    bm: "Sesi diutamakan oleh Ejen Triage. Keutamaan tertinggi di atas secara lalai.",
  },
  "doc.totalSessions": { en: "Total sessions", bm: "Jumlah sesi" },
  "doc.unreviewed": { en: "Unreviewed", bm: "Belum disemak" },
  "doc.review": { en: "Review →", bm: "Semak →" },
} as const;

export type DictKey = keyof typeof DICT;
