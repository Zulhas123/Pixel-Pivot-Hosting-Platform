import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getClientIp } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { signSessionToken } from "@/lib/jwt";
import { RateLimitExceeded, rateLimitOrThrow } from "@/lib/rateLimit";
import { cookies } from "next/headers";
import { z } from "zod";

const RegisterSchema = z.object({
  username: z.string().min(2).max(50),
  phone: z.string().min(6).max(30),
  email: z.string().email().max(200).optional(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const ip = await getClientIp();
  try {
    rateLimitOrThrow({ key: `register:${ip}`, windowMs: 60_000, max: 10 });
  } catch (e) {
    const retryAfterSec = e instanceof RateLimitExceeded ? e.retryAfterSec : 60;
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { username, phone, password } = parsed.data;
  const email = parsed.data.email?.trim() || `${username}@local`;

  const existingUsername = await db.usersFindByUsername(username);
  if (existingUsername) return Response.json({ error: "USERNAME_IN_USE" }, { status: 409 });

  const existingEmail = await db.usersFindByEmail(email);
  if (existingEmail) return Response.json({ error: "EMAIL_IN_USE" }, { status: 409 });

  const user = await db.usersCreate({
    name: username,
    username,
    email,
    phone,
    passwordHash: await hashPassword(password),
    emailVerified: true,
  });

  const token = await signSessionToken({
    sub: user.id,
    role: "CUSTOMER",
    username,
    email,
    name: username,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ ok: true, user });
}
