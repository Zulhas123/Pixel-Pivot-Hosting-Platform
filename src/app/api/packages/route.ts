import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

const CreatePackageSchema = z.object({
  title: z.string().min(2).max(120),
  type: z.string().min(2).max(40),
  priceBdt: z.number().int().min(0),
  storageGb: z.number().int().min(0),
  bandwidthGb: z.number().int().min(0),
  features: z.string().min(1).max(2000),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const packages = await db.packagesFindActive();
  return Response.json({ packages });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreatePackageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const created = await db.packagesCreate(parsed.data);
  return Response.json({ ok: true, package: created }, { status: 201 });
}
