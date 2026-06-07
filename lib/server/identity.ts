import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  payloadToUser,
  verifySessionToken,
  type AppUser,
} from "@/lib/server/authShared";

/**
 * Read the current authenticated user inside a Node route handler.
 * Returns null when no valid session cookie is present.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);
  return payload ? payloadToUser(payload) : null;
}

/** Stable patient id derived from a username (web accounts). */
export function webPatientId(username: string): string {
  return `web:${username.toLowerCase()}`;
}
