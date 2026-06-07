import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/identity";
import { setReview } from "@/lib/server/repository";
import type { ClinicianReview } from "@/lib/types/screening";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/sessions/[id]/review — doctor only. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor") {
    return NextResponse.json(
      { error: "Only a clinician can submit a review" },
      { status: 403 }
    );
  }
  const { id } = await params;
  let review: ClinicianReview;
  try {
    const body = (await req.json()) as { review?: ClinicianReview };
    if (!body.review) throw new Error("missing review");
    review = body.review;
  } catch {
    return NextResponse.json({ error: "Invalid review body" }, { status: 400 });
  }
  const updated = await setReview(id, review);
  if (!updated) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, session: updated });
}
