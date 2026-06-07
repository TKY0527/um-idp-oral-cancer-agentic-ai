import { NextResponse } from "next/server";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";
import { TelegramClient, type TgUpdate } from "@/lib/telegram/client";
import { handleTelegramUpdate } from "@/lib/telegram/handler";
import { kvSetNx } from "@/lib/server/kv";

loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The agentic pipeline (Gemini/Claude) can take >10s; allow up to 60s.
export const maxDuration = 60;

/**
 * Telegram webhook endpoint.
 *
 * Set it once after deploy:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<app>.vercel.app/api/telegram/webhook&secret_token=<SECRET>
 * (or run `npm run bot:webhook` — see scripts/telegramWebhook.ts)
 *
 * Telegram includes the secret in the `X-Telegram-Bot-Api-Secret-Token` header
 * which we verify against TELEGRAM_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "bot not configured" }, { status: 200 });
  }

  // Verify secret (if configured).
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true }); // ignore malformed
  }

  // Idempotency: Telegram retries on slow responses. Use an ATOMIC SET NX so
  // two concurrent invocations of the same update_id can't both pass the guard
  // (closes the check-then-set TOCTOU race). Keys expire after 1h.
  try {
    const fresh = await kvSetNx(`tgupd:${update.update_id}`, 1, 3600);
    if (!fresh) {
      return NextResponse.json({ ok: true }); // already processed
    }
  } catch {
    /* if KV unavailable, proceed (best-effort) */
  }

  const client = new TelegramClient(token);
  try {
    await handleTelegramUpdate(client, update);
  } catch (err) {
    console.error("[telegram webhook] handler error:", err);
  }
  // Always 200 so Telegram doesn't hammer retries.
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    name: "OralScan AI Telegram webhook",
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  });
}
