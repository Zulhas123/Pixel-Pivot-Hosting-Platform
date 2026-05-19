import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

const UpdateSchema = z.object({
  bkashNumber: z.string().min(6).max(30),
  nagadNumber: z.string().min(6).max(30),
  rocketNumber: z.string().min(6).max(30),
});

export async function GET() {
  const settings = await db.mobileSettingsGet();
  return Response.json({ settings });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const saved = await db.mobileSettingsUpsert(parsed.data);
  return Response.json({ ok: true, settings: saved });
}
