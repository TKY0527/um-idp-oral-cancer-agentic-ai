import { NextResponse } from "next/server";
import { getCurrentUser, webPatientId } from "@/lib/server/identity";
import {
  listAllSessions,
  listSessionsForPatient,
  saveSession,
} from "@/lib/server/repository";
import type { ScreeningSession } from "@/lib/types/screening";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sessions
 *   - doctor  → every session across all patients & channels
 *   - patient → only their own sessions
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const sessions =
      user.role === "doctor"
        ? await listAllSessions()
        : await listSessionsForPatient(webPatientId(user.username));
    return NextResponse.json({ sessions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/sessions  — persist a screening the current patient just ran.
 * Doctors may also post (e.g. running a demo screening); it is stored under
 * their own account.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let session: ScreeningSession;
  try {
    const body = (await req.json()) as { session?: ScreeningSession };
    if (!body.session?.sessionId) throw new Error("missing session");
    session = body.session;
  } catch {
    return NextResponse.json({ error: "Invalid session body" }, { status: 400 });
  }

  try {
    await saveSession(session, {
      patientId: webPatientId(user.username),
      label: user.displayName,
      channel: "web",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
