import { NextResponse } from "next/server";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";

loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/providers/status — which providers have a HIDDEN BACKEND key
 * configured. Returns booleans only (never key material). The UI combines
 * this with the user's pasted demo keys to show, per provider, whether a
 * run would use "your key", the "backend key", or fall back to mock.
 */
export async function GET() {
  return NextResponse.json({
    backendConfigured: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      claude: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      local: Boolean(process.env.LOCAL_MODEL_ENDPOINT),
    },
  });
}
