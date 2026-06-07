import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/server/authShared";

/**
 * Route protection (Edge runtime).
 *
 *   /patient/*  → any logged-in user (patient or doctor)
 *   /doctor/*   → doctor role only
 *
 * Unauthenticated users are redirected to /login?next=<path>.
 * A logged-in user hitting /login is bounced to their home dashboard.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  // Already logged in but visiting /login → go to dashboard.
  if (pathname === "/login" && session) {
    const url = req.nextUrl.clone();
    url.pathname = session.r === "doctor" ? "/doctor" : "/patient";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const needsPatient = pathname.startsWith("/patient");
  const needsDoctor = pathname.startsWith("/doctor");

  if (!needsPatient && !needsDoctor) {
    return NextResponse.next();
  }

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Doctor-only area.
  if (needsDoctor && session.r !== "doctor") {
    const url = req.nextUrl.clone();
    url.pathname = "/patient";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/patient/:path*", "/doctor/:path*", "/login"],
};
