import { NextResponse } from "next/server";
import { getAdminKeys } from "@/lib/server/adminKeys";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";

loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/providers/status — which providers have a server-side key
 * configured (admin-pasted key at /admin OR backend env key). Returns
 * booleans only (never key material). The UI combines this with the
 * user's pasted demo keys to show, per provider, whether a run would use
 * "your key", a "backend key", or fall back to mock.
 */
export async function GET() {
  const admin = await getAdminKeys().catch(() => ({}) as Record<string, never>);
  return NextResponse.json({
    backendConfigured: {
      gemini: Boolean(admin.gemini || process.env.GEMINI_API_KEY),
      claude: Boolean(admin.anthropic || process.env.ANTHROPIC_API_KEY),
      openai: Boolean(admin.openai || process.env.OPENAI_API_KEY),
      local: Boolean(process.env.LOCAL_MODEL_ENDPOINT),
    },
  });
}
