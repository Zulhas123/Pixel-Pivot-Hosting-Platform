import { db } from "@/lib/db";
import { signSessionToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { RateLimitExceeded, rateLimitOrThrow } from "@/lib/rateLimit";
import { getClientIp, SESSION_COOKIE_NAME } from "@/lib/session";
import { cookies } from "next/headers";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const ip = await getClientIp();
  try {
    rateLimitOrThrow({ key: `login:${ip}`, windowMs: 60_000, max: 20 });
  } catch (e) {
    const retryAfterSec = e instanceof RateLimitExceeded ? e.retryAfterSec : 60;
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await db.usersFindByEmail(parsed.data.email);

  if (!user) return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  if (!user.emailVerified) {
    return Response.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  const token = await signSessionToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ ok: true });
}
