# 🧪 Teammate Testing Guide — OralScan AI

A step-by-step guide for teammates to test the live app. **No installation or
API keys needed** to test the deployed version — just a browser (and optionally
Telegram on your phone).

> ⚠️ Educational university prototype — **not a medical device**. Use the
> built-in sample cases or any non-sensitive photo. Do not upload real patient
> data.

---

## 🔗 Live app

**https://um-idp-oral-cancer-agentic-ai.vercel.app**

## 🔑 Test accounts (tap the buttons on the login page)

| Username | Password | Role | Use it to test |
|----------|----------|------|----------------|
| **test1** | **test1** | Patient | 👈 **Your shared teammate account** |
| patient1 | patient1 | Patient | Another patient |
| patient2 | patient2 | Patient | Patient data isolation |
| doctor | doctor | Doctor | The clinician dashboard |

On the login screen there are one-tap buttons for each — you don't have to type.

---

## ✅ Test 1 — Patient screening (5 min)

1. Open the link → click **🧪 Test User** (logs in as `test1`).
2. (Optional) Top of the sidebar: switch **EN | BM** to see Bahasa Malaysia.
3. Click **New Screening**.
4. Pick a **sample case** (e.g. *Case 3 — White Patch*) **or** upload/take a photo.
5. Fill the short questionnaire (each field has a plain-English hint).
6. Click **▶ Run Agentic AI Screening** → watch the animated multi-agent pipeline.
7. Review the result:
   - Risk score Low / Medium / High
   - **Multi-Expert Panel** (Claude + Gemini opinions) — on Medium/High cases
   - **🪥 Dental Wellness card** — cavities (蛀牙), gum, plaque, hygiene score
   - Patient-friendly report + next step
8. Open **My Reports** → upload any image/PDF (under 650 KB) as a "previous report".
9. Open **Message Doctor** → send a test message.

## ✅ Test 2 — Doctor dashboard (3 min)

1. Sign out (bottom of sidebar) → log in as **🩺 Dr. Lim** (`doctor`).
2. **Triage Queue** — see every patient's screening (incl. yours as `test1`), sorted by urgency, auto-refreshing.
3. Click **Review →** on a session → read the full agent reasoning, write a clinical note, **Save**.
4. **Patients** tab → click a patient → see their full history, **uploaded reports**, and a **chat** to message them back.
5. **Analytics** tab → cohort charts.

## ✅ Test 3 — Telegram bot (3 min, on your phone)

1. Open Telegram → search **@Idporalbot** (or t.me/Idporalbot).
2. Send `/start` → choose **English** or **Bahasa Malaysia**.
3. Tap **Start screening** → send a photo of a mouth (any test photo) → answer the 9 buttons.
4. You'll get a bilingual screening report + agent trace.
5. Back in the web app as **doctor** → the Telegram screening appears in the queue labelled **"Telegram: <your name>"**.

---

## 🧩 What to look for / give feedback on

- Is anything confusing or unclear?
- Does the BM (Bahasa Malaysia) translation read naturally?
- Is the result easy to understand for a non-technical patient?
- Any layout issues on your phone?
- Anything that feels slow or broken?

---

## 🛠️ (Advanced, optional) Run it locally with YOUR OWN API keys

Only needed if you want to develop/run your own copy. The live app already works
without this.

### Prerequisites
- Node.js 18+ and Git

### Steps
```bash
git clone https://github.com/TKY0527/um-idp-oral-cancer-agentic-ai.git
cd um-idp-oral-cancer-agentic-ai
npm install
cp .env.example .env.local      # then edit .env.local
npm run dev                     # http://localhost:3000
```

### Use your own keys in `.env.local`
The app works in **mock mode with no keys**. To use real AI / your own bot, fill in:

```env
# Your own Gemini key — https://aistudio.google.com/apikey
GEMINI_API_KEY=YOUR_GEMINI_KEY
GEMINI_MODEL=gemini-3.5-flash

# Your own Claude key (optional) — https://console.anthropic.com
ANTHROPIC_API_KEY=YOUR_CLAUDE_KEY
CLAUDE_MODEL=claude-opus-4-7

# Your own Telegram bot — create one with @BotFather, then:
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_BOT_PROVIDER=gemini

# Any long random string
AUTH_SECRET=any-random-string
```

### Run your own Telegram bot locally
```bash
npm run bot     # long-polling mode — no public URL needed
```
Then message YOUR bot on Telegram. (For production webhook mode, see the README.)

> Local mode without an Upstash/KV database uses an in-memory store — fine for
> solo testing, but data won't persist across restarts. To get cross-device
> doctor-sees-all, add the Upstash KV env vars (see README → Deploy on Vercel).

---

## 📚 More docs
- Project report: [`docs/PROJECT_REPORT.md`](PROJECT_REPORT.md)
- Methodology + citations: [`docs/METHODOLOGY.md`](METHODOLOGY.md)
- Main README: [`../README.md`](../README.md)
