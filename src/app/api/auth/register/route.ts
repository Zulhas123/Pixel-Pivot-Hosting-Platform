import { db } from "@/lib/db";
import { generateOtpCode } from "@/lib/otp";
import { hashPassword } from "@/lib/password";
import { getClientIp } from "@/lib/session";
import { RateLimitExceeded, rateLimitOrThrow } from "@/lib/rateLimit";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(200),
  phone: z.string().min(6).max(30).optional(),
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

  const { name, email, phone, password } = parsed.data;
  const existing = await db.usersFindByEmail(email);
  if (existing) {
    return Response.json({ error: "EMAIL_IN_USE" }, { status: 409 });
  }

  const verifyCode = generateOtpCode();
  const verifyExpires = new Date(Date.now() + 15 * 60_000);

  const user = await db.usersCreate({
    name,
    email,
    phone,
    passwordHash: await hashPassword(password),
    emailVerifyCode: verifyCode,
    emailVerifyCodeExpires: verifyExpires.getTime(),
  });

  // Dev-friendly: log code to server console.
  console.log(`[email-verify] ${email} code=${verifyCode} (expires 15m)`);

  return Response.json({ ok: true, user });
}
