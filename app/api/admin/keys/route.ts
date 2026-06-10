import { NextResponse } from "next/server";
import type { ProviderKeys } from "@/lib/types/screening";
import {
  clearAdminKeys,
  getAdminKeys,
  maskKey,
  setAdminKeys,
} from "@/lib/server/adminKeys";
import { getCurrentUser } from "@/lib/server/identity";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";

loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }
  return null;
}

/** GET — masked status of the 3 server-wide keys (never the key material). */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const keys = await getAdminKeys();
  return NextResponse.json({
    adminKeys: {
      openai: { configured: Boolean(keys.openai), preview: maskKey(keys.openai) },
      gemini: { configured: Boolean(keys.gemini), preview: maskKey(keys.gemini) },
      anthropic: {
        configured: Boolean(keys.anthropic),
        preview: maskKey(keys.anthropic),
      },
    },
    envKeys: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    },
  });
}

/** POST — paste keys here. Only non-empty fields overwrite. */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: ProviderKeys;
  try {
    body = (await req.json()) as ProviderKeys;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const next = await setAdminKeys(body);
  return NextResponse.json({
    ok: true,
    adminKeys: {
      openai: { configured: Boolean(next.openai), preview: maskKey(next.openai) },
      gemini: { configured: Boolean(next.gemini), preview: maskKey(next.gemini) },
      anthropic: {
        configured: Boolean(next.anthropic),
        preview: maskKey(next.anthropic),
      },
    },
  });
}

/** DELETE — clear all admin keys (env keys remain as fallback). */
export async function DELETE() {
  const denied = await requireAdmin();
  if (denied) return denied;
  await clearAdminKeys();
  return NextResponse.json({ ok: true });
}
