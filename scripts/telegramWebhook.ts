/**
 * Register or delete the Telegram webhook.
 *
 *   npm run bot:webhook:set      # point Telegram at your deployed app
 *   npm run bot:webhook:delete   # remove webhook (e.g. to use local polling)
 *
 * Reads from .env.local:
 *   TELEGRAM_BOT_TOKEN       (required)
 *   PUBLIC_BASE_URL          (required for set — e.g. https://your-app.vercel.app)
 *   TELEGRAM_WEBHOOK_SECRET  (optional but recommended)
 */
import { loadEnvLocal } from "../lib/utils/loadEnvLocal";
loadEnvLocal();

import { TelegramClient } from "../lib/telegram/client";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN missing in .env.local");
    process.exit(1);
  }
  const action = process.argv[2] ?? "set";
  const client = new TelegramClient(token);

  if (action === "delete") {
    await client.deleteWebhook();
    console.log("✅ Webhook deleted. You can now run `npm run bot` (polling).");
    return;
  }

  const base = process.env.PUBLIC_BASE_URL;
  if (!base) {
    console.error(
      "PUBLIC_BASE_URL missing. Set it to your deployed URL, e.g.\n  PUBLIC_BASE_URL=https://your-app.vercel.app"
    );
    process.exit(1);
  }
  const url = `${base.replace(/\/$/, "")}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  await client.setWebhook(url, secret);
  console.log(`✅ Webhook set to ${url}`);
  if (secret) console.log("   Secret token enabled.");
  else console.log("   (No TELEGRAM_WEBHOOK_SECRET set — recommended to add one.)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
