import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getClientIp } from "@/lib/session";
import { RateLimitExceeded, rateLimitOrThrow } from "@/lib/rateLimit";
import { z } from "zod";

const Schema = z.object({
  username: z.string().min(2).max(50),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const ip = await getClientIp();
  try {
    rateLimitOrThrow({ key: `reset:${ip}`, windowMs: 60_000, max: 20 });
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

  const user = await db.usersFindByUsername(parsed.data.username);
  if (!user || !user.resetCode || !user.resetCodeExpires) {
    return Response.json({ error: "INVALID_CODE" }, { status: 400 });
  }
  if (user.resetCodeExpires < Date.now()) {
    return Response.json({ error: "CODE_EXPIRED" }, { status: 400 });
  }
  if (user.resetCode !== parsed.data.code) {
    return Response.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  await db.usersUpdateById(user.id, {
    passwordHash: await hashPassword(parsed.data.newPassword),
    resetCode: null,
    resetCodeExpires: null,
  });

  return Response.json({ ok: true });
}
