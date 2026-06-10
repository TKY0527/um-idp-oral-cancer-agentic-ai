import { NextResponse } from "next/server";
import { ensureDemoDataSeeded } from "@/lib/server/demoSeed";
import { getCurrentUser } from "@/lib/server/identity";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";

loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/demo/seed — populate the demo patients (Aisyah, Tan, Muthu)
 * with their historical screenings. Idempotent; safe to call repeatedly.
 * Any logged-in user may trigger it (it only creates demo data).
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const seeded = await ensureDemoDataSeeded();
    return NextResponse.json({
      ok: true,
      newlySeeded: seeded,
      message: seeded.length
        ? `Seeded demo data for: ${seeded.join(", ")}`
        : "Demo data already present.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
