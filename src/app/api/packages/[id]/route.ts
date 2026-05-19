import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

const UpdatePackageSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  type: z.string().min(2).max(40).optional(),
  priceBdt: z.number().int().min(0).optional(),
  storageGb: z.number().int().min(0).optional(),
  bandwidthGb: z.number().int().min(0).optional(),
  features: z.string().min(1).max(2000).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request, ctx: RouteContext<"/api/packages/[id]">) {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: 403 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = UpdatePackageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await db.packagesUpdateById(id, parsed.data);
  return Response.json({ ok: true, package: updated });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/packages/[id]">) {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: 403 });
  const { id } = await ctx.params;
  await db.packagesDeleteById(id);
  return Response.json({ ok: true });
}
