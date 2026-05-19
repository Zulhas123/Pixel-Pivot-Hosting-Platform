import { cookies, headers } from "next/headers";
import { verifySessionToken } from "@/lib/jwt";

export const SESSION_COOKIE_NAME = "pp_session";

export async function getClientIp() {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return hdrs.get("x-real-ip") ?? "unknown";
}

export async function getSessionOrNull() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSessionOrNull();
  if (!session) {
    return { ok: false as const, error: "UNAUTHORIZED" as const };
  }
  return { ok: true as const, session };
}

export async function requireAdmin() {
  const result = await requireSession();
  if (!result.ok) return result;
  if (result.session.role !== "ADMIN") {
    return { ok: false as const, error: "FORBIDDEN" as const };
  }
  return result;
}

