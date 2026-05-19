import { db } from "@/lib/db";
import { generateOtpCode } from "@/lib/otp";
import { getClientIp } from "@/lib/session";
import { RateLimitExceeded, rateLimitOrThrow } from "@/lib/rateLimit";
import { z } from "zod";

const Schema = z.object({ email: z.string().email().max(200) });

export async function POST(req: Request) {
  const ip = await getClientIp();
  try {
    rateLimitOrThrow({ key: `forgot:${ip}`, windowMs: 60_000, max: 10 });
  } catch (e) {
    const retryAfterSec = e instanceof RateLimitExceeded ? e.retryAfterSec : 60;
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });

  const user = await db.usersFindByEmail(parsed.data.email);
  if (user) {
    const code = generateOtpCode();
    const expires = Date.now() + 15 * 60_000;
    await db.usersUpdateById(user.id, { resetCode: code, resetCodeExpires: expires });
    console.log(`[password-reset] ${user.email} code=${code} (expires 15m)`);
  }

  return Response.json({ ok: true });
}
