/**
 * OralScan AI — local Telegram bot (long-poll mode for development).
 *
 * Production on Vercel uses the webhook route (app/api/telegram/webhook).
 * This script shares the SAME conversation handler (lib/telegram/handler.ts),
 * so behaviour is identical. Run with:  npm run bot
 *
 * Requires TELEGRAM_BOT_TOKEN in .env.local. Conversation state uses the KV
 * store (in-memory fallback is fine here since this is a single long-lived
 * process).
 */
import { loadEnvLocal } from "../lib/utils/loadEnvLocal";
loadEnvLocal();

import { TelegramClient } from "../lib/telegram/client";
import { handleTelegramUpdate } from "../lib/telegram/handler";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error(
    "TELEGRAM_BOT_TOKEN is missing. Add it to .env.local — get one from @BotFather."
  );
  process.exit(1);
}

const client = new TelegramClient(token);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Polling and webhook are mutually exclusive — drop any webhook first.
  await client.deleteWebhook().catch(() => undefined);

  console.log(
    `🤖 OralScan AI Telegram bot (polling). Provider: ${process.env.TELEGRAM_BOT_PROVIDER ?? "mock"}.`
  );
  console.log("   Open Telegram and message your bot — try /start.");

  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const updates = await client.getUpdates(offset, 25);
      for (const u of updates) {
        offset = u.update_id + 1;
        try {
          await handleTelegramUpdate(client, u);
        } catch (e) {
          console.error("handler error:", e);
        }
      }
    } catch (e) {
      console.error("poll error:", e instanceof Error ? e.message : e);
      await sleep(2000);
    }
  }
}

main();
