import { NextResponse } from "next/server";
import { getCurrentUser, webPatientId } from "@/lib/server/identity";
import { getSession } from "@/lib/server/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/sessions/[id] — doctor sees any; patient sees only their own. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (user.role !== "doctor" && session.ownerId !== webPatientId(user.username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ session });
}
