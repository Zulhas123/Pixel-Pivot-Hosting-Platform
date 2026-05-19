import { db } from "@/lib/db";
import { getClientIp } from "@/lib/session";
import { RateLimitExceeded, rateLimitOrThrow } from "@/lib/rateLimit";
import { z } from "zod";

const VerifySchema = z.object({
  email: z.string().email().max(200),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const ip = await getClientIp();
  try {
    rateLimitOrThrow({ key: `verify:${ip}`, windowMs: 60_000, max: 30 });
  } catch (e) {
    const retryAfterSec = e instanceof RateLimitExceeded ? e.retryAfterSec : 60;
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await db.usersFindByEmail(parsed.data.email);
  if (!user) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  if (user.emailVerified) return Response.json({ ok: true });
  if (!user.emailVerifyCode || !user.emailVerifyCodeExpires) {
    return Response.json({ error: "NO_CODE" }, { status: 400 });
  }
  if (user.emailVerifyCodeExpires < Date.now()) {
    return Response.json({ error: "CODE_EXPIRED" }, { status: 400 });
  }
  if (user.emailVerifyCode !== parsed.data.code) {
    return Response.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  await db.usersUpdateById(user.id, {
    emailVerified: true,
    emailVerifyCode: null,
    emailVerifyCodeExpires: null,
  });

  return Response.json({ ok: true });
}
